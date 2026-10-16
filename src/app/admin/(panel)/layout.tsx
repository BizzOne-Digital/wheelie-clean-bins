import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "../actions/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin | Wheelie Clean Bins", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen bg-ink">
      <header className="relative border-b border-line bg-ink-2">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <AdminNav mode="mobile" />
            <Link href="/admin" className="font-display text-lg font-extrabold text-white">
              Wheelie <span className="text-brand">Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted sm:inline">{admin.email}</span>
            <Link href="/" target="_blank" className="btn btn-ghost btn-sm" aria-label="View website (opens in new tab)">
              <ExternalLink className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">View site</span>
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-ghost btn-sm">
                <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-line p-3 lg:block">
          <AdminNav mode="desktop" />
        </aside>
        <main id="main" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
