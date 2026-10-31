from datetime import timedelta
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from customers.models import CustomerProfile
from catalog.models import Product, ProductVariant, SubscriptionPlan
from quotations.models import Quotation, QuotationLine
from subscriptions.models import Subscription, SubscriptionLine


class SubscriptionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = "SubPass123!"

        self.admin = User.objects.create_superuser(
            email="sub_admin@test.com",
            password=self.password,
            first_name="Admin",
            last_name="Sub",
        )
        self.staff = User.objects.create_user(
            email="sub_staff@test.com",
            password=self.password,
            first_name="Staff",
            last_name="Sub",
            role=User.Role.STAFF,
            is_staff=True,
        )
        self.customer1 = User.objects.create_user(
            email="sub_c1@test.com",
            password=self.password,
            first_name="Customer",
            last_name="One",
            role=User.Role.CUSTOMER,
        )
        self.customer_profile1 = CustomerProfile.objects.create(
            user=self.customer1,
            company_name="Alpha Corp"
        )
        self.customer2 = User.objects.create_user(
            email="sub_c2@test.com",
            password=self.password,
            first_name="Customer",
            last_name="Two",
            role=User.Role.CUSTOMER,
        )
        self.customer_profile2 = CustomerProfile.objects.create(
            user=self.customer2,
            company_name="Beta Corp"
        )

        self.product = Product.objects.create(
            name="Analytics Tool",
            sku="PROD-ANALYTICS-01",
            category="Analytics"
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            variant_name="Pro Seat",
            sku="VAR-ANALYTICS-PRO",
            price=Decimal("80.00")
        )
        self.plan = SubscriptionPlan.objects.create(
            name="Analytics Pro Monthly",
            product=self.product,
            variant=self.variant,
            price=Decimal("75.00"),
            billing_interval=SubscriptionPlan.BillingInterval.MONTHLY
        )

        # Create an accepted quotation
        self.accepted_quotation = Quotation.objects.create(
            customer=self.customer_profile1,
            expiry_date=(timezone.now() + timedelta(days=20)).date(),
            created_by=self.admin,
            status=Quotation.Status.ACCEPTED,
        )
        self.quote_line = QuotationLine.objects.create(
            quotation=self.accepted_quotation,
            product=self.product,
            variant=self.variant,
            quantity=3,
            unit_price=Decimal("75.00")
        )
        self.accepted_quotation.recalculate_totals()

    # 11. Subscription creation from an accepted quotation
    def test_create_subscription_from_accepted_quotation(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("subscription-list-create")
        payload = {
            "quotation": self.accepted_quotation.id,
            "customer": self.customer_profile1.id,
            "start_date": timezone.now().date().isoformat(),
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        self.assertEqual(data["status"], "DRAFT")
        self.assertEqual(data["quotation"], self.accepted_quotation.id)
        self.assertTrue(data["subscription_number"].startswith("SUB-"))
        self.assertEqual(len(data["lines"]), 1)
        self.assertEqual(data["lines"][0]["quantity"], 3)
        self.assertEqual(data["lines"][0]["unit_price"], "75.00")
        self.assertEqual(data["lines"][0]["line_total"], "225.00")

    # 12. Duplicate subscription prevention
    def test_prevent_duplicate_subscription_from_same_quotation(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("subscription-list-create")
        payload = {
            "quotation": self.accepted_quotation.id,
            "customer": self.customer_profile1.id,
        }
        resp1 = self.client.post(url, payload, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        # Attempt to create second subscription from same accepted quotation
        resp2 = self.client.post(url, payload, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quotation", resp2.data)

    # Cannot create subscription from draft quotation
    def test_cannot_create_subscription_from_unaccepted_quotation(self):
        draft_quote = Quotation.objects.create(
            customer=self.customer_profile1,
            expiry_date=(timezone.now() + timedelta(days=20)).date(),
            created_by=self.admin,
            status=Quotation.Status.DRAFT,
        )
        self.client.force_authenticate(user=self.admin)
        url = reverse("subscription-list-create")
        payload = {
            "quotation": draft_quote.id,
            "customer": self.customer_profile1.id,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quotation", response.data)

    # 13. Subscription activation
    def test_subscription_activation(self):
        sub = Subscription.objects.create(
            customer=self.customer_profile1,
            created_by=self.admin,
            status=Subscription.Status.DRAFT,
        )
        SubscriptionLine.objects.create(
            subscription=sub,
            product=self.product,
            variant=self.variant,
            plan=self.plan,
            quantity=1,
            unit_price=Decimal("75.00")
        )

        self.client.force_authenticate(user=self.admin)
        url = reverse("subscription-activate", kwargs={"pk": sub.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ACTIVE")
        self.assertIsNotNone(response.data["next_billing_date"])

    # 14. Pause and resume
    def test_subscription_pause_and_resume(self):
        sub = Subscription.objects.create(
            customer=self.customer_profile1,
            created_by=self.admin,
            status=Subscription.Status.ACTIVE,
            next_billing_date=timezone.now().date() + timedelta(days=15),
        )

        self.client.force_authenticate(user=self.admin)
        # Pause
        pause_url = reverse("subscription-pause", kwargs={"pk": sub.id})
        response = self.client.post(pause_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "PAUSED")

        # Resume
        resume_url = reverse("subscription-resume", kwargs={"pk": sub.id})
        response = self.client.post(resume_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ACTIVE")

    # 15. Renewal and closure
    def test_subscription_renewal(self):
        initial_next_billing = timezone.now().date() + timedelta(days=10)
        sub = Subscription.objects.create(
            customer=self.customer_profile1,
            created_by=self.admin,
            status=Subscription.Status.ACTIVE,
            next_billing_date=initial_next_billing,
        )
        SubscriptionLine.objects.create(
            subscription=sub,
            product=self.product,
            plan=self.plan,
            quantity=1,
            unit_price=Decimal("75.00")
        )

        self.client.force_authenticate(user=self.admin)
        renew_url = reverse("subscription-renew", kwargs={"pk": sub.id})
        response = self.client.post(renew_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Next billing advanced by 1 month
        self.assertNotEqual(response.data["next_billing_date"], initial_next_billing.isoformat())

    def test_subscription_close(self):
        sub = Subscription.objects.create(
            customer=self.customer_profile1,
            created_by=self.admin,
            status=Subscription.Status.ACTIVE,
        )

        self.client.force_authenticate(user=self.admin)
        close_url = reverse("subscription-close", kwargs={"pk": sub.id})
        response = self.client.post(close_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "CLOSED")
        self.assertIsNotNone(response.data["end_date"])

    # 16. Invalid lifecycle transitions
    def test_invalid_lifecycle_transitions(self):
        sub = Subscription.objects.create(
            customer=self.customer_profile1,
            created_by=self.admin,
            status=Subscription.Status.DRAFT,
        )
        self.client.force_authenticate(user=self.admin)

        # Cannot pause a draft
        pause_url = reverse("subscription-pause", kwargs={"pk": sub.id})
        response = self.client.post(pause_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Cannot resume a draft
        resume_url = reverse("subscription-resume", kwargs={"pk": sub.id})
        response = self.client.post(resume_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Cannot renew a draft
        renew_url = reverse("subscription-renew", kwargs={"pk": sub.id})
        response = self.client.post(renew_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 17. Customer subscription isolation & 18. Prevention of unauthorised price/status mods
    def test_customer_isolation_and_unauthorized_alteration(self):
        sub2 = Subscription.objects.create(
            customer=self.customer_profile2,
            created_by=self.admin,
            status=Subscription.Status.ACTIVE,
        )

        self.client.force_authenticate(user=self.customer1)
        # Cannot see customer 2's subscription
        url = reverse("subscription-detail", kwargs={"pk": sub2.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Customer cannot pause or activate any subscription
        pause_url = reverse("subscription-pause", kwargs={"pk": sub2.id})
        response = self.client.post(pause_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Customer cannot alter price or status via PATCH
        sub1 = Subscription.objects.create(
            customer=self.customer_profile1,
            created_by=self.admin,
            status=Subscription.Status.ACTIVE,
        )
        sub1_url = reverse("subscription-detail", kwargs={"pk": sub1.id})
        response = self.client.patch(sub1_url, {"status": "CLOSED"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # 19. Historical price snapshot preserved
    def test_historical_price_snapshot_preserved(self):
        sub = Subscription.objects.create(
            customer=self.customer_profile1,
            created_by=self.admin,
            status=Subscription.Status.ACTIVE,
        )
        line = SubscriptionLine.objects.create(
            subscription=sub,
            product=self.product,
            variant=self.variant,
            plan=self.plan,
            quantity=1,
            unit_price=Decimal("75.00")
        )

        # Later, catalog prices are changed
        self.plan.price = Decimal("150.00")
        self.plan.save()
        self.variant.price = Decimal("160.00")
        self.variant.save()

        # Check existing subscription line unit price
        line.refresh_from_db()
        self.assertEqual(line.unit_price, Decimal("75.00"))
        self.assertEqual(line.line_total, Decimal("75.00"))

    # Additional Edge Cases Verified
    def test_closed_subscription_cannot_be_transitioned(self):
        closed_sub = Subscription.objects.create(
            customer=self.customer_profile1,
            created_by=self.admin,
            status=Subscription.Status.CLOSED,
            end_date=timezone.now().date()
        )
        self.client.force_authenticate(user=self.admin)

        # Closed cannot activate
        resp = self.client.post(reverse("subscription-activate", kwargs={"pk": closed_sub.id}))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Closed cannot pause
        resp = self.client.post(reverse("subscription-pause", kwargs={"pk": closed_sub.id}))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Closed cannot resume
        resp = self.client.post(reverse("subscription-resume", kwargs={"pk": closed_sub.id}))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Closed cannot renew
        resp = self.client.post(reverse("subscription-renew", kwargs={"pk": closed_sub.id}))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Closed cannot close again
        resp = self.client.post(reverse("subscription-close", kwargs={"pk": closed_sub.id}))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_paused_subscription_cannot_be_renewed(self):
        paused_sub = Subscription.objects.create(
            customer=self.customer_profile1,
            created_by=self.admin,
            status=Subscription.Status.PAUSED,
            next_billing_date=timezone.now().date() + timedelta(days=5)
        )
        self.client.force_authenticate(user=self.admin)
        renew_url = reverse("subscription-renew", kwargs={"pk": paused_sub.id})
        resp = self.client.post(renew_url)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only ACTIVE subscriptions can be renewed", str(resp.data))

    def test_renewal_date_calculations_for_all_intervals(self):
        from dateutil.relativedelta import relativedelta
        base_date = timezone.now().date()

        # Monthly plan
        m_plan = self.plan  # MONTHLY
        sub_m = Subscription.objects.create(customer=self.customer_profile1, created_by=self.admin, status=Subscription.Status.ACTIVE, next_billing_date=base_date)
        SubscriptionLine.objects.create(subscription=sub_m, product=self.product, plan=m_plan, quantity=1, unit_price=Decimal("10.00"))
        self.client.force_authenticate(user=self.admin)
        self.client.post(reverse("subscription-renew", kwargs={"pk": sub_m.id}))
        sub_m.refresh_from_db()
        self.assertEqual(sub_m.next_billing_date, base_date + relativedelta(months=1))

        # Quarterly plan
        q_plan = SubscriptionPlan.objects.create(name="Quarterly Plan", product=self.product, price=Decimal("200.00"), billing_interval=SubscriptionPlan.BillingInterval.QUARTERLY)
        sub_q = Subscription.objects.create(customer=self.customer_profile1, created_by=self.admin, status=Subscription.Status.ACTIVE, next_billing_date=base_date)
        SubscriptionLine.objects.create(subscription=sub_q, product=self.product, plan=q_plan, quantity=1, unit_price=Decimal("200.00"))
        self.client.post(reverse("subscription-renew", kwargs={"pk": sub_q.id}))
        sub_q.refresh_from_db()
        self.assertEqual(sub_q.next_billing_date, base_date + relativedelta(months=3))

        # Yearly plan
        y_plan = SubscriptionPlan.objects.create(name="Yearly Plan", product=self.product, price=Decimal("800.00"), billing_interval=SubscriptionPlan.BillingInterval.YEARLY)
        sub_y = Subscription.objects.create(customer=self.customer_profile1, created_by=self.admin, status=Subscription.Status.ACTIVE, next_billing_date=base_date)
        SubscriptionLine.objects.create(subscription=sub_y, product=self.product, plan=y_plan, quantity=1, unit_price=Decimal("800.00"))
        self.client.post(reverse("subscription-renew", kwargs={"pk": sub_y.id}))
        sub_y.refresh_from_db()
        self.assertEqual(sub_y.next_billing_date, base_date + relativedelta(years=1))

    def test_database_integrity_prevents_duplicate_conversion(self):
        from django.db import IntegrityError
        # First subscription attached to self.accepted_quotation
        Subscription.objects.create(
            customer=self.customer_profile1,
            quotation=self.accepted_quotation,
            created_by=self.admin,
            status=Subscription.Status.ACTIVE
        )
        # Direct DB attempt to attach a second subscription to the same quotation
        with self.assertRaises(IntegrityError):
            Subscription.objects.create(
                customer=self.customer_profile1,
                quotation=self.accepted_quotation,
                created_by=self.admin,
                status=Subscription.Status.ACTIVE
            )

