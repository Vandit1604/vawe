---
when: "\"let's make a video\", before opening any JSON: which deliverable is this?"
answers: "the priority-ordered deliverable table, how to read one route file instead of all of them, and where the per-deliverable intake questions live"
group: crosscutting
---

# ROUTING: which deliverable is this, before you plan or write JSON

## AGENT SUMMARY

- A request maps to exactly one deliverable in `docs/CRAFT/routes/`. Match the priority table below,
  top row that fits wins; match the DELIVERABLE the request wants, not a word it happens to use.
- Read ONLY the matched route file. Each is ~50 lines: Input / Output / Trigger / Intake / which
  blueprints and CRAFT docs to load next. Do not read every route file to decide; the table below is
  enough to pick one, and the intake questions live in the file, not here.
- `node scripts/author/route.mjs "<what the user asked, plain english>"` runs this same table by
  keyword match and prints the matched deliverable plus its intake questions. Use it before
  `vawe-video-planning`'s interview, or when unsure which route file to open.
- This table decides the DELIVERABLE. It does not replace the planning contract: `vawe-video-planning`
  (or `AUTHORING-WALKTHROUGH.md` by hand) still runs the brief -> lock sheet -> JSON chain for whichever
  deliverable this table names, and nothing renders before that lock sheet is approved.

## Why a table, not one long doctrine file

`AGENTS.md` already carries every deliverable's doctrine, spread across its launch-video rules, the
recreation section, and the demo/specimen section. That is complete but not routable: an agent reads
the whole file to find the three sentences that apply to today's request. This table is the index
another engine already proved out for the same problem: route once from a small table, read one small
file, leave. Nothing here duplicates `AGENTS.md`; every route file points back at the CRAFT doc that
already owns the doctrine.

## The route table (priority order: first matching row wins)

| Priority | Request | Route file | Type skill | Scaffold |
|---|---|---|---|---|
| 1 | Recreate a specific reference film or website's exact look, with no product of ours to sell | [`routes/recreation.md`](routes/recreation.md) | `vawe-type-recreation` | `make scaffold TYPE=recreation` |
| 2 | Market or showcase a real product, company, or site from a URL or site-specific brief | [`routes/launch-video.md`](routes/launch-video.md) | `vawe-type-launch` | `make scaffold TYPE=launch` |
| 3 | Explain a topic, article, or data with invented visuals and no product/site capture | [`routes/explainer.md`](routes/explainer.md) | `vawe-type-explainer` | `make scaffold TYPE=explainer` |
| 4 | A short, explicitly unnarrated, motion-first unit, typically under 10s (sting, stat hit, moving title) | [`routes/motion-graphic.md`](routes/motion-graphic.md) | `vawe-type-sting` | `make scaffold TYPE=sting` |
| 5 | Prove one mechanism, effect, or blueprint works; not a shippable film | [`routes/demo.md`](routes/demo.md) | `vawe-type-demo` | `make scaffold TYPE=demo` |

Before finalizing the route, read the matched file's Trigger line. If the request does not satisfy it,
keep going down the table instead of forcing the match. Each row's type skill is a PLAYBOOK (the spine,
the blueprints to reach for, the rules that matter most, a worked example): load it after the route file,
before writing JSON. A sixth type, `vawe-type-talking-head`, is not in this priority table (a narrated
presenter video is not one of the five deliverables above); reach it directly on request wording
("narrated", "voiceover", "presenter", "talking head").

## Resolve common ambiguities

- A request that names a site but wants to sell nothing (no product, no CTA) is `recreation`, not
  `launch-video`: the reference IS the subject there, a product is the subject here.
- A short sting cut FROM a captured site (e.g. a 6s logo reveal for a real brand) is still
  `motion-graphic` when length and "unnarrated, motion is the message" both hold; a generic "make a
  video from this site" with no length constraint is `launch-video`.
- Data with a real company or product behind it still routes to `launch-video` if the ask is to market
  that product; route to `explainer` only when nothing is being sold.
- None of the five rows fit: the deliverable is still a `scene` JSON either way (this engine has one
  module). Fall back to `AGENTS.md`'s full planning chain directly, starting at
  `docs/CRAFT/AUTHORING-WALKTHROUGH.md`.

## How to read one route file

Each file under `routes/` has the same five sections, in this order: **Input** (what you're handed),
**Output** (what ships, and its length band), **Trigger** (the sentence that must be true for this
route to apply), **Intake** (the must-ask questions specific to this deliverable, feeding
`vawe-video-planning`'s lock sheet), **Blueprint family + docs** (which skill/CRAFT doc/blueprint to
load next). Read that one file. The intake questions there are additive to the five brief lines every
deliverable shares (SUBJECT / DATA / PAYOFF / AUDIENCE / FEELING, `AGENTS.md` "THE BRIEF"), never a
replacement for them.
