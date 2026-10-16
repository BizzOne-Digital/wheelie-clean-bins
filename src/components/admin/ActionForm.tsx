"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export type ActionResult = { ok: boolean; message: string; at?: number } | null;
type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * Form wrapper for admin server actions: shows toasts, optional confirmation, and resets when asked.
 * Server actions re-check admin authentication themselves.
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  resetOnSuccess,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      if (resetOnSuccess) ref.current?.reset();
    } else toast.error(state.message);
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  name,
  value,
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  name?: string;
  value?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={`btn btn-${variant} btn-${size} ${className}`}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
