import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    stripeCustomerId: { type: String, index: true, sparse: true },
    bookingCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export type CustomerDoc = InferSchemaType<typeof CustomerSchema>;
export const Customer: Model<CustomerDoc> = models.Customer || model("Customer", CustomerSchema);
