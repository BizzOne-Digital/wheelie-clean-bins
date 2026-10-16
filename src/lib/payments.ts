import "server-only";
import type Stripe from "stripe";
import type { Types } from "mongoose";
import { Booking } from "@/models/Booking";
import { Payment } from "@/models/Payment";
import { Subscription } from "@/models/Subscription";
import { getStripe, siteUrl } from "./stripe";
import type { Quote } from "./pricing";

type Id = Types.ObjectId | string;

function addMonths(d: Date, months: number) {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

export async function createCheckoutSession(opts: {
  bookingId: string;
  reference: string;
  accessToken: string;
  email: string;
  quote: Quote;
}) {
  const { quote } = opts;
  const stripe = getStripe();
  const base = siteUrl();
  const confirm = `${base}/booking/confirmation?ref=${encodeURIComponent(opts.reference)}&t=${encodeURIComponent(opts.accessToken)}`;
  const metadata = { bookingId: opts.bookingId, reference: opts.reference };
  const productName =
    quote.billingKind === "recurring"
      ? `Monthly bin cleaning — ${quote.planName} (${quote.bins} ${quote.bins === 1 ? "bin" : "bins"})`
      : `${quote.termMonths}-month prepaid bin cleaning — ${quote.planName} (${quote.bins} ${quote.bins === 1 ? "bin" : "bins"})`;

  const common: Stripe.Checkout.SessionCreateParams = {
    customer_email: opts.email,
    client_reference_id: opts.bookingId,
    success_url: `${confirm}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${confirm}&cancelled=1`,
    metadata,
    locale: "en",
  };

  if (quote.billingKind === "recurring") {
    return stripe.checkout.sessions.create({
      ...common,
      mode: "subscription",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: quote.totalCents,
            recurring: { interval: "month" },
            product_data: { name: productName },
          },
        },
      ],
      subscription_data: { metadata },
    });
  }

  return stripe.checkout.sessions.create({
    ...common,
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: quote.totalCents,
          product_data: { name: productName, description: quote.promoNote ?? undefined },
        },
      },
    ],
    payment_intent_data: { metadata },
  });
}

/** Records a confirmed one-time payment. Idempotent per booking + checkout session / manual reference. */
export async function recordPrepaidPayment(opts: {
  bookingId: Id;
  amountCents: number;
  provider: "stripe" | "manual";
  method?: "credit" | "debit" | "emt";
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  manualReference?: string;
  confirmedBy?: string;
}) {
  const booking = await Booking.findById(opts.bookingId);
  if (!booking) throw new Error(`Booking ${opts.bookingId} not found`);

  const fields = {
    status: "paid" as const,
    amountCents: opts.amountCents,
    paidAt: new Date(),
    provider: opts.provider,
    method: opts.method ?? booking.paymentMethod,
    customer: booking.customer,
    stripePaymentIntentId: opts.stripePaymentIntentId,
    manualReference: opts.manualReference,
    confirmedBy: opts.confirmedBy,
  };

  if (opts.stripeCheckoutSessionId) {
    await Payment.findOneAndUpdate(
      { booking: booking._id, stripeCheckoutSessionId: opts.stripeCheckoutSessionId },
      { $set: fields },
      { upsert: true },
    );
  } else {
    // Manual (EMT) payments: settle the open pending record, otherwise add a new payment entry.
    const pending = await Payment.findOneAndUpdate({ booking: booking._id, provider: "manual", status: "pending" }, { $set: fields });
    if (!pending) await Payment.create({ booking: booking._id, ...fields });
  }

  if (booking.paymentStatus !== "paid") {
    booking.paymentStatus = "paid";
    booking.paidAt = new Date();
    if (booking.status === "new") booking.status = "confirmed";
    await booking.save();
  }

  if (booking.termMonths && !booking.stripeSubscriptionId) {
    const startsAt = new Date();
    await Subscription.findOneAndUpdate(
      { booking: booking._id },
      {
        $setOnInsert: {
          customer: booking.customer,
          planKey: booking.planKey,
          planName: booking.planName,
          bins: booking.bins,
          termMonths: booking.termMonths,
          kind: "prepaid",
          startsAt,
          endsAt: addMonths(startsAt, booking.termMonths),
        },
        $set: { providerStatus: "paid" },
      },
      { upsert: true },
    );
  }
  return booking;
}

