import Link from "next/link";
import { ArrowRight, BadgePercent, CheckCircle2 } from "lucide-react";
import { getPage, getPlans, getServices, getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { SafeImage } from "@/components/ui/SafeImage";
import { CtaBand, HowItWorks, PageHero, PricingGrid, QuoteCtas, SectionHeading, ServiceCard } from "@/components/site/sections";

export const revalidate = 60;
export const generateMetadata = () => pageMetadata("services");

export default async function ServicesPage() {
  const [c, home, services, plans, settings] = await Promise.all([
    getPage("services"),
    getPage("home"),
    getServices(),
    getPlans(),
    getSettings(),
  ]);
  const primary = services.find((s) => s.kind === "primary");
  const additional = services.filter((s) => s.kind === "additional");
  const included = c.included.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} intro={c.intro} />

      {primary && (
        <section className="py-14 sm:py-16" aria-labelledby="primary-heading">
          <div className="container-x grid items-start gap-10 lg:grid-cols-2">
            <div>
              <span className="text-sm font-bold uppercase tracking-wider text-cyan">Main service</span>
              <h2 id="primary-heading" className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{primary.title}</h2>
              <p className="mt-4 text-lg text-soft/90">{primary.description}</p>
              <h3 className="mt-8 font-display text-xl font-bold">{c.includedTitle}</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-soft">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan" aria-hidden /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/booking" className="btn btn-primary btn-lg mt-8">
                Book Bin Cleaning <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line">
              <SafeImage src={primary.imageUrl} alt={primary.imageAlt || primary.title} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
          </div>
        </section>
      )}

      <div className="section-rule" />
      <HowItWorks title="How collection-day" accent="cleaning works" subtitle={settings.booking.timingNotice} />

      <section className="section-rule py-14 sm:py-16" aria-labelledby="svc-pricing">
        <div className="container-x">
          <div id="svc-pricing">
            <SectionHeading title={home.pricingTitle} accent={home.pricingTitleAccent} subtitle={home.pricingSubtitle} />
          </div>
          <PricingGrid plans={plans} />
          <p className="mt-4 text-center text-sm">
            <Link href="/pricing" className="font-semibold text-cyan underline-offset-4 hover:underline">
              See billing options and full pricing details
            </Link>
          </p>
        </div>
      </section>

      <section className="section-rule py-14 sm:py-16" aria-labelledby="additional-heading">
        <div className="container-x">
          <SectionHeading title="Additional" accent="services" subtitle="Quoted individually for your property. Call or email us to get started." />
          <div id="additional-heading" className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {additional.map((s) => (
              <ServiceCard key={s.key} service={s} detailed />
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-cyan/60 bg-cyan/5 p-6 sm:p-8">
            <h3 className="flex items-center gap-3 font-display text-xl font-bold">
              <BadgePercent className="h-6 w-6 text-cyan" aria-hidden /> {c.discountTitle}
            </h3>
            <p className="mt-2 text-soft/90">{c.discountText}</p>
            <QuoteCtas settings={settings} />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
