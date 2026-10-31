"""
Models for the billing app in Brightloop.

Includes:
- TaxRate: Configurable tax rules with percentage rates.
- Discount: Promotional codes and discounts (percentage or fixed).
- Invoice: Core invoicing entity for one-off and recurring billing.
- InvoiceLine: Line item snapshots for an invoice.
"""

import uuid
from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

from customers.models import CustomerProfile
from catalog.models import Product, ProductVariant, SubscriptionPlan
from quotations.models import Quotation
from subscriptions.models import Subscription


def get_current_date():
    return timezone.now().date()


def generate_invoice_number():
    """Generates unique human-friendly invoice number (e.g., INV-20261031-A1B2C3)."""
    now_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"INV-{now_str}-{unique_suffix}"


class TaxRate(models.Model):
    """
    Tax rate configuration (e.g. VAT 10%, GST 18%, Sales Tax).
    """
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=32, unique=True, db_index=True)
    rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Tax percentage rate (e.g. 18.00 for 18%).",
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Tax Rate"
        verbose_name_plural = "Tax Rates"

    def __str__(self):
        return f"{self.name} ({self.rate}%)"

    def calculate_tax(self, taxable_amount):
        """Calculates tax on a taxable amount using Decimal arithmetic."""
        if not self.is_active or taxable_amount <= Decimal("0.00"):
            return Decimal("0.00")
        tax = (taxable_amount * (self.rate / Decimal("100.00"))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return tax


class Discount(models.Model):
    """
    Discount / Coupon model supporting PERCENTAGE and FIXED_AMOUNT.
    """
    class DiscountType(models.TextChoices):
        PERCENTAGE = "PERCENTAGE", "Percentage"
        FIXED_AMOUNT = "FIXED_AMOUNT", "Fixed Amount"

    code = models.CharField(max_length=32, unique=True, db_index=True)
    description = models.TextField(blank=True)
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE,
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Percentage value (0-100) or flat dollar amount.",
    )
    min_order_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Minimum subtotal required to qualify for this discount.",
    )
    is_active = models.BooleanField(default=True)
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    times_used = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "Discount"
        verbose_name_plural = "Discounts"

    def __str__(self):
        if self.discount_type == self.DiscountType.PERCENTAGE:
            return f"{self.code} ({self.amount}%)"
        return f"{self.code} (${self.amount})"

    def is_valid(self, order_amount=None):
        """Checks whether the discount is currently valid for use."""
        if not self.is_active:
            return False, "Discount is inactive."

        today = timezone.now().date()
        if self.valid_from and today < self.valid_from:
            return False, "Discount is not yet valid."
        if self.valid_to and today > self.valid_to:
            return False, "Discount has expired."

        if self.usage_limit is not None and self.times_used >= self.usage_limit:
            return False, "Discount usage limit reached."

        if order_amount is not None and order_amount < self.min_order_amount:
            return False, f"Order subtotal does not meet minimum requirement of {self.min_order_amount}."

        return True, ""

    def calculate_discount(self, subtotal):
        """Calculates discount amount from subtotal using Decimal arithmetic."""
        if subtotal <= Decimal("0.00"):
            return Decimal("0.00")

        valid, _ = self.is_valid(order_amount=subtotal)
        if not valid:
            return Decimal("0.00")

        if self.discount_type == self.DiscountType.PERCENTAGE:
            pct = min(self.amount, Decimal("100.00"))
            discount = (subtotal * (pct / Decimal("100.00"))).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        else:
            discount = min(self.amount, subtotal)

        return min(discount, subtotal)


