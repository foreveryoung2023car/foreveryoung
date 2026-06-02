import { db, FieldValue } from "./firebase.js";
export async function getIdempotentResponse(key) {
    if (!key)
        return null;
    const snap = await db.collection("idempotencyKeys").doc(key).get();
    return snap.exists ? snap.data()?.response || null : null;
}
export function rememberIdempotentResponse(tx, key, response) {
    if (!key)
        return;
    tx.set(db.collection("idempotencyKeys").doc(key), {
        response,
        createdAt: FieldValue.serverTimestamp()
    });
}
//# sourceMappingURL=idempotency.js.map