from django.contrib import admin
from .models import Subscription, SubscriptionLine


class SubscriptionLineInline(admin.TabularInline):
    model = SubscriptionLine
    extra = 1
    readonly_fields = ["line_total"]


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        "subscription_number",
        "customer",
        "status",
        "start_date",
        "end_date",
        "next_billing_date",
        "created_by",
        "created_at",
    ]
    list_filter = ["status", "start_date"]
    search_fields = ["subscription_number", "customer__user__email", "customer__company_name"]
    readonly_fields = [
        "subscription_number",
        "created_by",
        "created_at",
        "updated_at",
    ]
    inlines = [SubscriptionLineInline]


@admin.register(SubscriptionLine)
class SubscriptionLineAdmin(admin.ModelAdmin):
    list_display = ["subscription", "product", "variant", "plan", "quantity", "unit_price", "line_total"]
    list_filter = ["product"]
    search_fields = ["subscription__subscription_number", "product__name"]
