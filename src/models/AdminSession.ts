import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const AdminSessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true, index: true },
    expiresAt: { type: Date, required: true },
    userAgent: String,
  },
  { timestamps: true },
);
AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export type AdminSessionDoc = InferSchemaType<typeof AdminSessionSchema>;
export const AdminSession: Model<AdminSessionDoc> = models.AdminSession || model("AdminSession", AdminSessionSchema);
