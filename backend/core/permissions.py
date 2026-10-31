"""
Shared DRF permission classes used across the Brightloop API.
"""

from rest_framework.permissions import BasePermission
from accounts.models import User


class IsAdmin(BasePermission):
    """Grants access only to users with the ADMIN role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class IsAdminOrStaff(BasePermission):
    """Grants access to ADMIN or STAFF users."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.ADMIN, User.Role.STAFF)
        )


class IsOwnerOrAdminOrStaff(BasePermission):
    """
    Object-level permission.
    - ADMIN / STAFF: always allowed.
    - CUSTOMER: only allowed on objects they own (obj.user == request.user).
    """

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in (User.Role.ADMIN, User.Role.STAFF):
            return True
        # Supports objects with a `user` FK attribute
        return getattr(obj, "user", None) == request.user
