# Kimono System Migration Plan

This folder is the phase-2 rewrite target. The existing `kimono/` static site should stay online until this system is tested with production-like data.

## Target Architecture

- Frontend admin: React + Vite in `apps/admin`
- API: Node + Express in `apps/api`
- Database: PostgreSQL, recommended Supabase Postgres
- Auth: API-issued JWT, backed by `app_users`
- Audit: every critical mutation writes `audit_logs`
- Export: CSV endpoint under `/reports/orders.csv`
- Monitoring: `/health` endpoint, API logs, database backups

## Migration Order

1. Create a Supabase project or other PostgreSQL database.
2. Run `database/schema.sql`.
3. Run `database/seed.sql`.
4. Create first admin user in `app_users` with a bcrypt password hash.
5. Configure `apps/api/.env`.
6. Deploy API.
7. Configure `apps/admin` with `VITE_API_BASE`.
8. Import historical orders from Google Sheets into `customers`, `orders`, `payments`, and `refund_requests`.
9. Run test cases:
   - create public booking
   - login
   - confirm order
   - check in order
   - request and pay refund
   - export CSV
   - verify audit logs
   - import sample bank lines into reconciliation
   - verify `/health` returns database `ok`
10. Switch public booking form to the new `/orders/public` API.

## Backup Strategy

- Enable managed PostgreSQL daily backups.
- Configure `npm run backup:postgres` as a scheduled job if using a self-managed database.
- Export `orders`, `payments`, `refund_requests`, and `audit_logs` nightly.
- Keep at least 30 days of backups.
- Before each schema migration, take an on-demand backup.

## Cutover Rule

Do not disable the old Google Apps Script flow until:

- New API has handled at least one full test order lifecycle.
- Audit logs record all critical actions.
- CSV export matches the old Sheet totals for a sampled month.
- Staff can log in with role-specific accounts.
