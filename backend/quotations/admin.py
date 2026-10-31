from django.contrib import admin
from .models import QuotationTemplate, Quotation, QuotationLine


class QuotationLineInline(admin.TabularInline):
    model = QuotationLine
    extra = 1
    readonly_fields = ["line_total"]


@admin.register(QuotationTemplate)
class QuotationTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "default_validity_days", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name"]


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = [
        "quotation_number",
        "customer",
        "issue_date",
        "expiry_date",
        "status",
        "subtotal",
        "total_amount",
        "created_by",
        "created_at",
    ]
    list_filter = ["status", "issue_date", "expiry_date"]
    search_fields = ["quotation_number", "customer__user__email", "customer__company_name"]
    readonly_fields = [
        "quotation_number",
        "subtotal",
        "total_amount",
        "created_by",
        "created_at",
        "updated_at",
    ]
    inlines = [QuotationLineInline]


@admin.register(QuotationLine)
class QuotationLineAdmin(admin.ModelAdmin):
    list_display = ["quotation", "product", "variant", "quantity", "unit_price", "line_total"]
    list_filter = ["product"]
    search_fields = ["quotation__quotation_number", "product__name"]
