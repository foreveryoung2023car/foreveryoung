import { z } from "zod";
import { db, FieldValue, Timestamp } from "../lib/firebase.js";
import { HttpError } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";

const legacyStores = [
  { id: "kyoto1", name: "京都清水寺店", address: "京都東山區五條橋東4-432-13 對嵐坊大廈1樓", phone: "請洽客服" },
  { id: "kyoto2", name: "京都祇園店", address: "京都東山區常盤町169 常盤大廈", phone: "請洽客服" },
  { id: "osaka1", name: "大阪日本橋店", address: "大阪中央區日本橋1-18-14 芝大廈7樓", phone: "請洽客服" },
  { id: "tokyo1", name: "東京淺草寺店", address: "東京都台東區淺草1-33-8 A-one大廈9樓", phone: "請洽客服" }
] as const;

const legacyStoreMap = new Map<string, StoreRecord>(
  legacyStores.map((store) => [store.id, { ...store }])
);
const slotPattern = /^(?:[01]\d|2[0-3]):(?:00|30)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const storeIdPattern = /^[a-z0-9][a-z0-9_-]{1,31}$/;
const activeCapacityStatuses = new Set([
  "pending_payment",
  "pending_review",
  "confirmed",
  "checked_in",
  "completed",
  "balance_due",
  "refund_requested",
  "refunding"
]);

