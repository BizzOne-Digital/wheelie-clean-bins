import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const FAQSchema = new Schema(
  {
    key: { type: String, unique: true, sparse: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export type FAQDoc = InferSchemaType<typeof FAQSchema>;
export const FAQ: Model<FAQDoc> = models.FAQ || model("FAQ", FAQSchema);
