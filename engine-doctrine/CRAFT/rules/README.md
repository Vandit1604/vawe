---
when: writing or reading a engine-doctrine/CRAFT/rules/<category>.json file, or wiring a new consumer of harness/lib/craft-rules.mjs
answers: "the rule-record schema, one worked example, the owner rules every record obeys, and why brief quotes the doc"
group: crosscutting
---
# engine-doctrine/CRAFT/rules: one record per rule, one file per category

Four ways this repo already said "follow this rule" (engine-doctrine/RULES per-rule files, a doc's own
`when`/`answers` frontmatter, `harness/lib/safeguards.mjs`, and hand-typed prose in `critics.mjs`) never
shared a shape, so nothing could ask "what applies here" across all of them at once. This directory is
the shared shape. `harness/lib/craft-rules.mjs` loads it; read that file for the loader, the validator,
and `rulesFor()`.

## The schema

One JSON file per category (`layout.json`, `motion.json`, `sound.json`, ...), each an array of records:

```json
{
  "id": "motion.ease-direction",
  "category": "motion",
  "stage": "direct",
  "applies": "always",
  "check": null,
  "adapt": null,
  "brief": "Entrances ease out, exits ease in, a handover eases in-out",
  "doc": "engine-doctrine/RULES/ease-direction.md"
}
```

| field | meaning |
|---|---|
| `id` | `<category>.<kebab-case>`, unique across every file |
| `category` | must equal the file name (`motion.json` records all carry `"motion"`) |
| `stage` | one of the 8 stages `make stage` uses (`quality/gates/stage.mjs` `STAGE_ORDER`) |
| `applies` | `"always"`, or a feature key `quality/gates/craft-checklist.mjs` `computeFeatures()` really produces |
| `check` | a finding code some gate actually emits (`harness/lib/finding-codes.mjs`), or `null` when only an eye catches it |
| `adapt` | a `harness/lib/safeguards.mjs` entry name this rule can be softened by, or `null` |
| `brief` | one line, at most 160 chars, no em dash, and it must be FOUND verbatim (whitespace/markdown-emphasis normalised) inside `doc` |
| `doc` | `engine-doctrine/....md` or `engine-doctrine/....md#anchor`; the file (and the anchor's heading, if given) must exist |

`brief` quotes the doc rather than restating it on purpose: a restated brief can drift from the doc
silently, a quoted one cannot, because the loader's freshness check fails the moment the doc's own
wording moves out from under it.

## Owner rules every record obeys

- **Adapt, never block.** A record's `check` names a finding; `adapt` names how the harness may soften
  it for a film that has a real reason. Nothing here invents a new hard stop.
- **No object-size checks.** A rule may name a ratio, a duration, a colour, a word count. It never
  counts DOM nodes or bytes.
- **Uniformity lives in the film's own `design.md`**, never in a rule record. A record points an author
  at the mechanism (`engine-doctrine/CRAFT/THEME-LOOK.md`, `<film>.design.md`); it does not re-derive the numbers.
- **Nudge, never inject motion.** A rule can tell an author what to key. It never keys anything itself.

## Consumers

`harness/live/stage-say.mjs` and `make next` print up to 5 briefs for the film's current stage and
features. `harness/author/critics.mjs` appends each decider's own category slice. `quality/gates/
craft-coverage.mjs` fails when a record's `check` names a code nothing emits, and reports (never fails)
a per-category count of prose-only records, the ones with both `check` and `adapt` null, since those are
the rules nothing else surfaces.
