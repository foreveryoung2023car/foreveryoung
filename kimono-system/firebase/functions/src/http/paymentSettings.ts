import { onRequest } from "firebase-functions/v2/https";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { handleHttp, requireMethod } from "../lib/http.js";
import { getPaymentProfile, savePaymentProfile } from "../services/paymentSettings.js";

export const getPaymentSettings = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "GET");
  const input = z.object({
    platform: z.string().optional()
  }).parse(req.query);
  return getPaymentProfile(input.platform);
}));

export const savePaymentSettings = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requireAuth(req);
  return savePaymentProfile(req.body, actor);
}));
