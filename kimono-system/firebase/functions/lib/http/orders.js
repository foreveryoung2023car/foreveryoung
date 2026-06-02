import { onRequest } from "firebase-functions/v2/https";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import { transitionOrder as transitionOrderService, createPublicOrder as createPublicOrderService } from "../services/orders.js";
import { z } from "zod";
import { orderStatuses } from "../lib/constants.js";
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
//# sourceMappingURL=orders.js.map