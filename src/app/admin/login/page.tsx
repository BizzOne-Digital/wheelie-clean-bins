import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/content";
import { SafeImage } from "@/components/ui/SafeImage";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Login | Wheelie Clean Bins", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  const settings = await getSettings();
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="relative mx-auto h-24 w-40">
          <SafeImage src={settings.logoUrl} alt={`${settings.businessName} logo`} fill sizes="160px" className="object-contain" priority />
        </div>
        <div className="card mt-6 p-6">
          <h1 className="font-display text-2xl font-bold">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted">Authorized staff only.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
