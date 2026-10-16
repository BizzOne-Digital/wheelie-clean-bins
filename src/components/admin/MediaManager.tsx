"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Copy, Eraser, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { UPLOAD_FOLDERS, type UploadFolder } from "@/lib/constants";
import { cleanupUnusedMediaAction, deleteMediaAction, replaceMediaAction } from "@/app/admin/actions/content";
import { SafeImage } from "@/components/ui/SafeImage";
import { uploadImage, validateImageFile } from "./AdminImageField";

interface Item {
  url: string;
  folder: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
  usage: string[];
}

function kb(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

export function MediaManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [folder, setFolder] = useState<UploadFolder>("gallery");
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const uploadInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);

  async function handleFile(file: File | undefined, target: string | null) {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) return void toast.error(problem);
    setBusy(target ?? "upload");
    try {
      const newUrl = await uploadImage(file, (target ? (target.split("/")[3] as UploadFolder) : folder));
      if (target) {
        const res = await replaceMediaAction(target, newUrl);
        if (res?.ok) toast.success(res.message);
        else toast.error(res?.message ?? "Replace failed");
      } else {
        toast.success("Image uploaded");
      }
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null || pending;

  return (
    <div>
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label htmlFor="m-folder" className="field-label">Folder</label>
          <select id="m-folder" className="field" value={folder} onChange={(e) => setFolder(e.target.value as UploadFolder)}>
            {UPLOAD_FOLDERS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <input
          ref={uploadInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          aria-label="Upload image"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            handleFile(f, null);
          }}
        />
        <button type="button" className="btn btn-primary btn-md" disabled={disabled} onClick={() => uploadInput.current?.click()}>
          {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />} Upload image
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-md"
          disabled={disabled}
          onClick={() =>
            confirm("Remove images older than 7 days that are not used anywhere?") &&
            start(async () => {
              const res = await cleanupUnusedMediaAction();
              if (res?.ok) toast.success(res.message);
              else toast.error(res?.message ?? "Cleanup failed");
              router.refresh();
            })
          }
        >
          <Eraser className="h-4 w-4" aria-hidden /> Clean up unused
        </button>
        <p className="w-full text-xs text-muted">JPEG, PNG, WebP or GIF up to 8MB. Uploaded images can be selected in any image field using “Use image URL”, or by uploading directly from that field.</p>
      </div>

      <input
        ref={replaceInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        aria-label="Replacement image"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          handleFile(f, replaceTarget.current);
        }}
      />

      {items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">No uploaded images yet.</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((i) => (
            <li key={i.url} className="card overflow-hidden">
              <div className="relative aspect-video bg-card-2">
                <SafeImage src={i.url} alt={i.filename} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-contain" />
                {busy === i.url && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink/80"><Loader2 className="h-6 w-6 animate-spin" aria-label="Working" /></div>
                )}
              </div>
              <div className="space-y-2 p-3 text-xs">
                <p className="truncate font-mono text-soft" title={i.filename}>{i.folder}/{i.filename}</p>
                <p className="text-muted">{kb(i.size)} · {i.mimeType.replace("image/", "").toUpperCase()} · {new Date(i.createdAt).toLocaleDateString("en-CA")}</p>
                <div>
                  <p className="font-semibold text-white">Used in:</p>
                  {i.usage.length ? (
                    <ul className="mt-0.5 list-inside list-disc text-muted">{i.usage.map((u) => <li key={u}>{u}</li>)}</ul>
                  ) : (
                    <p className="text-muted">Not used</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigator.clipboard.writeText(i.url).then(() => toast.success("URL copied"))}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden /> Copy URL
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={disabled}
                    onClick={() => {
                      replaceTarget.current = i.url;
                      replaceInput.current?.click();
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Replace
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={disabled || i.usage.length > 0}
                    title={i.usage.length ? "Remove it from the places it is used first" : undefined}
                    onClick={() =>
                      confirm("Delete this image permanently?") &&
                      start(async () => {
                        const res = await deleteMediaAction(i.url);
                        if (res?.ok) toast.success(res.message);
                        else toast.error(res?.message ?? "Delete failed");
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
