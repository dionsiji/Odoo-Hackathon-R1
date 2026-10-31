"""
Serializers for the quotations app.
"""

from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from customers.models import CustomerProfile
from catalog.models import Product, ProductVariant
from .models import QuotationTemplate, Quotation, QuotationLine


class QuotationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationTemplate
        fields = [
            "id",
            "name",
            "description",
            "default_validity_days",
            "terms_and_conditions",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class QuotationLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    variant_name = serializers.CharField(source="variant.variant_name", read_only=True, default=None)

    class Meta:
        model = QuotationLine
        fields = [
            "id",
            "product",
            "product_name",
            "variant",
            "variant_name",
            "description",
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
        if variant and product and variant.product_id != product.id:
            raise serializers.ValidationError({"variant": "Selected variant does not belong to the selected product."})
        return attrs


class QuotationSerializer(serializers.ModelSerializer):
    customer_email = serializers.CharField(source="customer.user.email", read_only=True)
    customer_company = serializers.CharField(source="customer.company_name", read_only=True)
    created_by_email = serializers.CharField(source="created_by.email", read_only=True)
    lines = QuotationLineSerializer(many=True, required=False)

    class Meta:
        model = Quotation
        fields = [
            "id",
            "quotation_number",
            "customer",
            "customer_email",
            "customer_company",
            "template",
            "issue_date",
            "expiry_date",
            "status",
            "subtotal",
            "discount_amount",
            "tax_amount",
            "total_amount",
            "notes",
            "terms",
            "created_by",
            "created_by_email",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "quotation_number",
            "status",
            "subtotal",
            "total_amount",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate_discount_amount(self, value):
        if value < Decimal("0.00"):
            raise serializers.ValidationError("Discount cannot be negative.")
        return value

    def validate_tax_amount(self, value):
        if value < Decimal("0.00"):
            raise serializers.ValidationError("Tax cannot be negative.")
        return value

    def validate(self, attrs):
        issue_date = attrs.get("issue_date") or (self.instance.issue_date if self.instance else timezone.now().date())
        expiry_date = attrs.get("expiry_date") or (self.instance.expiry_date if self.instance else None)
        if expiry_date and issue_date and expiry_date < issue_date:
            raise serializers.ValidationError({"expiry_date": "Expiry date cannot be earlier than issue date."})

        # When creating, require at least one line
        if not self.instance:
            lines_data = self.initial_data.get("lines")
            if not lines_data or len(lines_data) == 0:
                raise serializers.ValidationError({"lines": "At least one quotation line is required."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user

        quotation = Quotation.objects.create(**validated_data)

        for line_data in lines_data:
            product = line_data.get("product")
            variant = line_data.get("variant")
            # If description is empty, auto-populate snapshot from product/variant
            desc = line_data.get("description", "").strip()
            if not desc and product:
                desc = product.description or product.name
                if variant:
                    desc += f" - {variant.variant_name}"
            line_data["description"] = desc

            QuotationLine.objects.create(quotation=quotation, **line_data)

        quotation.recalculate_totals()
        return quotation

    @transaction.atomic
    def update(self, instance, validated_data):
        # Prevent editing quotation lines or financial terms if not in DRAFT
        if instance.status != Quotation.Status.DRAFT:
            raise serializers.ValidationError("Only DRAFT quotations can be edited.")

        lines_data = validated_data.pop("lines", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if lines_data is not None:
            if len(lines_data) == 0:
                raise serializers.ValidationError({"lines": "Quotation must contain at least one line."})
            instance.lines.all().delete()
            for line_data in lines_data:
                product = line_data.get("product")
                variant = line_data.get("variant")
                desc = line_data.get("description", "").strip()
                if not desc and product:
                    desc = product.description or product.name
                    if variant:
                        desc += f" - {variant.variant_name}"
                line_data["description"] = desc
                QuotationLine.objects.create(quotation=instance, **line_data)

        instance.recalculate_totals()
        return instance
