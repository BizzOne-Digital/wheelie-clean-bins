import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const AdminAuditLogSchema = new Schema(
  {
    actor: { type: String, required: true },
    action: { type: String, required: true, index: true },
    entityType: String,
    entityId: String,
    details: Schema.Types.Mixed,
  },
  { timestamps: true },
);
AdminAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
export type AdminAuditLogDoc = InferSchemaType<typeof AdminAuditLogSchema>;
export const AdminAuditLog: Model<AdminAuditLogDoc> = models.AdminAuditLog || model("AdminAuditLog", AdminAuditLogSchema);
