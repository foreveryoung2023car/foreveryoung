import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

export const financeRouter = Router();

financeRouter.get("/summary", requireAuth, requirePermission("finance:read"), async (req, res, next) => {
  try {
    const month = typeof req.query.month === "string" ? req.query.month : null;
    const params: string[] = [];
    const where: string[] = [];
    if (month) {
      params.push(`${month}-01`);
      where.push(`date_trunc('month', booking_at) = date_trunc('month', $${params.length}::date)`);
    }
    const result = await pool.query(
      `select
        count(*)::int as order_count,
        coalesce(sum(deposit_jpy), 0)::int as deposit_jpy,
        coalesce(sum(total_jpy), 0)::int as total_jpy,
        coalesce(sum(onsite_due_jpy), 0)::int as onsite_due_jpy
       from orders
       ${where.length ? `where ${where.join(" and ")}` : ""}`,
      params
    );
    res.json({ status: "success", summary: result.rows[0] });
  } catch (error) {
    next(error);
  }
});
