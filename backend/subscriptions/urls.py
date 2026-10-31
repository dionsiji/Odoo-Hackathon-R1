"""
URL configuration for the subscriptions app.
"""

from django.urls import path
from .views import (
    SubscriptionListCreateView,
    SubscriptionDetailView,
    SubscriptionActivateView,
    SubscriptionPauseView,
    SubscriptionResumeView,
    SubscriptionRenewView,
    SubscriptionCloseView,
)

urlpatterns = [
    path("subscriptions/", SubscriptionListCreateView.as_view(), name="subscription-list-create"),
    path("subscriptions/<int:pk>/", SubscriptionDetailView.as_view(), name="subscription-detail"),
    path("subscriptions/<int:pk>/activate/", SubscriptionActivateView.as_view(), name="subscription-activate"),
    path("subscriptions/<int:pk>/pause/", SubscriptionPauseView.as_view(), name="subscription-pause"),
    path("subscriptions/<int:pk>/resume/", SubscriptionResumeView.as_view(), name="subscription-resume"),
    path("subscriptions/<int:pk>/renew/", SubscriptionRenewView.as_view(), name="subscription-renew"),
    path("subscriptions/<int:pk>/close/", SubscriptionCloseView.as_view(), name="subscription-close"),
]
