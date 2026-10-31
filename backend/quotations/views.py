"""
Views for the quotations app.
"""

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import User
from core.permissions import IsAdminOrStaff
from core.custom_permissions import IsCustomerOwnerOrAdminOrStaff
from .models import QuotationTemplate, Quotation
from .serializers import QuotationTemplateSerializer, QuotationSerializer


class QuotationTemplateListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/quotation-templates/ - List quotation templates (admin/staff only)
    POST /api/v1/quotation-templates/ - Create template (admin/staff only)
    """
    queryset = QuotationTemplate.objects.all()
    serializer_class = QuotationTemplateSerializer
    permission_classes = [IsAdminOrStaff]


class QuotationTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/quotation-templates/{id}/ - Retrieve template
    PUT    /api/v1/quotation-templates/{id}/ - Update template
    PATCH  /api/v1/quotation-templates/{id}/ - Partial update template
    DELETE /api/v1/quotation-templates/{id}/ - Delete template
    """
    queryset = QuotationTemplate.objects.all()
    serializer_class = QuotationTemplateSerializer
    permission_classes = [IsAdminOrStaff]


class QuotationListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/quotations/ - List quotations (filtered by ownership for customers)
    POST /api/v1/quotations/ - Create quotation (admin/staff only)
    """
    serializer_class = QuotationSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminOrStaff()]
        return [IsCustomerOwnerOrAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Quotation.objects.none()

        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            qs = Quotation.objects.select_related("customer__user", "template", "created_by").prefetch_related("lines__product", "lines__variant").all()
        else:
            # Customers only see quotations for their customer profile
            qs = Quotation.objects.select_related("customer__user", "template", "created_by").prefetch_related("lines__product", "lines__variant").filter(
                customer__user=user
            )

        # Check and update expired status dynamically
        for q in qs:
            q.check_expiration()

        return qs


class QuotationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/quotations/{id}/ - Retrieve quotation
    PUT    /api/v1/quotations/{id}/ - Update quotation (admin/staff only, only while DRAFT)
    PATCH  /api/v1/quotations/{id}/ - Partial update (admin/staff only, only while DRAFT)
    DELETE /api/v1/quotations/{id}/ - Delete quotation (admin/staff only)
    """
    serializer_class = QuotationSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsAdminOrStaff()]
        return [IsCustomerOwnerOrAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Quotation.objects.none()

        if user.role in (User.Role.ADMIN, User.Role.STAFF):
            return Quotation.objects.select_related("customer__user", "template", "created_by").prefetch_related("lines__product", "lines__variant").all()
        return Quotation.objects.select_related("customer__user", "template", "created_by").prefetch_related("lines__product", "lines__variant").filter(
            customer__user=user
        )

    def get_object(self):
        obj = super().get_object()
        obj.check_expiration()
        return obj


class QuotationSendView(APIView):
    """
    POST /api/v1/quotations/{id}/send/
    Sends a DRAFT quotation to customer (Admin/Staff only).
    Changes status to SENT.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request, pk):
        try:
            quotation = Quotation.objects.get(pk=pk)
        except Quotation.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        quotation.check_expiration()
        if quotation.status != Quotation.Status.DRAFT:
            return Response(
                {"error": f"Cannot send quotation with status '{quotation.status}'. Must be in DRAFT status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        quotation.status = Quotation.Status.SENT
        quotation.save(update_fields=["status", "updated_at"])
        serializer = QuotationSerializer(quotation, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class QuotationAcceptView(APIView):
    """
    POST /api/v1/quotations/{id}/accept/
    Workflow: Customer (or Admin/Staff on customer's behalf) accepts a SENT quotation.
    Must be in SENT status and not expired.
    """
    permission_classes = [IsCustomerOwnerOrAdminOrStaff]

    def post(self, request, pk):
        try:
            quotation = Quotation.objects.select_related("customer__user").get(pk=pk)
        except Quotation.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check customer isolation
        user = request.user
        if user.role == User.Role.CUSTOMER and quotation.customer.user != user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if quotation.check_expiration() or quotation.status == Quotation.Status.EXPIRED:
            return Response(
                {"error": "Quotation has expired and cannot be accepted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if quotation.status != Quotation.Status.SENT:
            return Response(
                {"error": f"Cannot accept quotation in '{quotation.status}' status. Only SENT quotations can be accepted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        quotation.status = Quotation.Status.ACCEPTED
        quotation.save(update_fields=["status", "updated_at"])
        serializer = QuotationSerializer(quotation, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class QuotationRejectView(APIView):
    """
    POST /api/v1/quotations/{id}/reject/
    Workflow: Customer (or Admin/Staff on customer's behalf) rejects a SENT quotation.
    Must be in SENT status.
    """
    permission_classes = [IsCustomerOwnerOrAdminOrStaff]

    def post(self, request, pk):
        try:
            quotation = Quotation.objects.select_related("customer__user").get(pk=pk)
        except Quotation.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check customer isolation
        user = request.user
        if user.role == User.Role.CUSTOMER and quotation.customer.user != user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if quotation.check_expiration() or quotation.status == Quotation.Status.EXPIRED:
            return Response(
                {"error": "Quotation has expired and cannot be rejected."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if quotation.status != Quotation.Status.SENT:
            return Response(
                {"error": f"Cannot reject quotation in '{quotation.status}' status. Only SENT quotations can be rejected."},
                status=status.HTTP_400_BAD_REQUEST
            )

        quotation.status = Quotation.Status.REJECTED
        quotation.save(update_fields=["status", "updated_at"])
        serializer = QuotationSerializer(quotation, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
