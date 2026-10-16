import { z } from "zod";
import { COLLECTION_DAYS, COLLECTION_TIMES, RETURN_LOCATIONS } from "./constants";

export const POSTAL_RE = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

export function normalizePostal(v: string) {
  const s = v.replace(/[\s-]/g, "").toUpperCase();
  return s.length === 6 ? `${s.slice(0, 3)} ${s.slice(3)}` : v.trim().toUpperCase();
}

const phone = z
  .string()
  .trim()
  .refine((v) => v.replace(/\D/g, "").replace(/^1/, "").length === 10, "Enter a valid 10-digit phone number");

const req = (label: string, max = 200) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

export const customerStepSchema = z.object({
  name: req("Full name", 120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  phone,
  street: req("Street address"),
  unit: z.string().trim().max(40).optional().default(""),
  city: req("City", 80),
  province: z.literal("ON", { message: "We currently serve Ontario only" }),
  postalCode: z.string().trim().regex(POSTAL_RE, "Enter a valid Canadian postal code (e.g. M1B 2K3)"),
});

export const scheduleStepSchema = z.object({
  planKey: req("Service region", 80),
  bins: z.coerce.number().int("Choose a whole number of bins").min(1, "Choose at least 1 bin").max(50),
  collectionDay: z.enum(COLLECTION_DAYS, { message: "Choose your garbage collection day" }),
  collectionTime: z.enum(COLLECTION_TIMES, { message: "Choose an approximate collection time" }),
  returnLocation: z.enum(RETURN_LOCATIONS, { message: "Choose where we should return your bins" }),
});

export const planStepSchema = z.object({
  termMonths: z.coerce.number().refine((n) => [1, 3, 6, 12].includes(n), "Choose a billing option") as z.ZodType<1 | 3 | 6 | 12>,
  promoChoice: z.enum(["extra_clean", "month_free"]).nullable().optional(),
  paymentMethod: z.enum(["credit", "debit", "emt"], { message: "Choose a payment method" }),
  notes: z.string().trim().max(1000, "Notes are too long").optional().default(""),
});

export const bookingSchema = customerStepSchema.merge(scheduleStepSchema).merge(planStepSchema).extend({
  idempotencyKey: z.string().trim().min(8).max(80),
  website: z.string().max(0).optional().default(""), // honeypot
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const quoteRequestSchema = z.object({
  planKey: z.string().min(1),
  bins: z.coerce.number().int().min(1).max(50),
  termMonths: z.coerce.number().refine((n) => [1, 3, 6, 12].includes(n)) as z.ZodType<1 | 3 | 6 | 12>,
  promoChoice: z.enum(["extra_clean", "month_free"]).nullable().optional(),
});

export const inquirySchema = z.object({
  name: req("Name", 120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .default("")
    .refine((v) => !v || v.replace(/\D/g, "").replace(/^1/, "").length === 10, "Enter a valid 10-digit phone number"),
  serviceInterest: req("Service interest", 80),
  message: z.string().trim().min(10, "Please add a few more details (10+ characters)").max(3000, "Message is too long"),
  website: z.string().max(0).optional().default(""),
});

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
