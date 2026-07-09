import { z } from "zod";
import { FieldValue, Timestamp, db } from "../lib/firebase.js";
import { HttpError, orderBrandPlatform, platformAccessContains, type BrandPlatform } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";
import { sendResendMessage } from "../lib/resend.js";

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
  fromName?: string;
};

type StoreContact = {
  name: string;
  address: string;
  phone: string;
};

const storeBrandName = "樱花和服";
const publicEmailAssetBaseUrl = "https://foreveryoung2023car.github.io/foreveryoung/kimono/img/email";

const storeFallbacks: Record<string, StoreContact> = {
  kyoto1: { name: "京都清水寺店", address: "京都東山區五條橋東4-432-13 對嵐坊大廈1樓", phone: "請洽客服" },
  kyoto2: { name: "京都祇園店", address: "京都東山區常盤町169 常盤大廈", phone: "請洽客服" },
  osaka1: { name: "大阪日本橋店", address: "大阪中央區日本橋1-18-14 芝大廈7樓", phone: "請洽客服" },
  tokyo1: { name: "東京淺草寺店", address: "東京都台東區淺草1-33-8 A-one大廈9樓", phone: "請洽客服" }
};

const storeRouteGuides: Record<string, { label: string; imageUrl: string }> = {
  kyoto1: { label: "清水寺店引導路線圖", imageUrl: `${publicEmailAssetBaseUrl}/route-kyoto-kiyomizu.jpg` },
  kyoto2: { label: "祇園店引導路線圖", imageUrl: `${publicEmailAssetBaseUrl}/route-kyoto-gion.jpg` },
  osaka1: { label: "日本橋店引導路線圖", imageUrl: `${publicEmailAssetBaseUrl}/route-osaka-nippombashi.jpg` },
  tokyo1: { label: "淺草店引導路線圖", imageUrl: `${publicEmailAssetBaseUrl}/route-tokyo-asakusa.jpg` }
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

type BrandEmailProfile = {
  fromName: string;
  signature: string;
  subjectBrand: string;
};

const brandEmailProfiles: Record<BrandPlatform, BrandEmailProfile> = {
  foreveryoung: {
    fromName: `Foreveryoung｜${storeBrandName}`,
    signature: `${storeBrandName}\nForeveryoung 旅乘`,
    subjectBrand: "Foreveryoung"
  },
  "japan-go": {
    fromName: `Japan Go｜${storeBrandName}`,
    signature: `${storeBrandName}\nJapan Go 樂禾`,
    subjectBrand: "Japan Go"
  }
};

function makeDefaultTemplates(profile: BrandEmailProfile): Record<EmailKind, EmailTemplate> {
  return {
    confirm: {
      subject: `【${profile.subjectBrand} 和服體驗】訂單確認 {{orderNo}}`,
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
        "髮型設計：{{hair}}",
        "化妝造型：{{makeup}}",
        "攝影：{{photo}}",
        "總額：{{total}}",
        "已收訂金：{{deposit}}",
        "現場應收：{{onsiteDue}}",
        "",
        "如需更改、取消或有任何問題，請直接聯繫客服。",
        "",
        profile.signature
      ].join("\n")
    },
    refund_confirmed: {
      subject: `【${profile.subjectBrand} 和服體驗】退款完成通知 {{orderNo}}`,
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
        profile.signature
      ].join("\n")
    },
    booking_reminder: {
      subject: `【${profile.subjectBrand} 和服體驗】明日預約提醒 {{orderNo}}`,
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
        "髮型設計：{{hair}}",
        "化妝造型：{{makeup}}",
        "攝影：{{photo}}",
        "現場應收：{{onsiteDue}}",
        "",
        "請依預約時間前來。如需調整，請提前聯繫客服。",
        "",
        profile.signature
      ].join("\n")
    },
    proof_received: {
      subject: `【${profile.subjectBrand} 和服體驗】消費明細 {{orderNo}}`,
      text: [
        "{{name}} 您好：",
        "",
        "感謝您今日蒞臨 {{brandName}} 體驗和服，希望這次體驗為您的旅程留下美好回憶。",
        "以下是本次消費明細：",
        "訂單編號：{{orderNo}}",
        "體驗日期：{{bookingAt}} (JST)",
        "人數：{{guests}}",
        "預約店鋪：{{storeName}}",
        "店鋪地址：{{storeAddress}}",
        "店鋪電話：{{storePhone}}",
        "已收訂金：{{deposit}}",
        "和服價格：{{kimonoPrice}}",
        "髮型費：{{hairFee}}",
        "化妝費：{{makeupFee}}",
        "攝影費：{{photoFee}}",
        "折扣與退款：{{discountRefundAmount}}",
        "總價：{{total}}",
        "店內付款：{{storeActualReceived}}",
        "尾款：{{balanceDue}}",
        "",
        "再次感謝您的光臨，祝您旅途愉快、平安順心，期待下次再為您服務。",
        "",
        profile.signature
      ].join("\n")
    }
  };
}

