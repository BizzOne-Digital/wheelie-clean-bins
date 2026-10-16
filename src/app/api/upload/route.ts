import { getAdmin } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, UPLOAD_CHUNK_BYTES } from "@/lib/constants";
import { dbConnect } from "@/lib/db";
import { isSameOrigin, jsonError } from "@/lib/security";
import { isUploadFolder, newFilename, sniffImage, toBuffer, uploadUrl } from "@/lib/uploads";
import { StoredUpload } from "@/models/StoredUpload";
import { UploadChunk } from "@/models/UploadChunk";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHUNKS = Math.ceil(MAX_UPLOAD_BYTES / UPLOAD_CHUNK_BYTES);

/**
 * Admin image upload. Stores bytes in MongoDB (StoredUpload), never on disk.
 *
 * Small files: FormData { file, folder }.
 * Larger files are split by the client into <= 3MB chunks so each request stays under the
 * serverless request-body limit (4.5MB on Vercel): FormData { file, folder, uploadId, chunkIndex, totalChunks }.
 * The final chunk returns the same response contract as a single upload.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("Cross-origin request rejected", 403);
  const admin = await getAdmin();
  if (!admin) return jsonError("Authentication required", 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid form data or request too large", 400);
  }

  const folder = form.get("folder");
  const file = form.get("file");
  if (!isUploadFolder(folder)) return jsonError("Invalid upload folder", 400);
  if (!(file instanceof Blob) || file.size === 0) return jsonError("No file provided", 400);
  if (form.get("uploadId") == null && file.size > MAX_UPLOAD_BYTES) {
    return jsonError("File exceeds the 8MB limit", 413);
  }

  await dbConnect();
  let data: Buffer;

  const uploadIdRaw = form.get("uploadId");
  if (uploadIdRaw != null) {
    const uploadId = String(uploadIdRaw);
    const index = Number(form.get("chunkIndex"));
    const total = Number(form.get("totalChunks"));
    if (!/^[a-f0-9]{32}$/.test(uploadId)) return jsonError("Invalid upload id", 400);
    if (!Number.isInteger(total) || total < 1 || total > MAX_CHUNKS) return jsonError("File exceeds the 8MB limit", 413);
    if (!Number.isInteger(index) || index < 0 || index >= total) return jsonError("Invalid chunk index", 400);
    if (file.size > UPLOAD_CHUNK_BYTES) return jsonError("Chunk too large", 413);

    const key = `${admin.id}:${uploadId}`;
    const chunk = Buffer.from(await file.arrayBuffer());
    await UploadChunk.updateOne({ uploadId: key, index }, { $set: { data: chunk, createdAt: new Date() } }, { upsert: true });
    if (index < total - 1) return Response.json({ success: true, partial: true, received: index });

    const chunks = await UploadChunk.find({ uploadId: key }).sort({ index: 1 }).lean();
    await UploadChunk.deleteMany({ uploadId: key });
    if (chunks.length !== total || chunks.some((c, i) => c.index !== i)) return jsonError("Upload incomplete, please try again", 400);
    data = Buffer.concat(chunks.map((c) => toBuffer(c.data)));
  } else {
    data = Buffer.from(await file.arrayBuffer());
  }

  if (data.length > MAX_UPLOAD_BYTES) return jsonError("File exceeds the 8MB limit", 413);
  const kind = sniffImage(data);
  if (!kind) return jsonError("Unsupported file. Upload a JPEG, PNG, WebP or GIF image.", 415);

  const filename = newFilename(kind.ext);
  try {
    await StoredUpload.create({ folder, filename, mimeType: kind.mime, size: data.length, data });
  } catch (err) {
    console.error("[upload] save failed:", (err as Error).message);
    return jsonError("Could not save the image", 500);
  }
  await audit(admin, "upload.create", "StoredUpload", `${folder}/${filename}`, { size: data.length, mimeType: kind.mime });

  return Response.json(
    { success: true, url: uploadUrl(folder, filename), filename, size: data.length, folder },
    { status: 201 },
  );
}
