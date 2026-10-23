"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteServiceAction, savePlanAction, saveServiceAction } from "@/app/admin/actions/content";
import type { ActionResult } from "./ActionForm";
import { AdminImageField } from "./AdminImageField";

function useSaver() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res?.ok) {
        toast.success(res.message);
        after?.();
        router.refresh();
      } else toast.error(res?.message ?? "Something went wrong");
    });
  return { pending, run };
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-sm text-soft">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-cyan" />
      {label}
    </label>
  );
}

/* ---------------------------------------------------------------- Services */

export interface ServiceRow {
  id?: string;
  title: string;
  summary: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  kind: "primary" | "additional";
  active: boolean;
  sortOrder: number;
}

export function ServiceEditor({ initial, isNew = false }: { initial: ServiceRow; isNew?: boolean }) {
  const [s, setS] = useState(initial);
  const { pending, run } = useSaver();
  const id = initial.id ?? "new";
  const upd = <K extends keyof ServiceRow>(k: K, v: ServiceRow[K]) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">{isNew ? "Add a service" : s.title}</h2>
        <span className="text-xs uppercase tracking-wide text-muted">{s.kind === "primary" ? "Main service" : "Additional (quoted)"}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`s-title-${id}`}>Title</label>
          <input id={`s-title-${id}`} className="field" value={s.title} onChange={(e) => upd("title", e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor={`s-sort-${id}`}>Display order</label>
          <input id={`s-sort-${id}`} type="number" min={0} className="field" value={s.sortOrder} onChange={(e) => upd("sortOrder", Number(e.target.value))} />
        </div>
        <div className="md:col-span-2">
          <label className="field-label" htmlFor={`s-sum-${id}`}>Short summary (cards)</label>
          <input id={`s-sum-${id}`} className="field" value={s.summary} onChange={(e) => upd("summary", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="field-label" htmlFor={`s-desc-${id}`}>Description (services page)</label>
          <textarea id={`s-desc-${id}`} rows={3} className="field" value={s.description} onChange={(e) => upd("description", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <AdminImageField label="Image" value={s.imageUrl} onChange={(v) => upd("imageUrl", v)} folder="gallery" />
        </div>
        <div className="md:col-span-2">
          <label className="field-label" htmlFor={`s-alt-${id}`}>Image description (alt text)</label>
          <input id={`s-alt-${id}`} className="field" value={s.imageAlt} onChange={(e) => upd("imageAlt", e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Toggle id={`s-active-${id}`} label="Visible on website" checked={s.active} onChange={(v) => upd("active", v)} />
        <div className="flex gap-2">
          {!isNew && s.kind !== "primary" && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={pending}
              onClick={() => confirm(`Delete "${s.title}"?`) && run(() => deleteServiceAction(initial.id!))}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Delete
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => saveServiceAction(s), isNew ? () => setS(initial) : undefined)}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : isNew ? <Plus className="h-4 w-4" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            {isNew ? "Add service" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Plans */

export interface PlanRow {
  id?: string;
  name: string;
  regions: string[];
  monthlyPrice: string;
  includedBins: number;
  extraBinPrice: string;
  accent: "yellow" | "cyan";
  active: boolean;
  sortOrder: number;
}

export function PlanEditor({ initial, isNew = false }: { initial: PlanRow; isNew?: boolean }) {
  const [p, setP] = useState(initial);
  const [regions, setRegions] = useState(initial.regions.join(", "));
  const { pending, run } = useSaver();
  const id = initial.id ?? "new";
  const upd = <K extends keyof PlanRow>(k: K, v: PlanRow[K]) => setP((s) => ({ ...s, [k]: v }));

  return (
    <div className={`card space-y-4 border-2 p-5 ${p.accent === "yellow" ? "border-brand/60" : "border-cyan/60"}`}>
      <h3 className="font-display text-lg font-bold">{isNew ? "Add a regional plan" : p.name}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor={`p-name-${id}`}>Plan name (shown on cards)</label>
          <input id={`p-name-${id}`} className="field" value={p.name} onChange={(e) => upd("name", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor={`p-reg-${id}`}>Regions (comma separated)</label>
          <input id={`p-reg-${id}`} className="field" value={regions} onChange={(e) => setRegions(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor={`p-price-${id}`}>Monthly price (CAD)</label>
          <input id={`p-price-${id}`} inputMode="decimal" className="field" value={p.monthlyPrice} onChange={(e) => upd("monthlyPrice", e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor={`p-bins-${id}`}>Included bins</label>
          <input id={`p-bins-${id}`} type="number" min={1} className="field" value={p.includedBins} onChange={(e) => upd("includedBins", Number(e.target.value))} />
        </div>
        <div>
          <label className="field-label" htmlFor={`p-extra-${id}`}>Each additional bin, per monthly visit (CAD)</label>
          <input id={`p-extra-${id}`} inputMode="decimal" className="field" value={p.extraBinPrice} onChange={(e) => upd("extraBinPrice", e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor={`p-accent-${id}`}>Card accent</label>
          <select id={`p-accent-${id}`} className="field" value={p.accent} onChange={(e) => upd("accent", e.target.value as "yellow" | "cyan")}>
            <option value="yellow">Yellow</option>
            <option value="cyan">Cyan</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor={`p-sort-${id}`}>Display order</label>
          <input id={`p-sort-${id}`} type="number" min={0} className="field" value={p.sortOrder} onChange={(e) => upd("sortOrder", Number(e.target.value))} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Toggle id={`p-active-${id}`} label="Available for booking" checked={p.active} onChange={(v) => upd("active", v)} />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={pending}
          onClick={() =>
            run(
              () => savePlanAction({ ...p, regions: regions.split(",").map((r) => r.trim()).filter(Boolean) }),
              isNew ? () => { setP(initial); setRegions(""); } : undefined,
            )
          }
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />} {isNew ? "Add plan" : "Save plan"}
        </button>
      </div>
      <p className="text-xs text-muted">Price changes apply to new bookings and checkouts. Existing Stripe subscriptions keep their current price.</p>
    </div>
  );
}
