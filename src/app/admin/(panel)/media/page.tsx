import { dbConnect } from "@/lib/db";
import { findUsages, uploadUrl } from "@/lib/uploads";
import { StoredUpload } from "@/models/StoredUpload";
import { AdminTitle, Pagination } from "@/components/admin/ui";
import { MediaManager } from "@/components/admin/MediaManager";

const PER_PAGE = 24;

export default async function MediaAdmin({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  await dbConnect();
  const [total, docs] = await Promise.all([
    StoredUpload.countDocuments(),
    StoredUpload.find({}, { data: 0 }).sort({ createdAt: -1 }).skip((page - 1) * PER_PAGE).limit(PER_PAGE).lean(),
  ]);
  const items = docs.map((d) => ({
    url: uploadUrl(d.folder, d.filename),
    folder: d.folder,
    filename: d.filename,
    size: d.size,
    mimeType: d.mimeType,
    createdAt: d.createdAt.toISOString(),
  }));
  const usage = await findUsages(items.map((i) => i.url));

  return (
    <>
      <AdminTitle title="Media" subtitle={`${total} image${total === 1 ? "" : "s"} stored in the database. Images survive redeploys.`} />
      <MediaManager items={items.map((i) => ({ ...i, usage: usage[i.url] ?? [] }))} />
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} makeHref={(p) => `/admin/media?page=${p}`} />
    </>
  );
}
