from django.contrib import admin
from .models import Product, ProductVariant, SubscriptionPlan


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "sku", "category", "is_active", "created_at"]
    list_filter = ["is_active", "category"]
    search_fields = ["name", "sku"]
    inlines = [ProductVariantInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ["variant_name", "product", "sku", "price", "is_active", "created_at"]
    list_filter = ["is_active", "product"]
    search_fields = ["variant_name", "sku"]


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ["name", "product", "variant", "price", "billing_interval", "is_active", "created_at"]
    list_filter = ["is_active", "billing_interval"]
    search_fields = ["name", "product__name"]
