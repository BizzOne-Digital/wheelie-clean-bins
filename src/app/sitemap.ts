import type { MetadataRoute } from "next";
import { PAGE_DEFS } from "@/lib/defaults";
import { siteUrl } from "@/lib/stripe";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PAGE_DEFS.map((p) => ({
    url: `${base}${p.path === "/" ? "" : p.path}`,
    changeFrequency: "monthly",
    priority: p.path === "/" ? 1 : p.slug === "booking" || p.slug === "pricing" ? 0.9 : 0.7,
  }));
}
