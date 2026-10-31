"""
Subscription models for Brightloop.
Includes Subscription and SubscriptionLine.
"""

import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils import timezone
from dateutil.relativedelta import relativedelta

from customers.models import CustomerProfile
from quotations.models import Quotation
from catalog.models import Product, ProductVariant, SubscriptionPlan


def get_current_date():
    return timezone.now().date()


def generate_subscription_number():
    """Generates a unique human-friendly subscription number."""
    now_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"SUB-{now_str}-{unique_suffix}"


class Subscription(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        PAUSED = "PAUSED", "Paused"
        CLOSED = "CLOSED", "Closed"

    subscription_number = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        default=generate_subscription_number,
        editable=False
    )
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.PROTECT,
        related_name="subscriptions"
    )
    quotation = models.OneToOneField(
        Quotation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscription",
        help_text="Optional source quotation (unique 1-to-1 to prevent duplicates)"
    )
    start_date = models.DateField(default=get_current_date)
    end_date = models.DateField(null=True, blank=True)
    next_billing_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_subscriptions"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"

    def __str__(self):
        return f"{self.subscription_number} - {self.customer} ({self.status})"

    def calculate_next_billing_date(self, from_date=None, interval="MONTHLY"):
        base_date = from_date or timezone.now().date()
        if interval == SubscriptionPlan.BillingInterval.YEARLY:
            return base_date + relativedelta(years=1)
        elif interval == SubscriptionPlan.BillingInterval.QUARTERLY:
            return base_date + relativedelta(months=3)
        else:  # MONTHLY default
            return base_date + relativedelta(months=1)


class SubscriptionLine(models.Model):
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="lines"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="subscription_lines"
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="subscription_lines"
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="subscription_lines"
    )
    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )

    class Meta:
        ordering = ["id"]
        verbose_name = "Subscription Line"
        verbose_name_plural = "Subscription Lines"

    def save(self, *args, **kwargs):
        self.line_total = Decimal(str(self.quantity)) * Decimal(str(self.unit_price))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.subscription.subscription_number} - Line: {self.product.name} x {self.quantity}"
