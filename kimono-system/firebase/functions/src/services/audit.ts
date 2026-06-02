import { db } from "../lib/firebase.js";

export async function listAuditLogs(limit = 200) {
  const snap = await db.collection("auditLogs")
    .orderBy("createdAt", "desc")
    .limit(Math.min(limit, 500))
    .get();

  return {
    status: "success",
    logs: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  };
}
