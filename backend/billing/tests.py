"""
Automated regression tests for the billing app in Brightloop.
Covers:
- TaxRate CRUD, bounds validation, RBAC
- Discount calculations, expiration, minimum amount validation
- Invoice creation, lines, and server-side Decimal totals
- Invoice lifecycle state transitions (DRAFT -> ISSUED -> VOID / CANCELLED, OVERDUE lazy check)
- Quotation to Invoice conversion and duplicate prevention
- Subscription to Invoice generation and duplicate prevention
- Customer data isolation and permission enforcement
- Financial validation (negative quantities, prices)
"""

from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from customers.models import CustomerProfile
from catalog.models import Product, ProductVariant, SubscriptionPlan
from quotations.models import Quotation, QuotationLine
from subscriptions.models import Subscription, SubscriptionLine
from billing.models import TaxRate, Discount, Invoice, InvoiceLine


class BillingModuleTests(APITestCase):
    def setUp(self):
        # 1. Users
        self.admin = User.objects.create_superuser(
            email="admin@billing.com",
            password="StrongPassword123!",
            first_name="Admin",
            last_name="User",
        )
        self.staff = User.objects.create_user(
            email="staff@billing.com",
            password="StrongPassword123!",
            role=User.Role.STAFF,
            first_name="Staff",
            last_name="User",
        )
        self.customer_user_1 = User.objects.create_user(
            email="cust1@billing.com",
            password="StrongPassword123!",
            role=User.Role.CUSTOMER,
            first_name="Cust",
            last_name="One",
        )
        self.customer_user_2 = User.objects.create_user(
            email="cust2@billing.com",
            password="StrongPassword123!",
            role=User.Role.CUSTOMER,
            first_name="Cust",
            last_name="Two",
        )

        # 2. Customer Profiles
        self.profile_1 = CustomerProfile.objects.create(
            user=self.customer_user_1,
            company_name="Corp One",
        )
        self.profile_2 = CustomerProfile.objects.create(
            user=self.customer_user_2,
            company_name="Corp Two",
        )

        # 3. Catalog items
        self.product = Product.objects.create(
            name="Cloud Server",
            sku="PROD-CS-001",
            category="Infrastructure",
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            variant_name="16GB RAM",
            sku="VAR-CS-16GB",
            price=Decimal("150.00"),
        )
        self.plan = SubscriptionPlan.objects.create(
            name="Pro Plan",
            product=self.product,
            variant=self.variant,
            price=Decimal("120.00"),
            billing_interval=SubscriptionPlan.BillingInterval.MONTHLY,
        )

        # 4. Tax Rate
        self.tax_rate_10 = TaxRate.objects.create(
            name="VAT 10%",
            code="VAT10",
            rate=Decimal("10.00"),
        )

        # 5. Discounts
        self.pct_discount = Discount.objects.create(
            code="SAVE20",
            discount_type=Discount.DiscountType.PERCENTAGE,
            amount=Decimal("20.00"),
        )
        self.fixed_discount = Discount.objects.create(
            code="FIXED50",
            discount_type=Discount.DiscountType.FIXED_AMOUNT,
            amount=Decimal("50.00"),
            min_order_amount=Decimal("100.00"),
        )

    # =========================================================================
    # TAX RATE TESTS
    # =========================================================================

    def test_tax_rate_crud_and_permissions(self):
        # Admin can create
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post("/api/v1/tax-rates/", {
            "name": "GST 18%",
            "code": "GST18",
            "rate": "18.00",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["rate"], "18.00")

        # Customer cannot create tax rate
        self.client.force_authenticate(user=self.customer_user_1)
        resp_cust = self.client.post("/api/v1/tax-rates/", {
            "name": "Invalid Tax",
            "code": "INVTAX",
            "rate": "5.00",
        }, format="json")
        self.assertEqual(resp_cust.status_code, status.HTTP_403_FORBIDDEN)

        # Customer can view active tax rate
        resp_list = self.client.get("/api/v1/tax-rates/")
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp_list.data["results"] if "results" in resp_list.data else resp_list.data), 1)

    def test_tax_rate_validation(self):
        self.client.force_authenticate(user=self.admin)
        # Invalid: rate > 100%
        resp = self.client.post("/api/v1/tax-rates/", {
            "name": "Excessive Tax",
            "code": "EXCESS",
            "rate": "105.00",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # DISCOUNT TESTS
    # =========================================================================

    def test_discount_calculation_and_validation(self):
        # 20% discount on $200 -> $40.00
        calc_pct = self.pct_discount.calculate_discount(Decimal("200.00"))
        self.assertEqual(calc_pct, Decimal("40.00"))

        # Fixed $50 on $200 -> $50.00
        calc_fixed = self.fixed_discount.calculate_discount(Decimal("200.00"))
        self.assertEqual(calc_fixed, Decimal("50.00"))

        # Fixed $50 on $80 (below min_order_amount of 100) -> $0.00
        calc_below_min = self.fixed_discount.calculate_discount(Decimal("80.00"))
        self.assertEqual(calc_below_min, Decimal("0.00"))

        # Expired discount
        expired_discount = Discount.objects.create(
            code="EXPIRED10",
            discount_type=Discount.DiscountType.PERCENTAGE,
            amount=Decimal("10.00"),
            valid_to=timezone.now().date() - timedelta(days=1),
        )
        self.assertEqual(expired_discount.calculate_discount(Decimal("100.00")), Decimal("0.00"))

    # =========================================================================
    # INVOICE CREATION & TOTALS CALCULATION
    # =========================================================================

    def test_admin_create_invoice_with_lines_and_automatic_calculation(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "customer": self.profile_1.id,
            "due_date": str(timezone.now().date() + timedelta(days=30)),
            "tax_rate": self.tax_rate_10.id,
            "discount": self.pct_discount.id,  # 20%
            "lines": [
                {
                    "product": self.product.id,
                    "variant": self.variant.id,
                    "quantity": 2,
                    "unit_price": "150.00",  # line 1 total = 300.00
                },
                {
                    "product": self.product.id,
                    "plan": self.plan.id,
                    "quantity": 1,
                    "unit_price": "120.00",  # line 2 total = 120.00
                },
            ],
            # Attempting frontend overrides to verify server-side rejection/overwriting
            "subtotal": "9999.00",
            "total_amount": "1.00",
        }
        resp = self.client.post("/api/v1/invoices/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        # Expected calculations:
        # Subtotal: 300.00 + 120.00 = 420.00
        # Discount: 20% of 420.00 = 84.00
        # Tax base: 420.00 - 84.00 = 336.00
        # Tax 10%: 33.60
        # Total: 336.00 + 33.60 = 369.60
        # Amount Due: 369.60
        self.assertEqual(Decimal(resp.data["subtotal"]), Decimal("420.00"))
        self.assertEqual(Decimal(resp.data["discount_amount"]), Decimal("84.00"))
        self.assertEqual(Decimal(resp.data["tax_amount"]), Decimal("33.60"))
        self.assertEqual(Decimal(resp.data["total_amount"]), Decimal("369.60"))
        self.assertEqual(Decimal(resp.data["amount_due"]), Decimal("369.60"))
        self.assertEqual(Decimal(resp.data["amount_paid"]), Decimal("0.00"))
        self.assertEqual(resp.data["status"], "DRAFT")

    def test_negative_values_rejected(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "customer": self.profile_1.id,
            "due_date": str(timezone.now().date() + timedelta(days=30)),
            "lines": [
                {
                    "product": self.product.id,
                    "quantity": -5,
                    "unit_price": "100.00",
                }
            ],
        }
        resp = self.client.post("/api/v1/invoices/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # INVOICE LIFECYCLE TESTS
    # =========================================================================

    def test_invoice_issue_and_immutability(self):
        self.client.force_authenticate(user=self.admin)
        invoice = Invoice.objects.create(
            customer=self.profile_1,
            due_date=timezone.now().date() + timedelta(days=14),
            created_by=self.admin,
        )
        InvoiceLine.objects.create(
            invoice=invoice,
            product=self.product,
            quantity=1,
            unit_price=Decimal("100.00"),
        )
        invoice.calculate_totals(save=True)

        # Issue invoice
        resp = self.client.post(f"/api/v1/invoices/{invoice.id}/issue/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "ISSUED")

        # Cannot edit issued invoice
        resp_edit = self.client.patch(f"/api/v1/invoices/{invoice.id}/", {"notes": "Modified"}, format="json")
        self.assertEqual(resp_edit.status_code, status.HTTP_400_BAD_REQUEST)

        # Cannot delete issued invoice
        resp_del = self.client.delete(f"/api/v1/invoices/{invoice.id}/")
        self.assertEqual(resp_del.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_issue_invoice_without_lines(self):
        self.client.force_authenticate(user=self.admin)
        invoice = Invoice.objects.create(
            customer=self.profile_1,
            due_date=timezone.now().date() + timedelta(days=14),
            created_by=self.admin,
        )
        resp = self.client.post(f"/api/v1/invoices/{invoice.id}/issue/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("no line items", resp.data["error"])

    def test_invoice_void_and_cancel(self):
        self.client.force_authenticate(user=self.admin)
        # Cancel draft
        inv_draft = Invoice.objects.create(
            customer=self.profile_1,
            due_date=timezone.now().date() + timedelta(days=14),
            created_by=self.admin,
        )
        resp_cancel = self.client.post(f"/api/v1/invoices/{inv_draft.id}/cancel/", {}, format="json")
        self.assertEqual(resp_cancel.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_cancel.data["status"], "CANCELLED")

        # Void issued
        inv_issued = Invoice.objects.create(
            customer=self.profile_1,
            status=Invoice.Status.ISSUED,
            due_date=timezone.now().date() + timedelta(days=14),
            created_by=self.admin,
        )
        InvoiceLine.objects.create(
            invoice=inv_issued,
            product=self.product,
            quantity=1,
            unit_price=Decimal("100.00"),
        )
        inv_issued.calculate_totals(save=True)

        resp_void = self.client.post(f"/api/v1/invoices/{inv_issued.id}/void/", {}, format="json")
        self.assertEqual(resp_void.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_void.data["status"], "VOID")

    def test_invoice_lazy_overdue(self):
        # Invoice issued in the past
        past_date = timezone.now().date() - timedelta(days=5)
        inv = Invoice.objects.create(
            customer=self.profile_1,
            status=Invoice.Status.ISSUED,
            issue_date=past_date - timedelta(days=10),
            due_date=past_date,
            created_by=self.admin,
        )
        InvoiceLine.objects.create(
            invoice=inv,
            product=self.product,
            quantity=1,
            unit_price=Decimal("100.00"),
        )
        inv.calculate_totals(save=True)

        self.client.force_authenticate(user=self.customer_user_1)
        resp = self.client.get(f"/api/v1/invoices/{inv.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "OVERDUE")

    # =========================================================================
    # QUOTATION TO INVOICE CONVERSION
    # =========================================================================

    def test_convert_accepted_quotation_to_invoice(self):
        self.client.force_authenticate(user=self.admin)
        quotation = Quotation.objects.create(
            customer=self.profile_1,
            status=Quotation.Status.ACCEPTED,
            expiry_date=timezone.now().date() + timedelta(days=30),
            created_by=self.admin,
        )
        QuotationLine.objects.create(
            quotation=quotation,
            product=self.product,
            variant=self.variant,
            description="Dedicated Server Spec",
            quantity=2,
            unit_price=Decimal("150.00"),
        )
        quotation.recalculate_totals()

        resp = self.client.post(f"/api/v1/quotations/{quotation.id}/generate-invoice/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(resp.data["total_amount"]), Decimal("300.00"))
        self.assertEqual(len(resp.data["lines"]), 1)
        self.assertEqual(resp.data["lines"][0]["description"], "Dedicated Server Spec")

        # Duplicate conversion prevention
        resp_dup = self.client.post(f"/api/v1/quotations/{quotation.id}/generate-invoice/", {}, format="json")
        self.assertEqual(resp_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been generated", resp_dup.data["error"])

    def test_cannot_convert_unaccepted_quotation(self):
        self.client.force_authenticate(user=self.admin)
        draft_q = Quotation.objects.create(
            customer=self.profile_1,
            status=Quotation.Status.DRAFT,
            expiry_date=timezone.now().date() + timedelta(days=30),
            created_by=self.admin,
        )
        resp = self.client.post(f"/api/v1/quotations/{draft_q.id}/generate-invoice/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # SUBSCRIPTION TO INVOICE GENERATION
    # =========================================================================

    def test_generate_invoice_from_active_subscription(self):
        self.client.force_authenticate(user=self.admin)
        sub = Subscription.objects.create(
            customer=self.profile_1,
            status=Subscription.Status.ACTIVE,
            start_date=timezone.now().date(),
            next_billing_date=timezone.now().date() + timedelta(days=30),
            created_by=self.admin,
        )
        SubscriptionLine.objects.create(
            subscription=sub,
            product=self.product,
            plan=self.plan,
            quantity=1,
            unit_price=Decimal("120.00"),
        )

        resp = self.client.post(f"/api/v1/subscriptions/{sub.id}/generate-invoice/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(resp.data["total_amount"]), Decimal("120.00"))
        self.assertEqual(resp.data["subscription"], sub.id)

        # Duplicate prevention for the same billing cycle
        resp_dup = self.client.post(f"/api/v1/subscriptions/{sub.id}/generate-invoice/", {}, format="json")
        self.assertEqual(resp_dup.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # CUSTOMER DATA ISOLATION & RBAC
    # =========================================================================

    def test_customer_data_isolation(self):
        # Invoice for Customer 1
        inv1 = Invoice.objects.create(
            customer=self.profile_1,
            due_date=timezone.now().date() + timedelta(days=14),
            created_by=self.admin,
        )
        # Invoice for Customer 2
        inv2 = Invoice.objects.create(
            customer=self.profile_2,
            due_date=timezone.now().date() + timedelta(days=14),
            created_by=self.admin,
        )

        # Customer 1 can see inv1
        self.client.force_authenticate(user=self.customer_user_1)
        resp1 = self.client.get(f"/api/v1/invoices/{inv1.id}/")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Customer 1 CANNOT see inv2 (returns 404)
        resp2 = self.client.get(f"/api/v1/invoices/{inv2.id}/")
        self.assertEqual(resp2.status_code, status.HTTP_404_NOT_FOUND)

        # Listing for Customer 1 contains only inv1
        resp_list = self.client.get("/api/v1/invoices/")
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)
        inv_ids = [item["id"] for item in (resp_list.data["results"] if "results" in resp_list.data else resp_list.data)]
        self.assertIn(inv1.id, inv_ids)
        self.assertNotIn(inv2.id, inv_ids)

        # Customer 1 cannot create invoice
        resp_create = self.client.post("/api/v1/invoices/", {
            "customer": self.profile_1.id,
            "due_date": str(timezone.now().date() + timedelta(days=14)),
        }, format="json")
        self.assertEqual(resp_create.status_code, status.HTTP_403_FORBIDDEN)
