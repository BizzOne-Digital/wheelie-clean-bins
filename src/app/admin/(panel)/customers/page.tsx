import Link from "next/link";
import { Search } from "lucide-react";
import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { AdminTitle, EmptyState, Pagination, escapeRegex, fmtDate } from "@/components/admin/ui";

const PER_PAGE = 25;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim().slice(0, 100);
  const query = q ? { $or: ["name", "email", "phone"].map((f) => ({ [f]: new RegExp(escapeRegex(q), "i") })) } : {};
  await dbConnect();
  const [total, rows] = await Promise.all([
    Customer.countDocuments(query),
    Customer.find(query).sort({ createdAt: -1 }).skip((page - 1) * PER_PAGE).limit(PER_PAGE).lean(),
  ]);

  return (
    <>
      <AdminTitle title="Customers" subtitle={`${total} customer${total === 1 ? "" : "s"}`} />
      <form className="card mb-5 flex flex-wrap items-end gap-3 p-4" role="search">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="q" className="field-label">Search</label>
          <input id="q" name="q" defaultValue={q} className="field" placeholder="Name, email or phone" />
        </div>
        <button className="btn btn-primary btn-md"><Search className="h-4 w-4" aria-hidden /> Search</button>
      </form>
      {rows.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-ink-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={String(c._id)}>
                  <td className="px-4 py-3 text-white">{c.name}</td>
                  <td className="px-4 py-3"><a className="text-cyan hover:underline" href={`mailto:${c.email}`}>{c.email}</a></td>
                  <td className="px-4 py-3 text-soft">{c.phone}</td>
                  <td className="px-4 py-3">
                    <Link className="text-cyan hover:underline" href={`/admin/bookings?q=${encodeURIComponent(c.email)}`}>{c.bookingCount ?? 0} view</Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{fmtDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>No customers found.</EmptyState>
      )}
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} makeHref={(p) => `/admin/customers?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`} />
    </>
  );
}
