import { Schema, model, models, type Model } from "mongoose";

// Temporary chunk storage so images up to 8MB can be sent below serverless request-body limits.
// Abandoned chunks expire automatically after one hour.
export interface UploadChunkDoc {
  uploadId: string;
  index: number;
  data: Buffer;
  createdAt: Date;
}

const UploadChunkSchema = new Schema<UploadChunkDoc>({
  uploadId: { type: String, required: true },
  index: { type: Number, required: true },
  data: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 },
});
UploadChunkSchema.index({ uploadId: 1, index: 1 }, { unique: true });
export const UploadChunk: Model<UploadChunkDoc> = models.UploadChunk || model("UploadChunk", UploadChunkSchema);
