# Firestore Backup And Test Data Cleanup

This project now treats the old GAS spreadsheet as read-only backup. Production data lives in Cloud Firestore.

## Manual Backup During Launch

Run a managed Firestore export once per day during the launch period.

```sh
gcloud firestore export gs://YOUR_BACKUP_BUCKET/kimono/firestore/$(date +%Y%m%d-%H%M%S) --project foreveryoung-kimono-prod --database="(default)"
```

Recommended bucket name:

```text
foreveryoung-kimono-prod-firestore-backups
```

Create the bucket in a location close to the Firestore database, then keep exports under:

```text
gs://foreveryoung-kimono-prod-firestore-backups/kimono/firestore/
```

Notes:

- Firestore managed export requires billing to be enabled.
- Export reads are billed as document reads.
- Keep daily manual exports during the first 1-2 weeks after launch.
- After stable operation, move to an automated scheduled export.

Official references:

- https://firebase.google.com/docs/firestore/manage-data/export-import
- https://firebase.google.com/docs/firestore/solutions/schedule-export
- https://docs.cloud.google.com/sdk/gcloud/reference/firestore/export

## Suggested Backup Policy

Launch period:

- Manual export once per day.
- Export before any data cleanup.
- Keep at least 14 daily backups.

Stable period:

- Daily automated export via Cloud Scheduler + Cloud Functions.
- Keep 30 daily backups.
- Keep monthly backups for 12 months if business grows.

## List Test Order Candidates

This only lists candidates. It does not delete anything.

Authenticate local Firestore tools first:

```sh
gcloud auth application-default login
gcloud config set project foreveryoung-kimono-prod
```

```sh
cd kimono-system/firebase/functions
npm run list:test-orders
```

Heuristics used:

- order number contains `TEST`
- customer name contains `test`, `測試`, or `测试`
- email contains `test` or `example`
- phone is an obvious placeholder
- source contains `test`

## Delete Test Orders

Always export Firestore first. Then delete only explicit order numbers or document IDs.

Dry run:

```sh
cd kimono-system/firebase/functions
npm run delete:test-orders -- --order-no=K260603001
```

Execute:

```sh
cd kimono-system/firebase/functions
npm run delete:test-orders -- --order-no=K260603001 --execute
```

Multiple orders:

```sh
npm run delete:test-orders -- --order-no=K260603001 --order-no=K260603002 --execute
```

The delete script writes a local JSON snapshot before deleting:

```text
kimono-system/firebase/functions/backups/
```

That folder is intentionally ignored by git.
