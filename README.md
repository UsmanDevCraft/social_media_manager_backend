[User clicks "Connect Facebook/Instagram"]
                  |
                  v
         ┌─────────────────┐
         │  OAuth Flow     │
         │  (FB / Meta)    │
         └─────────────────┘
                  |
                  v
      ┌──────────────────────────┐
      │ Short-Lived Access Token │
      └──────────────────────────┘
                  |
                  v
      ┌─────────────────────────┐
      │ Exchange for Long-Lived │
      │ Token (60 days)         │
      └─────────────────────────┘
                  |
                  v
      ┌──────────────────────────┐
      │ Upsert Account in Mongo  │
      │ - platformAccountId      │
      │ - name / username        │
      │ - avatar / meta object   │
      │ - accessToken (encrypted)│
      └──────────────────────────┘
                  |
                  v
  ┌────────────────────────────────────────┐
  │ Fetch Account-Level Data               │
  │ (Followers, Following, Page Likes, IG  │
  │ Business Insights)                     │
  └────────────────────────────────────────┘
                  |
                  v
  ┌───────────────────────────────────────┐
  │ Fetch Posts / Media                   │
  │ - Post ID                             │
  │ - Caption / Message                   │
  │ - Media URLs (images / videos)        │
  │ - PostedAt timestamp                  │
  │ - Type (image/video/carousel/reel)    │
  └───────────────────────────────────────┘
                  |
                  v
  ┌───────────────────────────────────────┐
  │ Fetch Metrics / Insights              │
  │ - Likes                               │
  │ - Comments                            │
  │ - Shares / Engagement                 │
  │ - Views (video / reels)               │
  │ - Followers (account-level snapshot)  │
  │ - Save raw response                   │
  └───────────────────────────────────────┘
                  |
                  v
  ┌───────────────────────────────────────┐
  │ Store in MongoDB                      │
  │ - Accounts                            │
  │ - Posts                               │
  │ - Metrics                             │
  │ (Normalized fields + raw API JSON)    │
  └───────────────────────────────────────┘
                  |
                  v
  ┌───────────────────────────────────────┐
  │ Dashboard / API Response              │
  │ - List of connected accounts          │
  │ - Followers / Following / Likes       │
  │ - Recent posts with metrics           │
  │ - Charts / Growth stats               │
  └───────────────────────────────────────┘
                  |
                  v
          [User views dashboard]
