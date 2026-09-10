---
when: you are about to author a product screen (an editor, a results grid, a dashboard, a chat, a card) for a film, or a screen previews as a grey box, with tiny type, or with something clipped
answers: "why a product screen is designed for the video, not a plain mock · the one make screen command · what the video-readiness and clipping checks catch and why · how a screen is measured against a reference act · where a theme comes from when the user has none, and which ui-skills were used"
group: look
applies-when: hasProductScreen
confirm: "does the screen fill most of the frame with display-size type, real images shown whole, and one accent, and does `make screen` report no anti-patterns, no text under 28px, nothing clipped, and fill/detail at or above 80% of the reference act?"
---

# Product screens: designed for the video, not a plain mock

## AGENT SUMMARY

- The owner's ruling: "use a ui design harness to build beautiful mocks, not plain by default. You can
  invent colours and themes beautifully when asked." A product screen in a film is DESIGNED, by default.
- ONE command: `make screen F=<fragment.html> [KIND=editor|grid|dashboard|chat|card] [THEME=] [INVENT=1]
  [REF=<ref> ACT=<n>] [W= H=]`. If `F` does not exist, `KIND` is required and writes a video-ready
  starting fragment there first; if `F` exists, passing `KIND` refuses rather than overwrite an authored
  screen. Either way it then always renders, runs impeccable's detector, measures content against a
  reference act, and checks the LAID-OUT page for anything clipped. Report-only, never blocks.
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

## `make screen`: ONE command, write-if-new then always check

```
make screen F=formats/scene/vawe-flow-editor.html THEME=vawe REF=example-madera ACT=1        # check an existing screen
make screen F=formats/scene/new-results.html KIND=grid THEME=vawe                             # write, then check
```

The owner: "why two? not single one." There used to be a separate `screen-new` target; it is gone.
`make screen` decides which half of the job is needed from whether `F` exists:

- **`F` does not exist:** `KIND` is required. Writes `<F>` and `<F minus .html>.kit.css`
  (`harness/lib/stagekit.mjs`'s `buildKit`, the same function `make stagekit` uses, so the pasted block
  is never a second, drifting copy of the ramp), full-bleed, theme tokens only, display-size type, a
  layout that fills most of the frame. `THEME=` with no matching `themes/<name>.json` refuses unless
  `INVENT=1` is also passed (see below).
- **`F` exists:** passing `KIND` REFUSES rather than overwrite an authored screen. Drop `KIND` to just
  check it.

Either way, five things happen next, always report-only (exit 0):

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
5. **Clipped**, read off the RENDERED page, not the source: `preview-fragment.mjs --boxes-out` dumps
   every element's real, laid-out bounding box (a percentage width, a grid track, an `object-fit` crop
   all resolve only once the browser lays the page out, which is exactly why this cannot be a source
   parse). Each box is checked against the 1920x1080 frame and the safe margin
   (`core/layout/safe.js` `MARGIN`, 0.06 of the short edge, 65px at this size). An element outside the
   frame is `OFF FRAME`; inside the frame but inside the margin is `in margin`; a clean screen prints
   `none: every element sits inside the frame and its margin.`

`W=`/`H=` size the centred box; the reused preview path currently screenshots a fixed 1920x1080 canvas
regardless (a real multi-aspect screen route waits on `make preview` itself carrying one).

**Screen kinds** (modelled on madera's grammar):

| `KIND=` | what it draws | modelled on |
|---|---|---|
| `editor` | a typed prompt as the one focal element, in a bezelled window | madera's agent/editor act |
| `grid` | real `<img>` slots marked to fill, one per cell | madera's results act |
| `dashboard` | a stat panel beside a queue panel | a product's own metrics screen |
| `chat` | a sent bubble and a reply, on a dark ground | an agent conversation |
| `card` | one large photo card, centred | a swipe/result card |

A `<fill: image path>` marker is left where a real image belongs; `make screen` refuses to render a
fragment that still carries one, so a screen cannot ship with a silently blank slot.

**`INVENT=1`** never fabricates a full theme file mechanically: it runs impeccable's `palette.mjs --from
<name>`, which returns one seed colour and a mood in prose by design (composing the other five roles is
a judgement call against the brief, not a mechanical fill, per that script's own header). The caller
composes `themes/<name>-invented.json` from the printed guidance, in the theme contract shape,
validated by the repo's own theme contract test, then re-runs with `--theme <name>-invented`.

## ui-skills used, and rejected

Loaded (visual/typography categories, the smallest useful set for two SaaS product screens):

- **`dammyjay93/interface-design`**: used for one focal element per screen (the prompt in `editor`,
  the hero tile in `grid`), a named domain signature over a generic dashboard template, and systemic
  intent (a dark "editor window" ground, not a mixed light/dark mess).
- **`jakubkrehel/better-typography`**: used for a small type scale with semantic roles instead of
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
  (ref 0.52, ok), detail 11.6 (ref 3.75, ok), colourfulness 12 (ref 12.05, ok), smallest text 38px,
  nothing clipped, no impeccable findings.
- `formats/scene/vawe-flow-results.html`, `KIND=grid`, six real stills from
  `/.vawe-data/uploads/vawe-flow/` in a 3x2 grid, each cell at `aspect-ratio:16/9` (the source stills'
  own aspect), so `object-fit:cover` neither crops nor letterboxes: every still shows its own
  composition whole. `make screen ... REF=example-madera ACT=5`: fill 0.22 (ref 0.27, ok), detail 9.5
  (ref 11.43, ok), smallest text 38px, nothing clipped, no impeccable findings.

**A caught regression, worth stating because the eye missed it and a gate did not exist to catch it
either.** The first version of the results screen passed `make screen` (fill/detail both "ok") while
badly broken: the title "SIX FILMS SHIPPED THIS WEEK" was clipped by the top edge, the bottom row ran
off the bottom, and cropped stills cut their own on-screen text ("...M" for "4.8M", "...ers ask
Reddit." for "Buyers ask Reddit."). Content measurement (fill/detail/photo) cannot see this: a title cut
in half and a title fully on screen can score identically, because the metric reads pixel statistics,
not composition. Two fixes: the title was ALSO untrue ("six films shipped this week" when nobody had);
replaced with the storyboard's own beat-8 copy, "Your films". And the CLIPPED check above was added:
a static source parse cannot see a percentage width or an `object-fit` crop resolve, so it reads the
LAID-OUT page instead (`preview-fragment.mjs --boxes-out`), which is the only way to catch it.

Before (`make screen` on the broken version):
```
· clipped ·
  [OFF FRAME] <p> "SIX FILMS SHIPPED THIS WEEK": 13px past the top edge
  [in margin] <img> ".../vawe-launch.jpg": 3px into the top margin
  [in margin] <img> ".../argus-launch.jpg": 3px into the top margin
  [in margin] <img> ".../preface-launch.jpg": 3px into the top margin
  [OFF FRAME] <img> ".../product-feature-tour.jpg": 12px past the bottom edge
```

After:
```
· clipped ·
  none: every element sits inside the frame and its margin.
```

Neither screen is wired into `formats/scene/vawe-flow.json`; that rebuild is a separate pass.
