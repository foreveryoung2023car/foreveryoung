import { z } from "zod";
import { db, FieldValue } from "../lib/firebase.js";
import { HttpError } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";

export const requestRefundSchema = z.object({
  reason: z.string().min(1),
  requestedAmountJpy: z.number().int().optional(),
  bankCode: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankAccountName: z.string().optional(),
  contactPhone: z.string().optional()
});

export async function requestRefund(orderId: string, raw: unknown, actor?: AuthContext) {
  const input = requestRefundSchema.parse(raw);
  const result = await db.runTransaction(async (tx) => {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new HttpError(404, "Order not found");
    const before = orderSnap.data()!;

    const refundRef = db.collection("refundRequests").doc();
    const refund = {
      id: refundRef.id,
      orderId,
      reason: input.reason,
      requestedAmountJpy: input.requestedAmountJpy || null,
      bankCode: input.bankCode || "",
      bankName: input.bankName || "",
      bankAccount: input.bankAccount || "",
      bankAccountName: input.bankAccountName || "",
      contactPhone: input.contactPhone || "",
      status: "requested",
      requestedAt: FieldValue.serverTimestamp(),
      handledBy: null
    };
    tx.set(refundRef, refund);
    tx.update(orderRef, {
      status: "refund_requested",
      updatedBy: actor?.uid || null,
      updatedAt: FieldValue.serverTimestamp()
    });

    return { before, refund, refundId: refundRef.id };
  });

  await writeAuditLog({
    orderId,
    actor: actor || null,
    actorLabel: actor?.email || "customer",
    action: "refund_requested",
    beforeData: result.before,
    afterData: result.refund,
    metadata: { refundId: result.refundId }
  });

  return { status: "success", refund: { id: result.refundId } };
}
