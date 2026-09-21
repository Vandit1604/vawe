// quality/gates/direction-floor.mjs: THE AMBITION FLOOR. The inverse of effect-soup.
//
// effect-soup (motion-director) is the UPPER bound: too many effects, undirected. Nothing was the LOWER
// bound, so a video that is all `rise`+`fade`, no camera, no kinetic type, no transitions (a plain
// slideshow) passed every gate. That is the exact failure an agent regresses to from a blank JSON: it
// satisfices with the safe default and never reaches for the range it has. This gate closes the band:
// a video must be neither soup nor slideshow. "Directed" lives between.
//
// It reads the scene's MOTION VOCABULARY, kinetic type, count-ups, camera moves, transitions, ken push,
// cursors, custom motion tracks, fx, background motion, and blueprint beats, and fails a video that
// uses almost none of it. A scene composed from blueprints (`{type:"beat"}`) is directed by construction.
//
//   node quality/gates/direction-floor.mjs <scene.json> [--strict]   ·   make direction-floor D=<file>
// It also reads the scene as a CONTINUITY: on a short film, one content object must survive each cut
// and CHANGE there (`no-continuous-object`). A film whose every beat is an island is a slideshow no
// matter how much motion each island contains. Boundaries come from two places, DECLARED (`cuts` /
// `seams` / `transitions`, blocking) and INFERRED from the layer windows when the scene declares none
// (`no-continuous-object-inferred`, coaching), because a film of cross-faded islands never cuts.
// The engine's beat wrapping decides which layers CAN be a spine (a layer the wrapper confines to its
// own beat is not a candidate); the fact that it truncates them is reported by beat-check, always on.
// FAIL (blocks): `plain-slideshow` · `no-continuous-object`. WARN (coaching): no-continuous-object-inferred ·
// no-kinetic-type · no-camera · no-transition · no-bg-motion · low-vocab. Waive a deliberate minimal
// film with {"authoring":{"allow":["plain-slideshow"]}}.
// A film held by a NON-OBJECT device (a motif, an escalation, a metric cut rate, a sound bridge:
// engine-doctrine/CRAFT/FILM-STRUCTURE.md) is legitimate structure this gate cannot verify, so it routes through
// the reasoned waiver too: {"authoring":{"allow":["no-continuous-object"],"_why":{...}}}. The gate
// credits only the two devices the engine PRODUCES (a continuous object, a match cut); the rest are a
// declaration someone wrote down, not something a static gate can confirm. See FIX_MSG below.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { motionAt } from '../../core/timeline/sequence.js';
import { bgPreset } from '../../core/backgrounds/index.js';
import { typedLen } from '../../core/layers/text.js';
import { clamp01 } from '../../core/motion/motion.js';
import { sceneDims } from '../../core/layout/safe.js';
import { sceneTiming } from './scene-timing.mjs';
import { glyphText, snippet } from '../../harness/lib/text.mjs';
import { flattenLayers } from '../../harness/lib/layers.mjs';
import { loadScene } from '../../core/engine/expand.js';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { adaptFinding } from '../../harness/lib/safeguards.mjs';
import { junctionTable, marksOf, resolveJunction, isJunctionRef } from '../../core/timeline/junctions.js';
import { population, AUTHORED } from '../../harness/lib/census.mjs';
import { pickRecipe } from '../../recipes/index.mjs';

// ── THE 15 EXPRESSIVE FAMILIES, named once ──────────────────────────────────────────────────────
// Both the per-film `vocab` (below, from `sig`) and the library-wide census (`libraryProfile`) key on
// this same set of names, so a family counted here is the family suggested there. One vocabulary.
const HIGH_VALUE = [
  ['camera', 'a camera move (cameraMove: slowPush / diveIn)'],
  ['motionTrack', 'a hand-keyed motion track (make track)'],
  ['countup', 'a count-up (a count layer)'],
  ['cursor', 'a cursor demo'],
  ['ken', 'a ken push on an image'],
  ['fx', 'a per-layer effect'],
  ['svgMotion', 'an svg that draws itself on'],
  ['beam', 'a border-beam accent'],
  ['composition', 'a bespoke composition beat'],
];

// ── THE ANTI-TEMPLATE CHECK: a bar derived from the LIBRARY, not a constant somebody chose ─────────
// The research this repo argues from (engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md's own census, and an
// outside anti-template checklist) found the same shape twice: a tool with 800+ named
// things and an author who still reaches for the same five every time, because same-tool-same-result is
// what an unforced default produces. Refusing "too few effects" (feature-poverty, above) does not catch
// this: a film can clear that floor by using three of the FIVE things everyone already reaches for and
// still be indistinguishable from the last twenty. So this asks a different question: not "how many
// families" but "which ones, measured against what the library itself already leans on".
//
// libraryProfile() answers it from real files, not a guess: for every AUTHORED film this checkout can
// see (harness/lib/census.mjs: a `.storyboard.md` sidecar, not the bigger `LIBRARY` population, because
// LIBRARY still carries still-tile catalogues and held-still demos that would drag this floor down for
// having never moved on purpose), which of the 15 families does it use at least once, and what cadence
// (stagger / per-unit `each`) values does it author. The result moves as the library moves; nobody has
// to remember to update a threshold when the library's habits change.
let _libProfile = null;
function libraryProfile() {
  if (_libProfile) return _libProfile;
  const { names, blind } = population('direction-floor · library profile', { filter: AUTHORED, quiet: true, soft: true });
  const dir = path.join(repoRoot, 'films/scene');
  const famCount = {};
  const cadence = [];
  let n = 0;
  for (const f of names) {
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    if (j.module !== 'scene') continue;
    n++;
    const ls = flattenLayers(j.layers || []);
    const fam = new Set();
    if (ls.some((l) => l.type === 'beat' || l._beat)) fam.add('beats');
    if (ls.some((l) => l.split || l.preset || l.fx || (Array.isArray(l.motion) && l.motion.length) || l.ken)) fam.add('kineticText');
    if (ls.some((l) => l.type === 'count')) fam.add('countup');
    if ((j.camera && j.camera.length > 1) || j.cameraMove) fam.add('camera');
    if ((j.cuts || []).length || (j.seams || []).length || (j.transitions || []).length) fam.add('transition');
    if (ls.some((l) => l.ken)) fam.add('ken');
    if (ls.some((l) => l.type === 'cursor')) fam.add('cursor');
    if (ls.some((l) => Array.isArray(l.motion) && l.motion.length > 1)) fam.add('motionTrack');
    if (ls.some((l) => l.fx)) fam.add('fx');
    if (ls.some((l) => l.type === 'beam')) fam.add('beam');
    if (ls.some((l) => l.type === 'paint')) fam.add('paint');
    if (ls.some((l) => l.type === 'glow' && l.flash)) fam.add('glowFlash');
    if (ls.some((l) => l.type === 'svg' && (l.draw || l.morph))) fam.add('svgMotion');
    if (ls.some((l) => l.type === 'composition')) fam.add('composition');
    const bgArr = Array.isArray(j.bg) ? j.bg : (j.bg ? [j.bg] : []);
    if (bgArr.some((b) => b && (b.mode || b.period || b.driftX != null || b.driftY != null || (b.preset && b.preset !== 'black')))) fam.add('bgMotion');
    for (const k of fam) famCount[k] = (famCount[k] || 0) + 1;
    for (const l of ls) {
      const s = l.stagger;
      if (typeof s === 'number') cadence.push(s);
      else if (s && typeof s === 'object' && typeof s.each === 'number') cadence.push(s.each);
      if (typeof l.each === 'number') cadence.push(l.each);
    }
  }
  const ranked = Object.entries(famCount).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  _libProfile = { n, ranked, top5: new Set(ranked.slice(0, 5)), famCount, cadence, blind: blind || null };
  return _libProfile;
}

