import { onRequest } from "firebase-functions/v2/https";
import { z } from "zod";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import { orderStatuses } from "../lib/constants.js";
import {
  createPublicOrder as createPublicOrderService,
  createWalkInOrder as createWalkInOrderService,
  queryPublicOrder as queryPublicOrderService,
  updateOrderByStaff as updateOrderByStaffService,
  transitionOrder as transitionOrderService
} from "../services/orders.js";

export const createPublicOrder = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  return createPublicOrderService(req.body);
}));

export const queryPublicOrder = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  return queryPublicOrderService(req.body);
}));

export const createWalkInOrder = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "orders:create");
  return createWalkInOrderService(req.body, actor);
}));

export const updateOrderByStaff = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "orders:update");
  return updateOrderByStaffService(req.body, actor);
}));

export const transitionOrder = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "orders:transition");
  const input = z.object({
    orderId: z.string().min(1),
    status: z.enum(orderStatuses)
  }).parse(req.body);
  return transitionOrderService(input.orderId, input.status, actor);
}));
