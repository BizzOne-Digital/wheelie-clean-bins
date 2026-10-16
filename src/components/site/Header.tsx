"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, Phone, X } from "lucide-react";
import { NAV_LINKS, telHref } from "./nav";
import { SafeImage } from "@/components/ui/SafeImage";

export function Header({ logoUrl, name, phone, phoneDisplay }: { logoUrl: string; name: string; phone: string; phoneDisplay: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled || open ? "border-b border-line bg-ink/95 backdrop-blur-md" : "border-b border-transparent bg-ink/40"
      }`}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-brand focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <div className="container-x flex h-[72px] items-center justify-between gap-4 sm:h-20">
        <Link href="/" aria-label={`${name} home`} className="relative block h-14 w-[104px] shrink-0 sm:h-16 sm:w-[120px]">
          <SafeImage src={logoUrl} alt={`${name} logo`} fill priority sizes="120px" className="object-contain object-left" />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`relative py-2 text-[0.92rem] font-medium transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-[2px] after:bg-cyan after:transition-all ${
                    isActive(l.href) ? "text-white after:w-full" : "text-soft/85 after:w-0 hover:text-white hover:after:w-full"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/booking" className="btn btn-primary btn-sm hidden sm:inline-flex sm:px-4 sm:py-2.5">
            Book a Clean <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line-strong text-white lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" ref={panelRef} className="fixed inset-x-0 top-[72px] bottom-0 overflow-y-auto border-t border-line bg-ink sm:top-20 lg:hidden">
          <nav aria-label="Mobile" className="container-x py-6">
            <ul className="space-y-1">
              {[...NAV_LINKS, { href: "/booking", label: "Booking" }].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className={`flex items-center justify-between rounded-lg px-3 py-3.5 font-display text-lg font-semibold ${
                      isActive(l.href) ? "bg-card text-white shadow-[inset_3px_0_0_var(--color-cyan)]" : "text-soft hover:bg-card"
                    }`}
                  >
                    {l.label}
                    <ArrowRight className="h-4 w-4 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-3">
              <Link href="/booking" className="btn btn-primary btn-lg w-full">
                Book a Clean <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <a href={telHref(phone)} className="btn btn-ghost btn-lg w-full">
                <Phone className="h-5 w-5 text-cyan" aria-hidden /> Call {phoneDisplay}
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
