# Pending entries for docs/MISTAKES.md (lightfield pass)

Append these serially. Numbers left blank on purpose.

---

## `_lightfall.html` moves at frame rates against a clock measured in seconds

**What.** `formats/scene/_lightfall.html` drives every value off `sin(var(--t) * f + p)` with `f`
between 0.04 and 0.33. `core/bg-html.js` writes `--t` as **seconds into the video**, not frames. Over
a 10 second film the whole-field breathe advances 0.41 radians, about one fifteenth of a cycle, and
the per-slat shimmer advances under a third of a cycle. The backdrop is very close to a still.

**Root cause.** The frequencies read as if they were tuned against a frame counter. At 30fps they
would be right: 0.041 rad per frame is one cycle every five seconds. The author never watched the
motion across frames, which `CLAUDE.md` rule 2a0 exists to prevent.

**Fix.** Not applied. `_lightfall.html` was out of scope for this pass and is hand-baked, so there is
nothing to fix but the 58 literals. `core/lightfield/` sets its rate from one named constant,
`RATE = 0.62` radians per second at `speed: 1`, so the unit is stated once and cannot be guessed at.
Regenerating `_lightfall.html` through the generator would close it.

**Which gate catches it.** None. `direction-floor` checks that a hand-authored backdrop *mentions*
`var(--t)`; it cannot tell a field that moves from a field whose coefficient makes it stand still.
A gate could: evaluate each `sin(var(--t) * f + …)` over the film's own duration and warn when the
total phase travelled is under about half a cycle.

---

## `make preview` is the wrong page for a full-bleed fragment

**What.** `scripts/author/preview-fragment.mjs` puts the fragment in `#frag { width: 1400px }`
centred in a flex stage. A backdrop fragment is `position:absolute;inset:0`, so it sizes itself
against that box and the preview shows a 1400px strip, not the frame. Nothing warns.

**Root cause.** The preview page was built for cards and hero blocks, which are content-sized. A
full-bleed field is the other kind of fragment and there was no page for it.

**Fix.** `scripts/author/lightfield-shot.mjs` gives one: a stage at the exact output size with `--t`
set explicitly. A better fix would be a `--full` flag on `make preview` that drops the 1400px box and
sets `--t`, so every author gets it rather than every author writing their own.

**Which gate catches it.** None, and this is a looks-fine failure: the preview renders, it just
renders the wrong thing.
