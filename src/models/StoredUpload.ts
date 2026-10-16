import { Schema, model, models, type Model } from "mongoose";
import { UPLOAD_FOLDERS } from "@/lib/constants";

export interface StoredUploadDoc {
  folder: string;
  filename: string;
  mimeType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const StoredUploadSchema = new Schema<StoredUploadDoc>(
  {
    folder: { type: String, required: true, enum: UPLOAD_FOLDERS },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);
StoredUploadSchema.index({ folder: 1, filename: 1 }, { unique: true });
export const StoredUpload: Model<StoredUploadDoc> = models.StoredUpload || model("StoredUpload", StoredUploadSchema);
