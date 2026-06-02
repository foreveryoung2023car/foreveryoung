import type pg from "pg";

export async function nextOrderNo(client: pg.PoolClient) {
  const now = new Date();
  const tokyo = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const yy = tokyo.find((p) => p.type === "year")?.value ?? "00";
  const mm = tokyo.find((p) => p.type === "month")?.value ?? "00";
  const dd = tokyo.find((p) => p.type === "day")?.value ?? "00";
  const prefix = `K${yy}${mm}${dd}`;

  const result = await client.query(
    `select order_no from orders
     where order_no like $1
     order by order_no desc
     limit 1
     for update`,
    [`${prefix}%`]
  );
  const last = result.rows[0]?.order_no as string | undefined;
  const seq = last ? Number(last.slice(-3)) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}
