# -*- coding: utf-8 -*-
"""
Brightloop Seed Data Script
Usage: python seed_data.py (from backend/ directory)
"""

import os
import sys
import django
from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from datetime import timedelta
from dateutil.relativedelta import relativedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "brightloop.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from accounts.models import User
from customers.models import CustomerProfile
from catalog.models import Product, ProductVariant, SubscriptionPlan
from quotations.models import QuotationTemplate, Quotation, QuotationLine
from subscriptions.models import Subscription, SubscriptionLine
from billing.models import TaxRate, Discount, Invoice, InvoiceLine, Payment
from core.models import ActivityLog, Notification

print("[SEED] Starting Brightloop seed data creation...")

# ── 1. Users
print("\n[1/8] Creating users...")

admin, _ = User.objects.get_or_create(
    email="admin@brightloop.com",
    defaults={
        "first_name": "Alex",
        "last_name": "Admin",
        "role": User.Role.ADMIN,
        "is_staff": True,
        "is_superuser": True,
    }
)
admin.set_password("Admin@1234")
admin.save()
print("  [OK] Admin: " + admin.email)

staff, _ = User.objects.get_or_create(
    email="staff@brightloop.com",
    defaults={
        "first_name": "Sarah",
        "last_name": "Staff",
        "role": User.Role.STAFF,
        "is_staff": True,
    }
)
staff.set_password("Staff@1234")
staff.save()
print("  [OK] Staff: " + staff.email)

customer_data = [
    {"email": "alice@techcorp.com", "first_name": "Alice", "last_name": "Johnson", "company": "TechCorp Ltd", "phone": "+1-555-0101", "city": "San Francisco", "country": "US"},
    {"email": "bob@innovate.io", "first_name": "Bob", "last_name": "Smith", "company": "Innovate IO", "phone": "+1-555-0102", "city": "New York", "country": "US"},
    {"email": "carol@startupxyz.com", "first_name": "Carol", "last_name": "Williams", "company": "StartupXYZ", "phone": "+44-20-7946-0103", "city": "London", "country": "GB"},
    {"email": "david@enterprise.co", "first_name": "David", "last_name": "Brown", "company": "Enterprise Co", "phone": "+1-555-0104", "city": "Chicago", "country": "US"},
    {"email": "emma@growthco.net", "first_name": "Emma", "last_name": "Davis", "company": "GrowthCo", "phone": "+61-2-9000-0105", "city": "Sydney", "country": "AU"},
]

customer_users = []
customer_profiles = []
for cd in customer_data:
    u, created = User.objects.get_or_create(
        email=cd["email"],
        defaults={
            "first_name": cd["first_name"],
            "last_name": cd["last_name"],
            "role": User.Role.CUSTOMER,
        }
    )
    if created:
        u.set_password("Customer@1234")
        u.save()
    customer_users.append(u)

    cp, _ = CustomerProfile.objects.get_or_create(
        user=u,
        defaults={
            "company_name": cd["company"],
            "phone": cd["phone"],
            "city": cd["city"],
            "country": cd["country"],
            "address_line1": "123 Main St",
        }
    )
    customer_profiles.append(cp)
    print("  [OK] Customer: " + u.email + " (" + cd["company"] + ")")

# ── 2. Products
print("\n[2/8] Creating products...")

products_data = [
    {"name": "Brightloop Starter", "sku": "BL-STARTER", "category": "SaaS Platform", "description": "Entry-level subscription management for small businesses"},
    {"name": "Brightloop Professional", "sku": "BL-PRO", "category": "SaaS Platform", "description": "Full-featured platform for growing businesses"},
    {"name": "Brightloop Enterprise", "sku": "BL-ENT", "category": "SaaS Platform", "description": "Enterprise-grade subscription management with advanced analytics"},
    {"name": "Priority Support Package", "sku": "SUP-PRI", "category": "Support", "description": "24/7 priority support with dedicated account manager"},
    {"name": "API Access Add-on", "sku": "API-ADD", "category": "Add-on", "description": "Full REST API access for custom integrations"},
    {"name": "Data Migration Service", "sku": "SVC-MIG", "category": "Professional Services", "description": "One-time data migration and onboarding service"},
]

