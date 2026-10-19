import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Droplet,
  Gift,
  Home as HomeIcon,
  Leaf,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { PlanData, ServiceData, SiteSettingsData } from "@/lib/defaults";
import { formatCents } from "@/lib/money";
import { SafeImage } from "@/components/ui/SafeImage";
import { telHref } from "./nav";

/* Section heading with an accent phrase ---------------------------------- */
export function SectionHeading({
  title,
  accent,
  subtitle,
  as: Tag = "h2",
  align = "center",
}: {
  title: string;
  accent?: string;
  subtitle?: string;
  as?: "h1" | "h2";
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <Tag className="font-display text-[1.9rem] font-extrabold leading-[1.08] sm:text-4xl">
        {title} {accent && <span className="text-cyan">{accent}</span>}
      </Tag>
      {subtitle && <p className="mt-2 text-[0.98rem] text-soft/85">{subtitle}</p>}
    </div>
  );
}

/* Inner page hero ---------------------------------------------------------- */
export function PageHero({
  eyebrow,
  title,
  accent,
  intro,
  image,
  imageAlt,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  intro?: string;
  image?: string;
  imageAlt?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {image && (
        <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block" aria-hidden={!imageAlt}>
          <SafeImage src={image} alt={imageAlt ?? ""} fill priority sizes="50vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-ink/10" />
        </div>
      )}
      <div className="container-x relative py-14 sm:py-20">
        <div className="max-w-2xl animate-rise">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="mt-5 font-display text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl">
            {title} {accent && <span className="text-brand">{accent}</span>}
          </h1>
          {intro && <p className="mt-5 max-w-xl whitespace-pre-line text-lg text-soft/90">{intro}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}

/* Benefits strip ----------------------------------------------------------- */
export function BenefitsStrip({ items }: { items: { title: string; text: string }[] }) {
  const icons: LucideIcon[] = [HomeIcon, Droplet, Leaf];
  return (
    <section aria-label="Why customers choose us" className="border-y border-line bg-ink-2">
      <ul className="container-x grid divide-y divide-line py-2 md:grid-cols-3 md:divide-x md:divide-y-0 md:py-6">
        {items.map((b, i) => {
          const Icon = icons[i] ?? Sparkles;
          return (
            <li key={b.title} className="flex items-center gap-4 py-4 md:justify-center md:px-6 md:py-1">
              <span className="icon-ring h-12 w-12">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="font-display text-[1.05rem] font-bold text-white">{b.title}</p>
                <p className="text-sm text-soft/80">{b.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* How it works -------------------------------------------------------------- */
const STEPS = [
  { icon: CalendarDays, title: "Choose Your Plan", text: "Select the subscription that suits your household, with convenient recurring service to keep your bins consistently clean." },
  { icon: Truck, title: "We Clean After Collection", text: "Once your bins have been emptied, we clean them curbside using high-pressure technology and hot water for a thorough clean." },
  { icon: Sparkles, title: "Enjoy the Difference", text: "Your bins are left cleaner, fresher, and ready for their next use, all without you needing to be home." },
];

export function HowItWorks({ title, accent, subtitle }: { title: string; accent: string; subtitle: string }) {
  return (
    <section className="py-14 sm:py-16" aria-labelledby="how-heading">
      <div className="container-x">
        <div id="how-heading">
          <SectionHeading title={title} accent={accent} subtitle={subtitle} />
        </div>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card relative p-6 transition-colors hover:border-cyan">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan/15 text-cyan" aria-hidden>
                <s.icon className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">
                {i + 1}. {s.title}
              </h3>
              <p className="mt-1.5 text-sm text-soft/85">{s.text}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-cyan md:block" aria-hidden />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* Pricing ------------------------------------------------------------------- */
export function PricingCard({ plan, cta = "Choose Plan", features = [] }: { plan: PlanData; cta?: string; features?: string[] }) {
  const yellow = plan.accent === "yellow";
  const [dollars, cents] = (plan.monthlyPriceCents / 100).toFixed(2).split(".");
  return (
    <article
      className={`group flex flex-col rounded-xl border-2 bg-ink-2/70 p-6 text-center transition-transform duration-200 hover:-translate-y-1 sm:p-7 ${
        yellow ? "border-brand" : "border-cyan"
      }`}
    >
      <h3 className="flex items-center justify-center gap-2 font-display text-lg font-semibold sm:text-xl">
        <MapPin className={`h-6 w-6 shrink-0 ${yellow ? "fill-brand text-ink" : "fill-cyan text-ink"}`} aria-hidden />
        {plan.name}
      </h3>
      <p className="mt-3 flex items-start justify-center font-display text-brand" aria-label={`${formatCents(plan.monthlyPriceCents)} per month`}>
        <span className="mt-2 text-2xl font-extrabold">$</span>
        <span className="text-6xl font-black leading-none tracking-tight">
          {dollars}.{cents}
        </span>
        <span className="ml-2 self-end pb-1 font-sans text-lg font-normal text-soft">/ month</span>
      </p>
      <div className="my-5 border-t border-line-strong" />
      <p className="font-display text-xl font-semibold text-white">Up to {plan.includedBins} bins</p>
      <p className="text-sm text-soft/85">Additional bins {formatCents(plan.extraBinCents, { compact: true })} each</p>
      {features.length > 0 && (
        <ul className="mt-5 space-y-2 border-t border-line pt-5 text-left text-sm">
          {features.map((ft) => (
            <li key={ft} className="flex items-start gap-2.5 text-soft">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden /> {ft}
            </li>
          ))}
        </ul>
      )}
      <Link href={`/booking?plan=${encodeURIComponent(plan.key)}`} className="btn btn-primary btn-md mt-5 w-full">
        {cta} <ArrowRight className="h-4 w-4" aria-hidden />
        <span className="sr-only"> for {plan.name}</span>
      </Link>
    </article>
  );
}

export function PricingGrid({ plans, features }: { plans: PlanData[]; features?: string[] }) {
  return (
    <div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-2 md:gap-6">
      {plans.map((p) => (
        <PricingCard key={p.key} plan={p} features={features} />
      ))}
    </div>
  );
}

export function OfferStrip({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto mt-5 flex max-w-4xl flex-col items-center gap-3 rounded-xl border-2 border-cyan bg-cyan/5 px-5 py-4 text-center sm:flex-row sm:justify-center sm:gap-6 sm:text-left">
      <Gift className="h-8 w-8 shrink-0 text-cyan" strokeWidth={1.6} aria-hidden />
      <p className="font-display text-xl font-bold text-cyan">{title}</p>
      <span className="hidden h-6 w-px bg-cyan/50 sm:block" aria-hidden />
      <p className="text-sm text-cyan">{text}</p>
    </div>
  );
}

/* Additional services --------------------------------------------------------- */
export function ServiceCard({ service, detailed = false }: { service: ServiceData; detailed?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-line bg-card">
      <div className="relative aspect-[16/9] overflow-hidden">
        <SafeImage
          src={service.imageUrl}
          alt={service.imageAlt || service.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4 sm:p-5">
        <h3 className="flex items-center gap-2.5 font-display text-lg font-bold">
          <Sparkles className="h-5 w-5 text-cyan" aria-hidden />
          {service.title}
        </h3>
        {detailed ? (
          <p className="mt-2 text-sm text-soft/85">{service.description || service.summary}</p>
        ) : (
          service.summary && <p className="mt-1.5 text-sm text-soft/80">{service.summary}</p>
        )}
      </div>
    </article>
  );
}

export function QuoteCtas({ settings, compact = false }: { settings: SiteSettingsData; compact?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-3 ${compact ? "" : "mt-6"}`}>
      <a href={telHref(settings.phone)} className="btn btn-primary btn-md">
        <Phone className="h-4 w-4" aria-hidden /> Call {settings.phoneDisplay}
      </a>
      <a href={`mailto:${settings.email}?subject=${encodeURIComponent("Quote request")}`} className="btn btn-ghost btn-md">
        <Mail className="h-4 w-4 text-cyan" aria-hidden /> Email for a quote
      </a>
    </div>
  );
}

/* Service areas ---------------------------------------------------------------- */
export function ServiceAreas({ areas, title = "Areas we serve" }: { areas: string[]; title?: string }) {
  return (
    <section className="border-t border-line bg-ink-2 py-14" aria-labelledby="areas-heading">
      <div className="container-x">
        <h2 id="areas-heading" className="text-center font-display text-3xl font-extrabold">
          {title}
        </h2>
        <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
          {areas.map((a) => (
            <li key={a} className="flex items-center gap-2.5 rounded-lg border border-line bg-card px-4 py-3 text-sm font-medium text-white">
              <MapPin className="h-4 w-4 shrink-0 text-cyan" aria-hidden /> {a}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-center text-sm text-muted">Not sure if your street is covered? Call or email us and we will confirm.</p>
      </div>
    </section>
  );
}

/* Closing CTA band ---------------------------------------------------------------- */
export function CtaBand({ title = "Ready for cleaner, fresher bins?", text = "Plans from $14.99/month. No need to be home." }: { title?: string; text?: string }) {
  return (
    <section className="py-14">
      <div className="container-x">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border-2 border-brand bg-ink-2 p-7 sm:p-10 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl font-extrabold">{title}</h2>
            <p className="mt-2 text-soft/85">{text}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/booking" className="btn btn-primary btn-lg">
              Book My First Clean <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <Link href="/pricing" className="btn btn-outline btn-lg">
              View Plans
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
