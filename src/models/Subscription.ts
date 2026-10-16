import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SubscriptionSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    planKey: String,
    planName: String,
    bins: Number,
    termMonths: Number,
    kind: { type: String, enum: ["recurring", "prepaid"], required: true },
    // Mirrors the payment provider state. For recurring plans only verified webhooks change it.
    providerStatus: { type: String, default: "incomplete" },
    stripeSubscriptionId: { type: String, unique: true, sparse: true },
    currentPeriodEnd: Date,
    startsAt: Date,
    endsAt: Date,
    // Operational status managed by staff. Changing it never changes provider billing.
    serviceStatus: { type: String, enum: ["not_started", "active", "paused", "ended"], default: "not_started" },
  },
  { timestamps: true },
);
export type SubscriptionDoc = InferSchemaType<typeof SubscriptionSchema>;
export const Subscription: Model<SubscriptionDoc> = models.Subscription || model("Subscription", SubscriptionSchema);