products = []
for pd in products_data:
    p, _ = Product.objects.get_or_create(
        sku=pd["sku"],
        defaults={
            "name": pd["name"],
            "category": pd["category"],
            "description": pd["description"],
            "is_active": True,
        }
    )
    products.append(p)
    print("  [OK] Product: " + p.name + " (" + p.sku + ")")

# Variants
variants_data = [
    {"product": products[0], "variant_name": "Monthly - 5 Users", "sku": "BL-STARTER-M5", "price": Decimal("49.00")},
    {"product": products[0], "variant_name": "Monthly - 10 Users", "sku": "BL-STARTER-M10", "price": Decimal("89.00")},
    {"product": products[1], "variant_name": "Monthly - 20 Users", "sku": "BL-PRO-M20", "price": Decimal("149.00")},
    {"product": products[1], "variant_name": "Monthly - 50 Users", "sku": "BL-PRO-M50", "price": Decimal("299.00")},
    {"product": products[2], "variant_name": "Annual - Unlimited", "sku": "BL-ENT-A-UNL", "price": Decimal("1999.00")},
]

variants = []
for vd in variants_data:
    v, _ = ProductVariant.objects.get_or_create(
        sku=vd["sku"],
        defaults={
            "product": vd["product"],
            "variant_name": vd["variant_name"],
            "price": vd["price"],
            "is_active": True,
        }
    )
    variants.append(v)
    print("  [OK] Variant: " + v.variant_name + " ($" + str(v.price) + ")")

# ── 3. Subscription Plans
print("\n[3/8] Creating subscription plans...")

plans_data = [
    {"name": "Starter Monthly", "product": products[0], "variant": variants[0], "price": Decimal("49.00"), "interval": "MONTHLY"},
    {"name": "Starter Quarterly", "product": products[0], "variant": variants[1], "price": Decimal("129.00"), "interval": "QUARTERLY"},
    {"name": "Professional Monthly", "product": products[1], "variant": variants[2], "price": Decimal("149.00"), "interval": "MONTHLY"},
    {"name": "Professional Quarterly", "product": products[1], "variant": variants[3], "price": Decimal("399.00"), "interval": "QUARTERLY"},
    {"name": "Enterprise Annual", "product": products[2], "variant": variants[4], "price": Decimal("1999.00"), "interval": "YEARLY"},
    {"name": "Support Monthly", "product": products[3], "variant": None, "price": Decimal("99.00"), "interval": "MONTHLY"},
    {"name": "API Access Monthly", "product": products[4], "variant": None, "price": Decimal("29.00"), "interval": "MONTHLY"},
]

plans = []
for pd in plans_data:
    plan, _ = SubscriptionPlan.objects.get_or_create(
        name=pd["name"],
        defaults={
            "product": pd["product"],
            "variant": pd["variant"],
            "price": pd["price"],
            "billing_interval": pd["interval"],
            "is_active": True,
        }
    )
    plans.append(plan)
    print("  [OK] Plan: " + plan.name + " ($" + str(plan.price) + "/" + plan.billing_interval + ")")

# ── 4. Tax Rates
print("\n[4/8] Creating tax rates...")

taxes_data = [
    {"name": "US Sales Tax", "code": "US-TAX", "rate": Decimal("8.50"), "description": "Standard US sales tax"},
    {"name": "UK VAT", "code": "UK-VAT", "rate": Decimal("20.00"), "description": "UK Value Added Tax"},
    {"name": "GST Australia", "code": "AU-GST", "rate": Decimal("10.00"), "description": "Australian GST"},
    {"name": "Zero Rate", "code": "ZERO", "rate": Decimal("0.00"), "description": "Zero-rated tax"},
]

tax_rates = []
for td in taxes_data:
    tax, _ = TaxRate.objects.get_or_create(
        code=td["code"],
        defaults={
            "name": td["name"],
            "rate": td["rate"],
            "description": td["description"],
            "is_active": True,
        }
    )
    tax_rates.append(tax)
    print("  [OK] Tax: " + tax.name + " (" + str(tax.rate) + "%)")