// ── ROUTE THROUGH THE AE RECIPES TABLE, INSTEAD OF DUPLICATING IT ──────────────────────────────────
// engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md already carries 26 named recipes with a HAVE/PARTLY/LACK verdict
// and the exact field to reach for; nothing consulted it at the moment a beat gets picked. This reads
// the table LIVE and answers one question ("which HAVE recipe covers this family?") from it, so the
// only thing kept here is a search TERM per family, never the recipe's name, verdict or field, which
// stays owned by the doc. A doc rename or a verdict flip is read on the next run, not stale here.
let _aeTable = null;
function aeTable() {
  if (_aeTable) return _aeTable;
  let text = '';
  try { text = fs.readFileSync(path.join(repoRoot, 'engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md'), 'utf8'); } catch { _aeTable = []; return _aeTable; }
  const section = text.split('## The table')[1] || '';
  const rows = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*\*\*(.+?)\*\*\s*\|.*?\|\s*\*\*(HAVE|PARTLY|LACK)\*\*\s*\|\s*(.+?)\s*\|\s*$/);
    if (m) rows.push({ num: +m[1], name: m[2], verdict: m[3], where: m[4] });
  }
  _aeTable = rows;
  return _aeTable;
}
// One unique substring per family, checked against every row's `where` text (see the table printed
// by `engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md`'s own header) so each resolves to exactly the row it names,
// not the first row that happens to share a common word. `fx` and `composition` have no clean single-row
// answer in the table (both are catch-alls), so they are left unmapped rather than forced onto a wrong
// citation: aeRecipeFor returns null and the caller falls back to its own description alone.
const AE_LOOKUP = {
  camera: 'cameraShake', motionTrack: 'motion key', countup: 'count', kineticText: 'wordBlast',
  svgMotion: 'svg', beam: 'beam', ken: 'ken', paint: 'matte',
};
const aeRecipeFor = (key) => {
  const term = AE_LOOKUP[key];
  if (!term) return null;
  const hit = aeTable().find((r) => r.verdict === 'HAVE' && r.where.toLowerCase().includes(term));
  return hit ? `AE recipe #${hit.num} "${hit.name}" (${hit.where}), engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md` : null;
};

const file = process.argv[2];
const strict = process.argv.includes('--strict');
if (!file) { console.error('usage: node quality/gates/direction-floor.mjs <scene.json> [--strict]'); process.exit(2); }
// The floor coaches on the RAW AUTHORED scene (what you wrote), NOT the produced one, the engine injects
// the baseline at render (core/engine/produce.js), so these WARNs read as "author this deliberately instead of
// leaning on the injected default." Judging the produced scene would mask the very conditions this gate
// exists to surface (and defeat gate-mutation's ability to prove the gate can fire).
// The unified `transitions` surface is SUGAR: the engine lowers it to cuts/seams/stings before it
// renders anything (core/transitions/lower.js), and until this line the gates did not, so a scene
// that declared its boundaries the documented way was read as a film with no boundaries at all.
// Lowering here is idempotent and a no-op for a scene that already writes raw `cuts`. MISTAKES #380.
//
// A `recipes[]` line of kind `seam` (recipes/index.mjs) is ALSO a declared boundary, and it is the one
// the expanded scene `d` below cannot show: recipes/expand.mjs compiles a seam straight to plain
// `motion` keys on the layers it names (there is no single named primitive for "travel derived from
// these two layers' own boxes"), and deletes `recipes` in the same pass. So `sig.transition` below,
// read off `d.seams`/`d.cuts`, counted zero for a film whose every joint is a seam recipe, and
// `no-transition` fired on a film that had in fact earned several real seams. Count seam recipes on
// the RAW scene, before expandScene deletes them, same as `d` is still read post-expansion for every
// other signal (nothing else this gate reads is hidden by recipe expansion; verified against vawe-flow,
// whose five `flow-seam` lines were the film that exposed this).
const rawText = fs.readFileSync(file, 'utf8');
const rawRecipes = (JSON.parse(rawText).recipes) || [];
const seamRecipeCount = rawRecipes.filter((r) => {
  try { return pickRecipe(r.recipe).kind === 'seam'; } catch { return false; }
}).length;
const d = loadScene(JSON.parse(rawText));
const allow = new Set((d.authoring && Array.isArray(d.authoring.allow)) ? d.authoring.allow : []);

