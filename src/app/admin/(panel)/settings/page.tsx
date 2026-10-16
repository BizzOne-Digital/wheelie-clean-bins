import { getSettings } from "@/lib/content";
import { isStripeConfigured, isStripeWebhookConfigured } from "@/lib/stripe";
import { AdminTitle } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function SettingsAdmin() {
  const settings = await getSettings();
  return (
    <>
      <AdminTitle title="Settings" subtitle="Public business settings. Secrets such as API keys stay in environment variables and never appear here." />
      <div className="card mb-6 p-4 text-sm">
        <p className="font-semibold text-white">Integration status</p>
        <ul className="mt-2 space-y-1 text-soft">
          <li>Stripe secret key: {isStripeConfigured() ? <span className="text-ok">configured</span> : <span className="text-danger">missing (STRIPE_SECRET_KEY)</span>}</li>
          <li>Stripe webhook secret: {isStripeWebhookConfigured() ? <span className="text-ok">configured</span> : <span className="text-danger">missing (STRIPE_WEBHOOK_SECRET)</span>}</li>
          <li>Site URL: {process.env.NEXT_PUBLIC_SITE_URL ? <span className="text-ok">{process.env.NEXT_PUBLIC_SITE_URL}</span> : <span className="text-danger">missing (NEXT_PUBLIC_SITE_URL)</span>}</li>
        </ul>
      </div>
      <SettingsForm initial={settings} />
    </>
  );
}
