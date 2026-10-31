"""
Serializers for the catalog app.
"""

from rest_framework import serializers
from .models import Product, ProductVariant, SubscriptionPlan


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "product",
            "variant_name",
            "sku",
            "description",
            "price",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "product": {"required": False}
        }

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value


class ProductSerializer(serializers.ModelSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "sku",
            "category",
            "is_active",
            "variants",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    variant_name = serializers.CharField(source="variant.variant_name", read_only=True, default=None)

    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "name",
            "description",
            "product",
            "product_name",
            "variant",
            "variant_name",
            "price",
            "billing_interval",
            "trial_period_days",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def validate(self, attrs):
        product = attrs.get("product") or (self.instance.product if self.instance else None)
        variant = attrs.get("variant") or (self.instance.variant if self.instance else None)
        if variant and product and variant.product_id != product.id:
            raise serializers.ValidationError({"variant": "Selected variant does not belong to the selected product."})
        return attrs
