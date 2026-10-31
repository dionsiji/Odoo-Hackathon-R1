"""
Views for Payments, Recurring Billing, Analytics, PDF, ActivityLog,
Notifications, CSV Import/Export, and Global Search — Brightloop Module 3.
"""

import csv, io
from datetime import timedelta, date
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Sum, Count, Q, F
from django.http import HttpResponse, FileResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from dateutil.relativedelta import relativedelta

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from accounts.models import User
from core.permissions import IsAdminOrStaff
from core.custom_permissions import IsCustomerOwnerOrAdminOrStaff
from core.models import ActivityLog, Notification
from customers.models import CustomerProfile
from catalog.models import Product, ProductVariant, SubscriptionPlan
from quotations.models import Quotation
from subscriptions.models import Subscription, SubscriptionLine

from .models import Invoice, InvoiceLine, Payment, TaxRate, Discount
from .serializers import InvoiceSerializer
from .serializers2 import (
    PaymentSerializer,
    PaymentRefundSerializer,
    ActivityLogSerializer,
    NotificationSerializer,
)


# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENTS
# ═══════════════════════════════════════════════════════════════════════════════

class PaymentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/payments/ — List payments (Customer sees own; Admin/Staff sees all)
    POST /api/v1/payments/ — Record a payment (Admin/Staff only)
    """
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminOrStaff()]
        return [IsCustomerOwnerOrAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Payment.objects.none()
        qs = Payment.objects.select_related("invoice", "customer__user", "created_by")
        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return qs.all()
        return qs.filter(customer__user=user)


class PaymentDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/payments/{id}/ — Retrieve payment (Customer isolated to own)
    """
    serializer_class = PaymentSerializer
    permission_classes = [IsCustomerOwnerOrAdminOrStaff]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Payment.objects.none()
        qs = Payment.objects.select_related("invoice", "customer__user", "created_by")
        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return qs.all()
        return qs.filter(customer__user=user)


