import type { AuthUser } from "../middleware/auth.js";
import { withTransaction } from "../db/pool.js";
import { writeAuditLog } from "./auditService.js";

export async function requestRefund(orderId: string, input: {
  reason: string;
  requestedAmountJpy?: number;
  bankCode?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  contactPhone?: string;
}, actor?: AuthUser) {
  return withTransaction(async (client) => {
    const order = await client.query("select * from orders where id = $1", [orderId]);
    if (!order.rows[0]) return { status: "error", message: "Order not found" };

    const refund = await client.query(
      `insert into refund_requests (
        order_id, reason, requested_amount_jpy, bank_code, bank_name,
        bank_account, bank_account_name, contact_phone
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning *`,
      [
        orderId,
        input.reason,
        input.requestedAmountJpy ?? null,
        input.bankCode ?? null,
        input.bankName ?? null,
        input.bankAccount ?? null,
        input.bankAccountName ?? null,
        input.contactPhone ?? null
      ]
    );

    const updated = await client.query(
      "update orders set status = 'refund_requested', updated_at = now() where id = $1 returning *",
      [orderId]
    );

    await writeAuditLog(client, {
      orderId,
      actorId: actor?.id ?? null,
      actorLabel: actor?.email ?? "customer",
      action: "refund_requested",
      beforeData: order.rows[0],
      afterData: updated.rows[0],
      metadata: { refundRequestId: refund.rows[0].id }
    });

    return { status: "success", refund: refund.rows[0], order: updated.rows[0] };
  });
}

export async function markRefundPaid(refundId: string, amountJpy: number, actor: AuthUser) {
  return withTransaction(async (client) => {
    const before = await client.query("select * from refund_requests where id = $1", [refundId]);
    if (!before.rows[0]) return { status: "error", message: "Refund not found" };

    const refund = await client.query(
      `update refund_requests
       set status = 'paid', approved_amount_jpy = $2, paid_at = now(), handled_by = $3
       where id = $1 returning *`,
      [refundId, amountJpy, actor.id]
    );

    const order = await client.query(
      "update orders set status = 'refunded', updated_at = now(), updated_by = $2 where id = $1 returning *",
      [refund.rows[0].order_id, actor.id]
    );

    await client.query(
      `insert into payments (order_id, kind, amount_jpy, received_at, reconciled_at, reconciled_by)
       values ($1, 'refund', $2, now(), now(), $3)`,
      [refund.rows[0].order_id, -Math.abs(amountJpy), actor.id]
    );

    await writeAuditLog(client, {
      orderId: refund.rows[0].order_id,
      actorId: actor.id,
      actorLabel: actor.email,
      action: "refund_paid",
      beforeData: before.rows[0],
      afterData: refund.rows[0],
      metadata: { amountJpy }
    });

    return { status: "success", refund: refund.rows[0], order: order.rows[0] };
  });
}
