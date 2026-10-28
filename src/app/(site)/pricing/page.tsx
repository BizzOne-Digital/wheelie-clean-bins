import Link from "next/link";
import { ArrowRight, CalendarClock, Repeat } from "lucide-react";
import { getPage, getPlans, getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { computeQuote } from "@/lib/pricing";
import { formatCents } from "@/lib/money";
import { CtaBand, OfferStrip, PageHero, PricingGrid } from "@/components/site/sections";

export const revalidate = 60;
export const generateMetadata = () => pageMetadata("pricing");

export default async function PricingPage() {
  const [c, plans, settings] = await Promise.all([getPage("pricing"), getPlans(), getSettings()]);
  const terms = [1, 6, 12] as const;

  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} accent={c.titleAccent} intro={c.intro} />

      <section className="py-14" aria-label="Plans">
        <div className="container-x">
          <PricingGrid plans={plans} />
          {settings.billing.annualPromoEnabled && <OfferStrip title={c.promoTitle} text={c.promoText} />}
        </div>
      </section>

      <section className="section-rule py-14" aria-labelledby="billing-heading">
        <div className="container-x">
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="billing-heading" className="font-display text-3xl font-extrabold">{c.billingTitle}</h2>
            <p className="mt-3 text-soft/90">{c.billingText}</p>
          </div>

          <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <Repeat className="h-6 w-6 text-cyan" aria-hidden />
              <h3 className="mt-3 font-display text-lg font-bold">Monthly</h3>
              <p className="mt-1 text-sm text-soft/85">
                {settings.billing.recurringMonthly
                  ? "Billed automatically each month until you cancel."
                  : "Paid one month at a time."}
              </p>
            </div>
            <div className="card p-5">
              <CalendarClock className="h-6 w-6 text-cyan" aria-hidden />
              <h3 className="mt-3 font-display text-lg font-bold">6 or 12 months upfront</h3>
              <p className="mt-1 text-sm text-soft/85">A single one-time payment covering the months you choose. It does not renew automatically.</p>
            </div>
          </div>

          {/* Base-plan totals for each billing option, calculated with the same function used at checkout */}
          <div className="mx-auto mt-10 max-w-4xl overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">Plan totals by billing option, before additional bins</caption>
              <thead className="bg-ink-2 font-display text-white">
                <tr>
                  <th scope="col" className="px-4 py-3">Billing option</th>
                  {plans.map((p) => (
                    <th key={p.key} scope="col" className="px-4 py-3">
                      {p.name}
                      <span className="block text-xs font-normal text-muted">up to {p.includedBins} bins</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {terms.map((term) => (
                  <tr key={term} className="bg-card">
                    <th scope="row" className="px-4 py-3 font-semibold text-white">
                      {term === 1 ? "Monthly" : `${term} months upfront`}
                    </th>
                    {plans.map((p) => {
                      const promo = term === 12 && settings.billing.annualPromoEnabled;
                      const base = computeQuote({ plan: p, bins: p.includedBins, termMonths: term, promoChoice: promo ? "extra_clean" : null }, settings);
                      const free = promo
                        ? computeQuote({ plan: p, bins: p.includedBins, termMonths: term, promoChoice: "month_free" }, settings)
                        : null;
                      return (
                        <td key={p.key} className="px-4 py-3 text-soft">
                          {term === 1 ? (
                            <>
                              <span className="font-semibold text-white">{formatCents(base.totalCents)}</span> / month
                            </>
                          ) : (
                            <span className="font-semibold text-white">{formatCents(base.totalCents)}</span>
                          )}
                          {free && (
                            <span className="mt-1 block text-xs text-muted">
                              + free extra clean, or {formatCents(free.totalCents)} with one month free
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mx-auto mt-6 max-w-4xl space-y-2 text-sm text-muted">
            <p>
              Additional bins are charged per monthly visit:{" "}
              {plans.map((p, i) => (
                <span key={p.key}>
                  {i > 0 && "; "}
                  {formatCents(p.extraBinCents)} each in {p.name.replaceAll(" • ", ", ")} (above {p.includedBins} bins)
                </span>
              ))}
              . For prepaid plans, additional-bin charges are multiplied by the number of months.
            </p>
            {settings.billing.annualPromoEnabled && (
              <p>
                12-month bonus: choose one free extra clean or one month free.{" "}
                {settings.billing.monthFreeIncludesExtraBins
                  ? "One month free covers one month of your base plan and additional bins."
                  : "One month free covers one month of the base plan price; additional-bin charges still apply for all 12 months."}
              </p>
            )}
            <p>
              {settings.billing.taxEnabled
                ? `${settings.billing.taxLabel} (${settings.billing.taxRatePercent}%) is added at checkout and shown separately in your order summary.`
                : "Any applicable taxes are shown separately in your order summary before payment."}{" "}
              All prices are in Canadian dollars (CAD).
            </p>
          </div>

          <div className="mt-10 text-center">
            <Link href="/booking" className="btn btn-primary btn-lg">
              Get Started <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
