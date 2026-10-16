import "server-only";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import type { AdminIdentity } from "./auth";

export async function audit(
  admin: AdminIdentity | string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  try {
    await AdminAuditLog.create({
      actor: typeof admin === "string" ? admin : admin.email,
      action,
      entityType,
      entityId,
      details,
    });
  } catch (err) {
    console.error("[audit] failed to write audit entry:", (err as Error).message);
  }
}
