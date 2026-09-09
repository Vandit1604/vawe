// scripts/author/recreate.mjs: turn a studied reference into a scene SKELETON.
//
//   node scripts/author/recreate.mjs rebuilt --theme vawe --out formats/scene/vawe-rebuilt.json
//   make recreate NAME=rebuilt THEME=vawe OUT=formats/scene/vawe-rebuilt.json
//
// WHAT IT EMITS AND WHAT IT REFUSES TO. Everything the study MEASURED becomes real: the duration, a
// transition at every boundary, one `bg` window per shot in the measured lightness, and a per-beat note
// carrying that shot's motion target. Everything the study could not measure is left as a hole with the
// reading beside it. There is no layout, no copy, no type, no palette beyond the theme's, and no layer
// but the one placeholder per beat that makes the timing visible.
//
// THAT LINE IS THE WHOLE DESIGN, and CLAUDE.md's "No templates" is why. A generator that emitted a
// composed beat would be a template with extra steps: every film out of it would share a layout nobody
// chose, and the ledger flags exactly that. What is safe to generate is the part that is a FACT about
// the reference (this beat runs 3.5s on a dark ground and peaks at 32.8) rather than a decision about
// ours. Timing is arithmetic. Composition is not.
//
// SO THE SKELETON IS NOT A DRAFT OF THE FILM. It is the film's clock, correct to the frame, with every
// authoring decision still to make and each one named where it belongs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const NAME = argv.find((a) => !a.startsWith('--') && !(argv[argv.indexOf(a) - 1] || '').startsWith('--'));
const THEME = flag('theme', 'vawe');
const OUT = flag('out', null);
if (!NAME) { console.error('usage: node scripts/author/recreate.mjs <grammar-name> [--theme vawe] [--out path]'); process.exit(2); }

const gp = path.join(ROOT, 'grammar', `${NAME}.json`);
if (!fs.existsSync(gp)) { console.error(`✗ no grammar for "${NAME}". Run: make study VIDEO=refs/<file>.mp4 NAME=${NAME}`); process.exit(2); }
const g = JSON.parse(fs.readFileSync(gp, 'utf8'));
if (g.measured.shotDetection !== 'scene-score') {
  console.error(`✗ "${NAME}" has no measured shot list: study found no hard cut, so its boundaries are fixed samples.`);
  console.error(`  A skeleton built on those would put a transition where nothing happens. Read the sheet and`);
  console.error(`  write the beats by hand, or re-study at a lower --threshold if the film really does cut.`);
  process.exit(1);
}

// The measured lightness picks a PLAIN ground of the right value, and plain on purpose: a living preset
// is a taste decision and this file makes none. `make arsenal Q="a living ground"` is where that is chosen.
const GROUND = { dark: 'dark', light: 'paper', mid: 'plain' };
const preset = (ground) => GROUND[String(ground).replace('?', '')] || 'plain';

const shots = g.shots;
const scene = {
  module: 'scene',
  duration: g.measured.duration,
  aspect: '16:9',
  theme: THEME,
  _study: `grammar/${NAME}.json · every time below is MEASURED off that film, not chosen`,
  // Windows in order with no from/to: core/junctions.js binds window i to the joint after it, so the
  // transitions own the numbers and there is one place to change a beat's length.
  // EXPLICIT TIMES AND NO `transitions` ARRAY, and that is a decision worth defending rather than a
  // gap. The first cut of this emitted a transition per boundary with a TODO string as its `fx`, which
  // the engine correctly refused at boot, so the skeleton could not be rendered and the one thing it
  // exists to show, the timing, could not be seen.
  //
  // A neutral `fade` would have rendered and would have been worse: it makes the decision, badly, in a
  // file whose whole claim is that it makes none. And the reference's OWN stored takeaway is that a
  // ground inverting on every cut needs no effect on any of them, because the inversion IS the
  // transition. So the boundaries are carried by the backdrop, which is measured, and a transition
  // becomes something an author ADDS with a reason instead of something they are handed and must
  // remember to reconsider.
  bg: shots.map((s) => ({
    preset: preset(s.ground), from: s.t0, to: s.t0 + s.len,
    _why: `shot ${s.i} measured luma ${s.luma} (${s.ground})`,
  })),
  _transitions: `NONE, deliberately. The boundaries at ${shots.slice(1).map((x) => x.t0).join(', ')}s are carried by the `
    + `backdrop above. Add a \`transitions\` entry only where you can say why the ground turning is not enough `
    + `(make arsenal Q="a cut that…").`,
  audio: { silent: true, _why: `TODO. The reference ${g.measured.hasAudio ? 'has a track' : 'is silent'} and its shortest beat is ${Math.min(...shots.map((x) => x.len))}s, which is usually a sound-led cut.` },
  layers: shots.map((s) => ({
    type: 'text',
    text: `TODO beat ${s.i}`,
    x: 'center', y: 500, w: '80%', align: 'center', size: 90, weight: 700,
    start: s.t0, duration: s.len,
    _beat: `${s.len}s on a ${s.ground} ground. TARGET motion ${s.motion}, peak ${s.peak}, held ${Math.round(s.held * 100)}%.`
      + (s.moves ? ` The reference: ${s.moves}` : ' (nobody has written down what moves here)'),
  })),
};

const json = JSON.stringify(scene, null, 1) + '\n';
if (OUT) {
  const dest = path.resolve(ROOT, OUT);
  if (fs.existsSync(dest)) { console.error(`✗ ${OUT} exists. This overwrites a whole film; delete it first if you mean to.`); process.exit(2); }
  fs.writeFileSync(dest, json);
  console.log(`\n  ✓ ${OUT} · ${shots.length} beats · ${g.measured.duration}s · ${shots.length - 1} boundary(ies), carried by the backdrop\n`);
} else console.log(json);

console.log(`  WHAT IS NOW FIXED, correct to the frame, and needs no decision:`);
console.log(`    the duration, ${shots.length - 1} boundary time(s) at ${shots.slice(1).map((s) => s.t0).join(', ')},`);
console.log(`    ${shots.length} backdrop window(s) in the measured lightness, and a motion target per beat.\n`);
console.log(`  WHAT IS STILL YOURS, all of it:`);
console.log(`    every word, every layer, the type, the layout, the palette beyond the theme, what carries`);
console.log(`    across the cuts, which beat is the loud one, and the sound.`);
const unread = shots.filter((s) => !s.moves).length;
if (unread) console.log(`\n  ${unread} of ${shots.length} beats have no written reading in grammar/${NAME}.json, so their`);
if (unread) console.log(`  \`_beat\` notes carry a target and no direction. Fill \`moves\` there and re-run.`);
console.log(`\n  Then: make preflight D=<file>  ·  make dev D=<file>  ·  ./bin/vawe prints the motion to compare.\n`);
