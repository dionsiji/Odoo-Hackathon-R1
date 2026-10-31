from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from customers.models import CustomerProfile


class CustomerManagementAndIsolationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customers_list_url = reverse("customer-list-create")
        self.customers_me_url = reverse("customer-me")
        self.password = "StrongCustomerPass123!"

        # Admin user
        self.admin = User.objects.create_superuser(
            email="admin_cust@test.com",
            password=self.password,
            first_name="Admin",
            last_name="Super",
        )

        # Staff user
        self.staff = User.objects.create_user(
            email="staff_cust@test.com",
            password=self.password,
            first_name="Staff",
            last_name="Member",
            role=User.Role.STAFF,
            is_staff=True,
        )

        # Customer 1
        self.customer1 = User.objects.create_user(
            email="c1@test.com",
            password=self.password,
            first_name="Customer",
            last_name="One",
            role=User.Role.CUSTOMER,
        )
        self.profile1 = CustomerProfile.objects.create(
            user=self.customer1,
            company_name="Company One Ltd",
            phone="111-222-333",
            city="New York",
            country="USA",
        )

        # Customer 2
        self.customer2 = User.objects.create_user(
            email="c2@test.com",
            password=self.password,
            first_name="Customer",
            last_name="Two",
            role=User.Role.CUSTOMER,
        )
        self.profile2 = CustomerProfile.objects.create(
            user=self.customer2,
            company_name="Company Two Ltd",
            phone="444-555-666",
            city="London",
            country="UK",
        )

        # Customer without profile
        self.customer3 = User.objects.create_user(
            email="c3@test.com",
            password=self.password,
            first_name="Customer",
            last_name="Three",
            role=User.Role.CUSTOMER,
        )

    # 1. Access to customers list
    def test_customer_cannot_list_all_customer_profiles(self):
        self.client.force_authenticate(user=self.customer1)
        response = self.client.get(self.customers_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access_customers_list(self):
        response = self.client.get(self.customers_list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_list_all_customer_profiles(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.customers_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_staff_can_list_all_customer_profiles(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(self.customers_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    # 2. Customer profile creation
    def test_admin_can_create_customer_profile(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "user_id": self.customer3.id,
            "company_name": "Company Three LLC",
            "phone": "777-888-999",
            "city": "Paris",
            "country": "France",
            "status": CustomerProfile.Status.ACTIVE,
        }
        response = self.client.post(self.customers_list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["company_name"], "Company Three LLC")
        self.assertEqual(response.data["email"], self.customer3.email)
        self.assertTrue(CustomerProfile.objects.filter(user=self.customer3).exists())

    def test_customer_cannot_create_customer_profile_via_list_create(self):
        self.client.force_authenticate(user=self.customer3)
        payload = {
            "user_id": self.customer3.id,
            "company_name": "Rogue Creation Inc",
        }
        response = self.client.post(self.customers_list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_create_duplicate_profile_for_same_user(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "user_id": self.customer1.id,
            "company_name": "Duplicate Attempt",
        }
        response = self.client.post(self.customers_list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 3. Customer self-service (/customers/me/)
    def test_customer_can_retrieve_own_profile(self):
        self.client.force_authenticate(user=self.customer1)
        response = self.client.get(self.customers_me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.profile1.id)
        self.assertEqual(response.data["company_name"], "Company One Ltd")
        self.assertEqual(response.data["email"], self.customer1.email)

    def test_customer_without_profile_gets_404_on_me(self):
        self.client.force_authenticate(user=self.customer3)
        response = self.client.get(self.customers_me_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_can_update_own_profile(self):
        self.client.force_authenticate(user=self.customer1)
        payload = {"city": "Boston", "phone": "999-000-111"}
        response = self.client.patch(self.customers_me_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["city"], "Boston")
        self.assertEqual(response.data["phone"], "999-000-111")
        self.profile1.refresh_from_db()
        self.assertEqual(self.profile1.city, "Boston")

    # 4. Detail endpoint and strict Customer Isolation
    def test_customer_can_access_own_profile_detail(self):
        self.client.force_authenticate(user=self.customer1)
        url = reverse("customer-detail", kwargs={"pk": self.profile1.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.profile1.id)

    def test_customer_isolated_from_other_customer_profile(self):
        # Customer 1 attempts to retrieve Customer 2's profile
        self.client.force_authenticate(user=self.customer1)
        url = reverse("customer-detail", kwargs={"pk": self.profile2.id})
        response = self.client.get(url)
        # 404 prevents enumeration and information leak
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_cannot_modify_other_customer_profile(self):
        # Customer 1 attempts to patch Customer 2's profile
        self.client.force_authenticate(user=self.customer1)
        url = reverse("customer-detail", kwargs={"pk": self.profile2.id})
        response = self.client.patch(url, {"city": "Hacked City"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.profile2.refresh_from_db()
        self.assertNotEqual(self.profile2.city, "Hacked City")

    def test_customer_cannot_delete_any_profile(self):
        # Customer 1 attempts to delete their own profile
        self.client.force_authenticate(user=self.customer1)
        url = reverse("customer-detail", kwargs={"pk": self.profile1.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(CustomerProfile.objects.filter(id=self.profile1.id).exists())

    def test_admin_can_access_and_delete_profile(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("customer-detail", kwargs={"pk": self.profile2.id})
        get_resp = self.client.get(url)
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)

        del_resp = self.client.delete(url)
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CustomerProfile.objects.filter(id=self.profile2.id).exists())
