import { Account } from "../../models/account.model";
import { Post } from "../../models/post.model";
import { Metric } from "../../models/metric.model";
import { decrypt } from "../../lib/crypto";
import {
  fetchPagePosts,
  fetchIGMedia,
  fetchPostInsights,
  fetchAccountSnapshot,
} from "./fetchers";
import { Types } from "mongoose";

// Lightweight types for Graph responses (only the parts we use)
type GraphList<T> = {
  data?: T[];
  paging?: any;
  error?: any;
};

type IGMediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp?: string;
  [k: string]: any;
};

type FBPostItem = {
  id: string;
  message?: string;
  created_time?: string;
  attachments?: { data?: any[] };
  [k: string]: any;
};

// Simple backfill / sync runner for an Account id.
export async function backfillAccount(accountId: string) {
  const acc = await Account.findById(accountId);
  if (!acc) throw new Error("Account not found: " + accountId);

  const accessToken = decrypt(acc.accessToken);
  const platformAccountId = acc.platformAccountId;

  // 1) If this account has an ig business id in meta, fetch IG media
  const igBusinessId = acc.meta?.instagram_business_account?.id;
  if (igBusinessId) {
    const mediaResp = (await fetchIGMedia(
      igBusinessId,
      accessToken
    )) as GraphList<IGMediaItem>;
    if (mediaResp && Array.isArray(mediaResp.data)) {
      for (const item of mediaResp.data) {
        await upsertMediaAsPost(acc._id.toString(), item);
      }
    } else {
      // optionally log: console.warn("No IG media data", mediaResp);
    }
  }

  // 2) Fetch page posts (FB page posts)
  const pagePosts = (await fetchPagePosts(
    platformAccountId,
    accessToken
  )) as GraphList<FBPostItem>;
  if (pagePosts && Array.isArray(pagePosts.data)) {
    for (const p of pagePosts.data) {
      await upsertFbPostAsPost(acc._id.toString(), p);
    }
  }

  // 3) Fetch account snapshot (followers)
  try {
    const snapshot = await fetchAccountSnapshot(
      platformAccountId,
      accessToken,
      "META"
    );
    const followers =
      (snapshot as any)?.fan_count ??
      (snapshot as any)?.followers_count ??
      null;
    await Metric.create({
      account: acc._id,
      date: new Date(),
      followers,
      raw: snapshot,
    });
  } catch (e) {
    console.warn("account snapshot error", e);
  }

  // mark lastSyncedAt
  acc.lastSyncedAt = new Date();
  await acc.save();
}

/** Helpers to normalize & upsert posts */
async function upsertMediaAsPost(
  accountMongoId: string,
  mediaItem: IGMediaItem
) {
  const platformPostId = mediaItem.id;
  const postedAt = mediaItem.timestamp
    ? new Date(mediaItem.timestamp)
    : new Date();
  const contentText = mediaItem.caption || "";
  const mediaUrls: string[] = [];
  if (mediaItem.media_url) mediaUrls.push(mediaItem.media_url);
  if (mediaItem.thumbnail_url) mediaUrls.push(mediaItem.thumbnail_url);

  const postObj = await Post.findOneAndUpdate(
    { platformPostId },
    {
      account: Types.ObjectId.isValid(accountMongoId)
        ? new Types.ObjectId(accountMongoId)
        : accountMongoId,
      platformPostId,
      type: (mediaItem.media_type || "media").toLowerCase(),
      contentText,
      mediaUrls,
      postedAt,
      rawResponse: mediaItem,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // optionally fetch metrics for this media immediately
  try {
    const token = await decryptTokenForDev(accountMongoId);
    // fetchPostInsights expects platform post id + access token + metrics[]
    const insights = await fetchPostInsights(platformPostId, token, [
      "impressions",
      "reach",
      "engagement",
      "video_views",
    ]);
    await Metric.create({
      post: postObj ? postObj._id : undefined,
      account: Types.ObjectId.isValid(accountMongoId)
        ? new Types.ObjectId(accountMongoId)
        : accountMongoId,
      date: new Date(),
      raw: insights,
    });
  } catch (e: any) {
    // ignore metrics failures for now (rate limits etc)
    console.warn(
      "insights fetch failed for media",
      platformPostId,
      e?.message ?? e
    );
  }
}

async function upsertFbPostAsPost(accountMongoId: string, p: FBPostItem) {
  const platformPostId = p.id;
  const postedAt = p.created_time ? new Date(p.created_time) : new Date();
  const contentText = p.message || "";
  const mediaUrls: string[] = [];

  // attachments may be nested
  const attachments = p.attachments?.data || [];
  if (Array.isArray(attachments)) {
    for (const a of attachments) {
      if (a?.media?.image?.src) mediaUrls.push(a.media.image.src);
      if (a?.media_url) mediaUrls.push(a.media_url);
      // handle subattachments
      if (a?.subattachments?.data && Array.isArray(a.subattachments.data)) {
        for (const sa of a.subattachments.data) {
          if (sa?.media?.image?.src) mediaUrls.push(sa.media.image.src);
          if (sa?.media_url) mediaUrls.push(sa.media_url);
        }
      }
    }
  }

  await Post.findOneAndUpdate(
    { platformPostId },
    {
      account: Types.ObjectId.isValid(accountMongoId)
        ? new Types.ObjectId(accountMongoId)
        : accountMongoId,
      platformPostId,
      type: "fb_post",
      contentText,
      mediaUrls,
      postedAt,
      rawResponse: p,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // do not fetch insights for every FB post by default here (rate limits).
}

/**
 * helper to decrypt token for a given account (simple)
 * returns a string access token
 */
async function decryptTokenForDev(accountMongoId: string): Promise<string> {
  const acc = await Account.findById(accountMongoId);
  if (!acc) throw new Error("Account not found for token decrypt");
  const decrypted = decrypt(acc.accessToken);
  if (typeof decrypted !== "string")
    throw new Error("Decrypted token is not a string");
  return decrypted;
}
