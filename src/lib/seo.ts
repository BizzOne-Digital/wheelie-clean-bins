import type { Metadata } from "next";
import { getPage } from "./content";
import { PAGE_DEFS, type PageSlug } from "./defaults";

export async function pageMetadata(slug: PageSlug): Promise<Metadata> {
  const page = await getPage(slug);
  const path = PAGE_DEFS.find((p) => p.slug === slug)?.path ?? "/";
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    alternates: { canonical: path },
    openGraph: { title: page.seoTitle, description: page.seoDescription, url: path },
  };
}
