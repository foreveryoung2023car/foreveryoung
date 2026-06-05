import { z } from "zod";
import { db, FieldValue } from "../lib/firebase.js";
import { HttpError } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";

export const checkInSchema = z.object({
  last5: z.string().optional(),
  phoneLast3: z.string().optional(),
  phoneLast5: z.string().optional()
});

function isStoreScopedActor(actor: AuthContext) {
  return actor.role === "store_manager" || actor.role === "store_staff";
}

export async function checkInOrder(orderId: string, raw: unknown, source: string, actor?: AuthContext) {
  const input = checkInSchema.parse(raw);
  const result = await db.runTransaction(async (tx) => {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new HttpError(404, "Order not found");
    const before = orderSnap.data()!;
    if (actor && isStoreScopedActor(actor)) {
      if (!actor.storeId) throw new HttpError(403, "Store user has no storeId");
      if (before.storeId !== actor.storeId) throw new HttpError(403, "Order belongs to another store");
    }
    const expectedPhone = String(before.customerPhone || "").replace(/\D/g, "");
    const phoneVerification = String(input.phoneLast5 || input.last5 || "").replace(/\D/g, "");
    if (source === "self" && (!phoneVerification || !expectedPhone || !expectedPhone.endsWith(phoneVerification))) {
      throw new HttpError(400, "Phone verification failed");
    }
    const checkinRef = db.collection("checkins").doc();
    const checkin = {
      id: checkinRef.id,
      orderId,
      storeId: before.storeId || null,
      checkedInBy: actor?.uid || null,
      source,
      phoneLast3: input.phoneLast3 || "",
      phoneLast5: input.phoneLast5 || input.last5 || "",
      checkedInAt: FieldValue.serverTimestamp()
    };
    tx.set(checkinRef, checkin);
    tx.update(orderRef, { status: "checked_in", updatedBy: actor?.uid || null, updatedAt: FieldValue.serverTimestamp() });
    return { before, checkin, checkinId: checkinRef.id };
  });
  await writeAuditLog({
    orderId,
    actor: actor || null,
    actorLabel: actor?.email || source,
    action: "order_checked_in",
    beforeData: result.before,
    afterData: result.checkin,
    metadata: { checkinId: result.checkinId, source }
  });
  return { status: "success", checkin: { id: result.checkinId } };
}
