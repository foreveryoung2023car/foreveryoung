#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/kimono-$STAMP.sql.gz"

pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  | gzip > "$OUT"

echo "backup written: $OUT"
