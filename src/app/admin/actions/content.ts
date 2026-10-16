"use server";

import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { dbConnect } from "@/lib/db";
import { mergeSettings } from "@/lib/content";
import { PAGE_DEFS, PAGE_SLUGS, type PageSlug, type SiteSettingsData } from "@/lib/defaults";
import { dollarsToCents } from "@/lib/money";
import { cleanupReplacedUploads, countReferences, findUsages, parseUploadUrl } from "@/lib/uploads";
import { PageContent } from "@/models/PageContent";
import { Service } from "@/models/Service";
import { PricingPlan } from "@/models/PricingPlan";
import { FAQ } from "@/models/FAQ";
import { SiteSettings } from "@/models/SiteSettings";
import { StoredUpload } from "@/models/StoredUpload";
import type { ActionResult } from "@/components/admin/ActionForm";

type Res = { ok: boolean; message: string; at?: number; id?: string };
const ok = (message: string): Res => ({ ok: true, message, at: Date.now() });
const fail = (message: string): Res => ({ ok: false, message, at: Date.now() });

/** Image fields accept only internal uploads, local brand assets or https URLs. Never data: URIs. */
const imageUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || v.startsWith("/api/uploads/") || v.startsWith("/brand/") || v.startsWith("/images/") || /^https:\/\/[^\s]+$/.test(v), "Invalid image URL");

function revalidatePublic() {
  revalidatePath("/", "layout");
}

/* ---------------------------------------------------------------- Pages */

export async function savePageAction(slug: PageSlug, values: Record<string, string>, mode: "draft" | "publish" | "discard"): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!PAGE_SLUGS.includes(slug)) return fail("Unknown page");
  const def = PAGE_DEFS.find((p) => p.slug === slug)!;
  await dbConnect();
  const existing = await PageContent.findOne({ slug }).lean();
  const prevImages = def.fields
    .filter((f) => f.type === "image")
    .flatMap((f) => [existing?.published?.[f.key], existing?.draft?.[f.key]]);

  if (mode === "discard") {
    await PageContent.updateOne({ slug }, { $set: { draft: null, updatedBy: admin.email } });
    await cleanupReplacedUploads(prevImages, def.fields.filter((f) => f.type === "image").map((f) => existing?.published?.[f.key]));
    await audit(admin, "page.draft_discarded", "PageContent", slug);
    return ok("Draft discarded");
  }

  const clean: Record<string, string> = {};
  for (const f of def.fields) {
    const raw = typeof values[f.key] === "string" ? values[f.key] : f.default;
    if (f.type === "image") {
      const parsed = imageUrl.safeParse(raw);
      if (!parsed.success) return fail(`${f.label}: invalid image URL`);
      clean[f.key] = parsed.data;
    } else {
      const v = raw.replace(/\r\n/g, "\n").trim();
      if (v.length > 5000) return fail(`${f.label} is too long`);
      if (!v && (f.key.startsWith("seo") || f.key === "title")) return fail(`${f.label} is required`);
      clean[f.key] = v;
    }
  }

  if (mode === "draft") {
    await PageContent.updateOne({ slug }, { $set: { draft: clean, updatedBy: admin.email } }, { upsert: true });
    // Images only referenced by the previous draft can go once the new draft is saved.
    const keep = def.fields.filter((f) => f.type === "image").flatMap((f) => [clean[f.key], existing?.published?.[f.key]]);
    await cleanupReplacedUploads(prevImages, keep);
    await audit(admin, "page.draft_saved", "PageContent", slug);
    return ok("Draft saved. It is not live until you publish.");
  }

  await PageContent.updateOne(
    { slug },
    { $set: { published: clean, draft: null, publishedAt: new Date(), updatedBy: admin.email } },
    { upsert: true },
  );
  await cleanupReplacedUploads(prevImages, def.fields.filter((f) => f.type === "image").map((f) => clean[f.key]));
  await audit(admin, "page.published", "PageContent", slug);
  revalidatePublic();
  return ok("Published. Changes are live.");
}

/* ---------------------------------------------------------------- Services */

const serviceSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Title is required").max(120),
  summary: z.string().trim().max(400),
  description: z.string().trim().max(3000),
  imageUrl,
  imageAlt: z.string().trim().max(200),
  kind: z.enum(["primary", "additional"]),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export async function saveServiceAction(input: z.input<typeof serviceSchema>): Promise<Res> {
  const admin = await requireAdmin();
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid service");
  const { id, ...data } = parsed.data;
  await dbConnect();
  if (id) {
    if (!isValidObjectId(id)) return fail("Invalid service");
    const before = await Service.findByIdAndUpdate(id, { $set: data });
    if (!before) return fail("Service not found");
    await cleanupReplacedUploads([before.imageUrl], [data.imageUrl]);
    await audit(admin, "service.updated", "Service", id);
    revalidatePublic();
    return { ...ok("Service saved"), id };
  }
  const key = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}-${Date.now().toString(36)}`;
  const created = await Service.create({ ...data, key });
  await audit(admin, "service.created", "Service", String(created._id));
  revalidatePublic();
  return { ...ok("Service created")!, id: String(created._id) };
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!isValidObjectId(id)) return fail("Invalid service");
  await dbConnect();
  const svc = await Service.findById(id).lean();
  if (!svc) return fail("Service not found");
  if (svc.kind === "primary") return fail("The main bin cleaning service cannot be deleted. Edit it instead.");
  await Service.deleteOne({ _id: id });
  await cleanupReplacedUploads([svc.imageUrl], []);
  await audit(admin, "service.deleted", "Service", id, { title: svc.title });
  revalidatePublic();
  return ok("Service deleted");
}

/* ---------------------------------------------------------------- Pricing */

const planSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  regions: z.array(z.string().trim().min(1).max(60)).max(20),
  monthlyPrice: z.string(),
  includedBins: z.coerce.number().int().min(1).max(20),
  extraBinPrice: z.string(),
  accent: z.enum(["yellow", "cyan"]),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export async function savePlanAction(input: z.input<typeof planSchema>): Promise<Res> {
  const admin = await requireAdmin();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid plan");
  const { id, monthlyPrice, extraBinPrice, ...rest } = parsed.data;
  const monthlyPriceCents = dollarsToCents(monthlyPrice);
  const extraBinCents = dollarsToCents(extraBinPrice);
  if (monthlyPriceCents == null || monthlyPriceCents < 50) return fail("Enter a valid monthly price (at least $0.50)");
  if (extraBinCents == null) return fail("Enter a valid additional-bin price");
  const data = { ...rest, monthlyPriceCents, extraBinCents };
  await dbConnect();
  if (id) {
    if (!isValidObjectId(id)) return fail("Invalid plan");
    const before = await PricingPlan.findByIdAndUpdate(id, { $set: data });
    if (!before) return fail("Plan not found");
    await audit(admin, "pricing.plan_updated", "PricingPlan", id, {
      from: { monthlyPriceCents: before.monthlyPriceCents, includedBins: before.includedBins, extraBinCents: before.extraBinCents },
      to: { monthlyPriceCents, includedBins: data.includedBins, extraBinCents },
    });
    revalidatePublic();
    return { ...ok("Plan saved"), id };
  }
  const key = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}-${Date.now().toString(36)}`;
  const created = await PricingPlan.create({ ...data, key });
  await audit(admin, "pricing.plan_created", "PricingPlan", String(created._id));
  revalidatePublic();
  return { ...ok("Plan created")!, id: String(created._id) };
}

/* ---------------------------------------------------------------- FAQs */

const faqSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(3, "Question is required").max(300),
  answer: z.string().trim().min(3, "Answer is required").max(3000),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export async function saveFaqAction(input: z.input<typeof faqSchema>): Promise<Res> {
  const admin = await requireAdmin();
  const parsed = faqSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid FAQ");
  const { id, ...data } = parsed.data;
  await dbConnect();
  if (id) {
    if (!isValidObjectId(id)) return fail("Invalid FAQ");
    const res = await FAQ.updateOne({ _id: id }, { $set: data });
    if (!res.matchedCount) return fail("FAQ not found");
    await audit(admin, "faq.updated", "FAQ", id);
    revalidatePath("/faq");
    return { ...ok("FAQ saved"), id };
  }
  const created = await FAQ.create(data);
  await audit(admin, "faq.created", "FAQ", String(created._id));
  revalidatePath("/faq");
  return { ...ok("FAQ added")!, id: String(created._id) };
}

export async function deleteFaqAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!isValidObjectId(id)) return fail("Invalid FAQ");
  await dbConnect();
  const res = await FAQ.deleteOne({ _id: id });
  if (!res.deletedCount) return fail("FAQ not found");
  await audit(admin, "faq.deleted", "FAQ", id);
  revalidatePath("/faq");
  return ok("FAQ deleted");
}

/* ---------------------------------------------------------------- Settings */

