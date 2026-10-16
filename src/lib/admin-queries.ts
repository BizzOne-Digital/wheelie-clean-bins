import "server-only";


import { escapeRegex } from "@/components/admin/ui";

export interface BookingFilters {
  q?: string;
  status?: string;
  payment?: string;
  method?: string;
}

export function bookingQuery(f: BookingFilters): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (f.q?.trim()) {
    const rx = new RegExp(escapeRegex(f.q.trim().slice(0, 100)), "i");
    query.$or = [{ reference: rx }, { "contact.name": rx }, { "contact.email": rx }, { "contact.phone": rx }, { "address.street": rx }, { "address.postalCode": rx }, { "address.city": rx }];
  }
  if (f.status) query.status = f.status;
  if (f.payment === "open") query.paymentStatus = { $in: ["pending", "awaiting_emt", "not_configured", "failed"] };
  else if (f.payment) query.paymentStatus = f.payment;
  if (f.method) query.paymentMethod = f.method;
  return query;
}
