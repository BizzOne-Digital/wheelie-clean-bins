import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ServiceSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    imageAlt: { type: String, default: "" },
    kind: { type: String, enum: ["primary", "additional"], default: "additional" },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export type ServiceDoc = InferSchemaType<typeof ServiceSchema>;
export const Service: Model<ServiceDoc> = models.Service || model("Service", ServiceSchema);
