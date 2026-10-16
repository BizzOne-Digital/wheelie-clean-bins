import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PricingPlanSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    regions: { type: [String], default: [] },
    monthlyPriceCents: { type: Number, required: true, min: 0 },
    includedBins: { type: Number, required: true, min: 1 },
    extraBinCents: { type: Number, required: true, min: 0 },
    accent: { type: String, enum: ["yellow", "cyan"], default: "yellow" },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export type PricingPlanDoc = InferSchemaType<typeof PricingPlanSchema>;
export const PricingPlan: Model<PricingPlanDoc> = models.PricingPlan || model("PricingPlan", PricingPlanSchema);
