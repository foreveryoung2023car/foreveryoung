import { db, FieldValue } from "./firebase.js";
export async function writeAuditLog(input) {
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
//# sourceMappingURL=audit.js.map