# ── 5. Discounts
print("\n[5/8] Creating discounts...")

today = timezone.now().date()

discounts_data = [
    {"code": "WELCOME20", "type": "PERCENTAGE", "amount": Decimal("20.00"), "description": "20% off for new customers", "min_order": Decimal("0.00"), "limit": 100},
    {"code": "ANNUAL10", "type": "PERCENTAGE", "amount": Decimal("10.00"), "description": "10% off annual subscriptions", "min_order": Decimal("500.00"), "limit": None},
    {"code": "FLAT50", "type": "FIXED_AMOUNT", "amount": Decimal("50.00"), "description": "$50 discount on orders over $200", "min_order": Decimal("200.00"), "limit": 50},
    {"code": "STARTUP15", "type": "PERCENTAGE", "amount": Decimal("15.00"), "description": "15% startup discount", "min_order": Decimal("0.00"), "limit": 30},
]

discounts = []
for dd in discounts_data:
    disc, _ = Discount.objects.get_or_create(
        code=dd["code"],
        defaults={
            "description": dd["description"],
            "discount_type": dd["type"],
            "amount": dd["amount"],
            "min_order_amount": dd["min_order"],
            "usage_limit": dd["limit"],
            "is_active": True,
            "valid_from": today - timedelta(days=30),
            "valid_to": today + timedelta(days=365),
        }
    )
    discounts.append(disc)
    print("  [OK] Discount: " + disc.code + " (" + disc.discount_type + " " + str(disc.amount) + ")")

# ── 6. Quotation Template
print("\n[6/8] Creating quotations and subscriptions...")

tmpl, _ = QuotationTemplate.objects.get_or_create(
    name="Standard SaaS Proposal",
    defaults={
        "default_validity_days": 30,
        "description": "Thank you for considering Brightloop.",
        "terms_and_conditions": "Payment due within 30 days. Prices exclusive of applicable taxes.",
    }
)
print("  [OK] Template: " + tmpl.name)

# Quotations
quotation_configs = [
    {
        "customer": customer_profiles[0],
        "status": "ACCEPTED",
        "lines": [
            {"product": products[1], "variant": variants[2], "qty": 1, "price": Decimal("149.00")},
            {"product": products[4], "variant": None, "qty": 1, "price": Decimal("29.00")},
        ]
    },
    {
        "customer": customer_profiles[1],
        "status": "SENT",
        "lines": [
            {"product": products[0], "variant": variants[0], "qty": 1, "price": Decimal("49.00")},
        ]
    },
    {
        "customer": customer_profiles[2],
        "status": "DRAFT",
        "lines": [
            {"product": products[2], "variant": variants[4], "qty": 1, "price": Decimal("1999.00")},
            {"product": products[3], "variant": None, "qty": 1, "price": Decimal("99.00")},
        ]
    },
]

quotations = []
for qc in quotation_configs:
    q, created = Quotation.objects.get_or_create(
        customer=qc["customer"],
        status=qc["status"],
        defaults={
            "template": tmpl,
            "issue_date": today - timedelta(days=15),
            "expiry_date": today + timedelta(days=15),
            "notes": "Please review and confirm at your earliest convenience.",
            "terms": "Payment due within 30 days. Prices subject to applicable taxes.",
            "created_by": admin,
        }
    )
    if created:
        for line in qc["lines"]:
            QuotationLine.objects.create(
                quotation=q,
                product=line["product"],
                variant=line["variant"],
                quantity=line["qty"],
                unit_price=line["price"],
                description=line["product"].name,
            )
        q.recalculate_totals(save=True)
    quotations.append(q)
    print("  [OK] Quotation: " + q.quotation_number + " (" + q.status + ") for " + q.customer.company_name)

