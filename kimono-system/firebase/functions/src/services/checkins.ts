import { z } from "zod";
import { db, FieldValue } from "../lib/firebase.js";
import { HttpError } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";

export const checkInSchema = z.object({
  last5: z.string().optional()
});

export async function checkInOrder(orderId: string, raw: unknown, source: "self" | "staff", actor?: AuthContext) {
  const input = checkInSchema.parse(raw);
  const result = await db.runTransaction(async (tx) => {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new HttpError(404, "Order not found");
    const before = orderSnap.data()!;
    if (before.last5 && input.last5 && before.last5 !== input.last5) {
      throw new HttpError(400, "Phone verification failed");
    }

    const checkinRef = db.collection("checkins").doc();
    const checkin = {
      id: checkinRef.id,
      orderId,
      storeId: before.storeId || null,
      checkedInBy: actor?.uid || null,
      source,
      last5: input.last5 || "",
      checkedInAt: FieldValue.serverTimestamp()
    };
    tx.set(checkinRef, checkin);
    tx.update(orderRef, {
      status: "checked_in",
      updatedBy: actor?.uid || null,
      updatedAt: FieldValue.serverTimestamp()
    });
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
