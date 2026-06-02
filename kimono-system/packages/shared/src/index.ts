export const orderStatuses = [
  "draft",
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
  "finance:read",
  "reconcile:read",
  "reconcile:write",
  "audit:read",
  "reports:export",
  "users:manage",
  "settings:manage"
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<Role, Permission[]> = {
  owner: [...permissions],
  admin: [
    "orders:read",
    "orders:create",
    "orders:update",
    "orders:transition",
    "checkins:create",
    "refunds:request",
    "refunds:pay",
    "finance:read",
    "reconcile:read",
    "reconcile:write",
    "audit:read",
    "reports:export",
    "users:manage"
  ],
  agent: [
    "orders:read",
    "orders:create",
    "orders:update",
    "orders:transition",
    "checkins:create",
    "refunds:request",
    "reconcile:read"
  ],
  store_manager: [
    "orders:read",
    "orders:update",
    "checkins:create",
    "finance:read",
    "reports:export"
  ],
  store_staff: [
    "orders:read",
    "checkins:create"
  ],
  accountant: [
    "orders:read",
    "refunds:pay",
    "finance:read",
    "reconcile:read",
    "reconcile:write",
    "reports:export",
    "audit:read"
  ],
  readonly: [
    "orders:read",
    "finance:read"
  ]
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export const orderEvents = [
  "booking_created",
  "proof_uploaded",
  "payment_reviewed",
  "order_confirmed",
  "order_checked_in",
  "order_completed",
  "refund_requested",
  "refund_approved",
  "refund_paid",
  "order_cancelled",
  "order_patched",
  "reconcile_matched",
  "month_closed",
  "month_unlocked"
] as const;

export type OrderEvent = (typeof orderEvents)[number];

export const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending_payment", "cancelled"],
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

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return allowedTransitions[from]?.includes(to) ?? false;
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid order transition: ${from} -> ${to}`);
  }
}

export type MoneyBreakdown = {
  depositJpy: number;
  kimonoPriceJpy: number;
  hairFeeJpy: number;
  photoFeeJpy: number;
  discountRate: number;
};

export function calculateOrderTotal(input: MoneyBreakdown) {
  const discountRate = input.discountRate > 0 ? input.discountRate : 10;
  const discountedKimono = Math.round(input.kimonoPriceJpy * discountRate / 10);
  const totalJpy = discountedKimono + input.hairFeeJpy + input.photoFeeJpy;
  const onsiteDueJpy = Math.max(0, totalJpy - input.depositJpy);
  return { discountedKimono, totalJpy, onsiteDueJpy };
}
