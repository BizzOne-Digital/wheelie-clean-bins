import { dbConnect, isDbConfigured } from "@/lib/db";
import { isSafeFilename, isUploadFolder, toBuffer } from "@/lib/uploads";
import { StoredUpload } from "@/models/StoredUpload";

export const runtime = "nodejs";

function notFound() {
  return Response.json({ success: false, error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_req: Request, ctx: { params: Promise<{ folder: string; filename: string }> }) {
  const { folder, filename } = await ctx.params;
  if (!isUploadFolder(folder) || !isSafeFilename(filename)) return notFound();
  if (!isDbConfigured()) return notFound();

  await dbConnect();
  const doc = await StoredUpload.findOne({ folder, filename }).lean();
  if (!doc) return notFound();

  const buf = toBuffer(doc.data);

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(buf.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
