import { STOCK } from "./images";

/* ------------------------------------------------------------------ */
/* Site settings                                                       */
/* ------------------------------------------------------------------ */

export interface SiteSettingsData {
  businessName: string;
  tagline: string;
  phone: string;
  phoneDisplay: string;
  email: string;
  logoUrl: string;
  faviconUrl: string;
  serviceAreas: string[];
  social: { facebook: string; instagram: string; tiktok: string };
  booking: {
    acceptingBookings: boolean;
    maxBins: number;
    timingNotice: string;
  };
  billing: {
    annualPromoEnabled: boolean;
    /** When true, "one month free" also waives one month of additional-bin charges. */
    monthFreeIncludesExtraBins: boolean;
    taxEnabled: boolean;
    taxRatePercent: number;
    taxLabel: string;
    recurringMonthly: boolean;
  };
  emt: {
    enabled: boolean;
    recipient: string;
    instructions: string;
  };
  seo: { title: string; description: string; ogImageUrl: string };
}

export const DEFAULT_SETTINGS: SiteSettingsData = {
  businessName: "Wheelie Clean Bins",
  tagline: "Cleaner Bins. Happier Homes. Across the GTA.",
  phone: "6475708029",
  phoneDisplay: "647 570 8029",
  email: "zakariyyadadabhai91@gmail.com",
  logoUrl: "/brand/logo.png",
  faviconUrl: "",
  serviceAreas: ["York Region", "Durham", "Peel", "Halton", "City of Toronto", "Scarborough"],
  social: { facebook: "", instagram: "", tiktok: "" },
  booking: {
    acceptingBookings: true,
    maxBins: 8,
    timingNotice:
      "We clean after your garbage has been collected. Your requested timing helps us plan our route and is confirmed by our team before your first visit.",
  },
  billing: {
    annualPromoEnabled: true,
    monthFreeIncludesExtraBins: false,
    taxEnabled: false,
    taxRatePercent: 0,
    taxLabel: "Tax",
    recurringMonthly: true,
  },
  emt: {
    enabled: true,
    recipient: "",
    instructions:
      "Your booking is reserved. Our team will contact you with e-Transfer details. Please include your booking reference in the transfer message. Your booking is confirmed once payment is received.",
  },
  seo: {
    title: "Wheelie Clean Bins | Curbside Bin Cleaning in the GTA",
    description:
      "Monthly curbside garbage bin cleaning and deodorizing across the Greater Toronto Area from $14.99/month. We bring our own water. No need to be home.",
    ogImageUrl: STOCK.curbBins,
  },
};

/* ------------------------------------------------------------------ */
/* Pricing plans (money in integer cents)                              */
/* ------------------------------------------------------------------ */

export interface PlanData {
  key: string;
  name: string;
  regions: string[];
  monthlyPriceCents: number;
  includedBins: number;
  extraBinCents: number;
  accent: "yellow" | "cyan";
  active: boolean;
  sortOrder: number;
}

export const DEFAULT_PLANS: PlanData[] = [
  {
    key: "york-durham-peel-halton",
    name: "York • Durham • Peel • Halton",
    regions: ["York Region", "Durham", "Peel", "Halton"],
    monthlyPriceCents: 1499,
    includedBins: 3,
    extraBinCents: 300,
    accent: "yellow",
    active: true,
    sortOrder: 1,
  },
  {
    key: "toronto-scarborough",
    name: "Toronto • Scarborough",
    regions: ["City of Toronto", "Scarborough"],
    monthlyPriceCents: 1499,
    includedBins: 2,
    extraBinCents: 500,
    accent: "cyan",
    active: true,
    sortOrder: 2,
  },
];

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

export interface ServiceData {
  key: string;
  title: string;
  summary: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  kind: "primary" | "additional";
  active: boolean;
  sortOrder: number;
}

