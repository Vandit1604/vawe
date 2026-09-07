---
when: "authoring any beat (don't re-derive motion)"
answers: "compose from directed-motion beats ({type:\"beat\"}) so good motion is the default; the ambition floor that fails a plain slideshow"
group: crosscutting
codes: no-kinetic-type, plain-slideshow
---

# BLUEPRINTS: compose a video from directed beats, don't re-derive motion

## AGENT SUMMARY

- Run `make blueprints` FIRST and start every beat from a directed `{type:"beat"}` blueprint. Do not
  open a blank JSON and hand-write `anim:"rise"`/`anim:"fade"` on every layer.
- Enforced by `make direction-floor` (opt-in `TASTE=1 make author-check`), the ambition floor that fails
  a plain slideshow; codes: `no-kinetic-type`, `plain-slideshow`.
- Checkable action: did you run `make blueprints` before writing `anim:` on a blank layer?

**You will open a blank JSON and write `anim: "rise"` and `anim: "fade"`, and it will pass every gate.
Don't. Run `make blueprints` FIRST and start from a directed beat.** This is not a suggestion about
efficiency. It is the #1 authoring failure in this repo, named as such in `CLAUDE.md`, proven twice on the
TokenJam launch, and committed again in a 28s film of 31 hand-written layers, 74% of them text, with
`anim: "fade"` on nearly every one and one backdrop window for the whole runtime. That film was rejected
twice by the person who asked for it and it was not below the house standard, it was AT it.

The reference system says the same thing about the same reflex: *"Don't enter everything from the same
direction. You default to `y: 30, opacity: 0` on every element"*
(`another engine-creative/references/motion-principles.md`). `anim: "fade"` is our `y: 30, opacity: 0`.

Blocks fixed the blank-page problem for *components* (a card, a chart). **Blueprints fix it for MOTION**:
each is a whole beat's directed choreography, so the good motion is the *default* you start from, not
something you remember to add.

> A blueprint fixes **motion + structure**, never copy/colour/brand. Two brands using `kineticHook` still
> differ (their words, palette, and faces differ). The ledger + similarity gate still enforce uniqueness,
> this is the opposite of a template.

## See them

A blurb tells you what a beat IS; it does not show you what it looks like. **`make previews`** renders
a real ~4s clip per beat (placeholder copy, `theme: "default"`) to `site/public/blocklib/beats/<id>/
{preview.mp4, poster.png, sheet.png}`, plus an `index.json` manifest. `make blueprints` prints the sheet
path beside each beat once one exists, so picking a beat is picking a picture, not guessing from prose.
Re-render one beat after changing its factory: `make previews ONLY=<id>`.

## Use one

```json
{ "type": "beat", "beat": "kineticHook", "start": 0.3, "dur": 5.5,
  "eyebrow": "Where does your agent spend?", "to": 94, "unit": "%",
  "sub": "of your agent's tokens are re-reads." }
```

Each `{type:"beat"}` expands into its real, richly-animated layers at load (core/engine/expand.js, same
pipeline blocks use), no separate step. Browse the set first: **`make blueprints`**; `make expand
D=<file>` still exists to print the expanded JSON to stdout when you want to eyeball what one becomes.

## The beats (`blueprints/index.mjs`)

| Beat | Role | Emits |
|---|---|---|
| `kineticHook` | hook / open loop | eyebrow + hero count-up\|word (pop) + word-by-word subline |
| `statReveal` | payoff | hero count-up + kinetic label, held long |
| `cardCascade` | feature grid | kinetic title + cards that pop in one after another |
| `chipGrid` | named things (sources/tools) | pills that pop staggered + accent footer |
| `terminalReveal` | a CLI beat | typing command + cursor + rising output + accent result |
| `screenDive` | product surface | kinetic title + a real UI shot that KEN-pushes in (zoom into the dashboard) |
| `logoLockup` | brand | mark pops + wordmark travels + kinetic headline + sub |
| `verdictProof` | claim proven | typing command + note + a tone verdict chip that pops |
| `ctaEnd` | held end card | mark + install chip + sub + url (exitDur 0) |
| `typedHook` | a hook that erases itself | types in, un-types ~2x faster, caret throughout, never fades ([KEYED-MOTION.md](KEYED-MOTION.md)) |
| `morphButton` | the object that BECOMES the next thing | a labelled button shrinks, rounds and sheds its label until it is a dot. One `--p` clock, a different power per property |
| `recordedPan` | a surface wider than the frame | scrolls on an IRREGULAR **linear** track so it reads as a screen recording, with rider layers (cursor, callout, highlight) welded to the same track |
| `echoRing` | keep the frame alive through a slow change | a stroked ring that replays another layer's path one beat late, fading as it grows |
| `wordBlast` | punctuation, one stressed word or mark | arrives oversized, settles, creeps, then grows THROUGH the frame. `anim:"none"`, four keys, `motionBlur` |

