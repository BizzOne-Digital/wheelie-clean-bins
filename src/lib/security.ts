import "server-only";
import { headers } from "next/headers";
import { dbConnect } from "./db";
import { RateLimit } from "@/models/RateLimit";

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim().slice(0, 64);
}

/**
 * Same-origin check for state-changing route handlers (CSRF defence in addition to SameSite cookies).
 * Server actions already get an equivalent check from Next.js.
 */
export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Fixed-window rate limit stored in MongoDB, so it works across serverless instances.
 * Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  await dbConnect();
  const now = new Date();
  const doc = await RateLimit.findOneAndUpdate(
    { key, expiresAt: { $gt: now } },
    { $inc: { count: 1 } },
    { new: true },
  ).lean();
  if (doc) return doc.count <= limit;
  try {
    await RateLimit.findOneAndUpdate(
      { key },
      { $set: { count: 1, expiresAt: new Date(now.getTime() + windowSeconds * 1000) } },
      { upsert: true },
    );
  } catch {
    /* concurrent upsert; allow */
  }
  return true;
}

export async function resetRateLimit(key: string) {
  await dbConnect();
  await RateLimit.deleteOne({ key });
}

export function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return Response.json({ success: false, error: message, ...extra }, { status });
}
