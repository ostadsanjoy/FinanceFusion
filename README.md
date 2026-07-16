# Finance Fusion

A full-stack personal finance tracker with transaction logging, category budgets, and a dashboard with spending breakdowns.
### Live Website: https://financefusion-frontend.onrender.com

## Stack

- **Backend:** FastAPI, Firebase Admin SDK (Firestore + Auth token verification)
- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Axios, Firebase Auth SDK

## Features

- Email/password signup and login, and Google sign-in — via Firebase Authentication
- Forgot password via Firebase's built-in reset-link email (no custom OTP code, no email deliverability setup needed)
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
│       ├── core/                # config
│       ├── schemas/             # Pydantic schemas
│       └── database.py          # Firebase/Firestore client init
└── frontend/
└── src/
├── features/             # auth, dashboard, accounts, budget, landing, rapid-log
├── components/ui/
└── services/api.js
```

## Setup

### Backend

**1. Create a Firebase project & get credentials:**

- Go to [Firebase Console](https://console.firebase.google.com) → create a project (or use an existing one).
- Enable **Firestore Database** (Build → Firestore Database → Create database — start in production mode).
- Enable **Authentication** (Build → Authentication → Get started):
  - Under **Sign-in method**, enable **Email/Password**.
  - Also enable **Google** as a sign-in provider — you'll need to set a support email when prompted.
- Go to **Project Settings → Service accounts → Generate new private key**. This downloads a JSON file — keep it secret, never commit it.
- Paste the entire contents of that JSON file as a single line into `FIREBASE_SERVICE_ACCOUNT_JSON` in `backend/.env` (see below).

**2. Install and run:**

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

Create `backend/.env` from the example:

```bash
copy env.example .env
```

Run the API:

```bash
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

### Frontend

**1. Get your Firebase web app config:**

- In Firebase Console → **Project Settings → General → Your apps**, click **Add app → Web** (if you haven't already).
- Copy the `firebaseConfig` values shown (`apiKey`, `authDomain`, `projectId`, etc.) into `frontend/.env` (see below). These are public/client-side values — safe to ship in the built app, unlike the backend's service account JSON.
- If using Google sign-in locally, add `localhost` to **Authentication → Settings → Authorized domains** (it's usually there by default).

**2. Install and run:**

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
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full Firebase service account JSON key, as a single-line string — required, no default. Used for both Firestore and verifying frontend ID tokens |
| `FRONTEND_ORIGIN` | Comma-separated deployed frontend URL(s), added to CORS allow-list |

**frontend/.env**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |
| `VITE_FIREBASE_API_KEY` | From Firebase web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | From Firebase web app config |
| `VITE_FIREBASE_PROJECT_ID` | From Firebase web app config |
| `VITE_FIREBASE_STORAGE_BUCKET` | From Firebase web app config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase web app config |
| `VITE_FIREBASE_APP_ID` | From Firebase web app config |

## Deployment (Render)

This repo includes a `render.yaml` blueprint that deploys both services at once:

1. Push the repo to GitHub.
2. In Render: **New → Blueprint**, point it at the repo.
3. Render provisions two services from `render.yaml`:
   - `financefusion-backend` — FastAPI web service
   - `financefusion-frontend` — static site (Vite build)
4. Fill in the secret env vars Render prompts for: on the backend, `FIREBASE_SERVICE_ACCOUNT_JSON` (paste the entire service account JSON as one line) and `FRONTEND_ORIGIN`; on the frontend, `VITE_API_URL` and the six `VITE_FIREBASE_*` values from your Firebase web app config.
5. Also add your Render frontend's `.onrender.com` domain to **Firebase Console → Authentication → Settings → Authorized domains**, or Google sign-in will fail on the deployed site.
6. Once both services are live, set `FRONTEND_ORIGIN` on the backend to the frontend's URL, and `VITE_API_URL` on the frontend to the backend's URL, then redeploy both.

**Keeping the backend awake:** Render's free tier spins a service down after ~15 minutes of no traffic, causing a slow first request. `.github/workflows/keep-alive.yml` pings the backend's `/` endpoint every 10 minutes via GitHub Actions to prevent this. Add a `BACKEND_URL` secret (your backend's Render URL) under the repo's **Settings → Secrets and variables → Actions**.

## Known limitations

- Firebase ID tokens are stored in `localStorage` (kept fresh automatically by `firebase.js`'s `onIdTokenChanged` listener), which is readable by any script running on the page (XSS risk) — same tradeoff as most SPA auth setups; a stricter setup would proxy auth through httpOnly cookies.
- Firestore composite queries may prompt Firestore to ask you to create an index the first time they run — click the link in the error/console to auto-create it.
- No account linking UI: if someone signs up with email/password and later hits "Continue with Google" using the same email, Firebase will raise an `auth/account-exists-with-different-credential` error rather than silently merging accounts. Fine for now, worth handling explicitly later.

## Author

Sanjoy Ostad