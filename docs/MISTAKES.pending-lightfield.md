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

---

## A fidelity metric that averages away the thing it is grading

**What.** `lightfield-compare.mjs` graded a generated field against a reference on a 24x14 block
grid. It reported 7.1% mean error and every pass looked green. Side by side with the reference the
field was visibly mushy: its striping amplitude measured 0.77x, and the bars are the subject.

**Root cause.** Downsampling to 24x14 is the RIGHT way to judge a colour field, because it cancels
the pattern's phase. That is also exactly why it cannot see the pattern. One number was being asked
two questions, and it answered the one it could.

**Fix.** `scripts/author/lightfield-metrics.mjs` now defines both, once, and both are printed:
`blockError` for the colour field, `striping` for the pattern (`edge`, the mean absolute horizontal
step; `swing`, the RMS of a row minus its own 21 pixel moving average, which is the amplitude of the
bars with the field subtracted out). `lightfield-fit.mjs` fits the layout on the first and the
pattern's contrast on the second, and once the pattern is in play every pass is scored on one
combined cost. Alternating two objectives lets a later pass spend what an earlier one earned: an
intermediate run took the striping to 10.8 and then a layout pass handed back 10.2.

**Which gate catches it.** The compare tool itself, now that it prints `gen/ref` for both numbers.
The general lesson is worth more than the fix: when a measurement deliberately discards a dimension,
it cannot be the pass mark for anything in that dimension, and a green number is then evidence of
nothing.

---

## Four abandoned search processes, all appending to one log

**What.** A long fit was launched, superseded, and relaunched several times. `pkill -f` did not
account for every one, so four `lightfield-fit.mjs` processes ran at once. Two were appending to the
same log file, which made the log read as if a single run had stalled, and all four shared the CPU,
which made every one of them slow. Twenty minutes were spent reading a log that two writers were
interleaving.

**Root cause.** A background search with no lock and no identity. Nothing stopped a second run
writing where the first was writing.

**Fix.** Not applied in code. The working practice is: one search at a time, verify with
`pgrep -fl` before relaunching, and give each run its own log path. A real fix would be an exclusive
lock on the log file, so a second run refuses to start rather than corrupting the first one's output.

**Which gate catches it.** None. Worth knowing because the failure looks exactly like a slow run.
