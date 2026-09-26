# sting-5s: friction log

Every minute lost, cause, and the engine fix it points to.

1. **~2 min: no `make scaffold` target.** AGENTS.md's own quickstart line names
   `make scaffold OUT=... TYPE=sting`; the Makefile has no such target. Fix: either add
   `scaffold` (thin wrapper the doctrine already promises) or drop the line from AGENTS.md
   so the fast path matches what `make list`/`make help` actually print.

2. **~1 min: `font: "display"` is not a real font name.** The design brief and even
   `themes/vawe.json`'s own note talk about faces by role; the engine's four names are
   `sans, serif, mono, num`. A one-line note in the sting skill or `arsenal` result for
   "display face" would have saved the round trip.

3. **~1 min: `captionStyle` is not a `text` layer prop.** `vawe-type-sting`'s own worked
   arsenal search surfaced `typeOn` as a "caption style", which reads exactly like a prop
   you'd hand a text layer. The real mechanism is `typing: <cps>` + `caret: true`. The
   arsenal entry should say which field it goes in, the way most other arsenal hits do
   (this one omitted it).

4. **~30s: `drive.wiggle` needs `prop` explicitly**, no default. Schema/arsenal say "x/y in
   px, rot in deg" but not that `prop` is mandatory with no fallback. A one-line default
   (`prop: "rot"`) or a clearer required-field error would save the retry.

5. **~3 min, the real bug: an exit that overlaps the end-card reads as a ghost, not a clean
   cut.** The wordmark's `out:"up"` exit window and the accent end-card's fade-in both
   crossed t=4.4-4.9s, so the last visible frames showed dark text half-faded over solid
   blue: unreadable, and it is the frame a sting is judged hardest on. Root cause: nothing
   in the engine ties a layer's own exit window to a later full-frame cut so the two are
   forced to finish together. Authors have to hand-time every exit against the cut by eye,
   per layer, per film. A `holdUntil:"<layer id>"` or "exit clear of the next full-bleed
   layer" check in `quality/audit.mjs` (it already catches ghost/resurrection at declared
   transition boundaries, just not at an undeclared end-card layer) would catch this for
   free next time.

## Engine gaps noted, not fixed here (out of scope for a 5s timed test)
- No motion-path arc primitive existed for "fly a small layer off on a curve"; `motionPath`
  (GSAP MotionPathPlugin, `path`+`autoOrient`) covers it but nothing in `make arsenal`
  surfaces it under words like "arc" or "braces fly off" (arsenal search for
  "motionPath autoOrient arc" returned zero real matches, only unrelated near-hits).
- Per-token syntax colour inside one text layer (punctuation dim, key accent) has no
  built-in support; approximated with a single flat colour instead.
