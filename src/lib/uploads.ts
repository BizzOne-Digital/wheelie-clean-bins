import "server-only";
import { randomBytes } from "crypto";
import { UPLOAD_FOLDERS, type UploadFolder } from "./constants";
import { dbConnect } from "./db";
import { StoredUpload } from "@/models/StoredUpload";
import { PageContent } from "@/models/PageContent";
import { Service } from "@/models/Service";
import { SiteSettings } from "@/models/SiteSettings";

export const FILENAME_RE = /^\d{13}-[a-f0-9]{16}\.(png|jpg|webp|gif)$/;

export function isUploadFolder(v: unknown): v is UploadFolder {
  return typeof v === "string" && (UPLOAD_FOLDERS as readonly string[]).includes(v);
}

export function isSafeFilename(name: unknown): name is string {
  return typeof name === "string" && !name.includes("..") && !/[\\/]/.test(name) && FILENAME_RE.test(name);
}

/** Detects the real image format from the file signature (magic bytes). */
export function sniffImage(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" };
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  if (buf.length >= 6 && ["GIF87a", "GIF89a"].includes(buf.toString("ascii", 0, 6))) return { mime: "image/gif", ext: "gif" };
  return null;
}

/** Lean Mongoose documents return BSON Binary for Buffer fields; normalise to a Node Buffer. */
export function toBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  const v = value as { buffer?: ArrayBuffer | Uint8Array; position?: number };
  if (v && v.buffer) {
    const bytes = Buffer.from(v.buffer as Uint8Array);
    return typeof v.position === "number" ? bytes.subarray(0, v.position) : bytes;
  }
  throw new Error("Unsupported binary value");
}

export function newFilename(ext: string) {
  return `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
}

export function uploadUrl(folder: string, filename: string) {
  return `/api/uploads/${folder}/${filename}`;
}

/** Safely parses an internal upload URL. Returns null for external or malformed URLs. */
export function parseUploadUrl(url: unknown): { folder: UploadFolder; filename: string } | null {
  if (typeof url !== "string" || !url.startsWith("/api/uploads/")) return null;
  const rest = url.slice("/api/uploads/".length).split("?")[0];
  const parts = rest.split("/");
  if (parts.length !== 2) return null;
  const [folder, filename] = parts;
  if (!isUploadFolder(folder) || !isSafeFilename(filename)) return null;
  return { folder, filename };
}

/** Every place an uploaded image URL can be referenced. Keep in sync when adding image fields. */
export async function countReferences(url: string) {
  await dbConnect();
  const [pages, services, settings] = await Promise.all([
    PageContent.find({}, { published: 1, draft: 1 }).lean(),
    Service.countDocuments({ imageUrl: url }),
    SiteSettings.findOne({ singleton: "site" }, { data: 1 }).lean(),
  ]);
  let count = services;
  for (const p of pages) {
    for (const map of [p.published, p.draft]) {
      if (map) for (const v of Object.values(map)) if (v === url) count++;
    }
  }
  if (settings && JSON.stringify(settings.data ?? {}).includes(`"${url}"`)) count++;
  return count;
}

/** Lists the documents using an upload, for the media library. */
export async function findUsages(urls: string[]) {
  await dbConnect();
  const set = new Set(urls);
  const usage: Record<string, string[]> = Object.fromEntries(urls.map((u) => [u, []]));
  const [pages, services, settings] = await Promise.all([
    PageContent.find({}, { slug: 1, published: 1, draft: 1 }).lean(),
    Service.find({ imageUrl: { $in: urls } }, { title: 1, imageUrl: 1 }).lean(),
    SiteSettings.findOne({ singleton: "site" }, { data: 1 }).lean(),
  ]);
  for (const p of pages) {
    for (const [label, map] of [["", p.published], [" (draft)", p.draft]] as const) {
      if (!map) continue;
      for (const [k, v] of Object.entries(map)) if (set.has(v)) usage[v].push(`Page: ${p.slug} › ${k}${label}`);
    }
  }
  for (const s of services) usage[s.imageUrl].push(`Service: ${s.title}`);
  const data = (settings?.data ?? {}) as Record<string, unknown>;
  for (const key of ["logoUrl", "faviconUrl"]) if (set.has(data[key] as string)) usage[data[key] as string].push(`Settings: ${key}`);
  const ogUrl = (data.seo as Record<string, string> | undefined)?.ogImageUrl;
  if (ogUrl && set.has(ogUrl)) usage[ogUrl].push("Settings: SEO image");
  return usage;
}

/**
 * Deletes a stored upload only if the URL is internal and nothing references it any more.
 * External URLs are never touched. Returns true when a document was deleted.
 */
export async function deleteUploadIfUnreferenced(url: string | null | undefined) {
  const parsed = parseUploadUrl(url);
  if (!parsed || !url) return false;
  if ((await countReferences(url)) > 0) return false;
  const res = await StoredUpload.deleteOne(parsed);
  return res.deletedCount === 1;
}

/** After saving a document, clean up any previous images that are no longer referenced. */
export async function cleanupReplacedUploads(previous: (string | null | undefined)[], current: (string | null | undefined)[]) {
  const keep = new Set(current.filter(Boolean));
  for (const url of new Set(previous)) {
    if (url && !keep.has(url)) {
      try {
        await deleteUploadIfUnreferenced(url);
      } catch (err) {
        console.error("[uploads] cleanup failed:", (err as Error).message);
      }
    }
  }
}
