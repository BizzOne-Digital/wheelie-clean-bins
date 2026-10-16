import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { getPlans, getSettings } from "@/lib/content";
import { computeQuote, QuoteError } from "@/lib/pricing";
import { createCheckoutSession } from "@/lib/payments";
import { clientIp, isSameOrigin, jsonError, rateLimit } from "@/lib/security";
import { isStripeConfigured } from "@/lib/stripe";
import { Booking } from "@/models/Booking";
import { Payment } from "@/models/Payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ reference: z.string().regex(/^WCB-[A-Z0-9]{6}$/), token: z.string().min(10).max(100) });

/** Creates a fresh Stripe Checkout session for an unpaid card booking (e.g. after a cancelled payment). */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("Cross-origin request rejected", 403);
  if (!isStripeConfigured()) return jsonError("Online payment is not available yet. Please contact us.", 503);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request", 400);

  await dbConnect();
  if (!(await rateLimit(`checkout:${await clientIp()}`, 10, 3600))) return jsonError("Too many attempts. Please try again later.", 429);

  const booking = await Booking.findOne({ reference: parsed.data.reference }).select("+accessToken");
  const a = Buffer.from(booking?.accessToken ?? "");
  const b = Buffer.from(parsed.data.token);
  if (!booking || a.length !== b.length || !timingSafeEqual(a, b)) return jsonError("Booking not found", 404);
  if (booking.paymentStatus === "paid") return jsonError("This booking is already paid.", 409);
  if (booking.paymentMethod === "emt") return jsonError("This booking uses e-Transfer.", 409);

  // Recalculate with current server pricing; never reuse client values.
  const [plans, settings] = await Promise.all([getPlans(true), getSettings()]);
  const plan = plans.find((p) => p.key === booking.planKey);
  if (!plan) return jsonError("This plan is no longer available. Please contact us.", 409);
  let quote;
  try {
    quote = computeQuote(
      { plan, bins: booking.bins, termMonths: booking.termMonths as 1 | 3 | 6 | 12, promoChoice: (booking.promoChoice as "extra_clean" | "month_free" | null) ?? null },
      settings,
    );
  } catch (err) {
    if (err instanceof QuoteError) return jsonError(err.message, 409);
    throw err;
  }

  const session = await createCheckoutSession({
    bookingId: String(booking._id),
    reference: booking.reference,
    accessToken: parsed.data.token,
    email: booking.contact?.email ?? "",
    quote,
  });
  booking.stripeCheckoutSessionId = session.id;
  booking.paymentStatus = "pending";
  booking.set("quote.totalCents", quote.totalCents);
  await booking.save();
  const open = await Payment.findOneAndUpdate(
    { booking: booking._id, provider: "stripe", status: { $in: ["pending", "cancelled", "failed"] } },
    { $set: { stripeCheckoutSessionId: session.id, status: "pending", amountCents: quote.totalCents } },
  );
  if (!open) {
    await Payment.create({
      booking: booking._id,
      customer: booking.customer,
      method: booking.paymentMethod,
      provider: "stripe",
      amountCents: quote.totalCents,
      stripeCheckoutSessionId: session.id,
    });
  }
  return Response.json({ success: true, checkoutUrl: session.url });
}
