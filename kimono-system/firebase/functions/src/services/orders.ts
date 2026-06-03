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

export const queryPublicOrderSchema = z.object({
  orderId: z.string().optional(),
  contact: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional()
}).refine((input) => {
  if (input.orderId && input.contact) return true;
  return Boolean(input.name && input.phone);
}, "Order number with contact, or name with phone is required");

export const updateOrderByStaffSchema = z.object({
  orderId: z.string().min(1),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  bookingAt: z.string().optional(),
  adults: z.number().int().min(0).optional(),
  children: z.number().int().min(0).optional(),
  plan: z.string().optional(),
  platform: z.string().optional(),
  hair: z.boolean().optional(),
  photo: z.boolean().optional(),
  confirmed: z.boolean().optional(),
  depositJpy: z.number().int().min(0).optional(),
  kimonoPriceJpy: z.number().int().min(0).optional(),
  hairFeeJpy: z.number().int().min(0).optional(),
  photoFeeJpy: z.number().int().min(0).optional(),
  couponCode: z.string().optional(),
  discountRate: z.number().optional(),
  refundAmountJpy: z.number().int().min(0).optional(),
  refundTime: z.string().optional(),
  refundReason: z.string().optional(),
  refundBankCode: z.string().optional(),
  refundBankName: z.string().optional(),
  refundBankAccount: z.string().optional(),
  refundBankAccountName: z.string().optional(),
  note: z.string().optional()
});

function normalizeDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function timestampToIso(value: unknown) {
  if (!value) return "";
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function publicStatusCode(status: unknown) {
  switch (status) {
    case "confirmed":
    case "checked_in":
    case "completed":
      return "confirmed";
    case "refund_requested":
    case "refunding":
      return "refunding";
    case "refunded":
    case "cancelled":
      return "refunded";
    default:
      return "pending";
  }
}

function toPublicOrderResponse(orderId: string, order: FirebaseFirestore.DocumentData) {
  const statusCode = publicStatusCode(order.status);
  const adults = Number(order.adults || 0);
  const children = Number(order.children || 0);
  const planPrice = Number(order.kimonoPriceJpy || 0);
  const discount = Number(order.discountRate || 10);
  const planActual = discount > 0 && discount < 10 ? Math.round(planPrice * discount / 10) : planPrice;

  return {
    status: "success",
    firestoreId: orderId,
    orderId: order.orderNo || orderId,
    name: order.customerName || "",
    email: order.customerEmail || "",
    phone: order.customerPhone || "",
    statusCode,
    bookingDate: timestampToIso(order.bookingAt),
    guests: `${adults} 位大人${children ? ` / ${children} 位小孩` : ""}`,
    adults,
    children,
    plan: order.plan || "和服體驗",
    hair: order.hair ? "是" : "否",
    photo: order.photo ? "是" : "否",
    planPrice,
    planActual,
    hairFee: Number(order.hairFeeJpy || 0),
    photoFee: Number(order.photoFeeJpy || 0),
    depositJPY: Number(order.depositJpy || 0),
    twdDeposit: "",
    onsiteDue: Number(order.onsiteDueJpy || 0),
    couponCode: order.couponCode || "",
    discount,
    canRefund: order.status === "confirmed",
    canCheckIn: order.status === "confirmed"
  };
}

export async function queryPublicOrder(raw: unknown) {
  const input = queryPublicOrderSchema.parse(raw);
  let snap;

  if (input.orderId) {
    snap = await db.collection("orders").where("orderNo", "==", input.orderId.trim().toUpperCase()).limit(1).get();
  } else {
    snap = await db.collection("orders").where("customerName", "==", input.name?.trim()).limit(20).get();
  }

  if (snap.empty) throw new HttpError(404, "Order not found");

  const contact = normalizeText(input.contact);
  const phoneDigits = normalizeDigits(input.phone);
  const name = normalizeText(input.name);

  const match = snap.docs.find((doc) => {
    const order = doc.data();
    if (input.orderId) {
      const emailOk = normalizeText(order.customerEmail) === contact;
      const phoneOk = normalizeDigits(order.customerPhone).endsWith(normalizeDigits(contact));
      return emailOk || phoneOk;
    }
    const nameOk = normalizeText(order.customerName) === name;
    const phoneOk = normalizeDigits(order.customerPhone).endsWith(phoneDigits.slice(-5));
    return nameOk && phoneOk;
  });

  if (!match) throw new HttpError(404, "Order not found");
  return toPublicOrderResponse(match.id, match.data());
}

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

export async function updateOrderByStaff(raw: unknown, actor: AuthContext) {
  const input = updateOrderByStaffSchema.parse(raw);
  const result = await db.runTransaction(async (tx) => {
    const orderRef = db.collection("orders").doc(input.orderId);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new HttpError(404, "Order not found");
    const before = orderSnap.data()!;
    const patch: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (input.name !== undefined) patch.customerName = input.name;
    if (input.phone !== undefined) patch.customerPhone = input.phone;
    if (input.email !== undefined) patch.customerEmail = input.email || null;
    if (input.bookingAt) patch.bookingAt = Timestamp.fromDate(new Date(input.bookingAt));
    if (input.adults !== undefined) patch.adults = input.adults;
    if (input.children !== undefined) patch.children = input.children;
    if (input.plan !== undefined) patch.plan = input.plan;
    if (input.platform !== undefined) patch.platform = input.platform;
    if (input.hair !== undefined) patch.hair = input.hair;
    if (input.photo !== undefined) patch.photo = input.photo;
    if (input.depositJpy !== undefined) patch.depositJpy = input.depositJpy;
    if (input.kimonoPriceJpy !== undefined) patch.kimonoPriceJpy = input.kimonoPriceJpy;
    if (input.hairFeeJpy !== undefined) patch.hairFeeJpy = input.hairFeeJpy;
    if (input.photoFeeJpy !== undefined) patch.photoFeeJpy = input.photoFeeJpy;
    if (input.couponCode !== undefined) patch.couponCode = input.couponCode;
    if (input.discountRate !== undefined) patch.discountRate = input.discountRate;
    if (input.note !== undefined) patch.proofNote = input.note;

    const refundAmount = input.refundAmountJpy ?? Number(before.refundAmountJpy || 0);
    const refundTime = input.refundTime || "";
    if (input.refundAmountJpy !== undefined) patch.refundAmountJpy = input.refundAmountJpy;
    if (input.refundTime !== undefined) patch.refundTime = input.refundTime || "";
    if (input.refundReason !== undefined) patch.refundReason = input.refundReason;
    if (input.refundBankCode !== undefined) patch.refundBankCode = input.refundBankCode;
    if (input.refundBankName !== undefined) patch.refundBankName = input.refundBankName;
    if (input.refundBankAccount !== undefined) patch.refundBankAccount = input.refundBankAccount;
    if (input.refundBankAccountName !== undefined) patch.refundBankAccountName = input.refundBankAccountName;

    if (refundAmount > 0 && refundTime) {
      patch.status = "refunded";
    } else if (refundAmount > 0) {
      patch.status = "refunding";
    } else if (input.confirmed === true && before.status === "pending_review") {
      patch.status = "confirmed";
    } else if (input.confirmed === false && before.status === "confirmed") {
      patch.status = "pending_review";
    }

    tx.update(orderRef, patch);

    if (input.refundAmountJpy !== undefined || input.refundReason !== undefined || input.refundTime !== undefined) {
      const refundRef = db.collection("refundRequests").doc(input.orderId);
      tx.set(refundRef, {
        id: refundRef.id,
        orderId: input.orderId,
        orderNo: before.orderNo || "",
        reason: input.refundReason || before.refundReason || "",
        requestedAmountJpy: refundAmount || null,
        paidAmountJpy: refundAmount || null,
        bankCode: input.refundBankCode || before.refundBankCode || "",
        bankName: input.refundBankName || before.refundBankName || "",
        bankAccount: input.refundBankAccount || before.refundBankAccount || "",
        bankAccountName: input.refundBankAccountName || before.refundBankAccountName || "",
        contactPhone: input.phone || before.customerPhone || "",
        status: refundAmount > 0 && refundTime ? "paid" : "processing",
        requestedAt: before.createdAt || FieldValue.serverTimestamp(),
        paidAt: refundTime ? Timestamp.fromDate(new Date(refundTime)) : null,
        handledBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return { before, after: { ...before, ...patch, id: input.orderId } };
  });

  await writeAuditLog({
    orderId: input.orderId,
    actor,
    action: "order_admin_updated",
    beforeData: result.before,
    afterData: result.after,
    metadata: { source: "admin" }
  });
  return { status: "success", order: result.after };
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
