import { db, FieldValue } from "./firebase.js";
import type { AuthContext } from "./auth.js";

export async function writeAuditLog(input: {
  orderId?: string;
  actor?: AuthContext | null;
  actorLabel?: string;
  action: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: Record<string, unknown>;
}) {
  const entry = {
    orderId: input.orderId || null,
    actorUid: input.actor?.uid || null,
    actorLabel: input.actor?.email || input.actorLabel || null,
    action: input.action,
    beforeData: input.beforeData || null,
    afterData: input.afterData || null,
    metadata: input.metadata || {},
    createdAt: FieldValue.serverTimestamp()
  };
  await db.collection("auditLogs").add(entry);
  if (input.orderId) {
    await db.collection("orders").doc(input.orderId).collection("events").add(entry);
  }
}
