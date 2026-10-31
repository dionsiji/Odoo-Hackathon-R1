# Brightloop – API Contract (Modules 1 & 2)

> Base URL: `http://localhost:8000`  
> API prefix: `/api/v1/`  
> Authentication: JWT Bearer token (`Authorization: Bearer <access_token>`)  
> Content-Type: `application/json`

---

## 1. Authentication & Accounts

### `POST /api/v1/auth/register/`
Create a new user account.
- **Auth required:** No
- **Permissions:** Unauthenticated registrants default to role `CUSTOMER`. Supplying `ADMIN` or `STAFF` requires an authenticated `ADMIN`.

### `POST /api/v1/auth/login/`
Obtain a JWT access and refresh token pair. Includes `role`, `email`, and `full_name` claims in the token.

### `POST /api/v1/auth/token/refresh/`
Exchange a refresh token for a new access token (with token rotation enabled).

### `GET /api/v1/auth/me/`
Retrieve the authenticated user's own account.

### `PATCH /api/v1/auth/me/`
Update first name or last name. Role, email, and staff/superuser flags are read-only.

---

## 2. Health Check

### `GET /api/v1/health/`
Confirm API status (`{"status": "ok", "version": "v1"}`). No auth required.

---

## 3. Customer Profiles

### `GET /api/v1/customers/`
- **Auth required:** Yes (ADMIN / STAFF only)
- **Response:** List of all customer profile records.

### `POST /api/v1/customers/`
- **Auth required:** Yes (ADMIN / STAFF only)
- **Request body:** `{"user_id": <id>, "company_name": "...", ...}`

### `GET /api/v1/customers/me/`
- **Auth required:** Yes (any authenticated user)
- **Response:** The customer profile associated with `request.user`.

### `PATCH /api/v1/customers/me/`
- **Auth required:** Yes (any authenticated user)
- **Response:** Updated profile fields (company_name, phone, address, etc.).

### `GET /api/v1/customers/<id>/`
- **Auth required:** Yes
- **Access:** Admin/Staff see all; Customer sees only their own profile (other IDs return `404`).

### `PATCH /api/v1/customers/<id>/`
- **Auth required:** Yes
- **Access:** Admin/Staff or profile owner.

### `DELETE /api/v1/customers/<id>/`
- **Auth required:** Yes (ADMIN only)

---

## 4. Catalog

### `GET /api/v1/products/`
List products.
- **Auth:** Any authenticated user.
- **Filter:** Customers only receive `is_active=True` products. Admin/Staff receive all products.

### `POST /api/v1/products/`
Create a product.
- **Auth:** ADMIN / STAFF only.
- **Request:**
```json
{
  "name": "Cloud Storage",
  "description": "Enterprise cloud storage",
  "sku": "PROD-CS-001",
  "category": "Infrastructure",
  "is_active": true
}
```

### `GET /api/v1/products/<id>/`
Retrieve a single product by ID (includes nested `variants`).

### `PUT / PATCH / DELETE /api/v1/products/<id>/`
Update or delete a product.
- **Auth:** ADMIN / STAFF only.

### `GET /api/v1/products/<id>/variants/`
List variants for a specific product.
- **Filter:** Active variants only for customers; all variants for Admin/Staff.

### `POST /api/v1/products/<id>/variants/`
Create a variant for product `<id>`.
- **Auth:** ADMIN / STAFF only.
- **Request:**
```json
{
  "variant_name": "1TB Tier",
  "sku": "VAR-CS-1TB",
  "description": "1 Terabyte storage tier",
  "price": "49.99",
  "is_active": true
}
```

### `GET /api/v1/plans/`
List subscription plans.
- **Filter:** Customers only receive active plans belonging to active products.

### `POST /api/v1/plans/`
Create a subscription plan.
- **Auth:** ADMIN / STAFF only.
- **Request:**
```json
{
  "name": "Storage Pro Monthly",
  "description": "Monthly recurring plan",
  "product": 1,
  "variant": 2,
  "price": "45.00",
  "billing_interval": "MONTHLY",
  "trial_period_days": 14,
  "is_active": true
}
```
> Billing interval choices: `MONTHLY`, `QUARTERLY`, `YEARLY`.

### `GET /api/v1/plans/<id>/`
Retrieve subscription plan details.

### `PUT / PATCH / DELETE /api/v1/plans/<id>/`
Update or delete subscription plan (ADMIN / STAFF only).

---

## 5. Quotations

### `GET /api/v1/quotation-templates/`
List quotation templates.
- **Auth:** ADMIN / STAFF only.

### `POST /api/v1/quotation-templates/`
Create quotation template.
- **Auth:** ADMIN / STAFF only.
- **Request:**
```json
{
  "name": "Standard B2B Template",
  "description": "Default net 30 quotation template",
  "default_validity_days": 30,
  "terms_and_conditions": "Payment due within 30 days of invoice.",
  "is_active": true
}
```

### `GET / PUT / PATCH / DELETE /api/v1/quotation-templates/<id>/`
Manage template details (ADMIN / STAFF only).

### `GET /api/v1/quotations/`
List quotations.
- **Customers:** Filtered to quotations matching their `CustomerProfile`.
- **Admin/Staff:** See all quotations across all customers.
- **Auto-expiry:** Quotations past their `expiry_date` are updated to `EXPIRED`.

