export function formatCents(cents: number, opts: { compact?: boolean } = {}) {
  const value = cents / 100;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: opts.compact && Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

/** Parse a dollars string like "14.99" into integer cents. Returns null when invalid. */
export function dollarsToCents(input: string | number): number | null {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
