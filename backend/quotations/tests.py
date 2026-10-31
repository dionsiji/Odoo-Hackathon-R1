from datetime import timedelta
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from customers.models import CustomerProfile
from catalog.models import Product, ProductVariant
from quotations.models import QuotationTemplate, Quotation, QuotationLine


class QuotationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = "QuotePass123!"

        self.admin = User.objects.create_superuser(
            email="quote_admin@test.com",
            password=self.password,
            first_name="Admin",
            last_name="Quote",
        )
        self.staff = User.objects.create_user(
            email="quote_staff@test.com",
            password=self.password,
            first_name="Staff",
            last_name="Quote",
            role=User.Role.STAFF,
            is_staff=True,
        )
        self.customer1 = User.objects.create_user(
            email="quote_c1@test.com",
            password=self.password,
            first_name="Alice",
            last_name="Customer",
            role=User.Role.CUSTOMER,
        )
        self.customer_profile1 = CustomerProfile.objects.create(
            user=self.customer1,
            company_name="Alice Corp"
        )
        self.customer2 = User.objects.create_user(
            email="quote_c2@test.com",
            password=self.password,
            first_name="Bob",
            last_name="Customer",
            role=User.Role.CUSTOMER,
        )
        self.customer_profile2 = CustomerProfile.objects.create(
            user=self.customer2,
            company_name="Bob Corp"
        )

        self.product1 = Product.objects.create(
            name="SaaS Suite",
            description="All-in-one SaaS platform",
            sku="PROD-SAAS-01",
        )
        self.variant1 = ProductVariant.objects.create(
            product=self.product1,
            variant_name="Enterprise User",
            sku="VAR-SAAS-ENT",
            price=Decimal("100.00"),
        )
        self.product2 = Product.objects.create(
            name="Setup Consulting",
            description="Onboarding package",
            sku="PROD-CONSULT-01",
        )

        self.template = QuotationTemplate.objects.create(
            name="Standard B2B Template",
            default_validity_days=15,
            terms_and_conditions="Payment within 30 days."
        )

    # 5. Quotation creation with multiple lines & 6. Server-side total calculation
    def test_admin_can_create_quotation_with_multiple_lines_and_server_totals(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("quotation-list-create")
        payload = {
            "customer": self.customer_profile1.id,
            "template": self.template.id,
            "expiry_date": (timezone.now() + timedelta(days=30)).date().isoformat(),
            "discount_amount": "50.00",
            "tax_amount": "15.00",
            "lines": [
                {
                    "product": self.product1.id,
                    "variant": self.variant1.id,
                    "quantity": 5,
                    "unit_price": "100.00",
                },
                {
                    "product": self.product2.id,
                    "quantity": 2,
                    "unit_price": "250.00",
                }
            ]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data

        # 5 * 100 = 500; 2 * 250 = 500; subtotal = 1000.00
        # total = 1000 - 50 + 15 = 965.00
        self.assertEqual(data["subtotal"], "1000.00")
        self.assertEqual(data["total_amount"], "965.00")
        self.assertEqual(data["status"], "DRAFT")
        self.assertTrue(data["quotation_number"].startswith("QT-"))
        self.assertEqual(len(data["lines"]), 2)

    # 7. Invalid quantities and prices validation
    def test_quotation_creation_rejects_invalid_quantities_and_prices(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("quotation-list-create")
        payload = {
            "customer": self.customer_profile1.id,
            "expiry_date": (timezone.now() + timedelta(days=30)).date().isoformat(),
            "lines": [
                {
                    "product": self.product1.id,
                    "quantity": 0,  # Invalid! MinValue is 1
                    "unit_price": "100.00",
                }
            ]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Negative unit price
        payload["lines"][0]["quantity"] = 1
        payload["lines"][0]["unit_price"] = "-20.00"
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 8. Quotation editing restrictions after submission
    def test_quotation_cannot_be_edited_once_sent(self):
        # Create draft quotation
        quotation = Quotation.objects.create(
            customer=self.customer_profile1,
            expiry_date=(timezone.now() + timedelta(days=10)).date(),
            created_by=self.admin,
            status=Quotation.Status.SENT,  # Already SENT
        )
        QuotationLine.objects.create(
            quotation=quotation,
            product=self.product1,
            quantity=1,
            unit_price=Decimal("100.00")
        )
        quotation.recalculate_totals()

        self.client.force_authenticate(user=self.admin)
        url = reverse("quotation-detail", kwargs={"pk": quotation.id})
        response = self.client.patch(url, {"discount_amount": "20.00"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only DRAFT quotations can be edited", str(response.data))

    # 9. Quotation workflow: send, accept, reject
    def test_quotation_workflow_send_accept(self):
        quotation = Quotation.objects.create(
            customer=self.customer_profile1,
            expiry_date=(timezone.now() + timedelta(days=10)).date(),
            created_by=self.admin,
            status=Quotation.Status.DRAFT,
        )
        QuotationLine.objects.create(
            quotation=quotation,
            product=self.product1,
            quantity=2,
            unit_price=Decimal("100.00")
        )
        quotation.recalculate_totals()

        # Customer tries to accept DRAFT directly -> Should FAIL
        self.client.force_authenticate(user=self.customer1)
        accept_url = reverse("quotation-accept", kwargs={"pk": quotation.id})
        response = self.client.post(accept_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Admin sends quotation -> Becomes SENT
        self.client.force_authenticate(user=self.admin)
        send_url = reverse("quotation-send", kwargs={"pk": quotation.id})
        response = self.client.post(send_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "SENT")

        # Customer accepts SENT quotation
        self.client.force_authenticate(user=self.customer1)
        response = self.client.post(accept_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ACCEPTED")

    def test_quotation_reject_workflow(self):
        quotation = Quotation.objects.create(
            customer=self.customer_profile1,
            expiry_date=(timezone.now() + timedelta(days=10)).date(),
            created_by=self.admin,
            status=Quotation.Status.SENT,
        )
        QuotationLine.objects.create(
            quotation=quotation,
            product=self.product1,
            quantity=1,
            unit_price=Decimal("100.00")
        )
        quotation.recalculate_totals()

        self.client.force_authenticate(user=self.customer1)
        reject_url = reverse("quotation-reject", kwargs={"pk": quotation.id})
        response = self.client.post(reject_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "REJECTED")

    # 10. Expired quotation handling
    def test_expired_quotation_cannot_be_accepted_or_sent(self):
        past_date = (timezone.now() - timedelta(days=2)).date()
        quotation = Quotation.objects.create(
            customer=self.customer_profile1,
            issue_date=past_date - timedelta(days=5),
            expiry_date=past_date,
            created_by=self.admin,
            status=Quotation.Status.SENT,
        )
        QuotationLine.objects.create(
            quotation=quotation,
            product=self.product1,
            quantity=1,
            unit_price=Decimal("100.00")
        )

        self.client.force_authenticate(user=self.customer1)
        accept_url = reverse("quotation-accept", kwargs={"pk": quotation.id})
        response = self.client.post(accept_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", str(response.data).lower())

        quotation.refresh_from_db()
        self.assertEqual(quotation.status, Quotation.Status.EXPIRED)

    # Customer isolation
    def test_customer_cannot_see_or_accept_other_customer_quotation(self):
        quotation = Quotation.objects.create(
            customer=self.customer_profile2,  # Customer 2's quotation
            expiry_date=(timezone.now() + timedelta(days=10)).date(),
            created_by=self.admin,
            status=Quotation.Status.SENT,
        )
        QuotationLine.objects.create(
            quotation=quotation,
            product=self.product1,
            quantity=1,
            unit_price=Decimal("100.00")
        )

        # Customer 1 attempts to access customer 2's quotation
        self.client.force_authenticate(user=self.customer1)
        url = reverse("quotation-detail", kwargs={"pk": quotation.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Customer 1 attempts to accept customer 2's quotation
        accept_url = reverse("quotation-accept", kwargs={"pk": quotation.id})
        response = self.client.post(accept_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Customer 1 attempts to reject customer 2's quotation
        reject_url = reverse("quotation-reject", kwargs={"pk": quotation.id})
        response = self.client.post(reject_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_cannot_modify_quotation_prices_or_status(self):
        quotation = Quotation.objects.create(
            customer=self.customer_profile1,
            expiry_date=(timezone.now() + timedelta(days=10)).date(),
            created_by=self.admin,
            status=Quotation.Status.SENT,
        )
        QuotationLine.objects.create(
            quotation=quotation,
            product=self.product1,
            quantity=1,
            unit_price=Decimal("100.00")
        )
        quotation.recalculate_totals()

        self.client.force_authenticate(user=self.customer1)
        url = reverse("quotation-detail", kwargs={"pk": quotation.id})
        # Customer attempts to alter quotation status to ACCEPTED directly via PATCH
        resp = self.client.patch(url, {"status": "ACCEPTED", "total_amount": "0.00"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        quotation.refresh_from_db()
        self.assertEqual(quotation.status, Quotation.Status.SENT)
        self.assertEqual(quotation.total_amount, Decimal("100.00"))

    def test_client_cannot_override_server_calculated_totals_on_create(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("quotation-list-create")
        payload = {
            "customer": self.customer_profile1.id,
            "expiry_date": (timezone.now() + timedelta(days=30)).date().isoformat(),
            "subtotal": "1.00",  # Fake submitted values
            "total_amount": "1.00",
            "lines": [
                {
                    "product": self.product1.id,
                    "quantity": 2,
                    "unit_price": "100.00",
                    "line_total": "5.00"  # Fake submitted line total
                }
            ]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Server must override with calculated values: 2 * 100.00 = 200.00
        self.assertEqual(response.data["subtotal"], "200.00")
        self.assertEqual(response.data["total_amount"], "200.00")
        self.assertEqual(response.data["lines"][0]["line_total"], "200.00")

    def test_negative_discounts_and_taxes_rejected(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("quotation-list-create")
        base_payload = {
            "customer": self.customer_profile1.id,
            "expiry_date": (timezone.now() + timedelta(days=30)).date().isoformat(),
            "lines": [{"product": self.product1.id, "quantity": 1, "unit_price": "50.00"}]
        }
        # Negative discount
        payload = dict(base_payload, discount_amount="-10.00")
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("discount_amount", resp.data)

        # Negative tax
        payload = dict(base_payload, tax_amount="-5.00")
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tax_amount", resp.data)

    def test_cannot_bypass_expiry_via_accept_payload(self):
        past_date = (timezone.now() - timedelta(days=5)).date()
        quotation = Quotation.objects.create(
            customer=self.customer_profile1,
            issue_date=past_date - timedelta(days=5),
            expiry_date=past_date,
            created_by=self.admin,
            status=Quotation.Status.SENT,
        )
        QuotationLine.objects.create(
            quotation=quotation,
            product=self.product1,
            quantity=1,
            unit_price=Decimal("100.00")
        )
        self.client.force_authenticate(user=self.customer1)
        accept_url = reverse("quotation-accept", kwargs={"pk": quotation.id})
        # Attempt to pass a new expiry date or status in payload
        future_date = (timezone.now() + timedelta(days=10)).date().isoformat()
        resp = self.client.post(accept_url, {"expiry_date": future_date, "status": "SENT"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        quotation.refresh_from_db()
        self.assertEqual(quotation.status, Quotation.Status.EXPIRED)