const defaultTemplatesByBrand: Record<BrandPlatform, Record<EmailKind, EmailTemplate>> = {
  foreveryoung: makeDefaultTemplates(brandEmailProfiles.foreveryoung),
  "japan-go": makeDefaultTemplates(brandEmailProfiles["japan-go"])
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
  const hasBreakdown = order.maleAdults !== undefined || order.femaleAdults !== undefined;
  const maleAdults = Number(order.maleAdults || 0);
  const femaleAdults = Number(order.femaleAdults || 0);
  const children = Number(order.children || 0);
  if (hasBreakdown) return `${maleAdults} 位男性 / ${femaleAdults} 位女性 / ${children} 位小孩`;
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
  if (!platformAccessContains(actor.platformAccess, orderBrandPlatform(order))) {
    throw new HttpError(403, "Order belongs to another platform");
  }
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

async function loadTemplate(kind: EmailKind, brandPlatform: BrandPlatform) {
  const snap = await db.collection("settings").doc("emailTemplates").get();
  const settings = snap.data() || {};
  const brandConfigured = settings[brandPlatform]?.[kind] || (brandPlatform === "japan-go" ? settings.japanGo?.[kind] : settings.foreveryoung?.[kind]) || {};
  const legacyConfigured = brandPlatform === "foreveryoung" ? (settings[kind] || {}) : {};
  const template = {
    ...defaultTemplatesByBrand[brandPlatform][kind],
    ...legacyConfigured,
    ...brandConfigured
  } as EmailTemplate;
  return ensureRequiredTemplateLines(kind, template);
}

function ensureRequiredTemplateLines(kind: EmailKind, template: EmailTemplate): EmailTemplate {
  let text = template.text || "";
  let html = template.html;
  if (!text.includes("{{brandName}}")) {
    text = [
      "店鋪名稱：{{brandName}}",
      "預約平台：{{platformName}}",
      "",
      text
    ].join("\n");
  }
  if (html && !html.includes("{{brandName}}")) {
    html = [
      "<p><b>店鋪名稱：</b>{{brandName}}</p>",
      "<p><b>預約平台：</b>{{platformName}}</p>",
      html
    ].join("");
  }
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
  if ((kind === "confirm" || kind === "booking_reminder") && !text.includes("{{makeup}}")) {
    text += "\n化妝造型：{{makeup}}";
  }
  if ((kind === "confirm" || kind === "booking_reminder") && html && !html.includes("{{makeup}}")) {
    html += "<p><b>化妝造型：</b>{{makeup}}</p>";
  }
  if (kind === "proof_received") {
    const financeLines = [];
    if (!text.includes("{{deposit}}")) financeLines.push("已收訂金：{{deposit}}");
    if (!text.includes("{{kimonoPrice}}")) financeLines.push("和服價格：{{kimonoPrice}}");
    if (!text.includes("{{hairFee}}")) financeLines.push("髮型費：{{hairFee}}");
    if (!text.includes("{{makeupFee}}")) financeLines.push("化妝費：{{makeupFee}}");
    if (!text.includes("{{photoFee}}")) financeLines.push("攝影費：{{photoFee}}");
    if (!text.includes("{{discountRefundAmount}}")) financeLines.push("折扣與退款：{{discountRefundAmount}}");
    if (!text.includes("{{total}}")) financeLines.push("總價：{{total}}");
    if (!text.includes("{{storeActualReceived}}")) financeLines.push("店內付款：{{storeActualReceived}}");
    if (!text.includes("{{balanceDue}}")) financeLines.push("尾款：{{balanceDue}}");
    if (financeLines.length) text += ["", ...financeLines].join("\n");
    if (html) {
      const htmlFinanceLines = [];
      if (!html.includes("{{deposit}}")) htmlFinanceLines.push("<p><b>已收訂金：</b>{{deposit}}</p>");
      if (!html.includes("{{kimonoPrice}}")) htmlFinanceLines.push("<p><b>和服價格：</b>{{kimonoPrice}}</p>");
      if (!html.includes("{{hairFee}}")) htmlFinanceLines.push("<p><b>髮型費：</b>{{hairFee}}</p>");
      if (!html.includes("{{makeupFee}}")) htmlFinanceLines.push("<p><b>化妝費：</b>{{makeupFee}}</p>");
      if (!html.includes("{{photoFee}}")) htmlFinanceLines.push("<p><b>攝影費：</b>{{photoFee}}</p>");
      if (!html.includes("{{discountRefundAmount}}")) htmlFinanceLines.push("<p><b>折扣與退款：</b>{{discountRefundAmount}}</p>");
      if (!html.includes("{{total}}")) htmlFinanceLines.push("<p><b>總價：</b>{{total}}</p>");
      if (!html.includes("{{storeActualReceived}}")) htmlFinanceLines.push("<p><b>店內付款：</b>{{storeActualReceived}}</p>");
      if (!html.includes("{{balanceDue}}")) htmlFinanceLines.push("<p><b>尾款：</b>{{balanceDue}}</p>");
      if (htmlFinanceLines.length) html += htmlFinanceLines.join("");
    }
  }
  return { ...template, text, html };
}

async function loadStoreContact(storeId: unknown): Promise<StoreContact> {
  const key = String(storeId || "").trim();
  if (!key) return { name: "", address: "", phone: "" };

  const storeSnap = await db.collection("stores").doc(key).get();
  const legacySnap = storeSnap.exists ? null : await db.collection("settings").doc("stores").get();
  const configured = storeSnap.exists ? storeSnap.data() || {} : legacySnap?.data()?.[key] || {};
  const fallback = storeFallbacks[key] || { name: "", address: "", phone: "" };
  return {
    name: String(configured.name || fallback.name || "").trim(),
    address: String(configured.address || fallback.address || "").trim(),
    phone: String(configured.phone || fallback.phone || "").trim()
  };
}

function routeGuideForStore(storeId: unknown, storeName: unknown) {
  const key = String(storeId || "").trim();
  if (storeRouteGuides[key]) return storeRouteGuides[key];

  const name = String(storeName || "");
  if (/清水|kiyomizu/i.test(name)) return storeRouteGuides.kyoto1;
  if (/祇園|祇园|衹園|衹园|gion/i.test(name)) return storeRouteGuides.kyoto2;
  if (/日本橋|日本桥|nippombashi|nihonbashi/i.test(name)) return storeRouteGuides.osaka1;
  if (/淺草|浅草|asakusa/i.test(name)) return storeRouteGuides.tokyo1;
  return null;
}

async function templateVariables(orderId: string, order: FirebaseFirestore.DocumentData) {
  const orderNo = order.orderNo || orderId;
  const store = await loadStoreContact(order.storeId);
  const profile = brandEmailProfiles[orderBrandPlatform(order)];
  const routeGuide = routeGuideForStore(order.storeId, store.name);
  return {
    name: order.customerName || "貴賓",
    orderNo,
    brandName: storeBrandName,
    platformName: profile.subjectBrand,
    brandSignature: profile.signature,
    bookingAt: formatJst(order.bookingAt),
    guests: guestLabel(order),
    storeName: store.name,
    storeAddress: store.address,
    storePhone: store.phone,
    plan: order.plan || "和服體驗",
    hair: order.hair ? "需要" : "不需要",
    makeup: order.makeup ? "需要" : "不需要",
    makeupPlan: order.makeupPlan || "",
    photo: order.photo ? "需要" : "不需要",
    total: money(order.totalJpy),
    deposit: money(order.depositJpy),
    kimonoPrice: money(order.kimonoPriceJpy),
    hairFee: money(order.hairFeeJpy),
    makeupFee: money(order.makeupFeeJpy),
    photoFee: money(order.photoFeeJpy),
    discountLabel: discountLabel(order),
    discountRefundAmount: money(order.discountRefundAmountJpy),
    onsiteDue: money(order.onsiteDueJpy),
    storeActualReceived: money(order.storeActualReceivedJpy),
    balanceDue: money(order.balanceDueJpy),
    refundAmount: money(order.refundAmountJpy),
    refundTime: order.refundTime ? formatJst(order.refundTime) : "—",
    refundReason: order.refundReason || "—",
    proofNote: order.proofNote || "—",
    proofUrl: order.proofUrl || "",
    storeLogoUrl: `${publicEmailAssetBaseUrl}/ouka-kimono-logo.jpg`,
    storeRouteGuideLabel: routeGuide?.label || "",
    storeRouteGuideUrl: routeGuide?.imageUrl || "",
    phone: order.customerPhone || "",
    email: order.customerEmail || ""
  };
}

function renderString(template: string, vars: Record<string, unknown>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => String(vars[key] ?? ""));
}

