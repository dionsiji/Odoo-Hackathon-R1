"""
Focused tests for Module 3 Phase 2:
- Payments (create, refund, overpayment, isolation, invoice status transitions)
- Recurring billing run
- Analytics overview
- ActivityLog and Notifications
- CSV export and import
- Global search
- PDF invoice endpoint (status code only)
"""

from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from customers.models import CustomerProfile
from catalog.models import Product, ProductVariant, SubscriptionPlan
from subscriptions.models import Subscription, SubscriptionLine
from quotations.models import Quotation, QuotationLine
from billing.models import Invoice, InvoiceLine, Payment, TaxRate, Discount
from core.models import ActivityLog, Notification


class Phase2BillingTests(APITestCase):
    def setUp(self):
        # Users
        self.admin = User.objects.create_superuser(
            email="admin@phase2.com", password="AdminPass123!",
            first_name="Admin", last_name="User"
        )
        self.customer_user = User.objects.create_user(
            email="cust@phase2.com", password="CustPass123!",
            role=User.Role.CUSTOMER, first_name="John", last_name="Doe"
        )
        self.customer_user_2 = User.objects.create_user(
            email="cust2@phase2.com", password="CustPass123!",
            role=User.Role.CUSTOMER, first_name="Jane", last_name="Doe"
        )

        # Customer profiles
        self.profile = CustomerProfile.objects.create(
            user=self.customer_user, company_name="Acme Corp"
        )
        self.profile_2 = CustomerProfile.objects.create(
            user=self.customer_user_2, company_name="Beta Corp"
        )

        # Catalog
        self.product = Product.objects.create(name="Widget", sku="W-001", category="Tools")
        self.plan = SubscriptionPlan.objects.create(
            name="Monthly Widget",
            product=self.product,
            price=Decimal("100.00"),
            billing_interval=SubscriptionPlan.BillingInterval.MONTHLY,
        )

        # Issued invoice for customer
        self.invoice = Invoice.objects.create(
            customer=self.profile,
            due_date=timezone.now().date() + timedelta(days=30),
            status=Invoice.Status.ISSUED,
            created_by=self.admin,
        )
        InvoiceLine.objects.create(
            invoice=self.invoice, product=self.product,
            quantity=2, unit_price=Decimal("100.00"),
        )
        self.invoice.calculate_totals(save=True)
        # invoice.total_amount = 200.00

    # ─── PAYMENT CREATION ────────────────────────────────────────────────────

    def test_admin_can_record_partial_payment(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post("/api/v1/payments/", {
            "invoice": self.invoice.id,
            "amount": "80.00",
            "payment_method": "MANUAL",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.amount_paid, Decimal("80.00"))
        self.assertEqual(self.invoice.amount_due, Decimal("120.00"))
        self.assertEqual(self.invoice.status, Invoice.Status.PARTIALLY_PAID)

    def test_full_payment_marks_invoice_paid(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post("/api/v1/payments/", {
            "invoice": self.invoice.id,
            "amount": "200.00",
            "payment_method": "BANK_TRANSFER",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.PAID)
        self.assertEqual(self.invoice.amount_due, Decimal("0.00"))

    def test_overpayment_rejected(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post("/api/v1/payments/", {
            "invoice": self.invoice.id,
            "amount": "999.99",
            "payment_method": "CASH",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_negative_payment_rejected(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post("/api/v1/payments/", {
            "invoice": self.invoice.id,
            "amount": "-10.00",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_cannot_create_payment(self):
        self.client.force_authenticate(user=self.customer_user)
        resp = self.client.post("/api/v1/payments/", {
            "invoice": self.invoice.id,
            "amount": "100.00",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_payment_isolation(self):
        # Pay invoice for customer 1
        payment = Payment.objects.create(
            invoice=self.invoice,
            customer=self.profile,
            amount=Decimal("50.00"),
            created_by=self.admin,
        )
        # Customer 2 cannot see customer 1's payment
        self.client.force_authenticate(user=self.customer_user_2)
        resp = self.client.get(f"/api/v1/payments/{payment.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # ─── PAYMENT REFUND ──────────────────────────────────────────────────────

    def test_refund_reverses_invoice_balance(self):
        self.client.force_authenticate(user=self.admin)
        # Record full payment
        self.client.post("/api/v1/payments/", {
            "invoice": self.invoice.id,
            "amount": "200.00",
            "payment_method": "MANUAL",
        }, format="json")
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.Status.PAID)

        payment = Payment.objects.get(invoice=self.invoice)
        resp = self.client.post(f"/api/v1/payments/{payment.id}/refund/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.amount_paid, Decimal("0.00"))
        self.assertEqual(self.invoice.status, Invoice.Status.ISSUED)

    def test_cannot_refund_non_completed_payment(self):
        payment = Payment.objects.create(
            invoice=self.invoice,
            customer=self.profile,
            amount=Decimal("50.00"),
            status=Payment.PaymentStatus.PENDING,
            created_by=self.admin,
        )
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f"/api/v1/payments/{payment.id}/refund/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ─── RECURRING BILLING ───────────────────────────────────────────────────

    def test_billing_run_generates_invoices_for_due_subscriptions(self):
        sub = Subscription.objects.create(
            customer=self.profile,
            status=Subscription.Status.ACTIVE,
            start_date=timezone.now().date() - timedelta(days=31),
            next_billing_date=timezone.now().date() - timedelta(days=1),
            created_by=self.admin,
        )
        SubscriptionLine.objects.create(
            subscription=sub, product=self.product, plan=self.plan,
            quantity=1, unit_price=Decimal("100.00"),
        )

        self.client.force_authenticate(user=self.admin)
        resp = self.client.post("/api/v1/billing/run/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["invoices_created"], 1)

        sub.refresh_from_db()
        # next_billing_date should be advanced
        self.assertGreater(sub.next_billing_date, timezone.now().date())

    def test_billing_run_idempotent_skips_duplicate_cycle(self):
        """
        After first billing run, next_billing_date advances to a future date.
        Second run finds no due subscriptions — 0 created, 0 skipped.
        To test the skip path explicitly, we create an invoice for the cycle
        BEFORE advancing next_billing_date.
        """
        from dateutil.relativedelta import relativedelta
        today = timezone.now().date()
        cycle_start = today - timedelta(days=1)
        cycle_end = cycle_start + relativedelta(months=1)

        sub = Subscription.objects.create(
            customer=self.profile,
            status=Subscription.Status.ACTIVE,
            start_date=today - timedelta(days=32),
            next_billing_date=cycle_start,
            created_by=self.admin,
        )
        SubscriptionLine.objects.create(
            subscription=sub, product=self.product, plan=self.plan,
            quantity=1, unit_price=Decimal("100.00"),
        )
        # Pre-create the invoice for this exact cycle window
        Invoice.objects.create(
            customer=self.profile,
            subscription=sub,
            due_date=today + timedelta(days=14),
            billing_cycle_start=cycle_start,
            billing_cycle_end=cycle_end,
            status=Invoice.Status.DRAFT,
            created_by=self.admin,
        )

        self.client.force_authenticate(user=self.admin)
        resp = self.client.post("/api/v1/billing/run/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # The run should SKIP this subscription because an active invoice already exists
        self.assertEqual(resp.data["invoices_created"], 0)
        self.assertIn(sub.subscription_number, resp.data["skipped_subscriptions"])

    # ─── ANALYTICS ───────────────────────────────────────────────────────────

    def test_analytics_overview_requires_admin(self):
        self.client.force_authenticate(user=self.customer_user)
        resp = self.client.get("/api/v1/analytics/overview/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_analytics_overview_returns_metrics(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/v1/analytics/overview/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for key in ["total_revenue_collected", "mrr", "arr", "subscriptions", "invoices", "outstanding_receivables"]:
            self.assertIn(key, resp.data)

    # ─── NOTIFICATIONS ────────────────────────────────────────────────────────

    def test_payment_creates_notification(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post("/api/v1/payments/", {
            "invoice": self.invoice.id,
            "amount": "50.00",
            "payment_method": "MANUAL",
        }, format="json")
        # Customer should have received a notification
        notif = Notification.objects.filter(
            recipient=self.customer_user,
            notification_type=Notification.NotificationType.PAYMENT_RECEIVED,
        )
        self.assertTrue(notif.exists())

    def test_customer_can_list_and_mark_notifications(self):
        Notification.objects.create(
            recipient=self.customer_user,
            notification_type=Notification.NotificationType.GENERAL,
            title="Test",
            message="Hello",
        )
        self.client.force_authenticate(user=self.customer_user)
        resp = self.client.get("/api/v1/notifications/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        notif_id = (resp.data["results"] if "results" in resp.data else resp.data)[0]["id"]

        mark_resp = self.client.post(f"/api/v1/notifications/{notif_id}/mark-read/", {}, format="json")
        self.assertEqual(mark_resp.status_code, status.HTTP_200_OK)

    # ─── CSV EXPORT ───────────────────────────────────────────────────────────

    def test_csv_export_customers_admin_only(self):
        self.client.force_authenticate(user=self.customer_user)
        resp = self.client.get("/api/v1/export/customers.csv")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_csv_export_customers_returns_csv(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/v1/export/customers.csv")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", resp["Content-Type"])

    def test_csv_export_invoices(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/v1/export/invoices.csv")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", resp["Content-Type"])

    # ─── GLOBAL SEARCH ────────────────────────────────────────────────────────

    def test_global_search_returns_results(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/v1/search/?q=Widget")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("products", resp.data["results"])
        self.assertTrue(len(resp.data["results"]["products"]) > 0)

    def test_global_search_customer_isolation(self):
        # Customer can only see own invoices in search
        self.client.force_authenticate(user=self.customer_user_2)
        resp = self.client.get("/api/v1/search/?q=INV&types=invoices")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        inv_ids = [i["id"] for i in resp.data["results"].get("invoices", [])]
        self.assertNotIn(self.invoice.id, inv_ids)

    # ─── PDF INVOICE ──────────────────────────────────────────────────────────

    def test_pdf_invoice_download(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(f"/api/v1/invoices/{self.invoice.id}/pdf/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp["Content-Type"], "application/pdf")

    def test_pdf_invoice_customer_isolation(self):
        self.client.force_authenticate(user=self.customer_user_2)
        resp = self.client.get(f"/api/v1/invoices/{self.invoice.id}/pdf/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
