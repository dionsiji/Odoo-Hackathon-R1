"""
Payment, Analytics, ActivityLog, Notification, CSV, Search, PDF serializers
for Brightloop billing app - Module 3 completion.
"""

from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
import csv, io

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from customers.models import CustomerProfile
from catalog.models import Product, ProductVariant, SubscriptionPlan
from quotations.models import Quotation
from subscriptions.models import Subscription
from core.models import ActivityLog, Notification
from .models import TaxRate, Discount, Invoice, InvoiceLine, Payment


# ─── Previously defined serializers (re-import to avoid circular issues) ───
from .serializers import (
    TaxRateSerializer,
    DiscountSerializer,
    InvoiceLineSerializer,
    InvoiceSerializer,
    GenerateInvoiceFromQuotationSerializer,
    GenerateInvoiceFromSubscriptionSerializer,
)


# ─────────────────────────────────────────────
# PAYMENT SERIALIZERS
# ─────────────────────────────────────────────

class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.ReadOnlyField(source="invoice.invoice_number")
    customer_email = serializers.ReadOnlyField(source="customer.user.email")
    recorded_by_email = serializers.ReadOnlyField(source="created_by.email")

    class Meta:
        model = Payment
        fields = [
            "id",
            "transaction_ref",
            "invoice",
            "invoice_number",
            "customer",
            "customer_email",
            "amount",
            "payment_method",
            "status",
            "notes",
            "paid_at",
            "recorded_by_email",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "transaction_ref",
            "customer",
            "created_at",
        ]

    def validate_amount(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("Payment amount must be greater than 0.")
        return value

    def validate(self, attrs):
        invoice = attrs.get("invoice", getattr(self.instance, "invoice", None))
        amount = attrs.get("amount")
        status_val = attrs.get("status", Payment.PaymentStatus.COMPLETED)

        if invoice and status_val == Payment.PaymentStatus.COMPLETED and amount:
            remaining = invoice.total_amount - invoice.amount_paid
            if amount > remaining:
                raise serializers.ValidationError(
                    {"amount": f"Payment amount ${amount} exceeds remaining balance ${remaining}."}
                )
            if invoice.status in (Invoice.Status.VOID, Invoice.Status.CANCELLED):
                raise serializers.ValidationError(
                    {"invoice": f"Cannot record payment on a {invoice.status} invoice."}
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None
        invoice = validated_data["invoice"]

        # Lock invoice row
        invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)

        validated_data["customer"] = invoice.customer
        if user:
            validated_data["created_by"] = user

        payment = Payment.objects.create(**validated_data)

        # Update invoice balances if COMPLETED
        if payment.status == Payment.PaymentStatus.COMPLETED:
            invoice.amount_paid = (invoice.amount_paid + payment.amount).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            invoice.amount_due = max(
                Decimal("0.00"),
                (invoice.total_amount - invoice.amount_paid).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                ),
            )
            if invoice.amount_due == Decimal("0.00"):
                invoice.status = Invoice.Status.PAID
            elif invoice.amount_paid > Decimal("0.00"):
                if invoice.status not in (Invoice.Status.PAID,):
                    invoice.status = Invoice.Status.PARTIALLY_PAID
            invoice.save(update_fields=["amount_paid", "amount_due", "status", "updated_at"])

            # Notify customer
            Notification.notify(
                recipient=invoice.customer.user,
                notification_type=Notification.NotificationType.PAYMENT_RECEIVED,
                title=f"Payment of ${payment.amount} received",
                message=f"Your payment of ${payment.amount} for invoice {invoice.invoice_number} has been recorded.",
                obj=payment,
            )
            ActivityLog.log(
                actor=user,
                action="PAYMENT_RECORDED",
                obj=payment,
                metadata={"invoice": invoice.invoice_number, "amount": str(payment.amount)},
            )

        return payment


class PaymentRefundSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)


# ─────────────────────────────────────────────
# ACTIVITY LOG SERIALIZER
# ─────────────────────────────────────────────

class ActivityLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.ReadOnlyField(source="actor.email")

    class Meta:
        model = ActivityLog
        fields = [
            "id", "actor_email", "action", "object_type",
            "object_id", "object_repr", "metadata", "created_at",
        ]
        read_only_fields = fields


# ─────────────────────────────────────────────
# NOTIFICATION SERIALIZERS
# ─────────────────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "notification_type", "title", "message",
            "is_read", "object_type", "object_id", "created_at",
        ]
        read_only_fields = [
            "id", "notification_type", "title", "message",
            "object_type", "object_id", "created_at",
        ]
