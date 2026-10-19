import { Droplet, Home as HomeIcon, Leaf, Recycle } from "lucide-react";
import { getPage, getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { SafeImage } from "@/components/ui/SafeImage";
import { CtaBand, HowItWorks, PageHero, ServiceAreas } from "@/components/site/sections";

export const revalidate = 60;
export const generateMetadata = () => pageMetadata("about");

export default async function AboutPage() {
  const [c, home, settings] = await Promise.all([getPage("about"), getPage("home"), getSettings()]);
  const points = [
    { icon: Recycle, title: c.howTitle, text: c.howText },
    { icon: Droplet, title: c.selfTitle, text: c.selfText },
    { icon: Leaf, title: c.tidyTitle, text: c.tidyText },
    { icon: HomeIcon, title: home.benefit1Title, text: "Leave your bins out on collection day and go about your day. We handle the rest." },
  ];

  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} intro={c.intro} />

      <section className="py-14 sm:py-16">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line">
            <SafeImage src={c.image} alt={c.imageAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-extrabold">
              Residential curbside cleaning, <span className="text-cyan">done for you.</span>
            </h2>
            <ul className="mt-7 space-y-6">
              {points.map((p) => (
                <li key={p.title} className="flex gap-4">
                  <span className="icon-ring h-11 w-11">
                    <p.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold">{p.title}</h3>
                    <p className="mt-1 text-soft/85">{p.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="section-rule" />
      <HowItWorks title={home.howTitle} accent={home.howAccent} subtitle={home.howSubtitle} />
      <ServiceAreas areas={settings.serviceAreas} title={c.areasTitle} />
      <CtaBand />
    </>
  );
}
