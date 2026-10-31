# Brightloop – Database Schema (Module 1 & 2)

> Generated: 2026-10-31  
> Database: SQLite (dev) — Django ORM models  
> Django apps: `accounts`, `customers`, `catalog`, `quotations`, `subscriptions`

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

## Information for Viswas (Module 3 — Billing, Payments & Invoices)
- **Foreign Keys**: Invoices can reference `subscriptions_subscription.id` and/or `customers_customerprofile.id`.
- **Financial Precision**: All amounts (`subtotal`, `tax_amount`, `discount_amount`, `total_amount`, `unit_price`, `line_total`) are stored as standard `DecimalField(max_digits=12, decimal_places=2)`. Never use floating-point types.
- **Source Quotation Link**: `Subscription.quotation` is a unique `OneToOneField`, ensuring an accepted quotation is never converted into multiple subscriptions.
