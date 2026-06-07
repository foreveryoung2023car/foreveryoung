import { z } from "zod";
import { FieldValue, Timestamp, db } from "../lib/firebase.js";
import { HttpError } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";
import { sendGmailMessage } from "../lib/gmail.js";

type EmailKind = "confirm" | "refund_confirmed" | "booking_reminder" | "proof_received";

type EmailTemplate = {
  subject: string;
  text: string;
  html?: string;
};

type RenderedEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type StoreContact = {
  name: string;
  address: string;
  phone: string;
};

const defaultStores: Record<string, StoreContact> = {
  kyoto1: {
    name: "京都清水寺店",
    address: "京都東山區五條橋東4-432-13 對嵐坊大廈1樓",
    phone: "請洽客服"
  },
  kyoto2: {
    name: "京都祇園店",
    address: "京都東山區常盤町169 常盤大廈",
    phone: "請洽客服"
  },
  osaka1: {
    name: "大阪日本橋店",
    address: "大阪中央區日本橋1-18-14 芝大廈7樓",
    phone: "請洽客服"
  },
  tokyo1: {
    name: "東京淺草寺店",
    address: "東京都台東區淺草1-33-8 A-one大廈9樓",
    phone: "請洽客服"
  }
};

const emailActionMap: Record<EmailKind, { sent: string; failed: string; message: string }> = {
  confirm: {
    sent: "confirm_email_sent",
    failed: "confirm_email_failed",
    message: "確認信已寄出"
  },
  refund_confirmed: {
    sent: "refund_confirm_email_sent",
    failed: "refund_confirm_email_failed",
    message: "退款確認信已寄出"
  },
  booking_reminder: {
    sent: "booking_reminder_email_sent",
    failed: "booking_reminder_email_failed",
    message: "預約提醒信已寄出"
  },
  proof_received: {
    sent: "proof_received_email_sent",
    failed: "proof_received_email_failed",
    message: "付款憑證收到通知已寄出"
  }
};

const defaultTemplates: Record<EmailKind, EmailTemplate> = {
  confirm: {
    subject: "【Foreveryoung 和服體驗】訂單確認 {{orderNo}}",
    text: [
      "{{name}} 您好：",
      "",
      "您的和服體驗預約已確認，資訊如下：",
      "訂單編號：{{orderNo}}",
      "體驗日期：{{bookingAt}} (JST)",
      "人數：{{guests}}",
      "預約店鋪：{{storeName}}",
      "店鋪地址：{{storeAddress}}",
      "店鋪電話：{{storePhone}}",
      "方案：{{plan}}",
      "妝髮：{{hair}}",
      "攝影：{{photo}}",
      "總額：{{total}}",
      "已收訂金：{{deposit}}",
      "現場應收：{{onsiteDue}}",
      "",
      "如需更改、取消或有任何問題，請直接聯繫客服。",
      "",
      "Foreveryoung 旅乘"
    ].join("\n")
  },
  refund_confirmed: {
    subject: "【Foreveryoung 和服體驗】退款完成通知 {{orderNo}}",
    text: [
      "{{name}} 您好：",
      "",
      "您的退款已完成處理，資訊如下：",
      "訂單編號：{{orderNo}}",
      "體驗日期：{{bookingAt}} (JST)",
      "人數：{{guests}}",
      "預約店鋪：{{storeName}}",
      "店鋪地址：{{storeAddress}}",
      "店鋪電話：{{storePhone}}",
      "退款金額：{{refundAmount}}",
      "退款時間：{{refundTime}}",
      "退款說明：{{refundReason}}",
      "",
      "款項實際入帳時間可能依銀行作業而略有延遲。",
      "",
      "Foreveryoung 旅乘"
    ].join("\n")
  },
  booking_reminder: {
    subject: "【Foreveryoung 和服體驗】明日預約提醒 {{orderNo}}",
    text: [
      "{{name}} 您好：",
      "",
      "提醒您明天有和服體驗預約：",
      "訂單編號：{{orderNo}}",
      "體驗日期：{{bookingAt}} (JST)",
      "人數：{{guests}}",
      "預約店鋪：{{storeName}}",
      "店鋪地址：{{storeAddress}}",
      "店鋪電話：{{storePhone}}",
      "方案：{{plan}}",
      "妝髮：{{hair}}",
      "攝影：{{photo}}",
      "現場應收：{{onsiteDue}}",
      "",
      "請依預約時間前來。如需調整，請提前聯繫客服。",
      "",
      "Foreveryoung 旅乘"
    ].join("\n")
  },
  proof_received: {
    subject: "【Foreveryoung 和服體驗】已收到付款憑證 {{orderNo}}",
    text: [
      "{{name}} 您好：",
      "",
      "我們已收到您的付款憑證，訂單將由工作人員確認。",
      "訂單編號：{{orderNo}}",
      "體驗日期：{{bookingAt}} (JST)",
      "人數：{{guests}}",
      "預約店鋪：{{storeName}}",
      "店鋪地址：{{storeAddress}}",
      "店鋪電話：{{storePhone}}",
      "已收訂金：{{deposit}}",
      "妝髮費：{{hairFee}}",
      "攝影費：{{photoFee}}",
      "折扣：{{discountLabel}}",
      "店鋪尾款：{{onsiteDue}}",
      "總金額：{{total}}",
      "憑證備註：{{proofNote}}",
      "",
      "確認完成後，我們會再寄送訂單確認信。",
      "",
      "Foreveryoung 旅乘"
    ].join("\n")
  }
};

