from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from customers.models import CustomerProfile


class AuthenticationAndSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse("auth-register")
        self.login_url = reverse("auth-login")
        self.refresh_url = reverse("auth-token-refresh")
        self.me_url = reverse("auth-me")

        # Standard password meeting all validators
        self.password = "StrongAuthPass123!"

        # Create base test users
        self.admin_user = User.objects.create_superuser(
            email="admin@test.com",
            password=self.password,
            first_name="Admin",
            last_name="User",
        )
        self.staff_user = User.objects.create_user(
            email="staff@test.com",
            password=self.password,
            first_name="Staff",
            last_name="User",
            role=User.Role.STAFF,
            is_staff=True,
        )
        self.customer_user = User.objects.create_user(
            email="customer1@test.com",
            password=self.password,
            first_name="Customer",
            last_name="One",
            role=User.Role.CUSTOMER,
        )

    # 1. Registration tests
    def test_registration_with_valid_data(self):
        payload = {
            "email": "newcustomer@test.com",
            "first_name": "New",
            "last_name": "Customer",
            "password": self.password,
            "password_confirm": self.password,
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["email"], "newcustomer@test.com")
        self.assertEqual(response.data["user"]["role"], User.Role.CUSTOMER)
        # Ensure password is not returned
        self.assertNotIn("password", response.data["user"])

        # Check DB and password hashing
        user = User.objects.get(email="newcustomer@test.com")
        self.assertTrue(user.check_password(self.password))
        self.assertNotEqual(user.password, self.password)
        self.assertTrue(user.password.startswith("pbkdf2_") or "$" in user.password)

    def test_registration_rejects_weak_password(self):
        payload = {
            "email": "weakpass@test.com",
            "first_name": "Weak",
            "last_name": "User",
            "password": "123",
            "password_confirm": "123",
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_registration_rejects_common_password(self):
        payload = {
            "email": "commonpass@test.com",
            "first_name": "Common",
            "last_name": "User",
            "password": "password",
            "password_confirm": "password",
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_registration_rejects_mismatched_password(self):
        payload = {
            "email": "mismatch@test.com",
            "first_name": "Mis",
            "last_name": "Match",
            "password": self.password,
            "password_confirm": "DifferentPass123!",
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password_confirm", response.data)

    def test_registration_rejects_duplicate_email(self):
        payload = {
            "email": self.customer_user.email,
            "first_name": "Dup",
            "last_name": "User",
            "password": self.password,
            "password_confirm": self.password,
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_privilege_escalation_via_unauthenticated_registration_blocked(self):
        # Attempt to register as ADMIN
        payload = {
            "email": "hacker_admin@test.com",
            "first_name": "Evil",
            "last_name": "Admin",
            "password": self.password,
            "password_confirm": self.password,
            "role": User.Role.ADMIN,
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)

        # Attempt to register as STAFF
        payload["email"] = "hacker_staff@test.com"
        payload["role"] = User.Role.STAFF
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)

    def test_admin_can_register_staff_or_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "email": "legit_staff@test.com",
            "first_name": "Legit",
            "last_name": "Staff",
            "password": self.password,
            "password_confirm": self.password,
            "role": User.Role.STAFF,
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["role"], User.Role.STAFF)

    # 2. Authentication and JWT tests
    def test_login_valid_credentials(self):
        payload = {
            "email": self.customer_user.email,
            "password": self.password,
        }
        response = self.client.post(self.login_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], self.customer_user.email)
        self.assertEqual(response.data["user"]["role"], User.Role.CUSTOMER)

    def test_login_invalid_password(self):
        payload = {
            "email": self.customer_user.email,
            "password": "WrongPassword123!",
        }
        response = self.client.post(self.login_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        payload = {
            "email": "nonexistent@test.com",
            "password": self.password,
        }
        response = self.client.post(self.login_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_jwt_token_refresh(self):
        login_resp = self.client.post(
            self.login_url,
            {"email": self.customer_user.email, "password": self.password},
            format="json",
        )
        refresh_token = login_resp.data["refresh"]

        response = self.client.post(
            self.refresh_url, {"refresh": refresh_token}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_jwt_token_refresh_invalid(self):
        response = self.client.post(
            self.refresh_url, {"refresh": "invalid-token"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # 3. Profile access & privilege escalation prevention
    def test_unauthenticated_profile_access_denied(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_profile_access(self):
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.customer_user.email)
        self.assertEqual(response.data["role"], User.Role.CUSTOMER)
        # Ensure password hash is not exposed
        self.assertNotIn("password", response.data)

    def test_profile_update_allows_name_change(self):
        self.client.force_authenticate(user=self.customer_user)
        payload = {"first_name": "UpdatedName", "last_name": "UpdatedLast"}
        response = self.client.patch(self.me_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "UpdatedName")
        self.customer_user.refresh_from_db()
        self.assertEqual(self.customer_user.first_name, "UpdatedName")

    def test_profile_update_cannot_escalate_role_or_change_email(self):
        self.client.force_authenticate(user=self.customer_user)
        # Attempt role tampering
        payload = {
            "role": User.Role.ADMIN,
            "email": "hacked@test.com",
            "is_staff": True,
            "is_superuser": True,
        }
        response = self.client.patch(self.me_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.customer_user.refresh_from_db()
        self.assertEqual(self.customer_user.role, User.Role.CUSTOMER)
        self.assertEqual(self.customer_user.email, "customer1@test.com")
        self.assertFalse(self.customer_user.is_staff)
        self.assertFalse(self.customer_user.is_superuser)
