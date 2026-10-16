import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PaymentSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    method: { type: String, enum: ["credit", "debit", "emt"], required: true },
    provider: { type: String, enum: ["stripe", "manual"], required: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: "cad" },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded", "cancelled"], default: "pending", index: true },
    // Provider identifiers only. Card numbers and CVCs are never stored.
    stripeCheckoutSessionId: { type: String, index: true, sparse: true },
    stripeInvoiceId: { type: String, unique: true, sparse: true },
    stripePaymentIntentId: String,
    manualReference: String,
    confirmedBy: String,
    paidAt: Date,
  },
  { timestamps: true },
);
export type PaymentDoc = InferSchemaType<typeof PaymentSchema>;
export const Payment: Model<PaymentDoc> = models.Payment || model("Payment", PaymentSchema);
