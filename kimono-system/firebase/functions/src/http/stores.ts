import { onRequest } from "firebase-functions/v2/https";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import {
  getStoreAvailability as getStoreAvailabilityService,
  listStoreSchedules as listStoreSchedulesService,
  saveStoreSchedule as saveStoreScheduleService
} from "../services/stores.js";

export const getStoreAvailability = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "GET");
  return getStoreAvailabilityService(String(req.query.storeId || ""), String(req.query.date || ""));
}));

export const listStoreSchedules = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "GET");
  const actor = await requirePermission(req, "stores:manage");
  return listStoreSchedulesService(String(req.query.date || ""), actor);
}));

export const saveStoreSchedule = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "stores:manage");
  return saveStoreScheduleService(req.body, actor);
}));
