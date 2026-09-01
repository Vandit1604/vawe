// scripts/gates/direction-floor.mjs: THE AMBITION FLOOR. The inverse of effect-soup.
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
//   node scripts/gates/direction-floor.mjs <scene.json> [--strict]   ·   make direction-floor D=<file>
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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { motionAt } from '../../core/sequence.js';
import { bgPreset } from '../../core/backgrounds.js';
import { typedLen } from '../../core/layers/text.js';
import { clamp01 } from '../../core/motion.js';
import { sceneDims } from '../../core/safe.js';
import { sceneTiming } from './scene-timing.mjs';
import { glyphText, snippet } from '../lib/text.mjs';
import { flattenLayers } from '../lib/layers.mjs';
import { lowerScene } from '../../core/transitions-lower.js';
import { junctionTable, marksOf, resolveJunction, isJunctionRef } from '../../core/junctions.js';

const file = process.argv[2];
const strict = process.argv.includes('--strict');
if (!file) { console.error('usage: node scripts/gates/direction-floor.mjs <scene.json> [--strict]'); process.exit(2); }
// The floor coaches on the RAW AUTHORED scene (what you wrote), NOT the produced one, the engine injects
// the baseline at render (core/produce.js), so these WARNs read as "author this deliberately instead of
// leaning on the injected default." Judging the produced scene would mask the very conditions this gate
// exists to surface (and defeat gate-mutation's ability to prove the gate can fire).
// The unified `transitions` surface is SUGAR: the engine lowers it to cuts/seams/stings before it
// renders anything (core/transitions-lower.js), and until this line the gates did not, so a scene
// that declared its boundaries the documented way was read as a film with no boundaries at all.
// Lowering here is idempotent and a no-op for a scene that already writes raw `cuts`. MISTAKES #380.
const d = lowerScene(JSON.parse(fs.readFileSync(file, 'utf8')));
const allow = new Set((d.authoring && Array.isArray(d.authoring.allow)) ? d.authoring.allow : []);

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
// `bgPreset` in core/backgrounds.js: it returns the fx list that renderBg(…, t) paints, and `grain` is
// the only fx that is not motion (film grain over a still base). That is the same split BG_BLURBS
// states in prose (FLAT = plain · paper · accentPlain · dark · deep) now read off the code instead of
// restated here. An unknown name throws there (#361) and is not this gate's finding to report.
// THE MARKUP OF A HAND-AUTHORED FRAGMENT, from either place it can live. `html` is the markup inline in
// the scene JSON and `src` is the SAME markup in a file (core/sanitize-html.js `htmlSource` is the one
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
  // `src` is repo-root relative (core/preload.js roots it at '/'), so it resolves the same from any cwd.
  try { return fs.readFileSync(path.join(repoRoot, o.src), 'utf8'); } catch { return ''; }
};
const movingPreset = (name, value) => {
  try { return (bgPreset(name ?? undefined, value).fx || []).some((f) => f && f.type !== 'grain'); }
  catch { return false; }
};
// ...and a HAND-AUTHORED backdrop (core/bg-html.js) animates by being a function of `var(--t)`, the one
// thing it is allowed to move by, CSS animation is disabled engine-wide and the sanitiser rejects it.
// Without this the escape hatch for a backdrop the preset vocabulary cannot express was told it was a
// flat field, which pushes the author back onto the presets: the opposite of what it exists for.
const animatedWin = (b) => b && (movingPreset(b.preset, b.value)
  || b.mode != null || b.period != null || b.driftX != null || b.driftY != null
  || /var\(\s*--[tp]\b/.test(htmlOf(b)));
const hasBgMotion = (d.bg || []).some(animatedWin)
  || flat.some((l) => l.shader || l.canvasFx || l.three || l.raymarch || l.type === 'paint');

// camera actually MOVES (s/x/y changes across keyframes), not a static [{s:1},{s:1}].
const cam = d.camera || [];
const camKf = cam.length > 1 && cam.some((k) => (k.s ?? 1) !== (cam[0].s ?? 1) || (k.x ?? 0) !== (cam[0].x ?? 0) || (k.y ?? 0) !== (cam[0].y ?? 0));
// the `cameraMove` sugar (core/camera-moves.js) IS a camera move, it just expands to d.camera at
// `make expand`, and the floor runs PRE-expand, so without this it nags "no-camera" on a scene that
// already has a push/dive. Credit a cameraMove that names a move or actually changes scale/position.
// ...and the sugar is documented as an OBJECT (`"cameraMove": { "move":"diveIn" }`, core/camera-moves.js),
// which scripts/author/expand-blocks.mjs accepts alongside an array. Only crediting the array meant a
// film using the documented form was told its camera never moves while the camera was moving.
const camSpecs = Array.isArray(d.cameraMove) ? d.cameraMove : (d.cameraMove ? [d.cameraMove] : []);
const camSugar = camSpecs.some((m) => m && (m.move || (m.from != null && m.to != null && m.from !== m.to) || (m.tx != null) || (m.ty != null)));
const camMoves = camKf || camSugar;

const sig = {
  beats: flat.filter((l) => l.type === 'beat').length,
  kineticText: texts.filter(isExpressiveText).length,
  countup: flat.filter((l) => l.type === 'count').length,
  camera: camMoves ? 1 : 0,
  transition: (d.seams || []).length + (d.cuts || []).length + flat.filter((l) => l.cut).length,
  ken: flat.filter((l) => l.ken).length,
  cursor: flat.filter((l) => l.type === 'cursor').length,
  motionTrack: flat.filter((l) => Array.isArray(l.motion) && l.motion.length > 1).length,
  fx: flat.filter((l) => l.fx).length,
  bgMotion: hasBgMotion ? 1 : 0,
  // the killer per-frame effects (docs/EFFECTS.md): a border-beam/shine, a paint field, a glow flash, an
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

if (!directedByBeats) {
  const plainShare = headlines.length ? plainHeadlines.length / headlines.length : 0;
  // THE HARD FLOOR: a plain slideshow. No kinetic type, no camera, no transitions, and a thin vocab.
  if (sig.kineticText === 0 && !camMoves && sig.transition === 0 && vocab.length < 2) {
    fail('plain-slideshow', `this reads as a SLIDESHOW: no kinetic typography, no camera move, no transitions, motion vocabulary = {${vocab.join(', ') || 'none'}}. Compose from blueprints ({type:"beat"}) or add kinetic reveals + a camera move + seams. See docs/CRAFT/BLUEPRINTS.md + DIRECTION.md.`);
  } else if (headlines.length >= 4 && plainShare >= 0.85 && sig.kineticText === 0) {
    fail('plain-slideshow', `${plainHeadlines.length}/${headlines.length} headlines just fade/rise with no kinetic reveal. The plain-authoring tell. Give headlines split+preset (words rise/scale), or use a blueprint beat.`);
  }
  // coaching WARNs: the range this video is leaving on the table.
  if (sig.kineticText === 0) warn('no-kinetic-type', 'no kinetic typography anywhere (no split+preset headline). A directed video reveals key lines word-by-word, MOTION-RECIPES words-rise.');
  if (!camMoves) warn('no-camera', 'the camera never moves. One slow push (or a dive-in on a product shot) adds life without moving content. MOTION-RECIPES slow-push / dive-in.');
  if (sig.transition === 0) warn('no-transition', 'no seams or cuts between beats. Beats just cut flat. Earn 1-3 transitions (a dissolve, a cinematicZoom into a screen).');
}
if (!sig.bgMotion) warn('no-bg-motion', 'the background is static. A good video moves the viewer with a living backdrop (a moving gradient / mesh / aurora / shader), used brand-appropriately, not a flat field. See core/backgrounds.js.');
if (!directedByBeats && vocab.length < 3) warn('low-vocab', `only ${vocab.length} motion technique(s) in play (${vocab.join(', ') || 'none'}). Reach for more of the range: count-ups, ken push, a cursor demo, a custom motion track.`);

// ANTI-FRONT-LOAD (another engine reveal model): a directed video weights its cues ACROSS its length; the
// SLIDESHOW failure dumps everything in the first quarter, then freezes. A reveal = a timed content
// layer's start. If nearly all reveals land in the first 30% and the back half gets nothing new, it is a
// slideshow even when each line is kinetic. Beat-composed scenes spread starts across the film, so they
// clear this; a hand-authored front-load trips it.
const dur = d.duration || flat.reduce((m, l) => Math.max(m, (l.start ?? 0) + (l.duration ?? 0)), 0) || 1;

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
// and a lowered transition are recorded at the MIDDLE of their blend, while `matches` hangs on the mark
// itself, so the two are half a blend apart by construction rather than by drift.
const boundTol = new Map();
const boundary = (t, tol) => { boundaries.push(t); boundTol.set(t, Math.max(boundTol.get(t) ?? 0, tol)); };
for (const c of d.cuts || []) if (c && typeof c.t === 'number') boundary(c.t, EPS);
for (const s of d.seams || []) if (s && typeof s.t === 'number') boundary(s.t + (s.dur ?? 0.6) / 2, EPS + (s.dur ?? 0.6) / 2);
for (const tr of d.transitions || []) if (tr && typeof tr.at === 'number') boundary(tr.at + (tr.dur ?? 0.6) / 2, EPS + (tr.dur ?? 0.6) / 2);
const bounds = [...new Set(boundaries)].filter((t) => t > EPS && t < dur - EPS).sort((a, b) => a - b);

const T = sceneTiming(d);
// A layer the engine confines to its own beat CANNOT be a spine, whatever its authored window says.
// Under `sceneUnits` (core/produce.js turns it on for any cut film with no choreographed `motion`
// track) formats/scene/scene.js rewrites every non-last-beat layer to end with its beat, so a layer
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
const opaqueMotion = (l) => l.type === 'composition' || l.type === 'beat' || l.type === 'clip'
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
    // (docs/MISTAKES.md #352). A null means "this track does not drive that property" and compares
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
// resolveBecomes (formats/scene/scene.js) carries the outgoing form's centre, size and rotation onto
// the incoming layer's opening pose, and core/validate.mjs refuses a handover whose two halves do not
// meet. `matches` is the same handover hung on a named joint, and core/junctions.js retimes both
// layers onto it so the joint owns the only copy of the number.
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
for (const M of Array.isArray(d.matches) ? d.matches : []) if (M && typeof M === 'object') addLink(byId[M.from], byId[M.to], M.at);
// WHEN the handover lands. `matches` names a joint and the joint is authoritative, because the retiming
// that lines the two layers up happens at boot and this gate reads the authored scene. A bare `becomes`
// carries no joint, so it is where the two forms meet, a point validate already keeps them within
// half a second of.
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
const FIX_MSG = 'Fix: name ONE object (the button, the card, the row, the token), keep it alive across the boundary, and make the boundary a state change of it (a `motion` track through it, a `vars` morph, a ken push, a typing line that keeps typing). Every junction answers "the X becomes the Y", and a MATCH CUT says that in one line: give both forms an `id` and declare `"matches": [{"at": "cut@0", "from": "<the X>", "to": "<the Y>"}]`. The joint retimes them onto itself and the engine carries the centre, size and rotation across (core/junctions.js). See .claude/skills/vawe-continuous-action/SKILL.md.';

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
    // stop. The 18 pre-existing short cut-bearing scenes in formats/scene/ carry an explicit
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
const reveals = flat.filter((l) => l.track !== 0 && (l.text || l.type === 'count' || l.type === 'beat' || l.type === 'image' || l.type === 'svg' || isExpressiveText(l))).map((l) => l.start ?? 0);
if (reveals.length >= 4) {
  const early = reveals.filter((t) => t < dur * 0.3).length / reveals.length;
  const lateHalf = reveals.filter((t) => t > dur * 0.5).length;
  if (early >= 0.8 && lateHalf === 0) warn('front-loaded', `${Math.round(early * 100)}% of reveals land in the first ${(dur * 0.3).toFixed(1)}s and the back half is frozen. The SLIDESHOW failure (everything dumped early, then static). Weight cues into the back ~50%: give each key line its own reveal beat. (docs/CRAFT/DIRECTION.md reveal model.)`);
}
// NO TWO BEATS MOVE ALIKE (another engine): vary the motion vocabulary across the film. If every kinetic
// line uses the identical reveal preset, the video moves monotonously even when each beat is "kinetic".
const presets = flat.filter((l) => l.preset).map((l) => l.preset);
if (presets.length >= 5 && new Set(presets).size === 1) {
  warn('motion-monotony', `all ${presets.length} kinetic lines use the same reveal preset "${presets[0]}". The film moves monotonously. Vary it so no two beats move alike (up / scale / blur / decode / riseClip): docs/EFFECTS.md kinetic presets.`);
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
if (staticFigures.length) warn('static-figure', `${staticFigures.length} figure(s) (a 3+-child group or a multi-shape SVG) animate as one block. Add \`parts\` (or a group \`each\`) so they build piece by piece: bars grow, the line draws, dots pop. docs/CRAFT/AUTHOR-THE-FRAME.md.`);

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
const waivedBy = (code) => allow.has(code) || (CONTINUITY_ALIASES.has(code) && allow.has('no-continuous-object'));
const fails = findings.filter((f) => f.sev === 'FAIL' && !waivedBy(f.code));
const waived = findings.filter((f) => f.sev === 'FAIL' && waivedBy(f.code));
const warns = findings.filter((f) => f.sev === 'WARN' && !waivedBy(f.code));
console.log(`\n  ${fails.length} fail · ${warns.length} warn${waived.length ? ` · ${waived.length} waived` : ''}`);
for (const f of fails) console.log(`    ✗ [${f.code}] ${f.msg}`);
for (const w of warns) console.log(`    ~ [${w.code}] ${w.msg}`);
for (const w of waived) console.log(`    ○ [${w.code}] waived via authoring.allow`);
if (!findings.length) console.log('    ✓ directed: motion vocabulary clears the floor');

const blocking = fails.length || (strict && warns.length);
if (blocking) { console.log(`\n  ✗ direction floor: too plain, fix before shipping (or waive a deliberate minimal film).\n`); process.exit(1); }
console.log(warns.length ? `\n  floor cleared with ${warns.length} nudge(s) to reach past.\n` : `\n  ✓ direction floor clear.\n`);
process.exit(0);
