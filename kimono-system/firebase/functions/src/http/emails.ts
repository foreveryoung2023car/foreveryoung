import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { handleHttp, requireMethod } from "../lib/http.js";
import { requirePermission } from "../lib/auth.js";
import { gmailSecrets } from "../lib/gmail.js";
import {
  sendBookingReminderEmail as sendBookingReminderEmailService,
  sendConfirmEmail as sendConfirmEmailService,
  sendDueBookingReminderEmails,
  sendProofReceivedEmail as sendProofReceivedEmailService,
  sendRefundConfirmEmail as sendRefundConfirmEmailService
} from "../services/emails.js";

export const sendConfirmEmail = onRequest({ region: "asia-northeast1", cors: true, secrets: gmailSecrets }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "orders:update");
  return sendConfirmEmailService(req.body, actor);
}));

export const sendRefundConfirmEmail = onRequest({ region: "asia-northeast1", cors: true, secrets: gmailSecrets }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "orders:update");
  return sendRefundConfirmEmailService(req.body, actor);
}));

export const sendBookingReminderEmail = onRequest({ region: "asia-northeast1", cors: true, secrets: gmailSecrets }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "orders:update");
  return sendBookingReminderEmailService(req.body, actor);
}));

export const sendProofReceivedEmail = onRequest({ region: "asia-northeast1", cors: true, secrets: gmailSecrets }, (req, res) => handleHttp(req, res, async () => {
  requireMethod(req, "POST");
  const actor = await requirePermission(req, "orders:update");
  return sendProofReceivedEmailService(req.body, actor);
}));

export const sendDailyBookingReminderEmails = onSchedule({
  region: "asia-northeast1",
  schedule: "every day 09:00",
  timeZone: "Asia/Tokyo",
  secrets: gmailSecrets
}, async () => {
  await sendDueBookingReminderEmails();
});
