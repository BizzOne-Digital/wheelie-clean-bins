import { getPlans, getSettings } from "@/lib/content";
import { computeQuote, QuoteError } from "@/lib/pricing";
import { jsonError } from "@/lib/security";
import { quoteRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Server-calculated order summary for the booking flow. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request", 400);
  }
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError("Incomplete plan details", 400);

  const [plans, settings] = await Promise.all([getPlans(), getSettings()]);
  const plan = plans.find((p) => p.key === parsed.data.planKey);
  if (!plan) return jsonError("Unknown service region", 400);
  try {
    const quote = computeQuote({ ...parsed.data, plan }, settings);
    return Response.json({ success: true, quote });
  } catch (err) {
    if (err instanceof QuoteError) return jsonError(err.message, 400);
    throw err;
  }
}
