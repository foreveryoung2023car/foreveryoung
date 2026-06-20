export const roles = [
  "owner",
  "admin",
  "agent",
  "head_store_manager",
  "store_manager",
  "store_staff",
  "accountant",
  "readonly"
] as const;

export type Role = (typeof roles)[number];

export const brandPlatforms = [
  "foreveryoung",
  "japan-go"
] as const;

export type BrandPlatform = (typeof brandPlatforms)[number];

export const defaultBrandPlatform: BrandPlatform = "foreveryoung";
export const defaultPlatformAccess: BrandPlatform[] = [...brandPlatforms];

export function normalizeBrandPlatform(value: unknown): BrandPlatform {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "japan-go" || raw === "japango" || raw === "樂禾" || raw === "楽禾") return "japan-go";
  return "foreveryoung";
}

export function normalizePlatformAccess(value: unknown): BrandPlatform[] {
  if (!Array.isArray(value)) return [...defaultPlatformAccess];
  const allowed = value.map(normalizeBrandPlatform).filter((v, i, arr) => arr.indexOf(v) === i);
  return allowed.length ? allowed : [...defaultPlatformAccess];
}

export function orderBrandPlatform(order: { brandPlatform?: unknown; platformBrand?: unknown }) {
  return normalizeBrandPlatform(order.brandPlatform || order.platformBrand || defaultBrandPlatform);
}

export function platformAccessContains(access: BrandPlatform[] | undefined, platform: unknown) {
  const normalized = normalizePlatformAccess(access);
  return normalized.includes(normalizeBrandPlatform(platform));
}

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
  head_store_manager: ["orders:read", "orders:create", "orders:update", "users:manage", "stores:manage"],
  store_manager: ["orders:read", "orders:create", "orders:update", "users:manage", "stores:manage"],
  store_staff: ["orders:read", "orders:create", "orders:update"],
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
  pending_payment: ["pending_review", "cancelled"],
  pending_review: ["confirmed", "cancelled"],
  confirmed: ["cancelled", "refund_requested"],
  checked_in: ["completed", "balance_due", "refund_requested"],
  completed: ["refund_requested"],
  balance_due: ["completed", "refund_requested"],
  refund_requested: ["refunding"],
  refunding: ["refunded"],
  refunded: [],
  cancelled: ["pending_review", "confirmed"]
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
