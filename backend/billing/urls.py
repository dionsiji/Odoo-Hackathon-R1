"""
URL routing for the billing app — all routes for Module 3.
"""

from django.urls import path
from .views import (
    TaxRateListCreateView,
    TaxRateDetailView,
    DiscountListCreateView,
    DiscountDetailView,
    InvoiceListCreateView,
    InvoiceDetailView,
    InvoiceIssueView,
    InvoiceVoidView,
    InvoiceCancelView,
    InvoiceGenerateFromQuotationView,
    InvoiceGenerateFromSubscriptionView,
)
from .views2 import (
    PaymentListCreateView,
    PaymentDetailView,
    PaymentRefundView,
    RecurringBillingRunView,
    AnalyticsOverviewView,
    AnalyticsRevenueView,
    InvoicePDFView,
    ActivityLogListView,
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    CustomerCSVExportView,
    ProductCSVExportView,
    InvoiceCSVExportView,
    PaymentCSVExportView,
    CustomerCSVImportView,
    ProductCSVImportView,
    GlobalSearchView,
)

urlpatterns = [
    # ── Tax Rates ────────────────────────────────────────────────────────────
    path("tax-rates/", TaxRateListCreateView.as_view(), name="tax-rate-list-create"),
    path("tax-rates/<int:pk>/", TaxRateDetailView.as_view(), name="tax-rate-detail"),

    # ── Discounts ────────────────────────────────────────────────────────────
    path("discounts/", DiscountListCreateView.as_view(), name="discount-list-create"),
    path("discounts/<int:pk>/", DiscountDetailView.as_view(), name="discount-detail"),

    # ── Invoices ─────────────────────────────────────────────────────────────
    path("invoices/", InvoiceListCreateView.as_view(), name="invoice-list-create"),
    path("invoices/<int:pk>/", InvoiceDetailView.as_view(), name="invoice-detail"),
    path("invoices/<int:pk>/issue/", InvoiceIssueView.as_view(), name="invoice-issue"),
    path("invoices/<int:pk>/void/", InvoiceVoidView.as_view(), name="invoice-void"),
    path("invoices/<int:pk>/cancel/", InvoiceCancelView.as_view(), name="invoice-cancel"),
    path("invoices/<int:pk>/pdf/", InvoicePDFView.as_view(), name="invoice-pdf"),

    # ── Invoice Conversions ──────────────────────────────────────────────────
    path("quotations/<int:pk>/generate-invoice/", InvoiceGenerateFromQuotationView.as_view(), name="quotation-generate-invoice"),
    path("subscriptions/<int:pk>/generate-invoice/", InvoiceGenerateFromSubscriptionView.as_view(), name="subscription-generate-invoice"),

    # ── Payments ─────────────────────────────────────────────────────────────
    path("payments/", PaymentListCreateView.as_view(), name="payment-list-create"),
    path("payments/<int:pk>/", PaymentDetailView.as_view(), name="payment-detail"),
    path("payments/<int:pk>/refund/", PaymentRefundView.as_view(), name="payment-refund"),

    # ── Recurring Billing ────────────────────────────────────────────────────
    path("billing/run/", RecurringBillingRunView.as_view(), name="billing-run"),

    # ── Analytics ────────────────────────────────────────────────────────────
    path("analytics/overview/", AnalyticsOverviewView.as_view(), name="analytics-overview"),
    path("analytics/revenue/", AnalyticsRevenueView.as_view(), name="analytics-revenue"),

    # ── Activity Logs ────────────────────────────────────────────────────────
    path("activity-logs/", ActivityLogListView.as_view(), name="activity-log-list"),

    # ── Notifications ────────────────────────────────────────────────────────
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/mark-all-read/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("notifications/<int:pk>/mark-read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),

    # ── CSV Export ───────────────────────────────────────────────────────────
    path("export/customers.csv", CustomerCSVExportView.as_view(), name="export-customers-csv"),
    path("export/products.csv", ProductCSVExportView.as_view(), name="export-products-csv"),
    path("export/invoices.csv", InvoiceCSVExportView.as_view(), name="export-invoices-csv"),
    path("export/payments.csv", PaymentCSVExportView.as_view(), name="export-payments-csv"),

    # ── CSV Import ───────────────────────────────────────────────────────────
    path("import/customers/", CustomerCSVImportView.as_view(), name="import-customers-csv"),
    path("import/products/", ProductCSVImportView.as_view(), name="import-products-csv"),

    # ── Global Search ────────────────────────────────────────────────────────
    path("search/", GlobalSearchView.as_view(), name="global-search"),
]
