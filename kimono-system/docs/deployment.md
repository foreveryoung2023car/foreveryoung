# Deployment Guide

Recommended deployment for the first production-ready phase:

- Database: Supabase PostgreSQL
- API: Render, Railway, Fly.io, Cloud Run, or Vercel serverless
- Admin: Vercel, Netlify, or Cloudflare Pages

## Supabase PostgreSQL

1. Create a Supabase project.
2. Open SQL editor.
3. Run `database/schema.sql`.
4. Run `database/seed.sql`.
5. Create the first `app_users` admin manually.
6. Copy the connection string into `DATABASE_URL`.

## API Environment

Required:

```bash
DATABASE_URL=postgres://...
JWT_SECRET=at-least-32-random-chars
CORS_ORIGIN=https://your-admin-domain.example
PORT=8787
```

Checks:

```bash
curl https://your-api.example/health
```

Expected:

```json
{
  "status": "ok",
  "database": "ok"
}
```

## Admin Environment

Set:

```bash
VITE_API_BASE=https://your-api.example
```

Then build:

```bash
npm run build -w @kimono/admin
```

## Backup

Managed Supabase backups should be enabled. For self-managed Postgres:

```bash
DATABASE_URL=postgres://... npm run backup:postgres
```

Schedule it daily and retain at least 30 days.

## Cutover

1. Keep `kimono/config.js` with `USE_NEW_API: false`.
2. Deploy API and admin.
3. Run test order lifecycle.
4. Set `API_BASE_URL` to API URL.
5. Set `USE_NEW_API: true`.
6. Watch `/health`, API logs, and `audit_logs`.
7. Keep GAS available as rollback until the new API runs stably.
