import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import { getSettings } from "@/lib/content";
import { siteUrl } from "@/lib/stripe";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["500", "600", "700", "800", "900"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: s.seo.title, template: `%s` },
    description: s.seo.description,
    icons: s.faviconUrl ? { icon: s.faviconUrl } : undefined,
    openGraph: {
      type: "website",
      siteName: s.businessName,
      title: s.seo.title,
      description: s.seo.description,
      images: s.seo.ogImageUrl ? [{ url: s.seo.ogImageUrl }] : undefined,
      locale: "en_CA",
    },
  };
}

export const viewport: Viewport = { themeColor: "#101719" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={`${outfit.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster theme="dark" position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
