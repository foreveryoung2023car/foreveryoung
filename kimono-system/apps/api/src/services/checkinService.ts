import type { AuthUser } from "../middleware/auth.js";
import { withTransaction } from "../db/pool.js";
import { writeAuditLog } from "./auditService.js";

export async function checkInOrder(orderId: string, input: { source: "self" | "staff"; last5?: string }, actor?: AuthUser) {
  return withTransaction(async (client) => {
    const before = await client.query("select * from orders where id = $1", [orderId]);
    const order = before.rows[0];
    if (!order) return { status: "error", message: "Order not found" };
    if (order.last5 && input.last5 && order.last5 !== input.last5) {
      return { status: "error", message: "Phone verification failed" };
    }

    const checkin = await client.query(
      `insert into checkins (order_id, store_id, checked_in_by, source, last5)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [orderId, order.store_id, actor?.id ?? null, input.source, input.last5 ?? null]
    );

    const updated = await client.query(
      "update orders set status = 'checked_in', updated_at = now(), updated_by = $2 where id = $1 returning *",
      [orderId, actor?.id ?? null]
    );

    await writeAuditLog(client, {
      orderId,
      actorId: actor?.id ?? null,
      actorLabel: actor?.email ?? input.source,
      action: "order_checked_in",
      beforeData: before.rows[0],
      afterData: updated.rows[0],
      metadata: { checkinId: checkin.rows[0].id, source: input.source }
    });

    return { status: "success", checkin: checkin.rows[0], order: updated.rows[0] };
  });
}