Each takes `{ x?, y?, w?, start, dur, ...content }`. Defaults target the 1920×1080 stage; override to place.
A beat emits LAYER motion; pair it with the scene-level transition it wants (a `cinematicZoom` seam into a
`screenDive`, a `dissolve` into a `logoLockup`): `make direct` suggests these.

## HTML-first beats (`blueprints/beats-html.mjs`)

An author with hand-written markup (a stat block, a browser frame, a table, a chat log) wants the same
`parts`-driven choreography a rect/text beat gets for free, without re-deriving it. These five wrap ONE
`html` layer around your own `body`/`rows`/`messages`, and `parts` reveals the marked children (default
selector `[data-part]`, override with `select`) instead of the whole fragment arriving as one flat card.
See [HTML-FRAGMENTS.md](HTML-FRAGMENTS.md) for `parts` itself.

| Beat | Role | Emits |
|---|---|---|
| `htmlCard` | a hairline surface from your own markup | one `html` layer, `parts` reveals `data-part` children |
| `htmlPanel` | a plain low-contrast surface for content you draw | a bare surface, no title slot, your `body` is the whole content |
| `htmlBrowser` | a real page under browser chrome | traffic dots + url bar (decorative, no `data-part`) around your `body` |
| `htmlTable` | a data table that fills row by row | `<table>` from `headers`/`rows`, `parts` reveals each `tr` |
| `htmlChat` | a chat log that lands message by message | bubbles from `messages: [{from, text, me}]`, `parts` reveals each `.bubble` |

**Why five and not one generic wrapper.** `htmlCard`/`htmlPanel` differ only in default chrome (accent
title slot vs. none), kept separate because a caller reaching for "a card" and a caller reaching for "a
plain surface for my own thing" are asking different questions; collapsing them into one beat with a
`variant` flag would just move the same decision into a prop. `htmlBrowser`/`htmlTable`/`htmlChat` each
draw a real, specific structure (chrome, a table, a bubble log) `htmlCard`'s free-form `body` does not
give you for free.

**When to reach for one of these instead of a card-grid/chip-row beat.** You already have markup
(captured or hand-written) and want it choreographed, or the shape (a real table, a chat log) is
cheaper to write as markup than to compose from `body`/`rows`/`messages` props. When you are instead
composing from scratch and the shape is a card grid, a chip row, or a fixed frame that fills, the
equivalent beats in `beats.mjs` / `beats-mined.mjs` (`cardCascade`, `chipGrid`, `containerFill`,
`listBuildRows`) are still pure `props → layers` factories with no markup to write; each one now emits
ONE `html` layer internally, with `parts` driving the per-card/chip/row reveal, so choosing between
these five and those four is purely "do I already have markup" (`htmlCard` et al.) vs. "give me the
grid/row/frame and I'll write the markup" (`cardCascade` et al.), never a difference in what gets
rendered under the hood.

**Per-item motion is the one shape `parts` cannot give you.** `cardFan`, `chipConverge`, `cellMosaic`
(its text cells), `propSentence`'s `chip` item and `slotSwap`'s tile/chip payload each key an
INDEPENDENT `motion` track per item (a different fan angle, a different scatter radius, a different
arrival offset), and `parts` stages the children of ONE clock, it cannot give five items five different
tracks. Those beats emit one `html` layer PER ITEM instead, each with its own motion track, inside the
shared group/list the beat already builds.


## The three pictorial beats

The library median is 13% pictorial layers and ZERO hand-keyed motion tracks. The two films this repo is
proudest of run 46% and 38% pictorial, and higgsfield hand-keys 75% of its layers. These three beats
exist so that gap is one line of JSON rather than an afternoon, and all three were measured off those
two films rather than invented.

### `recordedPan`: the surface that scrolls like a recording

A surface WIDER than the frame, moved on a multi-key linear track whose keys are IRREGULARLY spaced. The
irregularity is the whole device: a human scrolling a page surges and gives up, and an eased track reads
as an animation of a page rather than as a page. Rider layers (a cursor, a callout, a highlight box) weld
to the same track with a time offset, so they travel WITH the surface instead of floating over it.

