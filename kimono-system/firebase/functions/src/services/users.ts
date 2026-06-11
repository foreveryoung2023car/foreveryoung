import { z } from "zod";
import { auth, db, FieldValue } from "../lib/firebase.js";
import { HttpError, roles } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";

const roleSchema = z.enum(roles);
const ownerAssignableRoles = ["admin", "agent", "head_store_manager", "store_manager", "store_staff", "accountant", "readonly"];
const adminAssignableRoles = ["agent", "head_store_manager", "store_manager", "store_staff", "accountant", "readonly"];
const storeManagerAssignableRoles = ["store_staff", "accountant", "readonly"];

function isStoreManagerRole(role: string | undefined) {
  return role === "head_store_manager" || role === "store_manager";
}

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

function assignableRoles(actor: AuthContext) {
  if (actor.role === "owner") return ownerAssignableRoles;
  if (actor.role === "admin") return adminAssignableRoles;
  if (isStoreManagerRole(actor.role)) return storeManagerAssignableRoles;
  return [];
}

function assertAssignableRole(actor: AuthContext, targetRole?: string) {
  const allowed = assignableRoles(actor);
  if (!targetRole || !allowed.includes(targetRole)) {
    throw new HttpError(403, `Cannot assign role: ${targetRole || "unknown"}`);
  }
}

function assertSameStoreForStoreManager(actor: AuthContext, targetStoreId: string | null | undefined) {
  if (!isStoreManagerRole(actor.role)) return;
  if (!actor.storeId) throw new HttpError(403, "Store manager has no storeId");
  if (targetStoreId !== actor.storeId) throw new HttpError(403, "Cannot manage users from another store");
}

function normalizedStoreIdForCreate(actor: AuthContext, inputStoreId?: string | null) {
  if (isStoreManagerRole(actor.role)) {
    if (!actor.storeId) throw new HttpError(403, "Store manager has no storeId");
    return actor.storeId;
  }
  return inputStoreId || null;
}

function assertManageable(actor: AuthContext, target: { role?: string; storeId?: string | null }) {
  assertAssignableRole(actor, target.role);
  assertSameStoreForStoreManager(actor, target.storeId || null);
}

function canListUser(actor: AuthContext, target: { role?: string; storeId?: string | null }) {
  if (!assignableRoles(actor).includes(String(target.role || ""))) return false;
  if (isStoreManagerRole(actor.role)) {
    if (!actor.storeId) return false;
    return target.storeId === actor.storeId;
  }
  return true;
}

export async function listAdminUsers(actor: AuthContext) {
  if (!assignableRoles(actor).length) throw new HttpError(403, "Permission denied");
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection("users");
  if (isStoreManagerRole(actor.role)) {
    if (!actor.storeId) throw new HttpError(403, "Store manager has no storeId");
    query = query.where("storeId", "==", actor.storeId);
  }
  const snap = await query.limit(200).get();
  const visibleDocs = snap.docs.filter((doc) => {
    const data = doc.data();
    return canListUser(actor, { role: data.role || "readonly", storeId: data.storeId || null });
  });
  const authUsers = new Map<string, Awaited<ReturnType<typeof auth.getUser>>>();
  for (let offset = 0; offset < visibleDocs.length; offset += 100) {
    const batch = visibleDocs.slice(offset, offset + 100);
    const result = await auth.getUsers(batch.map((doc) => ({ uid: doc.id })));
    result.users.forEach((user) => authUsers.set(user.uid, user));
  }
  const users = visibleDocs.map((doc) => {
    const data = doc.data();
    const authUser = authUsers.get(doc.id);
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
  });
  users.sort((a, b) => String(a.displayName || a.email || "").localeCompare(String(b.displayName || b.email || "")));
  return { status: "success", users };
}

export async function createAdminUser(raw: unknown, actor: AuthContext) {
  const input = createAdminUserSchema.parse(raw);
  assertAssignableRole(actor, input.role);
  const storeId = normalizedStoreIdForCreate(actor, input.storeId);
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
    storeId,
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
    metadata: { email: input.email, role: input.role, storeId }
  });
  return { status: "success", user: { uid: user.uid, email: input.email, displayName: input.displayName, role: input.role, active: input.active !== false, storeId } };
}

export async function setAdminUserActive(raw: unknown, actor: AuthContext) {
  const input = setAdminUserActiveSchema.parse(raw);
  const docRef = db.collection("users").doc(input.uid);
  const snap = await docRef.get();
  if (!snap.exists) throw new HttpError(404, "User profile not found");
  const before = snap.data()!;
  assertManageable(actor, { role: before.role, storeId: before.storeId || null });
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
  const target = snap.data()!;
  assertManageable(actor, { role: target.role, storeId: target.storeId || null });
  await auth.updateUser(input.uid, { password: input.password });
  await writeAuditLog({
    actor,
    action: "admin_user_password_reset",
    metadata: { uid: input.uid }
  });
  return { status: "success" };
}
