import { onRequest } from "firebase-functions/v2/https";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import {
  deleteDiscountCoupon as deleteDiscountCouponService,
  listDiscountCoupons as listDiscountCouponsService,
  saveDiscountCoupon as saveDiscountCouponService,
  setDiscountCouponActive as setDiscountCouponActiveService,
  validateDiscountCoupon as validateDiscountCouponService
} from "../services/coupons.js";

export const validateDiscountCoupon = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "GET");
  return validateDiscountCouponService(req.query.code, req.query.storeId, req.query.bookingDate);
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

export const deleteDiscountCoupon = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "stores:manage");
  return deleteDiscountCouponService(req.body, actor);
}));

export const setDiscountCouponActive = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "stores:manage");
  return setDiscountCouponActiveService(req.body, actor);
}));
