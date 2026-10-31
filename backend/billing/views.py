"""
Views for the billing app in Brightloop.
"""

from datetime import timedelta
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.models import User
from core.permissions import IsAdminOrStaff
from core.custom_permissions import IsCustomerOwnerOrAdminOrStaff
from quotations.models import Quotation
from subscriptions.models import Subscription

from .models import TaxRate, Discount, Invoice, InvoiceLine
from .serializers import (
    TaxRateSerializer,
    DiscountSerializer,
    InvoiceSerializer,
    GenerateInvoiceFromQuotationSerializer,
    GenerateInvoiceFromSubscriptionSerializer,
)


# ============================================================================
# Tax Rates
# ============================================================================

class TaxRateListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/tax-rates/ - List tax rates (Admin/Staff see all, Customers see active)
    POST /api/v1/tax-rates/ - Create tax rate (Admin/Staff only)
    """
    serializer_class = TaxRateSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminOrStaff()]
        return [IsCustomerOwnerOrAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return TaxRate.objects.none()
        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return TaxRate.objects.all()
        return TaxRate.objects.filter(is_active=True)


class TaxRateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/tax-rates/{id}/ - Retrieve tax rate
    PUT    /api/v1/tax-rates/{id}/ - Update tax rate (Admin/Staff only)
    PATCH  /api/v1/tax-rates/{id}/ - Partial update (Admin/Staff only)
    DELETE /api/v1/tax-rates/{id}/ - Delete tax rate (Admin/Staff only)
    """
    serializer_class = TaxRateSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsAdminOrStaff()]
        return [IsCustomerOwnerOrAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return TaxRate.objects.none()
        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return TaxRate.objects.all()
        return TaxRate.objects.filter(is_active=True)


# ============================================================================
# Discounts
# ============================================================================

class DiscountListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/discounts/ - List discounts (Admin/Staff see all, Customers see active)
    POST /api/v1/discounts/ - Create discount (Admin/Staff only)
    """
    serializer_class = DiscountSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminOrStaff()]
        return [IsCustomerOwnerOrAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Discount.objects.none()
        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return Discount.objects.all()
        return Discount.objects.filter(is_active=True)


class DiscountDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/discounts/{id}/ - Retrieve discount
    PUT    /api/v1/discounts/{id}/ - Update discount (Admin/Staff only)
    PATCH  /api/v1/discounts/{id}/ - Partial update (Admin/Staff only)
    DELETE /api/v1/discounts/{id}/ - Delete discount (Admin/Staff only)
    """
    serializer_class = DiscountSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsAdminOrStaff()]
        return [IsCustomerOwnerOrAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Discount.objects.none()
        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return Discount.objects.all()
        return Discount.objects.filter(is_active=True)


# ============================================================================
# Invoices
# ============================================================================

class InvoiceListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/invoices/ - List invoices (Customers see own, Admin/Staff see all)
    POST /api/v1/invoices/ - Create invoice (Admin/Staff only)
    """
    serializer_class = InvoiceSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminOrStaff()]
        return [IsCustomerOwnerOrAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Invoice.objects.none()

        base_qs = (
            Invoice.objects.select_related("customer__user", "subscription", "quotation", "created_by", "tax_rate", "discount")
            .prefetch_related("lines__product", "lines__variant", "lines__plan")
        )

        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            qs = base_qs.all()
        else:
            qs = base_qs.filter(customer__user=user)

        # Lazy overdue evaluation on listing
        for inv in qs:
            inv.check_overdue()

        return qs


class InvoiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/invoices/{id}/ - Retrieve invoice
    PUT    /api/v1/invoices/{id}/ - Update invoice (Admin/Staff only, only when DRAFT)
    PATCH  /api/v1/invoices/{id}/ - Partial update (Admin/Staff only, only when DRAFT)
    DELETE /api/v1/invoices/{id}/ - Delete invoice (Admin/Staff only, only when DRAFT)
    """
    serializer_class = InvoiceSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsAdminOrStaff()]
        return [IsCustomerOwnerOrAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Invoice.objects.none()

        base_qs = (
            Invoice.objects.select_related("customer__user", "subscription", "quotation", "created_by", "tax_rate", "discount")
            .prefetch_related("lines__product", "lines__variant", "lines__plan")
        )

        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return base_qs.all()
        return base_qs.filter(customer__user=user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.check_overdue()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        if instance.status != Invoice.Status.DRAFT:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                f"Cannot delete an invoice in '{instance.status}' status. Only DRAFT invoices can be deleted."
            )
        instance.delete()


# ============================================================================
# Invoice Lifecycle Actions
# ============================================================================

class InvoiceIssueView(APIView):
    """
    POST /api/v1/invoices/{id}/issue/
    Transitions an invoice from DRAFT to ISSUED (or OVERDUE if due_date is past).
    Requires at least one line item.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.prefetch_related("lines").get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if invoice.status != Invoice.Status.DRAFT:
            return Response(
                {"error": f"Cannot issue invoice in '{invoice.status}' status. Only DRAFT invoices can be issued."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not invoice.lines.exists():
            return Response(
                {"error": "Cannot issue an invoice with no line items."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invoice.status = Invoice.Status.ISSUED
        invoice.check_overdue()
        invoice.save()

        serializer = InvoiceSerializer(invoice, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class InvoiceVoidView(APIView):
    """
    POST /api/v1/invoices/{id}/void/
    Transitions an invoice from DRAFT, ISSUED, or OVERDUE to VOID.
    Cannot void an invoice that has received payments.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if invoice.status in (Invoice.Status.VOID, Invoice.Status.CANCELLED):
            return Response(
                {"error": f"Invoice is already {invoice.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if invoice.amount_paid > Decimal("0.00"):
            return Response(
                {"error": "Cannot void an invoice that has payments recorded."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invoice.status = Invoice.Status.VOID
        invoice.save(update_fields=["status", "updated_at"])

        serializer = InvoiceSerializer(invoice, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class InvoiceCancelView(APIView):
    """
    POST /api/v1/invoices/{id}/cancel/
    Transitions a DRAFT invoice to CANCELLED.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if invoice.status != Invoice.Status.DRAFT:
            return Response(
                {"error": f"Cannot cancel an invoice in '{invoice.status}' status. Only DRAFT invoices can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invoice.status = Invoice.Status.CANCELLED
        invoice.save(update_fields=["status", "updated_at"])

        serializer = InvoiceSerializer(invoice, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================================
# Conversions: Quotation -> Invoice & Subscription -> Invoice
# ============================================================================

class InvoiceGenerateFromQuotationView(APIView):
    """
    POST /api/v1/quotations/{id}/generate-invoice/
    Generates an Invoice from an ACCEPTED quotation.
    Prevents duplicate generation for active invoices.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            quotation = Quotation.objects.select_related("customer").prefetch_related("lines__product", "lines__variant").get(pk=pk)
        except Quotation.DoesNotExist:
            return Response({"detail": "Quotation not found."}, status=status.HTTP_404_NOT_FOUND)

        if quotation.status != Quotation.Status.ACCEPTED:
            return Response(
                {"error": f"Cannot generate invoice from quotation in '{quotation.status}' status. Quotation must be ACCEPTED."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Lock existing invoices for this quotation to prevent concurrent duplicates
            active_invoices = Invoice.objects.select_for_update().filter(
                quotation=quotation
            ).exclude(status__in=[Invoice.Status.VOID, Invoice.Status.CANCELLED])

            if active_invoices.exists():
                return Response(
                    {"error": "An active invoice has already been generated for this quotation."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = GenerateInvoiceFromQuotationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data

            due_date = data.get("due_date") or (timezone.now().date() + timedelta(days=30))
            notes = data.get("notes") or quotation.notes
            terms = data.get("terms") or quotation.terms

            invoice = Invoice.objects.create(
                customer=quotation.customer,
                quotation=quotation,
                issue_date=timezone.now().date(),
                due_date=due_date,
                status=Invoice.Status.DRAFT,
                discount_amount=quotation.discount_amount,
                tax_amount=quotation.tax_amount,
                notes=notes,
                terms=terms,
                created_by=request.user,
            )

            # Copy lines preserving snapshots
            for q_line in quotation.lines.all():
                InvoiceLine.objects.create(
                    invoice=invoice,
                    product=q_line.product,
                    variant=q_line.variant,
                    description=q_line.description or q_line.product.name,
                    quantity=q_line.quantity,
                    unit_price=q_line.unit_price,
                )

            invoice.calculate_totals(save=True)

        resp_serializer = InvoiceSerializer(invoice, context={"request": request})
        return Response(resp_serializer.data, status=status.HTTP_201_CREATED)


class InvoiceGenerateFromSubscriptionView(APIView):
    """
    POST /api/v1/subscriptions/{id}/generate-invoice/
    Generates a recurring billing Invoice from an ACTIVE subscription.
    Prevents duplicate generation for the same billing window.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            subscription = Subscription.objects.select_related("customer").prefetch_related("lines__product", "lines__variant", "lines__plan").get(pk=pk)
        except Subscription.DoesNotExist:
            return Response({"detail": "Subscription not found."}, status=status.HTTP_404_NOT_FOUND)

        if subscription.status != Subscription.Status.ACTIVE:
            return Response(
                {"error": f"Cannot generate invoice from subscription in '{subscription.status}' status. Subscription must be ACTIVE."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            serializer = GenerateInvoiceFromSubscriptionSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data

            cycle_start = data.get("billing_cycle_start") or subscription.start_date
            cycle_end = data.get("billing_cycle_end") or subscription.next_billing_date
            due_date = data.get("due_date") or (timezone.now().date() + timedelta(days=14))
            notes = data.get("notes") or f"Recurring invoice for subscription {subscription.subscription_number}"

            # Check if active invoice already exists for this exact subscription and cycle
            existing_invoice = Invoice.objects.select_for_update().filter(
                subscription=subscription,
                billing_cycle_start=cycle_start,
                billing_cycle_end=cycle_end,
            ).exclude(status__in=[Invoice.Status.VOID, Invoice.Status.CANCELLED])

            if existing_invoice.exists():
                return Response(
                    {"error": "An active invoice has already been generated for this subscription billing cycle."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            invoice = Invoice.objects.create(
                customer=subscription.customer,
                subscription=subscription,
                issue_date=timezone.now().date(),
                due_date=due_date,
                billing_cycle_start=cycle_start,
                billing_cycle_end=cycle_end,
                status=Invoice.Status.DRAFT,
                notes=notes,
                created_by=request.user,
            )

            # Copy lines from subscription preserving snapshot prices
            for sub_line in subscription.lines.all():
                InvoiceLine.objects.create(
                    invoice=invoice,
                    product=sub_line.product,
                    variant=sub_line.variant,
                    plan=sub_line.plan,
                    description=f"Subscription: {sub_line.product.name}",
                    quantity=sub_line.quantity,
                    unit_price=sub_line.unit_price,
                )

            invoice.calculate_totals(save=True)

        resp_serializer = InvoiceSerializer(invoice, context={"request": request})
        return Response(resp_serializer.data, status=status.HTTP_201_CREATED)
