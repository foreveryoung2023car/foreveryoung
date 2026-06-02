import type { Transaction } from "firebase-admin/firestore";
import { db, FieldValue } from "./firebase.js";

export async function getIdempotentResponse(key?: string) {
  if (!key) return null;
  const snap = await db.collection("idempotencyKeys").doc(key).get();
  return snap.exists ? snap.data()?.response || null : null;
}

export function rememberIdempotentResponse(tx: Transaction, key: string | undefined, response: unknown) {
  if (!key) return;
  tx.set(db.collection("idempotencyKeys").doc(key), {
    response,
    createdAt: FieldValue.serverTimestamp()
  });
}
