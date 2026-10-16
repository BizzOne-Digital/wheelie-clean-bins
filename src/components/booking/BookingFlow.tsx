"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CreditCard, Info, Loader2, Lock, Mail, Phone } from "lucide-react";
import type { ZodError } from "zod";
import type { PlanData } from "@/lib/defaults";
import type { Quote } from "@/lib/pricing";
import { formatCents } from "@/lib/money";
import { COLLECTION_DAYS, COLLECTION_TIMES, PAYMENT_METHODS, PROMO_CHOICES, RETURN_LOCATIONS } from "@/lib/constants";
import { customerStepSchema, fieldErrors, planStepSchema, scheduleStepSchema } from "@/lib/validation";

export interface BookingFlowProps {
  plans: PlanData[];
  maxBins: number;
  annualPromoEnabled: boolean;
  emtEnabled: boolean;
  recurringMonthly: boolean;
  timingNotice: string;
  stripeReady: boolean;
  phone: string;
  phoneDisplay: string;
  email: string;
  initial: Partial<FormState>;
}

export interface FormState {
  name: string;
  email: string;
  phone: string;
  street: string;
  unit: string;
  city: string;
  province: "ON";
  postalCode: string;
  planKey: string;
  bins: string;
  collectionDay: string;
  collectionTime: string;
  returnLocation: string;
  termMonths: string;
  promoChoice: string;
  paymentMethod: string;
  notes: string;
}

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  street: "",
  unit: "",
  city: "",
  province: "ON",
  postalCode: "",
  planKey: "",
  bins: "",
  collectionDay: "",
  collectionTime: "",
  returnLocation: "",
  termMonths: "1",
  promoChoice: "",
  paymentMethod: "",
  notes: "",
};

const STEPS = ["Customer & address", "Bins & schedule", "Plan & billing", "Review & payment"];
const STORAGE_KEY = "wcb-booking-draft";
const UNLISTED = "__unlisted";