const optionalStoreVariables = ["storeName", "storeAddress", "storePhone"] as const;

function removeMissingStoreFields(template: string, vars: Record<string, unknown>, html: boolean) {
  let result = template;
  optionalStoreVariables.forEach((key) => {
    if (String(vars[key] || "").trim()) return;
    const placeholder = `\\{\\{\\s*${key}\\s*\\}\\}`;
    if (html) {
      result = result.replace(
        new RegExp(
          `<(p|li|tr)\\b[^>]*>(?:(?!<\\/?\\1\\b)[\\s\\S])*?${placeholder}(?:(?!<\\/?\\1\\b)[\\s\\S])*?<\\/\\1>`,
          "gi"
        ),
        ""
      );
    } else {
      result = result
        .split(/\r?\n/)
        .filter((line) => !new RegExp(placeholder).test(line))
        .join("\n");
    }
  });
  return result;
}

function textToHtml(text: string) {
  return `<div style="font-family:Arial,'Noto Sans TC',sans-serif;color:#1f2937;line-height:1.7;white-space:pre-line">${escapeHtml(text)}</div>`;
}

function ensureSubjectStoreBrand(subject: string) {
  if (subject.includes(storeBrandName)) return subject;
  if (subject.startsWith("【") && subject.includes("】")) {
    return subject.replace("】", `｜${storeBrandName}】`);
  }
  return `【${storeBrandName}】${subject}`;
}

