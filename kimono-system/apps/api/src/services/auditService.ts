import type { DbClient } from "../db/pool.js";

export type AuditInput = {
  orderId?: string | null;
  actorId?: string | null;
  actorLabel?: string | null;
  action: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export async function writeAuditLog(db: DbClient, input: AuditInput) {
  await db.query(
    `insert into audit_logs
      (order_id, actor_id, actor_label, action, before_data, after_data, metadata, ip_address, user_agent)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.orderId ?? null,
      input.actorId ?? null,
      input.actorLabel ?? null,
      input.action,
      input.beforeData ? JSON.stringify(input.beforeData) : null,
      input.afterData ? JSON.stringify(input.afterData) : null,
      JSON.stringify(input.metadata ?? {}),
      input.ipAddress ?? null,
      input.userAgent ?? null
    ]
  );
}
