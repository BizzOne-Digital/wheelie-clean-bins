import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { SiteSettingsData } from "@/lib/defaults";
import { SafeImage } from "@/components/ui/SafeImage";
import { NAV_LINKS, telHref } from "./nav";

export function Footer({ settings }: { settings: SiteSettingsData }) {
  const year = new Date().getFullYear();
  const [lead, ...rest] = settings.tagline.split(". ");
  const social = Object.entries(settings.social).filter(([, url]) => /^https:\/\//.test(url));
  return (
    <footer className="border-t border-line bg-ink-2">
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.1fr_1fr_1fr] lg:grid-cols-[1.2fr_1fr_1fr_1.1fr]">
        <div>
          <Link href="/" aria-label={`${settings.businessName} home`} className="relative block h-24 w-40">
            <SafeImage src={settings.logoUrl} alt={`${settings.businessName} logo`} fill sizes="160px" className="object-contain object-left" />
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted">
            Curbside garbage bin cleaning and deodorizing for homes across the Greater Toronto Area.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">Explore</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            {[...NAV_LINKS, { href: "/booking", label: "Book a Clean" }].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-soft/85 transition-colors hover:text-cyan">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href={telHref(settings.phone)} className="inline-flex items-center gap-2.5 text-soft hover:text-cyan">
                <Phone className="h-4 w-4 text-cyan" aria-hidden /> {settings.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-2.5 break-all text-soft hover:text-cyan">
                <Mail className="h-4 w-4 shrink-0 text-cyan" aria-hidden /> {settings.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5 text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden />
              <span>Serving {settings.serviceAreas.join(", ")}</span>
            </li>
          </ul>
          {social.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3 text-sm">
              {social.map(([k, url]) => (
                <li key={k}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="capitalize text-soft/85 hover:text-cyan">
                    {k}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="md:col-span-3 lg:col-span-1 lg:text-right">
          <p className="font-display text-xl font-bold leading-snug text-white">
            {lead}.
            <br />
            <span className="text-cyan">{rest.join(". ")}</span>
          </p>
          <Link href="/booking" className="btn btn-primary btn-md mt-5">
            Book a Clean
          </Link>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.businessName}. All rights reserved.
          </p>
          <p>All prices in Canadian dollars (CAD).</p>
        </div>
      </div>
    </footer>
  );
}
