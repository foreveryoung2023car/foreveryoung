import { z } from "zod";
import { db, FieldValue } from "../lib/firebase.js";
import { HttpError } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";

const couponCodePattern = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const saveDiscountCouponSchema = z.object({
  code: z.string().trim().min(2).max(32),
  discountRate: z.coerce.number().min(0.1).max(9.9),
  storeIds: z.array(z.string().trim().min(1)).min(1).max(100),
  startDate: z.string().regex(datePattern),
  endDate: z.string().regex(datePattern),
  active: z.boolean().default(true)
}).refine((value) => value.startDate <= value.endDate, {
  message: "Start date must not be after end date",
  path: ["endDate"]
});

const deleteDiscountCouponSchema = z.object({
  code: z.string().trim().min(2).max(32)
});

const setDiscountCouponActiveSchema = deleteDiscountCouponSchema.extend({
  active: z.boolean()
});

function normalizeCouponCode(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function assertPlatformCouponManager(actor: AuthContext) {
  if (actor.role !== "owner" && actor.role !== "admin") {
    throw new HttpError(403, "Only platform administrators can manage discount coupons");
  }
}

function couponResponse(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    code: String(data.code || id),
    discountRate: Number(data.discountRate || 10),
    storeIds: Array.isArray(data.storeIds) ? data.storeIds.map(String) : [],
    startDate: String(data.startDate || ""),
    endDate: String(data.endDate || ""),
    active: data.active !== false
  };
}

export async function listDiscountCoupons(actor: AuthContext) {
  assertPlatformCouponManager(actor);
  const snap = await db.collection("discountCoupons").get();
  const coupons = snap.docs
    .map((doc) => couponResponse(doc.id, doc.data()))
    .sort((a, b) => a.code.localeCompare(b.code));
  return { status: "success", coupons };
}

export async function saveDiscountCoupon(raw: unknown, actor: AuthContext) {
  assertPlatformCouponManager(actor);
  const parsed = saveDiscountCouponSchema.parse(raw);
  const code = normalizeCouponCode(parsed.code);
  if (!couponCodePattern.test(code)) {
    throw new HttpError(400, "Coupon code must be 2-32 uppercase letters, numbers, underscores, or hyphens");
  }
  const storeIds = [...new Set(parsed.storeIds)];
  const storeRefs = storeIds.map((storeId) => db.collection("stores").doc(storeId));
  const storeSnaps = storeRefs.length ? await db.getAll(...storeRefs) : [];
  const legacyStoreIds = new Set(["kyoto1", "kyoto2", "osaka1", "tokyo1"]);
  const unknownStore = storeIds.find((storeId, index) => !storeSnaps[index]?.exists && !legacyStoreIds.has(storeId));
  if (unknownStore) throw new HttpError(400, `Unknown store: ${unknownStore}`);

  const ref = db.collection("discountCoupons").doc(code);
  const beforeSnap = await ref.get();
  const before = beforeSnap.exists ? beforeSnap.data() || null : null;
  const coupon = {
    code,
    discountRate: Math.round(parsed.discountRate * 10) / 10,
    storeIds,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    active: parsed.active
  };
  await ref.set({
    ...coupon,
    updatedBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp(),
    ...(beforeSnap.exists ? {} : { createdBy: actor.uid, createdAt: FieldValue.serverTimestamp() })
  }, { merge: true });
  await writeAuditLog({
    actor,
    action: beforeSnap.exists ? "discount_coupon_updated" : "discount_coupon_created",
    beforeData: before,
    afterData: coupon,
    metadata: { couponCode: code, storeIds }
  });
  return { status: "success", coupon };
}

export async function deleteDiscountCoupon(raw: unknown, actor: AuthContext) {
  assertPlatformCouponManager(actor);
  const input = deleteDiscountCouponSchema.parse(raw);
  const code = normalizeCouponCode(input.code);
  if (!couponCodePattern.test(code)) throw new HttpError(400, "Invalid coupon code");
  const ref = db.collection("discountCoupons").doc(code);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Discount coupon not found");
  const before = snap.data() || null;
  await ref.delete();
  await writeAuditLog({
    actor,
    action: "discount_coupon_deleted",
    beforeData: before,
    afterData: null,
    metadata: { couponCode: code }
  });
  return { status: "success", code };
}

export async function setDiscountCouponActive(raw: unknown, actor: AuthContext) {
  assertPlatformCouponManager(actor);
  const input = setDiscountCouponActiveSchema.parse(raw);
  const code = normalizeCouponCode(input.code);
  if (!couponCodePattern.test(code)) throw new HttpError(400, "Invalid coupon code");
  const ref = db.collection("discountCoupons").doc(code);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Discount coupon not found");
  const before = snap.data() || {};
  await ref.update({
    active: input.active,
    updatedBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp()
  });
  await writeAuditLog({
    actor,
    action: input.active ? "discount_coupon_enabled" : "discount_coupon_disabled",
    beforeData: before,
    afterData: { ...before, active: input.active },
    metadata: { couponCode: code }
  });
  return { status: "success", coupon: couponResponse(code, { ...before, active: input.active }) };
}

function currentJstDate() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function resolveDiscountCoupon(codeValue: unknown, storeIdValue: unknown, bookingDateValue?: unknown) {
  const code = normalizeCouponCode(codeValue);
  const storeId = String(storeIdValue || "").trim();
  const requestedDate = String(bookingDateValue || "").slice(0, 10);
  const bookingDate = datePattern.test(requestedDate) ? requestedDate : currentJstDate();
  if (!code) return { valid: false as const, code: "", discountRate: 10, reason: "empty" };
  if (!storeId) return { valid: false as const, code, discountRate: 10, reason: "store_required" };
  if (!couponCodePattern.test(code)) return { valid: false as const, code, discountRate: 10, reason: "invalid" };
  const snap = await db.collection("discountCoupons").doc(code).get();
  if (!snap.exists) return { valid: false as const, code, discountRate: 10, reason: "not_found" };
  const data = snap.data() || {};
  const storeIds = Array.isArray(data.storeIds) ? data.storeIds.map(String) : [];
  const discountRate = Number(data.discountRate || 10);
  const startDate = String(data.startDate || "");
  const endDate = String(data.endDate || "");
  const withinDateRange = datePattern.test(startDate) &&
    datePattern.test(endDate) &&
    bookingDate >= startDate &&
    bookingDate <= endDate;
  const valid = data.active !== false &&
    storeIds.includes(storeId) &&
    discountRate > 0 &&
    discountRate < 10 &&
    withinDateRange;
  return {
    valid,
    code,
    discountRate: valid ? discountRate : 10,
    reason: valid ? "" : "not_available"
  };
}

export async function validateDiscountCoupon(code: unknown, storeId: unknown, bookingDate?: unknown) {
  const result = await resolveDiscountCoupon(code, storeId, bookingDate);
  return {
    status: "success",
    valid: result.valid,
    code: result.code,
    discountRate: result.valid ? result.discountRate : null
  };
}
