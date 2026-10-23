"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarCheck,
  CircleDollarSign,
  Inbox,
  LayoutDashboard,
  Menu,
  Repeat,
  Sparkles,
  Users,
  X,
} from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/admin/services", label: "Services", icon: Sparkles },
  { href: "/admin/pricing", label: "Pricing", icon: CircleDollarSign },
];

export function AdminNav({ mode }: { mode: "mobile" | "desktop" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const list = (
    <ul className="space-y-1">
      {LINKS.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            onClick={() => setOpen(false)}
            aria-current={active(l.href) ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active(l.href) ? "bg-card text-white shadow-[inset_3px_0_0_var(--color-cyan)]" : "text-soft/80 hover:bg-card hover:text-white"
            }`}
          >
            <l.icon className={`h-4 w-4 ${active(l.href) ? "text-cyan" : ""}`} aria-hidden />
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  if (mode === "desktop") return <nav aria-label="Admin">{list}</nav>;

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm lg:hidden"
        aria-expanded={open}
        aria-controls="admin-mobile-nav"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />} Menu
      </button>
      {open && (
        <nav id="admin-mobile-nav" aria-label="Admin" className="absolute inset-x-0 top-full z-40 border-b border-line bg-ink-2 p-3 lg:hidden">
          {list}
        </nav>
      )}
    </>
  );
}