# ── 7. Subscriptions
subscription_configs = [
    {
        "customer": customer_profiles[0],
        "quotation": quotations[0],
        "status": "ACTIVE",
        "start": today - timedelta(days=60),
        "next_billing": today + timedelta(days=1),
        "lines": [
            {"product": products[1], "variant": variants[2], "plan": plans[2], "qty": 1, "price": Decimal("149.00")},
            {"product": products[4], "variant": None, "plan": plans[6], "qty": 1, "price": Decimal("29.00")},
        ]
    },
    {
        "customer": customer_profiles[1],
        "quotation": None,
        "status": "ACTIVE",
        "start": today - timedelta(days=45),
        "next_billing": today + timedelta(days=16),
        "lines": [
            {"product": products[0], "variant": variants[0], "plan": plans[0], "qty": 1, "price": Decimal("49.00")},
        ]
    },
    {
        "customer": customer_profiles[3],
        "quotation": None,
        "status": "ACTIVE",
        "start": today - timedelta(days=90),
        "next_billing": today - timedelta(days=1),
        "lines": [
            {"product": products[1], "variant": variants[3], "plan": plans[3], "qty": 1, "price": Decimal("399.00")},
        ]
    },
    {
        "customer": customer_profiles[4],
        "quotation": None,
        "status": "PAUSED",
        "start": today - timedelta(days=120),
        "next_billing": None,
        "lines": [
            {"product": products[2], "variant": variants[4], "plan": plans[4], "qty": 1, "price": Decimal("1999.00")},
        ]
    },
    {
        "customer": customer_profiles[2],
        "quotation": None,
        "status": "CLOSED",
        "start": today - timedelta(days=180),
        "next_billing": None,
        "lines": [
            {"product": products[0], "variant": variants[0], "plan": plans[0], "qty": 1, "price": Decimal("49.00")},
        ]
    },
]

subscriptions = []
for sc in subscription_configs:
    existing = Subscription.objects.filter(customer=sc["customer"], status=sc["status"]).first()
    if existing:
        subscriptions.append(existing)
        print("  [OK] Subscription: " + existing.subscription_number + " (" + existing.status + ") - already exists")
        continue

    sub = Subscription.objects.create(
        customer=sc["customer"],
        quotation=sc["quotation"],
        start_date=sc["start"],
        next_billing_date=sc["next_billing"],
        status=sc["status"],
        created_by=admin,
    )
    for line in sc["lines"]:
        SubscriptionLine.objects.create(
            subscription=sub,
            product=line["product"],
            variant=line["variant"],
            plan=line["plan"],
            quantity=line["qty"],
            unit_price=line["price"],
        )
    subscriptions.append(sub)
    print("  [OK] Subscription: " + sub.subscription_number + " (" + sub.status + ") for " + sub.customer.company_name)

# ── 8. Invoices & Payments
print("\n[7/8] Creating invoices and payments...")

