import { z } from "zod";
import { db } from "../lib/firebase.js";
import { HttpError } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";
import { sendGmailMessage } from "../lib/gmail.js";

export const sendConfirmEmailSchema = z.object({
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

function guestLabel(order: FirebaseFirestore.DocumentData) {
  const adults = Number(order.adults || 0);
  const children = Number(order.children || 0);
  if (adults || children) return `${adults} 位大人${children ? ` / ${children} 位小孩` : ""}`;
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

async function findOrder(orderNoOrId: string) {
  const key = orderNoOrId.trim();
  const direct = await db.collection("orders").doc(key).get();
  if (direct.exists) return { id: direct.id, data: direct.data()! };

  const snap = await db.collection("orders").where("orderNo", "==", key.toUpperCase()).limit(1).get();
  if (snap.empty) throw new HttpError(404, "Order not found");
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() };
}

function buildConfirmEmail(orderId: string, order: FirebaseFirestore.DocumentData, to: string) {
  const orderNo = order.orderNo || orderId;
  const subject = `【旅乘 x 和服體驗】訂單確認 ${orderNo}`;
  const name = order.customerName || "貴賓";
  const bookingAt = formatJst(order.bookingAt);
  const guests = guestLabel(order);
  const total = money(order.totalJpy);
  const deposit = money(order.depositJpy);
  const onsiteDue = money(order.onsiteDueJpy);
  const plan = order.plan || "和服體驗";
  const hair = order.hair ? "需要" : "不需要";
  const photo = order.photo ? "需要" : "不需要";

  const text = [
    `${name} 您好：`,
    "",
    "您的和服體驗預約已確認，資訊如下：",
    `訂單編號：${orderNo}`,
    `體驗日期：${bookingAt} (JST)`,
    `人數：${guests}`,
    `方案：${plan}`,
    `妝髮：${hair}`,
    `攝影：${photo}`,
    `總額：${total}`,
    `已收訂金：${deposit}`,
    `現場應收：${onsiteDue}`,
    "",
    "如需更改、取消或有任何問題，請直接聯繫客服。",
    "",
    "Foreveryoung 旅乘"
  ].join("\n");

  const rows = [
    ["訂單編號", orderNo],
    ["體驗日期", `${bookingAt} (JST)`],
    ["人數", guests],
    ["方案", plan],
    ["妝髮", hair],
    ["攝影", photo],
    ["總額", total],
    ["已收訂金", deposit],
    ["現場應收", onsiteDue]
  ];
  const html = `
    <div style="font-family:Arial,'Noto Sans TC',sans-serif;color:#1f2937;line-height:1.7">
      <p>${escapeHtml(name)} 您好：</p>
      <p>您的和服體驗預約已確認，資訊如下：</p>
      <table style="border-collapse:collapse;width:100%;max-width:560px">
        ${rows.map(([label, value]) => `
          <tr>
            <th style="text-align:left;background:#f8fafc;border:1px solid #e2e8f0;padding:8px 10px;width:120px">${escapeHtml(label)}</th>
            <td style="border:1px solid #e2e8f0;padding:8px 10px">${escapeHtml(value)}</td>
          </tr>
        `).join("")}
      </table>
      <p>如需更改、取消或有任何問題，請直接聯繫客服。</p>
      <p>Foreveryoung 旅乘</p>
    </div>
  `;

  return { to, subject, text, html };
}

export async function sendConfirmEmail(raw: unknown, actor: AuthContext) {
  const input = sendConfirmEmailSchema.parse(raw);
  const order = await findOrder(input.orderId);
  const to = input.email || order.data.customerEmail;
  if (!to) throw new HttpError(400, "Order has no customer email");

  const message = buildConfirmEmail(order.id, order.data, to);
  const result = await sendGmailMessage(message);

  await writeAuditLog({
    orderId: order.id,
    actor,
    action: "confirm_email_sent",
    afterData: {
      orderNo: order.data.orderNo || order.id,
      customerEmail: to,
      gmailMessageId: result.messageId
    },
    metadata: { source: "gmail_api" }
  });

  return { status: "success", message: "確認信已寄出", gmailMessageId: result.messageId };
}
