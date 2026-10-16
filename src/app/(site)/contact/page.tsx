import { Mail, MapPin, Phone } from "lucide-react";
import { getPage, getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { ContactForm } from "@/components/site/ContactForm";
import { PageHero } from "@/components/site/sections";
import { telHref } from "@/components/site/nav";

export const revalidate = 60;
export const generateMetadata = () => pageMetadata("contact");

const INTEREST_PARAM: Record<string, string> = {
  "window-cleaning": "Window cleaning",
  "driveway-sealing": "Driveway sealing",
  "power-soft-washing": "Power & soft washing",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const [c, settings, sp] = await Promise.all([getPage("contact"), getSettings(), searchParams]);
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
      <section className="py-14">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            <a href={telHref(settings.phone)} className="card flex items-center gap-4 p-5 transition-colors hover:border-cyan">
              <span className="icon-ring h-12 w-12"><Phone className="h-5 w-5" aria-hidden /></span>
              <span>
                <span className="block text-sm text-muted">Call or text</span>
                <span className="font-display text-xl font-bold text-white">{settings.phoneDisplay}</span>
              </span>
            </a>
            <a href={`mailto:${settings.email}`} className="card flex items-center gap-4 p-5 transition-colors hover:border-cyan">
              <span className="icon-ring h-12 w-12"><Mail className="h-5 w-5" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-sm text-muted">Email</span>
                <span className="block break-all font-display text-lg font-bold text-white">{settings.email}</span>
              </span>
            </a>
            <div className="card p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <MapPin className="h-5 w-5 text-cyan" aria-hidden /> Service areas
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {settings.serviceAreas.map((a) => (
                  <li key={a} className="rounded-full border border-line-strong px-3 py-1 text-sm text-soft">{a}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-cyan/60 bg-cyan/5 p-5">
              <h2 className="font-display text-lg font-bold">Need an additional-service quote?</h2>
              <p className="mt-1 text-sm text-soft/90">
                For window cleaning, driveway sealing, or power and soft washing, call or email us with your address and a short description. 6- and 12-month bin cleaning subscribers receive a discount.
              </p>
            </div>
          </div>
          <div>
            <h2 className="sr-only">Send us a message</h2>
            <ContactForm defaultInterest={sp.service ? INTEREST_PARAM[sp.service] : undefined} />
          </div>
        </div>
      </section>
    </>
  );
}
