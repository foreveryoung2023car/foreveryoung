import { db, FieldValue } from "./firebase.js";
import type { AuthContext } from "./auth.js";

export async function writeAuditLog(input: {
  orderId?: string | null;
  actor?: AuthContext | null;
  actorLabel?: string;
  action: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: Record<string, unknown>;
}) {
  await db.collection("auditLogs").add({
    orderId: input.orderId || null,
    actorUid: input.actor?.uid || null,
    actorLabel: input.actor?.email || input.actorLabel || null,
    action: input.action,
    beforeData: input.beforeData || null,
    afterData: input.afterData || null,
    metadata: input.metadata || {},
    createdAt: FieldValue.serverTimestamp()
  });

  if (input.orderId) {
    await db.collection("orders").doc(input.orderId).collection("events").add({
      actorUid: input.actor?.uid || null,
      actorLabel: input.actor?.email || input.actorLabel || null,
      action: input.action,
      beforeData: input.beforeData || null,
      afterData: input.afterData || null,
      metadata: input.metadata || {},
      createdAt: FieldValue.serverTimestamp()
    });
  }
}
