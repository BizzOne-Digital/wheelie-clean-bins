"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { COLLECTION_DAYS, COLLECTION_TIMES, PAYMENT_METHODS } from "@/lib/constants";
import { POSTAL_RE } from "@/lib/validation";

/** Compact home-page form. Values are carried into /booking via the URL for final review. */
export function QuickBookForm({ maxBins }: { maxBins: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const postal = String(fd.get("postal") || "").trim();
    if (postal && !POSTAL_RE.test(postal)) {
      setError("Enter a valid Canadian postal code, e.g. M1B 2K3.");
      return;
    }
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (typeof v === "string" && v.trim()) params.set(k, v.trim());
    router.push(`/booking${params.size ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-xl border border-line bg-card p-5 sm:p-6" aria-label="Start your booking">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div>
          <label className="field-label" htmlFor="qb-address">Full address</label>
          <input id="qb-address" name="street" className="field" placeholder="123 Main St" autoComplete="street-address" />
        </div>
        <div>
          <label className="field-label" htmlFor="qb-postal">Postal code</label>
          <input
            id="qb-postal"
            name="postal"
            className="field uppercase"
            placeholder="M1B 2K3"
            autoComplete="postal-code"
            aria-invalid={!!error}
            aria-describedby={error ? "qb-error" : undefined}
            onChange={() => setError(null)}
          />
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="field-label" htmlFor="qb-bins">Number of bins</label>
          <select id="qb-bins" name="bins" className="field" defaultValue="">
            <option value="">Select an option</option>
            {Array.from({ length: maxBins }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "bin" : "bins"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="qb-day">Collection day &amp; time</label>
          <select id="qb-day" name="day" className="field" defaultValue="">
            <option value="">Select an option</option>
            {COLLECTION_DAYS.map((d) => (
              <optgroup key={d} label={d}>
                {COLLECTION_TIMES.map((t) => (
                  <option key={t} value={`${d}|${t}`}>
                    {d} — {t}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="qb-pay">Payment method</label>
          <select id="qb-pay" name="pay" className="field" defaultValue="">
            <option value="">Select an option</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p id="qb-error" role="alert" className="field-error">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-md mt-5 w-full">
        Book &amp; Subscribe <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
      <p className="mt-3 text-center text-xs text-muted">You will review your details and pricing before paying.</p>
    </form>
  );
}
