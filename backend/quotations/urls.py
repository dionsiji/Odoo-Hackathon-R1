"""
URL configuration for the quotations app.
"""

from django.urls import path
from .views import (
    QuotationTemplateListCreateView,
    QuotationTemplateDetailView,
    QuotationListCreateView,
    QuotationDetailView,
    QuotationSendView,
    QuotationAcceptView,
    QuotationRejectView,
)

urlpatterns = [
    path("quotation-templates/", QuotationTemplateListCreateView.as_view(), name="quotation-template-list-create"),
    path("quotation-templates/<int:pk>/", QuotationTemplateDetailView.as_view(), name="quotation-template-detail"),
    path("quotations/", QuotationListCreateView.as_view(), name="quotation-list-create"),
    path("quotations/<int:pk>/", QuotationDetailView.as_view(), name="quotation-detail"),
    path("quotations/<int:pk>/send/", QuotationSendView.as_view(), name="quotation-send"),
    path("quotations/<int:pk>/accept/", QuotationAcceptView.as_view(), name="quotation-accept"),
    path("quotations/<int:pk>/reject/", QuotationRejectView.as_view(), name="quotation-reject"),
]
