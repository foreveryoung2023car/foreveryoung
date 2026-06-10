import { z } from "zod";
import { db, FieldValue } from "../lib/firebase.js";
import { HttpError } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";

export const storeDefinitions = [
  { id: "kyoto1", name: "京都清水寺店" },
  { id: "kyoto2", name: "京都祇園店" },
  { id: "osaka1", name: "大阪日本橋店" },
  { id: "tokyo1", name: "東京淺草寺店" }
] as const;

const storeIds = storeDefinitions.map((store) => store.id);
const slotPattern = /^(?:[01]\d|2[0-3]):(?:00|30)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const defaultStoreSlots = Array.from({ length: 18 }, (_, index) => {
  const minutes = 9 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

const saveStoreScheduleSchema = z.object({
  storeId: z.string().min(1),
  mode: z.enum(["default", "date"]),
  date: z.string().regex(datePattern).optional(),
  slots: z.array(z.string().regex(slotPattern)).max(48)
});

function assertKnownStore(storeId: string) {
  if (!storeIds.includes(storeId as (typeof storeIds)[number])) {
    throw new HttpError(400, "Unknown store");
  }
}

function assertStoreAccess(actor: AuthContext, storeId: string) {
  if (!actor.storeId) {
    throw new HttpError(403, "User has no storeId");
  }
  if (actor.storeId !== storeId) {
    throw new HttpError(403, "Cannot manage another store");
  }
}

function normalizeSlots(slots: string[]) {
  return [...new Set(slots)].sort();
}

async function loadDefaultSlots(storeId: string) {
  const snap = await db.collection("stores").doc(storeId).get();
  const slots = snap.data()?.defaultSlots;
  return Array.isArray(slots) ? normalizeSlots(slots.map(String).filter((slot) => slotPattern.test(slot))) : defaultStoreSlots;
}

export async function getStoreAvailability(storeId: string, date: string) {
  assertKnownStore(storeId);
  if (!datePattern.test(date)) throw new HttpError(400, "Invalid date");
  const defaultSlots = await loadDefaultSlots(storeId);
  const scheduleId = `${storeId}_${date}`;
  const scheduleSnap = await db.collection("storeSchedules").doc(scheduleId).get();
  const overrideSlots = scheduleSnap.data()?.slots;
  const hasOverride = scheduleSnap.exists && Array.isArray(overrideSlots);
  return {
    status: "success",
    storeId,
    date,
    slots: hasOverride ? normalizeSlots(overrideSlots.map(String).filter((slot) => slotPattern.test(slot))) : defaultSlots,
    defaultSlots,
    hasOverride
  };
}

export async function listStoreSchedules(date: string, actor: AuthContext) {
  if (!datePattern.test(date)) throw new HttpError(400, "Invalid date");
  if (!actor.storeId) throw new HttpError(403, "User has no storeId");
  assertKnownStore(actor.storeId);
  const visibleStores = storeDefinitions.filter((store) => store.id === actor.storeId);
  const stores = await Promise.all(visibleStores.map(async (store) => ({
    ...store,
    ...(await getStoreAvailability(store.id, date))
  })));
  return { status: "success", date, stores };
}

export async function saveStoreSchedule(raw: unknown, actor: AuthContext) {
  const input = saveStoreScheduleSchema.parse(raw);
  assertKnownStore(input.storeId);
  assertStoreAccess(actor, input.storeId);
  const slots = normalizeSlots(input.slots);

  if (input.mode === "default") {
    const ref = db.collection("stores").doc(input.storeId);
    const before = (await ref.get()).data() || null;
    await ref.set({
      storeId: input.storeId,
      defaultSlots: slots,
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    await writeAuditLog({
      actor,
      action: "store_default_slots_updated",
      beforeData: before,
      afterData: { storeId: input.storeId, defaultSlots: slots },
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
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp()
    });
    await writeAuditLog({
      actor,
      action: "store_date_slots_updated",
      beforeData: before,
      afterData: { storeId: input.storeId, date: input.date, slots },
      metadata: { storeId: input.storeId, date: input.date }
    });
  }

  return getStoreAvailability(input.storeId, input.date || new Date().toISOString().slice(0, 10));
}

export async function assertStoreSlotAvailable(storeId: string, bookingAt: string) {
  assertKnownStore(storeId);
  const match = bookingAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) throw new HttpError(400, "Invalid booking time");
  const availability = await getStoreAvailability(storeId, match[1]);
  if (!availability.slots.includes(match[2])) {
    throw new HttpError(400, "Selected booking time is not available");
  }
}
