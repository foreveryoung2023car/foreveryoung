import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

export const reportsRouter = Router();

reportsRouter.get("/orders.csv", requireAuth, requirePermission("reports:export"), async (req, res, next) => {
  try {
    const month = typeof req.query.month === "string" ? req.query.month : null;
    const params: string[] = [];
    const where: string[] = [];
    if (month) {
      params.push(`${month}-01`);
      where.push(`date_trunc('month', o.booking_at) = date_trunc('month', $${params.length}::date)`);
    }

    const result = await pool.query(
      `select o.order_no, c.name, c.phone, c.email, s.code as store_code, o.status,
              o.booking_at, o.adults, o.children, o.plan, o.deposit_jpy,
              o.total_jpy, o.onsite_due_jpy, o.created_at
       from orders o
       left join customers c on c.id = o.customer_id
       left join stores s on s.id = o.store_id
       ${where.length ? `where ${where.join(" and ")}` : ""}
       order by o.booking_at`,
      params
    );

    const header = [
      "order_no", "name", "phone", "email", "store_code", "status", "booking_at",
      "adults", "children", "plan", "deposit_jpy", "total_jpy", "onsite_due_jpy", "created_at"
    ];
    const rows = [header, ...result.rows.map((row) => header.map((key) => csvCell(row[key])))];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="kimono-orders${month ? `-${month}` : ""}.csv"`);
    res.send(rows.map((row) => row.join(",")).join("\n"));
  } catch (error) {
    next(error);
  }
});

function csvCell(value: unknown) {
  if (value == null) return "";
  const str = String(value).replace(/"/g, '""');
  return /[",\n]/.test(str) ? `"${str}"` : str;
}