### `POST /api/v1/quotations/`
Create a new quotation.
- **Auth:** ADMIN / STAFF only.
- **Request:**
```json
{
  "customer": 1,
  "template": 1,
  "issue_date": "2026-10-31",
  "expiry_date": "2026-11-30",
  "discount_amount": "50.00",
  "tax_amount": "25.00",
  "notes": "Custom discount applied",
  "terms": "Net 30 terms apply",
  "lines": [
    {
      "product": 1,
      "variant": 2,
      "description": "Snapshot description",
      "quantity": 5,
      "unit_price": "100.00"
    }
  ]
}
```
> Server-side calculates:
> - `line_total = quantity * unit_price`
> - `subtotal = sum(line_totals)`
> - `total_amount = subtotal - discount_amount + tax_amount`
> Frontend-supplied totals are discarded/ignored.

### `GET /api/v1/quotations/<id>/`
Retrieve quotation. Accessible to owner Customer or Admin/Staff.

### `PUT / PATCH / DELETE /api/v1/quotations/<id>/`
Update/Delete quotation.
- **Auth:** ADMIN / STAFF only.
- **Validation:** Edits to quotation lines, pricing, or terms are strictly allowed only while status is `DRAFT`. Once SENT, ACCEPTED, REJECTED, or EXPIRED, modifications return HTTP 400.

### Quotation Workflow Actions

> **Note on Expiry Mechanism**: Quotation expiry evaluation is **lazy and on-demand** (no background cron/scheduler). Expiration is evaluated whenever a quotation is listed, retrieved, sent, accepted, or rejected via `check_expiration()`. If `expiry_date < today` and status is `DRAFT` or `SENT`, status immediately transitions to `EXPIRED` in the database, preventing any subsequent acceptance or modification.

#### `POST /api/v1/quotations/<id>/send/`
- **Auth:** ADMIN / STAFF only.
- **Validation:** Allowed only if status is `DRAFT` and not expired. Transitions status to `SENT`.

#### `POST /api/v1/quotations/<id>/accept/`
- **Auth:** Owner Customer, or Admin/Staff.
- **Validation:** Allowed only if status is `SENT` and not expired. Transitions status to `ACCEPTED`.

#### `POST /api/v1/quotations/<id>/reject/`
- **Auth:** Owner Customer, or Admin/Staff.
- **Validation:** Allowed only if status is `SENT` and not expired. Transitions status to `REJECTED`.

---

## 6. Subscriptions

### `GET /api/v1/subscriptions/`
List subscriptions.
- **Customers:** Filtered strictly to their own subscriptions.
- **Admin/Staff:** Retrieve all customer subscriptions.

### `POST /api/v1/subscriptions/`
Create a subscription.
- **Auth:** ADMIN / STAFF only.
- **Creating from an accepted quotation:**
```json
{
  "customer": 1,
  "quotation": 4,
  "start_date": "2026-11-01"
}
```
> If `quotation` is provided:
> 1. Quotation status must be `ACCEPTED`.
> 2. `Subscription.quotation` is unique (prevents duplicate subscriptions from same quote).
> 3. Lines are automatically copied from the quotation snapshot into `SubscriptionLine`.

- **Creating standalone (without quotation):**
```json
{
  "customer": 1,
  "start_date": "2026-11-01",
  "lines": [
    {
      "product": 1,
      "variant": 2,
      "plan": 1,
      "quantity": 2,
      "unit_price": "75.00"
    }
  ]
}
```

### `GET /api/v1/subscriptions/<id>/`
Retrieve subscription with nested subscription lines. Accessible to owner Customer or Admin/Staff.

### `PUT / PATCH / DELETE /api/v1/subscriptions/<id>/`
- **Auth:** ADMIN / STAFF only.
- **Validation:** In non-DRAFT statuses, only non-destructive fields (`end_date`, `next_billing_date`) can be updated. Deleting is allowed only for `DRAFT` subscriptions.

### Subscription Lifecycle Actions
*All lifecycle transitions are validated server-side and restricted to ADMIN / STAFF.*

#### `POST /api/v1/subscriptions/<id>/activate/`
- **Valid from:** `DRAFT`
- **Result:** Status becomes `ACTIVE`. Calculates and sets `next_billing_date` according to plan interval (Monthly, Quarterly, or Yearly).

#### `POST /api/v1/subscriptions/<id>/pause/`
- **Valid from:** `ACTIVE`
- **Result:** Status becomes `PAUSED`.

#### `POST /api/v1/subscriptions/<id>/resume/`
- **Valid from:** `PAUSED`
- **Result:** Status returns to `ACTIVE`. Automatically rolls forward overdue `next_billing_date`.

#### `POST /api/v1/subscriptions/<id>/renew/`
- **Valid from:** `ACTIVE`
- **Result:** Advances `next_billing_date` by the billing interval.

#### `POST /api/v1/subscriptions/<id>/close/`
- **Valid from:** `DRAFT`, `ACTIVE`, or `PAUSED`
- **Result:** Status becomes `CLOSED`. Sets `end_date` to today if not previously defined.

---

## 7. Lifecycle State Machine Summary

### Quotation Lifecycle
```
[DRAFT] ────(send)────► [SENT] ────(accept)────► [ACCEPTED] ────► (Convert to Subscription)
   │                       │
   │ (expiry check)        ├────(reject)────► [REJECTED]
   ▼                       │
[EXPIRED] ◄────────────────┘ (expiry check)
```

### Subscription Lifecycle
```
[DRAFT] ────(activate)────► [ACTIVE] ◄───(resume)───┐
   │                            │                   │
   │                            ├─────(pause)────► [PAUSED]
   │                            │                   │
   │                            ├─────(renew)───────┤
   │                            │ (advances billing)│
   ▼                            ▼                   ▼
[CLOSED] ◄───────────────────[CLOSED] ◄──────────[CLOSED]
```
