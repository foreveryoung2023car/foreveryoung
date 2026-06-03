import { onRequest } from "firebase-functions/v2/https";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import {
  createAdminUser as createAdminUserService,
  listAdminUsers as listAdminUsersService,
  resetAdminUserPassword as resetAdminUserPasswordService,
  setAdminUserActive as setAdminUserActiveService
} from "../services/users.js";

export const listAdminUsers = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "GET");
  const actor = await requirePermission(req, "users:manage");
  return listAdminUsersService(actor);
}));

export const createAdminUser = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "users:manage");
  return createAdminUserService(req.body, actor);
}));

export const setAdminUserActive = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "users:manage");
  return setAdminUserActiveService(req.body, actor);
}));

export const resetAdminUserPassword = onRequest({ region: "asia-northeast1", cors: true }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "users:manage");
  return resetAdminUserPasswordService(req.body, actor);
}));