export const sendOrderEmailSchema = z.object({
  orderId: z.string().min(1),
  email: z.string().email().optional()
});

function timestampToDate(value: unknown) {
  if (!value) return null;
  if (typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate();
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatJst(value: unknown) {
  const d = timestampToDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat("zh-Hant", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(d);
}

function money(value: unknown) {
  return `¥${Number(value || 0).toLocaleString("ja-JP")}`;
}

function discountLabel(order: FirebaseFirestore.DocumentData) {
  const code = String(order.couponCode || "").trim();
  const rate = Number(order.discountRate || 0);
  if (!code && !rate) return "無";
  const parts = [];
  if (code) parts.push(code);
  if (rate) parts.push(`${rate} 折`);
  return parts.join(" / ");
}

function guestLabel(order: FirebaseFirestore.DocumentData) {
  const adults = Number(order.adults || 0);
  const children = Number(order.children || 0);
  if (adults || children) return `${adults} 位大人 / ${children} 位小孩`;
  return "—";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isStoreScopedActor(actor: AuthContext) {
  if (!actor.storeId) return false;
  return ["agent", "store_manager", "store_staff", "accountant", "readonly"].includes(actor.role);
}

function assertOrderAccess(order: FirebaseFirestore.DocumentData, actor: AuthContext) {
  if (!isStoreScopedActor(actor)) return;
  if (!actor.storeId) throw new HttpError(403, "Store user has no storeId");
  if (order.storeId !== actor.storeId) throw new HttpError(403, "Order belongs to another store");
}

async function findOrder(orderNoOrId: string) {
  const key = orderNoOrId.trim();
  const direct = await db.collection("orders").doc(key).get();
  if (direct.exists) return { id: direct.id, data: direct.data()! };

  const snap = await db.collection("orders").where("orderNo", "==", key.toUpperCase()).limit(1).get();
  if (snap.empty) throw new HttpError(404, "Order not found");
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() };
}

async function loadTemplate(kind: EmailKind) {
  const snap = await db.collection("settings").doc("emailTemplates").get();
  const configured = snap.data()?.[kind] || {};
  const template = {
    ...defaultTemplates[kind],
    ...configured
  } as EmailTemplate;
  return ensureRequiredTemplateLines(kind, template);
}

function ensureRequiredTemplateLines(kind: EmailKind, template: EmailTemplate): EmailTemplate {
  let text = template.text || "";
  let html = template.html;
  if (!text.includes("{{storeName}}")) {
    text += [
      "",
      "預約店鋪：{{storeName}}",
      "店鋪地址：{{storeAddress}}",
      "店鋪電話：{{storePhone}}"
    ].join("\n");
  }
  if (html && !html.includes("{{storeName}}")) {
    html += [
      "<hr>",
      "<p><b>預約店鋪：</b>{{storeName}}</p>",
      "<p><b>店鋪地址：</b>{{storeAddress}}</p>",
      "<p><b>店鋪電話：</b>{{storePhone}}</p>"
    ].join("");
  }
  if (kind === "proof_received") {
    const financeLines = [];
    if (!text.includes("{{hairFee}}")) financeLines.push("妝髮費：{{hairFee}}");
    if (!text.includes("{{photoFee}}")) financeLines.push("攝影費：{{photoFee}}");
    if (!text.includes("{{discountLabel}}")) financeLines.push("折扣：{{discountLabel}}");
    if (!text.includes("{{onsiteDue}}")) financeLines.push("店鋪尾款：{{onsiteDue}}");
    if (!text.includes("{{total}}")) financeLines.push("總金額：{{total}}");
    if (financeLines.length) text += ["", ...financeLines].join("\n");
    if (html) {
      const htmlFinanceLines = [];
      if (!html.includes("{{hairFee}}")) htmlFinanceLines.push("<p><b>妝髮費：</b>{{hairFee}}</p>");
      if (!html.includes("{{photoFee}}")) htmlFinanceLines.push("<p><b>攝影費：</b>{{photoFee}}</p>");
      if (!html.includes("{{discountLabel}}")) htmlFinanceLines.push("<p><b>折扣：</b>{{discountLabel}}</p>");
      if (!html.includes("{{onsiteDue}}")) htmlFinanceLines.push("<p><b>店鋪尾款：</b>{{onsiteDue}}</p>");
      if (!html.includes("{{total}}")) htmlFinanceLines.push("<p><b>總金額：</b>{{total}}</p>");
      if (htmlFinanceLines.length) html += htmlFinanceLines.join("");
    }
  }
  return { ...template, text, html };
}

async function loadStoreContact(storeId: unknown): Promise<StoreContact> {
  const key = String(storeId || "").trim();
  const fallback = defaultStores[key] || { name: key || "—", address: "—", phone: "請洽客服" };
  if (!key) return fallback;

  const snap = await db.collection("settings").doc("stores").get();
  const configured = snap.data()?.[key] || {};
  return {
    name: configured.name || fallback.name,
    address: configured.address || fallback.address,
    phone: configured.phone || fallback.phone
  };
}

async function templateVariables(orderId: string, order: FirebaseFirestore.DocumentData) {
  const orderNo = order.orderNo || orderId;
  const store = await loadStoreContact(order.storeId);
  return {
    name: order.customerName || "貴賓",
    orderNo,
    bookingAt: formatJst(order.bookingAt),
    guests: guestLabel(order),
    storeName: store.name,
    storeAddress: store.address,
    storePhone: store.phone,
    plan: order.plan || "和服體驗",
    hair: order.hair ? "需要" : "不需要",
    photo: order.photo ? "需要" : "不需要",
    total: money(order.totalJpy),
    deposit: money(order.depositJpy),
    hairFee: money(order.hairFeeJpy),
    photoFee: money(order.photoFeeJpy),
    discountLabel: discountLabel(order),
    onsiteDue: money(order.onsiteDueJpy),
    refundAmount: money(order.refundAmountJpy),
    refundTime: order.refundTime ? formatJst(order.refundTime) : "—",
    refundReason: order.refundReason || "—",
    proofNote: order.proofNote || "—",
    proofUrl: order.proofUrl || "",
    phone: order.customerPhone || "",
    email: order.customerEmail || ""
  };
}

function renderString(template: string, vars: Record<string, unknown>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => String(vars[key] ?? ""));
}

function textToHtml(text: string) {
  return `<div style="font-family:Arial,'Noto Sans TC',sans-serif;color:#1f2937;line-height:1.7;white-space:pre-line">${escapeHtml(text)}</div>`;
}

async function buildOrderEmail(kind: EmailKind, orderId: string, order: FirebaseFirestore.DocumentData, to: string): Promise<RenderedEmail> {
  const template = await loadTemplate(kind);
  const vars = await templateVariables(orderId, order);
  const subject = renderString(template.subject, vars);
  const text = renderString(template.text, vars);
  const html = template.html ? renderString(template.html, vars) : textToHtml(text);
  return { to, subject, text, html };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendGmailWithRetry(message: RenderedEmail) {
  let lastError: unknown = null;
  const delays = [0, 600, 1600];
  for (let attempt = 1; attempt <= delays.length; attempt += 1) {
    if (delays[attempt - 1]) await wait(delays[attempt - 1]);
    try {
      const result = await sendGmailMessage(message);
      return { ...result, attempts: attempt };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function sendOrderEmail(raw: unknown, actor: AuthContext, kind: EmailKind) {
  const input = sendOrderEmailSchema.parse(raw);
  const order = await findOrder(input.orderId);
  assertOrderAccess(order.data, actor);
  const to = input.email || order.data.customerEmail;
  if (!to) throw new HttpError(400, "Order has no customer email");

  return sendOrderEmailForOrder(kind, order.id, order.data, to, actor);
}

async function sendOrderEmailForOrder(
  kind: EmailKind,
  orderId: string,
  order: FirebaseFirestore.DocumentData,
  to: string,
  actor: AuthContext | null
) {
  const action = emailActionMap[kind];
  const message = await buildOrderEmail(kind, orderId, order, to);

  try {
    const result = await sendGmailWithRetry(message);
    await writeAuditLog({
      orderId,
      actor,
      actorLabel: actor ? undefined : "system",
      action: action.sent,
      afterData: {
        orderNo: order.orderNo || orderId,
        customerEmail: to,
        gmailMessageId: result.messageId,
        attempts: result.attempts
      },
      metadata: { source: "gmail_api", emailKind: kind }
    });
    return { status: "success", message: action.message, gmailMessageId: result.messageId, attempts: result.attempts };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await writeAuditLog({
      orderId,
      actor,
      actorLabel: actor ? undefined : "system",
      action: action.failed,
      afterData: {
        orderNo: order.orderNo || orderId,
        customerEmail: to,
        error: errorMessage
      },
      metadata: { source: "gmail_api", emailKind: kind }
    });
    throw new HttpError(500, `Email send failed after retries: ${errorMessage}`);
  }
}

export async function sendConfirmEmail(raw: unknown, actor: AuthContext) {
  return sendOrderEmail(raw, actor, "confirm");
}

export async function sendRefundConfirmEmail(raw: unknown, actor: AuthContext) {
  return sendOrderEmail(raw, actor, "refund_confirmed");
}

export async function sendBookingReminderEmail(raw: unknown, actor: AuthContext) {
  return sendOrderEmail(raw, actor, "booking_reminder");
}

export async function sendProofReceivedEmail(raw: unknown, actor: AuthContext) {
  return sendOrderEmail(raw, actor, "proof_received");
}

function jstDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date).split("-");
  return {
    year: Number(parts[0]),
    month: Number(parts[1]),
    day: Number(parts[2])
  };
}

function jstMidnightUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, -9, 0, 0));
}

export async function sendDueBookingReminderEmails(now = new Date()) {
  const today = jstDateParts(now);
  const start = jstMidnightUtc(today.year, today.month, today.day + 1);
  const end = jstMidnightUtc(today.year, today.month, today.day + 2);
  const snap = await db.collection("orders")
    .where("bookingAt", ">=", Timestamp.fromDate(start))
    .where("bookingAt", "<", Timestamp.fromDate(end))
    .get();

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const details: Array<Record<string, unknown>> = [];

  for (const doc of snap.docs) {
    const order = doc.data();
    const status = String(order.status || "");
    const email = String(order.customerEmail || "").trim();
    if (!["confirmed", "pending_review"].includes(status) || !email || order.emailFlags?.bookingReminderSentAt) {
      skipped += 1;
      continue;
    }

    try {
      const result = await sendOrderEmailForOrder("booking_reminder", doc.id, order, email, null);
      await doc.ref.set({
        emailFlags: {
          bookingReminderSentAt: FieldValue.serverTimestamp(),
          bookingReminderMessageId: result.gmailMessageId || ""
        },
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      sent += 1;
      details.push({ orderId: doc.id, orderNo: order.orderNo || doc.id, status: "sent" });
    } catch (err) {
      failed += 1;
      details.push({
        orderId: doc.id,
        orderNo: order.orderNo || doc.id,
        status: "failed",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return {
    status: "success",
    sent,
    skipped,
    failed,
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    details
  };
}
