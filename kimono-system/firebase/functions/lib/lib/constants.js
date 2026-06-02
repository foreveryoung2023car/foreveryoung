export const roles = [
    "owner",
    "admin",
    "agent",
    "store_manager",
    "store_staff",
    "accountant",
    "readonly"
];
export const permissions = [
    "orders:read",
    "orders:create",
    "orders:update",
    "orders:transition",
    "checkins:create",
    "refunds:request",
    "refunds:pay",
    "audit:read"
];
export const rolePermissions = {
    owner: [...permissions],
    admin: [
        "orders:read",
        "orders:create",
        "orders:update",
        "orders:transition",
        "checkins:create",
        "refunds:request",
        "refunds:pay",
        "audit:read"
    ],
    agent: [
        "orders:read",
        "orders:create",
        "orders:update",
        "orders:transition",
        "checkins:create",
        "refunds:request"
    ],
    store_manager: [
        "orders:read",
        "orders:update",
        "orders:transition",
        "checkins:create"
    ],
    store_staff: [
        "orders:read",
        "checkins:create"
    ],
    accountant: [
        "orders:read",
        "refunds:pay",
        "audit:read"
    ],
    readonly: [
        "orders:read"
    ]
};
export function hasPermission(role, permission) {
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
];
export const allowedTransitions = {
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
export function assertTransition(from, to) {
    if (!allowedTransitions[from]?.includes(to)) {
        throw new HttpError(400, `Invalid order transition: ${from} -> ${to}`);
    }
}
export class HttpError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
//# sourceMappingURL=constants.js.map