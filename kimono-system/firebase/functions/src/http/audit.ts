import { onRequest } from "firebase-functions/v2/https";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import { listAuditLogs } from "../services/audit.js";

export const getAuditLogs = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "GET");
  const actor = await requirePermission(req, "audit:read");
  return listAuditLogs(Number(req.query.limit || 200), actor);
}));
