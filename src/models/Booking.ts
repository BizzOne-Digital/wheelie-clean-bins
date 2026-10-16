import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { BOOKING_STATUSES, PAYMENT_STATUSES, SERVICE_STATUSES } from "@/lib/constants";

const LineItemSchema = new Schema({ label: String, amountCents: Number }, { _id: false });
const NoteSchema = new Schema({
  body: { type: String, required: true },
  author: String,
  createdAt: { type: Date, default: Date.now },
});

const BookingSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true },
    idempotencyKey: { type: String, unique: true, sparse: true, select: false },
    accessToken: { type: String, required: true, select: false },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    contact: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      phone: { type: String, required: true },
    },
    address: {
      street: { type: String, required: true },
      unit: String,
      city: { type: String, required: true },
      province: { type: String, default: "ON" },
      postalCode: { type: String, required: true },
    },
    planKey: { type: String, required: true },
    planName: String,
    bins: { type: Number, required: true, min: 1 },
    collectionDay: { type: String, required: true },
    collectionTime: { type: String, required: true },
    returnLocation: { type: String, required: true },
    termMonths: { type: Number, enum: [1, 3, 6, 12], required: true },
    promoChoice: { type: String, default: null },
    paymentMethod: { type: String, enum: ["credit", "debit", "emt"], required: true },
    notes: String,
    quote: {
      lineItems: [LineItemSchema],
      subtotalCents: Number,
      discountCents: Number,
      taxCents: Number,
      totalCents: Number,
      recurringMonthlyCents: Number,
      taxLabel: String,
      promoNote: String,
    },
    status: { type: String, enum: BOOKING_STATUSES, default: "new", index: true },
    serviceStatus: { type: String, enum: SERVICE_STATUSES, default: "not_started" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending", index: true },
    stripeCheckoutSessionId: { type: String, index: true, sparse: true },
    stripeSubscriptionId: { type: String, index: true, sparse: true },
    internalNotes: [NoteSchema],
    paidAt: Date,
  },
  { timestamps: true },
);
BookingSchema.index({ createdAt: -1 });
BookingSchema.index({ "contact.email": 1 });
export type BookingDoc = InferSchemaType<typeof BookingSchema>;
export const Booking: Model<BookingDoc> = models.Booking || model("Booking", BookingSchema);
