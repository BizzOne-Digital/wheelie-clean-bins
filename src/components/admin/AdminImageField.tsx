"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MAX_UPLOAD_BYTES, UPLOAD_CHUNK_BYTES, type UploadFolder } from "@/lib/constants";
import { SafeImage } from "@/components/ui/SafeImage";

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function randomHex(bytes = 16) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Uploads an image to /api/upload (MongoDB storage) and returns its public URL.
 * Files larger than the chunk size are sent in sequential chunks so each request stays
 * under serverless body limits; the final response follows the standard upload contract.
 */
export async function uploadImage(file: File, folder: UploadFolder, onProgress?: (pct: number) => void): Promise<string> {
  const total = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_BYTES));
  const uploadId = total > 1 ? randomHex() : null;
  for (let i = 0; i < total; i++) {
    const fd = new FormData();
    fd.append("folder", folder);
    if (uploadId) {
      fd.append("file", file.slice(i * UPLOAD_CHUNK_BYTES, (i + 1) * UPLOAD_CHUNK_BYTES), file.name);
      fd.append("uploadId", uploadId);
      fd.append("chunkIndex", String(i));
      fd.append("totalChunks", String(total));
    } else {
      fd.append("file", file);
    }
    const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "same-origin" });
    const json = await res.json().catch(() => ({ success: false, error: `Upload failed (${res.status})` }));
    if (!res.ok || !json.success) throw new Error(json.error ?? `Upload failed (${res.status})`);
    onProgress?.(Math.round(((i + 1) / total) * 100));
    if (i === total - 1) return json.url as string;
  }
  throw new Error("Upload failed");
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPT.includes(file.type)) return "Choose a JPEG, PNG, WebP or GIF image.";
  if (file.size > MAX_UPLOAD_BYTES) return "Image must be 8MB or smaller.";
  return null;
}

/**
 * Reusable admin image field. Holds only the URL; the owning form saves it.
 * The previous image is never deleted here — the server removes it only after the owning
 * document is saved and nothing else references it.
 */
export function AdminImageField({
  label,
  value,
  onChange,
  folder = "pages",
  name,
  description,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: UploadFolder;
  name?: string;
  description?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [urlMode, setUrlMode] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const url = await uploadImage(file, folder, setProgress);
      onChange(url);
      toast.success("Image uploaded. Save to apply the change.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="field-label" id={`${id}-label`}>{label}</span>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="flex flex-col gap-3 rounded-lg border border-line-strong bg-ink-2 p-3 sm:flex-row sm:items-center" aria-labelledby={`${id}-label`} aria-busy={busy}>
        <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-md border border-line bg-card sm:w-36">
          {value ? (
            <SafeImage src={value} alt={`${label} preview`} fill sizes="144px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">No image</div>
          )}
          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/80 text-xs text-white">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <span className="mt-1">{progress}%</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input ref={input} id={`${id}-file`} type="file" accept={ACCEPT.join(",")} className="sr-only" onChange={onFile} disabled={busy} aria-label={`Upload ${label}`} />
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => input.current?.click()}>
              {value ? <RefreshCw className="h-4 w-4" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
              {busy ? "Uploading…" : value ? "Replace" : "Upload"}
            </button>
            {value && (
              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => onChange("")}>
                <Trash2 className="h-4 w-4" aria-hidden /> Remove
              </button>
            )}
            <button type="button" className="text-xs text-cyan hover:underline disabled:opacity-50" disabled={busy} onClick={() => setUrlMode((m) => !m)}>
              {urlMode ? "Hide URL" : "Use image URL"}
            </button>
          </div>
          {urlMode && (
            <input
              className="field text-xs"
              value={value}
              disabled={busy}
              onChange={(e) => onChange(e.target.value.trim())}
              placeholder="https://images.unsplash.com/… or /api/uploads/…"
              aria-label={`${label} URL`}
            />
          )}
          <p className="truncate text-xs text-muted" title={value}>{value || "JPEG, PNG, WebP or GIF up to 8MB."}</p>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
      </div>
    </div>
  );
}
