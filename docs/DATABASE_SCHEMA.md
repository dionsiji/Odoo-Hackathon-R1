# Brightloop – Database Schema (Modules 1, 2 & 3 Complete)

> Generated: 2026-10-31  
> Database: SQLite (dev) — Django ORM models  
> Django apps: `accounts`, `customers`, `catalog`, `quotations`, `subscriptions`, `billing`, `core`

---

## 1. Table: `accounts_user`

Custom user model (`AUTH_USER_MODEL = "accounts.User"`). Uses **email** as the login identifier.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `email` | `VARCHAR(254)` | UNIQUE, NOT NULL, indexed | Login identifier |
| `password` | `VARCHAR(128)` | NOT NULL | PBKDF2 hash via `set_password()` |
| `first_name` | `VARCHAR(150)` | blank allowed | |
| `last_name` | `VARCHAR(150)` | blank allowed | |
| `role` | `VARCHAR(10)` | NOT NULL, default `CUSTOMER` | Choices: `ADMIN`, `STAFF`, `CUSTOMER` |
| `is_active` | `BOOLEAN` | NOT NULL, default `TRUE` | Soft-disable without deleting |
| `is_staff` | `BOOLEAN` | NOT NULL, default `FALSE` | Grants Django Admin access |
| `is_superuser` | `BOOLEAN` | NOT NULL, default `FALSE` | Grants all permissions |
| `date_joined` | `DATETIME` | NOT NULL, auto-set on create | |
| `last_login` | `DATETIME` | NULL | Updated by Django auth |

---

## 2. Table: `customers_customerprofile`

