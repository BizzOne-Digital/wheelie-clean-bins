import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function AdminTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  paid: "border-ok/40 bg-ok/10 text-ok",
  active: "border-ok/40 bg-ok/10 text-ok",
  confirmed: "border-ok/40 bg-ok/10 text-ok",
  completed: "border-ok/40 bg-ok/10 text-ok",
  closed: "border-line-strong bg-card-2 text-muted",
  trialing: "border-ok/40 bg-ok/10 text-ok",
  pending: "border-brand/40 bg-brand/10 text-brand",
  awaiting_emt: "border-brand/40 bg-brand/10 text-brand",
  new: "border-cyan/40 bg-cyan/10 text-cyan",
  scheduled: "border-cyan/40 bg-cyan/10 text-cyan",
  in_progress: "border-cyan/40 bg-cyan/10 text-cyan",
  not_started: "border-line-strong bg-card-2 text-soft",
  incomplete: "border-brand/40 bg-brand/10 text-brand",
  past_due: "border-danger/40 bg-danger/10 text-danger",
  failed: "border-danger/40 bg-danger/10 text-danger",
  cancelled: "border-line-strong bg-card-2 text-muted",
  canceled: "border-line-strong bg-card-2 text-muted",
  unpaid: "border-danger/40 bg-danger/10 text-danger",
  not_configured: "border-danger/40 bg-danger/10 text-danger",
  refunded: "border-line-strong bg-card-2 text-muted",
  paused: "border-brand/40 bg-brand/10 text-brand",
  ended: "border-line-strong bg-card-2 text-muted",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "unknown";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${TONES[s] ?? "border-line-strong text-soft"}`}>
      {s === "not_configured" ? "payment setup needed" : s.replaceAll("_", " ")}
    </span>
  );
}

export function Pagination({ page, pages, makeHref }: { page: number; pages: number; makeHref: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-5 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link className="btn btn-ghost btn-sm" href={makeHref(page - 1)}><ChevronLeft className="h-4 w-4" aria-hidden /> Previous</Link>
      ) : <span />}
      <span className="text-muted">Page {page} of {pages}</span>
      {page < pages ? (
        <Link className="btn btn-ghost btn-sm" href={makeHref(page + 1)}>Next <ChevronRight className="h-4 w-4" aria-hidden /></Link>
      ) : <span />}
    </nav>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="card p-10 text-center text-sm text-muted">{children}</div>;
}

export function fmtDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-CA", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "America/Toronto",
  });
}

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
