import { onRequest } from "firebase-functions/v2/https";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import { requestRefund as requestRefundService } from "../services/refunds.js";
import { z } from "zod";

export const requestRefund = onRequest(
  { region: "asia-northeast1", cors: true },
  (req, res) => handleHttp(req, res, async () => {
    requireMethod(req, "POST");
    const input = z.object({
      orderId: z.string().min(1),
      reason: z.string().min(1),
      requestedAmountJpy: z.number().int().optional(),
      bankCode: z.string().optional(),
      bankName: z.string().optional(),
      bankAccount: z.string().optional(),
      bankAccountName: z.string().optional(),
      contactPhone: z.string().optional()
    }).parse(req.body);
    return requestRefundService(input.orderId, input);
  })
);

export const requestRefundByStaff = onRequest(
  { region: "asia-northeast1", cors: true },
  (req, res) => handleHttp(req, res, async () => {
    requireMethod(req, "POST");
    const actor = await requirePermission(req, "refunds:request");
    const input = z.object({
      orderId: z.string().min(1),
      reason: z.string().min(1),
      requestedAmountJpy: z.number().int().optional()
    }).parse(req.body);
    return requestRefundService(input.orderId, input, actor);
  })
);
