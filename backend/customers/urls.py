"""
URL patterns for the customers app.
Prefixed with /api/v1/customers/ in brightloop/api_v1_urls.py.
"""

from django.urls import path

from .views import CustomerProfileListCreateView, CustomerProfileDetailView, MyCustomerProfileView

urlpatterns = [
    # Authenticated customer's own profile shortcut
    path("me/", MyCustomerProfileView.as_view(), name="customer-me"),

    # Admin/staff: list all profiles or create one
    path("", CustomerProfileListCreateView.as_view(), name="customer-list-create"),

    # Retrieve / update / delete a specific profile by pk
    path("<int:pk>/", CustomerProfileDetailView.as_view(), name="customer-detail"),
]
