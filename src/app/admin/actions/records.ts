"use server";

import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { dbConnect } from "@/lib/db";
import { INQUIRY_STATUSES, SERVICE_STATUSES } from "@/lib/constants";
import { Inquiry } from "@/models/Inquiry";
import { Subscription } from "@/models/Subscription";
import { Booking } from "@/models/Booking";
import type { ActionResult } from "@/components/admin/ActionForm";

const ok = (message: string): ActionResult => ({ ok: true, message, at: Date.now() });
const fail = (message: string): ActionResult => ({ ok: false, message, at: Date.now() });

export async function updateSubscriptionServiceStatusAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const serviceStatus = String(fd.get("serviceStatus"));
  if (!isValidObjectId(id) || !(SERVICE_STATUSES as readonly string[]).includes(serviceStatus)) return fail("Invalid status");
  await dbConnect();
  // Local operational status only. Provider billing is never changed from here.
  const sub = await Subscription.findByIdAndUpdate(id, { $set: { serviceStatus } });
  if (!sub) return fail("Subscription not found");
  await Booking.updateOne({ _id: sub.booking }, { $set: { serviceStatus } });
  await audit(admin, "subscription.service_status", "Subscription", id, { from: sub.serviceStatus, to: serviceStatus });
  revalidatePath("/admin/subscriptions");
  return ok("Service status updated (billing unchanged)");
}

export async function updateInquiryStatusAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  if (!isValidObjectId(id) || !(INQUIRY_STATUSES as readonly string[]).includes(status)) return fail("Invalid status");
  await dbConnect();
  const res = await Inquiry.updateOne({ _id: id }, { $set: { status } });
  if (!res.matchedCount) return fail("Inquiry not found");
  await audit(admin, "inquiry.status", "Inquiry", id, { status });
  revalidatePath("/admin/inquiries");
  return ok("Inquiry updated");
}

export async function deleteInquiryAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  if (!isValidObjectId(id)) return fail("Invalid inquiry");
  await dbConnect();
  const res = await Inquiry.deleteOne({ _id: id });
  if (!res.deletedCount) return fail("Inquiry not found");
  await audit(admin, "inquiry.deleted", "Inquiry", id);
  revalidatePath("/admin/inquiries");
  return ok("Inquiry deleted");
}
