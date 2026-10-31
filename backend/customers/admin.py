from django.contrib import admin

from .models import CustomerProfile


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "company_name", "phone", "city", "country", "status", "created_at"]
    list_filter = ["status", "country"]
    search_fields = ["user__email", "company_name", "phone"]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["user"]
