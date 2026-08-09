# Pending MISTAKES entries — layer-prop vocabulary (Phases 2 and 3)

Append these to `docs/MISTAKES.md` in order. Numbers are placeholders.

---

## #NNN — the schema and the engine compared layer props BY NAME, so a name could mean two things

**What.** `schema-drift` asserted "every prop the engine reads is defined somewhere in
`schema.json`". `layers.item` is a FLAT map of 193 names, so the check could only ask whether a name
appeared anywhere in the file. `src` is already defined there for `image` and `component`. A third
meaning of `src` on a different type would therefore have passed the gate in silence, and so would a
prop that moved from one type to another.

**Root cause.** A name is not a fact about a layer. The fact is a name ON A TYPE, and the schema had
no place to write that down, so the gate had nothing type-scoped to compare against.

**Fix.** `formats/scene/schema.json` now carries a generated `layerProps` block, written by
`node scripts/gates/schema-drift.mjs --write` from the `PROPS` declarations and checked in. It is
type-scoped (`byType.<type>` plus a `shared` list) and the gate fails when the committed block
differs from what the declarations produce. The hand-written `layers.item` docs stay: they carry the
labels, types and enums no declaration can, and the gate now compares the two sets BOTH ways.

**Which gate catches it.** `make schema-check` — `layerProps in sync` and
`layers.item documents exactly the N prop(s) the engine declares`.

---

## #NNN — `hue` was live in the engine and missing from the schema, because the scan only matched `L.`

**What.** A `paint` aurora layer reads `hue` (one hue for every blob, overriding the per-blob `hues`
list). The schema documented `hues` and not `hue`, so `make validate` reported
`unknown prop "hue" — the engine will ignore it silently` for a prop the engine honours. The gate
that exists to catch exactly this reported green for as long as the prop has existed.

**Root cause.** `schema-drift` found engine props by regex for `L.<prop>` / `LL.<prop>` / `C.<prop>`.
`core/paint-fx.js` receives the layer under the name `o` (the paint surface passes the layer straight
through as the options bag), so `o.hue` matched nothing. The regex is a guess about variable names,
and a guess about variable names goes stale the same way the file list before it did.

**Fix.** The comparison is now against the DECLARATIONS, which `core/paint-fx.js` has always carried
(`export const PROPS = { …, hue: {}, hues: {}, … }`). `hue` is documented in `schema.json`.

**Which gate catches it.** `make schema-check` — "the engine declares N layer prop(s) that
layers.item does not document".

---

## #NNN — `transition` was documented, read, and declared by nothing

**What.** `layers[].transition` (the unified `{ in, out, dir, dur }` sugar) is read by
`core/transitions-lower.js`, which lowers it to `anim` / `out` / `dir` / `enterDur` / `exitDur` and
deletes it before any builder runs. No module declared it, so the derived vocabulary could not
account for a prop the schema advertised and the engine honours.

**Root cause.** The declaration contract was applied to the four registry directories and the
orchestrator. A prop consumed by a lowering pass BEFORE the registry sees the layer belongs to
neither, and nothing said so.

**Fix.** `core/transitions-lower.js` exports `PROPS = { transition: {} }` beside the read, and
`core/layers/vocabulary.js` merges it into the shared half.

**Which gate catches it.** `make schema-check` — "layers.item documents N prop(s) no module
declares".

---

## #NNN — an unknown prop on a layer was accepted and then ignored, at render time

**What.** `{"type":"rect","colour":"#f00"}` rendered a rect with no colour, exit 0, no warning. The
CLI `make validate` had an unknown-prop pass, but it (a) ran only from the shell, never at boot, and
(b) compared against the FLAT `layers.item` map, so `src` on a `rect` passed.

**Root cause.** Silent substitution. The renderer read the props it knew and let the rest go by.

**Fix.** `core/layers/vocabulary.js` assembles the complete vocabulary from the declarations, and
`createRenderer(...).build()` walks the layer and every descendant and THROWS on a prop nothing
declares, naming the layer, the type, the prop and the nearest known prop by edit distance. The walk
runs from the one entry point the orchestrator calls, so a nested group (which never goes through
`kit.buildLeaf`) is judged by the same rule as a leaf — the gap behind #69 and #70.

A prop declared behind a guard the layer does not satisfy (`preset` without `split`) is NOT refused:
that is a real prop with a missing enabler, `make layer-props` already reports it, and 22 of the 23
findings in the shipped library are of that shape. A build must not die on them.

**Which gate catches it.** The renderer itself. `make beats` / `make video` / any render stops with
`SCENE ERROR: layer "…" (type "…"): unknown prop \`…\`. Did you mean \`…\`?`.

---

## #NNN — the gate and the renderer each built their own copy of "what the engine accepts"

**What.** `scripts/gates/layer-props.mjs` assembled the shared prop union from six imports. Phase 3
needed the same union inside the engine. Two unions from the same six sources agree on the day they
are written and are free to diverge afterwards, and a gate that disagrees with the renderer is worse
than no gate: it either blesses a scene the renderer will refuse, or refuses one the renderer would
have drawn.

**Fix.** One union, `SHARED_PROPS` in `core/layers/vocabulary.js`. The renderer and the gate both
read it from there.
