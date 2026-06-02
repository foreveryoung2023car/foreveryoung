import { assertTransition, calculateOrderTotal, type OrderStatus } from "@kimono/shared";
import type { AuthUser } from "../middleware/auth.js";
import type { DbClient } from "../db/pool.js";
import { withTransaction } from "../db/pool.js";
import { getIdempotentResponse, rememberIdempotentResponse } from "./idempotencyService.js";
import { nextOrderNo } from "./orderNumberService.js";
import { writeAuditLog } from "./auditService.js";

export type CreateOrderInput = {
  clientRequestId?: string;
  name: string;
  phone: string;
  email?: string;
  storeCode?: string;
  bookingAt: string;
  adults: number;
  children: number;
  plan?: string;
  hair?: boolean;
  photo?: boolean;
  source?: string;
  platform?: string;
  couponCode?: string;
  discountRate?: number;
  depositJpy?: number;
  kimonoPriceJpy?: number;
  hairFeeJpy?: number;
  photoFeeJpy?: number;
  proofUrl?: string;
  proofNote?: string;
  last5?: string;
};

export async function createOrder(input: CreateOrderInput, actor?: AuthUser) {
  return withTransaction(async (client) => {
    const cached = await getIdempotentResponse(client, input.clientRequestId);
    if (cached) return cached;

    const orderNo = await nextOrderNo(client);
    const store = input.storeCode
      ? await client.query("select id from stores where code = $1 and active = true", [input.storeCode])
      : null;
    const storeId = store?.rows[0]?.id ?? null;

    const customer = await upsertCustomer(client, {
      name: input.name,
      phone: input.phone,
      email: input.email
    });

    const total = calculateOrderTotal({
      depositJpy: input.depositJpy ?? 0,
      kimonoPriceJpy: input.kimonoPriceJpy ?? 0,
      hairFeeJpy: input.hairFeeJpy ?? 0,
      photoFeeJpy: input.photoFeeJpy ?? 0,
      discountRate: input.discountRate ?? 10
    });

    const inserted = await client.query(
      `insert into orders (
        order_no, customer_id, store_id, status, booking_at, adults, children, plan,
        hair, photo, source, platform, coupon_code, discount_rate, deposit_jpy,
        kimono_price_jpy, hair_fee_jpy, photo_fee_jpy, total_jpy, onsite_due_jpy,
        proof_url, proof_note, last5, created_by, updated_by
      )
      values (
        $1, $2, $3, 'pending_review', $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $23
      )
      returning *`,
      [
        orderNo,
        customer.id,
        storeId,
        input.bookingAt,
        input.adults,
        input.children,
        input.plan ?? null,
        input.hair ?? false,
        input.photo ?? false,
        input.source ?? "web",
        input.platform ?? null,
        input.couponCode ?? null,
        input.discountRate ?? 10,
        input.depositJpy ?? 0,
        input.kimonoPriceJpy ?? 0,
        input.hairFeeJpy ?? 0,
        input.photoFeeJpy ?? 0,
        total.totalJpy,
        total.onsiteDueJpy,
        input.proofUrl ?? null,
        input.proofNote ?? null,
        input.last5 ?? null,
        actor?.id ?? null
      ]
    );

    await writeAuditLog(client, {
      orderId: inserted.rows[0].id,
      actorId: actor?.id ?? null,
      actorLabel: actor?.email ?? input.source ?? "web",
      action: "booking_created",
      afterData: inserted.rows[0],
      metadata: { clientRequestId: input.clientRequestId }
    });

    const response = { status: "success", order: inserted.rows[0] };
    return rememberIdempotentResponse(client, input.clientRequestId, response);
  });
}

export async function listOrders(db: DbClient, user: AuthUser, query: { status?: string; search?: string }) {
  const params: unknown[] = [];
  const where: string[] = [];

  if (query.status) {
    params.push(query.status);
    where.push(`o.status = $${params.length}`);
  }
  if (user.role === "store_manager" || user.role === "store_staff") {
    params.push(user.storeId);
    where.push(`o.store_id = $${params.length}`);
  }
  if (query.search) {
    params.push(`%${query.search}%`);
    where.push(`(o.order_no ilike $${params.length} or c.name ilike $${params.length} or c.phone ilike $${params.length})`);
  }

  const sql = `
    select o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
           s.code as store_code, s.name as store_name
    from orders o
    left join customers c on c.id = o.customer_id
    left join stores s on s.id = o.store_id
    ${where.length ? `where ${where.join(" and ")}` : ""}
    order by o.booking_at desc
    limit 200`;
  const result = await db.query(sql, params);
  return { status: "success", orders: result.rows };
}

