import { Mail, Phone } from "lucide-react";
import { dbConnect } from "@/lib/db";
import { INQUIRY_STATUSES } from "@/lib/constants";
import { Inquiry } from "@/models/Inquiry";
import { AdminTitle, EmptyState, Pagination, StatusBadge, fmtDate } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { deleteInquiryAction, updateInquiryStatusAction } from "../../actions/records";

const PER_PAGE = 20;

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = INQUIRY_STATUSES.includes(sp.status as never) ? sp.status : undefined;
  const query: Record<string, string> = status ? { status } : {};
  await dbConnect();
  const [total, rows] = await Promise.all([
    Inquiry.countDocuments(query),
    Inquiry.find(query).sort({ createdAt: -1 }).skip((page - 1) * PER_PAGE).limit(PER_PAGE).lean(),
  ]);

  return (
    <>
      <AdminTitle title="Inquiries" subtitle="Messages from the contact form." />
      <nav aria-label="Filter inquiries" className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...INQUIRY_STATUSES].map((s) => (
          <a key={s ?? "all"} href={s ? `/admin/inquiries?status=${s}` : "/admin/inquiries"} aria-current={status === s ? "page" : undefined} className={`btn btn-sm ${status === s ? "btn-primary" : "btn-ghost"}`}>
            {s ? s.replaceAll("_", " ") : "All"}
          </a>
        ))}
      </nav>
      {rows.length ? (
        <ul className="space-y-4">
          {rows.map((q) => (
            <li key={String(q._id)} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold text-white">{q.name} <span className="text-sm font-normal text-muted">· {q.serviceInterest}</span></p>
                  <p className="mt-1 flex flex-wrap gap-4 text-sm">
                    <a className="inline-flex items-center gap-1 text-cyan hover:underline" href={`mailto:${q.email}`}><Mail className="h-3.5 w-3.5" aria-hidden />{q.email}</a>
                    {q.phone && <a className="inline-flex items-center gap-1 text-cyan hover:underline" href={`tel:${q.phone}`}><Phone className="h-3.5 w-3.5" aria-hidden />{q.phone}</a>}
                  </p>
                </div>
                <div className="text-right text-xs text-muted">
                  <StatusBadge status={q.status} />
                  <p className="mt-1">{fmtDate(q.createdAt, true)}</p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-soft">{q.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                <ActionForm action={updateInquiryStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={String(q._id)} />
                  <label className="sr-only" htmlFor={`is-${q._id}`}>Status</label>
                  <select id={`is-${q._id}`} name="status" defaultValue={q.status} className="field py-1.5 text-xs">
                    {INQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
                  </select>
                  <SubmitButton size="sm" variant="ghost">Update</SubmitButton>
                </ActionForm>
                <ActionForm action={deleteInquiryAction} confirm="Delete this inquiry permanently?">
                  <input type="hidden" name="id" value={String(q._id)} />
                  <SubmitButton size="sm" variant="danger">Delete</SubmitButton>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>No inquiries.</EmptyState>
      )}
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} makeHref={(p) => `/admin/inquiries?page=${p}${status ? `&status=${status}` : ""}`} />
    </>
  );
}
