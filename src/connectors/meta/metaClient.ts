import fetch from "node-fetch";

const GRAPH_BASE = "https://graph.facebook.com/v17.0";

export async function exchangeCodeForShortToken(
  appId: string,
  appSecret: string,
  redirectUri: string,
  code: string
) {
  const url = `${GRAPH_BASE}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&client_secret=${appSecret}&code=${code}`;
  const res = await fetch(url);
  return res.json();
}

export async function exchangeShortForLongToken(
  appId: string,
  appSecret: string,
  shortToken: string
) {
  const url = `${GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
  const res = await fetch(url);
  return res.json();
}

export async function getPages(longToken: string) {
  const url = `${GRAPH_BASE}/me/accounts?access_token=${longToken}`;
  const res = await fetch(url);
  return res.json();
}

export function extractInstagramBusinessId(pageObj: any) {
  return (
    pageObj?.instagram_business_account?.id ||
    pageObj?.connected_instagram_account?.id ||
    null
  );
}

// Generic GET helper for Graph calls
export async function graphGet(
  path: string,
  accessToken: string,
  params?: Record<string, string>
) {
  const q = new URLSearchParams({
    access_token: accessToken,
    ...(params || {}),
  }).toString();
  const url = `${GRAPH_BASE}/${path}?${q}`;
  const res = await fetch(url);
  return res.json();
}
