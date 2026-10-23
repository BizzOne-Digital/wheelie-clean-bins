import { dbConnect } from "@/lib/db";
import { getSettings } from "@/lib/content";
import { computeQuote } from "@/lib/pricing";
import { formatCents } from "@/lib/money";
import { PricingPlan } from "@/models/PricingPlan";
import { AdminTitle, EmptyState } from "@/components/admin/ui";
import { PlanEditor } from "@/components/admin/RecordEditors";

export default async function PricingAdmin() {
  await dbConnect();
  const [plans, settings] = await Promise.all([PricingPlan.find().sort({ sortOrder: 1 }).lean(), getSettings()]);
  const b = settings.billing;

  return (
    <>
      <AdminTitle title="Pricing" subtitle="Regional plans and billing rules. All amounts in CAD and stored as cents." />
      <div className="grid gap-6 xl:grid-cols-2">
        {plans.length ? (
          plans.map((p) => (
            <PlanEditor
              key={String(p._id)}
              initial={{
                id: String(p._id),
                name: p.name,
                regions: p.regions ?? [],
                monthlyPrice: (p.monthlyPriceCents / 100).toFixed(2),
                includedBins: p.includedBins,
                extraBinPrice: (p.extraBinCents / 100).toFixed(2),
                accent: p.accent as "yellow" | "cyan",
                active: p.active ?? true,
                sortOrder: p.sortOrder ?? 0,
              }}
            />
          ))
        ) : (
          <EmptyState>No plans in the database yet. Run the seed script to load the default plans.</EmptyState>
        )}
        <PlanEditor isNew initial={{ name: "", regions: [], monthlyPrice: "14.99", includedBins: 2, extraBinPrice: "5.00", accent: "cyan", active: false, sortOrder: plans.length + 1 }} />
      </div>

      <section className="card mt-8 p-5">
        <h2 className="font-display text-lg font-bold">Billing rules in effect</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-soft">
          <li>Monthly billing: {b.recurringMonthly ? "recurring Stripe subscription, renews monthly" : "single month, paid once"}</li>
          <li>3, 6 and 12 months: one-time prepaid payment, no automatic renewal</li>
          <li>12-month bonus: {b.annualPromoEnabled ? "enabled (customer chooses one free extra clean or one month free)" : "disabled"}</li>
          <li>
            “One month free” discount covers: {b.monthFreeIncludesExtraBins ? "base plan + additional bins for one month" : "base plan price for one month only (additional bins still charged for all 12 months)"}
          </li>
          <li>Tax: {b.taxEnabled ? `${b.taxLabel} ${b.taxRatePercent}% shown separately` : "not added (disabled)"}</li>
        </ul>

        {plans[0] && (
          <div className="mt-5 overflow-x-auto">
            <h3 className="mb-2 font-display font-bold">Example: {plans[0].name}, {plans[0].includedBins + 1} bins</h3>
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr><th className="py-1">Term</th><th>Subtotal</th><th>Discount</th><th>Tax</th><th>Total</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {([1, 3, 6, 12] as const).map((t) => {
                  const plan = { ...plans[0], key: plans[0].key, regions: plans[0].regions ?? [], accent: plans[0].accent as "yellow" | "cyan", active: true, sortOrder: 0 };
                  const q = computeQuote({ plan, bins: plan.includedBins + 1, termMonths: t, promoChoice: t === 12 && b.annualPromoEnabled ? "month_free" : null }, settings);
                  return (
                    <tr key={t}>
                      <td className="py-1.5">{t === 1 ? "Monthly" : `${t} months`}{t === 12 && b.annualPromoEnabled ? " (month free)" : ""}</td>
                      <td>{formatCents(q.subtotalCents)}</td>
                      <td>{q.discountCents ? `−${formatCents(q.discountCents)}` : "—"}</td>
                      <td>{q.taxCents ? formatCents(q.taxCents) : "—"}</td>
                      <td className="font-semibold text-white">{formatCents(q.totalCents)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
