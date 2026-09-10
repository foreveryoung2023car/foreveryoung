import { z } from "zod";
import { FieldValue, db } from "../lib/firebase.js";
import { HttpError, normalizeBrandPlatform, type BrandPlatform } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";

export type PaymentProfile = {
  brandPlatform: BrandPlatform;
  lineUrl: string;
  messengerUrl: string;
  phone: string;
  bankCode: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  bankHolder: string;
  depositMaleTwd: number;
  depositFemaleTwd: number;
  depositChildTwd: number;
  depositMaleJpy: number;
  depositFemaleJpy: number;
  depositChildJpy: number;
  paymentNote: string;
  enabled: boolean;
};

const defaultProfiles: Record<BrandPlatform, PaymentProfile> = {
  foreveryoung: {
    brandPlatform: "foreveryoung",
    lineUrl: "https://lin.ee/TgFCvYQ",
    messengerUrl: "https://m.me/foreveryoung2023car",
    phone: "+81 80-3705-5176",
    bankCode: "008",
    bankName: "華南銀行",
    bankBranch: "營業部",
    bankAccount: "100100344320",
    bankHolder: "佳遊國際旅行社有限公司",
    depositMaleTwd: 220,
    depositFemaleTwd: 220,
    depositChildTwd: 220,
    depositMaleJpy: 1000,
    depositFemaleJpy: 1000,
    depositChildJpy: 1000,
    paymentNote: "訂金於體驗當日全額折抵消費。",
    enabled: true
  },
  "japan-go": {
    brandPlatform: "japan-go",
    lineUrl: "",
    messengerUrl: "https://m.me/japan-go",
    phone: "+81 80-3705-5176",
    bankCode: "008",
    bankName: "",
    bankBranch: "",
    bankAccount: "",
    bankHolder: "",
    depositMaleTwd: 220,
    depositFemaleTwd: 220,
    depositChildTwd: 220,
    depositMaleJpy: 1000,
    depositFemaleJpy: 1000,
    depositChildJpy: 1000,
    paymentNote: "訂金於體驗當日全額折抵消費。",
    enabled: true
  }
};

const contactUrlSchema = z.string().trim().max(2000).refine(value => !value || /^https?:\/\/[^\s]+$/i.test(value), "Invalid contact URL");

const paymentProfileSchema = z.object({
  brandPlatform: z.enum(["foreveryoung", "japan-go"]),
  lineUrl: contactUrlSchema.optional(),
  messengerUrl: contactUrlSchema.optional(),
  phone: z.string().trim().max(60).optional(),
  bankCode: z.string().trim().max(20).default(""),
  bankName: z.string().trim().max(80).default(""),
  bankBranch: z.string().trim().max(80).default(""),
  bankAccount: z.string().trim().max(80).default(""),
  bankHolder: z.string().trim().max(120).default(""),
  depositMaleTwd: z.number().int().min(0).max(100000).default(220),
  depositFemaleTwd: z.number().int().min(0).max(100000).default(220),
  depositChildTwd: z.number().int().min(0).max(100000).default(220),
  depositMaleJpy: z.number().int().min(0).max(100000).default(1000),
  depositFemaleJpy: z.number().int().min(0).max(100000).default(1000),
  depositChildJpy: z.number().int().min(0).max(100000).default(1000),
  paymentNote: z.string().trim().max(500).default(""),
  enabled: z.boolean().default(true)
});

const paymentDocRef = db.collection("settings").doc("paymentProfiles");

function cleanProfile(raw: unknown, platform: BrandPlatform): PaymentProfile {
  const base = defaultProfiles[platform];
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return paymentProfileSchema.parse({
    ...base,
    ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
    brandPlatform: platform
  }) as PaymentProfile;
}

export async function getPaymentProfile(platformRaw: unknown) {
  const platform = normalizeBrandPlatform(platformRaw);
  const snap = await paymentDocRef.get();
  const data = snap.data() || {};
  return { status: "success", profile: cleanProfile(data[platform], platform) };
}

export async function savePaymentProfile(raw: unknown, actor: AuthContext) {
  if (actor.role !== "owner") throw new HttpError(403, "Only owner can update payment settings");
  const parsed = paymentProfileSchema.parse(raw);
  const platform = normalizeBrandPlatform(parsed.brandPlatform);
  const before = (await getPaymentProfile(platform)).profile;
  const profile = cleanProfile({ ...before, ...Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined)) }, platform);
  await paymentDocRef.set({
    [platform]: {
      ...profile,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid
    }
  }, { merge: true });
  await writeAuditLog({
    actor,
    actorLabel: actor.displayName || actor.email,
    action: "payment_settings_updated",
    beforeData: before,
    afterData: profile,
    metadata: { brandPlatform: platform }
  });
  return { status: "success", profile };
}

export async function calculateBookingDepositJpy(platformRaw: unknown, counts: { maleAdults?: unknown; femaleAdults?: unknown; adults?: unknown; children?: unknown }) {
  const profile = (await getPaymentProfile(platformRaw)).profile;
  const maleAdults = Math.max(0, Number(counts.maleAdults || 0));
  const femaleAdults = Math.max(0, Number(counts.femaleAdults || 0));
  const fallbackAdults = Math.max(0, Number(counts.adults || 0));
  const knownAdults = maleAdults + femaleAdults;
  const effectiveFemaleAdults = knownAdults > 0 ? femaleAdults : fallbackAdults;
  const children = Math.max(0, Number(counts.children || 0));
  return maleAdults * profile.depositMaleJpy +
    effectiveFemaleAdults * profile.depositFemaleJpy +
    children * profile.depositChildJpy;
}
