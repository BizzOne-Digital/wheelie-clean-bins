import Link from "next/link";
import { Download, Search } from "lucide-react";
import { dbConnect } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { bookingQuery } from "@/lib/admin-queries";
import { BOOKING_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import { Booking } from "@/models/Booking";
import { AdminTitle, EmptyState, Pagination, StatusBadge, fmtDate } from "@/components/admin/ui";

const PER_PAGE = 20;

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filters = { q: sp.q, status: sp.status, payment: sp.payment, method: sp.method };
  await dbConnect();
  const query = bookingQuery(filters);
  const [total, rows] = await Promise.all([
    Booking.countDocuments(query),
    Booking.find(query).sort({ createdAt: -1 }).skip((page - 1) * PER_PAGE).limit(PER_PAGE).lean(),
  ]);
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  const href = (p: number) => `/admin/bookings?${new URLSearchParams({ ...Object.fromEntries(params), page: String(p) })}`;

  return (
    <>
      <AdminTitle
        title="Bookings"
        subtitle={`${total} matching booking${total === 1 ? "" : "s"}`}
        actions={
          <a href={`/api/admin/bookings/export?${params}`} className="btn btn-ghost btn-sm">
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </a>
        }
      />

      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]" role="search">
        <div>
          <label htmlFor="q" className="field-label">Search</label>
          <input id="q" name="q" defaultValue={sp.q} className="field" placeholder="Name, email, reference, address…" />
        </div>
        <div>
          <label htmlFor="status" className="field-label">Booking status</label>
          <select id="status" name="status" defaultValue={sp.status ?? ""} className="field">
            <option value="">All</option>
            {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="payment" className="field-label">Payment</label>
          <select id="payment" name="payment" defaultValue={sp.payment ?? ""} className="field">
            <option value="">All</option>
            <option value="open">Needs follow-up</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="method" className="field-label">Method</label>
          <select id="method" name="method" defaultValue={sp.method ?? ""} className="field">
            <option value="">All</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
            <option value="emt">EMT</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-primary btn-md"><Search className="h-4 w-4" aria-hidden /> Filter</button>
          <Link href="/admin/bookings" className="btn btn-ghost btn-md">Reset</Link>
        </div>
      </form>

      {rows.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line bg-ink-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Collection</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((b) => (
                <tr key={String(b._id)} className="hover:bg-card-2">
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${b._id}`} className="font-semibold text-cyan hover:underline">{b.reference}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-white">{b.contact?.name}</span>
                    <span className="text-xs text-muted">{b.address?.city} {b.address?.postalCode}</span>
                  </td>
                  <td className="px-4 py-3 text-soft">
                    {b.planName}
                    <span className="block text-xs text-muted">{b.bins} bins · {b.termMonths === 1 ? "monthly" : `${b.termMonths} mo`}</span>
                  </td>
                  <td className="px-4 py-3 text-soft">{b.collectionDay}</td>
                  <td className="px-4 py-3 text-white">{formatCents(b.quote?.totalCents ?? 0)}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.paymentStatus} />
                    <span className="mt-0.5 block text-xs uppercase text-muted">{b.paymentMethod}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{fmtDate(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>No bookings match these filters.</EmptyState>
      )}
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} makeHref={href} />
    </>
  );
}
