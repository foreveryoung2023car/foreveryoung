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
  "users:manage",
  "stores:manage"
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<Role, Permission[]> = {
  owner: [...permissions],
  admin: ["orders:read", "orders:create", "orders:update", "orders:transition", "checkins:create", "refunds:request", "refunds:pay", "audit:read", "users:manage", "stores:manage"],
  agent: ["orders:read", "orders:create", "orders:update", "orders:transition", "checkins:create", "refunds:request"],
  store_manager: ["orders:read", "orders:create", "orders:update", "checkins:create", "users:manage", "stores:manage"],
  store_staff: ["orders:read", "orders:create", "orders:update", "checkins:create"],
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
  "balance_due",
  "completed",
  "refund_requested",
  "refunding",
  "refunded",
  "cancelled"
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export function resolveOrderStatus(order: {
  status?: unknown;
  confirmed?: unknown;
  checkedInAt?: unknown;
  refundAmountJpy?: unknown;
  refundTime?: unknown;
}): OrderStatus {
  const status = String(order.status || "");
  if ((orderStatuses as readonly string[]).includes(status)) return status as OrderStatus;
  if (Number(order.refundAmountJpy || 0) > 0 && order.refundTime) return "refunded";
  if (Number(order.refundAmountJpy || 0) > 0) return "refunding";
  if (order.checkedInAt) return "checked_in";
  if (order.confirmed === true || order.confirmed === "true" || order.confirmed === "TRUE") return "confirmed";
  return "pending_review";
}

export const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["pending_review"],
  pending_review: ["confirmed"],
  confirmed: ["checked_in", "refund_requested"],
  checked_in: ["completed", "balance_due", "refund_requested"],
  completed: ["refund_requested"],
  balance_due: ["completed", "refund_requested"],
  refund_requested: ["refunding"],
  refunding: ["refunded"],
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
