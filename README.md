# Finance Fusion

A full-stack personal finance tracker with transaction logging, category budgets, and a dashboard with spending breakdowns.

## Stack

- **Backend:** FastAPI, SQLAlchemy, SQLite, JWT auth (python-jose + passlib/bcrypt)
- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Axios

## Features

- Email/password signup and login (JWT bearer tokens)
- Forgot password flow via emailed OTP (Brevo), with resend
- Per-user transactions (add, edit, delete) with categories and expense/income tracking
- Category-level budgets
- Dashboard with pie/bar charts of spending

## Project structure

```
finance tracker/
├── .github/workflows/
│   └── keep-alive.yml           # pings backend to prevent Render free-tier sleep
├── render.yaml                  # Render blueprint (backend + frontend)
├── backend/
│   └── app/
│       ├── api/v1/endpoints/   # auth, transactions, budgets routes
│       ├── core/                # config, security (JWT, hashing), email (Brevo)
│       ├── models/              # SQLAlchemy models
│       ├── schemas/             # Pydantic schemas
│       └── database.py
└── frontend/
└── src/
├── features/             # auth, dashboard, accounts, budget, landing, rapid-log
├── components/ui/
└── services/api.js
```

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

Create `backend/.env` from the example and set a real secret:

```bash
copy env.example .env #change secret key according to your choice
```

Run the API:

```bash
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

### Frontend

```bash
cd frontend
npm install
copy env.example .env
npm run dev
```

App: http://localhost:5173

## Environment variables

**backend/.env**
| Variable | Description |
|---|---|
| `SECRET_KEY` | Random secret used to sign JWTs — required, no default |
| `DATABASE_URL` | SQLAlchemy connection string (defaults to local SQLite) |
| `OTP_EXPIRE_MINUTES` | Minutes before a password-reset OTP expires (default: 10) |
| `MAX_OTP_ATTEMPTS` | Max attempts allowed per OTP (default: 5) |
| `BREVO_API_KEY` | API key from Brevo, used to send OTP emails |
| `BREVO_SENDER_EMAIL` | "From" address for OTP emails — must be a verified sender in Brevo |
| `BREVO_SENDER_NAME` | "From" display name for OTP emails |
| `FRONTEND_ORIGIN` | Comma-separated deployed frontend URL(s), added to CORS allow-list |

**frontend/.env**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

## Deployment (Render)

This repo includes a `render.yaml` blueprint that deploys both services at once:

1. Push the repo to GitHub.
2. In Render: **New → Blueprint**, point it at the repo.
3. Render provisions two services from `render.yaml`:
   - `financefusion-backend` — FastAPI web service
   - `financefusion-frontend` — static site (Vite build)
4. Fill in the secret env vars Render prompts for (`SECRET_KEY`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `FRONTEND_ORIGIN`, `VITE_API_URL`).
5. Set `FRONTEND_ORIGIN` on the backend to the frontend's `.onrender.com` URL, and `VITE_API_URL` on the frontend to the backend's URL, once both are live.

**Keeping the backend awake:** Render's free tier spins a service down after ~15 minutes of no traffic, causing a slow first request. `.github/workflows/keep-alive.yml` pings the backend's `/` endpoint every 10 minutes via GitHub Actions to prevent this. Add a `BACKEND_URL` secret (your backend's Render URL) under the repo's **Settings → Secrets and variables → Actions**.

## Known limitations

- JWT is stored in `localStorage`, which is readable by any script running on the page (XSS risk). A production version should move to httpOnly cookies.
- No rate limiting on login/signup — recommended before deploying publicly.
- SQLite is fine for local dev, but **not safe on Render's free tier in production** — its filesystem is ephemeral, so the database resets on every redeploy/restart. Use Render's free Postgres, a persistent disk, or migrate to a managed DB (Firebase, etc.) before relying on this in production.
- Firebase (DB + auth) migration is planned but not yet implemented.

## Author

Sanjoy Ostad