class PaymentRefundView(APIView):
    """
    POST /api/v1/payments/{id}/refund/
    Marks a COMPLETED payment as REFUNDED and reverses the invoice balance.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            payment = Payment.objects.select_related("invoice", "customer").get(pk=pk)
        except Payment.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if payment.status != Payment.PaymentStatus.COMPLETED:
            return Response(
                {"error": f"Only COMPLETED payments can be refunded. Current status: {payment.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PaymentRefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().get(pk=payment.invoice_id)
            payment.status = Payment.PaymentStatus.REFUNDED
            if serializer.validated_data.get("notes"):
                payment.notes = (payment.notes + "\n" + serializer.validated_data["notes"]).strip()
            payment.save(update_fields=["status", "notes", "updated_at"])

            # Reverse invoice balance
            invoice.amount_paid = max(
                Decimal("0.00"),
                (invoice.amount_paid - payment.amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            )
            invoice.amount_due = (invoice.total_amount - invoice.amount_paid).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            # Revert status back to ISSUED if there's a balance
            if invoice.amount_due > Decimal("0.00") and invoice.status == Invoice.Status.PAID:
                invoice.status = Invoice.Status.ISSUED
            invoice.save(update_fields=["amount_paid", "amount_due", "status", "updated_at"])

        ActivityLog.log(
            actor=request.user,
            action="PAYMENT_REFUNDED",
            obj=payment,
            metadata={"invoice": invoice.invoice_number, "amount": str(payment.amount)},
        )
        Notification.notify(
            recipient=invoice.customer.user,
            notification_type=Notification.NotificationType.PAYMENT_REFUNDED,
            title=f"Refund of ${payment.amount} processed",
            message=f"A refund of ${payment.amount} for invoice {invoice.invoice_number} has been processed.",
            obj=payment,
        )
        return Response(PaymentSerializer(payment, context={"request": request}).data)


# ═══════════════════════════════════════════════════════════════════════════════
# RECURRING BILLING
# ═══════════════════════════════════════════════════════════════════════════════

class RecurringBillingRunView(APIView):
    """
    POST /api/v1/billing/run/
    Identifies all ACTIVE subscriptions with next_billing_date <= today and
    generates DRAFT invoices for each. Advances next_billing_date.
    Idempotent: skips if invoice already exists for the same cycle window.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request):
        today = timezone.now().date()
        due_in_days = int(request.data.get("due_in_days", 14))

        due_subscriptions = Subscription.objects.filter(
            status=Subscription.Status.ACTIVE,
            next_billing_date__lte=today,
        ).prefetch_related("lines__product", "lines__variant", "lines__plan").select_related("customer")

        created = []
        skipped = []

        with transaction.atomic():
            for sub in due_subscriptions:
                cycle_start = sub.next_billing_date or today
                # Calculate cycle_end based on plan interval
                first_plan_line = sub.lines.filter(plan__isnull=False).first()
                interval = (
                    first_plan_line.plan.billing_interval
                    if first_plan_line and first_plan_line.plan
                    else "MONTHLY"
                )
                if interval == "YEARLY":
                    cycle_end = cycle_start + relativedelta(years=1)
                elif interval == "QUARTERLY":
                    cycle_end = cycle_start + relativedelta(months=3)
                else:
                    cycle_end = cycle_start + relativedelta(months=1)

                # Idempotency: skip if active invoice already exists for this window
                already_exists = Invoice.objects.filter(
                    subscription=sub,
                    billing_cycle_start=cycle_start,
                    billing_cycle_end=cycle_end,
                ).exclude(status__in=[Invoice.Status.VOID, Invoice.Status.CANCELLED]).exists()

                if already_exists:
                    skipped.append(sub.subscription_number)
                    continue

                invoice = Invoice.objects.create(
                    customer=sub.customer,
                    subscription=sub,
                    issue_date=today,
                    due_date=today + timedelta(days=due_in_days),
                    billing_cycle_start=cycle_start,
                    billing_cycle_end=cycle_end,
                    status=Invoice.Status.DRAFT,
                    notes=f"Recurring billing for {sub.subscription_number} ({interval})",
                    created_by=request.user,
                )
                for line in sub.lines.all():
                    InvoiceLine.objects.create(
                        invoice=invoice,
                        product=line.product,
                        variant=line.variant,
                        plan=line.plan,
                        description=f"Subscription: {line.product.name}",
                        quantity=line.quantity,
                        unit_price=line.unit_price,
                    )
                invoice.calculate_totals(save=True)

                # Advance next_billing_date
                sub.next_billing_date = cycle_end
                sub.save(update_fields=["next_billing_date", "updated_at"])

                ActivityLog.log(
                    actor=request.user,
                    action="RECURRING_INVOICE_GENERATED",
                    obj=invoice,
                    metadata={"subscription": sub.subscription_number, "cycle": str(cycle_start)},
                )
                # Notify customer
                Notification.notify(
                    recipient=sub.customer.user,
                    notification_type=Notification.NotificationType.SUBSCRIPTION_RENEWED,
                    title=f"Subscription renewed: {sub.subscription_number}",
                    message=f"Invoice {invoice.invoice_number} has been created for your subscription renewal.",
                    obj=invoice,
                )
                created.append(invoice.invoice_number)

        return Response({
            "invoices_created": len(created),
            "invoices_skipped": len(skipped),
            "invoice_numbers": created,
            "skipped_subscriptions": skipped,
        }, status=status.HTTP_200_OK)


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════

