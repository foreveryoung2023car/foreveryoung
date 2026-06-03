import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT || "foreveryoung-kimono-prod" });

const db = getFirestore();
const snap = await db.collection("orders").orderBy("createdAt", "desc").limit(500).get();

function valueText(value) {
  return String(value || "").trim().toLowerCase();
}

function isPlaceholderPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return false;
  return /^(0+|1+|9+)$/.test(digits) || digits.includes("000000") || digits.includes("123456");
}

function reasonsFor(order) {
  const reasons = [];
  const orderNo = valueText(order.orderNo);
  const name = valueText(order.customerName);
  const email = valueText(order.customerEmail);
  const source = valueText(order.source);
  if (orderNo.includes("test")) reasons.push("orderNo contains TEST");
  if (name.includes("test") || name.includes("測試") || name.includes("测试")) reasons.push("customerName looks like test");
  if (email.includes("test") || email.includes("example")) reasons.push("customerEmail looks like test/example");
  if (source.includes("test")) reasons.push("source contains test");
  if (isPlaceholderPhone(order.customerPhone)) reasons.push("customerPhone looks like placeholder");
  return reasons;
}

const candidates = [];
for (const doc of snap.docs) {
  const order = doc.data();
  const reasons = reasonsFor(order);
  if (!reasons.length) continue;
  candidates.push({
    docId: doc.id,
    orderNo: order.orderNo || "",
    customerName: order.customerName || "",
    customerPhone: order.customerPhone || "",
    customerEmail: order.customerEmail || "",
    status: order.status || "",
    createdAt: order.createdAt?.toDate?.().toISOString?.() || "",
    reasons
  });
}

console.log(JSON.stringify({
  scanned: snap.size,
  candidateCount: candidates.length,
  candidates
}, null, 2));
