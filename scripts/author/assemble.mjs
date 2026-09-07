// assemble.mjs: `make assemble D=<film>` — ASSEMBLE. Writes the scene JSON from the storyboard's
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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storyboardPathFor } from '../gates/craft-checklist.mjs';
import { parseStoryboard, timeline } from './storyboard-parse.mjs';
import { chainErrors, edges } from '../lib/contract.mjs';
import { resolvePx } from '../lib/placement-resolve.mjs';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/motion/motion.js';
import { sceneDims } from '../../core/layout/safe.js';

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
  return { type: 'html', src: path.relative(ROOT, fragPath), start: b.start, duration: +(b.end - b.start).toFixed(3), track: 1, x: 0, y: 0, w: canvasW, h: canvasH };
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
    type: 'rect', track: 5, x: base0.x, y: base0.y, w: base0.w, h: base0.h,
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
const transitions = beats.slice(1).map((b) => ({ at: b.start, fx: look.cuts.default || 'fade', mech: 'seam' }));

const out = {
  module: 'scene',
  theme: scene.theme,
  aspect,
  ...(destination ? { destination } : {}),
  duration: beats[beats.length - 1].end,
  sceneUnits: true,
  ...(scene.authoring ? { authoring: scene.authoring } : {}),   // preserve a hand-written waiver across re-assembles
  audio: scene.audio || { auto: true },
  bg,
  transitions,
  layers: objectLayer ? [...htmlLayers, objectLayer] : htmlLayers,
};

fs.writeFileSync(film, JSON.stringify(out, null, 1) + '\n');
console.log(`✓ assemble: ${beats.length} scene(s) → ${film}`);
console.log(`  ${htmlLayers.length} html fragment(s), ${objectLayer ? '1 continuous-object layer (' + chain[0].in.placement + ' → ' + chain[chain.length - 1].out.placement + ')' : 'no continuous object (film named none)'}`);
console.log(`  ${transitions.length} transition(s), bg turns through: ${backdrop.slice(0, beats.length).join(' → ')}`);
console.log(`  Next: make author-check D=${film}`);