class Invoice(models.Model):
    """
    Invoice model for Brightloop.
    Represents customer invoices created manually, converted from quotations,
    or generated from recurring subscriptions.
    """
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ISSUED = "ISSUED", "Issued"
        PAID = "PAID", "Paid"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
        OVERDUE = "OVERDUE", "Overdue"
        VOID = "VOID", "Void"
        CANCELLED = "CANCELLED", "Cancelled"

    invoice_number = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        default=generate_invoice_number,
        editable=False,
    )
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.PROTECT,
        related_name="invoices",
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
        help_text="Originating subscription for recurring billing",
    )
    quotation = models.ForeignKey(
        Quotation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
        help_text="Originating quotation if converted",
    )
    issue_date = models.DateField(default=get_current_date)
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    discount = models.ForeignKey(
        Discount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    tax_rate = models.ForeignKey(
        TaxRate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    amount_paid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    amount_due = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    billing_cycle_start = models.DateField(null=True, blank=True)
    billing_cycle_end = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    terms = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_invoices",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Invoice"
        verbose_name_plural = "Invoices"

    def __str__(self):
        return f"{self.invoice_number} - {self.customer} ({self.status}) - ${self.total_amount}"

    def check_overdue(self):
        """
        Lazy evaluation for overdue invoices.
        If ISSUED or PARTIALLY_PAID and due_date < today, transition to OVERDUE.
        """
        if self.status in (self.Status.ISSUED, self.Status.PARTIALLY_PAID):
            if self.due_date and self.due_date < timezone.now().date():
                self.status = self.Status.OVERDUE
                self.save(update_fields=["status", "updated_at"])

    def calculate_totals(self, save=False):
        """
        Recalculates subtotal, discount, tax, total, and amount_due from lines.
        Ensures strict Decimal arithmetic without frontend overrides.
        """
        computed_subtotal = Decimal("0.00")
        for line in self.lines.all():
            computed_subtotal += (Decimal(str(line.quantity)) * Decimal(str(line.unit_price))).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        self.subtotal = computed_subtotal

        # Apply Discount
        if self.discount:
            self.discount_amount = self.discount.calculate_discount(self.subtotal)
        # If no discount FK, preserve valid explicit discount_amount or cap at subtotal
        self.discount_amount = min(self.discount_amount, self.subtotal)

        taxable_base = max(Decimal("0.00"), self.subtotal - self.discount_amount)

        # Apply Tax
        if self.tax_rate:
            self.tax_amount = self.tax_rate.calculate_tax(taxable_base)

        self.total_amount = (taxable_base + self.tax_amount).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        self.amount_due = max(Decimal("0.00"), self.total_amount - self.amount_paid)

        if save and self.pk:
            self.save(update_fields=[
                "subtotal", "discount_amount", "tax_amount",
                "total_amount", "amount_due", "updated_at"
            ])


def generate_payment_ref():
    """Generates a unique human-friendly payment transaction reference."""
    now_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"PAY-{now_str}-{unique_suffix}"


class Payment(models.Model):
    """
    Records a single payment transaction against an invoice.
    Partial and full payments are supported.
    Overpayment is prevented at the serializer/view level.
    """
    class PaymentMethod(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        BANK_TRANSFER = "BANK_TRANSFER", "Bank Transfer"
        CREDIT_CARD = "CREDIT_CARD", "Credit Card"
        CASH = "CASH", "Cash"
        MOCK_GATEWAY = "MOCK_GATEWAY", "Mock Gateway"

    class PaymentStatus(models.TextChoices):
        COMPLETED = "COMPLETED", "Completed"
        PENDING = "PENDING", "Pending"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    transaction_ref = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        default=generate_payment_ref,
        editable=False,
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.MANUAL,
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.COMPLETED,
        db_index=True,
    )
    notes = models.TextField(blank=True)
    paid_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_payments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-paid_at"]
        verbose_name = "Payment"
        verbose_name_plural = "Payments"

    def __str__(self):
        return f"{self.transaction_ref} - ${self.amount} ({self.status})"


class InvoiceLine(models.Model):
    """
    Individual line item on an invoice. Preserves historical unit price and description snapshots.
    """
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="invoice_lines",
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="invoice_lines",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="invoice_lines",
    )
    description = models.CharField(max_length=255, blank=True)
    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    class Meta:
        ordering = ["id"]
        verbose_name = "Invoice Line"
        verbose_name_plural = "Invoice Lines"

    def save(self, *args, **kwargs):
        # Always compute line_total server-side
        self.line_total = (
            Decimal(str(self.quantity)) * Decimal(str(self.unit_price))
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.product.name} x {self.quantity}"
