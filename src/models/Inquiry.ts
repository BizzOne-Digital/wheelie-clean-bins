import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const InquirySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    serviceInterest: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["new", "in_progress", "closed"], default: "new", index: true },
  },
  { timestamps: true },
);
InquirySchema.index({ createdAt: -1 });
export type InquiryDoc = InferSchemaType<typeof InquirySchema>;
export const Inquiry: Model<InquiryDoc> = models.Inquiry || model("Inquiry", InquirySchema);
