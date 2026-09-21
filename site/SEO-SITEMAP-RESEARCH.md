# Sitemap research: what page types vawe is missing

Research only. No pages were built. Skills used: `seo` (sitemap analysis method) and the
`ai-seo` finding on ChatGPT 5.6 format volatility, quoted below. `seo-cluster` (SERP-overlap
keyword clustering) was not used: this is a page-type architecture question, not a keyword
plan, and it needs no SERP data to answer.

Date: 2026-09-22. All sitemaps fetched live by `curl` against the public `/sitemap.xml`
(and their sub-sitemaps) with no auth and no crawling beyond the sitemap files themselves.

## What I could fetch

9 of 9 target sitemaps resolved. `remotion.dev` and `hyperframes.dev` needed the `www` /
redirect target; `creatomate.com`, `shotstack.io`, and `json2video.com` publish sitemap
indexes that point at one or more child sitemaps, all fetched. `plainly.video` refused a
direct connection; the working domain is `plainlyvideos.com`. `hyperframes.dev/sitemap.xml`
returns 404: the product has no sitemap file at all right now, so it is reported with 0
URLs, not skipped.

## Competitor sitemaps, clustered by job

Clusters are by what the page does for a visitor, not by URL shape. "Other" below is
folded into the clearest job-based cluster once sampled; the table only shows clusters
that hold real weight (over ~1% of the sitemap).

| Site | Total URLs | Top clusters (job : count) |
|---|---|---|
| Remotion | 1,235 | API/docs reference 1,162 &middot; blog 29 &middot; templates/examples 26 &middot; community prompt gallery ~30 &middot; freelancer directory 22 &middot; core routes 14 |
| Motion Canvas | 279 | API/docs reference 253 &middot; blog 21 &middot; core routes 3 &middot; integrations 2 |
| Creatomate | 426 | blog 221 &middot; tutorials/guides 112 &middot; docs 74 &middot; comparison/alternative 2 |
| Shotstack | 736 | template library 466 &middot; tutorials/guides 170 &middot; use-case/industry 63 &middot; comparison/alternative 4 |
| JSON2Video | 242 | docs 180 &middot; tutorials/guides 28 &middot; core routes 7 |
| Plainly | 369 | after-effects expression reference 130 &middot; blog 136 &middot; success stories (case studies) 11 &middot; use-case/industry 23 &middot; template rigs 10 &middot; comparison/alternative 8 |
| Bannerbear | 1,334 | blog 505 &middot; template library 336 &middot; free-tool doorway pages ~90 &middot; use-case/industry 98 &middot; help/support docs ~60 &middot; changelog 38 &middot; product line pages ~15 |
| HyperFrames | 0 | no `/sitemap.xml` published |

Remotion's "API/docs reference" figure folds in `/api/2d/*`, which is auto-generated
per-symbol documentation (components, props, hooks), the same shape as vawe's own
`arsenal/effects/*`. Bannerbear's `/tools/*` and `/generators/*` are single-purpose "free
online X tool" landing pages (background remover, invoice generator, video trimmer) aimed
at generic search traffic unrelated to Bannerbear's own product; I count these as doorway
pages, not documentation or product pages.

## vawe today

vawe.dev's sitemap holds 1,002 URLs, matching the brief:

| Cluster | Count |
|---|---|
| `arsenal/effects/*` (registry-generated) | 770 |
| `arsenal/blocks/*` and other arsenal detail pages | ~166 |
| `arsenal/category/*` hubs | 12 |
| `docs/*` | 9 |
| Marketing/product routes (`/`, `/features`, `/editor`, `/playground`, `/showcase`, `/ai-agents`, `/determinism`, `/when-determinism-matters`, `/json-to-video`, `/launch-video`, `/product-tour-video`) | 11 |
| Comparison/alternative (`/remotion-alternatives`, `/hyperframes-alternatives`) | 2 |

Comparison pages against the two named closest competitors already exist. Two use-case
pages already exist (`/launch-video`, `/product-tour-video`), matching two of the engine's
own first-class video types.

## The finding that constrains everything below

From `ai-seo`: measured, ChatGPT 5.6 (Aug 2026) demoted the exploited citation formats:
listicle citations down 50.5%, comparison-page citations down 32.1%, while `site:` and
"official" retrieval surged toward primary sources and owned pages. Comparison pages still
work on Google AI Overviews, Gemini, and Perplexity: this is a platform split, not a
reversal. The evergreen winners across every platform are owned official pages: product,
docs, pricing, with extractable structure.

vawe already has its two highest-value comparison pages. Adding more comparison pages
against the API-first competitors (Creatomate, Shotstack, JSON2Video, Plainly, Bannerbear)
would be chasing a format that is losing ground on the platform most likely to send a
developer audience to a page like this, against competitors that are not really
substitutable for vawe anyway (see "Do not build," below). That is the argument this brief
asked for, and it argues against building more of them.

## Page types vawe lacks, ranked

