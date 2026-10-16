import { getAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { bookingQuery } from "@/lib/admin-queries";
import { jsonError } from "@/lib/security";
import { audit } from "@/lib/audit";
import { Booking } from "@/models/Booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin) return jsonError("Authentication required", 401);
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  await dbConnect();
  const rows = await Booking.find(bookingQuery(sp)).sort({ createdAt: -1 }).limit(10000).lean();

  const header = [
    "Reference", "Created", "Name", "Email", "Phone", "Street", "Unit", "City", "Province", "Postal code",
    "Plan", "Bins", "Collection day", "Collection time", "Return location", "Term (months)", "Promo",
    "Payment method", "Total (CAD)", "Booking status", "Service status", "Payment status", "Notes",
  ];
  const lines = rows.map((b) =>
    [
      b.reference, b.createdAt?.toISOString(), b.contact?.name, b.contact?.email, b.contact?.phone,
      b.address?.street, b.address?.unit, b.address?.city, b.address?.province, b.address?.postalCode,
      b.planName, b.bins, b.collectionDay, b.collectionTime, b.returnLocation, b.termMonths, b.promoChoice ?? "",
      b.paymentMethod, ((b.quote?.totalCents ?? 0) / 100).toFixed(2), b.status, b.serviceStatus, b.paymentStatus, b.notes,
    ].map(csvCell).join(","),
  );
  await audit(admin, "bookings.export", "Booking", undefined, { count: rows.length });

  return new Response("﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
