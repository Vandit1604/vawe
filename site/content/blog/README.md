# Blog posts

One Markdown file per post in this folder. `lib/blog.ts` reads them; this file is not a post.

## Schedule a post

Set `date` to the day the post goes live, as `YYYY-MM-DD` in UTC. Merge and deploy it any time before.

- Until that day the post is not listed on `/blog`, in a category, in the RSS feed, in the sitemap or in "Read next", and `/blog/<slug>` returns 404.
- From that day (UTC) it appears everywhere. The index, the posts, the feed and the sitemap regenerate every hour, so it goes live within the hour with no redeploy.
- Do not backdate. The date is the day the post is published. `updated` is the day of a later real edit. It never shows in the page. It feeds `dateModified` and the sitemap `lastmod` only.
- `next dev` and `BLOG_DRAFTS=1` show future-dated posts, so you can preview one.

## Order

Newest `date` first. Posts that share a date sort by the time their file was first committed, later first (`lib/blog-added.json`, written by `scripts/site/blog-added.mjs` in `prebuild`). Commit the new post, run `npm run prebuild` in `site/` and commit the JSON change. The times never show.

## Featured

Add `featured: true` to up to three posts. `featuredOrder: 1` puts a post first. The first featured post is the large card, the next two are medium cards, and any further featured post is a normal card. The band shows while "All" is chosen.
