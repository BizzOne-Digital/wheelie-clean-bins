import { Schema, model, models, type Model } from "mongoose";

// Processed webhook event ids, used for idempotent webhook handling.
const StripeEventSchema = new Schema(
  { eventId: { type: String, unique: true, required: true }, type: String },
  { timestamps: true },
);
export const StripeEvent: Model<{ eventId: string; type: string }> = models.StripeEvent || model("StripeEvent", StripeEventSchema);
