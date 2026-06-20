import { db } from "../lib/firebase.js";
import type { AuthContext } from "../lib/auth.js";
import { orderBrandPlatform, platformAccessContains } from "../lib/constants.js";

export async function listAuditLogs(limit = 200, actor?: AuthContext) {
  const snap = await db.collection("auditLogs")
    .orderBy("createdAt", "desc")
    .limit(Math.min(limit, 500))
    .get();
  const logs: Array<Record<string, unknown>> = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (!actor) return { status: "success", logs };

  const orderIds = [...new Set(logs.map((log) => String(log.orderId || "")).filter(Boolean))];
  const allowedOrders = new Set<string>();
  for (const orderId of orderIds) {
    const orderSnap = await db.collection("orders").doc(orderId).get();
    if (orderSnap.exists && platformAccessContains(actor.platformAccess, orderBrandPlatform(orderSnap.data() || {}))) {
      allowedOrders.add(orderId);
    }
  }
  return {
    status: "success",
    logs: logs.filter((log) => !log.orderId || allowedOrders.has(String(log.orderId)))
  };
}