export const defaultStoreSlots = Array.from({ length: 18 }, (_, index) => {
  const minutes = 9 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

const saveStoreScheduleSchema = z.object({
  storeId: z.string().min(1),
  mode: z.enum(["default", "date"]),
  date: z.string().regex(datePattern).optional(),
  slots: z.array(z.string().regex(slotPattern)).max(48),
  slotCapacities: z.record(z.object({
    maleAdults: z.coerce.number().int().min(0).max(999).default(0),
    femaleAdults: z.coerce.number().int().min(0).max(999).default(0),
    children: z.coerce.number().int().min(0).max(999).default(0)
  })).optional()
});

const saveStoreSchema = z.object({
  id: z.string().regex(storeIdPattern, "Invalid store ID"),
  name: z.string().trim().min(1).max(80),
  address: z.string().trim().max(300).default(""),
  phone: z.string().trim().max(80).default(""),
  create: z.boolean().optional()
});

type StoreRecord = {
  id: string;
  name: string;
  address: string;
  phone: string;
};

type StoreWithData = {
  store: StoreRecord;
  data: FirebaseFirestore.DocumentData;
};

function storeFromData(id: string, data: FirebaseFirestore.DocumentData = {}): StoreRecord {
  const fallback = legacyStoreMap.get(id);
  return {
    id,
    name: String(data.name || fallback?.name || id),
    address: String(data.address || fallback?.address || ""),
    phone: String(data.phone || fallback?.phone || "")
  };
}

async function loadStore(storeId: string) {
  const snap = await db.collection("stores").doc(storeId).get();
  if (snap.exists) return { store: storeFromData(storeId, snap.data()), data: snap.data() || {} };
  const fallback = legacyStoreMap.get(storeId);
  if (fallback) return { store: { ...fallback }, data: {} };
  throw new HttpError(400, "Unknown store");
}

async function listStoresWithData(): Promise<StoreWithData[]> {
  const snap = await db.collection("stores").get();
  const records = new Map<string, StoreWithData>(
    legacyStores.map((store) => [store.id, { store: { ...store }, data: {} }])
  );
  snap.docs.forEach((doc) => records.set(doc.id, {
    store: storeFromData(doc.id, doc.data()),
    data: doc.data()
  }));
  return [...records.values()].sort((a, b) => a.store.name.localeCompare(b.store.name, "zh-Hant"));
}

function assertStoreAccess(actor: AuthContext, storeId: string) {
  if (isPlatformStoreManager(actor)) return;
  if (!actor.storeId) throw new HttpError(403, "User has no storeId");
  if (actor.storeId !== storeId) throw new HttpError(403, "Cannot manage another store");
}

function isPlatformStoreManager(actor: AuthContext) {
  return actor.role === "owner" ||
    actor.role === "admin" ||
    actor.role === "head_store_manager" ||
    (actor.role === "store_manager" && !actor.storeId);
}

function normalizeSlots(slots: string[]) {
  return [...new Set(slots)].sort();
}

type SlotCapacity = {
  maleAdults: number;
  femaleAdults: number;
  children: number;
};

type SlotUsage = SlotCapacity;

const defaultSlotCapacity: SlotCapacity = { maleAdults: 10, femaleAdults: 10, children: 10 };

function normalizeCapacity(value: unknown, fallback: SlotCapacity = defaultSlotCapacity): SlotCapacity {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    maleAdults: Math.max(0, Number(raw.maleAdults ?? fallback.maleAdults ?? 0) || 0),
    femaleAdults: Math.max(0, Number(raw.femaleAdults ?? fallback.femaleAdults ?? 0) || 0),
    children: Math.max(0, Number(raw.children ?? fallback.children ?? 0) || 0)
  };
}

function normalizeSlotCapacities(raw: unknown, slots: string[], fallback?: Record<string, SlotCapacity>) {
  const input = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return slots.reduce<Record<string, SlotCapacity>>((acc, slot) => {
    acc[slot] = normalizeCapacity(input[slot], fallback?.[slot] || defaultSlotCapacity);
    return acc;
  }, {});
}

function defaultSlotsFromData(data: FirebaseFirestore.DocumentData) {
  const slots = data.defaultSlots;
  return Array.isArray(slots) ? normalizeSlots(slots.map(String).filter((slot) => slotPattern.test(slot))) : defaultStoreSlots;
}

function defaultCapacitiesFromData(data: FirebaseFirestore.DocumentData, slots: string[]) {
  return normalizeSlotCapacities(data.defaultSlotCapacities, slots);
}

function slotFromBookingAt(value: unknown) {
  if (!value) return "";
  const date = typeof (value as { toDate?: unknown }).toDate === "function"
    ? (value as FirebaseFirestore.Timestamp).toDate()
    : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function countsFromOrder(order: FirebaseFirestore.DocumentData): SlotUsage {
  const hasBreakdown = order.maleAdults !== undefined || order.femaleAdults !== undefined;
  const fallbackAdults = Math.max(0, Number(order.adults || 0) || 0);
  const maleAdults = Math.max(0, Number(order.maleAdults || 0) || 0);
  const femaleAdults = hasBreakdown
    ? Math.max(0, Number(order.femaleAdults || 0) || 0)
    : fallbackAdults;
  return {
    maleAdults,
    femaleAdults,
    children: Math.max(0, Number(order.children || 0) || 0)
  };
}

async function loadSlotUsage(storeId: string, date: string, tx?: FirebaseFirestore.Transaction, excludeOrderId?: string) {
  const start = new Date(`${date}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const query = db.collection("orders")
    .where("storeId", "==", storeId)
    .where("bookingAt", ">=", Timestamp.fromDate(start))
    .where("bookingAt", "<", Timestamp.fromDate(end));
  const snap = tx ? await tx.get(query) : await query.get();
  const usage: Record<string, SlotUsage> = {};
  snap.docs.forEach((doc) => {
    if (excludeOrderId && doc.id === excludeOrderId) return;
    const order = doc.data();
    if (!activeCapacityStatuses.has(String(order.status || ""))) return;
    const slot = slotFromBookingAt(order.bookingAt);
    if (!slot) return;
    const counts = countsFromOrder(order);
    const current = usage[slot] || { maleAdults: 0, femaleAdults: 0, children: 0 };
    usage[slot] = {
      maleAdults: current.maleAdults + counts.maleAdults,
      femaleAdults: current.femaleAdults + counts.femaleAdults,
      children: current.children + counts.children
    };
  });
  return usage;
}

function buildSlotAvailability(slots: string[], capacities: Record<string, SlotCapacity>, usage: Record<string, SlotUsage>) {
  return slots.map((slot) => {
    const capacity = capacities[slot] || defaultSlotCapacity;
    const used = usage[slot] || { maleAdults: 0, femaleAdults: 0, children: 0 };
    const remaining = {
      maleAdults: Math.max(0, capacity.maleAdults - used.maleAdults),
      femaleAdults: Math.max(0, capacity.femaleAdults - used.femaleAdults),
      children: Math.max(0, capacity.children - used.children)
    };
    return { slot, capacity, used, remaining };
  });
}

async function availabilityFromSnapshot(store: StoreRecord, data: FirebaseFirestore.DocumentData, date: string, scheduleSnap: FirebaseFirestore.DocumentSnapshot, tx?: FirebaseFirestore.Transaction) {
  const defaultSlots = defaultSlotsFromData(data);
  const defaultSlotCapacities = defaultCapacitiesFromData(data, defaultSlots);
  const overrideSlots = scheduleSnap.data()?.slots;
  const hasOverride = scheduleSnap.exists && Array.isArray(overrideSlots);
  const slots = hasOverride ? normalizeSlots(overrideSlots.map(String).filter((slot) => slotPattern.test(slot))) : defaultSlots;
  const slotCapacities = hasOverride
    ? normalizeSlotCapacities(scheduleSnap.data()?.slotCapacities, slots, defaultSlotCapacities)
    : defaultSlotCapacities;
  const usage = await loadSlotUsage(store.id, date, tx);
  return {
    status: "success",
    ...store,
    storeId: store.id,
    date,
    slots,
    slotCapacities,
    slotAvailability: buildSlotAvailability(slots, slotCapacities, usage),
    defaultSlots,
    defaultSlotCapacities,
    hasOverride
  };
}

export async function getStoreAvailability(storeId: string, date: string) {
  if (!datePattern.test(date)) throw new HttpError(400, "Invalid date");
  const { store, data } = await loadStore(storeId);
  const scheduleSnap = await db.collection("storeSchedules").doc(`${storeId}_${date}`).get();
  return availabilityFromSnapshot(store, data, date, scheduleSnap);
}

export async function listStoreSchedules(date: string, actor: AuthContext) {
  if (!datePattern.test(date)) throw new HttpError(400, "Invalid date");
  const isPlatformAdmin = isPlatformStoreManager(actor);
  if (!isPlatformAdmin && !actor.storeId) throw new HttpError(403, "User has no storeId");
  const allStores = await listStoresWithData();
  const visibleStores = isPlatformAdmin
    ? allStores
    : allStores.filter(({ store }) => store.id === actor.storeId);
  if (!isPlatformAdmin && visibleStores.length === 0) throw new HttpError(400, "Unknown store");
  const scheduleRefs = visibleStores.map(({ store }) => db.collection("storeSchedules").doc(`${store.id}_${date}`));
  const scheduleSnaps = scheduleRefs.length ? await db.getAll(...scheduleRefs) : [];
  const stores = visibleStores.map(({ store, data }, index) =>
    availabilityFromSnapshot(store, data, date, scheduleSnaps[index])
  );
  return { status: "success", date, stores: await Promise.all(stores), canCreateStore: isPlatformAdmin };
}

export async function saveStore(raw: unknown, actor: AuthContext) {
  const input = saveStoreSchema.parse(raw);
  const isPlatformAdmin = isPlatformStoreManager(actor);
  assertStoreAccess(actor, input.id);
  const ref = db.collection("stores").doc(input.id);
  const snap = await ref.get();
  if (input.create && !isPlatformAdmin) throw new HttpError(403, "Only platform admins can create stores");
  if (input.create && (snap.exists || legacyStoreMap.has(input.id))) throw new HttpError(409, "Store ID already exists");
  if (!input.create && !snap.exists && !legacyStoreMap.has(input.id)) throw new HttpError(404, "Store not found");

  const before = snap.exists ? snap.data() || null : legacyStoreMap.get(input.id) || null;
  const store = { id: input.id, name: input.name, address: input.address, phone: input.phone };
  await ref.set({
    storeId: input.id,
    name: input.name,
    address: input.address,
    phone: input.phone,
    updatedBy: actor.uid,
    updatedAt: FieldValue.serverTimestamp(),
    ...(snap.exists ? {} : { createdBy: actor.uid, createdAt: FieldValue.serverTimestamp() })
  }, { merge: true });
  await writeAuditLog({
    actor,
    action: input.create ? "store_created" : "store_info_updated",
    beforeData: before,
    afterData: store,
    metadata: { storeId: input.id }
  });
  return { status: "success", store };
}

export async function saveStoreSchedule(raw: unknown, actor: AuthContext) {
  const input = saveStoreScheduleSchema.parse(raw);
  await loadStore(input.storeId);
  assertStoreAccess(actor, input.storeId);
  const slots = normalizeSlots(input.slots);
  const slotCapacities = normalizeSlotCapacities(input.slotCapacities, slots);

  if (input.mode === "default") {
    const ref = db.collection("stores").doc(input.storeId);
    const before = (await ref.get()).data() || null;
    await ref.set({
      storeId: input.storeId,
      defaultSlots: slots,
      defaultSlotCapacities: slotCapacities,
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    await writeAuditLog({
      actor,
      action: "store_default_slots_updated",
      beforeData: before,
      afterData: { storeId: input.storeId, defaultSlots: slots, defaultSlotCapacities: slotCapacities },
      metadata: { storeId: input.storeId }
    });
  } else {
    if (!input.date) throw new HttpError(400, "Date is required");
    const ref = db.collection("storeSchedules").doc(`${input.storeId}_${input.date}`);
    const before = (await ref.get()).data() || null;
    await ref.set({
      storeId: input.storeId,
      date: input.date,
      slots,
      slotCapacities,
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp()
    });
    await writeAuditLog({
      actor,
      action: "store_date_slots_updated",
      beforeData: before,
      afterData: { storeId: input.storeId, date: input.date, slots, slotCapacities },
      metadata: { storeId: input.storeId, date: input.date }
    });
  }

  return getStoreAvailability(input.storeId, input.date || new Date().toISOString().slice(0, 10));
}

export async function assertStoreSlotAvailable(storeId: string, bookingAt: string) {
  await loadStore(storeId);
  const match = bookingAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) throw new HttpError(400, "Invalid booking time");
  const availability = await getStoreAvailability(storeId, match[1]);
  if (!availability.slots.includes(match[2])) {
    throw new HttpError(400, "Selected booking time is not available");
  }
}

export async function assertStoreSlotCapacityAvailable(
  storeId: string,
  bookingAt: string,
  counts: SlotUsage,
  tx?: FirebaseFirestore.Transaction,
  excludeOrderId?: string
) {
  await loadStore(storeId);
  const match = bookingAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) throw new HttpError(400, "Invalid booking time");
  const { store, data } = await loadStore(storeId);
  const scheduleRef = db.collection("storeSchedules").doc(`${storeId}_${match[1]}`);
  const scheduleSnap = tx ? await tx.get(scheduleRef) : await scheduleRef.get();
  const availability = await availabilityFromSnapshot(store, data, match[1], scheduleSnap, tx);
  const slotAvailability = availability.slotAvailability.find((item) => item.slot === match[2]);
  if (!slotAvailability) throw new HttpError(400, "Selected booking time is not available");
  const shortages = [
    counts.maleAdults > slotAvailability.remaining.maleAdults ? "男性" : "",
    counts.femaleAdults > slotAvailability.remaining.femaleAdults ? "女性" : "",
    counts.children > slotAvailability.remaining.children ? "小孩" : ""
  ].filter(Boolean);
  if (shortages.length) {
    throw new HttpError(409, `Selected time slot does not have enough capacity for ${shortages.join("/")}`);
  }
}
