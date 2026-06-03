import { onRequest } from "firebase-functions/v2/https";
import { z } from "zod";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import { checkInOrder as checkInOrderService } from "../services/checkins.js";

const checkInInput = z.object({
  orderId: z.string().min(1),
  last5: z.string().optional()
});

export const checkInOrder = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const input = checkInInput.parse(req.body);
  return checkInOrderService(input.orderId, { last5: input.last5 }, "self");
}));

export const checkInOrderByStaff = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "checkins:create");
  const input = checkInInput.parse(req.body);
  return checkInOrderService(input.orderId, { last5: input.last5 }, "staff", actor);
}));