Extended profile linked 1-to-1 with `accounts_user`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `user_id` | `BIGINT` | FK → `accounts_user.id`, UNIQUE, CASCADE | OneToOne with User |
| `phone` | `VARCHAR(30)` | blank allowed | |
| `company_name` | `VARCHAR(255)` | blank allowed | |
| `address_line1` | `VARCHAR(255)` | blank allowed | |
| `address_line2` | `VARCHAR(255)` | blank allowed | |
| `city` | `VARCHAR(100)` | blank allowed | |
| `state` | `VARCHAR(100)` | blank allowed | |
| `postal_code` | `VARCHAR(20)` | blank allowed | |
| `country` | `VARCHAR(100)` | blank allowed | |
| `status` | `VARCHAR(10)` | NOT NULL, default `ACTIVE` | Choices: `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `created_at` | `DATETIME` | NOT NULL, auto-set on create | |
| `updated_at` | `DATETIME` | NOT NULL, auto-updated | |

---

## 3. Table: `catalog_product`

Base product record.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `description` | `TEXT` | blank allowed | |
| `sku` | `VARCHAR(100)` | UNIQUE, NOT NULL, indexed | Product SKU |
| `category` | `VARCHAR(100)` | blank allowed | |
| `is_active` | `BOOLEAN` | NOT NULL, default `TRUE` | Customers only see active |
| `created_at` | `DATETIME` | NOT NULL, auto-set on create | |
| `updated_at` | `DATETIME` | NOT NULL, auto-updated | |

---

## 4. Table: `catalog_productvariant`

Variants of a product (e.g., Tiers, Sizes, Editions).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `product_id` | `BIGINT` | FK → `catalog_product.id`, CASCADE | Parent product |
| `variant_name` | `VARCHAR(255)` | NOT NULL | |
| `sku` | `VARCHAR(100)` | UNIQUE, NOT NULL, indexed | Variant SKU |
| `description` | `TEXT` | blank allowed | |
| `price` | `DECIMAL(12, 2)` | NOT NULL, MinValue 0.00 | Decimal arithmetic |
| `is_active` | `BOOLEAN` | NOT NULL, default `TRUE` | |
| `created_at` | `DATETIME` | NOT NULL, auto-set on create | |
| `updated_at` | `DATETIME` | NOT NULL, auto-updated | |

---

## 5. Table: `catalog_subscriptionplan`

Subscription plans linked to products and optional variants.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `description` | `TEXT` | blank allowed | |
| `product_id` | `BIGINT` | FK → `catalog_product.id`, PROTECT | Parent product |
| `variant_id` | `BIGINT` | FK → `catalog_productvariant.id`, SET_NULL, NULL, blank | Optional variant |
| `price` | `DECIMAL(12, 2)` | NOT NULL, MinValue 0.00 | Plan price |
| `billing_interval` | `VARCHAR(20)` | NOT NULL, default `MONTHLY` | Choices: `MONTHLY`, `QUARTERLY`, `YEARLY` |
| `trial_period_days` | `POSITIVE INTEGER` | NULL, default 0 | Trial days |
| `is_active` | `BOOLEAN` | NOT NULL, default `TRUE` | |
| `created_at` | `DATETIME` | NOT NULL, auto-set on create | |
| `updated_at` | `DATETIME` | NOT NULL, auto-updated | |

---

## 6. Table: `quotations_quotationtemplate`

Predefined quotation terms and validity templates.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `description` | `TEXT` | blank allowed | |
| `default_validity_days` | `POSITIVE INTEGER` | NOT NULL, default 30 | Validity duration |
| `terms_and_conditions` | `TEXT` | blank allowed | |
| `is_active` | `BOOLEAN` | NOT NULL, default `TRUE` | |
| `created_at` | `DATETIME` | NOT NULL, auto-set on create | |
| `updated_at` | `DATETIME` | NOT NULL, auto-updated | |

---

## 7. Table: `quotations_quotation`

Sales quotations issued to customers.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `quotation_number` | `VARCHAR(64)` | UNIQUE, NOT NULL, indexed | Format: `QT-YYYYMMDD-XXXXXX` |
| `customer_id` | `BIGINT` | FK → `customers_customerprofile.id`, PROTECT | Associated customer |
| `template_id` | `BIGINT` | FK → `quotations_quotationtemplate.id`, SET_NULL, NULL, blank | Optional template |
| `issue_date` | `DATE` | NOT NULL, default `current_date` | |
| `expiry_date` | `DATE` | NOT NULL | Checked against current date |
| `status` | `VARCHAR(20)` | NOT NULL, default `DRAFT` | Choices: `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED` |
| `subtotal` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | Calculated server-side sum of line totals |
| `discount_amount` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | MinValue 0.00 |
| `tax_amount` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | MinValue 0.00 |
| `total_amount` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | Calculated: `subtotal - discount + tax` |
| `notes` | `TEXT` | blank allowed | |
| `terms` | `TEXT` | blank allowed | |
| `created_by_id` | `BIGINT` | FK → `accounts_user.id`, PROTECT | Staff/Admin user who created |
| `created_at` | `DATETIME` | NOT NULL, auto-set on create | |
| `updated_at` | `DATETIME` | NOT NULL, auto-updated | |

---

## 8. Table: `quotations_quotationline`

Items/lines associated with a quotation.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `quotation_id` | `BIGINT` | FK → `quotations_quotation.id`, CASCADE | Parent quotation |
| `product_id` | `BIGINT` | FK → `catalog_product.id`, PROTECT | Product |
| `variant_id` | `BIGINT` | FK → `catalog_productvariant.id`, PROTECT, NULL, blank | Optional product variant |
| `description` | `TEXT` | blank allowed | Historical description snapshot |
| `quantity` | `POSITIVE INTEGER` | NOT NULL, default 1, MinValue 1 | |
| `unit_price` | `DECIMAL(12, 2)` | NOT NULL, MinValue 0.00 | Historical price snapshot |
| `line_total` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | Server-calculated: `quantity * unit_price` |

---

## 9. Table: `subscriptions_subscription`

Customer subscription records.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `subscription_number` | `VARCHAR(64)` | UNIQUE, NOT NULL, indexed | Format: `SUB-YYYYMMDD-XXXXXX` |
| `customer_id` | `BIGINT` | FK → `customers_customerprofile.id`, PROTECT | Subscribed customer |
| `quotation_id` | `BIGINT` | OneToOne → `quotations_quotation.id`, SET_NULL, NULL, blank, UNIQUE | Source quotation (prevents duplicate subscriptions) |
| `start_date` | `DATE` | NOT NULL, default `current_date` | |
| `end_date` | `DATE` | NULL, blank allowed | Populated on term end or close |
| `next_billing_date` | `DATE` | NULL, blank allowed | Populated based on interval |
| `status` | `VARCHAR(20)` | NOT NULL, default `DRAFT` | Choices: `DRAFT`, `ACTIVE`, `PAUSED`, `CLOSED` |
| `created_by_id` | `BIGINT` | FK → `accounts_user.id`, PROTECT | |
| `created_at` | `DATETIME` | NOT NULL, auto-set on create | |
| `updated_at` | `DATETIME` | NOT NULL, auto-updated | |

---

## 10. Table: `subscriptions_subscriptionline`

Items/recurring lines in a subscription.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `subscription_id` | `BIGINT` | FK → `subscriptions_subscription.id`, CASCADE | Parent subscription |
| `product_id` | `BIGINT` | FK → `catalog_product.id`, PROTECT | Product |
| `variant_id` | `BIGINT` | FK → `catalog_productvariant.id`, PROTECT, NULL, blank | Optional variant |
| `plan_id` | `BIGINT` | FK → `catalog_subscriptionplan.id`, PROTECT, NULL, blank | Linked recurring plan |
| `quantity` | `POSITIVE INTEGER` | NOT NULL, default 1, MinValue 1 | |
| `unit_price` | `DECIMAL(12, 2)` | NOT NULL, MinValue 0.00 | Historical agreed price snapshot |
| `line_total` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | Server-calculated: `quantity * unit_price` |

---

## 11. Table: `billing_taxrate`

Tax rate configuration (e.g. VAT 10%, GST 18%).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `name` | `VARCHAR(100)` | NOT NULL | Tax label (e.g. "VAT 10%") |
| `code` | `VARCHAR(32)` | UNIQUE, NOT NULL, indexed | Identifier (e.g. "VAT10") |
| `rate` | `DECIMAL(5, 2)` | NOT NULL, 0.00 to 100.00 | Percentage rate |
| `description` | `TEXT` | blank allowed | |
| `is_active` | `BOOLEAN` | NOT NULL, default `TRUE` | |
| `created_at` | `DATETIME` | NOT NULL, auto-set on create | |
| `updated_at` | `DATETIME` | NOT NULL, auto-updated | |

---

## 12. Table: `billing_discount`

Promotional discount and coupon codes (percentage or fixed amount).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `code` | `VARCHAR(32)` | UNIQUE, NOT NULL, indexed | Discount coupon code |
| `description` | `TEXT` | blank allowed | |
| `discount_type` | `VARCHAR(20)` | NOT NULL, default `PERCENTAGE` | Choices: `PERCENTAGE`, `FIXED_AMOUNT` |
| `amount` | `DECIMAL(12, 2)` | NOT NULL, MinValue 0.00 | Percentage (0-100) or flat dollar amount |
| `min_order_amount` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | Minimum order subtotal required |
| `is_active` | `BOOLEAN` | NOT NULL, default `TRUE` | |
| `valid_from` | `DATE` | NULL, blank allowed | Effective start date |
| `valid_to` | `DATE` | NULL, blank allowed | Expiration date |
| `usage_limit` | `POSITIVE INTEGER` | NULL, blank allowed | Max redemptions allowed |
| `times_used` | `POSITIVE INTEGER` | NOT NULL, default 0 | Counter |
| `created_at` | `DATETIME` | NOT NULL, auto-set on create | |
| `updated_at` | `DATETIME` | NOT NULL, auto-updated | |

---

## 13. Table: `billing_invoice`

Core invoice record for one-off conversions and subscription billing.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `invoice_number` | `VARCHAR(64)` | UNIQUE, NOT NULL, indexed | Format: `INV-YYYYMMDD-XXXXXX` |
| `customer_id` | `BIGINT` | FK → `customers_customerprofile.id`, PROTECT | Billed customer |
| `subscription_id` | `BIGINT` | FK → `subscriptions_subscription.id`, SET_NULL, NULL, blank | Recurring subscription link |
| `quotation_id` | `BIGINT` | FK → `quotations_quotation.id`, SET_NULL, NULL, blank | Converted quotation link |
| `issue_date` | `DATE` | NOT NULL, default `current_date` | |
| `due_date` | `DATE` | NOT NULL | Payment deadline |
| `status` | `VARCHAR(20)` | NOT NULL, default `DRAFT`, indexed | Choices: `DRAFT`, `ISSUED`, `PAID`, `PARTIALLY_PAID`, `OVERDUE`, `VOID`, `CANCELLED` |
| `subtotal` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | Server-calculated sum of lines |
| `discount_id` | `BIGINT` | FK → `billing_discount.id`, SET_NULL, NULL, blank | Applied coupon |
| `discount_amount` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | Server-calculated discount total |
| `tax_rate_id` | `BIGINT` | FK → `billing_taxrate.id`, SET_NULL, NULL, blank | Applied tax rate |
| `tax_amount` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | Server-calculated tax total |
| `total_amount` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | Server-calculated final total |
| `amount_paid` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | Sum of recorded payments |
| `amount_due` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | `total_amount - amount_paid` |
| `billing_cycle_start` | `DATE` | NULL, blank allowed | Start of recurring service period |
| `billing_cycle_end` | `DATE` | NULL, blank allowed | End of recurring service period |
| `notes` | `TEXT` | blank allowed | |
| `terms` | `TEXT` | blank allowed | |
| `created_by_id` | `BIGINT` | FK → `accounts_user.id`, PROTECT | |
| `created_at` | `DATETIME` | NOT NULL, auto-set on create | |
| `updated_at` | `DATETIME` | NOT NULL, auto-updated | |

---

## 14. Table: `billing_invoiceline`

Line items on an invoice preserving immutable price and description snapshots.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `invoice_id` | `BIGINT` | FK → `billing_invoice.id`, CASCADE | Parent invoice |
| `product_id` | `BIGINT` | FK → `catalog_product.id`, PROTECT | Product reference |
| `variant_id` | `BIGINT` | FK → `catalog_productvariant.id`, PROTECT, NULL, blank | Optional variant reference |
| `plan_id` | `BIGINT` | FK → `catalog_subscriptionplan.id`, PROTECT, NULL, blank | Linked subscription plan reference |
| `description` | `VARCHAR(255)` | blank allowed | Item description snapshot |
| `quantity` | `POSITIVE INTEGER` | NOT NULL, default 1, MinValue 1 | |
| `unit_price` | `DECIMAL(12, 2)` | NOT NULL, MinValue 0.00 | Locked historical unit price snapshot |
| `line_total` | `DECIMAL(12, 2)` | NOT NULL, default 0.00 | Server-calculated: `quantity * unit_price` |

---

## 15. Table: `billing_payment`

Payment transaction records against invoices.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `transaction_ref` | `VARCHAR(64)` | UNIQUE, NOT NULL, indexed | Format: `PAY-YYYYMMDD-XXXXXX` |
| `invoice_id` | `BIGINT` | FK → `billing_invoice.id`, PROTECT | Associated invoice |
| `customer_id` | `BIGINT` | FK → `customers_customerprofile.id`, PROTECT | Paying customer |
| `amount` | `DECIMAL(12, 2)` | NOT NULL, MinValue 0.01 | Payment amount |
| `payment_method` | `VARCHAR(20)` | NOT NULL, default `MANUAL` | Choices: `MANUAL`, `BANK_TRANSFER`, `CREDIT_CARD`, `CASH`, `MOCK_GATEWAY` |
| `status` | `VARCHAR(20)` | NOT NULL, default `COMPLETED`, indexed | Choices: `COMPLETED`, `PENDING`, `FAILED`, `REFUNDED` |
| `notes` | `TEXT` | blank allowed | Reference notes / refund reasons |
| `paid_at` | `DATETIME` | NOT NULL, default `now` | Transaction timestamp |
| `created_by_id` | `BIGINT` | FK → `accounts_user.id`, PROTECT | Staff/admin who recorded payment |
| `created_at` | `DATETIME` | NOT NULL, auto-set on create | |
| `updated_at` | `DATETIME` | NOT NULL, auto-updated | |

---

## 16. Table: `core_activitylog`

Audit logging and activity trail for security, compliance, and debugging.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `actor_id` | `BIGINT` | FK → `accounts_user.id`, SET_NULL, NULL, blank | Performing user or System |
| `action` | `VARCHAR(100)` | NOT NULL, indexed | Action key (e.g. `PAYMENT_RECORDED`, `INVOICE_ISSUED`) |
| `object_type` | `VARCHAR(50)` | NOT NULL, indexed | Model class name |
| `object_id` | `VARCHAR(64)` | blank allowed, indexed | Target object primary key |
| `object_repr` | `VARCHAR(255)` | blank allowed | Human-friendly snapshot representation |
| `metadata` | `JSON` | default `{}` | Structured event details |
| `created_at` | `DATETIME` | NOT NULL, default `now`, indexed | Event timestamp |

---

## 17. Table: `core_notification`

In-app notifications for customer users and staff.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `BIGINT` | PK, auto-increment | |
| `recipient_id` | `BIGINT` | FK → `accounts_user.id`, CASCADE | Target user |
| `notification_type` | `VARCHAR(50)` | NOT NULL, indexed | Event category (e.g. `PAYMENT_RECEIVED`, `SUBSCRIPTION_RENEWED`) |
| `title` | `VARCHAR(255)` | NOT NULL | Short notification headline |
| `message` | `TEXT` | NOT NULL | Body text |
| `is_read` | `BOOLEAN` | NOT NULL, default `FALSE`, indexed | Read receipt |
| `object_type` | `VARCHAR(50)` | blank allowed | Related model name |
| `object_id` | `VARCHAR(64)` | blank allowed | Related object ID |
| `created_at` | `DATETIME` | NOT NULL, default `now`, indexed | Timestamp |
- **Foreign Keys**: Invoices can reference `subscriptions_subscription.id` and/or `customers_customerprofile.id`.
- **Financial Precision**: All amounts (`subtotal`, `tax_amount`, `discount_amount`, `total_amount`, `unit_price`, `line_total`) are stored as standard `DecimalField(max_digits=12, decimal_places=2)`. Never use floating-point types.
- **Source Quotation Link**: `Subscription.quotation` is a unique `OneToOneField`, ensuring an accepted quotation is never converted into multiple subscriptions.
