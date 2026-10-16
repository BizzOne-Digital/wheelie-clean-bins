import "server-only";
import { cache } from "react";
import { dbConnect, isDbConfigured } from "./db";
import {
  DEFAULT_FAQS,
  DEFAULT_PLANS,
  DEFAULT_SERVICES,
  DEFAULT_SETTINGS,
  pageDefaults,
  type FaqData,
  type PageSlug,
  type PlanData,
  type ServiceData,
  type SiteSettingsData,
} from "./defaults";
import { SiteSettings } from "@/models/SiteSettings";
import { PageContent } from "@/models/PageContent";
import { PricingPlan } from "@/models/PricingPlan";
import { Service } from "@/models/Service";
import { FAQ } from "@/models/FAQ";
import { resolveSiteImage } from "./images";

/** Deep-merge stored settings over defaults so newly added settings always have a value. */
export function mergeSettings(stored: Record<string, unknown> | undefined): SiteSettingsData {
  const s = (stored ?? {}) as Partial<SiteSettingsData>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    social: { ...DEFAULT_SETTINGS.social, ...(s.social ?? {}) },
    booking: { ...DEFAULT_SETTINGS.booking, ...(s.booking ?? {}) },
    billing: { ...DEFAULT_SETTINGS.billing, ...(s.billing ?? {}) },
    emt: { ...DEFAULT_SETTINGS.emt, ...(s.emt ?? {}) },
    seo: { ...DEFAULT_SETTINGS.seo, ...(s.seo ?? {}), ogImageUrl: resolveSiteImage(s.seo?.ogImageUrl ?? DEFAULT_SETTINGS.seo.ogImageUrl) },
    serviceAreas: Array.isArray(s.serviceAreas) && s.serviceAreas.length ? s.serviceAreas : DEFAULT_SETTINGS.serviceAreas,
  };
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!isDbConfigured()) return fallback;
  try {
    await dbConnect();
    return await fn();
  } catch (err) {
    console.error("[content] database read failed:", (err as Error).message);
    return fallback;
  }
}

export const getSettings = cache(async (): Promise<SiteSettingsData> =>
  safe(async () => {
    const doc = await SiteSettings.findOne({ singleton: "site" }).lean();
    return mergeSettings(doc?.data);
  }, DEFAULT_SETTINGS),
);

export const getPage = cache(async (slug: PageSlug): Promise<Record<string, string>> => {
  const defaults = pageDefaults(slug);
  return safe(async () => {
    const doc = await PageContent.findOne({ slug }).lean();
    const published = (doc?.published ?? {}) as Record<string, string>;
    const merged: Record<string, string> = { ...defaults };
    for (const [k, v] of Object.entries(published)) if (typeof v === "string" && k in defaults) merged[k] = resolveSiteImage(v, slug === "about" && k === "image");
    return merged;
  }, defaults);
});

function planFromDoc(p: Record<string, unknown>): PlanData {
  return {
    key: String(p.key),
    name: String(p.name),
    regions: (p.regions as string[]) ?? [],
    monthlyPriceCents: Number(p.monthlyPriceCents),
    includedBins: Number(p.includedBins),
    extraBinCents: Number(p.extraBinCents),
    accent: (p.accent as "yellow" | "cyan") ?? "yellow",
    active: Boolean(p.active),
    sortOrder: Number(p.sortOrder ?? 0),
  };
}

export const getPlans = cache(async (includeInactive = false): Promise<PlanData[]> =>
  safe(async () => {
    const docs = await PricingPlan.find(includeInactive ? {} : { active: true }).sort({ sortOrder: 1 }).lean();
    if (!docs.length) return DEFAULT_PLANS;
    return docs.map((d) => planFromDoc(d as unknown as Record<string, unknown>));
  }, DEFAULT_PLANS),
);

export const getServices = cache(async (): Promise<ServiceData[]> =>
  safe(async () => {
    const docs = await Service.find({ active: true }).sort({ sortOrder: 1 }).lean();
    if (!docs.length) return DEFAULT_SERVICES;
    return docs.map((d) => ({
      key: d.key,
      title: d.title,
      summary: d.summary ?? "",
      description: d.description ?? "",
      imageUrl: resolveSiteImage(d.imageUrl ?? ""),
      imageAlt: d.imageAlt ?? "",
      kind: d.kind as "primary" | "additional",
      active: d.active ?? true,
      sortOrder: d.sortOrder ?? 0,
    }));
  }, DEFAULT_SERVICES),
);

export const getFaqs = cache(async (): Promise<FaqData[]> =>
  safe(async () => {
    const docs = await FAQ.find({ active: true }).sort({ sortOrder: 1 }).lean();
    if (!docs.length) return DEFAULT_FAQS;
    return docs.map((d) => ({
      key: d.key ?? String(d._id),
      question: d.question,
      answer: d.answer,
      active: true,
      sortOrder: d.sortOrder ?? 0,
    }));
  }, DEFAULT_FAQS),
);