**1. Pricing page.** Every competitor with a hosted product has one; vawe does not, because
vawe has no price. The honest page is one paragraph: Apache 2.0, free, self-hosted, no
paid tier. This is exactly the "owned official page" category the ai-seo finding names as
the evergreen cross-platform winner, and it answers a query intent that exists regardless
of the answer: someone typing "vawe pricing" or "vawe cost" before they adopt a tool wants
a direct answer, not silence. Near-zero build cost, zero honesty risk, one authoritative
page a search engine or an AI assistant can cite outright.

**2. Changelog / release notes page.** vawe is an active open-source repo with real commit
history (the MISTAKES index and git-history prose already exist as doctrine). A changelog
is a genuine primary-source page: exactly the kind of `site:`/"official" retrieval the
ai-seo finding says surged in ChatGPT 5.6, and it doubles as the natural home for the
GitHub-release announcement already planned (per the open-source-plan memory). Cheap to
generate from git history, honest by construction, no fabricated claims possible.

**3. Round out the video-type pages to vawe's own finite taxonomy.** vawe already ships
`/launch-video` and `/product-tour-video`. The engine's own doctrine (`engine-doctrine/CRAFT/ROUTING.md`,
the `vawe-type-*` skills) names a bounded set of six real, differently-authored video
types: launch, demo, explainer, sting/motion-graphic, talking-head, recreation. Four more
pages (`demo-video`, `explainer-video`, `sting-video`, `talking-head-video`) would each
describe a genuinely distinct capability the engine already has doctrine for, not a
keyword permutation of the same page. Each serves a real, distinct query intent ("how do
I make a product demo video with AI", "AI explainer video generator") and each can show a
real rendered example, not a claim. This is bounded at six pages total, not a programme:
stop there.

**4. Individual example pages under `/showcase`.** Right now `/showcase` is a single route.
Remotion's `/prompts/*` cluster (~30 pages, one real rendered example each with its real
prompt) is the closest earning pattern among the competitors that vawe can honestly copy:
each page is a real film vawe actually rendered, with its real JSON/brief next to the real
output. This is the "show, don't tell" rule the engine doctrine already enforces for films,
applied to the marketing site. Scale this to the number of real example films that exist,
never to a keyword list: a detail page with no real render behind it doesn't get built.

## Competitor page types that are dead weight, or not worth imitating

- **Bannerbear's `/tools/*` and `/generators/*`** (~90 URLs): single-purpose "free online
  background remover", "free online invoice generator" pages with no connection to
  Bannerbear's actual product. This is the scaled-content pattern the brief's hard
  constraint names directly. Do not imitate this cluster at any size.
- **Case studies / success stories** (Plainly: 11, Bannerbear: customer pages, Shotstack: 2):
  vawe has no customers and 4 GitHub stars. A case-study page here is not a smaller version
  of the same idea, it is a fabricated claim. Do not build.
- **Comparison pages against the API-first competitors** (Creatomate, Shotstack,
  JSON2Video, Plainly, Bannerbear vs. vawe): these are hosted, priced, template-driven APIs
  built for marketers and no-code integrators. vawe is a free, self-hosted, agent-authored
  engine with no pricing tier to compare. The audiences barely overlap and the comparison
  format is losing ground on the platform (ChatGPT) most likely to carry a developer-tool
  query. Skip.
- **Large template libraries** (Shotstack 466, Bannerbear 336, Creatomate's blog-adjacent
  template posts): vawe's `arsenal/effects/*` and `arsenal/blocks/*` (roughly 936 pages,
  registry-generated from real engine capability) already cover this ground more honestly
  than a marketing template gallery does. Building a second, separate "templates" section
  would duplicate work the arsenal already does better.
- **Plainly's After Effects expressions library** (130 pages): real, useful reference
  content, but it targets After Effects users, a different tool's audience, not vawe's own
  product surface. Traffic it earns doesn't convert to vawe usage. Not worth imitating.
- **Remotion's `/experts/*` freelancer directory** (22 pages): only works because Remotion
  has a large paid community of freelancers to list. vawe has neither the userbase nor an
  honest way to populate this yet. Revisit only if that changes.
- **Use-case/industry pages** in the Shotstack/Bannerbear/Plainly style ("video for real
  estate", "video for e-commerce"): without real customers in those industries, these read
  as generic and unsubstantiated. The type-based pages in recommendation 3 are the honest
  substitute: they describe what the engine does, not who supposedly already uses it.
- **Glossary pages**: none of the competitors run a large pure glossary except Plainly's
  AE-expressions library (already covered above), and vawe's arsenal detail pages already
  serve the definitional/reference job a glossary would do. Skip.

## What I recommend not building, and why

Everything in the "dead weight" list above, plus:

- **A Motion Canvas comparison page.** Motion Canvas is free and open source like vawe, but
  it targets developers who hand-code animation timelines, a narrower and different
  audience than vawe's agent-authored approach. Low expected traffic for the build cost,
  and it would be a third comparison page added right as that format loses ground on
  ChatGPT. Not worth it now.
- **Any page-per-keyword or page-per-city/industry programme.** Not proposed above and
  explicitly excluded: it would trip Google's scaled-content-abuse and doorway-page
  definitions named in the brief.
- **A pricing comparison table against the API-first competitors' plans.** vawe has no
  plans to compare. A table with one row reads as thin, not as content.