class AnalyticsOverviewView(APIView):
    """
    GET /api/v1/analytics/overview/
    Returns high-level business KPIs.
    """
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        today = timezone.now().date()

        # Revenue: sum of COMPLETED payments
        total_revenue = Payment.objects.filter(
            status=Payment.PaymentStatus.COMPLETED
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        # MRR from ACTIVE subscriptions
        active_subs = Subscription.objects.filter(status=Subscription.Status.ACTIVE)
        mrr = Decimal("0.00")
        for sub in active_subs.prefetch_related("lines__plan"):
            for line in sub.lines.all():
                if line.plan:
                    price = Decimal(str(line.unit_price)) * Decimal(str(line.quantity))
                    interval = line.plan.billing_interval
                    if interval == "MONTHLY":
                        mrr += price
                    elif interval == "QUARTERLY":
                        mrr += (price / Decimal("3")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                    elif interval == "YEARLY":
                        mrr += (price / Decimal("12")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        arr = (mrr * Decimal("12")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Subscription counts
        sub_counts = Subscription.objects.values("status").annotate(count=Count("id"))
        sub_by_status = {s["status"]: s["count"] for s in sub_counts}

        # Invoice counts
        invoice_counts = Invoice.objects.values("status").annotate(count=Count("id"))
        inv_by_status = {i["status"]: i["count"] for i in invoice_counts}

        # Outstanding receivables
        outstanding = Invoice.objects.filter(
            status__in=[Invoice.Status.ISSUED, Invoice.Status.PARTIALLY_PAID, Invoice.Status.OVERDUE]
        ).aggregate(total=Sum("amount_due"))["total"] or Decimal("0.00")

        return Response({
            "total_revenue_collected": str(total_revenue),
            "mrr": str(mrr),
            "arr": str(arr),
            "subscriptions": {
                "active": sub_by_status.get("ACTIVE", 0),
                "paused": sub_by_status.get("PAUSED", 0),
                "draft": sub_by_status.get("DRAFT", 0),
                "closed": sub_by_status.get("CLOSED", 0),
                "total": sum(sub_by_status.values()),
            },
            "invoices": {
                "draft": inv_by_status.get("DRAFT", 0),
                "issued": inv_by_status.get("ISSUED", 0),
                "paid": inv_by_status.get("PAID", 0),
                "partially_paid": inv_by_status.get("PARTIALLY_PAID", 0),
                "overdue": inv_by_status.get("OVERDUE", 0),
                "void": inv_by_status.get("VOID", 0),
                "cancelled": inv_by_status.get("CANCELLED", 0),
                "total": sum(inv_by_status.values()),
            },
            "outstanding_receivables": str(outstanding),
        })


class AnalyticsRevenueView(APIView):
    """
    GET /api/v1/analytics/revenue/?from=YYYY-MM-DD&to=YYYY-MM-DD
    Revenue breakdown by date range (based on completed payments).
    Returns by_date and by_payment_method dicts for frontend charts.
    """
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        from_str = request.query_params.get("from")
        to_str = request.query_params.get("to")
        qs = Payment.objects.filter(status=Payment.PaymentStatus.COMPLETED)
        if from_str:
            qs = qs.filter(paid_at__date__gte=parse_date(from_str))
        if to_str:
            qs = qs.filter(paid_at__date__lte=parse_date(to_str))

        total = qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        # By payment method — as dict for frontend pie/bar chart
        by_method_qs = list(
            qs.values("payment_method").annotate(total=Sum("amount"), count=Count("id"))
        )
        by_payment_method_dict = {
            r["payment_method"]: str(r["total"]) for r in by_method_qs
        }
        # Also list format for analytics page
        by_method_list = [
            {"method": r["payment_method"], "total": str(r["total"]), "count": r["count"]}
            for r in by_method_qs
        ]

        # By date — daily aggregation for area chart
        from django.db.models.functions import TruncDate
        by_date_qs = list(
            qs.annotate(day=TruncDate("paid_at"))
            .values("day")
            .annotate(total=Sum("amount"))
            .order_by("day")
        )
        by_date_dict = {
            str(r["day"]): str(r["total"]) for r in by_date_qs
        }

        # Outstanding invoices for the period
        invoice_qs = Invoice.objects.all()
        if from_str:
            invoice_qs = invoice_qs.filter(issue_date__gte=parse_date(from_str))
        if to_str:
            invoice_qs = invoice_qs.filter(issue_date__lte=parse_date(to_str))

        outstanding = invoice_qs.filter(
            status__in=[Invoice.Status.ISSUED, Invoice.Status.PARTIALLY_PAID, Invoice.Status.OVERDUE]
        ).aggregate(total=Sum("amount_due"))["total"] or Decimal("0.00")

        overdue_count = invoice_qs.filter(status=Invoice.Status.OVERDUE).count()

        return Response({
            "total_collected": str(total),
            "outstanding": str(outstanding),
            "overdue_count": overdue_count,
            "by_payment_method": by_payment_method_dict,
            "by_payment_method_list": by_method_list,
            "by_date": by_date_dict,
            "filters": {"from": from_str, "to": to_str},
        })


# ═══════════════════════════════════════════════════════════════════════════════
# PDF INVOICE
# ═══════════════════════════════════════════════════════════════════════════════

class InvoicePDFView(APIView):
    """
    GET /api/v1/invoices/{id}/pdf/
    Generates a PDF version of the invoice for download.
    Customers can only access their own invoices.
    """
    permission_classes = [IsCustomerOwnerOrAdminOrStaff]

    def get(self, request, pk):
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        import io

        # Fetch invoice (with isolation)
        user = request.user
        qs = Invoice.objects.select_related(
            "customer__user", "tax_rate", "discount", "created_by"
        ).prefetch_related("lines__product", "lines__variant", "lines__plan")

        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            qs = qs.all()
        else:
            qs = qs.filter(customer__user=user)

        try:
            invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        elements = []

        # Header
        header_style = ParagraphStyle("header", parent=styles["Heading1"], textColor=colors.HexColor("#1a73e8"), fontSize=22)
        elements.append(Paragraph("BRIGHTLOOP", header_style))
        elements.append(Paragraph("Subscription Management Platform", styles["Normal"]))
        elements.append(Spacer(1, 0.4*cm))

        # Invoice meta
        meta = [
            ["Invoice Number:", invoice.invoice_number],
            ["Status:", invoice.status],
            ["Issue Date:", str(invoice.issue_date)],
            ["Due Date:", str(invoice.due_date)],
        ]
        meta_table = Table(meta, colWidths=[4*cm, 8*cm])
        meta_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 0.4*cm))

        # Customer info
        cp = invoice.customer
        cust_data = [
            ["Bill To:"],
            [cp.user.full_name or cp.user.email],
            [cp.company_name or ""],
            [cp.user.email],
            [f"{cp.address_line1}, {cp.city}, {cp.country}".strip(", ")],
        ]
        for row in cust_data:
            elements.append(Paragraph(row[0], styles["Normal"] if row[0] != "Bill To:" else styles["Heading4"]))
        elements.append(Spacer(1, 0.4*cm))

        # Line items table
        line_data = [["Description", "Qty", "Unit Price", "Line Total"]]
        for line in invoice.lines.all():
            line_data.append([
                line.description or line.product.name,
                str(line.quantity),
                f"${line.unit_price:.2f}",
                f"${line.line_total:.2f}",
            ])
        line_table = Table(line_data, colWidths=[9*cm, 2*cm, 3.5*cm, 3.5*cm])
        line_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a73e8")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 0.3*cm))

        # Totals
        totals_data = [
            ["Subtotal:", f"${invoice.subtotal:.2f}"],
            ["Discount:", f"-${invoice.discount_amount:.2f}"],
            ["Tax:", f"${invoice.tax_amount:.2f}"],
            ["TOTAL:", f"${invoice.total_amount:.2f}"],
            ["Amount Paid:", f"${invoice.amount_paid:.2f}"],
            ["Amount Due:", f"${invoice.amount_due:.2f}"],
        ]
        totals_table = Table(totals_data, colWidths=[13*cm, 5*cm])
        totals_table.setStyle(TableStyle([
            ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
            ("FONTNAME", (0, 5), (-1, 5), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 5), (-1, 5), colors.HexColor("#e53935")),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("LINEABOVE", (0, 3), (-1, 3), 1, colors.black),
            ("LINEABOVE", (0, 5), (-1, 5), 0.5, colors.grey),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(totals_table)

        if invoice.notes:
            elements.append(Spacer(1, 0.3*cm))
            elements.append(Paragraph(f"Notes: {invoice.notes}", styles["Normal"]))

        doc.build(elements)
        buffer.seek(0)
        filename = f"invoice_{invoice.invoice_number}.pdf"
        return HttpResponse(
            buffer,
            content_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )


# ═══════════════════════════════════════════════════════════════════════════════
# ACTIVITY LOGS
# ═══════════════════════════════════════════════════════════════════════════════

class ActivityLogListView(generics.ListAPIView):
    """
    GET /api/v1/activity-logs/?object_type=Invoice&action=PAYMENT_RECORDED
    Only Admin/Staff can access.
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        qs = ActivityLog.objects.select_related("actor").all()
        if ot := self.request.query_params.get("object_type"):
            qs = qs.filter(object_type=ot)
        if action := self.request.query_params.get("action"):
            qs = qs.filter(action=action)
        return qs


# ═══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════════

class NotificationListView(generics.ListAPIView):
    """
    GET /api/v1/notifications/ — Returns the current user's notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsCustomerOwnerOrAdminOrStaff]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        if self.request.query_params.get("unread"):
            qs = qs.filter(is_read=False)
        return qs


class NotificationMarkReadView(APIView):
    """
    POST /api/v1/notifications/{id}/mark-read/
    """
    permission_classes = [IsCustomerOwnerOrAdminOrStaff]

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response({"detail": "Marked as read."})


class NotificationMarkAllReadView(APIView):
    """
    POST /api/v1/notifications/mark-all-read/
    """
    permission_classes = [IsCustomerOwnerOrAdminOrStaff]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "All notifications marked as read."})


# ═══════════════════════════════════════════════════════════════════════════════
# CSV IMPORT / EXPORT
# ═══════════════════════════════════════════════════════════════════════════════

class CustomerCSVExportView(APIView):
    """GET /api/v1/export/customers.csv — Admin/Staff only."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="customers.csv"'
        writer = csv.writer(response)
        writer.writerow(["id", "email", "full_name", "company_name", "phone", "city", "country", "status", "created_at"])
        for cp in CustomerProfile.objects.select_related("user").all():
            writer.writerow([
                cp.id, cp.user.email, cp.user.full_name, cp.company_name,
                cp.phone, cp.city, cp.country, cp.status, cp.created_at.date()
            ])
        return response


class ProductCSVExportView(APIView):
    """GET /api/v1/export/products.csv — Admin/Staff only."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="products.csv"'
        writer = csv.writer(response)
        writer.writerow(["id", "name", "sku", "category", "is_active"])
        for p in Product.objects.all():
            writer.writerow([p.id, p.name, p.sku, p.category, p.is_active])
        return response


class InvoiceCSVExportView(APIView):
    """GET /api/v1/export/invoices.csv — Admin/Staff only."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="invoices.csv"'
        writer = csv.writer(response)
        writer.writerow([
            "invoice_number", "customer_email", "status", "issue_date",
            "due_date", "subtotal", "discount_amount", "tax_amount",
            "total_amount", "amount_paid", "amount_due"
        ])
        for inv in Invoice.objects.select_related("customer__user").all():
            writer.writerow([
                inv.invoice_number, inv.customer.user.email, inv.status,
                inv.issue_date, inv.due_date, inv.subtotal, inv.discount_amount,
                inv.tax_amount, inv.total_amount, inv.amount_paid, inv.amount_due
            ])
        return response


class PaymentCSVExportView(APIView):
    """GET /api/v1/export/payments.csv — Admin/Staff only."""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="payments.csv"'
        writer = csv.writer(response)
        writer.writerow([
            "transaction_ref", "invoice_number", "customer_email",
            "amount", "payment_method", "status", "paid_at"
        ])
        for pay in Payment.objects.select_related("invoice", "customer__user").all():
            writer.writerow([
                pay.transaction_ref, pay.invoice.invoice_number,
                pay.customer.user.email, pay.amount, pay.payment_method,
                pay.status, pay.paid_at.date()
            ])
        return response


class CustomerCSVImportView(APIView):
    """
    POST /api/v1/import/customers/ — Admin/Staff only.
    Expects multipart/form-data with a `file` field containing a CSV.
    Required columns: email, first_name, last_name, password, company_name
    """
    permission_classes = [IsAdminOrStaff]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if "file" not in request.FILES:
            return Response({"error": "No file uploaded. Use 'file' form field."}, status=status.HTTP_400_BAD_REQUEST)

        csv_file = request.FILES["file"]
        try:
            text = csv_file.read().decode("utf-8")
        except Exception:
            return Response({"error": "Cannot decode file. Upload a UTF-8 CSV."}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(text))
        required = {"email", "first_name", "last_name", "password", "company_name"}
        if not required.issubset(set(reader.fieldnames or [])):
            return Response(
                {"error": f"CSV must include columns: {', '.join(required)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        created, errors = [], []
        for i, row in enumerate(reader, start=2):
            email = row.get("email", "").strip()
            if not email:
                errors.append({"row": i, "error": "email is required"})
                continue
            if User.objects.filter(email=email).exists():
                errors.append({"row": i, "error": f"User with email '{email}' already exists"})
                continue
            try:
                with transaction.atomic():
                    user = User.objects.create_user(
                        email=email,
                        password=row.get("password", "ChangeMe123!"),
                        first_name=row.get("first_name", "").strip(),
                        last_name=row.get("last_name", "").strip(),
                        role=User.Role.CUSTOMER,
                    )
                    cp = CustomerProfile.objects.create(
                        user=user,
                        company_name=row.get("company_name", "").strip(),
                        phone=row.get("phone", "").strip(),
                    )
                    created.append({"email": email, "profile_id": cp.id})
                    ActivityLog.log(actor=request.user, action="CSV_IMPORT_CUSTOMER", obj=cp)
            except Exception as e:
                errors.append({"row": i, "error": str(e)})

        return Response({"created": len(created), "errors": errors, "rows": created}, status=status.HTTP_200_OK)


class ProductCSVImportView(APIView):
    """
    POST /api/v1/import/products/ — Admin/Staff only.
    Required columns: name, sku, category
    """
    permission_classes = [IsAdminOrStaff]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if "file" not in request.FILES:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            text = request.FILES["file"].read().decode("utf-8")
        except Exception:
            return Response({"error": "Cannot decode file."}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(text))
        required = {"name", "sku"}
        if not required.issubset(set(reader.fieldnames or [])):
            return Response({"error": f"CSV must include: {', '.join(required)}"}, status=status.HTTP_400_BAD_REQUEST)

        created, errors = [], []
        for i, row in enumerate(reader, start=2):
            sku = row.get("sku", "").strip()
            name = row.get("name", "").strip()
            if not sku or not name:
                errors.append({"row": i, "error": "name and sku are required"})
                continue
            if Product.objects.filter(sku=sku).exists():
                errors.append({"row": i, "error": f"Product with SKU '{sku}' already exists"})
                continue
            try:
                with transaction.atomic():
                    prod = Product.objects.create(
                        name=name, sku=sku,
                        category=row.get("category", "").strip(),
                        description=row.get("description", "").strip(),
                    )
                    created.append({"name": name, "sku": sku, "id": prod.id})
                    ActivityLog.log(actor=request.user, action="CSV_IMPORT_PRODUCT", obj=prod)
            except Exception as e:
                errors.append({"row": i, "error": str(e)})

        return Response({"created": len(created), "errors": errors}, status=status.HTTP_200_OK)


# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL SEARCH
# ═══════════════════════════════════════════════════════════════════════════════

class GlobalSearchView(APIView):
    """
    GET /api/v1/search/?q=query&types=customers,products,quotations,subscriptions,invoices
    Searches across multiple entity types. Respects RBAC and customer isolation.
    """
    permission_classes = [IsCustomerOwnerOrAdminOrStaff]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q:
            return Response({"error": "Provide a search query with ?q="}, status=status.HTTP_400_BAD_REQUEST)

        types_param = request.query_params.get("types", "customers,products,plans,quotations,subscriptions,invoices")
        requested = {t.strip() for t in types_param.split(",")}
        user = request.user
        is_staff = user.role in (User.Role.ADMIN, User.Role.STAFF)
        results = {}

        if "customers" in requested and is_staff:
            customers = CustomerProfile.objects.select_related("user").filter(
                Q(user__email__icontains=q) |
                Q(user__first_name__icontains=q) |
                Q(user__last_name__icontains=q) |
                Q(company_name__icontains=q)
            )[:20]
            results["customers"] = [
                {"id": c.id, "email": c.user.email, "company_name": c.company_name}
                for c in customers
            ]

        if "products" in requested:
            products = Product.objects.filter(
                Q(name__icontains=q) | Q(sku__icontains=q) | Q(category__icontains=q)
            )
            if not is_staff:
                products = products.filter(is_active=True)
            results["products"] = [
                {"id": p.id, "name": p.name, "sku": p.sku, "category": p.category}
                for p in products[:20]
            ]

        if "plans" in requested:
            plans = SubscriptionPlan.objects.select_related("product").filter(
                Q(name__icontains=q) | Q(product__name__icontains=q)
            )
            if not is_staff:
                plans = plans.filter(is_active=True)
            results["plans"] = [
                {"id": p.id, "name": p.name, "billing_interval": p.billing_interval, "price": str(p.price)}
                for p in plans[:20]
            ]

        if "quotations" in requested:
            qs = Quotation.objects.select_related("customer__user").filter(
                Q(quotation_number__icontains=q) | Q(notes__icontains=q)
            )
            if not is_staff:
                qs = qs.filter(customer__user=user)
            results["quotations"] = [
                {"id": q_obj.id, "quotation_number": q_obj.quotation_number, "status": q_obj.status}
                for q_obj in qs[:20]
            ]

        if "subscriptions" in requested:
            qs = Subscription.objects.select_related("customer__user").filter(
                Q(subscription_number__icontains=q)
            )
            if not is_staff:
                qs = qs.filter(customer__user=user)
            results["subscriptions"] = [
                {"id": s.id, "subscription_number": s.subscription_number, "status": s.status}
                for s in qs[:20]
            ]

        if "invoices" in requested:
            qs = Invoice.objects.select_related("customer__user").filter(
                Q(invoice_number__icontains=q) | Q(notes__icontains=q)
            )
            if not is_staff:
                qs = qs.filter(customer__user=user)
            results["invoices"] = [
                {"id": inv.id, "invoice_number": inv.invoice_number, "status": inv.status, "total": str(inv.total_amount)}
                for inv in qs[:20]
            ]

        return Response({"query": q, "results": results})


# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE BACKUP / EXPORT (TIER 2)
# ═══════════════════════════════════════════════════════════════════════════════

class DatabaseBackupView(APIView):
    """
    POST /api/v1/backups/create/ or GET /api/v1/backups/create/
    Creates and downloads a consistent SQLite backup.
    Admin only.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request):
        return self._create_backup(request)

    def get(self, request):
        return self._create_backup(request)

    def _create_backup(self, request):
        from django.conf import settings
        import shutil
        import os
        import sqlite3

        db_path = settings.DATABASES['default']['NAME']
        if not os.path.exists(db_path):
            return Response({"error": "Database file not found."}, status=status.HTTP_404_NOT_FOUND)

        # Consistent SQLite backup using sqlite3.Connection.backup
        backup_buffer = io.BytesIO()
        source_conn = sqlite3.connect(db_path)
        # Temp in-memory or file backup
        timestamp_str = timezone.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"brightloop_backup_{timestamp_str}.sqlite3"

        # Safe atomic vacuum/backup into bytes
        mem_db = sqlite3.connect(":memory:")
        source_conn.backup(mem_db)
        source_conn.close()

        # Write memory DB to buffer
        for line in mem_db.iterdump():
            backup_buffer.write(f"{line}\n".encode("utf-8"))
        mem_db.close()

        backup_buffer.seek(0)

        ActivityLog.log(
            actor=request.user,
            action="DATABASE_BACKUP_CREATED",
            object_type="System",
            object_id="0",
            object_repr="SQLite Database Backup",
            metadata={"filename": backup_filename}
        )

        response = HttpResponse(backup_buffer.getvalue(), content_type="application/x-sqlite3")
        response["Content-Disposition"] = f'attachment; filename="{backup_filename}.sql"'
        return response
