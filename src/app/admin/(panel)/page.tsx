import Link from "next/link";
import { AlertTriangle, CalendarCheck, CircleDollarSign, Clock, Inbox, Repeat } from "lucide-react";
import { dbConnect } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { isStripeConfigured, isStripeWebhookConfigured } from "@/lib/stripe";
import { Booking } from "@/models/Booking";
import { Inquiry } from "@/models/Inquiry";
import { Payment } from "@/models/Payment";
import { Subscription } from "@/models/Subscription";
import { AdminTitle, EmptyState, StatusBadge, fmtDate } from "@/components/admin/ui";

export default async function DashboardPage() {
  await dbConnect();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [totalBookings, pendingPayments, activeSubs, newInquiries, revenueAll, revenueMonth, recent, pending] = await Promise.all([
    Booking.countDocuments(),
    Booking.countDocuments({ paymentStatus: { $in: ["pending", "awaiting_emt", "not_configured", "failed"] }, status: { $ne: "cancelled" } }),
    Subscription.countDocuments({ $or: [{ kind: "recurring", providerStatus: { $in: ["active", "trialing"] } }, { kind: "prepaid", endsAt: { $gt: new Date() } }] }),
    Inquiry.countDocuments({ status: "new" }),
    Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amountCents" } } }]),
    Payment.aggregate([{ $match: { status: "paid", paidAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: "$amountCents" } } }]),
    Booking.find().sort({ createdAt: -1 }).limit(8).lean(),
    Booking.find({ paymentStatus: { $in: ["awaiting_emt", "not_configured", "failed"] }, status: { $ne: "cancelled" } }).sort({ createdAt: 1 }).limit(8).lean(),
  ]);

  const stats = [
    { label: "Total bookings", value: String(totalBookings), icon: CalendarCheck, href: "/admin/bookings" },
    { label: "Pending payments", value: String(pendingPayments), icon: Clock, href: "/admin/bookings?payment=open" },
    { label: "Active subscriptions", value: String(activeSubs), icon: Repeat, href: "/admin/subscriptions" },
    { label: "New inquiries", value: String(newInquiries), icon: Inbox, href: "/admin/inquiries" },
    { label: "Confirmed revenue (this month)", value: formatCents(revenueMonth[0]?.total ?? 0), icon: CircleDollarSign },
    { label: "Confirmed revenue (all time)", value: formatCents(revenueAll[0]?.total ?? 0), icon: CircleDollarSign },
  ];

  return (
    <>
      <AdminTitle title="Dashboard" subtitle="Live figures from the database. Revenue counts confirmed payments only." />

      {(!isStripeConfigured() || !isStripeWebhookConfigured()) && (
        <div role="status" className="mb-6 flex gap-3 rounded-xl border border-brand/40 bg-brand/5 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-brand" aria-hidden />
          <p>
            <strong className="text-white">Card payments are not fully configured.</strong> Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to accept and verify online
            payments. Card bookings are saved with “payment setup needed” until then.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => {
          const body = (
            <>
              <s.icon className="h-5 w-5 text-cyan" aria-hidden />
              <p className="mt-3 font-display text-3xl font-black text-white">{s.value}</p>
              <p className="text-sm text-muted">{s.label}</p>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="card p-5 transition-colors hover:border-cyan">{body}</Link>
          ) : (
            <div key={s.label} className="card p-5">{body}</div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-5 py-3 font-display text-lg font-bold">Recent bookings</h2>
          {recent.length ? (
            <ul className="divide-y divide-line">
              {recent.map((b) => (
                <li key={String(b._id)}>
                  <Link href={`/admin/bookings/${b._id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-card-2">
                    <span className="min-w-0">
                      <span className="block font-semibold text-white">{b.contact?.name} <span className="font-normal text-muted">· {b.reference}</span></span>
                      <span className="block truncate text-muted">{b.address?.city} · {b.planName} · {fmtDate(b.createdAt)}</span>
                    </span>
                    <StatusBadge status={b.paymentStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No bookings yet.</EmptyState>
          )}
        </section>

        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-5 py-3 font-display text-lg font-bold">Needs payment follow-up</h2>
          {pending.length ? (
            <ul className="divide-y divide-line">
              {pending.map((b) => (
                <li key={String(b._id)}>
                  <Link href={`/admin/bookings/${b._id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-card-2">
                    <span>
                      <span className="block font-semibold text-white">{b.reference} · {formatCents(b.quote?.totalCents ?? 0)}</span>
                      <span className="block text-muted">{b.contact?.name} · {b.paymentMethod?.toUpperCase()} · {fmtDate(b.createdAt)}</span>
                    </span>
                    <StatusBadge status={b.paymentStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Nothing waiting on payment.</EmptyState>
          )}
        </section>
      </div>
    </>
  );
}