export function BookingFlow(props: BookingFlowProps) {
  const { plans, maxBins } = props;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY, ...props.initial }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKey = useRef<string>("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const restored = useRef(false);

  // Restore an in-progress draft (same tab) unless the URL supplied fresh values.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { form: FormState; key: string };
        idempotencyKey.current = saved.key;
        const fromUrl = Object.fromEntries(Object.entries(props.initial).filter(([, v]) => v));
        setForm({ ...EMPTY, ...saved.form, ...fromUrl });
      }
    } catch {
      /* storage unavailable */
    }
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
  }, [props.initial]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ form, key: idempotencyKey.current }));
    } catch {
      /* storage unavailable */
    }
  }, [form]);

  const plan = plans.find((p) => p.key === form.planKey);
  const unlisted = form.planKey === UNLISTED;
  const promoNeeded = form.termMonths === "12" && props.annualPromoEnabled;
  const postalPrefix = form.postalCode.trim().toUpperCase()[0];
  const postalOutsideGta = postalPrefix && /^[A-Z]$/.test(postalPrefix) && !["L", "M"].includes(postalPrefix);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  };

  // Server-calculated summary whenever plan inputs change.
  const quoteKey = useMemo(
    () => (plan && form.bins ? JSON.stringify([plan.key, form.bins, form.termMonths, promoNeeded ? form.promoChoice || null : null]) : ""),
    [plan, form.bins, form.termMonths, form.promoChoice, promoNeeded],
  );
  useEffect(() => {
    if (!quoteKey) {
      setQuote(null);
      return;
    }
    if (promoNeeded && !form.promoChoice) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    const ctrl = new AbortController();
    const [planKey, bins, termMonths, promoChoice] = JSON.parse(quoteKey);
    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planKey, bins, termMonths, promoChoice }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setQuote(j.quote);
          setQuoteError(null);
        } else {
          setQuote(null);
          setQuoteError(j.error ?? "Could not calculate price");
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setQuoteError("Could not calculate price. Check your connection.");
      });
    return () => ctrl.abort();
  }, [quoteKey, promoNeeded, form.promoChoice]);

  const focusTop = useCallback(() => {
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  function validateStep(i: number): boolean {
    let result: { success: boolean; error?: ZodError } = { success: true };
    if (i === 0) result = customerStepSchema.safeParse(form);
    if (i === 1) {
      if (unlisted) {
        setErrors({ planKey: "Online booking is only available in the areas listed. Please contact us." });
        return false;
      }
      result = scheduleStepSchema.safeParse(form);
      if (result.success && Number(form.bins) > maxBins) {
        setErrors({ bins: `For more than ${maxBins} bins, please contact us for a quote.` });
        return false;
      }
    }
    if (i === 2) {
      result = planStepSchema.safeParse({ ...form, promoChoice: form.promoChoice || null });
      if (result.success && promoNeeded && !form.promoChoice) {
        setErrors({ promoChoice: "Choose your 12-month bonus" });
        return false;
      }
    }
    if (!result.success && result.error) {
      const errs = fieldErrors(result.error);
      setErrors(errs);
      const first = Object.keys(errs)[0];
      requestAnimationFrame(() => document.getElementById(`bf-${first}`)?.focus());
      return false;
    }
    setErrors({});
    return true;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, 3));
    focusTop();
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
    setErrors({});
    focusTop();
  }

  async function submit() {
    if (submitting) return;
    for (let i = 0; i < 3; i++) {
      if (!validateStep(i)) {
        setStep(i);
        return;
      }
    }
    if (!quote) {
      setSubmitError(quoteError ?? "Please wait for your order summary to load.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bins: Number(form.bins),
          termMonths: Number(form.termMonths),
          promoChoice: promoNeeded ? form.promoChoice : null,
          idempotencyKey: idempotencyKey.current,
          website: (document.getElementById("bf-website") as HTMLInputElement | null)?.value ?? "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        if (json.fields) {
          setErrors(json.fields);
          const keys = Object.keys(json.fields);
          const stepOf = (k: string) =>
            k in customerStepSchema.shape ? 0 : k in scheduleStepSchema.shape ? 1 : 2;
          if (keys.length) setStep(Math.min(...keys.map(stepOf)));
        }
        setSubmitError(json.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      window.location.assign(json.checkoutUrl ?? json.redirectUrl);
    } catch {
      setSubmitError("Network error. Your booking was not submitted. Please try again.");
      setSubmitting(false);
    }
  }

  const err = (k: string) =>
    errors[k] ? (
      <p id={`bf-${k}-err`} className="field-error">
        {errors[k]}
      </p>
    ) : null;
  const a = (k: keyof FormState | string) => ({
    id: `bf-${k}`,
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `bf-${k}-err` : undefined,
  });

  const cardChosen = form.paymentMethod === "credit" || form.paymentMethod === "debit";

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      <div>
        {/* Progress */}
        <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Booking progress">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined}>
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-cyan" : "bg-line"}`} />
              <p className={`mt-2 hidden text-xs font-semibold sm:block ${i === step ? "text-white" : "text-muted"}`}>
                {i + 1}. {label}
              </p>
            </li>
          ))}
        </ol>

        <div className="card p-5 sm:p-7">
          <h2 ref={headingRef} tabIndex={-1} className="scroll-mt-28 font-display text-2xl font-bold outline-none">
            <span className="text-cyan">Step {step + 1} of 4.</span> {STEPS[step]}
          </h2>

          {step === 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="bf-name">Full name *</label>
                <input className="field" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} {...a("name")} />
                {err("name")}
              </div>
              <div>
                <label className="field-label" htmlFor="bf-email">Email *</label>
                <input className="field" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} {...a("email")} />
                {err("email")}
              </div>
              <div>
                <label className="field-label" htmlFor="bf-phone">Phone *</label>
                <input className="field" type="tel" autoComplete="tel" placeholder="647 555 0123" value={form.phone} onChange={(e) => set("phone", e.target.value)} {...a("phone")} />
                {err("phone")}
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="bf-street">Street address *</label>
                <input className="field" autoComplete="address-line1" value={form.street} onChange={(e) => set("street", e.target.value)} {...a("street")} />
                {err("street")}
              </div>
              <div>
                <label className="field-label" htmlFor="bf-unit">Unit / apartment (optional)</label>
                <input className="field" autoComplete="address-line2" value={form.unit} onChange={(e) => set("unit", e.target.value)} {...a("unit")} />
              </div>
              <div>
                <label className="field-label" htmlFor="bf-city">City *</label>
                <input className="field" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} {...a("city")} />
                {err("city")}
              </div>
              <div>
                <label className="field-label" htmlFor="bf-province">Province</label>
                <select className="field" value={form.province} onChange={() => set("province", "ON")} {...a("province")}>
                  <option value="ON">Ontario</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="bf-postalCode">Postal code *</label>
                <input
                  className="field uppercase"
                  autoComplete="postal-code"
                  placeholder="M1B 2K3"
                  value={form.postalCode}
                  onChange={(e) => set("postalCode", e.target.value)}
                  {...a("postalCode")}
                />
                {err("postalCode")}
              </div>
              {postalOutsideGta && !errors.postalCode && (
                <p className="flex gap-2 rounded-lg border border-brand/40 bg-brand/5 p-3 text-sm text-soft sm:col-span-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-brand" aria-hidden />
                  This postal code may be outside our Greater Toronto service area. You can continue, or call {props.phoneDisplay} to confirm coverage.
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <fieldset className="sm:col-span-2">
                <legend className="field-label">Service region *</legend>
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-describedby={errors.planKey ? "bf-planKey-err" : undefined}>
                  {plans.map((p) => (
                    <label
                      key={p.key}
                      className={`flex cursor-pointer flex-col rounded-lg border-2 p-4 transition-colors ${
                        form.planKey === p.key ? (p.accent === "yellow" ? "border-brand bg-brand/5" : "border-cyan bg-cyan/5") : "border-line-strong hover:border-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="planKey"
                        value={p.key}
                        checked={form.planKey === p.key}
                        onChange={() => set("planKey", p.key)}
                        className="sr-only"
                        id={form.planKey === p.key || (!form.planKey && p === plans[0]) ? "bf-planKey" : undefined}
                      />
                      <span className="font-display font-bold text-white">{p.name}</span>
                      <span className="mt-1 text-sm text-soft/85">
                        {formatCents(p.monthlyPriceCents)}/mo · up to {p.includedBins} bins · extra {formatCents(p.extraBinCents)} each
                      </span>
                    </label>
                  ))}
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 text-sm transition-colors sm:col-span-2 ${
                      unlisted ? "border-muted bg-card-2" : "border-line hover:border-muted"
                    }`}
                  >
                    <input type="radio" name="planKey" value={UNLISTED} checked={unlisted} onChange={() => set("planKey", UNLISTED)} className="accent-cyan" />
                    My area is not listed
                  </label>
                </div>
                {err("planKey")}
              </fieldset>

              {unlisted ? (
                <div className="rounded-lg border border-cyan/50 bg-cyan/5 p-4 sm:col-span-2">
                  <p className="font-display font-bold text-white">We may still be able to help.</p>
                  <p className="mt-1 text-sm text-soft/90">
                    Online booking covers {plans.map((p) => p.name.replaceAll(" • ", ", ")).join(", ")}. Contact us and we will let you know if we can service your address.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={`tel:+1${props.phone}`} className="btn btn-primary btn-sm"><Phone className="h-4 w-4" aria-hidden /> {props.phoneDisplay}</a>
                    <Link href="/contact" className="btn btn-ghost btn-sm"><Mail className="h-4 w-4 text-cyan" aria-hidden /> Send a message</Link>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="field-label" htmlFor="bf-bins">Number of bins *</label>
                    <select className="field" value={form.bins} onChange={(e) => set("bins", e.target.value)} {...a("bins")}>
                      <option value="">Select</option>
                      {Array.from({ length: maxBins }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? "bin" : "bins"}
                          {plan && n > plan.includedBins ? ` (+${n - plan.includedBins} extra)` : ""}
                        </option>
                      ))}
                    </select>
                    {err("bins")}
                    <p className="mt-1 text-xs text-muted">Count garbage, recycling and green bins. More than {maxBins}? Contact us.</p>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="bf-collectionDay">Garbage collection day *</label>
                    <select className="field" value={form.collectionDay} onChange={(e) => set("collectionDay", e.target.value)} {...a("collectionDay")}>
                      <option value="">Select</option>
                      {COLLECTION_DAYS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                    {err("collectionDay")}
                  </div>
                  <div>
                    <label className="field-label" htmlFor="bf-collectionTime">Approximate collection time *</label>
                    <select className="field" value={form.collectionTime} onChange={(e) => set("collectionTime", e.target.value)} {...a("collectionTime")}>
                      <option value="">Select</option>
                      {COLLECTION_TIMES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    {err("collectionTime")}
                  </div>
                  <div>
                    <label className="field-label" htmlFor="bf-returnLocation">Where should we return your bins? *</label>
                    <select className="field" value={form.returnLocation} onChange={(e) => set("returnLocation", e.target.value)} {...a("returnLocation")}>
                      <option value="">Select</option>
                      {RETURN_LOCATIONS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    {err("returnLocation")}
                  </div>
                  <p className="flex gap-2 rounded-lg border border-line bg-ink-2 p-3 text-sm text-soft/90 sm:col-span-2">
                    <Info className="h-5 w-5 shrink-0 text-cyan" aria-hidden /> {props.timingNotice}
                  </p>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 space-y-6">
              <fieldset>
                <legend className="field-label">Billing option *</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { v: "1", t: "Monthly", d: props.recurringMonthly ? "Billed each month until cancelled" : "Pay one month at a time" },
                    { v: "3", t: "3 months upfront", d: "One-time payment, no auto-renewal" },
                    { v: "6", t: "6 months upfront", d: "One-time payment, no auto-renewal" },
                    { v: "12", t: "12 months upfront", d: props.annualPromoEnabled ? "Includes a bonus of your choice" : "One-time payment, no auto-renewal" },
                  ].map((o, i) => (
                    <label key={o.v} className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${form.termMonths === o.v ? "border-cyan bg-cyan/5" : "border-line-strong hover:border-muted"}`}>
                      <input
                        type="radio"
                        name="termMonths"
                        value={o.v}
                        checked={form.termMonths === o.v}
                        onChange={() => set("termMonths", o.v)}
                        className="sr-only"
                        id={i === 0 ? "bf-termMonths" : undefined}
                      />
                      <span className="flex items-center justify-between font-display font-bold text-white">
                        {o.t} {form.termMonths === o.v && <Check className="h-5 w-5 text-cyan" aria-hidden />}
                      </span>
                      <span className="mt-1 block text-sm text-soft/80">{o.d}</span>
                      {plan && form.bins && (
                        <span className="mt-2 block text-sm font-semibold text-brand">
                          {formatCents((plan.monthlyPriceCents + Math.max(0, Number(form.bins) - plan.includedBins) * plan.extraBinCents) * Number(o.v))}
                          {o.v === "1" ? " / month" : " before bonus"}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                {err("termMonths")}
              </fieldset>

              {promoNeeded && (
                <fieldset>
                  <legend className="field-label">Your 12-month bonus *</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PROMO_CHOICES.map((p, i) => (
                      <label key={p.value} className={`cursor-pointer rounded-lg border-2 p-4 ${form.promoChoice === p.value ? "border-brand bg-brand/5" : "border-line-strong hover:border-muted"}`}>
                        <input
                          type="radio"
                          name="promoChoice"
                          value={p.value}
                          checked={form.promoChoice === p.value}
                          onChange={() => set("promoChoice", p.value)}
                          className="sr-only"
                          id={i === 0 ? "bf-promoChoice" : undefined}
                        />
                        <span className="flex items-center justify-between font-display font-bold text-white">
                          {p.label} {form.promoChoice === p.value && <Check className="h-5 w-5 text-brand" aria-hidden />}
                        </span>
                      </label>
                    ))}
                  </div>
                  {err("promoChoice")}
                </fieldset>
              )}

              <fieldset>
                <legend className="field-label">Payment method *</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {PAYMENT_METHODS.filter((m) => m.value !== "emt" || props.emtEnabled).map((m, i) => (
                    <label key={m.value} className={`cursor-pointer rounded-lg border-2 p-4 text-center ${form.paymentMethod === m.value ? "border-cyan bg-cyan/5" : "border-line-strong hover:border-muted"}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={m.value}
                        checked={form.paymentMethod === m.value}
                        onChange={() => set("paymentMethod", m.value)}
                        className="sr-only"
                        id={i === 0 ? "bf-paymentMethod" : undefined}
                      />
                      <span className="font-display font-bold text-white">{m.label}</span>
                    </label>
                  ))}
                </div>
                {err("paymentMethod")}
                {cardChosen && (
                  <p className="mt-2 text-sm text-muted">
                    {props.stripeReady
                      ? "Card payments are processed securely by Stripe. Debit cards with a Visa or Mastercard logo are accepted."
                      : "Online card payment is not yet active. We will save your booking and contact you to arrange payment."}
                  </p>
                )}
                {form.paymentMethod === "emt" && (
                  <p className="mt-2 text-sm text-muted">Your booking stays pending until we receive your e-Transfer. Instructions appear on the next screen.</p>
                )}
              </fieldset>

              <div>
                <label className="field-label" htmlFor="bf-notes">Additional notes (optional)</label>
                <textarea className="field" rows={3} maxLength={1000} placeholder="Gate code, bin location, special instructions…" value={form.notes} onChange={(e) => set("notes", e.target.value)} {...a("notes")} />
                {err("notes")}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-6 space-y-5 text-sm">
              <ReviewBlock title="Customer & address" onEdit={() => setStep(0)}>
                <p className="text-white">{form.name}</p>
                <p>{form.email} · {form.phone}</p>
                <p>
                  {form.street}
                  {form.unit && `, Unit ${form.unit}`}, {form.city}, ON {form.postalCode.toUpperCase()}
                </p>
              </ReviewBlock>
              <ReviewBlock title="Bins & schedule" onEdit={() => setStep(1)}>
                <p className="text-white">{plan?.name}</p>
                <p>{form.bins} {form.bins === "1" ? "bin" : "bins"} · {form.collectionDay}, {form.collectionTime}</p>
                <p>Return bins: {form.returnLocation}</p>
              </ReviewBlock>
              <ReviewBlock title="Plan & billing" onEdit={() => setStep(2)}>
                <p className="text-white">{form.termMonths === "1" ? "Monthly" : `${form.termMonths} months upfront`}</p>
                {promoNeeded && <p>Bonus: {PROMO_CHOICES.find((p) => p.value === form.promoChoice)?.label}</p>}
                <p>Payment: {PAYMENT_METHODS.find((m) => m.value === form.paymentMethod)?.label}</p>
                {form.notes && <p className="whitespace-pre-line">Notes: {form.notes}</p>}
              </ReviewBlock>
              <p className="flex gap-2 rounded-lg border border-line bg-ink-2 p-3 text-soft/90">
                <Info className="h-5 w-5 shrink-0 text-cyan" aria-hidden /> {props.timingNotice}
              </p>
              <div className="hidden" aria-hidden>
                <label>Website <input id="bf-website" tabIndex={-1} autoComplete="off" /></label>
              </div>
            </div>
          )}

          {submitError && (
            <p role="alert" className="mt-5 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{submitError}</p>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
            {step > 0 ? (
              <button type="button" onClick={back} className="btn btn-ghost btn-md" disabled={submitting}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button type="button" onClick={next} className="btn btn-primary btn-md" disabled={step === 1 && unlisted}>
                Continue <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <button type="button" onClick={submit} className="btn btn-primary btn-lg" disabled={submitting || !quote}>
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : cardChosen && props.stripeReady ? <Lock className="h-5 w-5" aria-hidden /> : <Check className="h-5 w-5" aria-hidden />}
                {submitting
                  ? "Submitting…"
                  : cardChosen && props.stripeReady
                    ? `Continue to Secure Payment`
                    : "Confirm Booking"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-28" aria-label="Order summary">
        <div className="card overflow-hidden">
          <div className="border-b border-line bg-ink-2 px-5 py-4">
            <h2 className="font-display text-lg font-bold">Order summary</h2>
          </div>
          <div className="p-5" aria-live="polite">
            {quote ? (
              <>
                <ul className="space-y-3 text-sm">
                  {quote.lineItems.map((l) => (
                    <li key={l.label} className="flex justify-between gap-4">
                      <span className="text-soft/90">{l.label}</span>
                      <span className={`shrink-0 font-semibold ${l.amountCents < 0 ? "text-ok" : "text-white"}`}>
                        {l.amountCents === 0 ? "Included" : formatCents(l.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                  <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="text-white">{formatCents(quote.subtotalCents)}</dd></div>
                  {quote.discountCents > 0 && (
                    <div className="flex justify-between"><dt className="text-muted">Bonus discount</dt><dd className="text-ok">−{formatCents(quote.discountCents)}</dd></div>
                  )}
                  {quote.taxLabel && (
                    <div className="flex justify-between"><dt className="text-muted">{quote.taxLabel}</dt><dd className="text-white">{formatCents(quote.taxCents)}</dd></div>
                  )}
                  <div className="flex items-baseline justify-between border-t border-line pt-3">
                    <dt className="font-display text-base font-bold text-white">{quote.billingKind === "recurring" ? "Due monthly" : "Total due today"}</dt>
                    <dd className="font-display text-2xl font-black text-brand">{formatCents(quote.totalCents)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted">{quote.summary}. All prices in CAD.</p>
              </>
            ) : quoteError ? (
              <p className="text-sm text-danger">{quoteError}</p>
            ) : (
              <p className="text-sm text-muted">
                {unlisted
                  ? "Contact us for availability in your area."
                  : promoNeeded && !form.promoChoice
                    ? "Choose your 12-month bonus to see your total."
                    : "Choose your region and number of bins to see your price."}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-xs text-muted">
            <CreditCard className="h-4 w-4 text-cyan" aria-hidden /> Prices are confirmed by our server before payment.
          </div>
        </div>
      </aside>
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-ink-2 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display font-bold text-white">{title}</h3>
        <button type="button" onClick={onEdit} className="text-sm font-semibold text-cyan hover:underline">
          Edit<span className="sr-only"> {title}</span>
        </button>
      </div>
      <div className="space-y-0.5 text-soft/90">{children}</div>
    </div>
  );
}
