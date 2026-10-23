import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/content";
import { AdminNav } from "@/components/admin/AdminNav";
import { SafeImage } from "@/components/ui/SafeImage";
import { logoutAction } from "../actions/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin | Wheelie Clean Bins", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [admin, settings] = await Promise.all([requireAdmin(), getSettings()]);
  return (
    <div className="min-h-screen bg-[#0b0f11]">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-[#0b0f11]/90 backdrop-blur-md">
        <div className="relative flex h-20 items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <AdminNav mode="mobile" />
            <Link href="/admin" className="flex items-center gap-3">
              <span className="relative block h-12 w-14 shrink-0">
                <SafeImage src={settings.logoUrl} alt="" fill sizes="56px" className="object-contain" />
              </span>
              <span className="hidden font-display text-lg font-extrabold tracking-tight text-white sm:inline">{settings.businessName}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-muted xl:inline">{admin.email}</span>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-ghost btn-sm rounded-full" aria-label="Sign out">
                <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
            <Link href="/" target="_blank" className="btn btn-primary btn-md rounded-full px-5 sm:px-6" aria-label="Customer page (opens in new tab)">
              Customer page
            </Link>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-line/60 p-3 lg:block">
          <div className="sticky top-24">
            <AdminNav mode="desktop" />
          </div>
        </aside>
        <main id="main" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