Measured off `higgsfield-recreation` beat 2, where three layers shared one track byte for byte. That
duplication is what `riders` replaces.

**Reach for it when:** the subject is a real product surface and you want the viewer to believe they are
watching someone use it. **Do NOT** when the surface fits the frame, since there is nothing to pan; use
`screenDive` and let the camera move instead.

### `echoRing`: motion during a change too slow to watch

A stroked ring that replays another layer's path one beat late, fading as it grows. Its job is not
decoration: when the subject morphs slowly, the eye has nothing to track, and the echo supplies the
motion the beat needs without adding a second subject. It takes the path it is echoing as a prop, so it
hangs off any layer.

Measured off `higgsfield-recreation` beat 4, whose five keys are all cubic and none linear, the
deliberate opposite of that film's mechanical layers.

**Reach for it when:** a beat's subject changes shape over more than about a second. **Do NOT** when the
frame is already busy; an echo in a dense frame is one more thing to read.

### `wordBlast`: the four-key scale punctuation

One word, or one mark, about a second long, sized to fill the frame. It does not fade in. It arrives
already too big and falls into its reading on `easeOutCubic`, holds with a creep, then leaves by growing
past the camera on `easeInCubic`. The deceleration IS the impact, which is why `anim:"none"` is not an
omission: the engine's entrance presets would cross-fade this, and a cross-fade is how a slide starts.

Measured off `brew-launch-act1` beats 1, 6, 7 and 9 ("Today." · "Meet" · the logo · "Faster"). The
defaults reproduce those tracks exactly.

**Reach for it when:**
- the film needs a beat that reads as a spoken word, not as a screen. A title card is read; this is heard.
- a logo has to sit in a sentence. Pass the mark as `src` and it takes the same track as the words on
  either side, one notch gentler, so it reads as the next WORD rather than as a badge. This is the launch
  rule about giving a mark prominence, written as motion instead of as a size.
- you need a hard beat between two dense shots. A frame with one huge word in it is a breath.

**Do NOT reach for it when:**
- **you have already used it twice in a row.** A beat that punctuates everything punctuates nothing: three
  of these in sequence is not emphasis, it is a rhythm, and the fourth word lands with no more weight than
  the first. Spend it on the words that carry the sentence and let the beats between them be pictures.
- the content is a claim that needs proof. This shows a word; `verdictProof`, `terminalReveal` and
  `screenDive` show a thing.
- the beat runs longer than about 2 seconds. The hold is a creep, not a scene; a long `dur` stretches the
  settle and the frame goes dead in the middle.
- the layer has to survive a cut. It is built to leave, and `exitDur: 0` means it leaves completely.

**Props**

| Prop | Type | Default | What |
|---|---|---|---|
| `text` | string | n/a | the word. Pass this or `src`; passing neither throws. |
| `src` | string | n/a | a mark (logo/wordmark) to punctuate with instead of a word. |
| `x`, `y` | number | `160`, `380` | stage position (1920x1080). |
| `w` | number | `1600` for text, unset for a mark | text box width; the mark's rendered width. |
| `h` | number | n/a | mark height only. |
| `size` | number | `380` | type size. Text only. |
| `weight` | number | `600` | type weight. Text only. |
| `color` | string | `var(--text)` | text colour, semantic. Text only. |
| `align` | string | `center` | text alignment inside `w`. Text only. |
| `font` | string | n/a | font role, omitted unless given. Text only. |
| `arrive` | number | `1.5` text, `1.4` mark | scale on the first key. A wide mark cannot take the word's amplitude. |
| `settle` | number | `1` | the settled scale, i.e. the reading. |
| `drift` | number | `settle + 0.04` text, `+0.03` mark | the creep. Drop it and the hold reads as a freeze frame. |
| `exit` | number | `1.9` text, `1.7` mark | scale on the last key. It leaves by growing, never by fading alone. |
| `settleAt` | number | `0.42` | seconds from layer start to the reading. |
| `driftFor` | number | `0.3` | seconds of creep before the exit begins. |
| `motionBlur` | bool\|number | `true` | streaks the two fast ends, crisp across the hold. |
| `start`, `dur` | number | `0`, `1.5` | placement and length. |

## The floor that enforces this

