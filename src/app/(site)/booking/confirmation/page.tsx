import type { Metadata } from "next";
import Link from "next/link";
import { timingSafeEqual } from "crypto";
import { AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react";
import { dbConnect, isDbConfigured } from "@/lib/db";
import { getSettings } from "@/lib/content";
import { formatCents } from "@/lib/money";
import { isStripeConfigured } from "@/lib/stripe";
import { Booking } from "@/models/Booking";
import { QuoteCtas } from "@/components/site/sections";
import { RetryPaymentButton } from "@/components/booking/RetryPaymentButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking Confirmation | Wheelie Clean Bins", robots: { index: false } };

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const ref = (sp.ref ?? "").slice(0, 20);
  const token = (sp.t ?? "").slice(0, 100);

  let booking = null;
  if (isDbConfigured() && /^WCB-[A-Z0-9]{6}$/.test(ref) && token) {
    await dbConnect();
    const doc = await Booking.findOne({ reference: ref }).select("+accessToken").lean();
    if (doc && safeEqual(doc.accessToken, token)) booking = doc;
  }

  if (!booking) {
    return (
      <section className="py-20">
        <div className="container-x max-w-xl text-center">
          <h1 className="font-display text-3xl font-black">Booking not found</h1>
          <p className="mt-3 text-soft/90">We could not find that booking link. If you just booked, please check the link or contact us with your booking reference.</p>
          <div className="flex justify-center"><QuoteCtas settings={settings} /></div>
        </div>
      </section>
    );
  }

  const paid = booking.paymentStatus === "paid";
  const emt = booking.paymentMethod === "emt";
  const returnedFromStripe = Boolean(sp.session_id);
  const cancelled = sp.cancelled === "1" && !paid;
  const canRetry = !paid && !emt && isStripeConfigured() && ["pending", "cancelled", "failed", "not_configured"].includes(booking.paymentStatus);

  let icon = <CheckCircle2 className="h-14 w-14 text-ok" aria-hidden />;
  let headline = "You're booked!";
  let message = "";
  if (paid) {
    message = "Your payment has been received and your booking is confirmed. We will be in touch to confirm your first clean.";
  } else if (emt) {
    icon = <Clock className="h-14 w-14 text-brand" aria-hidden />;
    headline = "Booking received";
    message = "Your booking is reserved and will be confirmed once we receive your e-Transfer.";
  } else if (cancelled) {
    icon = <AlertTriangle className="h-14 w-14 text-brand" aria-hidden />;
    headline = "Payment not completed";
    message = "Your booking details are saved, but payment was not completed. You can try again below or contact us for help.";
  } else if (booking.paymentStatus === "failed") {
    icon = <AlertTriangle className="h-14 w-14 text-danger" aria-hidden />;
    headline = "Payment failed";
    message = "Your payment did not go through. Please try again or contact us.";
  } else if (booking.paymentStatus === "not_configured") {
    icon = <Clock className="h-14 w-14 text-brand" aria-hidden />;
    headline = "Booking received";
    message = "Online card payment is not active yet, so no payment has been taken. Our team will contact you to arrange payment and confirm your first clean.";
  } else if (returnedFromStripe) {
    icon = <Clock className="h-14 w-14 text-cyan" aria-hidden />;
    headline = "Confirming your payment";
    message = "Thanks! We are waiting for confirmation from our payment provider. This usually takes a few seconds. Refresh this page to update the status.";
  } else {
    icon = <Clock className="h-14 w-14 text-cyan" aria-hidden />;
    headline = "Awaiting payment";
    message = "Your booking is saved. Complete payment to confirm it.";
  }

  return (
    <section className="py-14 sm:py-20">
      <div className="container-x max-w-2xl">
        <div className="card p-6 text-center sm:p-10">
          <div className="flex justify-center">{icon}</div>
          <h1 className="mt-4 font-display text-3xl font-black sm:text-4xl">{headline}</h1>
          <p className="mt-3 text-soft/90">{message}</p>
          <p className="mt-6 inline-block rounded-lg border-2 border-dashed border-cyan px-5 py-3 font-display text-lg">
            Booking reference: <strong className="text-cyan">{booking.reference}</strong>
          </p>
          {canRetry && (
            <div className="mt-6 flex justify-center">
              <RetryPaymentButton reference={booking.reference} token={token} />
            </div>
          )}
        </div>

        {emt && !paid && (
          <div className="mt-6 rounded-xl border-2 border-brand bg-brand/5 p-6">
            <h2 className="font-display text-xl font-bold">E-Transfer instructions</h2>
            <p className="mt-2 whitespace-pre-line text-soft/90">{settings.emt.instructions}</p>
            {settings.emt.recipient && (
              <p className="mt-3 text-soft">
                Send to: <strong className="break-all text-white">{settings.emt.recipient}</strong>
              </p>
            )}
            <p className="mt-3 text-soft">
              Amount: <strong className="text-white">{formatCents(booking.quote?.totalCents ?? 0)}</strong> · Message: <strong className="text-white">{booking.reference}</strong>
            </p>
          </div>
        )}

        <div className="card mt-6 p-6">
          <h2 className="font-display text-xl font-bold">Summary</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Plan</dt><dd className="text-white">{booking.planName}</dd></div>
            <div><dt className="text-muted">Bins</dt><dd className="text-white">{booking.bins}</dd></div>
            <div><dt className="text-muted">Collection</dt><dd className="text-white">{booking.collectionDay}, {booking.collectionTime}</dd></div>
            <div><dt className="text-muted">Billing</dt><dd className="text-white">{booking.termMonths === 1 ? "Monthly" : `${booking.termMonths} months upfront`}</dd></div>
            {booking.quote?.promoNote && <div><dt className="text-muted">Bonus</dt><dd className="text-white">{booking.quote.promoNote}</dd></div>}
            <div><dt className="text-muted">{booking.termMonths === 1 ? "Monthly total" : "Total"}</dt><dd className="font-bold text-brand">{formatCents(booking.quote?.totalCents ?? 0)} CAD</dd></div>
          </dl>
          <p className="mt-5 flex gap-2 rounded-lg border border-line bg-ink-2 p-3 text-sm text-soft/90">
            <Info className="h-5 w-5 shrink-0 text-cyan" aria-hidden /> {settings.booking.timingNotice}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-ghost btn-md">Back to Home</Link>
          <Link href="/faq" className="btn btn-ghost btn-md">Read the FAQ</Link>
        </div>
      </div>
    </section>
  );
}
