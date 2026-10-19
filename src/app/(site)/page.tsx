import Link from "next/link";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { getFaqs, getPage, getPlans, getServices, getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { SafeImage } from "@/components/ui/SafeImage";
import { BenefitsStrip, CtaBand, HowItWorks, OfferStrip, PricingGrid, ServiceCard } from "@/components/site/sections";
import { AreasStrip, CompareSection, FaqPreview, IncludedSection, WhyCleanSection } from "@/components/site/home-sections";
import { HeroWash } from "@/components/site/HeroWash";
import { QuickBookForm } from "@/components/booking/QuickBookForm";
import { telHref } from "@/components/site/nav";

export const revalidate = 60;
export const generateMetadata = () => pageMetadata("home");

export default async function HomePage() {
  const [c, plans, services, settings] = await Promise.all([getPage("home"), getPlans(), getServices(), getSettings()]);
  const additional = services.filter((s) => s.kind === "additional");
  const [pricing, servicesPage, faqs] = await Promise.all([getPage("pricing"), getPage("services"), getFaqs()]);
  const included = servicesPage.included.split("\n").map((l) => l.trim()).filter(Boolean);
  const faqPreview = faqs.filter((f) => ["home", "water", "arrival", "wastewater"].includes(f.key)).slice(0, 4);

  return (
    <>
      {/* Hero: starts dirty, scrolling "pressure washes" it clean */}
      <div className="-mt-[72px] sm:-mt-20">
      <HeroWash>
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden pt-[72px] sm:pt-20">
        {/* Glow + subtle grid behind the content */}
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute -right-40 top-1/4 h-[620px] w-[620px] rounded-full bg-cyan/15 blur-[120px]" />
          <div className="absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-brand/10 blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:64px_64px]" />
        </div>
        <div className="container-x relative z-[1] flex flex-1 items-center pb-6 pt-10 lg:pb-16">
          <div className="max-w-xl animate-rise lg:max-w-[46%]">
            <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-cyan">{c.heroKicker}</p>
            <h1 className="mt-4 font-display font-black leading-[0.95] tracking-[-0.03em] text-[clamp(2.7rem,5.2vw,5.4rem)]">
              <span className="block text-white">{c.heroTitle1}</span>
              <span className="block text-brand">{c.heroTitle2}</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-soft sm:text-xl">{c.heroIntro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pricing" className="btn btn-primary btn-lg rounded-full">
                Explore Cleaning Plans <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <Link href="/booking" className="btn btn-outline btn-lg rounded-full">
                Book My First Clean
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted">{c.heroTrust}</p>
          </div>
        </div>
        {/* Mascot: below the copy on mobile, lower-right on desktop */}
        <div className="relative mx-auto h-[280px] w-full max-w-md sm:h-[360px] lg:absolute lg:bottom-0 lg:right-[2%] lg:mx-0 lg:h-[82%] lg:w-[50%] lg:max-w-none">
          <SafeImage src={c.heroMascot} alt={c.heroMascotAlt} fill priority sizes="(min-width: 1024px) 50vw, 448px" className="animate-fade object-contain object-bottom" />
        </div>
      </section>
      </HeroWash>
      </div>

      <BenefitsStrip
        items={[
          { title: c.benefit1Title, text: c.benefit1Text },
          { title: c.benefit2Title, text: c.benefit2Text },
          { title: c.benefit3Title, text: c.benefit3Text },
        ]}
      />

      <HowItWorks title={c.howTitle} accent={c.howAccent} subtitle={c.howSubtitle} />

      <WhyCleanSection title={c.whyTitle} accent={c.whyAccent} subtitle={c.whySubtitle} />
      <CompareSection />

      {/* Pricing preview */}
      <section className="section-rule py-14 sm:py-16" aria-labelledby="pricing-heading">
        <div className="container-x">
          <div id="pricing-heading" className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-[1.9rem] font-extrabold leading-tight sm:text-4xl">
              {c.planTitle} <span className="text-cyan">{c.planAccent}</span>
            </h2>
            <p className="mt-2 text-soft/85">{c.planSubtitle}</p>
          </div>
          <PricingGrid plans={plans} features={c.planFeatures.split("\n").map((l) => l.trim()).filter(Boolean)} />
          <p className="mt-4 text-center text-sm text-soft/85">Pay monthly or choose 3, 6 or 12 months upfront. {c.planBinNote}</p>
          {settings.billing.annualPromoEnabled && <OfferStrip title={pricing.promoTitle} text={pricing.promoText} />}
        </div>
      </section>

      <IncludedSection items={included} />

      {/* Booking preview */}
      <section className="section-rule py-14 sm:py-16" aria-labelledby="book-heading">
        <div className="container-x grid items-center gap-10 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <h2 id="book-heading" className="font-display text-4xl font-extrabold leading-[1.05]">
              {c.bookingTitle}
              <br />
              <span className="text-cyan">{c.bookingTitleAccent}</span>
            </h2>
            <p className="mt-4 max-w-md text-lg text-soft/90">{c.bookingText}</p>
            <ul className="mt-6 space-y-3">
              <li>
                <a href={telHref(settings.phone)} className="inline-flex items-center gap-3 font-display text-lg font-semibold text-white hover:text-cyan">
                  <Phone className="h-6 w-6 text-cyan" aria-hidden /> {settings.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-3 break-all font-display text-lg font-semibold text-white hover:text-cyan">
                  <Mail className="h-6 w-6 shrink-0 text-cyan" aria-hidden /> {settings.email}
                </a>
              </li>
            </ul>
          </div>
          <QuickBookForm maxBins={settings.booking.maxBins} />
        </div>
      </section>

      {/* Additional services */}
      <section className="section-rule py-14 sm:py-16" aria-labelledby="extra-heading">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 id="extra-heading" className="font-display text-3xl font-extrabold">{c.servicesTitle}</h2>
              <p className="mt-1 text-soft/85">{c.servicesSubtitle}</p>
            </div>
            <div className="text-sm text-soft/85 sm:text-right">
              <p>
                <Link href="/contact" className="font-semibold text-white underline decoration-cyan underline-offset-4 hover:text-cyan">
                  Call or email for a quote.
                </Link>
              </p>
              <p>6- and 12-month subscribers receive a discount.</p>
            </div>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {additional.map((s) => (
              <ServiceCard key={s.key} service={s} />
            ))}
          </div>
        </div>
      </section>
      <AreasStrip areas={settings.serviceAreas} />
      <FaqPreview faqs={faqPreview.length ? faqPreview : faqs.slice(0, 4)} />
      <CtaBand />
    </>
  );
}