function appendEmailGuidanceText(text: string, vars: Record<string, unknown>) {
  const lines = [
    "",
    "店鋪資訊：",
    `店鋪名稱：${storeBrandName}`,
    `預約平台：${vars.platformName || "—"}`,
    `店鋪 Logo：${vars.storeLogoUrl || ""}`
  ];
  if (vars.storeRouteGuideUrl) {
    lines.push(`店鋪引導路線圖（${vars.storeRouteGuideLabel || "引導路線圖"}）：${vars.storeRouteGuideUrl}`);
  }
  return `${text.trimEnd()}\n${lines.join("\n")}`;
}

function decorateHtmlEmail(html: string, vars: Record<string, unknown>) {
  const logoUrl = String(vars.storeLogoUrl || "");
  const routeGuideUrl = String(vars.storeRouteGuideUrl || "");
  const routeGuideLabel = String(vars.storeRouteGuideLabel || "店鋪引導路線圖");
  const platformName = String(vars.platformName || "");
  const storeName = String(vars.storeName || "");
  const storeAddress = String(vars.storeAddress || "");
  const storePhone = String(vars.storePhone || "");

  const storeRows = [
    ["預約店鋪", storeName],
    ["店鋪地址", storeAddress],
    ["店鋪電話", storePhone],
    ["預約平台", platformName]
  ].filter(([, value]) => String(value || "").trim()).map(([label, value]) =>
    `<tr><td style="padding:6px 10px;color:#64748b;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 10px;color:#111827;font-weight:600">${escapeHtml(value)}</td></tr>`
  ).join("");

  const routeBlock = routeGuideUrl
    ? `<div style="margin-top:22px">
        <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:10px">${escapeHtml(routeGuideLabel)}</div>
        <img src="${escapeHtml(routeGuideUrl)}" alt="${escapeHtml(routeGuideLabel)}" style="display:block;width:100%;max-width:680px;height:auto;border:1px solid #e5e7eb;border-radius:10px">
      </div>`
    : "";

  return `<div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,'Noto Sans TC',sans-serif;color:#1f2937;line-height:1.7">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
      <div style="padding:24px 24px 18px;text-align:center;border-bottom:1px solid #f1f5f9;background:#fff7fb">
        <img src="${escapeHtml(logoUrl)}" alt="${storeBrandName}" style="display:block;width:180px;max-width:70%;height:auto;margin:0 auto 12px">
        <div style="font-size:22px;font-weight:800;color:#be185d;letter-spacing:.02em">${storeBrandName}</div>
        ${platformName ? `<div style="font-size:13px;color:#64748b;margin-top:4px">預約平台：${escapeHtml(platformName)}</div>` : ""}
      </div>
      <div style="padding:24px">${html}</div>
      <div style="padding:0 24px 24px">
        ${storeRows ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:4px;background:#f8fafc;border-radius:10px;overflow:hidden">${storeRows}</table>` : ""}
        ${routeBlock}
      </div>
    </div>
  </div>`;
}

async function buildOrderEmail(kind: EmailKind, orderId: string, order: FirebaseFirestore.DocumentData, to: string): Promise<RenderedEmail> {
  const brandPlatform = orderBrandPlatform(order);
  const template = await loadTemplate(kind, brandPlatform);
  const vars = await templateVariables(orderId, order);
  const subject = ensureSubjectStoreBrand(renderString(template.subject, vars));
  const bodyText = renderString(removeMissingStoreFields(template.text, vars, false), vars);
  const text = appendEmailGuidanceText(bodyText, vars);
  const bodyHtml = template.html
    ? renderString(removeMissingStoreFields(template.html, vars, true), vars)
    : textToHtml(bodyText);
  const html = decorateHtmlEmail(bodyHtml, vars);
  return { to, subject, text, html, fromName: brandEmailProfiles[brandPlatform].fromName };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendEmailWithRetry(message: RenderedEmail) {
  let lastError: unknown = null;
  const delays = [0, 600, 1600];
  for (let attempt = 1; attempt <= delays.length; attempt += 1) {
    if (delays[attempt - 1]) await wait(delays[attempt - 1]);
    try {
      const result = await sendResendMessage(message);
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
    const result = await sendEmailWithRetry(message);
    await writeAuditLog({
      orderId,
      actor,
      actorLabel: actor ? undefined : "system",
      action: action.sent,
      afterData: {
        orderNo: order.orderNo || orderId,
        customerEmail: to,
        emailMessageId: result.messageId,
        attempts: result.attempts
      },
      metadata: { source: "resend_api", emailKind: kind }
    });
    return { status: "success", message: action.message, emailMessageId: result.messageId, attempts: result.attempts };
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
      metadata: { source: "resend_api", emailKind: kind }
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
          bookingReminderMessageId: result.emailMessageId || ""
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
