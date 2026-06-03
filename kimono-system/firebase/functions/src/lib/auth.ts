import type { Request } from "express";
import { auth, db } from "./firebase.js";
import { hasPermission, HttpError, type Permission, type Role } from "./constants.js";

export type AuthContext = {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  storeId?: string | null;
};

export async function requireAuth(req: Request): Promise<AuthContext> {
  const token = getBearerToken(req);
  if (!token) throw new HttpError(401, "Missing auth token");
  const decoded = await auth.verifyIdToken(token);
  const userDoc = await db.collection("users").doc(decoded.uid).get();
  const user = userDoc.data();
  if (!user || user.active === false) throw new HttpError(403, "User disabled");
  return {
    uid: decoded.uid,
    email: decoded.email || user.email || "",
    displayName: user.displayName || decoded.name || decoded.email || decoded.uid,
    role: user.role,
    storeId: user.storeId || null
  };
}

export async function requirePermission(req: Request, permission: Permission): Promise<AuthContext> {
  const user = await requireAuth(req);
  if (!hasPermission(user.role, permission)) {
    throw new HttpError(403, "Permission denied");
  }
  return user;
}

function getBearerToken(req: Request) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}
