import { z } from "zod";
import { FieldValue, Timestamp, db } from "../lib/firebase.js";
import { HttpError, assertTransition, type OrderStatus } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";
import { getIdempotentResponse, rememberIdempotentResponse } from "../lib/idempotency.js";
import { calculateOrderTotal } from "../lib/money.js";
import { nextOrderNo } from "./orderNumber.js";

export const createPublicOrderSchema = z.object({
  clientRequestId: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  storeCode: z.string().optional(),
  bookingAt: z.string(),
  adults: z.number().int().min(0).default(1),
  children: z.number().int().min(0).default(0),
  plan: z.string().optional(),
  hair: z.boolean().optional(),
  photo: z.boolean().optional(),
  source: z.string().optional(),
  platform: z.string().optional(),
  couponCode: z.string().optional(),
  discountRate: z.number().optional(),
  depositJpy: z.number().int().optional(),
  kimonoPriceJpy: z.number().int().optional(),
  hairFeeJpy: z.number().int().optional(),
  photoFeeJpy: z.number().int().optional(),
  proofUrl: z.string().optional(),
  proofNote: z.string().optional(),
  last5: z.string().optional()
});

export async function createPublicOrder(raw: unknown) {
  const input = createPublicOrderSchema.parse(raw);
  const cached = await getIdempotentResponse(input.clientRequestId);
  if (cached) return cached;

  const result = await db.runTransaction(async (tx) => {
    const orderNo = await nextOrderNo(tx);
    const orderRef = db.collection("orders").doc();
    const customerRef = db.collection("customers").doc();
    const total = calculateOrderTotal({
      depositJpy: input.depositJpy || 0,
      kimonoPriceJpy: input.kimonoPriceJpy || 0,
      hairFeeJpy: input.hairFeeJpy || 0,
      photoFeeJpy: input.photoFeeJpy || 0,
      discountRate: input.discountRate || 10
    });
    tx.set(customerRef, {
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    const order = {
      id: orderRef.id,
      orderNo,
      status: "pending_review" satisfies OrderStatus,
      customerId: customerRef.id,
      customerName: input.name,
      customerPhone: input.phone,
      customerEmail: input.email || null,
      storeId: input.storeCode || null,
      bookingAt: Timestamp.fromDate(new Date(input.bookingAt)),
      adults: input.adults,
      children: input.children,
      plan: input.plan || "",
      hair: input.hair || false,
      photo: input.photo || false,
      source: input.source || "web",
      platform: input.platform || "LINE",
      couponCode: input.couponCode || "",
      discountRate: input.discountRate || 10,
      depositJpy: input.depositJpy || 0,
      kimonoPriceJpy: input.kimonoPriceJpy || 0,
      hairFeeJpy: input.hairFeeJpy || 0,
      photoFeeJpy: input.photoFeeJpy || 0,
      totalJpy: total.totalJpy,
      onsiteDueJpy: total.onsiteDueJpy,
      proofUrl: input.proofUrl || "",
      proofNote: input.proofNote || "",
      last5: input.last5 || "",
      createdBy: null,
      updatedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    tx.set(orderRef, order);
    const response = { status: "success", order: { id: orderRef.id, orderNo } };
    rememberIdempotentResponse(tx, input.clientRequestId, response);
    return { response, orderId: orderRef.id, order };
  });

  await writeAuditLog({
    orderId: result.orderId,
    actorLabel: "web",
    action: "booking_created",
    afterData: result.order,
    metadata: { clientRequestId: input.clientRequestId }
  });
  return result.response;
}

export async function transitionOrder(orderId: string, nextStatus: OrderStatus, actor: AuthContext) {
  const result = await db.runTransaction(async (tx) => {
    const ref = db.collection("orders").doc(orderId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, "Order not found");
    const before = snap.data()!;
    assertTransition(before.status, nextStatus);
    const patch = { status: nextStatus, updatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() };
    tx.update(ref, patch);
    return { before, after: { ...before, ...patch, id: orderId } };
  });
  await writeAuditLog({
    orderId,
    actor,
    action: nextStatus === "confirmed" ? "order_confirmed" : "order_patched",
    beforeData: result.before,
    afterData: result.after,
    metadata: { transition: `${result.before.status}->${nextStatus}` }
  });
  return { status: "success", order: result.after };
}
