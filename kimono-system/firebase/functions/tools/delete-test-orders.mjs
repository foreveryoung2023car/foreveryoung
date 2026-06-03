import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT || "foreveryoung-kimono-prod" });

const db = getFirestore();
const args = process.argv.slice(2);
const execute = args.includes("--execute");
const orderNos = args.filter((arg) => arg.startsWith("--order-no=")).map((arg) => arg.slice("--order-no=".length).trim()).filter(Boolean);
const docIds = args.filter((arg) => arg.startsWith("--doc-id=")).map((arg) => arg.slice("--doc-id=".length).trim()).filter(Boolean);

if (!orderNos.length && !docIds.length) {
  console.error("Usage: npm run delete:test-orders -- --order-no=K260603001 [--doc-id=abc] [--execute]");
  process.exit(1);
}

async function findOrderDocs() {
  const refs = new Map();
  for (const docId of docIds) {
    const ref = db.collection("orders").doc(docId);
    const snap = await ref.get();
    if (snap.exists) refs.set(ref.id, { ref, snap });
  }
  for (const orderNo of orderNos) {
    const snap = await db.collection("orders").where("orderNo", "==", orderNo).limit(5).get();
    snap.docs.forEach((doc) => refs.set(doc.id, { ref: doc.ref, snap: doc }));
  }
  return [...refs.values()];
}

async function queryByOrderId(collection, orderId) {
  const snap = await db.collection(collection).where("orderId", "==", orderId).get();
  return snap.docs;
}

function serializeDoc(doc) {
  return {
    path: doc.ref.path,
    data: doc.data()
  };
}

const orderDocs = await findOrderDocs();
if (!orderDocs.length) {
  console.error("No matching orders found.");
  process.exit(1);
}

const backup = [];
const deleteRefs = [];

for (const { ref, snap } of orderDocs) {
  const order = snap.data();
  backup.push(serializeDoc(snap));
  deleteRefs.push(ref);

  const relatedCollections = ["refundRequests", "checkins"];
  for (const collection of relatedCollections) {
    const related = await queryByOrderId(collection, ref.id);
    for (const doc of related) {
      backup.push(serializeDoc(doc));
      deleteRefs.push(doc.ref);
    }
  }

  const refundByDocId = await db.collection("refundRequests").doc(ref.id).get();
  if (refundByDocId.exists) {
    backup.push(serializeDoc(refundByDocId));
    deleteRefs.push(refundByDocId.ref);
  }

  console.log(`${execute ? "DELETE" : "DRY RUN"} ${ref.path} ${order.orderNo || ""} ${order.customerName || ""}`);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupDir = path.resolve(__dirname, "../backups");
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `delete-test-orders-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(backupPath, JSON.stringify({ execute, backup }, null, 2));
console.log(`Local snapshot written: ${backupPath}`);

if (!execute) {
  console.log("Dry run only. Add --execute to delete.");
  process.exit(0);
}

const batch = db.batch();
for (const ref of deleteRefs) batch.delete(ref);
await batch.commit();
console.log(`Deleted ${deleteRefs.length} document(s).`);
