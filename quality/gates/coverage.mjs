// coverage.mjs, which parts of the engine has nothing ever exercised?
//
//   node quality/gates/coverage.mjs        report
//   make check GATE=coverage
//
// Conformance proves a value WORKS. This asks a different question: is anyone USING it? Vocabulary
// that no scene touches is where regressions live undetected, because nothing renders it and no
// screenshot shows it. The audio path is the worked example, no scene and no gate exercised the
// mix, so `cuts` produced no sound for as long as it existed and nobody could have noticed (#23).
//
// WARN tier by design (always exits 0). Unused vocabulary is a fact to act on, not a build failure:
// a brand-new effect is legitimately unused on the day it lands.
//
// `.claude/plans/unwired.plan.md` Phase 6: this walks AUTHORED (a `.storyboard.md` sidecar, a person
// actually planned it), not the whole library, because a catalogue tile or a held-still demo using a
// name is not an AUTHOR reaching for it (census.mjs). It also widens past schema props into the rest
// of the named vocabulary the plan's register named as unwired: idle, part entrance, three scene, and
// the storyboard-only `move:`/`motion:` grammar (shape/curve/hold), none of which is a scene-JSON key
// so none of it was visible to the schema-prop scan at all.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ANIM_NAMES } from '../../core/timeline/clips.js';
import { LAYER_TYPES } from '../../core/layers/index.js';
import { PAINT_FX_NAMES } from '../../core/surfaces/paint-fx.js';
import { PRESETS } from '../../core/type/type.js';
import { LOOK_NAMES } from '../../core/looks/index.js';
import { CANVAS_FX_NAMES } from '../../core/canvas/effects.js';
import { PRESENTATIONS } from '../../core/cuts/index.js';
import { SHADER_FX } from '../../core/stings/index.js';
import { IDLE_REGISTRY } from '../../core/engine/idle.js';
import { PART_NAMES } from '../../core/motion/parts.js';
import { THREE_FX } from '../../core/surfaces/three-scenes.js';
import { SHAPES } from '../../core/motion/shapes.js';
import { CURVE_NAMES } from '../../core/motion/path-curves.js';
import { MOTION_CUE_REGISTRY } from '../../core/audio/tactile.js';
import { BLOCKS } from '../../blocks/index.mjs';
import { population, AUTHORED } from '../../harness/lib/census.mjs';
import { SCENE_DIR } from './paths.mjs';
import { loadScene } from '../../core/engine/expand.js';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { parseStoryboard, timeline } from '../../harness/author/storyboard-parse.mjs';
import { parseMoveEntries } from '../../harness/lib/contract.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(repoRoot, SCENE_DIR);
const scenes = population('coverage · corpus', { filter: AUTHORED, quiet: true }).names
  // Two views of the same scene. `j` is LOWERED, because a boundary declared as `transitions` carries a
  // cut style and a sting fx that this report otherwise scores as unexercised, so the library looked
  // like it used less of the engine than it does (engine-doctrine/MISTAKES.md #408). `raw` is the authored file,
  // because lowering CONSUMES the unified keys, and the prop census below asks which authored props no
  // scene sets, answering that off the lowered copy would report `transition` and `mech` as dead the
  // moment somebody used them.
  .map((f) => { try { const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return { f, raw, j: loadScene(structuredClone(raw)) }; } catch { return null; } })
  .filter((x) => x && x.j.module === 'scene');

// walk every layer, including group children: a primitive used only inside a group is still used
const layersOf = (j) => { const out = [];
  const push = (ls) => { for (const l of ls || []) { out.push(l); if (l.children) push(l.children); } };
  push(j.layers); return out; };

const used = { anim: new Set(), preset: new Set(), cut: new Set(), sting: new Set(), look: new Set(),
  canvasFx: new Set(), paint: new Set(), bg: new Set(), type: new Set(), prop: new Set(),
  idle: new Set(), part: new Set(), three: new Set(), cue: new Set(), block: new Set(),
  moveShape: new Set(), pathCurve: new Set() };

// CONDITIONAL ADOPTION. Raw "N films used X" is noise here: a film picks a set of mechanisms on
// purpose and is never meant to use all of them, so a low count alone proves nothing. The signal is
// "of the films that reached for this AT ALL, how many got the better form": 18 films authored a
// cursor and 0 of 18 reached for `snapTo`; 166 films set a text size and 0 used a size ROLE
// (core/engine/produce.js resolveTextSize) instead of a raw px number. Tracked as base/better pairs
// so the report can say the fraction, not just the count.
const conditional = { cursor: { base: 0, better: 0 }, textSize: { base: 0, better: 0 } };

