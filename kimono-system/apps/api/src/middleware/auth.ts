import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { hasPermission, type Permission, type Role } from "@kimono/shared";
import { config } from "../config.js";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  storeId?: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const secret = new TextEncoder().encode(config.jwtSecret);

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ status: "unauthorized", message: "Missing token" });

    const { payload } = await jwtVerify(token, secret);
    req.user = {
      id: String(payload.sub),
      email: String(payload.email || ""),
      role: String(payload.role || "readonly"),
      storeId: payload.storeId ? String(payload.storeId) : null
    };
    next();
  } catch {
    res.status(401).json({ status: "unauthorized", message: "Invalid token" });
  }
}

export function requireRole(allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ status: "error", message: "Permission denied" });
    }
    next();
  };
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role as Role | undefined;
    if (!role || !hasPermission(role, permission)) {
      return res.status(403).json({ status: "error", message: "Permission denied" });
    }
    next();
  };
}
