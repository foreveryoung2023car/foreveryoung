import { z } from "zod";
import { auth, db, FieldValue } from "../lib/firebase.js";
import { HttpError, roles } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";

const roleSchema = z.enum(roles);

export const createAdminUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1),
  role: roleSchema,
  active: z.boolean().optional(),
  storeId: z.string().nullable().optional()
});

export const setAdminUserActiveSchema = z.object({
  uid: z.string().min(1),
  active: z.boolean()
});

export const resetAdminUserPasswordSchema = z.object({
  uid: z.string().min(1),
  password: z.string().min(6)
});

function assertManageable(actor: AuthContext, targetRole?: string) {
  if (actor.role === "owner") return;
  if (actor.role !== "admin") throw new HttpError(403, "Permission denied");
  if (targetRole === "owner") throw new HttpError(403, "Only owner can manage owner users");
}

export async function listAdminUsers(actor: AuthContext) {
  assertManageable(actor);
  const snap = await db.collection("users").orderBy("displayName").limit(200).get();
  const users = await Promise.all(snap.docs.map(async (doc) => {
    const data = doc.data();
    let authUser: Awaited<ReturnType<typeof auth.getUser>> | null = null;
    try {
      authUser = await auth.getUser(doc.id);
    } catch {
      authUser = null;
    }
    return {
      uid: doc.id,
      email: authUser?.email || data.email || "",
      displayName: data.displayName || authUser?.displayName || authUser?.email || doc.id,
      role: data.role || "readonly",
      active: data.active !== false && !authUser?.disabled,
      storeId: data.storeId || null,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
      lastSignInAt: authUser?.metadata?.lastSignInTime || null
    };
  }));
  return { status: "success", users };
}

export async function createAdminUser(raw: unknown, actor: AuthContext) {
  const input = createAdminUserSchema.parse(raw);
  assertManageable(actor, input.role);
  const user = await auth.createUser({
    email: input.email,
    password: input.password,
    displayName: input.displayName,
    disabled: input.active === false
  });
  const userDoc = {
    email: input.email,
    displayName: input.displayName,
    role: input.role,
    active: input.active !== false,
    storeId: input.storeId || null,
    createdBy: actor.uid,
    updatedBy: actor.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
  await db.collection("users").doc(user.uid).set(userDoc);
  await writeAuditLog({
    actor,
    action: "admin_user_created",
    afterData: { uid: user.uid, ...userDoc, createdAt: null, updatedAt: null },
    metadata: { email: input.email, role: input.role }
  });
  return { status: "success", user: { uid: user.uid, email: input.email, displayName: input.displayName, role: input.role, active: input.active !== false } };
}

export async function setAdminUserActive(raw: unknown, actor: AuthContext) {
  const input = setAdminUserActiveSchema.parse(raw);
  const docRef = db.collection("users").doc(input.uid);
  const snap = await docRef.get();
  if (!snap.exists) throw new HttpError(404, "User profile not found");
  const before = snap.data()!;
  assertManageable(actor, before.role);
  if (input.uid === actor.uid && input.active === false) throw new HttpError(400, "Cannot disable current user");
  await auth.updateUser(input.uid, { disabled: !input.active });
  await docRef.update({
    active: input.active,
    updatedBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp()
  });
  await writeAuditLog({
    actor,
    action: input.active ? "admin_user_enabled" : "admin_user_disabled",
    beforeData: { uid: input.uid, ...before },
    afterData: { uid: input.uid, ...before, active: input.active },
    metadata: { uid: input.uid }
  });
  return { status: "success" };
}

export async function resetAdminUserPassword(raw: unknown, actor: AuthContext) {
  const input = resetAdminUserPasswordSchema.parse(raw);
  const snap = await db.collection("users").doc(input.uid).get();
  if (!snap.exists) throw new HttpError(404, "User profile not found");
  assertManageable(actor, snap.data()?.role);
  await auth.updateUser(input.uid, { password: input.password });
  await writeAuditLog({
    actor,
    action: "admin_user_password_reset",
    metadata: { uid: input.uid }
  });
  return { status: "success" };
}
