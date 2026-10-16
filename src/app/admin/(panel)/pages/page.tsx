import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { dbConnect } from "@/lib/db";
import { PAGE_DEFS, pageDefaults, type PageSlug } from "@/lib/defaults";
import { PageContent } from "@/models/PageContent";
import { AdminTitle, fmtDate } from "@/components/admin/ui";
import { PageEditor } from "@/components/admin/PageEditor";

export default async function PagesAdmin({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug: rawSlug } = await searchParams;
  const def = PAGE_DEFS.find((p) => p.slug === rawSlug) ?? PAGE_DEFS[0];
  await dbConnect();
  const docs = await PageContent.find().lean();
  const doc = docs.find((d) => d.slug === def.slug);
  const defaults = pageDefaults(def.slug as PageSlug);
  const published = { ...defaults, ...(doc?.published ?? {}) };
  const draft = doc?.draft ? { ...published, ...doc.draft } : null;

  return (
    <>
      <AdminTitle title="Page content" subtitle="Edit text and images for each public page. Save a draft to keep working, then publish to go live." />
      <nav aria-label="Pages" className="mb-6 flex flex-wrap gap-2">
        {PAGE_DEFS.map((p) => {
          const d = docs.find((x) => x.slug === p.slug);
          return (
            <Link key={p.slug} href={`/admin/pages?slug=${p.slug}`} aria-current={p.slug === def.slug ? "page" : undefined} className={`btn btn-sm ${p.slug === def.slug ? "btn-primary" : "btn-ghost"}`}>
              {p.title}
              {d?.draft && <span className="rounded bg-brand/20 px-1.5 text-[10px] uppercase text-brand">draft</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>Last published: {fmtDate(doc?.publishedAt, true)}</span>
        <Link href={def.path} target="_blank" className="inline-flex items-center gap-1 text-cyan hover:underline">
          View live page <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <PageEditor key={def.slug} slug={def.slug} fields={def.fields} published={published} draft={draft} />
    </>
  );
}
