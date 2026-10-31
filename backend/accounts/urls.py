"""
URL patterns for the accounts app.
Prefixed with /api/v1/auth/ in brightloop/api_v1_urls.py.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import RegisterView, MeView

urlpatterns = [
    # Registration
    path("register/", RegisterView.as_view(), name="auth-register"),

    # JWT login – returns access + refresh tokens
    path("login/", TokenObtainPairView.as_view(), name="auth-login"),

    # JWT refresh – exchange a refresh token for a new access token
    path("token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),

    # Authenticated user profile
    path("me/", MeView.as_view(), name="auth-me"),
]
