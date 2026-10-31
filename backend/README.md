# Brightloop Backend – Setup Guide

## Prerequisites
- Python 3.10+
- pip

## Installation

```bash
# 1. Clone the repo and enter the backend directory
cd backend

# 2. (Recommended) Create and activate a virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create your .env file from the example
copy .env.example .env      # Windows
# cp .env.example .env      # macOS/Linux

# Edit .env and set a strong SECRET_KEY before deploying to production.

# 5. Run database migrations
python manage.py migrate

# 6. (Optional) Create a superuser for Django Admin
python manage.py createsuperuser

# 7. Start the development server
python manage.py runserver
```

The API will be available at: http://127.0.0.1:8000/api/v1/

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | *(required)* | Django secret key |
| `DEBUG` | `True` | Enable debug mode |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated list |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,...` | Comma-separated origins |
| `ACCESS_TOKEN_LIFETIME_MINUTES` | `60` | JWT access token TTL |
| `REFRESH_TOKEN_LIFETIME_DAYS` | `7` | JWT refresh token TTL |

## Running Checks

```bash
python manage.py check          # Django system check
python manage.py migrate        # Apply migrations
python manage.py showmigrations # View migration status
```

## Django Admin

Navigate to http://127.0.0.1:8000/admin/ and log in with your superuser credentials.
