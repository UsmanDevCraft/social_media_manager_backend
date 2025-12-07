import { Schema, model, Types } from "mongoose";

const AccountSchema = new Schema({
  user: { type: Types.ObjectId, ref: "User", required: true },
  platform: { type: String, required: true }, // 'META','YOUTUBE','TIKTOK','X'
  platformAccountId: { type: String, required: true, index: true },
  name: String,
  username: String,
  avatarUrl: String,
  meta: { type: Schema.Types.Mixed },
  accessToken: { type: String, required: true }, // encrypted
  refreshToken: String, // encrypted
  tokenExpiresAt: Date,
  lastSyncedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

export const Account = model("Account", AccountSchema);
