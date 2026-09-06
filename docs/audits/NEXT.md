---
when: looking for the next piece of engine work to pick up
answers: "the running to-do with what is already DONE struck through"
group: engine
---

# What to do next

Decided across three conversations. Ordered, with dependencies. Each item says WHY, because the reason
is what lets you re-order it later when something changes.

---

## 1. Turn the taste gates off  ·  DONE 2026-08

Seven `author-check` steps now default to OFF behind `TASTE=1`: critique · direct · floor · dissolve ·
slop · designspec · copy. Every file stays.

The eighth, `visuals`, was **deleted** rather than switched off, and that was a change to the plan
below. The plan assumed it was merely fitted. It was not: `boxOf` squared any single-axis layer, so a
590x18 underline measured as 590x590 and passed the one gate whose job was to tell a hairline from a
picture. A rule that is both wrong and waived by a quarter of the library is not a rule to switch off
for later; it is one to delete and write down. The `proxy` tier went with it.

Measured before/after across the whole library: 36 scenes moved FAIL to PASS (34 on `plain-slideshow`,
21 on `no-visual-vocabulary`, overlapping), and no scene moved PASS to FAIL. `docs/TASTE.md` records
the cull and the three things that must be true to switch any of them back on.

The original reasoning, kept because it is still the argument:

**Why.** Those rules were fitted to ~100 films we have since established are debt: 52 of 93 carried no
large picture (a snapshot from when the gate landed; see `docs/CRAFT/SHOW-DONT-TELL.md` for the current
count), 18 waive continuity, and the show floor is waived by 32% of the library AND passable by a
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

## 2. Make layers extensible  ·  DONE (`edd9224`, `7afee25`)

Two additive changes:

- **Widen the per-frame signature** to pass a read-only scene view:
  `frame(kit, el, L, t, scene)` with `scene.boxOf(id)` · `scene.light` · `scene.camera` · `scene.canvas`.
  Purity holds (still a pure function of t) and every existing layer ignores the new argument.
- **Add a modifier slot** to any layer, so an effect is a modifier applied to something rather
  than a new type: `{"type":"image","modifiers":[{"occlude":"cardId"},{"shadow":{"dist":30}}]}`.

**Why.** Today a layer is handed `(kit, el, L, t)`. Itself and the clock, nothing else. It cannot read
another layer's box, the camera, the light, or what is behind it. That single signature explains every
wall hit recently: occlusion impossible, shadows impossible, 3D awkward, glass forced into an `html`
layer to borrow the browser's `backdrop-filter`, group children second-class in 5 of the 61 audit
findings, and five registry types (glow/beam/paint/shader/raymarch) that are one idea in five costumes.

Adding a layer TYPE is already easy (one file, two exports, one registry line). Adding an EFFECT is not,
and effects are what visual range is made of.

**What shipped, where the plan was wrong.** The slot is **`modifiers`**, not `fx`. The argument for the
slot above is unchanged and still worth reading; only the NAME was wrong, and it was wrong because `fx`
was already taken. `L.fx` has been the named-GSAP-effect slot since `core/engine/gsap-effects.js` shipped, with
`L.fxOut` as its exit half; it is in the schema with that meaning, `formats/scene/scene.js:576` gates
kinetic-unit animation on `!L.fx`, and `applyGsapHooks` warns on any entry the effect registry does not
know. Two dispatch tables in one prop, told apart by whether an object carries a `name` key, would have
broken both of those silently. The example was wrong for a second reason: `{"shadow":"key"}` implies
named lights, and there is ONE scene light (`lighting: {x, y, intensity?}`). A named-light registry is a
different feature, not part of this one.

Registry at `core/fx/index.js`; an unknown modifier name is a hard error, never a skipped entry.

---

## 3. The three primitives, as modifiers  ·  DONE (`94be3a9`, `53a5df0`, `e70bad1`)

Per-layer 3D tilt · occlusion masking · shadows keyed to a light direction.

Phase 0 already proved the 3D construction: camera on the layers' DIRECT parent, since any intervening
element flattens (`transform-style: flat` is the default, not overflow or filter as first assumed).
Spike lives at `scripts/dev/spike-3d.mjs` and self-checks.

Build them as `modifiers`, not as new types. Doing them before item 2 entrenches exactly the problem
item 2 exists to fix.

**What the spike did not say.** "The DIRECT parent" is one element in the spike and THREE in the engine:
`#cam`, the per-beat `.hs-beat` wrapper that exists only under `sceneUnits` (`formats/scene/scene.js:236`),
and the group element for a group child. A camera written on `#cam` alone is flattened for every layer in
a `sceneUnits` scene. Shipped as `core/fx/tilt.js` · `core/fx/occlude.js` · `core/fx/shadow.js`; `lighting`
entered the schema with `shadow`, the thing that reads it.

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

## 6. Compare rendered pixels, not source  ·  later, bigger

Every audit this engine has had read code, schemas and docs, and none compared RENDERED PIXELS against
the scene that produced them. Both of the worst defects found so far lived exactly there: `--alpha`
exported an opaque file, and `boxOf` squared a single-axis layer. Determinism under `--workers`, frame
dedup and audio mixing all remain unverified in practice.

---

## 7. Widen `schema-drift`'s scan surface  ·  its own job, with a library diff

`schema-drift` scans the `scene.html` shell plus `core/layers/*.js` and nothing else
(`scripts/gates/schema-drift.mjs:27-30`). It does NOT scan `core/fx/*.js`, so every prop a MODIFIER
reads sits outside drift detection, and it does not scan `formats/scene/scene.js`, which reads ~59 props
of its own. Silent substitution is the most frequent bug class in this repo, and this gate is the thing
meant to catch it.

The modifier work deliberately left this alone. Widening the scan surfaces whatever the two unscanned
trees are already missing, and a gate change that invents findings is the shape CLAUDE.md forbids. So it
needs a before/after diff over the whole scene library, not a rider on a feature.

---

## Superseded by item 1

- ~~**Fix `boxOf` squaring single-axis layers.**~~ DONE: the `proxy` tier is deleted. `boxOf` now
  returns `{w:0,h:0,how:'unknown'}` for a single-axis layer with no readable intrinsic aspect, so no
  caller can be handed an invented area. To measure such a layer for real, measure the rendered DOM.
- ~~**Re-run the waiver census after fixing the show floor.**~~ DONE: the three codes are removed from
  every scene, and `waiver-drift` now reports them as DEAD WAIVERS if any come back.