export const DEFAULT_SERVICES: ServiceData[] = [
  {
    key: "bin-cleaning",
    title: "Monthly Bin Cleaning & Deodorizing",
    summary: "High-pressure hot-water cleaning for your garbage, recycling and green bins, right at the curb.",
    description:
      "On your collection day, after the truck has emptied your bins, our team cleans the inside and outside with high-pressure hot water, deodorizes them, and returns them to the spot you choose. We bring our own water and equipment and collect the wastewater, so your curb is left clean.",
    imageUrl: STOCK.pressureWash,
    imageAlt: "Technician washing a wheelie bin inside a stainless-steel wastewater collection enclosure",
    kind: "primary",
    active: true,
    sortOrder: 0,
  },
  {
    key: "window-cleaning",
    title: "Window Cleaning",
    summary: "Streak-free exterior window cleaning for your home.",
    description: "Clear, streak-free windows that brighten your home. Every property is different, so we quote each job individually.",
    imageUrl: STOCK.windowCleaning,
    imageAlt: "Window being cleaned with a squeegee",
    kind: "additional",
    active: true,
    sortOrder: 1,
  },
  {
    key: "driveway-sealing",
    title: "Driveway Sealing",
    summary: "Protect and refresh the look of your driveway.",
    description: "Sealing helps protect your driveway surface and gives it a fresh, finished look. Contact us for a quote based on your driveway.",
    imageUrl: STOCK.driveway,
    imageAlt: "Technician applying black sealcoat to a residential asphalt driveway",
    kind: "additional",
    active: true,
    sortOrder: 2,
  },
  {
    key: "power-soft-washing",
    title: "Power & Soft Washing",
    summary: "Lift dirt and grime from walkways, patios and exterior surfaces.",
    description: "Power washing for hard surfaces and gentler soft washing for more delicate exteriors. Tell us about your property and we will quote the job.",
    imageUrl: STOCK.surfaceWash,
    imageAlt: "Technician pressure washing a paved surface",
    kind: "additional",
    active: true,
    sortOrder: 3,
  },
];

/* ------------------------------------------------------------------ */
/* FAQs                                                                */
/* ------------------------------------------------------------------ */

export interface FaqData {
  key: string;
  question: string;
  answer: string;
  active: boolean;
  sortOrder: number;
}

const faqs: [string, string, string][] = [
  ["home", "Do I need to be home?", "No. Just leave your bins out on your regular garbage collection day. We clean them after collection and return them to your preferred spot. You do not need to be home."],
  ["water", "Do you use my water?", "No. We bring our own water supply and equipment, so we never need access to your tap, hose or electricity."],
  ["arrival", "When do you arrive?", "We arrive after your garbage has been collected on your scheduled collection day. The approximate time you choose during booking helps us plan our route, and our team confirms timing with you before your first clean."],
  ["return", "Where do you return the bins?", "Wherever you prefer. During booking you can choose a spot such as beside the garage, at the side of the house, or by the backyard gate, and add any special instructions in the notes."],
  ["wastewater", "Is wastewater left behind?", "No. We collect the wastewater and debris from cleaning, so your curb and driveway are left clean."],
  ["areas", "Which areas do you serve?", "We serve York Region, Durham, Peel, Halton, the City of Toronto and Scarborough. If you are unsure whether your street is covered, call or email us and we will confirm."],
  ["included", "How many bins are included?", "In York, Durham, Peel and Halton, your plan includes up to 3 bins. In Toronto and Scarborough, your plan includes up to 2 bins."],
  ["extra-bins", "What do additional bins cost?", "Additional bins are $3 each per monthly visit in York, Durham, Peel and Halton, and $5 each per monthly visit in Toronto and Scarborough."],
  ["billing", "What billing options are available?", "You can pay monthly, or prepay for 3, 6 or 12 months upfront. Monthly plans renew each month. Prepaid plans cover the number of months you choose."],
  ["annual-promo", "How does the annual promotion work?", "When you prepay for 12 months, you choose one bonus: either one free extra clean or one month free. Your choice and the final amount are shown clearly in your order summary before payment."],
  ["quote", "How do I request an additional-service quote?", "Call or email us, or send a message through our contact page. Tell us about your property and the service you need (window cleaning, driveway sealing, or power and soft washing) and we will prepare a quote."],
  ["subscriber-discount", "How do subscriber discounts work?", "Customers on a 6-month or 12-month bin cleaning plan receive a discount on additional services. The discount is confirmed in your quote."],
];

export const DEFAULT_FAQS: FaqData[] = faqs.map(([key, question, answer], i) => ({
  key,
  question,
  answer,
  active: true,
  sortOrder: i + 1,
}));

/* ------------------------------------------------------------------ */
/* Editable page content                                               */
/* ------------------------------------------------------------------ */

export type FieldType = "text" | "textarea" | "image";
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  default: string;
}
export interface PageDef {
  slug: PageSlug;
  title: string;
  path: string;
  fields: FieldDef[];
}

