---
when: you want to know how easy vawe is to find for a developer or a coding agent, or you changed a skill description, context7.json, the README first lines or llms.txt
answers: how to run the discovery harness, what it measures and how to read the report
group: process
---

# scripts/discovery

Runs generic queries (no product name) through five public search channels and records where vawe ranks and who wins. No account, no paid API, one plain desktop User-Agent, a pause between requests.

| channel | what it calls | what ranks |
|---|---|---|
| `github` | GitHub REST repository search, unquoted terms | name, description, topics, README, stars |
| `context7` | `context7.com/api/v1/search` | library title and description; the `context7.json` of the repo feeds both |
| `skills` | `skills.sh/api/search`, the call `npx skills find` makes | skill name and description; the CLI then sorts the 20 hits by installs, and so do we (`rank`; `serverRank` is the server order) |
| `bing` | Bing HTML results | indexed pages, titles, inbound links |
| `hn` | Hacker News Algolia search | story titles |

A `model` channel (a fresh `claude -p` with no tools) exists but is off unless named with `--channels model`, because it needs the `claude` CLI and an account. DuckDuckGo is not a channel: it showed a captcha after the first queries.

## Run it weekly

```bash
node scripts/discovery/run.mjs                      # all queries, all default channels (about 25 minutes, GitHub is paced at 7 s per query)
node scripts/discovery/run.mjs --channels github,context7,skills --limit 10    # a quick check
node scripts/discovery/run.mjs --prev scripts/discovery/runs/baseline-2026-10-15.json   # report the change against an earlier run
```

It writes `scripts/discovery/runs/<date>.json` (every result, with `ours: true` on a vawe hit) and `runs/<date>.md` (vawe's rank per query per channel, then the most frequent winners per channel). A channel that blocks three queries in a row is skipped and its queries show an error. Git ignores every run except `baseline-*`: rename the pair to `baseline-<date>` to commit it as a baseline you want to compare against.

## Read the report

- `queries with vawe` is the number to move. The first run on the full set is `runs/baseline-2026-10-15.md`.
- A `-` means vawe is absent from the top 20 (top 10 for Bing).
- The GitHub channel sends unquoted terms like the web UI. `gh search repos` wraps the query in quotes and matches the exact phrase, so it returns nothing for most multi-word queries: do not use it to compare.
- `queries.json` is the query list. Keep every query generic. Add a query that a developer or an agent would type, never one that contains `vawe`.

## Demand index

`demand.mjs` scores how much people and agents ask for a phrase. It reads `queries.json` and `keywords.json` (the blog plan's keyword clusters) and calls free public endpoints: Google and YouTube autocomplete, GitHub repository search, Stack Overflow, Hacker News Algolia, skills.sh, Context7, and npm downloads as context. Google Trends is probed once; it answers 429, so it feeds no score.

```bash
node scripts/discovery/demand.mjs                  # all phrases, about 25 minutes, run it in the background
node scripts/discovery/demand.mjs --limit 5 --sources google,hn   # a quick check
node scripts/discovery/demand.mjs --sources skills               # re-run one source and merge it into today's file
node --test tests/dev/demand-index.test.mjs        # the index math
```

It writes `runs/demand-<date>.json` (raw counts, suggestions and expansions) and `runs/demand-<date>.md` (a table sorted by index, then one table per cluster). The index is 0.6 x people demand (autocomplete, YouTube, Stack Overflow, HN) + 0.4 x agent demand (skills installs, GitHub, Context7). The weights and scales are in `demand-index.mjs` and printed in the report. A source that blocks three phrases in a row is skipped and its weight is shared by the others. Stack Overflow allows 300 anonymous calls a day, so the run stops at 290 and the last phrases have no SO score.
