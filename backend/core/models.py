"""
Shared models for audit logging and in-app notifications.
"""

import json
from django.db import models
from django.conf import settings
from django.utils import timezone


class ActivityLog(models.Model):
    """
    Audit trail for important system events.
    Records actor, action, object type, object id, and optional metadata.
    """
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_logs",
    )
    action = models.CharField(max_length=100, db_index=True)
    object_type = models.CharField(max_length=50, db_index=True)
    object_id = models.CharField(max_length=64, blank=True, db_index=True)
    object_repr = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Activity Log"
        verbose_name_plural = "Activity Logs"

    def __str__(self):
        actor = self.actor.email if self.actor else "System"
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {actor}: {self.action} {self.object_type}({self.object_id})"

    @classmethod
    def log(cls, actor, action, obj=None, object_type=None, object_id=None, object_repr=None, metadata=None):
        """Convenience class method to create a log entry."""
        if obj is not None:
            object_type = object_type or obj.__class__.__name__
            object_id = object_id or str(getattr(obj, "pk", ""))
            object_repr = object_repr or str(obj)[:255]
        return cls.objects.create(
            actor=actor,
            action=action,
            object_type=object_type or "",
            object_id=object_id or "",
            object_repr=object_repr or "",
            metadata=metadata or {},
        )


class Notification(models.Model):
    """
    Database-backed in-app notification for users.
    """
    class NotificationType(models.TextChoices):
        INVOICE_ISSUED = "INVOICE_ISSUED", "Invoice Issued"
        INVOICE_OVERDUE = "INVOICE_OVERDUE", "Invoice Overdue"
        INVOICE_CANCELLED = "INVOICE_CANCELLED", "Invoice Cancelled"
        PAYMENT_RECEIVED = "PAYMENT_RECEIVED", "Payment Received"
        PAYMENT_FAILED = "PAYMENT_FAILED", "Payment Failed"
        PAYMENT_REFUNDED = "PAYMENT_REFUNDED", "Payment Refunded"
        SUBSCRIPTION_ACTIVATED = "SUBSCRIPTION_ACTIVATED", "Subscription Activated"
        SUBSCRIPTION_RENEWED = "SUBSCRIPTION_RENEWED", "Subscription Renewed"
        SUBSCRIPTION_PAUSED = "SUBSCRIPTION_PAUSED", "Subscription Paused"
        SUBSCRIPTION_CANCELLED = "SUBSCRIPTION_CANCELLED", "Subscription Cancelled"
        QUOTATION_ACCEPTED = "QUOTATION_ACCEPTED", "Quotation Accepted"
        GENERAL = "GENERAL", "General"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.GENERAL,
        db_index=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    object_type = models.CharField(max_length=50, blank=True)
    object_id = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        return f"[{self.notification_type}] → {self.recipient.email}: {self.title}"

    @classmethod
    def notify(cls, recipient, notification_type, title, message, obj=None):
        """Convenience class method to create a notification."""
        object_type = ""
        object_id = ""
        if obj is not None:
            object_type = obj.__class__.__name__
            object_id = str(getattr(obj, "pk", ""))
        return cls.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
            object_type=object_type,
            object_id=object_id,
        )