export async function patchOrder(orderId: string, fields: Record<string, unknown>, user: AuthUser) {
  return withTransaction(async (client) => {
    const before = await getOrderById(client, orderId);
    if (!before) return { status: "error", message: "Order not found" };
    assertStoreScope(before, user);

    const allowed = [
      "booking_at", "adults", "children", "plan", "hair", "photo", "coupon_code",
      "discount_rate", "deposit_jpy", "kimono_price_jpy", "hair_fee_jpy", "photo_fee_jpy",
      "proof_url", "proof_note", "note", "store_id"
    ];
    const entries = Object.entries(fields).filter(([key]) => allowed.includes(key));
    if (!entries.length) return { status: "success", order: before };

    const patch: Record<string, unknown> = Object.fromEntries(entries);
    const total = calculateOrderTotal({
      depositJpy: Number(patch.deposit_jpy ?? before.deposit_jpy ?? 0),
      kimonoPriceJpy: Number(patch.kimono_price_jpy ?? before.kimono_price_jpy ?? 0),
      hairFeeJpy: Number(patch.hair_fee_jpy ?? before.hair_fee_jpy ?? 0),
      photoFeeJpy: Number(patch.photo_fee_jpy ?? before.photo_fee_jpy ?? 0),
      discountRate: Number(patch.discount_rate ?? before.discount_rate ?? 10)
    });
    patch.total_jpy = total.totalJpy;
    patch.onsite_due_jpy = total.onsiteDueJpy;
    patch.updated_by = user.id;
    patch.updated_at = new Date();

    const columns = Object.keys(patch);
    const values = Object.values(patch);
    const setSql = columns.map((column, index) => `${column} = $${index + 2}`).join(", ");
    const updated = await client.query(
      `update orders set ${setSql} where id = $1 returning *`,
      [orderId, ...values]
    );

    await writeAuditLog(client, {
      orderId,
      actorId: user.id,
      actorLabel: user.email,
      action: "order_patched",
      beforeData: before,
      afterData: updated.rows[0],
      metadata: { updatedFields: columns }
    });

    return { status: "success", order: updated.rows[0] };
  });
}

export async function transitionOrder(orderId: string, nextStatus: OrderStatus, user: AuthUser) {
  return withTransaction(async (client) => {
    const before = await getOrderById(client, orderId);
    if (!before) return { status: "error", message: "Order not found" };
    assertStoreScope(before, user);
    assertTransition(before.status, nextStatus);

    const updated = await client.query(
      `update orders set status = $2, updated_by = $3, updated_at = now()
       where id = $1 returning *`,
      [orderId, nextStatus, user.id]
    );

    await writeAuditLog(client, {
      orderId,
      actorId: user.id,
      actorLabel: user.email,
      action: nextStatus === "confirmed" ? "order_confirmed" : "order_patched",
      beforeData: before,
      afterData: updated.rows[0],
      metadata: { transition: `${before.status}->${nextStatus}` }
    });

    return { status: "success", order: updated.rows[0] };
  });
}

async function upsertCustomer(db: DbClient, input: { name: string; phone: string; email?: string }) {
  const result = await db.query(
    `insert into customers (name, phone, email)
     values ($1, $2, $3)
     on conflict (phone, email) do update
       set name = excluded.name, updated_at = now()
     returning *`,
    [input.name, input.phone, input.email ?? null]
  );
  return result.rows[0];
}

async function getOrderById(db: DbClient, orderId: string) {
  const result = await db.query("select * from orders where id = $1", [orderId]);
  return result.rows[0] ?? null;
}

function assertStoreScope(order: { store_id?: string | null }, user: AuthUser) {
  if (user.role === "store_manager" || user.role === "store_staff") {
    if (!user.storeId || order.store_id !== user.storeId) {
      throw new Error("Permission denied for this store");
    }
  }
}
