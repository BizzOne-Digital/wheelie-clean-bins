import Link from "next/link";
import { AlertTriangle, Download } from "lucide-react";
import { dbConnect } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { COLLECTION_DAYS } from "@/lib/constants";
import { isStripeConfigured, isStripeWebhookConfigured } from "@/lib/stripe";
import { Booking } from "@/models/Booking";
import { Customer } from "@/models/Customer";
import { Payment } from "@/models/Payment";
import { StatusBadge, fmtDate } from "@/components/admin/ui";

/** Bookings that still need service (not cancelled or completed). */
const ACTIVE = { status: { $in: ["new", "confirmed", "scheduled"] as ("new" | "confirmed" | "scheduled")[] } };
const TZ = "America/Toronto";

/** The next Monday–Saturday, starting from the coming Monday. */
function nextWeek() {
  // Work with Toronto's calendar date (noon UTC avoids any day rollover), whatever the server timezone.
  const [y, m, d] = new Date().toLocaleDateString("en-CA", { timeZone: TZ }).split("-").map(Number);
  const today = new Date(Date.UTC(y, m - 1, d, 12));
  const day = today.getUTCDay(); // 0 Sun … 6 Sat
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + ((8 - day) % 7 || 7));
  return COLLECTION_DAYS.map((name, i) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + i);
    return { name, label: date.toLocaleDateString("en-CA", { month: "long", day: "numeric", timeZone: "UTC" }) };
  });
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#161c20] p-6">
      <p className="font-display text-4xl font-black tracking-tight text-brand sm:text-5xl">{value}</p>
      <p className="mt-2 text-sm text-soft/80">{label}</p>
    </div>
  );
}

export default async function OwnerViewPage() {
  await dbConnect();
  const [customers, active, paidAll, followUp] = await Promise.all([
    Customer.countDocuments(),
    Booking.find(ACTIVE).sort({ createdAt: -1 }).limit(500).lean(),
    Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amountCents" } } }]),
    Booking.countDocuments({ ...ACTIVE, paymentStatus: { $in: ["pending", "awaiting_emt", "not_configured", "failed"] } }),
  ]);

  const monthly = active.filter((b) => b.termMonths === 1);
  const monthlyRecurring = monthly.reduce((sum, b) => sum + (b.quote?.subtotalCents ?? 0) - (b.quote?.discountCents ?? 0), 0);
  const binsThisMonth = active.reduce((sum, b) => sum + (b.bins ?? 0), 0);
  const week = nextWeek();

  return (
    <div className="mx-auto max-w-7xl">
      {/* Intro */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-5xl font-black tracking-[-0.04em] text-white sm:text-7xl">Owner view</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-soft/75">
            Every booking from the website lands here. Your route for next week, your customers and your numbers, all in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="/api/admin/bookings/export" className="btn btn-primary btn-lg rounded-full">
            <Download className="h-5 w-5" aria-hidden /> Export CSV
          </a>
          <Link href="/admin/bookings" className="btn btn-lg rounded-full bg-[#1b2226] text-white hover:bg-[#232c31]">
            All bookings
          </Link>
        </div>
      </div>

      {(!isStripeConfigured() || !isStripeWebhookConfigured()) && (
        <div role="status" className="mt-8 flex gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-brand" aria-hidden />
          <p>
            <strong className="text-white">Card payments are not fully set up.</strong> Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to accept and verify
            online payments. Card bookings show “payment setup needed” until then.
          </p>
        </div>
      )}

      {/* Numbers */}
      <section aria-label="Key numbers" className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat value={String(customers)} label="Customers" />
        <Stat value={String(monthly.length)} label="On the monthly plan" />
        <Stat value={formatCents(monthlyRecurring)} label="Monthly recurring, before tax" />
        <Stat value={String(binsThisMonth)} label="Bins to wash this month" />
      </section>
      <p className="mt-3 text-xs text-muted">
        Counts include active bookings (new, confirmed or scheduled). Confirmed revenue to date: {formatCents(paidAll[0]?.total ?? 0)}.{" "}
        {followUp > 0 && (
          <Link href="/admin/bookings?payment=open" className="text-cyan hover:underline">
            {followUp} booking{followUp === 1 ? "" : "s"} need payment follow-up.
          </Link>
        )}
      </p>

      {/* Route */}
      <section aria-labelledby="route-heading" className="mt-14">
        <h2 id="route-heading" className="font-display text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl">
          Next week&apos;s route
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {week.map((d) => {
            const stops = active.filter((b) => b.collectionDay === d.name);
            return (
              <div key={d.name} className="flex min-h-[220px] flex-col rounded-2xl border border-white/10 bg-[#161c20] p-5">
                <h3 className="font-display text-2xl font-black tracking-tight text-white">{d.name}</h3>
                <p className="text-sm text-muted">{d.label}</p>
                <ul className="mt-4 space-y-2.5">
                  {stops.length ? (
                    stops.map((b) => (
                      <li key={String(b._id)}>
                        <Link href={`/admin/bookings/${b._id}`} className="block rounded-xl bg-[#20282d] p-3 transition-colors hover:bg-[#283238]">
                          <span className="block font-display text-sm font-bold text-white">{b.address?.street}</span>
                          <span className="block text-sm text-soft/80">
                            {b.contact?.name} · {b.bins} {b.bins === 1 ? "bin" : "bins"}
                          </span>
                        </Link>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted">No stops</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Customers */}
      <section aria-labelledby="customers-heading" className="mt-14">
        <h2 id="customers-heading" className="font-display text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl">
          Customers
        </h2>
        {active.length ? (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#161c20]">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b border-white/10 bg-[#1b2226] text-soft/70">
                <tr>
                  {["Customer", "Address", "Plan", "Bins", "Garbage day", "Booked", "Contact", "Notes"].map((h) => (
                    <th key={h} scope="col" className="px-5 py-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {active.map((b) => (
                  <tr key={String(b._id)} className="align-top hover:bg-[#1b2226]">
                    <td className="px-5 py-5">
                      <Link href={`/admin/bookings/${b._id}`} className="font-bold text-white hover:text-cyan">{b.contact?.name}</Link>
                      <div className="mt-1.5"><StatusBadge status={b.paymentStatus} /></div>
                    </td>
                    <td className="px-5 py-5 text-soft">
                      {b.address?.street}
                      {b.address?.unit ? `, Unit ${b.address.unit}` : ""}
                      <br />
                      {b.address?.city} {b.address?.postalCode}
                      <div className="mt-1.5">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.planKey === "toronto-scarborough" ? "bg-cyan text-ink" : "bg-white/10 text-white"}`}>
                          {b.planName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-soft">
                      {b.termMonths === 1 ? "Monthly" : `${b.termMonths} months`}
                      <br />
                      {formatCents(b.quote?.totalCents ?? 0)}
                    </td>
                    <td className="px-5 py-5 text-soft">{b.bins}</td>
                    <td className="px-5 py-5 text-soft">{b.collectionDay}</td>
                    <td className="px-5 py-5 text-soft">{fmtDate(b.createdAt)}</td>
                    <td className="px-5 py-5 text-soft">
                      <a href={`tel:${b.contact?.phone}`} className="hover:text-cyan">{b.contact?.phone}</a>
                      <br />
                      <a href={`mailto:${b.contact?.email}`} className="break-all hover:text-cyan">{b.contact?.email}</a>
                    </td>
                    <td className="max-w-[16rem] px-5 py-5 text-soft">{b.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#161c20] p-10 text-center text-soft/70">
            No active customers yet. Bookings from the website will appear here.
          </div>
        )}
      </section>
    </div>
  );
}