invoice_configs = [
    {
        "customer": customer_profiles[0],
        "subscription": subscriptions[0],
        "issue_date": today - timedelta(days=60),
        "due_date": today - timedelta(days=30),
        "status": "PAID",
        "cycle_start": today - timedelta(days=60),
        "cycle_end": today - timedelta(days=30),
        "tax_rate": tax_rates[0],
        "discount": None,
        "lines": [
            {"product": products[1], "variant": variants[2], "plan": plans[2], "qty": 1, "price": Decimal("149.00"), "desc": "Professional Monthly - Month 1"},
            {"product": products[4], "variant": None, "plan": plans[6], "qty": 1, "price": Decimal("29.00"), "desc": "API Access - Month 1"},
        ],
        "payments": [{"amount": Decimal("193.62"), "method": "BANK_TRANSFER"}],
    },
    {
        "customer": customer_profiles[0],
        "subscription": subscriptions[0],
        "issue_date": today - timedelta(days=30),
        "due_date": today + timedelta(days=2),
        "status": "ISSUED",
        "cycle_start": today - timedelta(days=30),
        "cycle_end": today,
        "tax_rate": tax_rates[0],
        "discount": discounts[0],
        "lines": [
            {"product": products[1], "variant": variants[2], "plan": plans[2], "qty": 1, "price": Decimal("149.00"), "desc": "Professional Monthly - Month 2"},
            {"product": products[4], "variant": None, "plan": plans[6], "qty": 1, "price": Decimal("29.00"), "desc": "API Access - Month 2"},
        ],
        "payments": [],
    },
    {
        "customer": customer_profiles[1],
        "subscription": subscriptions[1],
        "issue_date": today - timedelta(days=45),
        "due_date": today - timedelta(days=15),
        "status": "PARTIALLY_PAID",
        "cycle_start": today - timedelta(days=45),
        "cycle_end": today - timedelta(days=15),
        "tax_rate": tax_rates[0],
        "discount": None,
        "lines": [
            {"product": products[0], "variant": variants[0], "plan": plans[0], "qty": 1, "price": Decimal("49.00"), "desc": "Starter Monthly"},
        ],
        "payments": [{"amount": Decimal("25.00"), "method": "CREDIT_CARD"}],
    },
    {
        "customer": customer_profiles[3],
        "subscription": subscriptions[2],
        "issue_date": today - timedelta(days=60),
        "due_date": today - timedelta(days=30),
        "status": "OVERDUE",
        "cycle_start": today - timedelta(days=60),
        "cycle_end": today - timedelta(days=30),
        "tax_rate": tax_rates[0],
        "discount": None,
        "lines": [
            {"product": products[1], "variant": variants[3], "plan": plans[3], "qty": 1, "price": Decimal("399.00"), "desc": "Professional Quarterly"},
        ],
        "payments": [],
    },
    {
        "customer": customer_profiles[2],
        "subscription": None,
        "issue_date": today,
        "due_date": today + timedelta(days=30),
        "status": "DRAFT",
        "cycle_start": None,
        "cycle_end": None,
        "tax_rate": tax_rates[1],
        "discount": discounts[2],
        "lines": [
            {"product": products[2], "variant": variants[4], "plan": plans[4], "qty": 1, "price": Decimal("1999.00"), "desc": "Enterprise Annual"},
        ],
        "payments": [],
    },
]

