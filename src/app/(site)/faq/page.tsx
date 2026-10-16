import { getFaqs, getPage, getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import { CtaBand, PageHero, QuoteCtas } from "@/components/site/sections";

export const revalidate = 60;
export const generateMetadata = () => pageMetadata("faq");

export default async function FaqPage() {
  const [c, faqs, settings] = await Promise.all([getPage("faq"), getFaqs(), getSettings()]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
      <section className="py-14">
        <div className="container-x max-w-3xl">
          {faqs.length ? <FaqAccordion items={faqs} /> : <p className="text-center text-muted">No questions published yet.</p>}
          <div className="mt-10 rounded-xl border border-line bg-ink-2 p-6 text-center">
            <h2 className="font-display text-2xl font-bold">Still have a question?</h2>
            <p className="mt-1 text-soft/85">We are happy to help.</p>
            <div className="flex justify-center">
              <QuoteCtas settings={settings} />
            </div>
          </div>
        </div>
      </section>
      <CtaBand />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
