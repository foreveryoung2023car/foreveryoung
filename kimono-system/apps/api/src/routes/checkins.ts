import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { checkInOrder } from "../services/checkinService.js";

export const checkinsRouter = Router();

checkinsRouter.post("/orders/:orderId/checkins/public", async (req, res, next) => {
  try {
    const input = z.object({ last5: z.string().optional() }).parse(req.body);
    res.json(await checkInOrder(req.params.orderId, { source: "self", last5: input.last5 }));
  } catch (error) {
    next(error);
  }
});

checkinsRouter.post("/orders/:orderId/checkins", requireAuth, requirePermission("checkins:create"), async (req, res, next) => {
  try {
    const input = z.object({ last5: z.string().optional() }).parse(req.body);
    res.json(await checkInOrder(req.params.orderId, { source: "staff", last5: input.last5 }, req.user!));
  } catch (error) {
    next(error);
  }
});
