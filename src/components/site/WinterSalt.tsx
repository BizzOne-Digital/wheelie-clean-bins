import Link from "next/link";
import { ArrowRight, Check, Phone, Snowflake, Truck } from "lucide-react";
import type { SiteSettingsData } from "@/lib/defaults";
import { telHref } from "./nav";

/** Winter salt delivery runs November through April (Toronto time). */
export function isWinterSeason(date = new Date()) {
  const month = Number(date.toLocaleDateString("en-CA", { month: "numeric", timeZone: "America/Toronto" }));
  return month >= 11 || month <= 4;
}

const OFFERS = [
  { qty: "1 bucket", price: "$20" },
  { qty: "2 buckets", price: "$35", note: "Save $5" },
];

export function WinterSaltSection({ settings }: { settings: SiteSettingsData }) {
  if (!isWinterSeason()) return null;
  return (
    <section aria-labelledby="salt-heading" className="section-rule relative overflow-hidden py-14 sm:py-16">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan/10 blur-3xl" aria-hidden />
      <div className="container-x relative">
        <div className="grid items-center gap-10 rounded-3xl border-2 border-cyan/50 bg-ink-2 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-cyan/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan">
              <Snowflake className="h-4 w-4" aria-hidden /> Winter only · While supplies last
            </span>
            <h2 id="salt-heading" className="mt-4 font-display text-3xl font-black leading-tight sm:text-4xl">
              60L salt buckets, <span className="text-cyan">delivered free.</span>
            </h2>
            <p className="mt-3 max-w-lg text-soft/85">
              Keep your driveway, steps and walkways ready for ice and snow. We drop off 60-litre buckets of salt right to your door.
            </p>
            <ul className="mt-5 grid gap-2 text-soft sm:grid-cols-2">
              {["Free delivery", "Pay on delivery or upfront", "60-litre buckets", "While supplies last"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-cyan" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/contact?service=winter-salt" className="btn btn-primary btn-lg rounded-full">
                Order Salt <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <a href={telHref(settings.phone)} className="btn btn-ghost btn-lg rounded-full">
                <Phone className="h-5 w-5 text-cyan" aria-hidden /> {settings.phoneDisplay}
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {OFFERS.map((o) => (
              <div key={o.qty} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-card p-5">
                <div>
                  <p className="font-display text-lg font-bold text-white">{o.qty}</p>
                  <p className="text-sm text-muted">60L salt{o.note ? ` · ${o.note}` : ""}</p>
                </div>
                <p className="font-display text-4xl font-black text-brand">{o.price}</p>
              </div>
            ))}
            <p className="flex items-center gap-2 text-sm text-soft/80">
              <Truck className="h-4 w-4 text-cyan" aria-hidden /> Free delivery across our service areas. Available November to April, while supplies last.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
