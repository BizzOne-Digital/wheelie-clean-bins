export const UPLOAD_FOLDERS = ["products", "gallery", "pages", "misc"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
/** Chunk size kept well below the 4.5MB Vercel serverless request-body limit. */
export const UPLOAD_CHUNK_BYTES = 3 * 1024 * 1024;

export const COLLECTION_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const COLLECTION_TIMES = ["Early morning (before 8am)", "Morning (8am-12pm)", "Afternoon (12pm-4pm)", "Not sure"] as const;
export const RETURN_LOCATIONS = ["Beside the garage", "Side of the house", "Backyard gate", "Leave at the curb", "Other (add in notes)"] as const;
export const PAYMENT_METHODS = [
  { value: "credit", label: "Credit card" },
  { value: "debit", label: "Debit card" },
  { value: "emt", label: "E-Transfer (EMT)" },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];
export const BILLING_TERMS = [1, 6, 12] as const;
export type BillingTerm = (typeof BILLING_TERMS)[number];
export const PROMO_CHOICES = [
  { value: "extra_clean", label: "One free extra clean" },
  { value: "month_free", label: "One month free" },
] as const;
export type PromoChoice = (typeof PROMO_CHOICES)[number]["value"];

export const BOOKING_STATUSES = ["new", "confirmed", "scheduled", "cancelled", "completed"] as const;
export const SERVICE_STATUSES = ["not_started", "active", "paused", "ended"] as const;
export const PAYMENT_STATUSES = ["pending", "awaiting_emt", "paid", "failed", "refunded", "not_configured", "cancelled"] as const;
export const INQUIRY_STATUSES = ["new", "in_progress", "closed"] as const;