invoices = []
for ic in invoice_configs:
    existing = None
    if ic["subscription"] and ic["cycle_start"]:
        existing = Invoice.objects.filter(
            subscription=ic["subscription"],
            billing_cycle_start=ic["cycle_start"],
        ).exclude(status__in=["VOID", "CANCELLED"]).first()

    if existing:
        invoices.append(existing)
        print("  [OK] Invoice: " + existing.invoice_number + " (" + existing.status + ") - already exists")
        continue

    inv = Invoice.objects.create(
        customer=ic["customer"],
        subscription=ic["subscription"],
        issue_date=ic["issue_date"],
        due_date=ic["due_date"],
        status="DRAFT",
        billing_cycle_start=ic["cycle_start"],
        billing_cycle_end=ic["cycle_end"],
        tax_rate=ic["tax_rate"],
        discount=ic["discount"],
        notes="Invoice for " + ic["customer"].company_name,
        terms="Payment due within the stated period.",
        created_by=admin,
    )

    for line in ic["lines"]:
        InvoiceLine.objects.create(
            invoice=inv,
            product=line["product"],
            variant=line["variant"],
            plan=line["plan"],
            quantity=line["qty"],
            unit_price=line["price"],
            description=line["desc"],
        )

    inv.calculate_totals(save=True)

    total_paid = Decimal("0.00")
    for pay_data in ic["payments"]:
        Payment.objects.create(
            invoice=inv,
            customer=ic["customer"],
            amount=pay_data["amount"],
            payment_method=pay_data["method"],
            status="COMPLETED",
            paid_at=timezone.now() - timedelta(days=5),
            created_by=admin,
        )
        total_paid += pay_data["amount"]

    if total_paid > Decimal("0.00"):
        inv.amount_paid = total_paid.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        inv.amount_due = max(Decimal("0.00"), (inv.total_amount - inv.amount_paid).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

    inv.status = ic["status"]
    inv.save(update_fields=["status", "amount_paid", "amount_due", "updated_at"])

    invoices.append(inv)
    print("  [OK] Invoice: " + inv.invoice_number + " (" + inv.status + ") for " + inv.customer.company_name + " - Total: $" + str(inv.total_amount))

# ── 9. Activity Logs & Notifications
print("\n[8/8] Creating activity logs and notifications...")

log_actions = [
    ("USER_REGISTERED", customer_users[0], "New customer registered"),
    ("SUBSCRIPTION_ACTIVATED", admin, "Subscription activated for TechCorp"),
    ("INVOICE_ISSUED", admin, "Invoice issued to TechCorp"),
    ("PAYMENT_RECORDED", staff, "Payment recorded for Invoice"),
    ("DISCOUNT_APPLIED", staff, "Discount WELCOME20 applied"),
    ("SUBSCRIPTION_PAUSED", admin, "Subscription paused for GrowthCo"),
    ("RECURRING_INVOICE_GENERATED", admin, "Recurring billing run completed"),
    ("CSV_IMPORT_CUSTOMER", admin, "CSV import: 3 customers created"),
]

for action, actor, description in log_actions:
    if not ActivityLog.objects.filter(action=action).exists():
        ActivityLog.objects.create(
            actor=actor,
            action=action,
            object_type="System",
            object_id="0",
            object_repr=description,
            metadata={"detail": description},
        )
        print("  [OK] Log: " + action)

notif_data = [
    {
        "recipient": customer_users[0],
        "type": "INVOICE_ISSUED",
        "title": "Invoice Ready - Action Required",
        "message": "Your invoice for Professional Monthly subscription is ready.",
        "is_read": False,
    },
    {
        "recipient": customer_users[0],
        "type": "PAYMENT_RECEIVED",
        "title": "Payment Confirmed",
        "message": "Your payment has been successfully received and applied to your account.",
        "is_read": True,
    },
    {
        "recipient": customer_users[1],
        "type": "INVOICE_OVERDUE",
        "title": "Payment Overdue",
        "message": "Your invoice payment is overdue. Please make payment immediately to avoid service interruption.",
        "is_read": False,
    },
    {
        "recipient": customer_users[3],
        "type": "INVOICE_OVERDUE",
        "title": "Urgent: Invoice Overdue",
        "message": "Your subscription invoice is overdue. Please contact billing support.",
        "is_read": False,
    },
    {
        "recipient": customer_users[4],
        "type": "SUBSCRIPTION_PAUSED",
        "title": "Subscription Paused",
        "message": "Your Enterprise subscription has been paused. Contact us to resume.",
        "is_read": False,
    },
]

for nd in notif_data:
    if not Notification.objects.filter(recipient=nd["recipient"], notification_type=nd["type"]).exists():
        Notification.objects.create(
            recipient=nd["recipient"],
            notification_type=nd["type"],
            title=nd["title"],
            message=nd["message"],
            is_read=nd["is_read"],
        )
        print("  [OK] Notification: " + nd["type"] + " -> " + nd["recipient"].email)

# ── Summary
print("\n" + "="*60)
print("[DONE] SEED DATA CREATION COMPLETE!")
print("="*60)
print("  Users:          " + str(User.objects.count()) + " (1 admin, 1 staff, " + str(User.objects.filter(role="CUSTOMER").count()) + " customers)")
print("  Products:       " + str(Product.objects.count()))
print("  Variants:       " + str(ProductVariant.objects.count()))
print("  Plans:          " + str(SubscriptionPlan.objects.count()))
print("  Tax Rates:      " + str(TaxRate.objects.count()))
print("  Discounts:      " + str(Discount.objects.count()))
print("  Quotations:     " + str(Quotation.objects.count()))
print("  Subscriptions:  " + str(Subscription.objects.count()))
print("  Invoices:       " + str(Invoice.objects.count()))
print("  Payments:       " + str(Payment.objects.count()))
print("  Activity Logs:  " + str(ActivityLog.objects.count()))
print("  Notifications:  " + str(Notification.objects.count()))
print("\n[INFO] Demo Credentials:")
print("  Admin:    admin@brightloop.com / Admin@1234")
print("  Staff:    staff@brightloop.com / Staff@1234")
print("  Customer: alice@techcorp.com / Customer@1234")
print("  Customer: bob@innovate.io / Customer@1234")
print("  Customer: carol@startupxyz.com / Customer@1234")
print("="*60)