// FIX 6: the two SLIDESHOW waivers must be BACKED BY A PLAN. `no-continuous-object` and `plain-slideshow`
// are the rules a reflex `allow` silences, so honour their waiver only when the storyboard beside this
// scene names `threads:` (what holds the film, engine-doctrine/CRAFT/FILM-STRUCTURE.md). A waiver with a `_why` but
// no named device is the "make the gate stop talking" move; here it is simply not honoured, and this
// gate reports the finding as FAILing whichever film it is, old or new.
//
// SEVERITY (blocks or not) is decided one level up, in author-check.mjs's HARD_CODES step, against
// quality/baselines/direction-floor-corpus.json (the frozen list of films that predate this rule): a
// film on that list still gets the plain bare-waiver forgiveness the library's 51 existing waivers on
// these two codes already rely on; a film NOT on it gets forgiven only by what THIS gate already
// honoured above, a plan-backed waiver. So this tightens NEW films without breaking legacy ones.
const PLAN_BACKED_WAIVERS = new Set(['no-continuous-object', 'plain-slideshow']);
let planThreads = '';
try {
  const fm = fs.readFileSync(file.replace(/\.json$/, '.storyboard.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/);
  const m = fm && fm[1].match(/^threads:\s*(\S.*)$/m);
  planThreads = m ? m[1].trim() : '';
} catch { planThreads = ''; }
const canWaive = (code) => !(PLAN_BACKED_WAIVERS.has(code) && !planThreads);

// `not:` (engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md): the defaults THIS film refuses, in the author's own
// words. adaptFinding reads it for plain-slideshow, the same way planThreads above is read for the
// waiver check: a film that already named "no kinetic type" as a deliberate exclusion should not then
// fail for doing exactly that.
let planNot = '';
try {
  const fm = fs.readFileSync(file.replace(/\.json$/, '.storyboard.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/);
  const m = fm && fm[1].match(/^not:\s*(\S.*)$/m);
  planNot = m ? m[1].trim() : '';
} catch { planNot = ''; }

// flatten every layer, including group children and beat descriptors.
const flat = flattenLayers(d.layers);

const texts = flat.filter((l) => (l.type === 'text' || l.type == null) && l.text);
const headlines = texts.filter((l) => (l.size ?? 0) >= 40 && l.font !== 'mono');
const isExpressiveText = (l) => !!(l.split || l.preset || l.fx || Array.isArray(l.motion) || l.ken);
const plainHeadlines = headlines.filter((l) => !isExpressiveText(l));

// background motion: a bg WINDOW on a moving preset, or a shader / canvasFx / three layer.
// ASK THE PRESET, DO NOT MATCH ITS NAME. This was a hand-kept regex over preset names, and a hand-kept
// list of a fact somebody else owns is the drift this codebase logs most: it called EIGHT of the 22
// presets flat while they animate (paperDots, paperShapes, soft, accent, shapes, brandglow, ink, blobs),
// so a film on the loud brand field was told its backdrop was dead. The owner of "does this move" is
// `bgPreset` in core/backgrounds/index.js: it returns the fx list that renderBg(…, t) paints, and `grain` is
// the only fx that is not motion (film grain over a still base). That is the same split BG_BLURBS
// states in prose (FLAT = plain · paper · accentPlain · dark · deep) now read off the code instead of
// restated here. An unknown name throws there (#361) and is not this gate's finding to report.
// THE MARKUP OF A HAND-AUTHORED FRAGMENT, from either place it can live. `html` is the markup inline in
// the scene JSON and `src` is the SAME markup in a file (core/type/sanitize-html.js `htmlSource` is the one
// resolver the renderer uses, and it takes both). Every reader here used to look at `html` only, so a
// fragment written to a file. The documented alternative, and the only sane one past a few lines, was
// read as empty markup: its `var(--t)` backdrop counted as a dead field, and an `html` layer holding the
// film across a cut was not even a candidate spine. A gate that can only see one of two documented
// spellings reports on the spelling, not on the film.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const htmlOf = (o) => {
  if (!o || typeof o !== 'object') return '';
  if (typeof o.html === 'string') return o.html;
  if (typeof o.src !== 'string') return '';
  // `src` is repo-root relative (core/engine/preload.js roots it at '/'), so it resolves the same from any cwd.
  try { return fs.readFileSync(path.join(repoRoot, o.src), 'utf8'); } catch { return ''; }
};
const movingPreset = (name, value) => {
  try { return (bgPreset(name ?? undefined, value).fx || []).some((f) => f && f.type !== 'grain'); }
  catch { return false; }
};
// ...and a HAND-AUTHORED backdrop (core/layout/bg-html.js) animates by being a function of `var(--t)`, the one
// thing it is allowed to move by, CSS animation is disabled engine-wide and the sanitiser rejects it.
// Without this the escape hatch for a backdrop the preset vocabulary cannot express was told it was a
// flat field, which pushes the author back onto the presets: the opposite of what it exists for.
const animatedWin = (b) => b && (movingPreset(b.preset, b.value)
  || b.mode != null || b.period != null || b.driftX != null || b.driftY != null
  || /var\(\s*--[tp]\b/.test(htmlOf(b)));
const hasBgMotion = (Array.isArray(d.bg) ? d.bg : (d.bg ? [d.bg] : [])).some(animatedWin)
  || flat.some((l) => l.shader || l.canvasFx || l.three || l.raymarch || l.type === 'paint');

// camera actually MOVES (s/x/y changes across keyframes), not a static [{s:1},{s:1}].
const cam = d.camera || [];
const camKf = cam.length > 1 && cam.some((k) => (k.s ?? 1) !== (cam[0].s ?? 1) || (k.x ?? 0) !== (cam[0].x ?? 0) || (k.y ?? 0) !== (cam[0].y ?? 0));
// the `cameraMove` sugar (core/camera-moves/index.js) IS a camera move, and `loadScene` above already bakes
// it to `d.camera` (core/engine/expand.js), so `cam`/`camKf` normally see it there. `camSpecs` below stays as
// a defensive fallback for a scene handed to this gate before baking (a raw JSON in a test fixture),
// so a film using the documented `cameraMove` form is never told its camera never moves.
// The sugar is documented as an OBJECT (`"cameraMove": { "move":"diveIn" }`, core/camera-moves/index.js),
// which core/engine/expand.js accepts alongside an array. Only crediting the array meant a film using the
// documented form was told its camera never moves while the camera was moving.
const camSpecs = Array.isArray(d.cameraMove) ? d.cameraMove : (d.cameraMove ? [d.cameraMove] : []);
const camSugar = camSpecs.some((m) => m && (m.move || (m.from != null && m.to != null && m.from !== m.to) || (m.tx != null) || (m.ty != null)));
const camMoves = camKf || camSugar;

const sig = {
  // `l._beat` (core/engine/expand.js): the beat a layer came from. `l.type === 'beat'` never survives to
  // this gate any more, sugar expands at LOAD time now, so the raw type is gone by the time a scene
  // reaches here; the annotation is what is left to recognise "composed from a blueprint" by.
  beats: flat.filter((l) => l._beat || l.type === 'beat').length,
  kineticText: texts.filter(isExpressiveText).length,
  countup: flat.filter((l) => l.type === 'count').length,
  camera: camMoves ? 1 : 0,
  transition: (d.seams || []).length + (d.cuts || []).length + flat.filter((l) => l.cut).length + seamRecipeCount,
  ken: flat.filter((l) => l.ken).length,
  cursor: flat.filter((l) => l.type === 'cursor').length,
  motionTrack: flat.filter((l) => Array.isArray(l.motion) && l.motion.length > 1).length,
  fx: flat.filter((l) => l.fx).length,
  bgMotion: hasBgMotion ? 1 : 0,
  // the killer per-frame effects (engine-doctrine/EFFECTS.md): a border-beam/shine, a paint field, a glow flash, an
  // svg logo that draws-on or shape-morphs. Each is a distinct directed technique the floor now credits.
  beam: flat.filter((l) => l.type === 'beam').length,
  paint: flat.filter((l) => l.type === 'paint').length,
  glowFlash: flat.filter((l) => l.type === 'glow' && l.flash).length,
  svgMotion: flat.filter((l) => l.type === 'svg' && (l.draw || l.morph)).length,
  // a `composition` layer is a bespoke hand-authored per-beat GSAP timeline, directed by construction
  // (a multi-tween motion-graphics beat), so it counts as its own technique. compositions/index.js.
  composition: flat.filter((l) => l.type === 'composition').length,
};
// distinct expressive TECHNIQUES in play (a beat counts, since it emits several).
const vocab = Object.entries(sig).filter(([, v]) => v > 0).map(([k]) => k);
const directedByBeats = sig.beats > 0;

const findings = [];
const fail = (code, msg) => findings.push({ sev: 'FAIL', code, msg });
const warn = (code, msg) => findings.push({ sev: 'WARN', code, msg });
// A hard-fail that the film's own `not:` line, or its adaptive registry entry, may downgrade to a
// report: adaptFinding is asked first, and only fails outright when it declines.
const raise = (code, msg, ctx) => {
  const adapted = adaptFinding({ kind: code }, ctx).adapted;
  if (adapted) { console.log(`  ${adapted.line}`); warn(code, msg); }
  else fail(code, msg);
};

if (!directedByBeats) {
  const plainShare = headlines.length ? plainHeadlines.length / headlines.length : 0;
  const notCtx = { not: planNot ? [planNot] : [] };
  // THE HARD FLOOR: a plain slideshow. No kinetic type, no camera, no transitions, and a thin vocab.
  if (sig.kineticText === 0 && !camMoves && sig.transition === 0 && vocab.length < 2) {
    raise('plain-slideshow', `this reads as a SLIDESHOW: no kinetic typography, no camera move, no transitions, motion vocabulary = {${vocab.join(', ') || 'none'}}. Compose from blueprints ({type:"beat"}) or add kinetic reveals + a camera move + seams. See engine-doctrine/CRAFT/BLUEPRINTS.md + DIRECTION.md.`, notCtx);
  } else if (headlines.length >= 4 && plainShare >= 0.85 && sig.kineticText === 0) {
    raise('plain-slideshow', `${plainHeadlines.length}/${headlines.length} headlines just fade/rise with no kinetic reveal. The plain-authoring tell. Give headlines split+preset (words rise/scale), or use a blueprint beat.`, notCtx);
  }
  // coaching WARNs: the range this video is leaving on the table.
  if (sig.kineticText === 0) warn('no-kinetic-type', 'no kinetic typography anywhere (no split+preset headline). A directed video reveals key lines word-by-word, MOTION-SNIPPETS words-rise.');
  if (!camMoves) warn('no-camera', 'the camera never moves. One slow push (or a dive-in on a product shot) adds life without moving content. MOTION-SNIPPETS slow-push / dive-in.');
  if (sig.transition === 0) warn('no-transition', 'no seams or cuts between beats. Beats just cut flat. Earn 1-3 transitions (a dissolve, a cinematicZoom into a screen).');
}
if (!sig.bgMotion) warn('no-bg-motion', 'the background is static. A good video moves the viewer with a living backdrop (a moving gradient / mesh / aurora / shader), used brand-appropriately, not a flat field. See core/backgrounds/index.js.');

// SPEED IS THE ANTI-REPETITION LEVER (engine-doctrine/CRAFT/TRANSITIONS.md). A film whose boundaries all ride a
// gentle curve reads flat and same-y, however many effects it uses. Nudge (never block) toward a speed
// ramp on the dynamic seam: `ramp` (slow-fast-slow), `rush` (exit), `brake` (entrance).
{
  const gentle = new Set([undefined, null, 'smooth', 'linear', 'out']);
  const boundaries = [...(d.seams || []), ...(d.cuts || [])].filter((b) => b && typeof b === 'object');
  if (boundaries.length >= 2 && boundaries.every((b) => gentle.has(b.timing)))
    warn('flat-seams', `all ${boundaries.length} boundaries share one gentle speed (${boundaries.map((b) => b.timing || 'smooth').join(', ')}). Vary the VELOCITY, not just the effect: reach for a speed ramp on the dynamic seam (timing:"ramp" slow-fast-slow, "rush" on an exit, "brake" on an entrance). TRANSITIONS.md, the speed dial.`);
}
if (!directedByBeats && vocab.length < 3) warn('low-vocab', `only ${vocab.length} motion technique(s) in play (${vocab.join(', ') || 'none'}). Reach for more of the range: count-ups, ken push, a cursor demo, a custom motion track.`);

// ANTI-FRONT-LOAD: a directed video weights its cues ACROSS its length; the
// SLIDESHOW failure dumps everything in the first quarter, then freezes. A reveal = a timed content
// layer's start. If nearly all reveals land in the first 30% and the back half gets nothing new, it is a
// slideshow even when each line is kinetic. Beat-composed scenes spread starts across the film, so they
// clear this; a hand-authored front-load trips it.
const dur = d.duration || flat.reduce((m, l) => Math.max(m, (l.start ?? 0) + (l.duration ?? 0)), 0) || 1;

// BEAT DENSITY. A film long enough to need chapters but cut into only two or three beats reads as a
// few cards held too long, whatever motion each card carries. `d` is lowered, so `transitions` is
// already folded into cuts/seams; beats = declared boundaries + 1. The floor is a boundary roughly
// every 3.5s past 8s, so a 12s film needs 4 beats and a 2-beat 12s film fails. RETIRED from
// author-check's hard-code list (measured 2026-09-07): it fired on 58% of the library and every single
// occurrence was already legacy or waived, so it had zero live enforcement anywhere. It still reports
// here, plainly, as a report-tier finding.
{
  const beatBounds = (d.cuts || []).length + (d.seams || []).length;
  const beats = beatBounds + 1;
  const needed = dur >= 8 ? Math.ceil(dur / 3.5) : 0;
  if (needed && beats < needed)
    // WARN, not fail: the comment above already retired this from blocking. It was still wired
    // through `fail()`, so a legacy waiver was doing the work this severity should have done itself.
    warn('sparse-beats', `${beats} beat(s) across ${Math.round(dur * 10) / 10}s, a film this long needs about ${needed} (a boundary roughly every 3.5s). Two or three cards held for twelve seconds is a slideshow by length, not a film. Compose more beats from blueprints (make blueprints), or shorten the film. engine-doctrine/CRAFT/DIRECTION.md.`);
}

// FEATURE POVERTY (fix 8). The engine has ~15 expressive families; a film that reaches for only a
// couple, whatever its length, is using the toy box near the top. This is the enforcement half of
// "make the author reach deeper": it counts the DISTINCT families in use (the same `vocab` the ambition
// floor already reads) and fails a film that draws from too few for its length. Ratcheted in
// author-check, so new work must reach further while the legacy library is frozen. The message NAMES the
// high-value families most films skip, so the fix is "add one of these", not "go read the manual".
{
  const need = dur >= 8 ? Math.min(6, 3 + Math.floor(dur / 8)) : 0;
  if (need && vocab.length < need) {
    // ONE next family, not a shopping list: a finding with five alternatives and two inlined AE recipe
    // paragraphs buries the sentence that matters (engine-doctrine/TASTE.md, "feature-poverty" audit). Pick
    // the single highest-ranked missing family (HIGH_VALUE is already ordered by value) and, only for
    // that one, cite its AE recipe. The rest stay reachable via `make arsenal`, not inlined here.
    const missing = HIGH_VALUE.filter(([k]) => !sig[k]);
    const [topKey, topLabel] = missing[0] || [];
    const ae = topKey ? aeRecipeFor(topKey) : null;
    const others = missing.length - 1;
    raise('feature-poverty', `this film uses ${vocab.length} expressive famil(y/ies) (${vocab.join(', ') || 'none'}); a ${Math.round(dur * 10) / 10}s film should reach for about ${need}. Add ${topLabel}${ae ? `, per ${ae}` : ''}.${others > 0 ? ` (${others} other unused famil${others === 1 ? 'y' : 'ies'}: \`make arsenal Q="<the feeling>"\`.)` : ''}`, { durationSec: dur });
  }
}

// ── TEMPLATE FILM: same shape as the last twenty, whatever the vocab count says ────────────────────
// feature-poverty (above) asks "how many families"; this asks "which ones, next to what the library
// already leans on". A film can clear the count by using three of the five things every other film
// already uses and still be a template: same primitives, same defaults, the exact failure the outside
// research names (an outside anti-template checklist, cited in the doc this repo
// argues from). Both checks below derive their bar from `libraryProfile()`, never from a number chosen
// here, so the bar moves as the library's own habits move.
{
  const prof = libraryProfile();
  if (prof.n >= 8) {   // fewer than that and "the library's top 5" is not a measurement, it is noise
    // library-top5-only: this film's whole vocabulary sits inside the five families most OTHER films
    // already reach for, AND it only TOUCHES each one (≤2 instances) rather than building with it. That
    // second half is what tells a template apart from a film that leans hard into a common family:
    // higgsfield hand-keys 6 motion tracks, a common family used at unusual depth, and 6 is not a touch.
    // DEPTH IS NOT INSTANCE COUNT FOR A KEYED TRACK, and reading it that way misfires on exactly the
    // shape this engine now scaffolds by default. `sig.motionTrack` counts LAYERS carrying a track, so a
    // film with one hand-authored nineteen-key track scores 1 and reads as a touch, while six three-key
    // tracks score 6 and read as depth. That is backwards: a nineteen-key track is choreography and a
    // three-key track is a preset spelled long. A continuous-action film is one object with one deep
    // track by construction, so without this the check would fire on every film the under-15s default
    // produces. Keys are the measure for a keyed track; instances stay the measure for everything else.
    const keyDepth = flat.reduce((n, l) => n + (Array.isArray(l.motion) ? l.motion.length : 0), 0);
    const touched = (k) => (k === 'motionTrack' ? (sig[k] <= 2 && keyDepth <= 8) : sig[k] <= 2);
    if (vocab.length > 0 && vocab.length <= 3 && vocab.every((k) => prof.top5.has(k) && touched(k))) {
      // Suggest families OUTSIDE the top 5 this film has not used, ranked rarest-first in the library
      // (the ones fewest other films reach for), so the fix is the opposite of what made the film generic.
      const rare = HIGH_VALUE.filter(([k]) => !sig[k] && !prof.top5.has(k))
        .sort((a, b) => (prof.famCount[a[0]] || 0) - (prof.famCount[b[0]] || 0))
        .map(([k, v]) => { const ae = aeRecipeFor(k); return ae ? `${v} → ${ae}` : v; })
        .slice(0, 3);
      warn('library-top5-only', `this film's whole motion vocabulary (${vocab.join(', ')}) is barely `
        + `touched (≤2 uses each) and sits entirely inside ${[...prof.top5].join(', ')}, the 5 families `
        + `the other ${prof.n} films this checkout can see already reach for most `
        + `(\`node harness/lib/census.mjs\` reproduces the population${prof.blind ? `, PARTIAL checkout: ${prof.blind.split('\n')[0]}` : ''}). `
        + `Same tool, same primitives, same shape as the last twenty.`
        + `${rare.length ? ` Reach outside it: ${rare.join(' · ')}.` : ''}`);
    }
    // uniform-cadence: every staggered reveal in this film runs on the identical spacing. The outside
    // evidence this repo argues from is specifically about IDENTICAL SPACING surviving unforced, so this
    // reads the one authored cadence dial (stagger / parts each) the same way `motion-monotony` reads
    // the reveal preset, and flags it only when the library itself demonstrably uses more than one value.
    const mine = flat.map((l) => {
      const s = l.stagger;
      if (typeof s === 'number') return s;
      if (s && typeof s === 'object' && typeof s.each === 'number') return s.each;
      return typeof l.each === 'number' ? l.each : null;
    }).filter((v) => v != null);
    const libDistinct = new Set(prof.cadence.map((v) => Math.round(v * 1000) / 1000));
    if (mine.length >= 4 && new Set(mine.map((v) => Math.round(v * 1000) / 1000)).size === 1 && libDistinct.size > 1) {
      const alt = [...libDistinct].filter((v) => v !== Math.round(mine[0] * 1000) / 1000).sort((a, b) => a - b);
      warn('uniform-cadence', `all ${mine.length} staggered reveals in this film run on the identical `
        + `spacing (${mine[0]}s). The library this checkout can see (${prof.n} films) authors ${libDistinct.size} `
        + `distinct values, so this is a choice this film never made, it is the field's own default surviving `
        + `unforced. Vary it: ${alt.slice(0, 3).map((v) => `${v}s`).join(' · ') || 'try a different value per beat'}.`);
    }
  }
}

// ── NO CONTINUOUS OBJECT ─────────────────────────────────────────────────────────────────────────
// A SLIDESHOW is a film where every beat is an ISLAND: no content object survives a cut, so each
// seam is a jump between unrelated shots rather than a state change of one thing. The opposite (the
// `vawe-continuous-action` skill) is a CONTINUOUS OBJECT: one thing on screen across the cut, and it
// TRANSFORMS there. Both halves are required. A fixed logo or a watermark riding every cut is not a
// spine, it is furniture. Short films only: a 60s explainer legitimately has chapters.
const CONTINUITY_MAX_DUR = 15;   // seconds: above this, chaptered structure is legitimate
const EPS = 0.15;                // ~4 frames either side: a layer must genuinely survive, not graze
const round3 = (v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v);

// Boundaries: a hard cut, a two-scene seam blend, or a unified transition. `sceneUnits` only changes
// how `cuts` are PRESENTED (whole-beat swaps), so its boundaries are the cut times already counted.
const boundaries = [];
// How far a declared handover may sit from the boundary time recorded here. A cut IS its time; a seam
// and a lowered transition are recorded at the MIDDLE of their blend, while a `becomes` hangs on the
// mark itself, so the two are half a blend apart by construction rather than by drift.
const boundTol = new Map();
const boundary = (t, tol) => { boundaries.push(t); boundTol.set(t, Math.max(boundTol.get(t) ?? 0, tol)); };
for (const c of d.cuts || []) if (c && typeof c.t === 'number') boundary(c.t, EPS);
for (const s of d.seams || []) if (s && typeof s.t === 'number') boundary(s.t + (s.dur ?? 0.6) / 2, EPS + (s.dur ?? 0.6) / 2);
for (const tr of d.transitions || []) if (tr && typeof tr.at === 'number') boundary(tr.at + (tr.dur ?? 0.6) / 2, EPS + (tr.dur ?? 0.6) / 2);
const bounds = [...new Set(boundaries)].filter((t) => t > EPS && t < dur - EPS).sort((a, b) => a - b);

const T = sceneTiming(d);
// A layer the engine confines to its own beat CANNOT be a spine, whatever its authored window says.
// Under `sceneUnits` (core/engine/produce.js turns it on for any cut film with no choreographed `motion`
// track) films/scene/scene.js rewrites every non-last-beat layer to end with its beat, so a layer
// authored across the cut is truncated at it. `unitEnd` is exactly that rewrite: non-null means the
// engine ends this layer with its own beat. Reading the raw `start`/`duration` here passed a film
// whose spine the renderer had already cut in half (MISTAKES #183); the factual half of that finding
// now lives in the always-on beat-check as `beats-wrapped-as-units`, and this is the structural half.
const confinedToBeat = (l) => T.unitEnd(l) != null;
const [CW, CH] = sceneDims(d);
// A backdrop cannot be the spine. `track:0` is the declared backdrop lane; a full-bleed rect/glow/
// paint/beam is one by construction (the skill's "the background never cuts" carries a seam, it does
// not carry the film). An `image` is never treated as a scrim, a full-frame shot IS content.
const SCRIM_TYPES = new Set(['rect', 'glow', 'paint', 'beam']);
const isBackdrop = (l) => l.track === 0
  || (SCRIM_TYPES.has(l.type) && (l.w ?? 0) >= CW * 0.9 && (l.h ?? 0) >= CH * 0.9);
// Only TOP-LEVEL layers are candidate spines: a group child may omit `start`, which would read as
// "visible for the whole film" and hand the gate a free pass it did not earn. The group itself carries
// the timing, so nothing real is lost.
const spineCandidates = (d.layers || []).filter((l) => l && typeof l === 'object' && !isBackdrop(l) && !confinedToBeat(l));
const visible = (l) => { const s = l.start ?? 0; return [s, l.duration != null ? s + l.duration : dur]; };

// Machinery whose internal clock this gate cannot read (a blueprint beat, a bespoke composition, a
// parts build, a morph, a motion path, a playing video). Assume it transforms, a gate must not
// invent a failure out of something it cannot see (MISTAKES #25).
const opaqueMotion = (l) => l.type === 'composition' || l.type === 'beat' || l._beat || l.type === 'clip'
  || l.parts || l.morph || l.motionPath || l.gsap || l.physics
  || (l.type === 'group' && l.each)          // per-child build. On a TEXT layer `each` is the split
  || (l.type === 'cursor' && l.path)         // reveal's per-char duration, an entrance, not a transform.
  // Hand-authored html whose CSS is a function of `var(--t)` (the scene clock). Its whole appearance is
  // time-driven and no amount of reading the markup will say what it looks like at a given second. The
  // limit, stated plainly: this proves the layer changes CONTINUOUSLY, not that it changes AT the
  // boundary. A strip that morphs from numbers to bars across the cut and a clock ticking in a corner
  // are indistinguishable here. Only your eyes and `make reveal` tell those apart.
  // `htmlOf`, not `l.html`: the markup is inline OR in a `src` file, and reading only the inline
  // spelling made a film held by a fragment on disk fail `no-continuous-object` with its spine on screen.
  || (l.type === 'html' && /var\(\s*--t\b/.test(htmlOf(l)));

// The layer's pose at absolute time t, from every authored track this gate can evaluate exactly.
const poseAt = (l, t) => {
  const s = l.start ?? 0, lt = t - s;
  const p = {};
  if (Array.isArray(l.motion) && l.motion.length) {
    const m = motionAt(l.motion, lt);
    // All EIGHT channels motionAt returns, not the six that move a layer around. `w`/`h` resize the
    // element and `track` re-letters it, and dropping them made the gate blind to the exact device
    // CLAUDE.md says it makes free: a rectangle whose keyed width IS the spine. A film held by a bar
    // that advances on every cut failed `no-continuous-object` with the bar right there in the track
    // (engine-doctrine/MISTAKES.md #352). A null means "this track does not drive that property" and compares
    // equal to itself, so a layer that only moves is scored exactly as before.
    p.m = [m.dx, m.dy, m.scale, m.rot, m.opacity, m.blur, m.w, m.h, m.track]
      .map((v) => (v == null ? '-' : round3(v))).join(',');
  }
  if (l.vars) { const vd = l.varsDur ?? 1.0; p.v = round3(vd > 0 ? clamp01((lt - (l.varsDelay ?? 0)) / vd) : 1); }
  if (l.ken) {
    const k = l.ken === true ? {} : l.ken;
    const from = k.from ?? 1, to = k.to ?? 1.08, span = l.duration ?? (dur - s);
    p.k = round3(from + (to - from) * (span > 0 ? clamp01(lt / span) : 0));
  }
  if (l.typing && typeof l.text === 'string') {
    // glyphText, because this feeds typedLen and the engine's own visLen is stripLen() in
    // core/layers/text.js, innerHTML then textContent, which inserts nothing for a `<br>`.
    const visLen = glyphText(l.text).length;
    p.t = typedLen(lt, { cps: l.typing === true ? 24 : +l.typing, visLen, untype: l.untype, untypeRate: l.untypeRate });
  }
  return JSON.stringify(p);
};

// ── A MATCH CUT IS ONE FORM CARRIED BY TWO LAYERS ────────────────────────────────────────────────
// The spanning test below asks for ONE layer alive either side of the joint, and a match cut is two
// layers by construction: the outgoing form ends ON the cut and the incoming one opens there wearing
// its pose. So a film held entirely by match cuts failed this rule for doing the exact thing the
// rule's own fix message asks for by name ("every junction answers 'the X becomes the Y'"), and
// `becomes` is literally the field that writes it.
//
// `becomes` is not a claim the author makes and the gate has to trust. The engine PRODUCES the match:
// resolveBecomes (films/scene/scene.js) carries the outgoing form's centre, size and rotation onto
// the incoming layer's opening pose, and core/validate/validate.mjs refuses a handover whose two halves do not
// meet.
//
// A handover therefore SPANS a boundary and CHANGES there, both by construction: the form persists
// and its identity is what turns over. That is the strongest state change a junction can carry, not a
// weaker cousin of a keyed rectangle.
const byId = {};
for (const l of d.layers || []) if (l && typeof l === 'object' && l.id) byId[l.id] = l;
const jTable = junctionTable(marksOf(d));
const handovers = [];
const addLink = (A, B, at) => {
  if (!A || !B || A === B || isBackdrop(A) || isBackdrop(B)) return;
  if (handovers.some((L) => L.A === A && L.B === B)) return;
  handovers.push({ A, B, at });
};
for (const A of d.layers || []) if (A && typeof A.becomes === 'string') addLink(A, byId[A.becomes], null);
// WHEN the handover lands. A bare `becomes` carries no joint, so it is where the two forms meet, a
// point validate already keeps them within half a second of.
const handoverAt = (L) => {
  if (L.at != null) {
    try { return isJunctionRef(L.at) ? resolveJunction(L.at, jTable) : (Number.isFinite(+L.at) ? +L.at : null); }
    catch { return null; }
  }
  const aEnd = (L.A.start ?? 0) + (L.A.duration ?? 0);
  return (aEnd + (L.B.start ?? 0)) / 2;
};

// The spans-and-changes test, run over a list of boundary times. One object must be visible on both
// sides of SOME boundary and be in a different pose there. Returns the two layer sets so the message
// can tell "nothing crossed" apart from "something crossed but it was furniture".
const continuity = (bs) => {
  const spanning = [], transforming = [];
  for (const b of bs) {
    for (const l of spineCandidates) {
      const [s, e] = visible(l);
      if (!(s < b - EPS && e > b + EPS)) continue;
      spanning.push(l);
      if (opaqueMotion(l) || poseAt(l, b - EPS) !== poseAt(l, b + EPS)) transforming.push(l);
    }
    // A handover ON this boundary carries the form across it. `confinedToBeat` is not asked of either
    // half, and that is the point: one layer per beat is the shape a match cut HAS, and the engine
    // matches the geometry across the wrapper rather than in spite of it.
    for (const L of handovers) {
      const t = handoverAt(L);
      if (t == null || Math.abs(t - b) > (boundTol.get(b) ?? EPS)) continue;
      spanning.push(L.A);
      transforming.push(L.A);
    }
  }
  return { spanning, transforming };
};
const label = (l) => `${l.type || 'text'}${l.text ? ` "${snippet(l.text)}"` : ''}`;
const carriedMsg = (spanning) => (spanning.length
  ? `${spanning.length} layer(s) do cross a boundary (${[...new Set(spanning.map(label))].slice(0, 3).join(' · ')}) but none of them CHANGE there. A fixed logo or watermark riding the cut is furniture, not a spine.`
  : `not one content layer is visible on both sides of any boundary. Every beat is born and dies inside itself.`);
const FIX_MSG = 'Fix: name ONE object (the button, the card, the row, the token), keep it alive across the boundary, and make the boundary a state change of it (a `motion` track through it, a `vars` morph, a ken push, a typing line that keeps typing). Every junction answers "the X becomes the Y", and a MATCH CUT says that in one line: give the outgoing layer an `id` for `becomes` to name and declare `"becomes": "<the Y\'s id>"` on it, at the boundary time. The engine carries the centre, size and rotation across onto the incoming layer\'s opening pose (films/scene/scene.js resolveBecomes; core/validate/validate.mjs refuses a handover whose two halves do not meet). See skills/vawe-continuous-action/SKILL.md. OR, if this film is deliberately held by a NON-OBJECT device this gate cannot see (a motif, an escalation, a metric cut rate, a sound bridge: engine-doctrine/CRAFT/FILM-STRUCTURE.md), that is legitimate structure, not a slideshow. This gate only credits the two devices the engine PRODUCES and can verify (a continuous object and a match cut), so declare the other with a reasoned waiver, `{"authoring":{"allow":["no-continuous-object"],"_why":{"no-continuous-object":"held by <device>: <how it carries across the cuts>"}}}`. A waiver with a reason is a structural decision someone wrote down, not an admission of failure.';

// `acrossBeats: true` attaches a layer to the camera instead of its beat wrapper, keeping its authored
// window, so a spine is expressible whatever the cut style. It replaced the advice that used to live
// here, which told the author to set `"sceneUnits": false` and therefore threw on any film whose cuts
// include `iris` or `wipe` (those REQUIRE wrapping: one root can only transition through transform and
// filter, so the frame would go empty).
const hasSpine = (d.layers || []).some((l) => l && l.acrossBeats === true);
const wrapNote = (T.sceneUnits && !hasSpine)
  ? ' This film also wraps each beat as a UNIT, so the engine ends every layer with its own beat and NOTHING can survive a cut until one layer opts out: mark the layer that should carry the film `"acrossBeats": true`. `make beat-check` names each layer the wrapping shortens and by how much.'
  : '';
if (bounds.length && dur < CONTINUITY_MAX_DUR) {
  const { spanning, transforming } = continuity(bounds);
  if (!transforming.length) {
    // BLOCKS. A WARN here let every NEW slideshow through, which is the one thing this tell exists to
    // stop. The 18 pre-existing short cut-bearing scenes in films/scene/ carry an explicit
    // {"authoring":{"allow":["no-continuous-object"]}} waiver, so the gate holds new work without
    // breaking `make video` for scenes it did not cause. The same trade beat-check's `dead-air` made.
    fail('no-continuous-object', `SLIDESHOW BY CONSTRUCTION: ${dur}s with ${bounds.length} cut/seam boundary(ies) at ${bounds.map((t) => `${round3(t)}s`).join(', ')}, and ${carriedMsg(spanning)}${wrapNote} ${FIX_MSG}`);
  }
}

// ── INFERRED ISLAND BOUNDARIES ───────────────────────────────────────────────────────────────────
// A slideshow does not have to declare a cut, and the commoner shape does not: a card of lines fades
// out, an unrelated card fades in, `cuts`/`seams`/`transitions` are all empty, and the test above is
// never even eligible. Three A/B films were authored on one brief, all three declared zero boundaries,
// and the tell evaluated none of them, including a textbook slideshow (MISTAKES #163).
//
// So infer the junctions from the layer windows. An ISLAND BOUNDARY is a moment where the visible
// CONTENT set turns over: at least two content layers end just before it and at least two unrelated
// ones begin just after, counting only layers that do NOT bridge it. That is what a card swap looks
// like. A film that hands its subject off one element at a time (a headline becomes a prompt box
// becomes a button becomes a loading dot) never presents two-out-and-two-in at the same instant, so
// it stays invisible here, which is the point. An earlier attempt that inferred a boundary from any
// start-cluster fired on nearly every short scene including the good ones (#163); this one is
// deliberately narrow, because a gate that cries wolf is worse than no gate at all (#25, #159).
const TURNOVER_MIN = 2;   // layers leaving AND arriving, a CARD swaps, not a line
const STEP = 1 / 30;      // one frame
const visAt = (t) => spineCandidates.filter((l) => { const [s, e] = visible(l); return s <= t && e > t; });
const inferBounds = () => {
  const runs = [];
  let run = null;
  for (let t = EPS + STEP; t < dur - EPS; t += STEP) {
    const before = visAt(t - EPS), after = visAt(t + EPS);
    const bridge = before.filter((l) => after.includes(l));
    const exiting = before.length - bridge.length, entering = after.length - bridge.length;
    const score = Math.min(exiting, entering);
    // A junction the bridge outnumbers is a busy overlap, not an island break.
    const isBoundary = score >= TURNOVER_MIN && bridge.length < Math.max(exiting, entering);
    if (isBoundary) { if (!run) runs.push(run = { t, score }); else if (score > run.score) { run.t = t; run.score = score; } }
    else run = null;
  }
  // Drop anything already covered by a DECLARED boundary: that half has its own (blocking) verdict.
  return runs.map((r) => round3(r.t)).filter((t) => !bounds.some((b) => Math.abs(b - t) <= EPS * 2));
};
if (dur < CONTINUITY_MAX_DUR) {
  const inferred = inferBounds();
  if (inferred.length) {
    const { spanning, transforming } = continuity(inferred);
    if (!transforming.length) {
      // WARN, not FAIL, and deliberately so. These boundaries were INFERRED, not authored: the scene
      // never said "cut here", so a wrong inference blames an author for something they did not write.
      // The declared half stays blocking. Waived by either code, it is one tell, two ways of seeing it.
      warn('no-continuous-object-inferred', `SLIDESHOW BY CONSTRUCTION (inferred): ${dur}s with no declared cut, but the visible content set turns over wholesale at ${inferred.map((t) => `${t}s`).join(', ')}. Cross-faded islands are still islands. ${carriedMsg(spanning)} ${FIX_MSG}`);
    }
  }
}
const reveals = flat.filter((l) => l.track !== 0 && (l.text || l.type === 'count' || l.type === 'beat' || l._beat || l.type === 'image' || l.type === 'svg' || isExpressiveText(l))).map((l) => l.start ?? 0);
if (reveals.length >= 4) {
  const early = reveals.filter((t) => t < dur * 0.3).length / reveals.length;
  const lateHalf = reveals.filter((t) => t > dur * 0.5).length;
  if (early >= 0.8 && lateHalf === 0) warn('front-loaded', `${Math.round(early * 100)}% of reveals land in the first ${(dur * 0.3).toFixed(1)}s and the back half is frozen. The SLIDESHOW failure (everything dumped early, then static). Weight cues into the back ~50%: give each key line its own reveal beat. (engine-doctrine/CRAFT/DIRECTION.md reveal model.)`);
}
// NO TWO BEATS MOVE ALIKE: vary the motion vocabulary across the film. If every kinetic
// line uses the identical reveal preset, the video moves monotonously even when each beat is "kinetic".
const presets = flat.filter((l) => l.preset).map((l) => l.preset);
if (presets.length >= 5 && new Set(presets).size === 1) {
  warn('motion-monotony', `all ${presets.length} kinetic lines use the same reveal preset "${presets[0]}". The film moves monotonously. Vary it so no two beats move alike (up / scale / blur / decode / riseClip): engine-doctrine/EFFECTS.md kinetic presets.`);
}
// DENSE FIGURES BY DEFAULT (parts): a multi-part figure that lands as ONE block reads flat next to real
// motion graphics. A group of 3+ cards, or an inline SVG with 3+ shapes, should animate PIECE BY PIECE.
const staticFigures = flat.filter((l) => {
  if (l.parts || l.split) return false;
  if (l.type === 'group' && Array.isArray(l.children) && l.children.length >= 3 && l.each == null) return true;
  // Markup whose shapes carry their OWN per-shape delay off the clock or the window variable is already
  // building piece by piece; the stagger is in the CSS, where `parts` cannot reach. Two or more distinct
  // offsets is the tell, since one shared expression on every shape is still one block.
  if (l.type === 'html' && typeof l.html === 'string') {
    if ((l.html.match(/<(rect|circle|path|polyline|line)\b/g) || []).length < 3) return false;
    const staggered = new Set(l.html.match(/var\(\s*--[tp]\b[^)]*\)\s*-\s*[\d.]+/g) || []);
    return staggered.size < 2;
  }
  return false;
});
if (staticFigures.length) warn('static-figure', `${staticFigures.length} figure(s) (a 3+-child group or a multi-shape SVG) animate as one block. Add \`parts\` (or a group \`each\`) so they build piece by piece: bars grow, the line draws, dots pop. engine-doctrine/CRAFT/AUTHOR-THE-FRAME.md.`);

// ---- report ----
const score = vocab.length + (directedByBeats ? 3 : 0);
console.log(`\n  direction floor · ${file}`);
console.log(`  motion vocabulary: ${vocab.map((k) => `${k}×${sig[k]}`).join(' · ') || '(none)'}${directedByBeats ? '  [composed from blueprints]' : ''}`);
console.log(`  directedness score: ${score}   (floor: not a plain slideshow · reach ≥3 techniques)`);
// THE HEADLINE RULE DOES NOT ALWAYS RUN, and the report never said so. Both halves of the continuity
// tell are gated on `dur < CONTINUITY_MAX_DUR`, so a 20s film printed `✓ direction floor clear` with the
// rule this gate is best known for never evaluated. A skipped check has to look different from a passed one.
console.log(dur < CONTINUITY_MAX_DUR
  ? `  continuity: EVALUATED (${dur}s is under the ${CONTINUITY_MAX_DUR}s ceiling) · ${bounds.length} declared boundary(ies)`
  : `  continuity: NOT EVALUATED, ${dur}s is at or over the ${CONTINUITY_MAX_DUR}s ceiling, above which a chaptered\n`
    + `              structure is legitimate. no-continuous-object and its inferred half did not run on this film.`);
// The declared and inferred halves of the continuity tell are one rule seen two ways, so a scene that
// waived the declared one has already declared the break deliberate; don't re-raise it as the other.
// The two variants are the same finding named more precisely, so the standing waiver covers them. A
// sharper diagnosis must not turn every already-waived scene red. `beats-wrapped-as-units` was the
// third alias and is no longer emitted here: it is a fact about the render, not a verdict on the film,
// and it now warns from the always-on beat-check where every author sees it.
const CONTINUITY_ALIASES = new Set(['no-continuous-object-inferred']);
const waivedBy = (code) => (allow.has(code) && canWaive(code))
  || (CONTINUITY_ALIASES.has(code) && allow.has('no-continuous-object') && canWaive('no-continuous-object'));
const fails = findings.filter((f) => f.sev === 'FAIL' && !waivedBy(f.code));
const waived = findings.filter((f) => f.sev === 'FAIL' && waivedBy(f.code));
const warns = findings.filter((f) => f.sev === 'WARN' && !waivedBy(f.code));
console.log(`\n  ${fails.length} fail · ${warns.length} warn${waived.length ? ` · ${waived.length} waived` : ''}`);
// One fact, one owner: the RECORD is the finding and the line below is rendered from it, so
// author-check reads `code` instead of re-reading this sentence (engine-doctrine/MISTAKES.md #401).
const F = gateFindings({ scene: file, indent: '    ',
  line: (r, g) => `    ${g} [${r.code}] ${r.waived ? 'waived via authoring.allow' : r.summary}` });
for (const f of fails) F.fail(f.code, f.msg);
for (const w of warns) F.warn(w.code, w.msg);
for (const w of waived) F.finding({ code: w.code, severity: w.sev === 'FAIL' ? 'error' : 'warn', summary: w.msg, waived: true });
F.emit();
if (!findings.length) console.log('    ✓ directed: motion vocabulary clears the floor');

const blocking = fails.length || (strict && warns.length);
if (blocking) { console.log(`\n  ✗ direction floor: too plain, fix before shipping (or waive a deliberate minimal film).\n`); process.exit(1); }
console.log(warns.length ? `\n  floor cleared with ${warns.length} nudge(s) to reach past.\n` : `\n  ✓ direction floor clear.\n`);
process.exit(0);
