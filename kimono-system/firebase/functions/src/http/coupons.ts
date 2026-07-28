import { onRequest } from "firebase-functions/v2/https";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import {
  listDiscountCoupons as listDiscountCouponsService,
  saveDiscountCoupon as saveDiscountCouponService,
  validateDiscountCoupon as validateDiscountCouponService
} from "../services/coupons.js";

export const validateDiscountCoupon = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "GET");
  return validateDiscountCouponService(req.query.code, req.query.storeId);
}));

export const listDiscountCoupons = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "GET");
  const actor = await requirePermission(req, "stores:manage");
  return listDiscountCouponsService(actor);
}));

export const saveDiscountCoupon = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "stores:manage");
  return saveDiscountCouponService(req.body, actor);
}));
