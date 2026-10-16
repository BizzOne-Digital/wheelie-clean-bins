/**
 * Creates (or resets the password of) an admin user. No default credentials exist anywhere.
 *
 *   ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='a-long-unique-password' npm run admin:create
 *
 * Remove ADMIN_PASSWORD from your environment after running.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { AdminUser } from "../src/models/AdminUser";
import { AdminAuditLog } from "../src/models/AdminAuditLog";

async function main() {
  const uri = process.env.MONGODB_URI;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!uri) throw new Error("Set MONGODB_URI");
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Set ADMIN_EMAIL to a valid email address");
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  if (/^(password|admin|changeme)/i.test(password)) throw new Error("Choose a stronger ADMIN_PASSWORD");

  await mongoose.connect(uri);
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await AdminUser.findOne({ email });
  const isFirst = (await AdminUser.countDocuments()) === 0;
  await AdminUser.updateOne(
    { email },
    { $set: { passwordHash, active: true }, $setOnInsert: { email, role: isFirst ? "owner" : "admin" } },
    { upsert: true },
  );
  await AdminAuditLog.create({ actor: "cli", action: existing ? "admin.password_reset" : "admin.created", entityType: "AdminUser", entityId: email });
  console.log(existing ? `Password updated for ${email}` : `Admin created: ${email}${isFirst ? " (owner)" : ""}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await mongoose.disconnect();
  process.exit(1);
});
