import { defineSecret } from "firebase-functions/params";
import { HttpError } from "./constants.js";

export const gmailClientId = defineSecret("GMAIL_CLIENT_ID");
export const gmailClientSecret = defineSecret("GMAIL_CLIENT_SECRET");
export const gmailRefreshToken = defineSecret("GMAIL_REFRESH_TOKEN");
export const gmailFromEmail = defineSecret("GMAIL_FROM_EMAIL");
export const gmailFromName = defineSecret("GMAIL_FROM_NAME");

export const gmailSecrets = [
  gmailClientId,
  gmailClientSecret,
  gmailRefreshToken,
  gmailFromEmail,
  gmailFromName
];

type GmailMessageInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function encodeHeader(value: string) {
  return /[^\x00-\x7F]/.test(value) ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=` : value;
}

function getSecretValue(secret: { value: () => string }, name: string) {
  const value = secret.value();
  if (!value) throw new HttpError(500, `Missing Gmail secret: ${name}`);
  return value;
}

async function getGmailAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getSecretValue(gmailClientId, "GMAIL_CLIENT_ID"),
      client_secret: getSecretValue(gmailClientSecret, "GMAIL_CLIENT_SECRET"),
      refresh_token: getSecretValue(gmailRefreshToken, "GMAIL_REFRESH_TOKEN"),
      grant_type: "refresh_token"
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new HttpError(500, `Gmail token refresh failed: ${data.error_description || data.error || res.status}`);
  }
  return String(data.access_token);
}

function buildRawMessage(input: GmailMessageInput) {
  const fromEmail = getSecretValue(gmailFromEmail, "GMAIL_FROM_EMAIL");
  const fromName = gmailFromName.value() || "Foreveryoung Kimono";
  const boundary = `kimono-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const headers = [
    `From: ${encodeHeader(fromName)} <${fromEmail}>`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    input.replyTo ? `Reply-To: ${input.replyTo}` : "",
    "MIME-Version: 1.0"
  ].filter(Boolean);

  if (!input.html) {
    return [
      ...headers,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      input.text
    ].join("\r\n");
  }

  return [
    ...headers,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.text,
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    input.html,
    `--${boundary}--`
  ].join("\r\n");
}

export async function sendGmailMessage(input: GmailMessageInput) {
  const accessToken = await getGmailAccessToken();
  const raw = base64Url(buildRawMessage(input));
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new HttpError(500, `Gmail send failed: ${data.error?.message || res.status}`);
  }
  return { messageId: data.id || "" };
}
