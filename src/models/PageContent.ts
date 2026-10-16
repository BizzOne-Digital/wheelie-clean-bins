import { Schema, model, models, type Model } from "mongoose";

// Field values are plain strings: text or an image URL. Never binary or base64 data.
export interface PageContentDoc {
  slug: string;
  published: Record<string, string>;
  draft?: Record<string, string> | null;
  publishedAt?: Date;
  updatedBy?: string;
}

const PageContentSchema = new Schema<PageContentDoc>(
  {
    slug: { type: String, required: true, unique: true },
    published: { type: Schema.Types.Mixed, default: {} },
    draft: { type: Schema.Types.Mixed, default: null },
    publishedAt: Date,
    updatedBy: String,
  },
  { timestamps: true, minimize: false },
);
export const PageContent: Model<PageContentDoc> = models.PageContent || model("PageContent", PageContentSchema);