const idleNameOf = (v) => (v && typeof v === 'object' ? v.name : v);

for (const { j, raw } of scenes) {
  // Props live on cuts/stings/bg/camera ITEMS too, not just layers. Collecting only layer keys made
  // the report claim `t`, `dur`, `style` and `timing` were unused, they are used constantly. A
  // coverage report that cries wolf gets ignored exactly like a gate that does.
  // Read off `raw`: this census is about what an AUTHOR writes, and `transitions` is one of the things
  // an author writes, so it is counted here and not through the cuts it lowers to.
  for (const arr of [raw.cuts, raw.stings, raw.bg, raw.camera, raw.transitions]) for (const it of arr || []) if (it && typeof it === 'object') Object.keys(it).forEach((k) => used.prop.add(k));
  for (const c of j.cuts || []) if (c?.style) used.cut.add(c.style);
  for (const s of j.stings || []) if (s?.fx) used.sting.add(s.fx);
  for (const b of j.bg || []) if (b?.preset) used.bg.add(b.preset);
  if (raw.idle) used.idle.add(idleNameOf(raw.idle));
  for (const c of raw.audio?.cues || []) if (c?.name) used.cue.add(c.name);
  for (const l of layersOf(j)) {
    if (l.type) used.type.add(l.type);
    // `anim` and `out` draw from the SAME registry (core/timeline/clips.js ANIM), so counting only `anim`
    // reported `defocus` as unexercised while tpot-launch used it on five layers as an exit. A
    // coverage gate that undercounts sends you to build something that already ships.
    if (l.anim) used.anim.add(l.anim);
    if (l.out) used.anim.add(l.out);
    if (l.preset) used.preset.add(l.preset);
    if (l.canvasFx) used.canvasFx.add(typeof l.canvasFx === 'string' ? l.canvasFx : l.canvasFx.fx);
    if (l.paint) used.paint.add(l.paint);
    if (l.filter) used.look.add(String(l.filter).split(':')[0].trim());
    if (l.idle) used.idle.add(idleNameOf(l.idle));
    if (l.three) used.three.add(l.three);
    // `parts` is one spec OR an array of them (films/scene/schema.json), same dual shape validate.mjs:859
    // and motion-ir.js:80 already normalize. This line assumed array-only and threw the moment an
    // author wrote a single object, which is the common case for one part.
    for (const p of Array.isArray(l.parts) ? l.parts : l.parts ? [l.parts] : []) if (p?.anim) used.part.add(p.anim);
  }
  // Same split again: the vocabulary above is what the ENGINE renders (lowered), the props are what the
  // author wrote. A layer's `transition` is gone from the lowered copy by the time this runs.
  // `block` is read here too, before expand() consumes them: a raw `{type:"block",block:"x"}`
  // is gone from `j` by the time this loop runs, replaced by the layers it expanded to.
  for (const l of layersOf(raw)) {
    for (const k of Object.keys(l)) used.prop.add(k);
    if (l.type === 'block' && l.block) used.block.add(l.block);
    if (l.type === 'cursor') { conditional.cursor.base++; if (l.snapTo && l.snapTo.length) conditional.cursor.better++; }
    if (typeof l.size !== 'undefined' && l.size !== null) { conditional.textSize.base++; if (typeof l.size === 'string') conditional.textSize.better++; }
  }
}

// The storyboard-only `move:`/`motion:` grammar (harness/lib/contract.mjs): a shape or path curve here
// never becomes a scene-JSON key (a `layer`-scope entry keys x/y/scale by hand; a `path`-scope entry
// becomes `motionPath`, already caught by the schema-prop scan), so it is invisible to every loop
// above. Read straight from the sidecar, the only place the choice survives.
for (const f of scenes.map((s) => s.f)) {
  const sbPath = path.join(dir, `${path.basename(f, '.json')}.storyboard.md`);
  let sb; try { sb = parseStoryboard(fs.readFileSync(sbPath, 'utf8')); } catch { continue; }
  const { beats } = timeline(sb);
  for (const b of beats) for (const raw of [...parseMoveEntries(b.move), ...parseMoveEntries(b.motion)]) {
    if (raw.error) continue;
    if (raw.scope === 'layer') used.moveShape.add(raw.shape);
    if (raw.scope === 'path') used.pathCurve.add(raw.curve);
    if (raw.scope === 'part') used.part.add(raw.kind);
    if (raw.scope === 'hold') used.idle.add(raw.name);
  }
}

