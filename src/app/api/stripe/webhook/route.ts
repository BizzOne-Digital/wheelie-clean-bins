import type Stripe from "stripe";
import { dbConnect } from "@/lib/db";
import { getStripe, isStripeWebhookConfigured } from "@/lib/stripe";
import { linkStripeSubscription, recordInvoicePayment, recordPrepaidPayment, syncStripeSubscription } from "@/lib/payments";
import { Booking } from "@/models/Booking";
import { Payment } from "@/models/Payment";
import { StripeEvent } from "@/models/StripeEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId || session.client_reference_id;
      if (!bookingId) return;
      if (session.mode === "subscription") {
        // Revenue for subscriptions is recorded from invoice.paid, keyed by invoice id.
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subId) await linkStripeSubscription(bookingId, subId);
        return;
      }
      if (session.payment_status === "paid") {
        await recordPrepaidPayment({
          bookingId,
          amountCents: session.amount_total ?? 0,
          provider: "stripe",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        });
      }
      return;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await Booking.updateOne({ stripeCheckoutSessionId: session.id, paymentStatus: { $ne: "paid" } }, { $set: { paymentStatus: "failed" } });
      await Payment.updateOne({ stripeCheckoutSessionId: session.id, status: "pending" }, { $set: { status: "failed" } });
      return;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await Booking.updateOne({ stripeCheckoutSessionId: session.id, paymentStatus: "pending" }, { $set: { paymentStatus: "cancelled" } });
      await Payment.updateOne({ stripeCheckoutSessionId: session.id, status: "pending" }, { $set: { status: "cancelled" } });
      return;
    }
    case "invoice.paid":
      await recordInvoicePayment(event.data.object as Stripe.Invoice, "paid");
      return;
    case "invoice.payment_failed":
      await recordInvoicePayment(event.data.object as Stripe.Invoice, "failed");
      return;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncStripeSubscription(event.data.object as Stripe.Subscription);
      return;
    default:
      return;
  }
}

export async function POST(req: Request) {
  if (!isStripeWebhookConfigured()) {
    return Response.json({ error: "Stripe webhooks are not configured" }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe] webhook signature verification failed:", (err as Error).message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  await dbConnect();
  try {
    await StripeEvent.create({ eventId: event.id, type: event.type });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return Response.json({ received: true, duplicate: true });
    throw err;
  }

  try {
    await handle(event);
  } catch (err) {
    // Allow Stripe to retry this event.
    await StripeEvent.deleteOne({ eventId: event.id });
    console.error(`[stripe] failed to process ${event.type}:`, (err as Error).message);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
  return Response.json({ received: true });
}
