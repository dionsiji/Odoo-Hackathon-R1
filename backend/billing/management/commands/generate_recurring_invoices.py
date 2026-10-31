"""
Management command: generate_recurring_invoices

Usage:
    python manage.py generate_recurring_invoices [--due-in-days 14] [--dry-run]

Finds all ACTIVE subscriptions with next_billing_date <= today, creates DRAFT
invoices, advances next_billing_date. Idempotent for the same billing window.
"""

from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from dateutil.relativedelta import relativedelta

from subscriptions.models import Subscription, SubscriptionLine
from billing.models import Invoice, InvoiceLine
from core.models import ActivityLog, Notification


class Command(BaseCommand):
    help = "Generate recurring invoices for active subscriptions due for billing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--due-in-days",
            type=int,
            default=14,
            help="Number of days from today the invoice is due (default: 14).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes.",
        )

    def handle(self, *args, **options):
        today = timezone.now().date()
        due_in_days = options["due_in_days"]
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no changes will be made.\n"))

        due_subs = Subscription.objects.filter(
            status=Subscription.Status.ACTIVE,
            next_billing_date__lte=today,
        ).prefetch_related("lines__product", "lines__variant", "lines__plan").select_related("customer")

        created = 0
        skipped = 0

        for sub in due_subs:
            cycle_start = sub.next_billing_date or today
            first_plan = sub.lines.filter(plan__isnull=False).first()
            interval = (
                first_plan.plan.billing_interval
                if first_plan and first_plan.plan
                else "MONTHLY"
            )
            if interval == "YEARLY":
                cycle_end = cycle_start + relativedelta(years=1)
            elif interval == "QUARTERLY":
                cycle_end = cycle_start + relativedelta(months=3)
            else:
                cycle_end = cycle_start + relativedelta(months=1)

            already_exists = Invoice.objects.filter(
                subscription=sub,
                billing_cycle_start=cycle_start,
                billing_cycle_end=cycle_end,
            ).exclude(status__in=[Invoice.Status.VOID, Invoice.Status.CANCELLED]).exists()

            if already_exists:
                self.stdout.write(f"  SKIP  {sub.subscription_number} — invoice already exists for cycle {cycle_start}")
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  WOULD CREATE invoice for {sub.subscription_number} "
                        f"(cycle {cycle_start} → {cycle_end}, {interval})"
                    )
                )
                created += 1
                continue

            with transaction.atomic():
                invoice = Invoice.objects.create(
                    customer=sub.customer,
                    subscription=sub,
                    issue_date=today,
                    due_date=today + timedelta(days=due_in_days),
                    billing_cycle_start=cycle_start,
                    billing_cycle_end=cycle_end,
                    status=Invoice.Status.DRAFT,
                    notes=f"Recurring billing: {sub.subscription_number} ({interval}) {cycle_start}–{cycle_end}",
                    created_by=sub.customer.user,  # system-initiated
                )
                for line in sub.lines.all():
                    InvoiceLine.objects.create(
                        invoice=invoice,
                        product=line.product,
                        variant=line.variant,
                        plan=line.plan,
                        description=f"Subscription: {line.product.name}",
                        quantity=line.quantity,
                        unit_price=line.unit_price,
                    )
                invoice.calculate_totals(save=True)
                sub.next_billing_date = cycle_end
                sub.save(update_fields=["next_billing_date", "updated_at"])
                ActivityLog.log(
                    actor=None,
                    action="RECURRING_INVOICE_GENERATED",
                    obj=invoice,
                    metadata={"subscription": sub.subscription_number, "cycle": str(cycle_start)},
                )
                Notification.notify(
                    recipient=sub.customer.user,
                    notification_type=Notification.NotificationType.SUBSCRIPTION_RENEWED,
                    title=f"Subscription renewed: {sub.subscription_number}",
                    message=f"Invoice {invoice.invoice_number} generated for your subscription renewal.",
                    obj=invoice,
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  CREATED {invoice.invoice_number} for {sub.subscription_number} "
                        f"(${invoice.total_amount}, cycle {cycle_start} → {cycle_end})"
                    )
                )
                created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone: {created} invoice(s) created, {skipped} skipped."
                + (" [DRY RUN]" if dry_run else "")
            )
        )
