import { dbConnect, isDbConfigured } from "@/lib/db";
import { clientIp, isSameOrigin, jsonError, rateLimit } from "@/lib/security";
import { fieldErrors, inquirySchema } from "@/lib/validation";
import { Inquiry } from "@/models/Inquiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("Cross-origin request rejected", 403);
  if (!isDbConfigured()) return jsonError("Our contact form is temporarily unavailable. Please call or email us.", 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request", 400);
  }
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) return jsonError("Please correct the highlighted fields.", 422, { fields: fieldErrors(parsed.error) });
  if (parsed.data.website) return Response.json({ success: true }); // honeypot: silently accept

  await dbConnect();
  const ip = await clientIp();
  if (!(await rateLimit(`inquiry:${ip}`, 5, 60 * 60))) {
    return jsonError("Too many messages sent. Please try again later or call us.", 429);
  }

  const { name, email, phone, serviceInterest, message } = parsed.data;
  await Inquiry.create({ name, email, phone, serviceInterest, message });
  return Response.json({ success: true }, { status: 201 });
}
