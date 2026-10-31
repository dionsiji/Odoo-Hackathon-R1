"""
Views for the customers app.

Access rules
------------
- ADMIN / STAFF : full list, retrieve, create, update, delete
- CUSTOMER      : retrieve and update their OWN profile only
"""

from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from core.permissions import IsAdminOrStaff, IsOwnerOrAdminOrStaff
from .models import CustomerProfile
from .serializers import CustomerProfileSerializer, CustomerProfileCreateSerializer


class CustomerProfileListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/customers/         – list all customer profiles (admin/staff only)
    POST /api/v1/customers/         – create a new customer profile (admin/staff only)
    """

    permission_classes = [IsAuthenticated, IsAdminOrStaff]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CustomerProfileCreateSerializer
        return CustomerProfileSerializer

    def get_queryset(self):
        return CustomerProfile.objects.select_related("user").all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        # Return full representation after creation
        out = CustomerProfileSerializer(profile, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class CustomerProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/customers/<pk>/  – retrieve a customer profile
    PATCH  /api/v1/customers/<pk>/  – partial update
    DELETE /api/v1/customers/<pk>/  – delete (admin/staff only)
    """

    serializer_class = CustomerProfileSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdminOrStaff]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return CustomerProfile.objects.select_related("user").all()
        # Customers can only access their own profile
        return CustomerProfile.objects.select_related("user").filter(user=user)

    def destroy(self, request, *args, **kwargs):
        if request.user.role not in (User.Role.ADMIN, User.Role.STAFF):
            raise PermissionDenied("Only admin or staff can delete customer profiles.")
        return super().destroy(request, *args, **kwargs)


class MyCustomerProfileView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/v1/customers/me/  – retrieve the authenticated customer's own profile
    PATCH /api/v1/customers/me/  – update their own profile
    """

    serializer_class = CustomerProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        try:
            return self.request.user.customer_profile
        except CustomerProfile.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("No customer profile found for this user.")
