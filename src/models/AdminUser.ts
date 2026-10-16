import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const AdminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "", trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["owner", "admin"], default: "admin" },
    active: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true },
);
export type AdminUserDoc = InferSchemaType<typeof AdminUserSchema>;
export const AdminUser: Model<AdminUserDoc> = models.AdminUser || model("AdminUser", AdminUserSchema);
