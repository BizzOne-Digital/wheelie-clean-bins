import Link from "next/link";
import { ArrowRight, Check, PawPrint, CircleDollarSign, Clock, Droplets, HelpCircle, MapPin, Wind, X } from "lucide-react";
import type { FaqData } from "@/lib/defaults";
import { SectionHeading } from "./sections";

/* Why clean your bins --------------------------------------------------------- */
const REASONS = [
  { icon: Wind, title: "Odour Control", text: "Help eliminate lingering waste odours and keep unpleasant smells under control." },
  { icon: Droplets, title: "Professional Deep Cleaning", text: "High-pressure cleaning and hot water help remove stubborn grime, residue, and buildup." },
  { icon: PawPrint, title: "A Cleaner Outdoor Space", text: "Regular bin maintenance helps reduce residue and conditions that attract unwanted pests." },
  { icon: Clock, title: "Convenience on Autopilot", text: "Recurring service means one less household chore to remember. No need to be home." },
];

export function WhyCleanSection({ title, accent, subtitle }: { title: string; accent: string; subtitle: string }) {
  return (
    <section className="section-rule bg-ink-2 py-14 sm:py-16" aria-labelledby="why-heading">
      <div className="container-x">
        <div id="why-heading">
          <SectionHeading title={title} accent={accent} subtitle={subtitle} />
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r) => (
            <li key={r.title} className="card p-6 transition-colors hover:border-cyan">
              <span className="icon-ring h-12 w-12"><r.icon className="h-6 w-6" aria-hidden /></span>
              <h3 className="mt-4 font-display text-lg font-bold">{r.title}</h3>
              <p className="mt-1.5 text-sm text-soft/85">{r.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* DIY vs Wheelie Clean Bins ------------------------------------------------------ */
const COMPARE: [string, boolean, boolean][] = [
  ["Uses your water and hose", true, false],
  ["You handle the mess yourself", true, false],
  ["Dirty water ends up on your driveway", true, false],
  ["High-pressure hot-water cleaning", false, true],
  ["Deodorizing after every clean", false, true],
  ["No need to be home", false, true],
  ["Bins returned to your preferred spot", false, true],
];

export function CompareSection() {
  return (
    <section className="section-rule py-14 sm:py-16" aria-labelledby="compare-heading">
      <div className="container-x">
        <div id="compare-heading">
          <SectionHeading title="Doing it yourself" accent="vs. letting us" subtitle="See why homeowners hand this job over." />
        </div>
        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-sm sm:text-base">
            <caption className="sr-only">Comparison of cleaning bins yourself and using Wheelie Clean Bins</caption>
            <thead className="bg-ink-2 font-display">
              <tr>
                <th scope="col" className="px-4 py-3 text-white sm:px-6">&nbsp;</th>
                <th scope="col" className="w-24 px-2 py-3 text-center text-muted sm:w-32">DIY</th>
                <th scope="col" className="w-28 bg-brand/10 px-2 py-3 text-center text-brand sm:w-40">Wheelie Clean</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-card">
              {COMPARE.map(([label, diy, us]) => (
                <tr key={label}>
                  <th scope="row" className="px-4 py-3 font-normal text-soft sm:px-6">{label}</th>
                  {[diy, us].map((v, i) => (
                    <td key={i} className={`px-2 py-3 text-center ${i === 1 ? "bg-brand/5" : ""}`}>
                      {v ? (
                        <Check className={`mx-auto h-5 w-5 ${i === 1 ? "text-ok" : "text-muted"}`} aria-label="Yes" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-line-strong" aria-label="No" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* What's included ----------------------------------------------------------------- */
export function IncludedSection({ items }: { items: string[] }) {
  return (
    <section className="section-rule bg-ink-2 py-14 sm:py-16" aria-labelledby="included-heading">
      <div className="container-x grid items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 id="included-heading" className="font-display text-[1.9rem] font-extrabold leading-tight sm:text-4xl">
            Every clean, <span className="text-cyan">every month.</span>
          </h2>
          <p className="mt-3 max-w-md text-soft/85">One simple plan with everything included. No add-on fees for the basics.</p>
          <div className="mt-6 flex items-center gap-3 rounded-xl border-2 border-brand bg-ink p-4">
            <CircleDollarSign className="h-8 w-8 shrink-0 text-brand" aria-hidden />
            <p className="text-sm text-soft">
              Plans from <strong className="font-display text-xl text-brand">$14.99</strong>/month across the GTA.
            </p>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-lg border border-line bg-card p-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan/15">
                <Check className="h-4 w-4 text-cyan" aria-hidden />
              </span>
              <span className="text-soft">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* Service areas strip -------------------------------------------------------------- */
export function AreasStrip({ areas }: { areas: string[] }) {
  return (
    <section className="section-rule py-14" aria-labelledby="home-areas-heading">
      <div className="container-x text-center">
        <h2 id="home-areas-heading" className="font-display text-[1.9rem] font-extrabold sm:text-4xl">
          Serving homes <span className="text-cyan">across the GTA</span>
        </h2>
        <ul className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-3">
          {areas.map((a) => (
            <li key={a} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-card px-5 py-2.5 font-display font-semibold text-white">
              <MapPin className="h-4 w-4 text-cyan" aria-hidden /> {a}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-muted">
          Not sure if we cover your street?{" "}
          <Link href="/contact" className="font-semibold text-cyan hover:underline">Ask us</Link>.
        </p>
      </div>
    </section>
  );
}

/* FAQ preview ------------------------------------------------------------------------ */
export function FaqPreview({ faqs }: { faqs: FaqData[] }) {
  if (!faqs.length) return null;
  return (
    <section className="section-rule bg-ink-2 py-14 sm:py-16" aria-labelledby="faq-preview-heading">
      <div className="container-x">
        <div id="faq-preview-heading">
          <SectionHeading title="Questions?" accent="We've got answers." />
        </div>
        <ul className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
          {faqs.map((f) => (
            <li key={f.key} className="card p-6">
              <h3 className="flex items-start gap-3 font-display text-lg font-bold">
                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-cyan" aria-hidden /> {f.question}
              </h3>
              <p className="mt-2 pl-8 text-sm text-soft/85">{f.answer}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 text-center">
          <Link href="/faq" className="btn btn-ghost btn-md">
            See all questions <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
