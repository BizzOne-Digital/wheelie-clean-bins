import { Schema, model, models, type Model } from "mongoose";

// Public business settings only. Secrets always live in environment variables.
export interface SiteSettingsDoc {
  singleton: string;
  data: Record<string, unknown>;
  updatedBy?: string;
}

const SiteSettingsSchema = new Schema<SiteSettingsDoc>(
  {
    singleton: { type: String, default: "site", unique: true },
    data: { type: Schema.Types.Mixed, default: {} },
    updatedBy: String,
  },
  { timestamps: true, minimize: false },
);
export const SiteSettings: Model<SiteSettingsDoc> = models.SiteSettings || model("SiteSettings", SiteSettingsSchema);
