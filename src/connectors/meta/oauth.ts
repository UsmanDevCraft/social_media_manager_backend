import express, { Request, Response } from "express";
import {
  exchangeCodeForShortToken,
  exchangeShortForLongToken,
  getPages,
  extractInstagramBusinessId,
} from "./metaClient";
import { Account } from "../../models/account.model";
import { encrypt } from "../../lib/crypto";
import { backfillAccount } from "./backfill";

const router = express.Router();

// Lightweight response types for Graph responses we use
type ShortTokenResp = { access_token?: string; error?: any };
type LongTokenResp = {
  access_token?: string;
  expires_in?: number;
  error?: any;
};
type PageItem = {
  id: string;
  name?: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id?: string };
  [k: string]: any;
};
type PagesResp = { data?: PageItem[]; error?: any };

/**
 * Quick helper to get a user id in dev.
 * Replace with real auth middleware in prod.
 */
function getUserIdFromReq(req: Request): string | undefined {
  // if req.user exists (auth middleware later) use that; otherwise use query.userId (dev)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyReq = req as any;
  return (
    anyReq?.user?.id ||
    (typeof req.query.userId === "string" ? req.query.userId : undefined)
  );
}

router.get("/auth", (req: Request, res: Response) => {
  const userId = getUserIdFromReq(req);
  if (!userId)
    return res
      .status(400)
      .send("Missing userId (dev) or auth middleware must be used");

  const redirectUri = encodeURIComponent(process.env.META_REDIRECT_URI || "");
  const state = JSON.stringify({ userId, ts: Date.now() }); // simple state; in prod store server-side and validate
  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_read_user_content",
    "instagram_basic",
    "instagram_manage_insights",
    "instagram_manage_comments",
  ].join(",");

  const url = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${
    process.env.META_APP_ID
  }&redirect_uri=${redirectUri}&state=${encodeURIComponent(
    state
  )}&scope=${scopes}`;
  res.redirect(url);
});

router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code) return res.status(400).send("Missing code");

    // parse state (dev)
    let parsed: { userId?: string } = {};
    if (typeof state === "string") {
      try {
        parsed = JSON.parse(decodeURIComponent(state));
      } catch (e) {
        // ignore parse error; fallback to query param if provided
      }
    }

    const userId =
      parsed?.userId ||
      (typeof req.query.userId === "string" ? req.query.userId : undefined);
    if (!userId) {
      // dev fallback: allow passing userId in query if state not present
      return res
        .status(400)
        .send("Missing userId in state (or pass ?userId=...)");
    }

    // exchange code -> short token
    const shortTokenResp = (await exchangeCodeForShortToken(
      process.env.META_APP_ID || "",
      process.env.META_APP_SECRET || "",
      process.env.META_REDIRECT_URI || "",
      code
    )) as ShortTokenResp;

    if (shortTokenResp.error || !shortTokenResp.access_token) {
      console.error("short token error:", shortTokenResp);
      return res.status(500).json(shortTokenResp);
    }

    // exchange short -> long token
    const longTokenResp = (await exchangeShortForLongToken(
      process.env.META_APP_ID || "",
      process.env.META_APP_SECRET || "",
      shortTokenResp.access_token
    )) as LongTokenResp;

    if (longTokenResp.error || !longTokenResp.access_token) {
      console.error("long token error:", longTokenResp);
      return res.status(500).json(longTokenResp);
    }

    const longAccessToken = longTokenResp.access_token;

    // fetch pages list
    const pages = (await getPages(longAccessToken)) as PagesResp;
    if (pages.error) {
      console.error("getPages error:", pages);
      return res.status(500).json(pages);
    }

    // Upsert each page into Account collection
    for (const p of pages.data || []) {
      const igBusinessId = extractInstagramBusinessId(p);
      const encryptedToken = encrypt(longAccessToken);

      const update = {
        user: userId,
        platform: "META",
        platformAccountId: p.id,
        name: p.name || "",
        username: p.name || "",
        avatarUrl: p.picture?.data?.url || null,
        meta: p,
        accessToken: encryptedToken,
        tokenExpiresAt: new Date(
          Date.now() +
            (longTokenResp.expires_in
              ? longTokenResp.expires_in * 1000
              : 60 * 24 * 3600 * 1000)
        ),
      };

      // findOneAndUpdate may return null (but with upsert+new it should return doc); guard anyway
      const acc = (await Account.findOneAndUpdate(
        { platformAccountId: p.id },
        update,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )) as any | null;

      let accountDoc = acc;
      if (!accountDoc) {
        // fallback: try to find the account after upsert
        accountDoc = await Account.findOne({ platformAccountId: p.id }).exec();
      }
      if (!accountDoc) {
        console.warn("Could not create/find account for page id:", p.id);
        continue;
      }

      // if page has IG business account, attach it inside meta (we keep same Account doc for simplicity)
      if (igBusinessId) {
        accountDoc.meta = {
          ...(accountDoc.meta || {}),
          instagram_business_account: { id: igBusinessId },
        };
        await accountDoc.save();
      }

      // Run a backfill synchronously (dev) — later convert to worker job
      backfillAccount(accountDoc._id.toString()).catch((err: any) =>
        console.error("backfill account err:", err)
      );
    }

    // redirect to frontend success page (or return json)
    return res.redirect("/connected?ok=1");
  } catch (err) {
    console.error("callback error", err);
    return res.status(500).send("Callback error");
  }
});

export default router;
