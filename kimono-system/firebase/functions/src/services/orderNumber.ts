import type { Transaction } from "firebase-admin/firestore";
import { db, FieldValue } from "../lib/firebase.js";
import { normalizeBrandPlatform, type BrandPlatform } from "../lib/constants.js";

type OrderNoPrefix = "K" | "J" | "L";

function orderNoPrefix(platform?: BrandPlatform, prefixOverride?: OrderNoPrefix) {
  if (prefixOverride) return prefixOverride;
  return normalizeBrandPlatform(platform) === "japan-go" ? "J" : "K";
}

export async function nextOrderNo(tx: Transaction, platform?: BrandPlatform, prefixOverride?: OrderNoPrefix) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const yy = parts.find((p) => p.type === "year")?.value || "00";
  const mm = parts.find((p) => p.type === "month")?.value || "00";
  const dd = parts.find((p) => p.type === "day")?.value || "00";
  const key = `${yy}${mm}${dd}`;
  const ref = db.collection("settings").doc("orderCounters").collection("days").doc(key);
  const snap = await tx.get(ref);
  const next = (Number(snap.data()?.seq) || 0) + 1;
  tx.set(ref, { seq: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return `${orderNoPrefix(platform, prefixOverride)}${key}${String(next).padStart(3, "0")}`;
}
