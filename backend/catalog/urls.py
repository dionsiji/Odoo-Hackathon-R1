"""
URL configuration for the catalog app.
"""

from django.urls import path
from .views import (
    ProductListCreateView,
    ProductDetailView,
    ProductVariantListCreateView,
    SubscriptionPlanListCreateView,
    SubscriptionPlanDetailView,
)

urlpatterns = [
    path("products/", ProductListCreateView.as_view(), name="product-list-create"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("products/<int:pk>/variants/", ProductVariantListCreateView.as_view(), name="product-variants"),
    path("plans/", SubscriptionPlanListCreateView.as_view(), name="plan-list-create"),
    path("plans/<int:pk>/", SubscriptionPlanDetailView.as_view(), name="plan-detail"),
]
