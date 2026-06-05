export const roles = [
  "owner",
  "admin",
  "agent",
  "store_manager",
  "store_staff",
  "accountant",
  "readonly"
] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "orders:read",
  "orders:create",
  "orders:update",
  "orders:transition",
  "checkins:create",
  "refunds:request",
  "refunds:pay",
  "audit:read",
  "users:manage"
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<Role, Permission[]> = {
  owner: [...permissions],
  admin: ["orders:read", "orders:create", "orders:update", "orders:transition", "checkins:create", "refunds:request", "refunds:pay", "audit:read", "users:manage"],
  agent: ["orders:read", "orders:create", "orders:update", "orders:transition", "checkins:create", "refunds:request"],
  store_manager: ["orders:read", "orders:create", "orders:update", "orders:transition", "checkins:create", "users:manage"],
  store_staff: ["orders:read", "orders:create", "checkins:create"],
  accountant: ["orders:read", "refunds:pay", "audit:read"],
  readonly: ["orders:read"]
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export const orderStatuses = [
  "pending_payment",
  "pending_review",
  "confirmed",
  "checked_in",
  "completed",
  "refund_requested",
  "refunding",
  "refunded",
  "cancelled"
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["pending_review", "cancelled"],
  pending_review: ["confirmed", "pending_payment", "cancelled"],
  confirmed: ["checked_in", "refund_requested", "cancelled"],
  checked_in: ["completed", "refund_requested"],
  completed: ["refund_requested"],
  refund_requested: ["refunding", "confirmed", "cancelled"],
  refunding: ["refunded", "confirmed"],
  refunded: [],
  cancelled: []
};

export function assertTransition(from: OrderStatus, to: OrderStatus) {
  if (!allowedTransitions[from]?.includes(to)) {
    throw new HttpError(400, `Invalid order transition: ${from} -> ${to}`);
  }
}

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}
