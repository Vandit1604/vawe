import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const NAME = argv.find((a) => !a.startsWith('--') && !(argv[argv.indexOf(a) - 1] || '').startsWith('--'));
const THEME = flag('theme', 'vawe');
const OUT = flag('out', null);
if (!NAME) { console.error('usage: node harness/author/recreate.mjs <grammar-name> [--theme vawe] [--out path]'); process.exit(2); }

const gp = path.join(ROOT, 'grammar', `${NAME}.json`);
if (!fs.existsSync(gp)) { console.error(`✗ no grammar for "${NAME}". Run: make study VIDEO=refs/<file>.mp4 NAME=${NAME}`); process.exit(2); }
const g = JSON.parse(fs.readFileSync(gp, 'utf8'));
if (g.measured.shotDetection !== 'scene-score') {
  console.error(`✗ "${NAME}" has no measured shot list: study found no hard cut, so its boundaries are fixed samples.`);
  console.error(`  A skeleton built on those would put a transition where nothing happens. Read the sheet and`);
  console.error(`  write the beats by hand, or re-study at a lower --threshold if the film really does cut.`);
  process.exit(1);
}

const GROUND = { dark: 'dark', light: 'paper', mid: 'plain' };
const preset = (ground) => GROUND[String(ground).replace('?', '')] || 'plain';

const shots = g.shots;
const scene = {
  module: 'scene',
  duration: g.measured.duration,
  aspect: '16:9',
  theme: THEME,
  _study: `grammar/${NAME}.json · every time below is MEASURED off that film, not chosen`,
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
