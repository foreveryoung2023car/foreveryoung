import { defineSecret } from "firebase-functions/params";
import { HttpError } from "./constants.js";

export const resendApiKey = defineSecret("RESEND_API_KEY");
export const resendFromEmail = defineSecret("RESEND_FROM_EMAIL");
export const resendFromName = defineSecret("RESEND_FROM_NAME");

export const resendSecrets = [
  resendApiKey,
  resendFromEmail,
  resendFromName
];

type ResendMessageInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

function getSecretValue(secret: { value: () => string }, name: string) {
  const value = secret.value();
  if (!value) throw new HttpError(500, `Missing Resend secret: ${name}`);
  return value;
}

export async function sendResendMessage(input: ResendMessageInput) {
  const fromEmail = getSecretValue(resendFromEmail, "RESEND_FROM_EMAIL");
  const fromName = resendFromName.value() || "Foreveryoung Kimono";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretValue(resendApiKey, "RESEND_API_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      reply_to: input.replyTo
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || data?.error || data?.name || res.status;
    throw new HttpError(500, `Resend send failed: ${message}`);
  }
  return { messageId: data?.id || "" };
}
