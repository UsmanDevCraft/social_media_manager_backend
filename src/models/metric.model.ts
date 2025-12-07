import { Schema, model, Types } from "mongoose";

const MetricSchema = new Schema({
  post: { type: Types.ObjectId, ref: "Post" },
  account: { type: Types.ObjectId, ref: "Account" }, // optional snapshot
  date: { type: Date, default: Date.now },
  views: Number,
  likes: Number,
  comments: Number,
  shares: Number,
  followers: Number,
  raw: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});
export const Metric = model("Metric", MetricSchema);
