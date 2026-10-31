# Brightloop — Full-Stack Subscription Management System

A complete subscription business management platform built for the Odoo Hackathon by **Team Brightloop**.

## Team

| Developer | Role |
|---|---|
| Dion | Technical Lead & Backend Architect |
| Devika | Frontend Lead (Admin & Staff UI) |
| Novelia | Frontend Developer (Customer Portal & Billing UI) |
| Viswas | Backend Engineer & Integration Lead |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Python + Django 5.2 + Django REST Framework |
| Database | SQLite + Django ORM |
| Authentication | JWT (SimpleJWT) |
| Charts | Recharts |
| PDF Generation | ReportLab |

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env          # Windows
# cp .env.example .env          # macOS/Linux

# Apply database migrations
python manage.py migrate

# Load seed/demo data
python seed_data.py

# Start the backend server
python manage.py runserver 8000
```

Backend API base URL: `http://127.0.0.1:8000/api/v1/`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Frontend URL: `http://localhost:5173`

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@brightloop.com | Admin@1234 |
| Staff | staff@brightloop.com | Staff@1234 |
| Customer | alice@techcorp.com | Customer@1234 |
| Customer | bob@innovate.io | Customer@1234 |
| Customer | carol@startupxyz.com | Customer@1234 |

---

## Features

### Core Subscription Management
- Product and product variant management
- Subscription plans (Monthly, Quarterly, Yearly)
- Quotation lifecycle (Draft → Sent → Accepted → Rejected/Expired)
- Subscription lifecycle (Draft → Active → Paused → Closed)
- Quotation-to-subscription conversion

### Billing & Financial Engine
- Automated recurring invoice generation
- Invoice lifecycle (Draft → Issued → Paid / Partially Paid / Overdue → Void / Cancelled)
- Configurable tax rates
- Flexible discount engine (percentage and fixed amount)
- Payment recording with partial payment support
- Payment refunds with invoice balance reversal
- Invoice PDF generation (ReportLab)
- Duplicate billing prevention (database-level constraints)

### Analytics & Reporting
- Overview dashboard: active subscriptions, MRR, ARR, revenue
- Revenue breakdown by payment method and date range
- Outstanding receivables and overdue tracking

### Administration
- Role-based access control (Admin, Staff, Customer)
- Global search across customers, products, plans, quotations, subscriptions and invoices
- Activity logs for all important operations
- Customer and product CSV import
- CSV export for customers, products, invoices and payments
- In-app notification system

### Customer Portal
- Self-service dashboard
- View and manage own subscriptions and invoices
- Download invoice PDFs
- Payment history
- Notification centre

---

## API Reference

All endpoints are under `/api/v1/`. See `docs/API_CONTRACT.md` for the complete specification.

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login/` | Obtain JWT tokens |
| POST | `/auth/register/` | Register new user |
| GET | `/auth/me/` | Current user profile |
| GET | `/analytics/overview/` | Business KPI dashboard |
| GET | `/invoices/` | List invoices |
| POST | `/billing/run/` | Run recurring billing |
| GET | `/search/?q=query` | Global search |

---

## Architecture

```
brightloop/
├── backend/
│   ├── accounts/       # Custom User model, JWT auth
│   ├── customers/      # CustomerProfile management
│   ├── catalog/        # Products, Variants, Plans
│   ├── quotations/     # Quotation Templates & Lifecycle
│   ├── subscriptions/  # Subscription Lifecycle
│   ├── billing/        # Invoices, Payments, Tax, Discounts
│   ├── core/           # Activity Logs, Notifications
│   └── brightloop/     # Django config, URL routing
├── frontend/
│   ├── src/pages/admin/    # Admin & Staff UI
│   └── src/pages/customer/ # Customer Portal
└── docs/
    ├── API_CONTRACT.md
    └── DATABASE_SCHEMA.md
```
