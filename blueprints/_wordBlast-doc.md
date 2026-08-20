# `wordBlast` — entry for `docs/CRAFT/BLUEPRINTS.md`

Merge the table row into the beats table in section "The beats (`blueprints/index.mjs`)", and the prose
under it.

## Table row

| `wordBlast` | punctuation, one stressed word or mark | a word (or a logo) that arrives oversized, settles, creeps, then grows THROUGH the frame. `anim:"none"`, four keys, `motionBlur` |

## Prose

### `wordBlast` — the four-key scale punctuation

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
| `text` | string | — | the word. Pass this or `src`; passing neither throws. |
| `src` | string | — | a mark (logo/wordmark) to punctuate with instead of a word. |
| `x`, `y` | number | `160`, `380` | stage position (1920x1080). |
| `w` | number | `1600` for text, unset for a mark | text box width; the mark's rendered width. |
| `h` | number | — | mark height only. |
| `size` | number | `380` | type size. Text only. |
| `weight` | number | `600` | type weight. Text only. |
| `color` | string | `var(--text)` | text colour, semantic. Text only. |
| `align` | string | `center` | text alignment inside `w`. Text only. |
| `font` | string | — | font role, omitted unless given. Text only. |
| `arrive` | number | `1.5` text, `1.4` mark | scale on the first key. A wide mark cannot take the word's amplitude. |
| `settle` | number | `1` | the settled scale, i.e. the reading. |
| `drift` | number | `settle + 0.04` text, `+0.03` mark | the creep. Drop it and the hold reads as a freeze frame. |
| `exit` | number | `1.9` text, `1.7` mark | scale on the last key. It leaves by growing, never by fading alone. |
| `settleAt` | number | `0.42` | seconds from layer start to the reading. |
| `driftFor` | number | `0.3` | seconds of creep before the exit begins. |
| `motionBlur` | bool\|number | `true` | streaks the two fast ends, crisp across the hold. |
| `start`, `dur` | number | `0`, `1.5` | placement and length. |
