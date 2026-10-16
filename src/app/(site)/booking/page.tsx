import { getPage, getPlans, getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { isStripeConfigured } from "@/lib/stripe";
import { COLLECTION_DAYS, COLLECTION_TIMES } from "@/lib/constants";
import { BookingFlow, type FormState } from "@/components/booking/BookingFlow";
import { QuoteCtas } from "@/components/site/sections";

export const dynamic = "force-dynamic";
export const generateMetadata = () => pageMetadata("booking");

type SP = Record<string, string | undefined>;

function initialFromParams(sp: SP, planKeys: string[], maxBins: number): Partial<FormState> {
  const init: Partial<FormState> = {};
  if (sp.plan && planKeys.includes(sp.plan)) init.planKey = sp.plan;
  if (sp.street) init.street = sp.street.slice(0, 200);
  if (sp.postal) init.postalCode = sp.postal.slice(0, 7);
  const bins = Number(sp.bins);
  if (Number.isInteger(bins) && bins >= 1 && bins <= maxBins) init.bins = String(bins);
  if (sp.day) {
    const [day, time] = sp.day.split("|");
    if ((COLLECTION_DAYS as readonly string[]).includes(day)) init.collectionDay = day;
    if (time && (COLLECTION_TIMES as readonly string[]).includes(time)) init.collectionTime = time;
  }
  if (sp.pay && ["credit", "debit", "emt"].includes(sp.pay)) init.paymentMethod = sp.pay;
  return init;
}

export default async function BookingPage({ searchParams }: { searchParams: Promise<SP> }) {
  const [c, plans, settings, sp] = await Promise.all([getPage("booking"), getPlans(), getSettings(), searchParams]);
  const initial = initialFromParams(sp, plans.map((p) => p.key), settings.booking.maxBins);

  return (
    <section className="py-12 sm:py-16">
      <div className="container-x">
        <div className="mb-8 max-w-2xl">
          <span className="eyebrow">{c.eyebrow}</span>
          <h1 className="mt-4 font-display text-4xl font-black leading-tight sm:text-5xl">{c.title}</h1>
          <p className="mt-3 text-lg text-soft/90">{c.intro}</p>
        </div>
        {settings.booking.acceptingBookings ? (
          <BookingFlow
            plans={plans}
            maxBins={settings.booking.maxBins}
            annualPromoEnabled={settings.billing.annualPromoEnabled}
            emtEnabled={settings.emt.enabled}
            recurringMonthly={settings.billing.recurringMonthly}
            timingNotice={settings.booking.timingNotice}
            stripeReady={isStripeConfigured()}
            phone={settings.phone}
            phoneDisplay={settings.phoneDisplay}
            email={settings.email}
            initial={initial}
          />
        ) : (
          <div className="card max-w-2xl p-7">
            <h2 className="font-display text-2xl font-bold">Online booking is paused</h2>
            <p className="mt-2 text-soft/90">We are not taking new online bookings right now. Please call or email us and we will help you get started.</p>
            <QuoteCtas settings={settings} />
          </div>
        )}
      </div>
    </section>
  );
}
