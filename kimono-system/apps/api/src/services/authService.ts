import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { config } from "../config.js";
import { pool } from "../db/pool.js";
import { writeAuditLog } from "./auditService.js";

const secret = new TextEncoder().encode(config.jwtSecret);

export async function login(email: string, password: string, meta: { ip?: string; userAgent?: string }) {
  const result = await pool.query(
    "select id, email, display_name, role, store_id, password_hash, active from app_users where email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user || !user.active || !user.password_hash) {
    return { status: "error", message: "Invalid email or password" };
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return { status: "error", message: "Invalid email or password" };

  await pool.query("update app_users set last_login_at = now() where id = $1", [user.id]);
  await writeAuditLog(pool, {
    actorId: user.id,
    actorLabel: user.email,
    action: "login",
    metadata: { role: user.role, storeId: user.store_id },
    ipAddress: meta.ip,
    userAgent: meta.userAgent
  });

  const token = await new SignJWT({
    email: user.email,
    role: user.role,
    storeId: user.store_id
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);

  return {
    status: "success",
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      storeId: user.store_id
    }
  };
}
