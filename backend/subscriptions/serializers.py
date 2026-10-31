"""
Serializers for the subscriptions app.
"""

from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from customers.models import CustomerProfile
from quotations.models import Quotation
from catalog.models import Product, ProductVariant, SubscriptionPlan
from .models import Subscription, SubscriptionLine


class SubscriptionLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    variant_name = serializers.CharField(source="variant.variant_name", read_only=True, default=None)
    plan_name = serializers.CharField(source="plan.name", read_only=True, default=None)

    class Meta:
        model = SubscriptionLine
        fields = [
            "id",
            "product",
            "product_name",
            "variant",
            "variant_name",
            "plan",
            "plan_name",
            "quantity",
            "unit_price",
            "line_total",
        ]
        read_only_fields = ["id", "line_total"]

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value

    def validate_unit_price(self, value):
        if value < Decimal("0.00"):
            raise serializers.ValidationError("Unit price cannot be negative.")
        return value

    def validate(self, attrs):
        product = attrs.get("product")
        variant = attrs.get("variant")
        plan = attrs.get("plan")

        if variant and product and variant.product_id != product.id:
            raise serializers.ValidationError({"variant": "Selected variant does not belong to the selected product."})
        if plan and product and plan.product_id != product.id:
            raise serializers.ValidationError({"plan": "Selected plan does not belong to the selected product."})
        return attrs


class SubscriptionSerializer(serializers.ModelSerializer):
    customer_email = serializers.CharField(source="customer.user.email", read_only=True)
    customer_company = serializers.CharField(source="customer.company_name", read_only=True)
    quotation_number = serializers.CharField(source="quotation.quotation_number", read_only=True, default=None)
    created_by_email = serializers.CharField(source="created_by.email", read_only=True)
    lines = SubscriptionLineSerializer(many=True, required=False)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "subscription_number",
            "customer",
            "customer_email",
            "customer_company",
            "quotation",
            "quotation_number",
            "start_date",
            "end_date",
            "next_billing_date",
            "status",
            "created_by",
            "created_by_email",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "subscription_number",
            "status",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        quotation = attrs.get("quotation")
        customer = attrs.get("customer")

        if quotation:
            # 1. Quotation must be in ACCEPTED status
            if quotation.status != Quotation.Status.ACCEPTED:
                raise serializers.ValidationError(
                    {"quotation": f"Quotation must be in ACCEPTED status (current: {quotation.status})."}
                )
            # 2. Check customer match
            if customer and quotation.customer_id != customer.id:
                raise serializers.ValidationError(
                    {"customer": "Customer does not match the quotation's customer."}
                )
            # 3. Check duplicate subscription from same quotation
            existing_sub = Subscription.objects.filter(quotation=quotation)
            if self.instance:
                existing_sub = existing_sub.exclude(pk=self.instance.pk)
            if existing_sub.exists():
                raise serializers.ValidationError(
                    {"quotation": "A subscription has already been created from this quotation."}
                )

        # When creating standalone without a quotation, require at least one line
        if not self.instance and not quotation:
            lines_data = self.initial_data.get("lines")
            if not lines_data or len(lines_data) == 0:
                raise serializers.ValidationError(
                    {"lines": "At least one subscription line is required when creating without a quotation."}
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        quotation = validated_data.get("quotation")

        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user

        # If quotation is provided and customer not explicitly passed, use quotation.customer
        if quotation and not validated_data.get("customer"):
            validated_data["customer"] = quotation.customer

        subscription = Subscription.objects.create(**validated_data)

        if quotation:
            # Copy lines from quotation snapshot if lines_data was not explicitly specified
            if not lines_data:
                for q_line in quotation.lines.all():
                    # Attempt to find plan associated with product/variant
                    matched_plan = SubscriptionPlan.objects.filter(
                        product=q_line.product,
                        variant=q_line.variant,
                        is_active=True
                    ).first()

                    SubscriptionLine.objects.create(
                        subscription=subscription,
                        product=q_line.product,
                        variant=q_line.variant,
                        plan=matched_plan,
                        quantity=q_line.quantity,
                        unit_price=q_line.unit_price,
                        line_total=q_line.line_total,
                    )
            else:
                for line_data in lines_data:
                    SubscriptionLine.objects.create(subscription=subscription, **line_data)
        else:
            for line_data in lines_data:
                SubscriptionLine.objects.create(subscription=subscription, **line_data)

        return subscription

    @transaction.atomic
    def update(self, instance, validated_data):
        # Customers cannot modify subscriptions; Admin/Staff can modify dates / lines while in DRAFT
        if instance.status != Subscription.Status.DRAFT:
            # Only allow end_date or next_billing_date modifications if not in DRAFT
            allowed_fields = {"end_date", "next_billing_date"}
            for attr in list(validated_data.keys()):
                if attr not in allowed_fields:
                    validated_data.pop(attr)

        lines_data = validated_data.pop("lines", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if lines_data is not None and instance.status == Subscription.Status.DRAFT:
            if len(lines_data) == 0:
                raise serializers.ValidationError({"lines": "Subscription must contain at least one line."})
            instance.lines.all().delete()
            for line_data in lines_data:
                SubscriptionLine.objects.create(subscription=instance, **line_data)

        return instance
