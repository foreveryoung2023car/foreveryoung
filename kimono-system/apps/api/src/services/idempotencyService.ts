import type { DbClient } from "../db/pool.js";

export async function getIdempotentResponse(db: DbClient, key?: string) {
  if (!key) return null;
  const result = await db.query("select response from idempotency_keys where key = $1", [key]);
  return result.rows[0]?.response ?? null;
}

export async function rememberIdempotentResponse(db: DbClient, key: string | undefined, response: unknown) {
  if (!key) return response;
  await db.query(
    `insert into idempotency_keys (key, response)
     values ($1, $2)
     on conflict (key) do update set response = excluded.response`,
    [key, JSON.stringify(response)]
  );
  return response;
}
