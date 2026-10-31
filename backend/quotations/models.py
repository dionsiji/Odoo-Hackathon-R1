"""
Quotation models for Brightloop.
Includes QuotationTemplate, Quotation, and QuotationLine.
"""

import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils import timezone

from customers.models import CustomerProfile
from catalog.models import Product, ProductVariant


def generate_quotation_number():
    """Generates a unique human-friendly quotation number."""
    now_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"QT-{now_str}-{unique_suffix}"


def get_current_date():
    return timezone.now().date()


class QuotationTemplate(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    default_validity_days = models.PositiveIntegerField(default=30)
    terms_and_conditions = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Quotation Template"
        verbose_name_plural = "Quotation Templates"

    def __str__(self):
        return self.name


class Quotation(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SENT = "SENT", "Sent"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        EXPIRED = "EXPIRED", "Expired"

    quotation_number = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        default=generate_quotation_number,
        editable=False
    )
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.PROTECT,
        related_name="quotations"
    )
    template = models.ForeignKey(
        QuotationTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quotations"
    )
    issue_date = models.DateField(default=get_current_date)
    expiry_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    notes = models.TextField(blank=True, default="")
    terms = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_quotations"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Quotation"
        verbose_name_plural = "Quotations"

    def __str__(self):
        return f"{self.quotation_number} - {self.customer} ({self.status})"

    def check_expiration(self):
        """Auto-expire quotation if past expiry date and still in DRAFT or SENT."""
        if self.status in [self.Status.DRAFT, self.Status.SENT]:
            if self.expiry_date < timezone.now().date():
                self.status = self.Status.EXPIRED
                self.save(update_fields=["status", "updated_at"])
                return True
        return False

    def recalculate_totals(self, save=True):
        """
        Recalculates subtotal and total_amount using Decimal arithmetic
        based on active quotation lines.
        """
        lines = self.lines.all()
        calculated_subtotal = Decimal("0.00")
        for line in lines:
            calculated_subtotal += line.line_total

        self.subtotal = calculated_subtotal
        # total_amount = subtotal - discount_amount + tax_amount
        calculated_total = self.subtotal - self.discount_amount + self.tax_amount
        if calculated_total < Decimal("0.00"):
            calculated_total = Decimal("0.00")
        self.total_amount = calculated_total

        if save:
            self.save(update_fields=["subtotal", "total_amount", "updated_at"])


class QuotationLine(models.Model):
    quotation = models.ForeignKey(
        Quotation,
        on_delete=models.CASCADE,
        related_name="lines"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="quotation_lines"
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="quotation_lines"
    )
    description = models.TextField(blank=True, default="")
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
        verbose_name = "Quotation Line"
        verbose_name_plural = "Quotation Lines"

    def save(self, *args, **kwargs):
        # Calculate line total accurately server-side
        self.line_total = Decimal(str(self.quantity)) * Decimal(str(self.unit_price))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quotation.quotation_number} - Line: {self.product.name} x {self.quantity}"
