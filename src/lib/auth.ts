import "server-only";
import { createHmac, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { dbConnect } from "./db";
import { AdminSession } from "@/models/AdminSession";
import { AdminUser } from "@/models/AdminUser";

export const SESSION_COOKIE = "wcb_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  role: string;
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters");
  return s;
}

function hashToken(token: string) {
  return createHmac("sha256", secret()).update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

let dummy: Promise<string> | null = null;
/** A valid bcrypt hash used to equalize timing when an email does not exist. */
export function dummyHash() {
  return (dummy ??= bcrypt.hash(randomBytes(16).toString("hex"), 12));
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  await dbConnect();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const ua = (await headers()).get("user-agent")?.slice(0, 200);
  await AdminSession.create({ tokenHash: hashToken(token), user: userId, expiresAt, userAgent: ua });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await dbConnect();
      await AdminSession.deleteOne({ tokenHash: hashToken(token) });
    } catch {
      /* cookie is cleared regardless */
    }
  }
  jar.delete(SESSION_COOKIE);
}

/** Returns the signed-in admin, or null. Validates the session against the database every time. */
export async function getAdmin(): Promise<AdminIdentity | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  try {
    await dbConnect();
    const session = await AdminSession.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).lean();
    if (!session) return null;
    const user = await AdminUser.findById(session.user).lean();
    if (!user || !user.active) return null;
    return { id: String(user._id), email: user.email, name: user.name || user.email, role: user.role };
  } catch (err) {
    console.error("[auth] session check failed:", (err as Error).message);
    return null;
  }
}

/** For server components and server actions: redirects to login when not authenticated. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
