// assemble.mjs: `make assemble D=<film>`: ASSEMBLE. Writes the scene JSON from the storyboard's
// per-beat contract + the fragment files a scene fan-out (or one agent) already wrote:
//   - one `html` layer per scene, `src`-loaded, timed at the contract's start/end
//   - the continuous object: ONE layer with a hand-keyed `motion` track built from every beat's
//     object_in/object_out, resolved to px through the ENGINE's own resolveCoords
//     (scripts/lib/placement-resolve.mjs), never a second copy of that math
//   - one `bg` window per beat, cycling the theme's own look.backdrop rotation
//   - explicit `transitions[]` at each beat boundary (look.cuts.default): produce.js's own cuts/
//     sceneUnits auto-injection (core/engine/produce.js) SKIPS any scene that already carries a
//     multi-key `motion` track ("choreographed"), which this film always does once it has a continuous
//     object, so this is the one place that injection has to be done by hand instead of left to the
//     engine.
// Kept THIN on purpose: no camera, no captions, no audio beyond `auto:true`. Everything else the
// engine already supplies once cuts + sceneUnits are on the page.
//
// OWNERSHIP: assemble owns what it GENERATES and nothing else. It stamps `id: scene<N>` on every html
// layer it writes and `id: object` on the one continuous-object layer it can build (edges-derived,
// placement@wxh), so the set it owns is nameable, not guessed at from shape. Any existing layer whose
// `id` is NOT in that set (a hand-keyed height ramp, a `count` layer, anything the per-beat contract
// has no vocabulary for) passes through untouched, appended after the generated layers in its original
// relative order, so a re-assemble is idempotent. A handful of film-level fields survive the same way,
// through PRESERVED_FILM_FIELDS below, an allowlist rather than a blanket spread: `duration`, `bg`,
// `transitions` and `sceneUnits` are assemble's own and must never be resurrected from a stale scene.
//
// A preserved layer can go stale: it was timed against beats that have since moved or been deleted.
// Carrying it silently would be worse than dropping it was, so every preserved layer (and film-level
// field) is REPORTED by name, and one whose [start, start+duration] window no longer lands inside the
// new film's duration is WARNED about, loudly, below.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storyboardPathFor } from '../gates/craft-checklist.mjs';
import { parseStoryboard, timeline } from './storyboard-parse.mjs';
import { chainErrors, edges, parseMotion, motionErrors, SPEED_BAND } from '../lib/contract.mjs';
import { resolvePx } from '../lib/placement-resolve.mjs';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/motion/motion.js';
import { sceneDims } from '../../core/layout/safe.js';
import { boundaryMechanism } from '../../core/transitions/lower.js';

const PRESERVED_FILM_FIELDS = ['cameraMove']; // owned fields (duration/bg/transitions/sceneUnits/…) are never in this list

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const film = process.argv[2];
if (!film || !fs.existsSync(film)) { console.error('usage: node scripts/author/assemble.mjs <film.json>'); process.exit(1); }

const scene = JSON.parse(fs.readFileSync(film, 'utf8'));
const sbPath = storyboardPathFor(film);
if (!fs.existsSync(sbPath)) { console.error(`assemble: no storyboard at ${sbPath}`); process.exit(1); }
const sb = parseStoryboard(fs.readFileSync(sbPath, 'utf8'));
const { beats } = timeline(sb);

