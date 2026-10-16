import { dbConnect, isDbConfigured } from "@/lib/db";
import { getPlans, getSettings } from "@/lib/content";
import { computeQuote, QuoteError } from "@/lib/pricing";
import { clientIp, isSameOrigin, jsonError, rateLimit } from "@/lib/security";
import { bookingSchema, fieldErrors, normalizePostal } from "@/lib/validation";
import { accessToken, bookingReference } from "@/lib/reference";
import { isStripeConfigured } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments";
import { Booking } from "@/models/Booking";
import { Customer } from "@/models/Customer";
import { Payment } from "@/models/Payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function confirmationUrl(reference: string, token: string) {
  return `/booking/confirmation?ref=${encodeURIComponent(reference)}&t=${encodeURIComponent(token)}`;
}

async function findByIdempotencyKey(key: string) {
  return Booking.findOne({ idempotencyKey: key }).select("+accessToken").lean();
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("Cross-origin request rejected", 403);
  if (!isDbConfigured()) return jsonError("Online booking is temporarily unavailable. Please call or email us to book.", 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request", 400);
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please correct the highlighted fields.", 422, { fields: fieldErrors(parsed.error) });
  const input = parsed.data;
  if (input.website) return jsonError("Invalid submission", 400);

  await dbConnect();
  const ip = await clientIp();
  if (!(await rateLimit(`booking:${ip}`, 10, 60 * 60))) {
    return jsonError("Too many booking attempts. Please try again later or call us.", 429);
  }

  // Duplicate submission (double click or retry): return the original booking.
  const existing = await findByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    return Response.json({ success: true, reference: existing.reference, redirectUrl: confirmationUrl(existing.reference, existing.accessToken) });
  }

  const [plans, settings] = await Promise.all([getPlans(), getSettings()]);
  if (!settings.booking.acceptingBookings) {
    return jsonError("We are not taking new online bookings right now. Please call or email us.", 503);
  }
  const plan = plans.find((p) => p.key === input.planKey);
  if (!plan) return jsonError("Please choose a supported service region.", 422, { fields: { planKey: "Choose your service region" } });
  if (input.paymentMethod === "emt" && !settings.emt.enabled) {
    return jsonError("E-Transfer is not currently available. Please choose a card payment.", 422, {
      fields: { paymentMethod: "E-Transfer is unavailable" },
    });
  }

  let quote;
  try {
    quote = computeQuote({ plan, bins: input.bins, termMonths: input.termMonths, promoChoice: input.promoChoice ?? null }, settings);
  } catch (err) {
    if (err instanceof QuoteError) return jsonError(err.message, 422);
    throw err;
  }

  const customer = await Customer.findOneAndUpdate(
    { email: input.email },
    { $set: { name: input.name, phone: input.phone }, $inc: { bookingCount: 1 } },
    { upsert: true, new: true },
  );

  const token = accessToken();
  const cardPayment = input.paymentMethod !== "emt";
  const stripeReady = isStripeConfigured();
  const paymentStatus = cardPayment ? (stripeReady ? "pending" : "not_configured") : "awaiting_emt";

  let booking;
  for (let attempt = 0; attempt < 5 && !booking; attempt++) {
    try {
      booking = await Booking.create({
        reference: bookingReference(),
        idempotencyKey: input.idempotencyKey,
        accessToken: token,
        customer: customer._id,
        contact: { name: input.name, email: input.email, phone: input.phone },
        address: {
          street: input.street,
          unit: input.unit,
          city: input.city,
          province: input.province,
          postalCode: normalizePostal(input.postalCode),
        },
        planKey: plan.key,
        planName: plan.name,
        bins: quote.bins,
        collectionDay: input.collectionDay,
        collectionTime: input.collectionTime,
        returnLocation: input.returnLocation,
        termMonths: input.termMonths,
        promoChoice: quote.promoChoice,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        quote: {
          lineItems: quote.lineItems,
          subtotalCents: quote.subtotalCents,
          discountCents: quote.discountCents,
          taxCents: quote.taxCents,
          totalCents: quote.totalCents,
          recurringMonthlyCents: quote.recurringMonthlyCents,
          taxLabel: quote.taxLabel,
          promoNote: quote.promoNote,
        },
        paymentStatus,
      });
    } catch (err) {
      const e = err as { code?: number; keyPattern?: Record<string, unknown> };
      if (e.code === 11000 && e.keyPattern?.idempotencyKey) {
        const dup = await findByIdempotencyKey(input.idempotencyKey);
        if (dup) return Response.json({ success: true, reference: dup.reference, redirectUrl: confirmationUrl(dup.reference, dup.accessToken) });
      }
      // Retry only on a booking-reference collision.
      if (e.code !== 11000 || attempt === 4) throw err;
    }
  }
  if (!booking) return jsonError("Could not create booking", 500);

  await Payment.create({
    booking: booking._id,
    customer: customer._id,
    method: input.paymentMethod,
    provider: cardPayment ? "stripe" : "manual",
    amountCents: quote.totalCents,
    status: "pending",
  });

  const redirectUrl = confirmationUrl(booking.reference, token);

  if (cardPayment && stripeReady) {
    try {
      const session = await createCheckoutSession({
        bookingId: String(booking._id),
        reference: booking.reference,
        accessToken: token,
        email: input.email,
        quote,
      });
      booking.stripeCheckoutSessionId = session.id;
      await booking.save();
      await Payment.updateOne({ booking: booking._id, status: "pending" }, { $set: { stripeCheckoutSessionId: session.id } });
      return Response.json({ success: true, reference: booking.reference, checkoutUrl: session.url, redirectUrl });
    } catch (err) {
      console.error("[bookings] Stripe checkout creation failed:", (err as Error).message);
      booking.paymentStatus = "not_configured";
      await booking.save();
      return Response.json({ success: true, reference: booking.reference, redirectUrl, paymentError: true });
    }
  }

  return Response.json({ success: true, reference: booking.reference, redirectUrl });
}
