---
when: "authoring any beat (don't re-derive motion)"
answers: "compose from directed-motion beats ({type:\"beat\"}) so good motion is the default; the ambition floor that fails a plain slideshow"
group: crosscutting
---

# BLUEPRINTS: compose a video from directed beats, don't re-derive motion

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

## Use one

```json
{ "type": "beat", "beat": "kineticHook", "start": 0.3, "dur": 5.5,
  "eyebrow": "Where does your agent spend?", "to": 94, "unit": "%",
  "sub": "of your agent's tokens are re-reads." }
```

`make expand D=<file>` turns each `{type:"beat"}` into its real, richly-animated layers (same pipeline
blocks use). Browse the set first: **`make blueprints`**.

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
`make expand` shows what one becomes. Before authoring, watch brew-native and read
[`DIRECTION.md`](DIRECTION.md), anchor on ambition, then compose.

## Adding a blueprint

Add a pure `props → layers` factory to `blueprints/beats.mjs` (compose the idioms in `blueprints/kit.mjs`:
`kineticHeadline`, `dollyNumber`, `caption`, `chip`, `panel`, `verdictChip`), register it in
`blueprints/index.mjs`, and describe it in `scripts/site/blueprints-catalog.mjs`. Keep it brand-agnostic
(semantic theme vars, no hardcoded palette) and deterministic (no Date/random).
