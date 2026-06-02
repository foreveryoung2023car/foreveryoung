# Kimono System

Formal phase-2 rewrite for the kimono booking operation system.

The old `../kimono/` static site remains untouched as the current production-compatible system. This directory introduces a structured replacement:

- `apps/api`: Node/Express API
- `apps/admin`: React/Vite admin console
- `packages/shared`: shared order states, roles, calculations
- `database`: PostgreSQL schema and seed data
- `firebase`: Firebase Functions + Firestore backend
- `docs`: migration and operating documents

## Why This Exists

The old system depends on static HTML, Google Apps Script, and Google Sheets. That is fine for an MVP, but long-term order, refund, finance, check-in, and audit workflows need backend-controlled state and a real database.

## Local Setup

```bash
cd kimono-system
npm install
cp apps/api/.env.example apps/api/.env
npm run dev
```

Run SQL in order:

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql
```

## API

- `GET /health`
- `POST /auth/login`
- `POST /orders/public`
- `GET /orders`
- `PATCH /orders/:id`
- `POST /orders/:id/transition`
- `POST /orders/:orderId/checkins/public`
- `POST /orders/:orderId/checkins`
- `POST /orders/:orderId/refunds/public`
- `POST /refunds/:refundId/paid`
- `GET /finance/summary`
- `GET /reconciliation`
- `POST /reconciliation/import`
- `POST /reconciliation/:id/match`
- `GET /audit`
- `GET /reports/orders.csv`
- `GET /health`

## Deployment Notes

Recommended deployment options:

- Firebase path: Cloud Functions + Firestore
- PostgreSQL path: Supabase + Node API
- Admin: Vercel, Netlify, or Cloudflare Pages

Keep the old `kimono/` pages live until the migration checklist in `docs/migration-plan.md` is complete.

See also:

- `docs/migration-plan.md`
- `docs/deployment.md`
