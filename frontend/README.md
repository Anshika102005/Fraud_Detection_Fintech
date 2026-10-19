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

### Seeded demo accounts

| Role     | Username  | Email                        | Password      |
|----------|-----------|------------------------------|---------------|
| Customer | `anshika` | `anshika.sharma@example.com` | `Anshika@123` |
| Analyst  | `vikram`  | `vikram@fraudguard.ai`       | `Vikram@123`  |

Sign in with either the username or the email.

These identities are seeded because the prototype already contains their
generated dashboard/transaction/analyst data. The data itself is unchanged; only
how a user is admitted to it has changed. Log out from the sidebar user card to
clear the session.

> Prototype note: credentials are validated client-side against the seeded
> accounts in `src/services/api/authApi.js`. Replace that module with a real
> backend credential check before any non-demo deployment.
