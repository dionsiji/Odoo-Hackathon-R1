from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from customers.models import CustomerProfile
from catalog.models import Product, ProductVariant, SubscriptionPlan


class CatalogTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = "CatalogPass123!"

        self.admin = User.objects.create_superuser(
            email="catalog_admin@test.com",
            password=self.password,
            first_name="Admin",
            last_name="Cat",
        )
        self.staff = User.objects.create_user(
            email="catalog_staff@test.com",
            password=self.password,
            first_name="Staff",
            last_name="Cat",
            role=User.Role.STAFF,
            is_staff=True,
        )
        self.customer = User.objects.create_user(
            email="catalog_cust@test.com",
            password=self.password,
            first_name="Cust",
            last_name="Cat",
            role=User.Role.CUSTOMER,
        )
        self.customer_profile = CustomerProfile.objects.create(
            user=self.customer,
            company_name="Cat Company"
        )

        # Base product setup
        self.product = Product.objects.create(
            name="Cloud Storage",
            description="Secure cloud storage service",
            sku="PROD-CS-001",
            category="Infrastructure",
            is_active=True
        )
        self.inactive_product = Product.objects.create(
            name="Legacy Backup",
            description="Old backup system",
            sku="PROD-LB-002",
            category="Legacy",
            is_active=False
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            variant_name="1TB Tier",
            sku="VAR-CS-1TB",
            price=Decimal("49.99"),
            is_active=True
        )
        self.inactive_variant = ProductVariant.objects.create(
            product=self.product,
            variant_name="100GB Tier",
            sku="VAR-CS-100GB",
            price=Decimal("9.99"),
            is_active=False
        )
        self.plan = SubscriptionPlan.objects.create(
            name="Pro Plan",
            product=self.product,
            variant=self.variant,
            price=Decimal("45.00"),
            billing_interval=SubscriptionPlan.BillingInterval.MONTHLY,
            trial_period_days=14,
            is_active=True
        )
        self.inactive_plan = SubscriptionPlan.objects.create(
            name="Retired Plan",
            product=self.product,
            variant=self.variant,
            price=Decimal("35.00"),
            billing_interval=SubscriptionPlan.BillingInterval.MONTHLY,
            is_active=False
        )

    # 1. Product CRUD and permissions
    def test_customer_cannot_create_product(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("product-list-create")
        payload = {
            "name": "Hacked Product",
            "sku": "PROD-HACK-01",
            "category": "Test"
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_product(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("product-list-create")
        payload = {
            "name": "Compute Engine",
            "description": "High memory instances",
            "sku": "PROD-CE-001",
            "category": "Compute",
            "is_active": True
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sku"], "PROD-CE-001")
        self.assertTrue(Product.objects.filter(sku="PROD-CE-001").exists())

    def test_customer_visibility_restrictions_for_catalog(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("product-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Customer must only see active products
        skus = [p["sku"] for p in response.data]
        self.assertIn("PROD-CS-001", skus)
        self.assertNotIn("PROD-LB-002", skus)

        # Admin sees all products (including inactive)
        self.client.force_authenticate(user=self.admin)
        admin_response = self.client.get(url)
        admin_skus = [p["sku"] for p in admin_response.data]
        self.assertIn("PROD-CS-001", admin_skus)
        self.assertIn("PROD-LB-002", admin_skus)

    # 2. Product variant creation and validation
    def test_admin_can_create_variant(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("product-variants", kwargs={"pk": self.product.id})
        payload = {
            "variant_name": "2TB Tier",
            "sku": "VAR-CS-2TB",
            "price": "89.99",
            "is_active": True
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["price"], "89.99")
        self.assertEqual(response.data["product"], self.product.id)

    def test_variant_price_validation_rejects_negative(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("product-variants", kwargs={"pk": self.product.id})
        payload = {
            "variant_name": "Invalid Price",
            "sku": "VAR-CS-NEG",
            "price": "-10.00",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("price", response.data)

    def test_customer_cannot_create_variant(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("product-variants", kwargs={"pk": self.product.id})
        payload = {
            "variant_name": "Customer Variant",
            "sku": "VAR-CUST",
            "price": "20.00"
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # 3. Subscription plan CRUD and pricing
    def test_admin_can_create_plan(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("plan-list-create")
        payload = {
            "name": "Enterprise Annual",
            "product": self.product.id,
            "variant": self.variant.id,
            "price": "499.00",
            "billing_interval": "YEARLY",
            "trial_period_days": 30,
            "is_active": True
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["billing_interval"], "YEARLY")
        self.assertEqual(response.data["price"], "499.00")

    def test_plan_mismatched_variant_validation(self):
        other_prod = Product.objects.create(name="Other Prod", sku="PROD-OTH-01")
        self.client.force_authenticate(user=self.admin)
        url = reverse("plan-list-create")
        payload = {
            "name": "Faulty Plan",
            "product": other_prod.id,
            "variant": self.variant.id,  # belongs to self.product!
            "price": "100.00",
            "billing_interval": "MONTHLY"
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("variant", response.data)

    def test_customer_view_plans_active_only(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("plan-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan_names = [p["name"] for p in response.data]
        self.assertIn("Pro Plan", plan_names)
        self.assertNotIn("Retired Plan", plan_names)