const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(100),
  tagline: z.string().trim().max(200),
  phone: z.string().trim().refine((v) => v.replace(/\D/g, "").length === 10, "Phone must be 10 digits"),
  phoneDisplay: z.string().trim().min(1).max(30),
  email: z.string().trim().email("Enter a valid email").max(200),
  logoUrl: imageUrl,
  faviconUrl: imageUrl,
  serviceAreas: z.array(z.string().trim().min(1).max(60)).min(1, "Add at least one service area").max(30),
  social: z.object({
    facebook: z.string().trim().max(300).refine((v) => !v || v.startsWith("https://"), "Social links must start with https://"),
    instagram: z.string().trim().max(300).refine((v) => !v || v.startsWith("https://"), "Social links must start with https://"),
    tiktok: z.string().trim().max(300).refine((v) => !v || v.startsWith("https://"), "Social links must start with https://"),
  }),
  booking: z.object({
    acceptingBookings: z.boolean(),
    maxBins: z.coerce.number().int().min(1).max(20),
    timingNotice: z.string().trim().min(1).max(600),
  }),
  billing: z.object({
    annualPromoEnabled: z.boolean(),
    monthFreeIncludesExtraBins: z.boolean(),
    taxEnabled: z.boolean(),
    taxRatePercent: z.coerce.number().min(0).max(30),
    taxLabel: z.string().trim().max(40),
    recurringMonthly: z.boolean(),
  }),
  emt: z.object({
    enabled: z.boolean(),
    recipient: z.string().trim().max(200),
    instructions: z.string().trim().min(1).max(1500),
  }),
  seo: z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(300),
    ogImageUrl: imageUrl,
  }),
});

function settingsImages(s: Partial<SiteSettingsData> | undefined) {
  return [s?.logoUrl, s?.faviconUrl, s?.seo?.ogImageUrl];
}

export async function saveSettingsAction(input: SiteSettingsData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid settings");
  await dbConnect();
  const before = await SiteSettings.findOne({ singleton: "site" }).lean();
  const prev = mergeSettings(before?.data);
  const next = parsed.data as SiteSettingsData;
  await SiteSettings.updateOne({ singleton: "site" }, { $set: { data: next, updatedBy: admin.email } }, { upsert: true });
  await cleanupReplacedUploads(settingsImages(prev), settingsImages(next));
  await audit(admin, "settings.updated", "SiteSettings", "site");
  revalidatePublic();
  return ok("Settings saved");
}

/* ---------------------------------------------------------------- Media */

/** Replaces every reference to oldUrl with newUrl, then removes the old upload if nothing else uses it. */
export async function replaceMediaAction(oldUrl: string, newUrl: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!parseUploadUrl(oldUrl) || !parseUploadUrl(newUrl)) return fail("Invalid image");
  await dbConnect();
  const pages = await PageContent.find().lean();
  for (const p of pages) {
    const set: Record<string, string> = {};
    for (const area of ["published", "draft"] as const) {
      const map = p[area];
      if (map) for (const [k, v] of Object.entries(map)) if (v === oldUrl) set[`${area}.${k}`] = newUrl;
    }
    if (Object.keys(set).length) await PageContent.updateOne({ _id: p._id }, { $set: set });
  }
  await Service.updateMany({ imageUrl: oldUrl }, { $set: { imageUrl: newUrl } });
  const settings = await SiteSettings.findOne({ singleton: "site" }).lean();
  if (settings) {
    const data = JSON.parse(JSON.stringify(settings.data ?? {}).split(`"${oldUrl}"`).join(`"${newUrl}"`));
    await SiteSettings.updateOne({ _id: settings._id }, { $set: { data } });
  }
  await cleanupReplacedUploads([oldUrl], []);
  await audit(admin, "media.replaced", "StoredUpload", oldUrl, { newUrl });
  revalidatePublic();
  revalidatePath("/admin/media");
  return ok("Image replaced everywhere it was used");
}

export async function deleteMediaAction(url: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = parseUploadUrl(url);
  if (!parsed) return fail("Invalid image");
  await dbConnect();
  const usage = (await findUsages([url]))[url];
  if (usage.length) return fail(`This image is in use (${usage.join(", ")}). Remove it from those places first.`);
  const res = await StoredUpload.deleteOne(parsed);
  if (!res.deletedCount) return fail("Image not found");
  await audit(admin, "media.deleted", "StoredUpload", url);
  revalidatePath("/admin/media");
  return ok("Image deleted");
}

/** Conservative cleanup: removes uploads older than 7 days that nothing references. */
export async function cleanupUnusedMediaAction(): Promise<ActionResult> {
  const admin = await requireAdmin();
  await dbConnect();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const candidates = await StoredUpload.find({ createdAt: { $lt: cutoff } }, { folder: 1, filename: 1 }).lean();
  let removed = 0;
  for (const c of candidates) {
    const url = `/api/uploads/${c.folder}/${c.filename}`;
    if ((await countReferences(url)) === 0) {
      await StoredUpload.deleteOne({ _id: c._id });
      removed++;
    }
  }
  await audit(admin, "media.cleanup", "StoredUpload", undefined, { removed });
  revalidatePath("/admin/media");
  return ok(removed ? `Removed ${removed} unused image${removed === 1 ? "" : "s"}` : "No unused images older than 7 days");
}
