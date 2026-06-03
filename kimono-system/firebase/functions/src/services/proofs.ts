import { randomUUID } from "node:crypto";
import { z } from "zod";
import { storage } from "../lib/firebase.js";
import { HttpError } from "../lib/constants.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export const uploadOrderProofSchema = z.object({
  image: z.string().min(1),
  filename: z.string().optional(),
  contentType: z.string().optional(),
  clientRequestId: z.string().optional()
});

export async function uploadOrderProof(raw: unknown) {
  const input = uploadOrderProofSchema.parse(raw);
  const contentType = input.contentType || inferContentType(input.filename || "");
  if (!allowedMimeTypes.has(contentType)) {
    throw new HttpError(400, "Unsupported image type");
  }
  const buffer = Buffer.from(input.image, "base64");
  if (!buffer.length) throw new HttpError(400, "Empty image");
  if (buffer.length > 5 * 1024 * 1024) throw new HttpError(400, "Image exceeds 5MB");

  const ext = extensionFor(contentType, input.filename || "");
  const token = randomUUID();
  const objectPath = `order-proofs/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${randomUUID()}${ext}`;
  const bucket = storage.bucket();
  const file = bucket.file(objectPath);
  await file.save(buffer, {
    resumable: false,
    contentType,
    metadata: {
      cacheControl: "private, max-age=0, no-transform",
      metadata: {
        firebaseStorageDownloadTokens: token,
        originalFilename: input.filename || ""
      }
    }
  });
  const encodedPath = encodeURIComponent(objectPath);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
  return { status: "success", url, path: objectPath };
}

function inferContentType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  return "image/jpeg";
}

function extensionFor(contentType: string, filename: string) {
  const match = filename.toLowerCase().match(/\.(jpe?g|png|webp|heic|heif)$/);
  if (match) return `.${match[1]}`;
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/heic") return ".heic";
  if (contentType === "image/heif") return ".heif";
  return ".jpg";
}