const errs = chainErrors(beats);
if (errs.length) {
  console.error(`assemble: the continuous-object contract does not chain (\`make contract D=${film}\` for detail):`);
  for (const e of errs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
const motionErrs = motionErrors(beats);
if (motionErrs.length) {
  console.error(`assemble: the motion plan does not parse (\`make contract D=${film}\` for detail):`);
  for (const e of motionErrs) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const themeName = typeof scene.theme === 'string' ? scene.theme : (scene.theme && scene.theme.name) || 'default';
const themeFile = typeof scene.theme === 'object' ? null : path.join(ROOT, 'themes', `${themeName}.json`);
const theme = themeFile ? JSON.parse(fs.readFileSync(themeFile, 'utf8')) : scene.theme;
const look = resolveLook(theme, { isLightBg });
const aspect = scene.aspect || '16:9';
const destination = scene.destination;

const base = path.basename(film, '.json');
const dir = path.dirname(film);

// ---- one html layer per beat ------------------------------------------------------------------
const [canvasW, canvasH] = sceneDims({ aspect });
const missing = [];
const htmlLayers = beats.map((b, i) => {
  const fragPath = path.join(dir, `${base}.scene${i + 1}.html`);
  if (!fs.existsSync(fragPath)) missing.push(path.relative(ROOT, fragPath));
  // track:1, NEVER 0: direction-floor.mjs (and other gates) treat any track-0 layer as the backdrop
  // lane, invisible to the content-coverage checks (feature-poverty, empty-beat, ends-on-nothing all
  // read as "no content" against a track-0 fragment even though it fills the frame).
  // w/h/x/y = the full canvas: an `html` layer with no declared box stays its wrapper's default
  // (near-zero), so a fragment written full-bleed (`position:absolute;inset:0`, the shape scenes.mjs's
  // briefs and preview-fragment.mjs both assume) would collapse to nothing at real render time even
  // though it previewed correctly (core/layers/html.js build(): w/h are the only thing that sizes it).
  // THE MOTION PLAN, consumed here and nowhere else: a beat's `motion:` entries become `parts[]` on
  // its own html layer, the SAME `select`/`anim` vocabulary a hand-authored parts block already takes
  // (core/motion/parts.js), so this is not a second motion mechanism, it is the storyboard filling in
  // the one the engine already has. `each`/`exitDur` come from the named speed band
  // (scripts/lib/contract.mjs SPEED_BAND), never a raw second written here.
  const motion = parseMotion(b.motion);
  const parts = motion.length ? motion.map((m) => ({
    select: m.selector, anim: m.kind, each: SPEED_BAND[m.inBand], out: true, exitDur: SPEED_BAND[m.outBand],
  })) : undefined;
  return { id: `scene${i + 1}`, type: 'html', src: path.relative(ROOT, fragPath), start: b.start, duration: +(b.end - b.start).toFixed(3), track: 1, x: 0, y: 0, w: canvasW, h: canvasH, ...(parts ? { parts } : {}) };
});
if (missing.length) {
  console.error(`assemble: missing fragment(s), run \`make scenes D=${film}\` for the briefs and write them first:`);
  for (const m of missing) console.error(`  ✗ ${m}`);
  process.exit(1);
}

// ---- the continuous object: one layer, a keyed motion track derived from the contract's edges -----
const chain = edges(beats);
let objectLayer = null;
if (chain.length) {
  const first = chain[0];
  const base0 = resolvePx(first.in, { aspect, destination });
  const keys = [];
  const pushKey = (t, edge) => {
    const p = resolvePx(edge, { aspect, destination });
    const tt = +(t - first.start).toFixed(3);
    if (keys.length && keys[keys.length - 1].t === tt) keys[keys.length - 1] = { t: tt, x: p.x - base0.x, y: p.y - base0.y };
    else keys.push({ t: tt, x: p.x - base0.x, y: p.y - base0.y });
  };
  for (const e of chain) { pushKey(e.start, e.in); pushKey(e.end, e.out); }
  objectLayer = {
    id: 'object', type: 'rect', track: 5, x: base0.x, y: base0.y, w: base0.w, h: base0.h,
    fill: 'var(--accent)', radius: 4,
    start: first.start, duration: +(chain[chain.length - 1].end - first.start).toFixed(3),
    // `sceneUnits: true` wraps each beat as its own unit, so nothing survives a cut unless it opts
    // out: `acrossBeats` attaches this layer to the camera instead of its beat wrapper
    // (scripts/gates/direction-floor.mjs), which is exactly what a continuous object needs to be.
    acrossBeats: true,
    motion: keys,
  };
}

// ---- bg: one window per beat, cycling the theme's own backdrop rotation --------------------------
const backdrop = (look.backdrop && look.backdrop.length) ? look.backdrop : ['soft', 'accent'];
const bg = beats.map((b, i) => ({ from: b.start, to: b.end, preset: backdrop[i % backdrop.length] }));

// ---- transitions: an explicit boundary at every internal cut, since a choreographed scene (this one
// always is, once it has an object layer) is skipped by produce.js's own auto-injection -------------
// mech:"seam", not the "cut" a bare fx name defaults to: a "cut" only transforms the scene ROOT (an
// opacity ramp over the whole stack), so two beats with DIFFERENT bg presets swap hard mid-ramp rather
// than blending, which is exactly the "hard swap disguised inside a soft transition" seam-forensics.mjs
// (#seam-split) exists to catch. "seam" is the real two-scene GPU blend, so the bg crossfades too.
// ...WHEN THE FX CAN BE ONE. `look.cuts.default` is DERIVED from the theme's own pace
// (core/registry/theme-contract.js), so a brisk brand resolves to `whip`, which is cut-only, and
// pairing it with mech:"seam" writes a scene `make validate` refuses: "whip is not a seam". Asking
// boundaryMechanism instead of assuming keeps the crossfade wherever it is available and lets a
// cut-only family through as the cut it is, rather than making every fast theme unassemblable.
const cutFx = look.cuts.default || 'fade';
let cutMech;
try { cutMech = boundaryMechanism(cutFx, 'seam'); } catch { cutMech = undefined; }
const transitions = beats.slice(1).map((b) => ({ at: b.start, fx: cutFx, ...(cutMech ? { mech: cutMech } : {}) }));

// ---- ownership: what assemble just built vs. what a previous pass (or a hand edit) left behind -----
const newDuration = beats[beats.length - 1].end;
const ownedIds = new Set(htmlLayers.map((l) => l.id).concat(objectLayer ? [objectLayer.id] : []));
const prevLayers = Array.isArray(scene.layers) ? scene.layers : [];
// Anything the last build owned that this one doesn't reclaim (its id isn't in ownedIds, whether
// because it was never assemble's to begin with, or because the beat count shrank and its slot is
// gone) is preserved, not discarded: dropping it silently is the exact failure this ownership rule
// exists to end.
const preserved = prevLayers.filter((l) => !(l && typeof l === 'object' && l.id && ownedIds.has(l.id)));
const nameOf = (l) => l.id || `${l.type || '?'}@${l.start ?? '?'}`;
const staleWarnings = [];
for (const l of preserved) {
  if (typeof l.start !== 'number' || typeof l.duration !== 'number') continue; // no window to check
  const end = l.start + l.duration;
  if (l.start < -0.01 || end > newDuration + 0.01) {
    staleWarnings.push(`  ⚠ "${nameOf(l)}" spans ${l.start}s–${+end.toFixed(3)}s, outside the new film (0s–${newDuration}s): its beat likely moved or was deleted. Review before shipping.`);
  }
}

const preservedFilmFields = PRESERVED_FILM_FIELDS.filter((k) => scene[k] !== undefined);

const out = {
  module: 'scene',
  theme: scene.theme,
  aspect,
  ...(destination ? { destination } : {}),
  duration: newDuration,
  sceneUnits: true,
  ...(scene.authoring ? { authoring: scene.authoring } : {}),   // preserve a hand-written waiver across re-assembles
  audio: scene.audio || { auto: true },
  bg,
  transitions,
  ...Object.fromEntries(preservedFilmFields.map((k) => [k, scene[k]])),
  layers: objectLayer ? [...htmlLayers, objectLayer, ...preserved] : [...htmlLayers, ...preserved],
};

fs.writeFileSync(film, JSON.stringify(out, null, 1) + '\n');
console.log(`✓ assemble: ${beats.length} scene(s) → ${film}`);
console.log(`  ${htmlLayers.length} html fragment(s), ${objectLayer ? '1 continuous-object layer (' + chain[0].in.placement + ' → ' + chain[chain.length - 1].out.placement + ')' : 'no continuous object (film named none)'}`);
console.log(`  ${transitions.length} transition(s), bg turns through: ${backdrop.slice(0, beats.length).join(' → ')}`);
const motionCount = htmlLayers.reduce((n, l) => n + (l.parts ? l.parts.length : 0), 0);
console.log(`  ${motionCount} motion-plan entr${motionCount === 1 ? 'y' : 'ies'} from the storyboard (\`motion:\`), built into ${htmlLayers.filter((l) => l.parts).length} scene(s)' \`parts\``);
if (preservedFilmFields.length) console.log(`  preserved film-level field(s): ${preservedFilmFields.join(', ')}`);
if (preserved.length) {
  console.log(`  preserved ${preserved.length} hand-authored layer(s) the per-beat contract has no vocabulary for: ${preserved.map(nameOf).join(', ')}`);
  const candidates = preserved.filter((l) => l.acrossBeats);
  if (candidates.length) console.log(`    (${candidates.map(nameOf).join(', ')} carr${candidates.length === 1 ? 'ies' : 'y'} \`acrossBeats\`: a candidate for the continuous-object contract once it can express what this layer does, not a permanent exception)`);
} else {
  console.log('  no hand-authored layers to preserve');
}
if (staleWarnings.length) { console.log('  STALE:'); for (const w of staleWarnings) console.log(w); }
console.log(`  Next: make author-check D=${film}`);