const schemaProps = (() => { const s = JSON.parse(fs.readFileSync(path.join(dir, 'schema.json'), 'utf8'));
  const out = new Set(); const walk = (o) => { if (!o || typeof o !== 'object') return;
    if (o.properties) Object.keys(o.properties).forEach((k) => out.add(k));
    if (o.item && typeof o.item === 'object') Object.keys(o.item).forEach((k) => out.add(k));
    for (const k in o) walk(o[k]); }; walk(s); return out; })();

const GROUPS = [
  ['layer type', LAYER_TYPES, used.type],
  ['enter anim', ANIM_NAMES, used.anim],
  ['kinetic preset', Object.keys(PRESETS), used.preset],
  ['cut style', Object.keys(PRESENTATIONS), used.cut],
  ['shader sting', SHADER_FX, used.sting],
  ['composite look', LOOK_NAMES, used.look],
  ['canvas fx', CANVAS_FX_NAMES, used.canvasFx],
  ['paint fx', PAINT_FX_NAMES, used.paint],
  ['idle', IDLE_REGISTRY.names, used.idle],
  ['part entrance', PART_NAMES, used.part],
  ['three scene', THREE_FX, used.three],
  ['sound cue', MOTION_CUE_REGISTRY.names, used.cue],
  ['block', Object.keys(BLOCKS), used.block],
  ['move shape (storyboard)', Object.keys(SHAPES), used.moveShape],
  ['path curve (storyboard)', CURVE_NAMES, used.pathCurve],
];

// reach.json (`.claude/plans/subtraction.plan.md` Phase 1) already split 94 schema props into
// unreachable / unwanted / unsure by hand. Reuse those verdicts rather than re-deriving them: a prop
// with no verdict here is simply one this report finds newly dark since that census ran.
const reachVerdicts = (() => { try {
  const r = JSON.parse(fs.readFileSync(path.join(repoRoot, 'quality/baselines/reach.json'), 'utf8'));
  return new Map(r.props.map((p) => [p.path, p.verdict])); } catch { return new Map(); } })();

const gaps = [];
for (const [label, all, seen] of GROUPS) {
  const unused = all.filter((v) => !seen.has(v));
  if (unused.length) gaps.push([label, unused]);
}

// props the schema declares that NO scene sets: the surface most likely to rot unnoticed
const unusedProps = [...schemaProps].filter((p) => !used.prop.has(p)).sort();

/**
 * darkVocabularySummary() -> total dark (never-used) names across every group above, plus the total
 * named. For a one-line nudge elsewhere that should not re-run this whole report or print anything
 * itself.
 */
export function darkVocabularySummary() {
  const total = GROUPS.reduce((n, [, all]) => n + all.length, 0);
  const dark = gaps.reduce((n, [, unused]) => n + unused.length, 0);
  return { total, dark, groups: gaps.length, unusedProps: unusedProps.length };
}

// adoptionCount() -> how much of the engine's vocabulary the AUTHORED library actually reaches: every
// name any group counted as used, plus every schema prop some scene set. This is the ONE number the
// ratchet below tracks. THE DIRECTION IS THE DESIGN DECISION: adoption must not FALL. A capability a
// film used going back to zero is a regression the same way a test going from pass to fail is, and
// catching that is also what makes this gate a deletion tool the other way: a name that never moves
// off zero across many stamps is a candidate for removal, not promotion.
function adoptionCount() {
  const usedNames = GROUPS.reduce((n, [, all, seen]) => n + all.filter((v) => seen.has(v)).length, 0);
  const usedProps = schemaProps.size - unusedProps.length;
  return usedNames + usedProps;
}

const RATCHET = path.join(repoRoot, 'quality/baselines/coverage-ratchet.json');

