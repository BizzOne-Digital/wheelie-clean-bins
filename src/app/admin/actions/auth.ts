"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, dummyHash, verifyPassword } from "@/lib/auth";
import { dbConnect, isDbConfigured } from "@/lib/db";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/security";
import { audit } from "@/lib/audit";
import { AdminUser } from "@/models/AdminUser";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });
const GENERIC = "Invalid email or password.";

export async function loginAction(_prev: { error: string }, formData: FormData): Promise<{ error: string }> {
  if (!isDbConfigured() || !process.env.SESSION_SECRET) return { error: "Admin login is not configured on this server." };
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: GENERIC };
  const { email, password } = parsed.data;

  await dbConnect();
  const ip = await clientIp();
  const ipOk = await rateLimit(`login:ip:${ip}`, 20, 15 * 60);
  const userOk = await rateLimit(`login:user:${email}`, 5, 15 * 60);
  if (!ipOk || !userOk) return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };

  const user = await AdminUser.findOne({ email, active: true }).select("+passwordHash");
  // Compare against a dummy hash when the user does not exist to keep timing consistent.
  const hash = user?.passwordHash ?? (await dummyHash());
  const valid = await verifyPassword(password, hash);
  if (!user || !valid) {
    await audit(email, "auth.login_failed", "AdminUser", undefined, { ip });
    return { error: GENERIC };
  }

  await resetRateLimit(`login:user:${email}`);
  user.lastLoginAt = new Date();
  await user.save();
  await createSession(String(user._id));
  await audit(email, "auth.login", "AdminUser", String(user._id), { ip });
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}
