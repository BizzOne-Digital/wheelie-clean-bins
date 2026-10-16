import type { PlanData, SiteSettingsData } from "./defaults";
import type { BillingTerm, PromoChoice } from "./constants";
import { formatCents } from "./money";

export interface QuoteInput {
  plan: PlanData;
  bins: number;
  termMonths: BillingTerm;
  promoChoice?: PromoChoice | null;
}

export interface QuoteLine {
  label: string;
  amountCents: number;
}

export interface Quote {
  planKey: string;
  planName: string;
  bins: number;
  extraBins: number;
  termMonths: BillingTerm;
  promoChoice: PromoChoice | null;
  /** Monthly amount for one visit: base + additional bins. */
  monthlyCents: number;
  lineItems: QuoteLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  taxLabel: string;
  totalCents: number;
  /** Amount charged per month for recurring monthly billing (incl. tax), else null. */
  recurringMonthlyCents: number | null;
  billingKind: "recurring" | "prepaid";
  promoNote: string | null;
  summary: string;
}

export class QuoteError extends Error {}

/**
 * Single source of truth for prices. Used by the booking summary API and by checkout creation.
 * Client-submitted totals are never trusted; always recompute with this function.
 */
export function computeQuote(input: QuoteInput, settings: SiteSettingsData): Quote {
  const { plan, termMonths } = input;
  const bins = Math.floor(input.bins);
  if (!plan.active) throw new QuoteError("This plan is not currently available.");
  if (!Number.isInteger(bins) || bins < 1) throw new QuoteError("Choose at least one bin.");
  if (bins > settings.booking.maxBins) throw new QuoteError(`For more than ${settings.booking.maxBins} bins, please contact us for a quote.`);
  if (![1, 3, 6, 12].includes(termMonths)) throw new QuoteError("Invalid billing term.");

  const promoAvailable = termMonths === 12 && settings.billing.annualPromoEnabled;
  let promoChoice: PromoChoice | null = null;
  if (promoAvailable) {
    if (input.promoChoice !== "extra_clean" && input.promoChoice !== "month_free") {
      throw new QuoteError("Choose your 12-month bonus: one free extra clean or one month free.");
    }
    promoChoice = input.promoChoice;
  }

  const extraBins = Math.max(0, bins - plan.includedBins);
  const extraPerMonth = extraBins * plan.extraBinCents;
  const monthlyCents = plan.monthlyPriceCents + extraPerMonth;
  const months = termMonths;

  const lineItems: QuoteLine[] = [
    {
      label: `${plan.name} plan — up to ${plan.includedBins} bins × ${months} ${months === 1 ? "month" : "months"} (${formatCents(plan.monthlyPriceCents)}/mo)`,
      amountCents: plan.monthlyPriceCents * months,
    },
  ];
  if (extraBins > 0) {
    lineItems.push({
      label: `Additional bins: ${extraBins} × ${formatCents(plan.extraBinCents)} × ${months} ${months === 1 ? "month" : "months"}`,
      amountCents: extraPerMonth * months,
    });
  }
  const subtotalCents = monthlyCents * months;

  let discountCents = 0;
  let promoNote: string | null = null;
  if (promoChoice === "month_free") {
    discountCents = settings.billing.monthFreeIncludesExtraBins ? monthlyCents : plan.monthlyPriceCents;
    lineItems.push({
      label: settings.billing.monthFreeIncludesExtraBins
        ? "12-month bonus: one month free"
        : "12-month bonus: one month free (base plan; additional-bin charges still apply)",
      amountCents: -discountCents,
    });
    promoNote = "12-month bonus: one month free";
  } else if (promoChoice === "extra_clean") {
    lineItems.push({ label: "12-month bonus: one free extra clean (scheduled with our team)", amountCents: 0 });
    promoNote = "12-month bonus: one free extra clean";
  }

  const taxable = subtotalCents - discountCents;
  const taxRate = settings.billing.taxEnabled ? Math.max(0, settings.billing.taxRatePercent) : 0;
  const taxCents = Math.round((taxable * taxRate) / 100);
  const totalCents = taxable + taxCents;

  const billingKind = termMonths === 1 && settings.billing.recurringMonthly ? "recurring" : "prepaid";
  const recurringMonthlyCents = billingKind === "recurring" ? totalCents : null;

  const summary =
    billingKind === "recurring"
      ? `${formatCents(totalCents)} per month, billed monthly until cancelled`
      : `${formatCents(totalCents)} one-time payment covering ${months} ${months === 1 ? "month" : "months"} of service`;

  return {
    planKey: plan.key,
    planName: plan.name,
    bins,
    extraBins,
    termMonths,
    promoChoice,
    monthlyCents,
    lineItems,
    subtotalCents,
    discountCents,
    taxCents,
    taxLabel: settings.billing.taxEnabled ? `${settings.billing.taxLabel} (${taxRate}%)` : "",
    totalCents,
    recurringMonthlyCents,
    billingKind,
    promoNote,
    summary,
  };
}