/** Links a Stripe subscription to a booking (from checkout.session.completed). */
export async function linkStripeSubscription(bookingId: Id, stripeSubscriptionId: string) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error(`Booking ${bookingId} not found`);
  if (booking.stripeSubscriptionId !== stripeSubscriptionId) {
    booking.stripeSubscriptionId = stripeSubscriptionId;
    await booking.save();
  }
  await Subscription.findOneAndUpdate(
    { booking: booking._id },
    {
      $setOnInsert: {
        customer: booking.customer,
        planKey: booking.planKey,
        planName: booking.planName,
        bins: booking.bins,
        termMonths: 1,
        kind: "recurring",
        startsAt: new Date(),
      },
      $set: { stripeSubscriptionId },
    },
    { upsert: true },
  );
  return booking;
}

export async function syncStripeSubscription(sub: Stripe.Subscription) {
  const raw = sub as unknown as { current_period_end?: number; items?: { data?: { current_period_end?: number }[] } };
  const periodEnd = raw.current_period_end ?? raw.items?.data?.[0]?.current_period_end;
  const bookingId = sub.metadata?.bookingId;
  const update: Record<string, unknown> = {
    providerStatus: sub.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
  };
  if (sub.status === "canceled" && sub.ended_at) update.endsAt = new Date(sub.ended_at * 1000);

  const existing = await Subscription.findOneAndUpdate({ stripeSubscriptionId: sub.id }, { $set: update });
  if (!existing && bookingId) {
    await linkStripeSubscription(bookingId, sub.id);
    await Subscription.updateOne({ stripeSubscriptionId: sub.id }, { $set: update });
  }
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = invoice as unknown as {
    subscription?: string | { id: string } | null;
    parent?: { subscription_details?: { subscription?: string | { id: string } } };
  };
  const s = raw.subscription ?? raw.parent?.subscription_details?.subscription;
  if (!s) return null;
  return typeof s === "string" ? s : s.id;
}

export async function recordInvoicePayment(invoice: Stripe.Invoice, status: "paid" | "failed") {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return;
  let booking = await Booking.findOne({ stripeSubscriptionId: subId });
  if (!booking) {
    const meta = (invoice as unknown as { parent?: { subscription_details?: { metadata?: Record<string, string> } } }).parent
      ?.subscription_details?.metadata;
    if (meta?.bookingId) booking = await linkStripeSubscription(meta.bookingId, subId);
  }
  if (!booking) {
    // Fall back to retrieving the subscription to read our metadata.
    const sub = await getStripe().subscriptions.retrieve(subId);
    if (sub.metadata?.bookingId) booking = await linkStripeSubscription(sub.metadata.bookingId, subId);
  }
  if (!booking || !invoice.id) return;

  await Payment.findOneAndUpdate(
    { stripeInvoiceId: invoice.id },
    {
      $set: {
        booking: booking._id,
        customer: booking.customer,
        method: booking.paymentMethod,
        provider: "stripe",
        amountCents: status === "paid" ? invoice.amount_paid : invoice.amount_due,
        currency: invoice.currency,
        status,
        paidAt: status === "paid" ? new Date() : undefined,
      },
    },
    { upsert: true },
  );

  if (status === "paid") {
    booking.paymentStatus = "paid";
    booking.paidAt = booking.paidAt ?? new Date();
    if (booking.status === "new") booking.status = "confirmed";
  } else {
    booking.paymentStatus = "failed";
  }
  await booking.save();
}
