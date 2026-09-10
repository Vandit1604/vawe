---
when: you are about to author a product screen (an editor, a results grid, a dashboard, a chat, a card) for a film, or a screen previews as a grey box with tiny type
answers: "why a product screen is designed for the video, not a plain mock · the make screen and make screen-new commands · what the video-readiness list checks and why · how a screen is measured against a reference act · where a theme comes from when the user has none, and which ui-skills were used"
group: look
applies-when: hasHtml
confirm: "does the screen fill most of the frame with display-size type, real images, and one accent, and does `make screen` report no anti-patterns, no text under 28px, and fill/detail at or above 80% of the reference act?"
---

# Product screens: designed for the video, not a plain mock

## AGENT SUMMARY

- The owner's ruling: "use a ui design harness to build beautiful mocks, not plain by default. You can
  invent colours and themes beautifully when asked." A product screen in a film is DESIGNED, by default.
- `make screen F=<fragment.html> [THEME=] [REF=<ref> ACT=<n>] [W= H=]`: renders it through the existing
  `make preview` path, runs impeccable's bundled detector over the source, measures the PNG against a
  reference act's own content numbers, and prints a video-readiness list. Report-only, never blocks.
- `make screen-new NAME=<film>-<screen> KIND=editor|grid|dashboard|chat|card [THEME=] [INVENT=1]` writes
  a STARTING fragment that is already video-ready: theme tokens, display-size type, a layout that fills
  most of the frame, real image slots marked so they cannot render unfilled.
