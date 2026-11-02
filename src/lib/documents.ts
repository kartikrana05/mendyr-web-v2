// File uploads for KYC and medical documents. Bytes never pass through our API:
//   1. `POST <base>/upload-url` {content_type, size_bytes} → a presigned PUT ticket
//   2. `PUT upload_url` with exactly the ticket's headers — straight to the storage bucket
//      (cross-origin, no cookies, no auth header)
//   3. the caller records the returned `file_key` with its own `POST <base>`.
// Mirrors Mendyr-Backend app/services/storage_service.py.

import { api, ApiError } from "@/lib/api";
import type { Translate } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";
import type { MedicalDocumentType, ProDocumentType, ProfessionalDocument, UploadTicket } from "@/lib/types";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPT_DOCUMENTS = "application/pdf,image/*";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

// Phone photos are often 4000px+ and several MB; ~2000px is plenty to read a certificate or a
// prescription and uploads far faster on a mobile connection.
const MAX_EDGE_PX = 2000;
const DOWNSCALE_OVER_BYTES = 1024 * 1024;

/** View links in API responses last ~5 minutes; lists showing them refresh this often. */
export const VIEW_URL_REFRESH_MS = 4 * 60_000;

export const PRO_DOCUMENT_TYPES: ProDocumentType[] = [
  "government_id",
  "profile_photo",
  "nursing_council_certificate",
  "degree_certificate",
  "police_verification",
  "address_proof",
];

export const MEDICAL_DOCUMENT_TYPES: MedicalDocumentType[] = ["prescription", "lab_report", "referral", "other"];

export const KYC_PATH = "/professionals/me/documents";

export function proDocumentLabel(type: string, t: Translate): string {
  const key = `doctype.${type}`;
  const label = t(key as StringKey);
  // A type added in the portal before this build knew it: "police_verification" → "Police verification".
  return label === key ? type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ") : label;
}

/** The document that stands for a KYC type: an approved one if any, else the newest upload. */
export function currentDocument(docs: ProfessionalDocument[], type: string): ProfessionalDocument | null {
  const ofType = docs.filter((d) => d.document_type === type);
  return ofType.find((d) => d.verification_status === "approved") ?? ofType[0] ?? null;
}

/** Required KYC types with nothing uploaded, and ones whose current upload was rejected. */
export function kycGaps(docs: ProfessionalDocument[], required: string[]) {
  const missing: string[] = [];
  const rejected: string[] = [];
  for (const type of required) {
    const doc = currentDocument(docs, type);
    if (!doc) missing.push(type);
    else if (doc.verification_status === "rejected") rejected.push(type);
  }
  return { missing, rejected };
}

export function medicalDocumentLabel(type: MedicalDocumentType, t: Translate): string {
  return t(`mtype.${type}`);
}

export type UploadStage = "preparing" | "uploading" | "saving";

/** A client-side or storage failure, with a code like the API's error codes. */
export class UploadError extends Error {
  constructor(readonly code: "unsupported_file_type" | "file_too_large" | "upload_failed") {
    super(code);
    this.name = "UploadError";
  }
}

function contentTypeOf(file: File): string {
  const declared = file.type.toLowerCase();
  if (declared === "image/jpg") return "image/jpeg";
  if (declared) return declared;
  // Some browsers leave HEIC (and the odd PDF) untyped — fall back to the extension.
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION[extension] ?? "";
}

/** Re-encode a large photo as a ~2000px JPEG. Null when the browser can't decode it (e.g.
 * HEIC outside Safari) or it wouldn't get smaller — the original is uploaded then. */
async function downscale(file: Blob): Promise<Blob | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return null;
  }
  context.fillStyle = "#ffffff"; // JPEG has no transparency
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return blob && blob.size < file.size ? blob : null;
}

/** Check the type and size (and shrink big photos) before asking for an upload URL. */
export async function prepareUpload(file: File): Promise<{ body: Blob; contentType: string }> {
  let contentType = contentTypeOf(file);
  if (!ALLOWED_TYPES.includes(contentType)) throw new UploadError("unsupported_file_type");
  let body: Blob = file;
  if (contentType.startsWith("image/") && file.size > DOWNSCALE_OVER_BYTES) {
    const smaller = await downscale(file);
    if (smaller) {
      body = smaller;
      contentType = "image/jpeg";
    }
  }
  if (body.size === 0) throw new UploadError("upload_failed");
  if (body.size > MAX_UPLOAD_BYTES) throw new UploadError("file_too_large");
  return { body, contentType };
}

/**
 * Steps 1–2: get a presigned URL from `${basePath}/upload-url` and PUT the file to the bucket.
 * Returns the `file_key` to record. `basePath` is e.g. "/professionals/me/documents".
 */
export async function uploadToStorage(
  basePath: string,
  file: File,
  onStage?: (stage: UploadStage) => void,
): Promise<string> {
  onStage?.("preparing");
  const { body, contentType } = await prepareUpload(file);
  onStage?.("uploading");
  const ticket = await api<UploadTicket>(`${basePath}/upload-url`, {
    method: "POST",
    body: { content_type: contentType, size_bytes: body.size },
  });
  let response: Response;
  try {
    response = await fetch(ticket.upload_url, {
      method: ticket.method || "PUT",
      headers: ticket.headers,
      body,
      credentials: "omit",
      cache: "no-store",
    });
  } catch {
    // Offline, or the bucket's CORS rules rejected the request.
    throw new UploadError("upload_failed");
  }
  if (!response.ok) throw new UploadError("upload_failed");
  onStage?.("saving");
  return ticket.file_key;
}

/** A friendly message for any failure along the upload → record path. */
export function uploadErrorMessage(error: unknown, t: Translate): string {
  const code = error instanceof UploadError || error instanceof ApiError ? error.code : "";
  switch (code) {
    case "unsupported_file_type":
      return t("docs.error.type");
    case "file_too_large":
      return t("docs.error.size");
    case "upload_missing":
    case "invalid_file_key":
    case "upload_failed":
    case "network":
      return t("docs.error.failed");
  }
  return error instanceof ApiError ? error.message : t("docs.error.failed");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isPdf(contentType: string | null): boolean {
  return contentType === "application/pdf";
}
