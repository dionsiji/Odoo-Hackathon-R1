"""
Views for the catalog app.
"""

from rest_framework import generics, status
from rest_framework.response import Response
from accounts.models import User
from core.custom_permissions import IsAdminOrStaffOrReadOnly
from .models import Product, ProductVariant, SubscriptionPlan
from .serializers import (
    ProductSerializer,
    ProductVariantSerializer,
    SubscriptionPlanSerializer,
)


class ProductListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/products/ - List products (active only for customers; all for admin/staff)
    POST /api/v1/products/ - Create product (admin/staff only)
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrStaffOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role in (User.Role.ADMIN, User.Role.STAFF):
            return Product.objects.prefetch_related("variants").all()
        return Product.objects.prefetch_related("variants").filter(is_active=True)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/products/{id}/ - Retrieve product
    PUT    /api/v1/products/{id}/ - Update product (admin/staff only)
    PATCH  /api/v1/products/{id}/ - Partial update product (admin/staff only)
    DELETE /api/v1/products/{id}/ - Delete product (admin/staff only)
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrStaffOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role in (User.Role.ADMIN, User.Role.STAFF):
            return Product.objects.prefetch_related("variants").all()
        return Product.objects.prefetch_related("variants").filter(is_active=True)


class ProductVariantListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/products/{id}/variants/ - List variants for product
    POST /api/v1/products/{id}/variants/ - Create variant for product (admin/staff only)
    """
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAdminOrStaffOrReadOnly]

    def get_product(self):
        user = self.request.user
        qs = Product.objects.all()
        if not (user.is_authenticated and user.role in (User.Role.ADMIN, User.Role.STAFF)):
            qs = qs.filter(is_active=True)
        return generics.get_object_or_404(qs, pk=self.kwargs["pk"])

    def get_queryset(self):
        product = self.get_product()
        user = self.request.user
        if user.is_authenticated and user.role in (User.Role.ADMIN, User.Role.STAFF):
            return ProductVariant.objects.filter(product=product)
        return ProductVariant.objects.filter(product=product, is_active=True)

    def perform_create(self, serializer):
        product = self.get_product()
        serializer.save(product=product)


class SubscriptionPlanListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/plans/ - List subscription plans (active only for customers; all for admin/staff)
    POST /api/v1/plans/ - Create subscription plan (admin/staff only)
    """
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAdminOrStaffOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role in (User.Role.ADMIN, User.Role.STAFF):
            return SubscriptionPlan.objects.select_related("product", "variant").all()
        return SubscriptionPlan.objects.select_related("product", "variant").filter(
            is_active=True,
            product__is_active=True
        )


class SubscriptionPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/plans/{id}/ - Retrieve plan
    PUT    /api/v1/plans/{id}/ - Update plan (admin/staff only)
    PATCH  /api/v1/plans/{id}/ - Partial update plan (admin/staff only)
    DELETE /api/v1/plans/{id}/ - Delete plan (admin/staff only)
    """
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAdminOrStaffOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role in (User.Role.ADMIN, User.Role.STAFF):
            return SubscriptionPlan.objects.select_related("product", "variant").all()
        return SubscriptionPlan.objects.select_related("product", "variant").filter(
            is_active=True,
            product__is_active=True
        )
