import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { importBankLines, listReconciliationItems, manuallyMatchReconciliation } from "../services/reconciliationService.js";

export const reconciliationRouter = Router();

reconciliationRouter.get("/", requireAuth, requirePermission("reconcile:read"), async (req, res, next) => {
  try {
    res.json(await listReconciliationItems({
      state: typeof req.query.state === "string" ? req.query.state : undefined
    }));
  } catch (error) {
    next(error);
  }
});

reconciliationRouter.post("/import", requireAuth, requirePermission("reconcile:write"), async (req, res, next) => {
  try {
    const input = z.object({
      lines: z.array(z.object({
        bankRowNo: z.string().optional(),
        bankPostedAt: z.string().optional(),
        amountJpy: z.number().int(),
        description: z.string().optional(),
        orderNo: z.string().optional()
      }))
    }).parse(req.body);
    res.json(await importBankLines(input.lines, req.user!));
  } catch (error) {
    next(error);
  }
});

reconciliationRouter.post("/:id/match", requireAuth, requirePermission("reconcile:write"), async (req, res, next) => {
  try {
    const input = z.object({ orderId: z.string().uuid() }).parse(req.body);
    res.json(await manuallyMatchReconciliation(req.params.id, input.orderId, req.user!));
  } catch (error) {
    next(error);
  }
});
