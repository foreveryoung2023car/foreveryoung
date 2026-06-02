import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { markRefundPaid, requestRefund } from "../services/refundService.js";

export const refundsRouter = Router();

refundsRouter.post("/orders/:orderId/refunds/public", async (req, res, next) => {
  try {
    const input = z.object({
      reason: z.string().min(1),
      requestedAmountJpy: z.number().int().optional(),
      bankCode: z.string().optional(),
      bankName: z.string().optional(),
      bankAccount: z.string().optional(),
      bankAccountName: z.string().optional(),
      contactPhone: z.string().optional()
    }).parse(req.body);
    res.json(await requestRefund(req.params.orderId, input));
  } catch (error) {
    next(error);
  }
});

refundsRouter.post("/:refundId/paid", requireAuth, requirePermission("refunds:pay"), async (req, res, next) => {
  try {
    const input = z.object({ amountJpy: z.number().int().min(0) }).parse(req.body);
    res.json(await markRefundPaid(req.params.refundId, input.amountJpy, req.user!));
  } catch (error) {
    next(error);
  }
});
