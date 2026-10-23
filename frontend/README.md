# FraudGuard AI — Frontend Prototype

React + Vite dashboard for the FraudGuard AI fraud-protection prototype.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle into dist/
```

## Authentication

The app opens on the landing page. Dashboards (`/app/*` customer, `/analyst/*`
analyst) require sign-in — there is no workspace selector and no automatic
login. Credentials are submitted on `/login`; the role is resolved from the
matched account, so a user cannot choose or switch their own role.

### Accounts

No default accounts exist — nothing is seeded. Customers create their own
account from the Customer Login form (self-registration), and analyst accounts
are provisioned by an administrator:

    python scripts/create_analyst.py --email analyst@example.com --name "Priya Nair"

Sign in with either the username or the email. Credentials are validated by the
FastAPI backend (`/api/v1/auth`) against hashed passwords; the role always
comes from the matched account, never from the UI. Log out from the sidebar
user card to clear the session.
