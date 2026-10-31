"""
Serializers for the customers app.
"""

from rest_framework import serializers

from accounts.models import User
from .models import CustomerProfile


class CustomerProfileSerializer(serializers.ModelSerializer):
    """
    Full serializer for CustomerProfile.
    Exposes user email and role as read-only nested fields.
    """

    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "email",
            "full_name",
            "role",
            "phone",
            "company_name",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "country",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "email", "full_name", "role", "created_at", "updated_at"]


class CustomerProfileCreateSerializer(serializers.ModelSerializer):
    """
    Used by staff/admin to create a customer profile for a given user.
    """

    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.CUSTOMER),
        source="user",
        write_only=True,
    )

    class Meta:
        model = CustomerProfile
        fields = [
            "user_id",
            "phone",
            "company_name",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "country",
            "status",
        ]

    def validate_user_id(self, user):
        if CustomerProfile.objects.filter(user=user).exists():
            raise serializers.ValidationError("A customer profile already exists for this user.")
        return user
