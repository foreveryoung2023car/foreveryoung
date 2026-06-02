import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

export const auditRouter = Router();

auditRouter.get("/", requireAuth, requirePermission("audit:read"), async (_req, res, next) => {
  try {
    const result = await pool.query(
      `select id, order_id, actor_label, action, metadata, created_at
       from audit_logs
       order by created_at desc
       limit 200`
    );
    res.json({ status: "success", logs: result.rows });
  } catch (error) {
    next(error);
  }
});
