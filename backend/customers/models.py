"""
Customer model – profile record associated with a User account.

One-to-one with accounts.User; every User with role=CUSTOMER
should have a matching CustomerProfile.
"""

from django.db import models
from django.conf import settings


class CustomerProfile(models.Model):
    """
    Extended profile for a customer user.

    Linked 1-to-1 with the User model.
    Staff/admin users can view all profiles; customers can only view their own.
    """

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"
        SUSPENDED = "SUSPENDED", "Suspended"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_profile",
    )

    # Contact details
    phone = models.CharField(max_length=30, blank=True, default="")
    company_name = models.CharField(max_length=255, blank=True, default="")

    # Address
    address_line1 = models.CharField(max_length=255, blank=True, default="")
    address_line2 = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")
    postal_code = models.CharField(max_length=20, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="")

    # Account status
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "customer profile"
        verbose_name_plural = "customer profiles"
        ordering = ["-created_at"]

    def __str__(self):
        return f"CustomerProfile({self.user.email})"
