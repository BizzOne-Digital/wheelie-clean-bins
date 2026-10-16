"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Save, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { FieldDef, PageSlug } from "@/lib/defaults";
import { savePageAction } from "@/app/admin/actions/content";
import { AdminImageField } from "./AdminImageField";

export function PageEditor({
  slug,
  fields,
  published,
  draft,
}: {
  slug: PageSlug;
  fields: FieldDef[];
  published: Record<string, string>;
  draft: Record<string, string> | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(draft ?? published);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const set = (k: string, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setDirty(true);
  };

  function run(mode: "draft" | "publish" | "discard") {
    if (mode === "publish" && !confirm("Publish these changes to the live website?")) return;
    if (mode === "discard" && !confirm("Discard the saved draft and revert to the published version?")) return;
    setBusy(mode);
    start(async () => {
      const res = await savePageAction(slug, values, mode);
      setBusy(null);
      if (res?.ok) {
        toast.success(res.message);
        setDirty(false);
        if (mode === "discard") setValues(published);
        router.refresh();
      } else toast.error(res?.message ?? "Save failed");
    });
  }

  return (
    <div className="space-y-6">
      {draft && (
        <p role="status" className="rounded-lg border border-brand/40 bg-brand/5 px-4 py-3 text-sm text-soft">
          You are editing a saved draft. The live page still shows the published version until you publish.
        </p>
      )}
      <div className="card grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.type === "textarea" || f.type === "image" ? "lg:col-span-2" : ""}>
            {f.type === "image" ? (
              <AdminImageField label={f.label} value={values[f.key] ?? ""} onChange={(v) => set(f.key, v)} folder="pages" />
            ) : (
              <>
                <label htmlFor={`pf-${f.key}`} className="field-label">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea id={`pf-${f.key}`} rows={4} className="field" value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <input id={`pf-${f.key}`} className="field" value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <span className="text-sm text-muted" aria-live="polite">{dirty ? "Unsaved changes" : "No unsaved changes"}</span>
        <div className="flex flex-wrap gap-2">
          {draft && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run("discard")}>
              {busy === "discard" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Undo2 className="h-4 w-4" aria-hidden />} Discard draft
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run("draft")}>
            {busy === "draft" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />} Save draft
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run("publish")}>
            {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} Publish
          </button>
        </div>
      </div>
    </div>
  );
}
