# What to do next

Decided across three conversations. Ordered, with dependencies. Each item says WHY, because the reason
is what lets you re-order it later when something changes.

---

## 1. Turn the taste gates off  ·  small, reversible, unblocks everything

Default these eight `author-check` steps to OFF, behind `TASTE=1`: critique · direct · floor · visuals ·
dissolve · slop · designspec · copy. Do not delete the files.

**Why.** Those rules were fitted to ~100 films we have since established are debt: 52 of 93 carried no
large picture, 18 waive continuity, and the show floor is waived by 32% of the library AND passable by a
590x18 underline. New work is being measured against a library nobody likes, using thresholds derived
from it, which can only pull toward the mean. The library already voted: 31 films waived the show floor.
Formalising that is more honest than carrying 31 waivers and calling the rule live.

**Keep on:** validate · asset-check · dead-air · probe/snap/canvas-purity · seam-check · audit. Those
catch BROKEN, not ugly, and they cost about a second. `probe` especially is not quality: it protects
`renderFrame(n)` purity, and without it sharded rendering can silently produce a different video
depending on scheduling.

**Keep `make judge`.** It does not score anything; it renders a sheet and a human decides. That is the
honest form of a taste check.

Revisit in a few months, derived from films you actually like.

---

## 2. Make layers extensible  ·  the architectural unlock, do it BEFORE the primitives

Two additive changes:

- **Widen the per-frame signature** to pass a read-only scene view:
  `frame(kit, el, L, t, scene)` with `scene.boxOf(id)` · `scene.light` · `scene.camera` · `scene.canvas`.
  Purity holds (still a pure function of t) and every existing layer ignores the new argument.
- **Add an `fx: []` modifier slot** to any layer, so an effect is a modifier applied to something rather
  than a new type: `{"type":"image","fx":[{"occlude":"cardId"},{"shadow":"key"}]}`.

**Why.** Today a layer is handed `(kit, el, L, t)` — itself and the clock, nothing else. It cannot read
another layer's box, the camera, the light, or what is behind it. That single signature explains every
wall hit recently: occlusion impossible, shadows impossible, 3D awkward, glass forced into an `html`
layer to borrow the browser's `backdrop-filter`, group children second-class in 5 of the 61 audit
findings, and five registry types (glow/beam/paint/shader/raymarch) that are one idea in five costumes.

Adding a layer TYPE is already easy (one file, two exports, one registry line). Adding an EFFECT is not,
and effects are what visual range is made of.

---

## 3. The three primitives, as modifiers  ·  depends on 2

Per-layer 3D tilt · occlusion masking · shadows keyed to a light direction.

Phase 0 already proved the 3D construction: camera on the layers' DIRECT parent, since any intervening
element flattens (`transform-style: flat` is the default, not overflow or filter as first assumed).
Spike lives at `scripts/dev/spike-3d.mjs` and self-checks.

Build them as `fx` modifiers, not as new types. Doing them before item 2 entrenches exactly the problem
item 2 exists to fix.

---

## 4. `--alpha` exports a fully opaque file  ·  high, contained, correctness not taste

`internal/render/render.go:75-111`. The bg canvas is never suppressed, so alpha is 255 on every pixel.
Related and same root: `--alpha` with `--out *.mp4` strips the channel, `--bg` composites over a video
that is 100% hidden, `--watermark` is ignored on both export paths.

**Why it survives the taste-gate cull:** it hands back a broken DELIVERABLE with no error anywhere. You
find out when it is already in someone else's timeline.

---

## 5. `make blueprints` has never run  ·  one word

Not in `.PHONY`, so the `blueprints/` directory shadows it and make reports "up to date". CLAUDE.md
calls it step 0 of the authoring ladder.

---

## 6. Triage the correctness half of the gauntlet  ·  see GAUNTLET-2026-08.md

Of 61 findings, work the classes that survive the taste cull: 13 silent-substitution, 4 error-swallowed,
plus `make schema-check` scanning the 20-line `scene.html` shell so 33 of 161 layer props sit outside
drift detection. That last one matters more than its severity suggests: silent substitution is the most
frequent bug class in this repo, and schema-check is the thing meant to catch it.

Run every `repro` before trusting it. A finding nobody reproduced is a rumour.

---

## 7. The pixel gauntlet  ·  later, bigger

The audit's own stated blind spot: three rounds read code, schemas and docs, and none compared RENDERED
PIXELS against the scene that produced them. Both high-severity findings lived exactly there.
Determinism under `--workers`, frame dedup and audio mixing remain unverified in practice.

---

## Superseded by item 1

- **Fix `boxOf` squaring single-axis layers.** It fixes `visual-vocabulary`, which item 1 turns off. Do it
  if and when the taste gates come back.
- **Re-run the waiver census after fixing the show floor.** Moot while the floor is off.
