"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

export function RetryPaymentButton({ reference, token }: { reference: string; token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.checkoutUrl) throw new Error(json.error ?? "Could not start payment");
      window.location.assign(json.checkoutUrl);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="text-center">
      <button type="button" onClick={retry} disabled={busy} className="btn btn-primary btn-lg">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
        {busy ? "Opening secure checkout…" : "Pay Securely Now"}
      </button>
      {error && <p role="alert" className="field-error mt-2">{error}</p>}
    </div>
  );
}