// Only print the report (and only exit through the WARN-tier gate) when run directly. Importing this
// module for `darkVocabularySummary()` must be silent and side-effect-free.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  console.log(`── coverage across ${scenes.length} AUTHORED scene(s) (a .storyboard.md sidecar exists)\n`);
  for (const [label, all, seen] of GROUPS) {
    const unused = all.filter((v) => !seen.has(v));
    const pct = Math.round(((all.length - unused.length) / all.length) * 100);
    const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '·');
    console.log(`   ${label.padEnd(24)} ${bar} ${String(pct).padStart(3)}%  ${all.length - unused.length}/${all.length}`);
  }

  // Never-used first within a group carries no real order (a Set has none), so sort dark props by
  // whether reach.json already called them out as `unreachable` (a bug: nobody CAN reach this), because
  // that is the actionable half of "never used" and should not be buried in a flat alphabetical dump.
  const annotate = (p) => reachVerdicts.has(p) ? `${p} (${reachVerdicts.get(p)})` : p;
  const byVerdict = (a, b) => (reachVerdicts.get(a) === 'unreachable' ? -1 : 0) - (reachVerdicts.get(b) === 'unreachable' ? -1 : 0);

  console.log('\n── conditional adoption (of the films that reached for this, how many got the better form)\n');
  const pct = (b, t) => (t ? Math.round((b / t) * 100) : 0);
  console.log(`   cursor → snapTo          ${conditional.cursor.better}/${conditional.cursor.base} cursor layer(s) snap to a live target (${pct(conditional.cursor.better, conditional.cursor.base)}%)`);
  console.log(`   text size → size role    ${conditional.textSize.better}/${conditional.textSize.base} sized text layer(s) use a role, not a raw px number (${pct(conditional.textSize.better, conditional.textSize.base)}%)`);

  console.log('\n── unexercised vocabulary (nothing renders these, so nothing would notice a regression)\n');

  // WARN tier by design for the vocabulary list itself: unused vocabulary is a fact to act on, not a
  // build failure. The ADOPTION RATCHET below is the one thing in this file that can fail a run.
  const f = gateFindings({ line: (r) => `   ${r.summary}` });
  for (const [label, unused] of gaps) f.warn('unexercised', `${label}: ${unused.length}\n      ${unused.join(', ')}\n`, { at: label });
  if (unusedProps.length) {
    const sorted = [...unusedProps].sort(byVerdict);
    f.warn('unexercised-prop', `schema props no scene sets: ${unusedProps.length} (verdict from quality/baselines/reach.json where known)\n      ${sorted.map(annotate).join(', ')}\n`);
  }

  // THE RATCHET. Same shape as output-contract.mjs and harness/dev/blocking-findings-check.mjs: count
  // today, compare to a stamped baseline, --stamp to move the baseline on purpose. The direction here
  // is the opposite of those two (they ratchet a defect count DOWN); this ratchets adoption UP, because
  // a capability the library already reached that falls back to zero use is a regression this gate
  // exists to catch, not noise to average away.
  const adoption = adoptionCount();
  const prior = (() => { try { return JSON.parse(fs.readFileSync(RATCHET, 'utf8')); } catch { return null; } })();
  let ratchetFailed = false;

  if (process.argv.includes('--stamp')) {
    fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
    fs.writeFileSync(RATCHET, `${JSON.stringify({ adoption, authoredFilms: scenes.length }, null, 1)}\n`);
    console.log(`\n  ✓ adoption ratchet stamped at ${adoption} name(s)/prop(s) used, across ${scenes.length} AUTHORED film(s)`
      + `${prior ? `, ${adoption >= prior.adoption ? 'up' : 'DOWN'} from ${prior.adoption}` : ''}\n`);
  } else if (prior && adoption < prior.adoption) {
    ratchetFailed = true;
    f.fail('coverage-adoption-fell', `engine adoption fell to ${adoption} name(s)/prop(s) used, down from the stamped ${prior.adoption} `
      + `(across ${prior.authoredFilms ?? '?'} AUTHORED film(s) at stamp time, ${scenes.length} now)`, {
      at: 'quality/baselines/coverage-ratchet.json',
      fix: 'a scene that used to exercise a layer type, anim, preset, cut, sting, look, fx, idle, part, '
        + 'three scene, sound cue, block, storyboard shape/curve, or schema prop stopped. Diff this run '
        + "against the ratchet's authoredFilms count and the vocabulary lists above to find which name "
        + 'went dark, then restore the scene that used it or, if the drop is deliberate, re-stamp: '
        + 'node quality/gates/coverage.mjs --stamp',
    });
  } else if (prior && adoption > prior.adoption) {
    console.log(`\n  ~ adoption rose to ${adoption}, above the stamped ${prior.adoption}. Raise the ratchet: `
      + 'node quality/gates/coverage.mjs --stamp\n');
  } else if (!prior) {
    console.log('\n  (no adoption ratchet stamped yet: node quality/gates/coverage.mjs --stamp)\n');
  } else {
    console.log(`\n  ✓ adoption holds at the ratchet (${prior.adoption})\n`);
  }

  f.emit();

  console.log('Conformance proves these WORK; coverage says nothing USES them. The audio path had zero of');
  console.log('both, which is why the cuts array produced no sound for as long as it existed (#23).');

  if (ratchetFailed) process.exit(1);
}