`make direction-floor` (opt-in: `TASTE=1 make author-check`) is the **ambition floor**, the inverse of effect-soup. It
reads a scene's motion vocabulary (kinetic type · count-ups · camera · transitions · ken · cursor · motion
tracks · fx · background motion · beats) and **fails a plain slideshow**. Composing from beats clears it by
construction. Directed lives *between* soup and slideshow.

## The reference bar

The gold standard in this repo is **`formats/scene/brew-native.json`**, study its seams, camera push,
`motion[]` dolly heroes, gradient+motionBlur text, cursor click, and ken. The blueprint-era worked example
(`tokenjam-launch`) was deleted from the library; `make blueprints` prints every beat it was built from, and
`make expand D=<file>` (printed to stdout) shows what one becomes. Before authoring, watch brew-native and read
[`DIRECTION.md`](DIRECTION.md), anchor on ambition, then compose.

## Adding a blueprint

Add a pure `props → layers` factory to `blueprints/beats.mjs` (compose the idioms in `blueprints/kit.mjs`:
`kineticHeadline`, `dollyNumber`, `caption`, `chip`, `panel`, `verdictChip`), register it in
`blueprints/index.mjs`, and describe it in `scripts/site/blueprints-catalog.mjs`. Keep it brand-agnostic
(semantic theme vars, no hardcoded palette) and deterministic (no Date/random).

## Mined blueprints

19 beats were invented once and 12 sat unused: an author reaching for a shape the invented set did not
have fell back to raw layers, which is the failure this whole doc exists to stop. `make mine` closes it
the way another engine closed it (22 shot templates mined from 178 real ads): it reads every studied
reference under `grammar/*.json` (`make study`, [`REFERENCE-STUDY.md`](REFERENCE-STUDY.md)) and clusters
shots by device into named shapes, writing the receipt to `grammar/_mined-shapes.json`, which grammar
file and shot index backs each one.

**The rule: a new blueprint comes from a studied reference, not from invention.** `make mine` will not
print a shape with zero matched shots, and a factory in `blueprints/beats-mined.mjs` with no source line
is a claim nobody can check. If you want a shape the corpus does not have, study a film that has it
(`make study VIDEO=<mp4> NAME=<name>`) before you write the factory.

The ten mined today, each in `blueprints/beats-mined.mjs`, its blurb in `blueprints/index.mjs`:

| Beat | Role | Signature move | Sources |
|---|---|---|---|
| `blurResolveHook` | Hook | type arrives smeared with motion blur, snaps into focus, never slides or fades | pin-1119918632363453012#1, pin-415034921941332045, pin-333759022406760643 |
| `dialogueAccumulate` | Hook | sans/serif word pairs accumulate on a held frame, a dot as the joint, a bloomed payoff line | rebuilt#1 |
| `containerFill` | Key_Feature | a fixed frame holds while chips fill it one at a time | pin-1119918632363453012#2, pin-583145851797705243, arc-space-swiping, pin-333759022406800725 |
| `cardFan` | Key_Feature | cards arrive from one side and fan open in perspective around a fixed anchor | pinref#3, #5, #6, #7 |
| `listBuildRows` | Key_Feature | a vertical list grows one row at a time under a fixed rule | pinref#11-#15 |
| `chipConverge` | Proof | chips scatter in from every side, then converge onto one point | pinref#16, #17 |
| `cellMosaic` | Build | a grid of mixed cells slides as one surface while each cell keeps its own content | rebuilt#3 |
| `wordWipe` | Key_Feature | an oversized word crosses the whole frame motion-blurred; its passage is the transition | rebuilt#4 |
| `wordmarkAssemble` | CTA/Brand_Outro | the mark's letters settle from scattered positions while tiles drift behind at a different depth | rebuilt#5 |
| `viewportTrio` | Payoff | the same subject shown at three sizes at once, the "it is really finished" shot | framer-hero#2 |

**How to pick one.** Run `make mine` to see the current shape clusters and their sources, run `make
blueprints` for the props each mined beat takes, then place `{"type":"beat","beat":"<name>", ...}`,
the same as any other beat: it expands at load, no separate step.

`make mine` is a CLUSTERING tool, not a code generator: it scores every studied shot's `onScreen` /
`moves` / `trigger` text against a fixed keyword dictionary and prints which grammar + shot backs each
shape (`scripts/author/mine.mjs`). The factories themselves are hand-authored, like every other
`beats-*.mjs` file, because choreography is a judgement call no keyword match should make silently.
