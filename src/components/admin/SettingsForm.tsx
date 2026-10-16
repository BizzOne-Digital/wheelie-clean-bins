"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { SiteSettingsData } from "@/lib/defaults";
import { saveSettingsAction } from "@/app/admin/actions/content";
import { AdminImageField } from "./AdminImageField";

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-20 p-5 sm:p-6">
      <h2 className="mb-4 font-display text-lg font-bold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function SettingsForm({ initial }: { initial: SiteSettingsData }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [areas, setAreas] = useState(initial.serviceAreas.join("\n"));
  const [pending, start] = useTransition();

  const set = (patch: Partial<SiteSettingsData>) => setS((p) => ({ ...p, ...patch }));
  const nested = <K extends "booking" | "billing" | "emt" | "seo" | "social">(k: K, patch: Partial<SiteSettingsData[K]>) =>
    setS((p) => ({ ...p, [k]: { ...p[k], ...patch } }));

  function save() {
    start(async () => {
      const res = await saveSettingsAction({ ...s, serviceAreas: areas.split("\n").map((a) => a.trim()).filter(Boolean) });
      if (res?.ok) {
        toast.success(res.message);
        router.refresh();
      } else toast.error(res?.message ?? "Save failed");
    });
  }

  const text = (id: string, label: string, value: string, onChange: (v: string) => void, opts: { area?: boolean; full?: boolean; type?: string; hint?: string } = {}) => (
    <div className={opts.full || opts.area ? "md:col-span-2" : ""}>
      <label htmlFor={id} className="field-label">{label}</label>
      {opts.area ? (
        <textarea id={id} rows={3} className="field" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type={opts.type ?? "text"} className="field" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {opts.hint && <p className="mt-1 text-xs text-muted">{opts.hint}</p>}
    </div>
  );
  const check = (id: string, label: string, checked: boolean, onChange: (v: boolean) => void, hint?: string) => (
    <div className="md:col-span-2">
      <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-sm text-soft">
        <input id={id} type="checkbox" className="h-4 w-4 accent-cyan" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
      </label>
      {hint && <p className="ml-6 mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <Section title="Business & contact">
        {text("st-name", "Business name", s.businessName, (v) => set({ businessName: v }))}
        {text("st-tagline", "Footer tagline", s.tagline, (v) => set({ tagline: v }), { hint: "Sentences are split on '. ' — the second part is shown in cyan." })}
        {text("st-phone", "Phone (digits)", s.phone, (v) => set({ phone: v }))}
        {text("st-phoned", "Phone (display)", s.phoneDisplay, (v) => set({ phoneDisplay: v }))}
        {text("st-email", "Email", s.email, (v) => set({ email: v }), { type: "email", full: true })}
        <div className="md:col-span-2">
          <label htmlFor="st-areas" className="field-label">Service areas (one per line)</label>
          <textarea id="st-areas" rows={6} className="field" value={areas} onChange={(e) => setAreas(e.target.value)} />
        </div>
      </Section>

      <Section title="Brand">
        <AdminImageField label="Logo" value={s.logoUrl} onChange={(v) => set({ logoUrl: v })} folder="misc" description="Upload the original logo file (PNG with transparency recommended)." />
        <AdminImageField label="Favicon" value={s.faviconUrl} onChange={(v) => set({ faviconUrl: v })} folder="misc" description="Square PNG, at least 64×64." />
      </Section>

      <Section title="Social links (optional)">
        {text("st-fb", "Facebook URL", s.social.facebook, (v) => nested("social", { facebook: v }))}
        {text("st-ig", "Instagram URL", s.social.instagram, (v) => nested("social", { instagram: v }))}
        {text("st-tt", "TikTok URL", s.social.tiktok, (v) => nested("social", { tiktok: v }))}
      </Section>

      <Section title="Booking">
        {check("st-accept", "Accept online bookings", s.booking.acceptingBookings, (v) => nested("booking", { acceptingBookings: v }))}
        {text("st-max", "Maximum bins per online booking", String(s.booking.maxBins), (v) => nested("booking", { maxBins: Number(v) || 1 }), { type: "number" })}
        {text("st-timing", "Collection timing notice", s.booking.timingNotice, (v) => nested("booking", { timingNotice: v }), { area: true })}
      </Section>

      <Section id="billing" title="Billing & promotions">
        {check("st-rec", "Bill the monthly option as a recurring subscription", s.billing.recurringMonthly, (v) => nested("billing", { recurringMonthly: v }), "When off, the monthly option is a single one-month payment.")}
        {check("st-promo", "Offer the 12-month bonus (free extra clean or one month free)", s.billing.annualPromoEnabled, (v) => nested("billing", { annualPromoEnabled: v }))}
        {check(
          "st-promo-extra",
          "“One month free” also waives one month of additional-bin charges",
          s.billing.monthFreeIncludesExtraBins,
          (v) => nested("billing", { monthFreeIncludesExtraBins: v }),
          "When off, the free month covers the base plan price only.",
        )}
        {check("st-tax", "Add tax to orders", s.billing.taxEnabled, (v) => nested("billing", { taxEnabled: v }), "Confirm your tax obligations with your accountant before enabling.")}
        {text("st-taxlabel", "Tax label", s.billing.taxLabel, (v) => nested("billing", { taxLabel: v }))}
        {text("st-taxrate", "Tax rate (%)", String(s.billing.taxRatePercent), (v) => nested("billing", { taxRatePercent: Number(v) || 0 }), { type: "number" })}
      </Section>

      <Section title="E-Transfer (EMT)">
        {check("st-emt", "Offer e-Transfer as a payment method", s.emt.enabled, (v) => nested("emt", { enabled: v }))}
        {text("st-emt-to", "E-Transfer recipient (email or phone)", s.emt.recipient, (v) => nested("emt", { recipient: v }), {
          full: true,
          hint: "Shown to customers after booking. Leave blank to have your team send details directly.",
        })}
        {text("st-emt-ins", "E-Transfer instructions", s.emt.instructions, (v) => nested("emt", { instructions: v }), { area: true })}
      </Section>

      <Section title="SEO defaults">
        {text("st-seo-t", "Default title", s.seo.title, (v) => nested("seo", { title: v }), { full: true })}
        {text("st-seo-d", "Default description", s.seo.description, (v) => nested("seo", { description: v }), { area: true })}
        <div className="md:col-span-2">
          <AdminImageField label="Social share image" value={s.seo.ogImageUrl} onChange={(v) => nested("seo", { ogImageUrl: v })} folder="misc" />
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 flex justify-end border-t border-line bg-ink/95 py-3 backdrop-blur">
        <button type="button" className="btn btn-primary btn-md" disabled={pending} onClick={save}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />} Save settings
        </button>
      </div>
    </div>
  );
}
