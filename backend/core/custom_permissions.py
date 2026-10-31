"""
Custom permissions for Catalog, Quotations, and Subscriptions.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS
from accounts.models import User


class IsAdminOrStaffOrReadOnly(BasePermission):
    """
    Allows read-only access (GET, HEAD, OPTIONS) to any authenticated user.
    Write access (POST, PUT, PATCH, DELETE) is restricted to ADMIN or STAFF.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in (User.Role.ADMIN, User.Role.STAFF)


class IsCustomerOwnerOrAdminOrStaff(BasePermission):
    """
    Object-level permission for objects linked to CustomerProfile (e.g. Quotation, Subscription).
    - ADMIN / STAFF: Full access.
    - CUSTOMER: Read access only if customer.user == request.user.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role in (User.Role.ADMIN, User.Role.STAFF):
            return True
        # For Quotation or Subscription, obj.customer is a CustomerProfile
        customer = getattr(obj, "customer", None)
        if customer:
            return customer.user == request.user
        return False
