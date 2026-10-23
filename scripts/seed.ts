/**
 * Idempotent seed: inserts default business content only where it does not exist yet.
 * Never overwrites admin edits. Safe to run repeatedly.
 *
 *   npm run seed
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import mongoose from "mongoose";
import { DEFAULT_FAQS, DEFAULT_PLANS, DEFAULT_SERVICES, DEFAULT_SETTINGS } from "../src/lib/defaults";
import { SiteSettings } from "../src/models/SiteSettings";
import { PricingPlan } from "../src/models/PricingPlan";
import { Service } from "../src/models/Service";
import { FAQ } from "../src/models/FAQ";
import { resolveSiteImage } from "../src/lib/images";

/** Swap the original seeded Unsplash URLs for the bundled /images files. Custom images are untouched. */
async function migrateStockImages() {
  let changed = 0;
  for (const s of await Service.find().lean()) {
    const next = resolveSiteImage(s.imageUrl ?? "");
    if (next !== s.imageUrl) { await Service.updateOne({ _id: s._id }, { $set: { imageUrl: next } }); changed++; }
  }
  const st = await SiteSettings.findOne({ singleton: "site" }).lean();
  const og = (st?.data as { seo?: { ogImageUrl?: string } } | undefined)?.seo?.ogImageUrl;
  if (st && og && resolveSiteImage(og) !== og) { await SiteSettings.updateOne({ _id: st._id }, { $set: { "data.seo.ogImageUrl": resolveSiteImage(og) } }); changed++; }
  console.log(`  ~ images: ${changed} stock image reference(s) switched to /images`);
}

async function insertIfMissing<T>(label: string, model: mongoose.Model<T>, filter: Record<string, unknown>, doc: Record<string, unknown>) {
  const res = await model.updateOne(filter, { $setOnInsert: doc }, { upsert: true });
  console.log(`${res.upsertedCount ? "  + created" : "  = exists "} ${label}`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGODB_URI in .env.local or the environment");
  await mongoose.connect(uri);
  console.log("Seeding (existing records are left untouched)…");

  await insertIfMissing("site settings", SiteSettings, { singleton: "site" }, { singleton: "site", data: DEFAULT_SETTINGS });

  for (const p of DEFAULT_PLANS) await insertIfMissing(`plan: ${p.key}`, PricingPlan, { key: p.key }, { ...p });
  for (const s of DEFAULT_SERVICES) await insertIfMissing(`service: ${s.key}`, Service, { key: s.key }, { ...s });
  for (const f of DEFAULT_FAQS) await insertIfMissing(`faq: ${f.key}`, FAQ, { key: f.key }, { ...f });

  await migrateStockImages();

  // Ensure indexes (unique keys, TTLs) exist.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes().catch(() => undefined)));
  console.log("Done.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await mongoose.disconnect();
  process.exit(1);
});
