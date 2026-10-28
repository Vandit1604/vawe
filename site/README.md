# site/

The vawe.dev marketing site: a Next.js app with its own design system, separate from the engine and
from `docs-site/`.

Read by: a human or agent working on the marketing site. Not read by the render engine.

The one doc: `site/DESIGN.md` (the contract, extracted from shipped CSS), entered through
`site/CLAUDE.md`. No repo-level gate covers this folder; `npm run build` inside it is the check.

Look first: `site/CLAUDE.md`, then `site/DESIGN.md`.

Bot log: `site/lib/bots.ts` writes one JSON line per AI or search-engine request to
`$BOT_LOG_DIR/bots-YYYY-MM-DD.jsonl`; nothing is logged when `BOT_LOG_DIR` is unset. The Dockerfile sets
`BOT_LOG_DIR=/data/bots` and declares that path a volume: run with `-v vawe-bots:/data/bots` (Coolify:
persistent storage with destination `/data/bots`). Read it with `bin/vawe-dev bots <dir> [--days n]`.
