import { Schema, model, Types } from "mongoose";

const PostSchema = new Schema({
  account: { type: Types.ObjectId, ref: "Account", required: true },
  platformPostId: { type: String, required: true },
  type: String,
  contentText: String,
  mediaUrls: [String],
  postedAt: Date,
  rawResponse: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});
export const Post = model("Post", PostSchema);
