"""
Views for the subscriptions app.
"""

from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.models import User
from core.permissions import IsAdminOrStaff
from core.custom_permissions import IsCustomerOwnerOrAdminOrStaff
from .models import Subscription
from .serializers import SubscriptionSerializer


class SubscriptionListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/subscriptions/ - List subscriptions (customer sees own, admin/staff sees all)
    POST /api/v1/subscriptions/ - Create subscription (admin/staff only)
    """
    serializer_class = SubscriptionSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminOrStaff()]
        return [IsCustomerOwnerOrAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Subscription.objects.none()

        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return Subscription.objects.select_related("customer__user", "quotation", "created_by").prefetch_related("lines__product", "lines__variant", "lines__plan").all()
        return Subscription.objects.select_related("customer__user", "quotation", "created_by").prefetch_related("lines__product", "lines__variant", "lines__plan").filter(
            customer__user=user
        )


class SubscriptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/subscriptions/{id}/ - Retrieve subscription
    PUT    /api/v1/subscriptions/{id}/ - Update subscription (admin/staff only)
    PATCH  /api/v1/subscriptions/{id}/ - Partial update subscription (admin/staff only)
    DELETE /api/v1/subscriptions/{id}/ - Delete subscription (admin/staff only, only while DRAFT)
    """
    serializer_class = SubscriptionSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsAdminOrStaff()]
        return [IsCustomerOwnerOrAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Subscription.objects.none()

        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return Subscription.objects.select_related("customer__user", "quotation", "created_by").prefetch_related("lines__product", "lines__variant", "lines__plan").all()
        return Subscription.objects.select_related("customer__user", "quotation", "created_by").prefetch_related("lines__product", "lines__variant", "lines__plan").filter(
            customer__user=user
        )


class SubscriptionActivateView(APIView):
    """
    POST /api/v1/subscriptions/{id}/activate/
    Transitions subscription from DRAFT to ACTIVE.
    Sets next_billing_date based on plan interval if not already set.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            sub = Subscription.objects.prefetch_related("lines__plan").get(pk=pk)
        except Subscription.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if sub.status != Subscription.Status.DRAFT:
            return Response(
                {"error": f"Cannot activate subscription in '{sub.status}' status. Only DRAFT subscriptions can be activated."},
                status=status.HTTP_400_BAD_REQUEST
            )

        sub.status = Subscription.Status.ACTIVE
        if not sub.start_date:
            sub.start_date = timezone.now().date()

        if not sub.next_billing_date:
            first_line = sub.lines.filter(plan__isnull=False).first()
            interval = first_line.plan.billing_interval if (first_line and first_line.plan) else "MONTHLY"
            sub.next_billing_date = sub.calculate_next_billing_date(from_date=sub.start_date, interval=interval)

        sub.save()
        serializer = SubscriptionSerializer(sub, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class SubscriptionPauseView(APIView):
    """
    POST /api/v1/subscriptions/{id}/pause/
    Transitions subscription from ACTIVE to PAUSED.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            sub = Subscription.objects.get(pk=pk)
        except Subscription.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if sub.status != Subscription.Status.ACTIVE:
            return Response(
                {"error": f"Cannot pause subscription in '{sub.status}' status. Only ACTIVE subscriptions can be paused."},
                status=status.HTTP_400_BAD_REQUEST
            )

        sub.status = Subscription.Status.PAUSED
        sub.save(update_fields=["status", "updated_at"])
        serializer = SubscriptionSerializer(sub, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class SubscriptionResumeView(APIView):
    """
    POST /api/v1/subscriptions/{id}/resume/
    Transitions subscription from PAUSED to ACTIVE.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            sub = Subscription.objects.get(pk=pk)
        except Subscription.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if sub.status != Subscription.Status.PAUSED:
            return Response(
                {"error": f"Cannot resume subscription in '{sub.status}' status. Only PAUSED subscriptions can be resumed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        sub.status = Subscription.Status.ACTIVE
        # If next_billing_date is in the past, adjust it forward
        today = timezone.now().date()
        if sub.next_billing_date and sub.next_billing_date < today:
            first_line = sub.lines.filter(plan__isnull=False).first()
            interval = first_line.plan.billing_interval if (first_line and first_line.plan) else "MONTHLY"
            sub.next_billing_date = sub.calculate_next_billing_date(from_date=today, interval=interval)

        sub.save()
        serializer = SubscriptionSerializer(sub, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class SubscriptionRenewView(APIView):
    """
    POST /api/v1/subscriptions/{id}/renew/
    Advances next_billing_date by interval.
    Only permitted for ACTIVE subscriptions.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            sub = Subscription.objects.prefetch_related("lines__plan").get(pk=pk)
        except Subscription.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if sub.status != Subscription.Status.ACTIVE:
            return Response(
                {"error": f"Cannot renew subscription in '{sub.status}' status. Only ACTIVE subscriptions can be renewed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        first_line = sub.lines.filter(plan__isnull=False).first()
        interval = first_line.plan.billing_interval if (first_line and first_line.plan) else "MONTHLY"
        base_date = sub.next_billing_date or timezone.now().date()
        sub.next_billing_date = sub.calculate_next_billing_date(from_date=base_date, interval=interval)
        sub.save(update_fields=["next_billing_date", "updated_at"])
        serializer = SubscriptionSerializer(sub, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class SubscriptionCloseView(APIView):
    """
    POST /api/v1/subscriptions/{id}/close/
    Transitions subscription to CLOSED (early closure or termination).
    Valid from DRAFT, ACTIVE, or PAUSED.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            sub = Subscription.objects.get(pk=pk)
        except Subscription.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if sub.status == Subscription.Status.CLOSED:
            return Response(
                {"error": "Subscription is already CLOSED."},
                status=status.HTTP_400_BAD_REQUEST
            )

        sub.status = Subscription.Status.CLOSED
        if not sub.end_date:
            sub.end_date = timezone.now().date()
        sub.save(update_fields=["status", "end_date", "updated_at"])
        serializer = SubscriptionSerializer(sub, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
