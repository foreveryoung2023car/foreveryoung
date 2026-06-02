import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { createOrder, listOrders, patchOrder, transitionOrder } from "../services/orderService.js";

export const ordersRouter = Router();

const createOrderSchema = z.object({
  clientRequestId: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  storeCode: z.string().optional(),
  bookingAt: z.string(),
  adults: z.number().int().min(0).default(1),
  children: z.number().int().min(0).default(0),
  plan: z.string().optional(),
  hair: z.boolean().optional(),
  photo: z.boolean().optional(),
  source: z.string().optional(),
  platform: z.string().optional(),
  couponCode: z.string().optional(),
  discountRate: z.number().optional(),
  depositJpy: z.number().int().optional(),
  kimonoPriceJpy: z.number().int().optional(),
  hairFeeJpy: z.number().int().optional(),
  photoFeeJpy: z.number().int().optional(),
  proofUrl: z.string().optional(),
  proofNote: z.string().optional(),
  last5: z.string().optional()
});

ordersRouter.post("/public", async (req, res, next) => {
  try {
    const input = createOrderSchema.parse(req.body);
    res.json(await createOrder(input));
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/", requireAuth, requirePermission("orders:read"), async (req, res, next) => {
  try {
    res.json(await listOrders(pool, req.user!, {
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined
    }));
  } catch (error) {
    next(error);
  }
});

ordersRouter.patch("/:id", requireAuth, requirePermission("orders:update"), async (req, res, next) => {
  try {
    res.json(await patchOrder(req.params.id, req.body.fields ?? req.body, req.user!));
  } catch (error) {
    next(error);
  }
});

ordersRouter.post("/:id/transition", requireAuth, requirePermission("orders:transition"), async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum([
        "draft",
        "pending_payment",
        "pending_review",
        "confirmed",
        "checked_in",
        "completed",
        "refund_requested",
        "refunding",
        "refunded",
        "cancelled"
      ])
    });
    const input = schema.parse(req.body);
    res.json(await transitionOrder(req.params.id, input.status, req.user!));
  } catch (error) {
    next(error);
  }
});
