"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { dbConnect } from "@/lib/db";
import { dollarsToCents } from "@/lib/money";
import { BOOKING_STATUSES, SERVICE_STATUSES } from "@/lib/constants";
import { recordPrepaidPayment } from "@/lib/payments";
import { Booking } from "@/models/Booking";
import { Payment } from "@/models/Payment";
import { Subscription } from "@/models/Subscription";
import type { ActionResult } from "@/components/admin/ActionForm";

const ok = (message: string): ActionResult => ({ ok: true, message, at: Date.now() });
const fail = (message: string): ActionResult => ({ ok: false, message, at: Date.now() });

export async function updateBookingStatusAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const parsed = z
    .object({ status: z.enum(BOOKING_STATUSES), serviceStatus: z.enum(SERVICE_STATUSES) })
    .safeParse({ status: fd.get("status"), serviceStatus: fd.get("serviceStatus") });
  if (!isValidObjectId(id) || !parsed.success) return fail("Invalid status");
  await dbConnect();
  const before = await Booking.findByIdAndUpdate(id, { $set: parsed.data });
  if (!before) return fail("Booking not found");
  // Local service status only. This never changes provider billing.
  await Subscription.updateOne({ booking: id }, { $set: { serviceStatus: parsed.data.serviceStatus } });
  await audit(admin, "booking.status_update", "Booking", id, {
    from: { status: before.status, serviceStatus: before.serviceStatus },
    to: parsed.data,
  });
  revalidatePath(`/admin/bookings/${id}`);
  return ok("Statuses updated");
}

export async function addBookingNoteAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const body = String(fd.get("body") ?? "").trim().slice(0, 2000);
  if (!isValidObjectId(id) || !body) return fail("Write a note first");
  await dbConnect();
  const res = await Booking.updateOne({ _id: id }, { $push: { internalNotes: { body, author: admin.email, createdAt: new Date() } } });
  if (!res.matchedCount) return fail("Booking not found");
  await audit(admin, "booking.note_added", "Booking", id);
  revalidatePath(`/admin/bookings/${id}`);
  return ok("Note added");
}

export async function confirmEmtPaymentAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const amountCents = dollarsToCents(String(fd.get("amount") ?? ""));
  const reference = String(fd.get("reference") ?? "").trim().slice(0, 120);
  if (!isValidObjectId(id)) return fail("Invalid booking");
  if (amountCents == null || amountCents <= 0) return fail("Enter the amount received");
  if (!reference) return fail("Enter the e-Transfer reference or confirmation number");
  await dbConnect();
  const booking = await Booking.findById(id).lean();
  if (!booking) return fail("Booking not found");
  if (booking.paymentMethod !== "emt") return fail("Only e-Transfer bookings can be confirmed manually");
  await recordPrepaidPayment({ bookingId: id, amountCents, provider: "manual", method: "emt", manualReference: reference, confirmedBy: admin.email });
  await audit(admin, "payment.emt_confirmed", "Booking", id, { amountCents, reference, bookingReference: booking.reference });
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin");
  return ok("E-Transfer payment recorded");
}

export async function deleteBookingAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  if (!isValidObjectId(id)) return fail("Invalid booking");
  await dbConnect();
  const booking = await Booking.findById(id).lean();
  if (!booking) return fail("Booking not found");
  if (booking.paymentStatus === "paid" || booking.stripeSubscriptionId) {
    return fail("Paid or subscribed bookings cannot be deleted. Cancel the booking instead to keep payment records.");
  }
  await Promise.all([Booking.deleteOne({ _id: id }), Payment.deleteMany({ booking: id, status: { $ne: "paid" } }), Subscription.deleteMany({ booking: id })]);
  await audit(admin, "booking.deleted", "Booking", id, { reference: booking.reference, email: booking.contact?.email });
  revalidatePath("/admin/bookings");
  redirect("/admin/bookings");
}
