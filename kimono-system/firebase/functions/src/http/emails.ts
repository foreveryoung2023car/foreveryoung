import { onRequest } from "firebase-functions/v2/https";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import { gmailSecrets } from "../lib/gmail.js";
import { sendConfirmEmail as sendConfirmEmailService } from "../services/emails.js";

export const sendConfirmEmail = onRequest({ region: "asia-northeast1", cors: true, secrets: gmailSecrets }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "orders:update");
  return sendConfirmEmailService(req.body, actor);
}));
