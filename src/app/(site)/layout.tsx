import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSettings } from "@/lib/content";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <Header logoUrl={settings.logoUrl} name={settings.businessName} phone={settings.phone} phoneDisplay={settings.phoneDisplay} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
    </>
  );
}
