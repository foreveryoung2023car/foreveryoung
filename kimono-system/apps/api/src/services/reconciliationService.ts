import type { AuthUser } from "../middleware/auth.js";
import { withTransaction } from "../db/pool.js";
import { pool } from "../db/pool.js";
import { writeAuditLog } from "./auditService.js";

export type BankLineInput = {
  bankRowNo?: string;
  bankPostedAt?: string;
  amountJpy: number;
  description?: string;
  orderNo?: string;
};

export async function listReconciliationItems(query: { state?: string }) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (query.state) {
    params.push(query.state);
    where.push(`r.state = $${params.length}`);
  }

  const result = await pool.query(
    `select r.*, o.order_no, c.name as customer_name
     from reconciliation_items r
     left join orders o on o.id = r.order_id
     left join customers c on c.id = o.customer_id
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by r.created_at desc
     limit 300`,
    params
  );
  return { status: "success", items: result.rows };
}

export async function importBankLines(lines: BankLineInput[], actor: AuthUser) {
  return withTransaction(async (client) => {
    const imported = [];
    for (const line of lines) {
      const order = line.orderNo
        ? await client.query("select * from orders where order_no = $1", [line.orderNo])
        : { rows: [] };
      const orderRow = order.rows[0];
      const state = orderRow ? classifyPayment(Number(line.amountJpy), Number(orderRow.deposit_jpy), Number(orderRow.total_jpy)) : "unmatched";

      const inserted = await client.query(
        `insert into reconciliation_items (
          order_id, bank_row_no, bank_posted_at, bank_amount_jpy, bank_description,
          state, matched_by, matched_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, case when $1 is null then null else now() end)
        returning *`,
        [
          orderRow?.id ?? null,
          line.bankRowNo ?? null,
          line.bankPostedAt ?? null,
          line.amountJpy,
          line.description ?? null,
          state,
          orderRow ? actor.id : null
        ]
      );
      imported.push(inserted.rows[0]);

      if (orderRow && state === "matched") {
        const payment = await client.query(
          `insert into payments (order_id, kind, amount_jpy, method, received_at, reconciled_at, reconciled_by)
           values ($1, 'deposit', $2, 'bank', coalesce($3::timestamptz, now()), now(), $4)
           returning *`,
          [orderRow.id, line.amountJpy, line.bankPostedAt ?? null, actor.id]
        );
        await client.query("update reconciliation_items set payment_id = $2 where id = $1", [inserted.rows[0].id, payment.rows[0].id]);
      }
    }

    await writeAuditLog(client, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "reconcile_matched",
      metadata: { importedCount: imported.length }
    });

    return { status: "success", imported };
  });
}

export async function manuallyMatchReconciliation(itemId: string, orderId: string, actor: AuthUser) {
  return withTransaction(async (client) => {
    const before = await client.query("select * from reconciliation_items where id = $1", [itemId]);
    if (!before.rows[0]) return { status: "error", message: "Reconciliation item not found" };
    const order = await client.query("select * from orders where id = $1", [orderId]);
    if (!order.rows[0]) return { status: "error", message: "Order not found" };

    const state = classifyPayment(Number(before.rows[0].bank_amount_jpy), Number(order.rows[0].deposit_jpy), Number(order.rows[0].total_jpy));
    const updated = await client.query(
      `update reconciliation_items
       set order_id = $2, state = $3, matched_by = $4, matched_at = now(), updated_at = now()
       where id = $1 returning *`,
      [itemId, orderId, state, actor.id]
    );

    await writeAuditLog(client, {
      orderId,
      actorId: actor.id,
      actorLabel: actor.email,
      action: "reconcile_matched",
      beforeData: before.rows[0],
      afterData: updated.rows[0]
    });

    return { status: "success", item: updated.rows[0] };
  });
}

function classifyPayment(amountJpy: number, depositJpy: number, totalJpy: number) {
  if (amountJpy < 0) return "refunded";
  if (totalJpy > 0 && amountJpy > totalJpy) return "overpaid";
  if (depositJpy > 0 && amountJpy < depositJpy) return "partial";
  return "matched";
}
