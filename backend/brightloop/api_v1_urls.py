"""
API v1 URL aggregator.
All routes live under /api/v1/ (prefix applied in brightloop/urls.py).
"""

from django.urls import path, include
from core.views import HealthCheckView

urlpatterns = [
    # Health check
    path("health/", HealthCheckView.as_view(), name="health-check"),

    # Authentication & user accounts
    path("auth/", include("accounts.urls")),

    # Customer management
    path("customers/", include("customers.urls")),

    # Catalog (products, variants, plans)
    path("", include("catalog.urls")),

    # Quotations (templates, quotations, lines, workflows)
    path("", include("quotations.urls")),

    # Subscriptions (subscriptions, lines, lifecycle)
    path("", include("subscriptions.urls")),

    # Billing & Financial engine (tax rates, discounts, invoices)
    path("", include("billing.urls")),
]