- Theme source (content-richness.plan.md, Update 1): a brand site gives the theme; a prompt with no
  brand means ASK for one; "you choose" means INVENT one (impeccable's `palette.mjs` seed), never
  default to plain.
- Take PRINCIPLES from the smallest useful `ui-skills` set, never its font or colour defaults. A local
  theme's own tokens always win over a fetched skill's specifics.

## Why this exists

Measured against madera per act (madera / vawe-flow, `.claude/plans/content-richness.plan.md` Update
1): results fill 0.71/0.17, detail 13.3/5.9, photo 0.22/0.05; cards fill 0.34/0.15, detail 12.2/4.7,
photo 0.28/0.06. Madera's screens are designed FOR VIDEO: large type, few elements, real imagery, the
subject filling the frame. A hand-written mock defaults to the opposite: a grey window, small type, a
sparse grid, because that is what "a UI" looks like in the training data. Naming the gap is not enough;
the fix is a route every screen takes, and a command that measures whether it actually closed the gap.

## `make screen`: the design route

```
make screen F=formats/scene/vawe-flow-editor.html THEME=vawe REF=example-madera ACT=1
```

Four things, in order, always report-only (exit 0):

1. **Render.** Reuses `make preview`'s own script (`harness/author/preview-fragment.mjs`), never a
   second renderer: the real theme applied, screenshotted at 1920x1080. A fragment carrying an unfilled
   `<fill: ...>` marker is refused here rather than rendered as a broken image.
2. **impeccable.** Runs the vendored skill's own CLI entry point (`skills/impeccable/scripts/detect.mjs
   --json <file>`), its static-HTML engine, over the fragment's source.
3. **Content measure.** Decodes the PNG the same way `harness/media/content.mjs`'s `measureVideo`
   decodes an mp4 frame (480x270 rgb via ffmpeg), so a screen and a reference read on the same
   instrument: colourfulness, fill, detail, photo. With `REF=` and `ACT=`, reads that act's own numbers
   (`grammar/<ref>.json` `shots[].content` when a study has recorded them; otherwise samples four
   frames inside the act's window from `refs/_clips/<ref>.mp4` with `measureVideo` and averages them),
   and prints ours vs theirs with `ok` at 80% of the reference or better, `under` below it.
4. **Video readiness**, read off the fragment's own source, no render needed: the smallest text size in
   px at film scale (flagged under 28px, unreadable in a moving frame), element count, whether colour
   comes from theme tokens (`var(--...)`) or raw hex, and whether every `<img>` resolves to a served
   path (`/assets/`, `/.vawe-data/uploads/`, `/core/`, `/themes/`, `/formats/`). A RELATIVE `<img src>`
   is the known trap: it resolves against the preview page's own base, not the fragment's, and paints
   nothing while the fragment still "looks right" in the markup.

`W=`/`H=` size the centred box; the reused preview path currently screenshots a fixed 1920x1080 canvas
regardless (a real multi-aspect screen route waits on `make preview` itself carrying one).

## `make screen-new`: start video-ready, not grey

```
make screen-new NAME=vawe-flow-editor KIND=editor THEME=vawe
```

Writes `formats/scene/<name>.html` and `<name>.kit.css` (`harness/lib/stagekit.mjs`'s `buildKit`, the
same function `make stagekit` uses, so the pasted block is never a second, drifting copy of the ramp).
The starter is full-bleed, uses ONLY the kit's own type roles and tokens, and fills most of the frame:

| `KIND=` | what it draws | modelled on |
|---|---|---|
| `editor` | a typed prompt as the one focal element, in a bezelled window | madera's agent/editor act |
| `grid` | a hero image plus small tiles, real `<img>` slots marked to fill | madera's results act |
| `dashboard` | a stat panel beside a queue panel | a product's own metrics screen |
| `chat` | a sent bubble and a reply, on a dark ground | an agent conversation |
| `card` | one large photo card, centred | a swipe/result card |

A `<fill: image path>` marker is left where a real image belongs; `make screen` refuses to render a
fragment that still carries one, so a screen cannot ship with a silently blank slot.

**THEME=** with no matching `themes/<name>.json` refuses, unless `INVENT=1` is also passed. Inventing
never fabricates a full theme file mechanically: it runs impeccable's `palette.mjs --from <name>`,
which returns one seed colour and a mood in prose by design (composing the other five roles is a
judgement call against the brief, not a mechanical fill, per that script's own header). The caller
composes `themes/<name>-invented.json` from the printed guidance, in the theme contract shape,
validated by the repo's own theme contract test, then re-runs with `--theme <name>-invented`.

## ui-skills used, and rejected

Loaded (visual/typography categories, the smallest useful set for two SaaS product screens):

- **`dammyjay93/interface-design`** — used for: one focal element per screen (the prompt in `editor`,
  the hero tile in `grid`), a named domain signature over a generic dashboard template, and systemic
  intent (a dark "editor window" ground, not a mixed light/dark mess).
- **`jakubkrehel/better-typography`** — used for: a small type scale with semantic roles instead of
  literal sizes (this repo's own kit ramp already IS that scale), tabular numbers on changing values,
  and staying at or above the sizes that hold up at 1920px wide.

Rejected for these two screens: `mengto/landing-page` and `zeke/swiss-design` (marketing/editorial
skills; these are product screens, not a page), `ericzakariasson/scandinavian-design` and
`nextlevelbuilder/ui-ux-pro-max` (a second builder skill on the same surface, refused per AGENTS.md's
"never stack two builder skills on one surface").

## The proof: `vawe-flow-editor` and `vawe-flow-results`

Built for the `vawe` theme against `example-madera`:

- `formats/scene/vawe-flow-editor.html`, `KIND=editor`, the typed prompt "Make a 12 second launch
  film" in a bezelled window on a dark ground. `make screen ... REF=example-madera ACT=1`: fill 0.45
  (ref 0.52, ok), detail 11.6 (ref 3.75, ok), colourfulness 12 (ref 12.05, ok), smallest text 38px, no
  impeccable findings.
- `formats/scene/vawe-flow-results.html`, `KIND=grid`, six real stills from
  `/.vawe-data/uploads/vawe-flow/` (argus-launch, preface-launch, product-feature-tour,
  saas-hero-launch, vawe-launch, threadcite-open), one hero tile plus five smaller, asymmetric.
  `make screen ... REF=example-madera ACT=5`: fill 0.51 (ref 0.27, ok), detail 13 (ref 11.43, ok),
  smallest text 38px, no impeccable findings.

Before: a hand-written mock with a flat grey window and 22-24px labels reads as "a UI", not a screen
built for a moving frame. After: display-size type (the smallest text role, `.kit-eyebrow` at 22px, is
never used as the smallest text on screen; every label that would be the smallest text is set in
`.kit-body`, 38px, instead), a bezelled device frame or a filled photo grid, one accent. Neither screen
is wired into `formats/scene/vawe-flow.json`; that rebuild is a separate pass.
