import { Schema, model, models, type Model } from "mongoose";

const RateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimit: Model<{ key: string; count: number; expiresAt: Date }> =
  models.RateLimit || model("RateLimit", RateLimitSchema);
