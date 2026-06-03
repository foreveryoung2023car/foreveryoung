import { onRequest } from "firebase-functions/v2/https";
import { z } from "zod";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import { orderStatuses } from "../lib/constants.js";
import { createPublicOrder as createPublicOrderService, transitionOrder as transitionOrderService } from "../services/orders.js";

export const createPublicOrder = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  return createPublicOrderService(req.body);
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
