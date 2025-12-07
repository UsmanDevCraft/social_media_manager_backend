import { graphGet } from "./metaClient";

// Fetch recent page feed posts (FB Page)
export async function fetchPagePosts(
  pageId: string,
  accessToken: string,
  since?: string
) {
  const fields =
    "id,message,created_time,attachments{media_type,media_url,subattachments},permalink_url";
  const params: Record<string, string> = { fields, limit: "25" };
  if (since) params.since = since;
  return graphGet(`${pageId}/posts`, accessToken, params);
}

// For Instagram Business accounts: fetch media (media list)
export async function fetchIGMedia(
  igBusinessId: string,
  accessToken: string,
  since?: string
) {
  const fields =
    "id,caption,media_type,media_url,timestamp,permalink,thumbnail_url";
  const params: Record<string, string> = { fields, limit: "25" };
  if (since) params.since = since;
  return graphGet(`${igBusinessId}/media`, accessToken, params);
}

/**
 * Fetch insights/metrics for a given IG media id or FB post id.
 * For IG media, use /{media-id}/insights?metric=impressions,reach,engagement,video_views
 * For FB pages/posts you might request engagement summary via fields or insights depending on availability.
 */
export async function fetchPostInsights(
  postId: string,
  accessToken: string,
  metrics: string[]
) {
  const metricStr = metrics.join(",");
  return graphGet(`${postId}/insights`, accessToken, { metric: metricStr });
}

/**
 * Fetch page-level follower counts or page insights snapshot:
 * Example: /{page_id}?fields=fan_count
 * For Instagram business: /{ig_business_id}?fields=followers_count
 */
export async function fetchAccountSnapshot(
  platformAccountId: string,
  accessToken: string,
  platform: "META" | "INSTAGRAM"
) {
  if (platform === "META") {
    return graphGet(`${platformAccountId}`, accessToken, {
      fields: "name,fan_count",
    });
  } else {
    return graphGet(`${platformAccountId}`, accessToken, {
      fields: "id,username,followers_count",
    });
  }
}