export const PAGE_SLUGS = ["home", "about", "services", "pricing", "faq", "booking", "contact"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

const t = (key: string, label: string, def: string): FieldDef => ({ key, label, type: "text", default: def });
const ta = (key: string, label: string, def: string): FieldDef => ({ key, label, type: "textarea", default: def });
const img = (key: string, label: string, def: string): FieldDef => ({ key, label, type: "image", default: def });

const seo = (title: string, description: string) => [t("seoTitle", "SEO title", title), ta("seoDescription", "SEO description", description)];

export const PAGE_DEFS: PageDef[] = [
  {
    slug: "home",
    title: "Home",
    path: "/",
    fields: [
      ...seo(DEFAULT_SETTINGS.seo.title, DEFAULT_SETTINGS.seo.description),
      t("heroKicker", "Hero eyebrow", "Wheelie Clean Bins"),
      t("heroTitle1", "Hero headline line 1 (white)", "A Cleaner Bin."),
      t("heroTitle2", "Hero headline line 2 (yellow)", "A Better Standard."),
      ta("heroIntro", "Hero supporting text", "Premium curbside bin cleaning, designed around your schedule. Enjoy cleaner, fresher-smelling bins without lifting a finger."),
      t("heroTrust", "Hero trust line", "Convenient monthly service · Professional cleaning · Hassle-free scheduling"),
      img("heroMascot", "Hero mascot image", "/images/hero-mascot.png"),
      t("heroMascotAlt", "Hero mascot description", "Wheelie Clean Bins mascot: a smiling garbage bin in sunglasses using a pressure washer"),
      t("benefit1Title", "Benefit 1 title", "No need to be home"),
      t("benefit1Text", "Benefit 1 text", "We handle everything."),
      t("benefit2Title", "Benefit 2 title", "We bring our own water"),
      t("benefit2Text", "Benefit 2 text", "Fully equipped and self-contained."),
      t("benefit3Title", "Benefit 3 title", "No mess left behind"),
      t("benefit3Text", "Benefit 3 text", "Just clean, fresh bins."),
      t("howTitle", "How it works heading", "Exceptional Cleanliness."),
      t("howAccent", "How it works heading (cyan)", "Effortless Convenience."),
      ta("howSubtitle", "How it works subtitle", "Our streamlined service makes maintaining clean bins simple. We take care of the mess so you can enjoy a fresher, cleaner property."),
      t("whyTitle", "Why clean heading", "Clean Bins."),
      t("whyAccent", "Why clean heading (cyan)", "A Fresher Home."),
      ta("whySubtitle", "Why clean subtitle", "Your bins handle everyday waste. Our job is to help keep them clean, fresh, and well maintained."),
      t("planTitle", "Pricing heading", "Premium Care."),
      t("planAccent", "Pricing heading (cyan)", "Predictable Pricing."),
      ta("planSubtitle", "Pricing subtitle", "Keep your bins fresh throughout the year with a simple recurring subscription. Choose the plan that works best for your home."),
      ta("planFeatures", "Plan card features (one per line)", "Recurring scheduled bin cleaning\nConvenient curbside service\nNo need to be home\nHassle-free subscription billing"),
      t("planBinNote", "Plan bin-size note", "The number of bins included may vary based on bin size."),
      t("bookingTitle", "Booking heading", "Your cleaner curb"),
      t("bookingTitleAccent", "Booking heading (cyan)", "starts here."),
      ta("bookingText", "Booking text", "Get started with a monthly bin cleaning subscription. Quick, easy and hassle-free."),
      t("servicesTitle", "Additional services heading", "Additional Services"),
      t("servicesSubtitle", "Additional services subtitle", "Keep your whole property looking its best."),
    ],
  },
  {
    slug: "about",
    title: "About",
    path: "/about",
    fields: [
      ...seo("About Us | Wheelie Clean Bins", "Wheelie Clean Bins provides residential curbside garbage bin cleaning and deodorizing across the Greater Toronto Area."),
      t("eyebrow", "Eyebrow", "About Wheelie Clean Bins"),
      t("title", "Heading", "Clean bins, without the chore."),
      ta("intro", "Introduction", "Wheelie Clean Bins provides curbside garbage bin cleaning and deodorizing for homeowners and tenants across the Greater Toronto Area. We take one of the least pleasant household jobs off your list, so your bins stay fresh month after month."),
      img("image", "Main image", STOCK.about),
      t("imageAlt", "Main image description", "Technician returning a clean yellow-lid bin beside a garage, with a self-contained cleaning trailer at the curb"),
      t("howTitle", "How we work heading", "Right at your curb"),
      ta("howText", "How we work text", "Leave your bins out on your regular collection day. After the garbage truck has been, our team cleans your bins at the curb using high-pressure hot water, deodorizes them, and returns them to the spot you prefer."),
      t("selfTitle", "Self-contained heading", "Fully self-contained"),
      ta("selfText", "Self-contained text", "We bring our own water supply and equipment. You do not need to be home, and we never need your hose, tap or power."),
      t("tidyTitle", "Tidy service heading", "Nothing left behind"),
      ta("tidyText", "Tidy service text", "Wastewater and debris from cleaning are collected, not washed onto your driveway or street, so your curb is left clean."),
      t("areasTitle", "Service areas heading", "Proudly serving the GTA"),
    ],
  },
  {
    slug: "services",
    title: "Services",
    path: "/services",
    fields: [
      ...seo("Services | Wheelie Clean Bins", "Monthly curbside bin cleaning and deodorizing, plus window cleaning, driveway sealing, and power and soft washing across the GTA."),
      t("eyebrow", "Eyebrow", "Our services"),
      t("title", "Heading", "Bin cleaning, done properly."),
      ta("intro", "Introduction", "Our main service is monthly curbside bin cleaning and deodorizing. We also offer quoted exterior services to keep your whole property looking its best."),
      t("includedTitle", "What is included heading", "What every clean includes"),
      ta("included", "Included items (one per line)", "High-pressure hot-water wash, inside and out\nDeodorizing treatment\nCleaning after your regular collection\nWastewater and debris collected\nBins returned to your preferred spot\nNo need to be home"),
      t("discountTitle", "Subscriber discount heading", "Subscriber discount"),
      ta("discountText", "Subscriber discount text", "Customers on a 6-month or 12-month bin cleaning plan receive a discount on additional services. Your discount is confirmed in your quote."),
    ],
  },
  {
    slug: "pricing",
    title: "Pricing",
    path: "/pricing",
    fields: [
      ...seo("Pricing | Wheelie Clean Bins", "Simple monthly bin cleaning plans from $14.99/month across the GTA. Pay monthly or prepay 3, 6 or 12 months."),
      t("eyebrow", "Eyebrow", "Simple pricing"),
      t("title", "Heading", "Small price."),
      t("titleAccent", "Heading (cyan)", "Big freshness."),
      ta("intro", "Introduction", "Choose the plan for your area. All prices are in Canadian dollars."),
      t("billingTitle", "Billing heading", "Choose how you pay"),
      ta("billingText", "Billing text", "Pay monthly, or prepay for 3, 6 or 12 months upfront. Monthly plans renew automatically each month until cancelled. Prepaid plans are a one-time payment for the months you choose."),
      t("promoTitle", "Annual offer heading", "12 months. Even more value."),
      t("promoText", "Annual offer text", "Choose one free extra clean or one month free."),
    ],
  },
  {
    slug: "faq",
    title: "FAQ",
    path: "/faq",
    fields: [
      ...seo("FAQ | Wheelie Clean Bins", "Answers to common questions about curbside bin cleaning, service areas, pricing and billing."),
      t("eyebrow", "Eyebrow", "Questions & answers"),
      t("title", "Heading", "Frequently asked questions"),
      ta("intro", "Introduction", "Everything you need to know about our curbside bin cleaning service. Still have a question? Call or email us."),
    ],
  },
  {
    slug: "booking",
    title: "Booking",
    path: "/booking",
    fields: [
      ...seo("Book a Clean | Wheelie Clean Bins", "Book your monthly curbside bin cleaning subscription in a few simple steps."),
      t("eyebrow", "Eyebrow", "Book & subscribe"),
      t("title", "Heading", "Book your first clean"),
      ta("intro", "Introduction", "Four quick steps. Review everything before you pay."),
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    path: "/contact",
    fields: [
      ...seo("Contact | Wheelie Clean Bins", "Call, email or message Wheelie Clean Bins for bin cleaning and additional-service quotes across the GTA."),
      t("eyebrow", "Eyebrow", "Get in touch"),
      t("title", "Heading", "Let's talk clean bins."),
      ta("intro", "Introduction", "Questions about bin cleaning, or need a quote for window cleaning, driveway sealing, or power and soft washing? Reach out and we will get back to you."),
    ],
  },
];

export function pageDef(slug: PageSlug) {
  return PAGE_DEFS.find((p) => p.slug === slug)!;
}

export function pageDefaults(slug: PageSlug): Record<string, string> {
  return Object.fromEntries(pageDef(slug).fields.map((f) => [f.key, f.default]));
}
