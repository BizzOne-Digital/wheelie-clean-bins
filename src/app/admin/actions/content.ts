"use server";

import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { dbConnect } from "@/lib/db";
import { dollarsToCents } from "@/lib/money";
import { cleanupReplacedUploads } from "@/lib/uploads";
import { Service } from "@/models/Service";
import { PricingPlan } from "@/models/PricingPlan";
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
