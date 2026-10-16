import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { dbConnect } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { BOOKING_STATUSES, SERVICE_STATUSES } from "@/lib/constants";
import { Booking } from "@/models/Booking";
import { Payment } from "@/models/Payment";
import { Subscription } from "@/models/Subscription";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { AdminTitle, StatusBadge, fmtDate } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { addBookingNoteAction, confirmEmtPaymentAction, deleteBookingAction, updateBookingStatusAction } from "../../../actions/bookings";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-white">{children}</dd>
    </div>
  );
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await dbConnect();
  const b = await Booking.findById(id).lean();
  if (!b) notFound();
  const [payments, sub, log] = await Promise.all([
    Payment.find({ booking: id }).sort({ createdAt: -1 }).lean(),
    Subscription.findOne({ booking: id }).lean(),
    AdminAuditLog.find({ entityType: "Booking", entityId: id }).sort({ createdAt: -1 }).limit(30).lean(),
  ]);

  return (
    <>
      <Link href="/admin/bookings" className="mb-3 inline-flex items-center gap-1 text-sm text-cyan hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All bookings
      </Link>
      <AdminTitle
        title={`Booking ${b.reference}`}
        subtitle={`Created ${fmtDate(b.createdAt, true)}`}
        actions={
          <>
            <StatusBadge status={b.status} />
            <StatusBadge status={b.serviceStatus} />
            <StatusBadge status={b.paymentStatus} />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Customer</h2>
            <dl>
              <Row label="Name">{b.contact?.name}</Row>
              <Row label="Email"><a className="inline-flex items-center gap-1 text-cyan hover:underline" href={`mailto:${b.contact?.email}`}><Mail className="h-3.5 w-3.5" aria-hidden />{b.contact?.email}</a></Row>
              <Row label="Phone"><a className="inline-flex items-center gap-1 text-cyan hover:underline" href={`tel:${b.contact?.phone}`}><Phone className="h-3.5 w-3.5" aria-hidden />{b.contact?.phone}</a></Row>
              <Row label="Address">
                {b.address?.street}
                {b.address?.unit && `, Unit ${b.address.unit}`}, {b.address?.city}, {b.address?.province} {b.address?.postalCode}
              </Row>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Service & collection</h2>
            <dl>
              <Row label="Plan">{b.planName}</Row>
              <Row label="Bins">{b.bins}</Row>
              <Row label="Collection day">{b.collectionDay}</Row>
              <Row label="Approx. time">{b.collectionTime}</Row>
              <Row label="Return bins to">{b.returnLocation}</Row>
              <Row label="Billing">{b.termMonths === 1 ? "Monthly" : `${b.termMonths} months upfront`}</Row>
              {b.quote?.promoNote && <Row label="Bonus">{b.quote.promoNote}</Row>}
              <Row label="Payment method">{b.paymentMethod?.toUpperCase()}</Row>
              <Row label="Customer notes"><span className="whitespace-pre-line">{b.notes || "—"}</span></Row>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Order</h2>
            <ul className="space-y-2 text-sm">
              {b.quote?.lineItems?.map((l, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span className="text-soft">{l.label}</span>
                  <span className="shrink-0 text-white">{formatCents(l.amountCents ?? 0)}</span>
                </li>
              ))}
              {!!b.quote?.taxCents && (
                <li className="flex justify-between"><span className="text-soft">{b.quote.taxLabel}</span><span className="text-white">{formatCents(b.quote.taxCents)}</span></li>
              )}
              <li className="flex justify-between border-t border-line pt-2 font-bold">
                <span>Total {b.termMonths === 1 ? "(per month)" : ""}</span>
                <span className="text-brand">{formatCents(b.quote?.totalCents ?? 0)}</span>
              </li>
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Payments</h2>
            {payments.length ? (
              <ul className="divide-y divide-line text-sm">
                {payments.map((p) => (
                  <li key={String(p._id)} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <span className="text-white">{formatCents(p.amountCents)}</span>{" "}
                      <span className="text-muted">· {p.provider} · {p.method?.toUpperCase()} · {fmtDate(p.paidAt ?? p.createdAt, true)}</span>
                      {p.manualReference && <span className="block text-xs text-muted">Ref: {p.manualReference} · by {p.confirmedBy}</span>}
                      {p.stripeInvoiceId && <span className="block text-xs text-muted">Invoice: {p.stripeInvoiceId}</span>}
                    </span>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No payment records.</p>
            )}
            {sub && (
              <p className="mt-3 text-sm text-muted">
                Subscription: {sub.kind} · provider status <StatusBadge status={sub.providerStatus} />
                {sub.currentPeriodEnd && ` · renews ${fmtDate(sub.currentPeriodEnd)}`}
                {sub.endsAt && ` · ends ${fmtDate(sub.endsAt)}`}
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Update status</h2>
            <ActionForm action={updateBookingStatusAction} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <div>
                <label htmlFor="status" className="field-label">Booking status</label>
                <select id="status" name="status" defaultValue={b.status} className="field">
                  {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="serviceStatus" className="field-label">Service status</label>
                <select id="serviceStatus" name="serviceStatus" defaultValue={b.serviceStatus} className="field">
                  {SERVICE_STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
                </select>
              </div>
              <p className="text-xs text-muted">Payment status is set by verified payment events or manual EMT confirmation, not here. Changing these does not change Stripe billing.</p>
              <SubmitButton>Save statuses</SubmitButton>
            </ActionForm>
          </section>

          {b.paymentMethod === "emt" && (
            <section className="card border-brand/50 p-5">
              <h2 className="mb-1 font-display text-lg font-bold">Record e-Transfer payment</h2>
              <p className="mb-3 text-sm text-muted">Only record after the funds are received. This is logged with your name.</p>
              <ActionForm action={confirmEmtPaymentAction} confirm="Record this e-Transfer as received? This is saved to the audit log." className="space-y-3" resetOnSuccess>
                <input type="hidden" name="id" value={id} />
                <div>
                  <label htmlFor="amount" className="field-label">Amount received (CAD)</label>
                  <input id="amount" name="amount" inputMode="decimal" defaultValue={((b.quote?.totalCents ?? 0) / 100).toFixed(2)} className="field" required />
                </div>
                <div>
                  <label htmlFor="reference" className="field-label">e-Transfer reference / confirmation #</label>
                  <input id="reference" name="reference" className="field" required />
                </div>
                <SubmitButton>Record payment</SubmitButton>
              </ActionForm>
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Internal notes</h2>
            <ActionForm action={addBookingNoteAction} className="space-y-2" resetOnSuccess>
              <input type="hidden" name="id" value={id} />
              <label htmlFor="body" className="sr-only">New note</label>
              <textarea id="body" name="body" rows={3} className="field" placeholder="Visible to admins only" />
              <SubmitButton size="sm">Add note</SubmitButton>
            </ActionForm>
            <ul className="mt-4 space-y-3">
              {[...(b.internalNotes ?? [])].reverse().map((n, i) => (
                <li key={i} className="rounded-lg border border-line bg-ink-2 p-3 text-sm">
                  <p className="whitespace-pre-line text-soft">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{n.author} · {fmtDate(n.createdAt, true)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Activity</h2>
            {log.length ? (
              <ul className="space-y-2 text-xs">
                {log.map((l) => (
                  <li key={String(l._id)} className="text-muted">
                    <span className="text-soft">{l.action.replaceAll("_", " ")}</span> · {l.actor} · {fmtDate(l.createdAt, true)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No admin activity yet.</p>
            )}
          </section>

          <section className="card border-danger/40 p-5">
            <h2 className="mb-1 font-display text-lg font-bold">Delete booking</h2>
            <p className="mb-3 text-sm text-muted">Only unpaid bookings can be deleted. This cannot be undone.</p>
            <ActionForm action={deleteBookingAction} confirm={`Permanently delete booking ${b.reference}? This cannot be undone.`}>
              <input type="hidden" name="id" value={id} />
              <SubmitButton variant="danger" size="sm">Delete booking</SubmitButton>
            </ActionForm>
          </section>
        </div>
      </div>
    </>
  );
}
