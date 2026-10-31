"""
Serializers for the billing app in Brightloop.
"""

from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from customers.models import CustomerProfile
from customers.serializers import CustomerProfileSerializer
from catalog.models import Product, ProductVariant, SubscriptionPlan
from quotations.models import Quotation
from subscriptions.models import Subscription
from .models import TaxRate, Discount, Invoice, InvoiceLine


class TaxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = [
            "id",
            "name",
            "code",
            "rate",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_rate(self, value):
        if value < Decimal("0.00") or value > Decimal("100.00"):
            raise serializers.ValidationError("Tax rate must be between 0.00% and 100.00%.")
        return value


class DiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discount
        fields = [
            "id",
            "code",
            "description",
            "discount_type",
            "amount",
            "min_order_amount",
            "is_active",
            "valid_from",
            "valid_to",
            "usage_limit",
            "times_used",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "times_used", "created_at", "updated_at"]

    def validate(self, attrs):
        discount_type = attrs.get("discount_type", getattr(self.instance, "discount_type", None))
        amount = attrs.get("amount", getattr(self.instance, "amount", None))
        if discount_type == Discount.DiscountType.PERCENTAGE:
            if amount is not None and (amount < Decimal("0.00") or amount > Decimal("100.00")):
                raise serializers.ValidationError({"amount": "Percentage discount must be between 0.00% and 100.00%."})

        valid_from = attrs.get("valid_from", getattr(self.instance, "valid_from", None))
        valid_to = attrs.get("valid_to", getattr(self.instance, "valid_to", None))
        if valid_from and valid_to and valid_from > valid_to:
            raise serializers.ValidationError({"valid_to": "valid_to cannot be earlier than valid_from."})

        return attrs


class InvoiceLineSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source="product.name")
    variant_name = serializers.ReadOnlyField(source="variant.variant_name")
    plan_name = serializers.ReadOnlyField(source="plan.name")
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceLine
        fields = [
            "id",
            "invoice",
            "product",
            "product_name",
            "variant",
            "variant_name",
            "plan",
            "plan_name",
            "description",
            "quantity",
            "unit_price",
            "line_total",
        ]
        read_only_fields = ["id", "invoice", "line_total"]
        extra_kwargs = {
            "description": {"required": False, "allow_blank": True},
            "unit_price": {"required": False},
        }

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value

    def validate_unit_price(self, value):
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("Unit price cannot be negative.")
        return value

    def validate(self, attrs):
        product = attrs.get("product")
        variant = attrs.get("variant")
        plan = attrs.get("plan")

        if variant and product and variant.product_id != product.id:
            raise serializers.ValidationError({"variant": "Variant does not belong to the selected product."})

        if plan and product and plan.product_id != product.id:
            raise serializers.ValidationError({"plan": "Subscription plan does not belong to the selected product."})

        # Auto-populate price if omitted
        if "unit_price" not in attrs or attrs["unit_price"] is None:
            if plan:
                attrs["unit_price"] = plan.price
            elif variant:
                attrs["unit_price"] = variant.price
            else:
                raise serializers.ValidationError({"unit_price": "unit_price must be specified if product has no variant or plan price."})

        # Auto-populate description if blank
        if not attrs.get("description"):
            desc = product.name if product else ""
            if variant:
                desc = f"{desc} ({variant.variant_name})"
            if plan:
                desc = f"{desc} - {plan.name}"
            attrs["description"] = desc

        return attrs


class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True, required=False)
    customer_details = CustomerProfileSerializer(source="customer", read_only=True)
    created_by_email = serializers.ReadOnlyField(source="created_by.email")
    tax_rate_details = TaxRateSerializer(source="tax_rate", read_only=True)
    discount_details = DiscountSerializer(source="discount", read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "customer",
            "customer_details",
            "subscription",
            "quotation",
            "issue_date",
            "due_date",
            "status",
            "subtotal",
            "discount",
            "discount_details",
            "discount_amount",
            "tax_rate",
            "tax_rate_details",
            "tax_amount",
            "total_amount",
            "amount_paid",
            "amount_due",
            "billing_cycle_start",
            "billing_cycle_end",
            "notes",
            "terms",
            "created_by",
            "created_by_email",
            "created_at",
            "updated_at",
            "lines",
        ]
        read_only_fields = [
            "id",
            "invoice_number",
            "status",
            "subtotal",
            "discount_amount",
            "tax_amount",
            "total_amount",
            "amount_paid",
            "amount_due",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate_due_date(self, value):
        issue_date = self.initial_data.get("issue_date")
        if issue_date:
            try:
                import datetime
                if isinstance(issue_date, str):
                    issue_date = datetime.date.fromisoformat(issue_date)
                if value < issue_date:
                    raise serializers.ValidationError("due_date cannot be earlier than issue_date.")
            except (ValueError, TypeError):
                pass
        return value

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        request = self.context.get("request")
        user = request.user if request else None

        if "created_by" not in validated_data and user and user.is_authenticated:
            validated_data["created_by"] = user

        with transaction.atomic():
            invoice = Invoice.objects.create(**validated_data)
            for line_data in lines_data:
                InvoiceLine.objects.create(invoice=invoice, **line_data)

            # Recalculate totals server-side
            invoice.calculate_totals(save=True)
            return invoice

    def update(self, instance, validated_data):
        if instance.status != Invoice.Status.DRAFT:
            raise serializers.ValidationError(
                {"detail": f"Cannot edit an invoice in '{instance.status}' status. Only DRAFT invoices can be edited."}
            )

        lines_data = validated_data.pop("lines", None)

        with transaction.atomic():
            for attr, val in validated_data.items():
                setattr(instance, attr, val)
            instance.save()

            if lines_data is not None:
                instance.lines.all().delete()
                for line_data in lines_data:
                    InvoiceLine.objects.create(invoice=instance, **line_data)

            instance.calculate_totals(save=True)
            return instance


class GenerateInvoiceFromQuotationSerializer(serializers.Serializer):
    due_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    terms = serializers.CharField(required=False, allow_blank=True)


class GenerateInvoiceFromSubscriptionSerializer(serializers.Serializer):
    due_date = serializers.DateField(required=False)
    billing_cycle_start = serializers.DateField(required=False)
    billing_cycle_end = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
