import { onRequest } from "firebase-functions/v2/https";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import { checkInOrder as checkInOrderService } from "../services/checkins.js";
import { z } from "zod";

export const checkInOrder = onRequest(
  { region: "asia-northeast1", cors: true },
  (req, res) => handleHttp(req, res, async () => {
    requireMethod(req, "POST");
    const input = z.object({
      orderId: z.string().min(1),
      last5: z.string().optional()
    }).parse(req.body);
    return checkInOrderService(input.orderId, { last5: input.last5 }, "self");
  })
);

export const checkInOrderByStaff = onRequest(
  { region: "asia-northeast1", cors: true },
  (req, res) => handleHttp(req, res, async () => {
    requireMethod(req, "POST");
    const actor = await requirePermission(req, "checkins:create");
    const input = z.object({
      orderId: z.string().min(1),
      last5: z.string().optional()
    }).parse(req.body);
    return checkInOrderService(input.orderId, { last5: input.last5 }, "staff", actor);
  })
);
