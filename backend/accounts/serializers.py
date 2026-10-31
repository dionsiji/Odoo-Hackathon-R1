"""
Serializers for the accounts app.
"""

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Validates and creates a new user account.
    Password must pass Django's built-in validators (length, common, numeric).
    """

    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "password", "password_confirm", "role"]
        read_only_fields = ["id"]
        extra_kwargs = {
            "first_name": {"required": True},
            "last_name": {"required": True},
        }

    def validate_role(self, value):
        """Only ADMINs may register ADMIN or STAFF accounts via the API."""
        request = self.context.get("request")
        restricted_roles = (User.Role.ADMIN, User.Role.STAFF)
        if value in restricted_roles:
            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError(
                    "Only authenticated admins can create ADMIN or STAFF accounts."
                )
            if request.user.role != User.Role.ADMIN:
                raise serializers.ValidationError(
                    "Only admins can assign ADMIN or STAFF roles."
                )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        # Run Django's system validators against the password
        try:
            validate_password(attrs["password"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        role = validated_data.get("role", User.Role.CUSTOMER)
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=role,
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Read / partial-update serializer for the authenticated user's own profile."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "role", "date_joined", "is_active"]
        read_only_fields = ["id", "email", "role", "date_joined", "is_active"]


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT payload to include the user's role and full name.
    Referenced in settings.SIMPLE_JWT['TOKEN_OBTAIN_SERIALIZER'].
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        token["full_name"] = user.full_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Append user info to the login response body
        data["user"] = {
            "id": self.user.id,
            "email": self.user.email,
            "full_name": self.user.full_name,
            "role": self.user.role,
        }
        return data
