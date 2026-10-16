"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

const INTERESTS = ["Bin cleaning", "Window cleaning", "Driveway sealing", "Power & soft washing", "Billing question", "Other"];

type Errors = Record<string, string>;

export function ContactForm({ defaultInterest }: { defaultInterest?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const errs: Errors = {};
    if (!String(data.name).trim()) errs.name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(String(data.email))) errs.email = "Enter a valid email address";
    if (String(data.message).trim().length < 10) errs.message = "Please add a few more details (10+ characters)";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setState("sending");
    try {
      const res = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(json.fields ?? {});
        setMessage(json.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      form.reset();
      setState("sent");
    } catch {
      setMessage("Network error. Please check your connection and try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="card flex flex-col items-center p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-ok" aria-hidden />
        <h2 className="mt-4 font-display text-2xl font-bold">Message sent</h2>
        <p className="mt-2 text-soft/85">Thanks for reaching out. We will get back to you as soon as possible.</p>
        <button type="button" className="btn btn-ghost btn-md mt-6" onClick={() => setState("idle")}>
          Send another message
        </button>
      </div>
    );
  }

  const err = (k: string) =>
    errors[k] ? (
      <p id={`c-${k}-err`} className="field-error">
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: string) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `c-${k}-err` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="card p-5 sm:p-7" aria-label="Contact form">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="field-label">Name *</label>
          <input id="c-name" name="name" className="field" autoComplete="name" required {...aria("name")} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="c-email" className="field-label">Email *</label>
          <input id="c-email" name="email" type="email" className="field" autoComplete="email" required {...aria("email")} />
          {err("email")}
        </div>
        <div>
          <label htmlFor="c-phone" className="field-label">Phone</label>
          <input id="c-phone" name="phone" type="tel" className="field" autoComplete="tel" {...aria("phone")} />
          {err("phone")}
        </div>
        <div>
          <label htmlFor="c-interest" className="field-label">Service interest *</label>
          <select id="c-interest" name="serviceInterest" className="field" defaultValue={defaultInterest ?? INTERESTS[0]} {...aria("serviceInterest")}>
            {INTERESTS.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
          {err("serviceInterest")}
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="c-message" className="field-label">Message *</label>
        <textarea id="c-message" name="message" rows={5} className="field" required {...aria("message")} />
        {err("message")}
      </div>
      {/* Honeypot */}
      <div className="hidden" aria-hidden>
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state === "error" && (
        <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {message}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-lg mt-5 w-full sm:w-auto" disabled={state === "sending"}>
        {state === "sending" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
        {state === "sending" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
