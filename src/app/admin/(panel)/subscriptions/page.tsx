import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { SERVICE_STATUSES } from "@/lib/constants";
import { Subscription } from "@/models/Subscription";
import { Customer } from "@/models/Customer";
import { Booking } from "@/models/Booking";
import { AdminTitle, EmptyState, Pagination, StatusBadge, fmtDate } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { updateSubscriptionServiceStatusAction } from "../../actions/records";

const PER_PAGE = 25;

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  await dbConnect();
  const [total, subs] = await Promise.all([
    Subscription.countDocuments(),
    Subscription.find().sort({ createdAt: -1 }).skip((page - 1) * PER_PAGE).limit(PER_PAGE).lean(),
  ]);
  const [customers, bookings] = await Promise.all([
    Customer.find({ _id: { $in: subs.map((s) => s.customer) } }, { name: 1, email: 1 }).lean(),
    Booking.find({ _id: { $in: subs.map((s) => s.booking) } }, { reference: 1, paymentStatus: 1 }).lean(),
  ]);
  const cMap = new Map(customers.map((c) => [String(c._id), c]));
  const bMap = new Map(bookings.map((b) => [String(b._id), b]));

  return (
    <>
      <AdminTitle
        title="Subscriptions"
        subtitle="Provider status mirrors Stripe and is updated only by verified webhooks. Service status is your internal scheduling status and does not affect billing."
      />
      {subs.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-line bg-ink-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Bins</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Provider status</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Service status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {subs.map((s) => {
                const c = cMap.get(String(s.customer));
                const b = bMap.get(String(s.booking));
                return (
                  <tr key={String(s._id)}>
                    <td className="px-4 py-3">
                      <span className="block text-white">{c?.name ?? "—"}</span>
                      {b && <Link href={`/admin/bookings/${s.booking}`} className="text-xs text-cyan hover:underline">{b.reference}</Link>}
                    </td>
                    <td className="px-4 py-3 text-soft">{s.planName}</td>
                    <td className="px-4 py-3 text-soft">{s.bins}</td>
                    <td className="px-4 py-3 text-soft">{s.kind === "recurring" ? "Monthly (recurring)" : `${s.termMonths} mo prepaid`}</td>
                    <td className="px-4 py-3"><StatusBadge status={b?.paymentStatus} /></td>
                    <td className="px-4 py-3"><StatusBadge status={s.providerStatus} /></td>
                    <td className="px-4 py-3 text-xs text-muted">
                      Start {fmtDate(s.startsAt)}
                      {s.currentPeriodEnd && <span className="block">Renews {fmtDate(s.currentPeriodEnd)}</span>}
                      {s.endsAt && <span className="block">Ends {fmtDate(s.endsAt)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <ActionForm action={updateSubscriptionServiceStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={String(s._id)} />
                        <label className="sr-only" htmlFor={`ss-${s._id}`}>Service status</label>
                        <select id={`ss-${s._id}`} name="serviceStatus" defaultValue={s.serviceStatus} className="field py-1.5 text-xs">
                          {SERVICE_STATUSES.map((v) => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}
                        </select>
                        <SubmitButton size="sm" variant="ghost">Save</SubmitButton>
                      </ActionForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>No subscriptions yet. They appear once a payment is confirmed.</EmptyState>
      )}
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} makeHref={(p) => `/admin/subscriptions?page=${p}`} />
    </>
  );
}
