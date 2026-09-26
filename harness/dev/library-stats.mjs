// left (engine-doctrine/MISTAKES.md #391). Two definitions of "the library" is the drift this file exists to end.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { population, LIBRARY } from '../lib/census.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCENES = path.join(ROOT, 'films/scene');

const PICTORIAL = new Set(['image', 'html', 'component', 'svg', 'video', 'clip', 'lottie', 'board', 'doc']);

const fileArgs = process.argv.indexOf('--files');
if (fileArgs !== -1) {
  const files = process.argv.slice(fileArgs + 1).filter((a) => !a.startsWith('--'));
  const rows = files.map((f) => {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    const layers = d.layers || [];
    const mix = {};
    for (const L of layers) mix[L.type] = (mix[L.type] || 0) + 1;
    return {
      file: path.basename(f),
      seconds: d.seconds ?? d.duration ?? null,
      bgWindows: Array.isArray(d.bg) ? d.bg.length : (d.bg ? 1 : 0),
      cuts: Array.isArray(d.cuts) ? d.cuts.length : 0,
      layers: layers.length,
      motionTracks: layers.filter((L) => L.motion).length,
      pictorial: layers.filter((L) => PICTORIAL.has(L.type)).length,
      mix,
    };
  });
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

const pop = population('library stats', { filter: LIBRARY, quiet: true });
const s = { n: 0, oneBg: 0, mute: 0, noAudioKey: 0, silentDeclared: 0, silentWithWhy: 0,
  beatBlueprint: 0, zeroPictorial: 0 };
const shares = [];

for (const f of pop.names) {
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(SCENES, f), 'utf8')); } catch { continue; }
  s.n++;
  if ((Array.isArray(d.bg) ? d.bg.length : (d.bg ? 1 : 0)) <= 1) s.oneBg++;
  if (!d.audio) { s.noAudioKey++; s.mute++; }
  else if (d.audio.silent) { s.silentDeclared++; s.mute++; if (d.audio._why) s.silentWithWhy++; }
  const layers = d.layers || [];
  if (layers.some((L) => L.type === 'beat')) s.beatBlueprint++;
  const pict = layers.filter((L) => PICTORIAL.has(L.type)).length;
  if (layers.length) shares.push(pict / layers.length);
  if (pict === 0) s.zeroPictorial++;
}

shares.sort((a, b) => a - b);
s.medianPictorialShare = shares.length ? Math.round(shares[shares.length >> 1] * 100) : 0;
const pct = (k) => Math.round((s[k] / s.n) * 100);

if (process.argv.includes('--json')) { console.log(JSON.stringify(s)); process.exit(0); }

const row = (label, value, note) => console.log(`  ${label.padEnd(34)} ${String(value).padStart(9)}   ${note}`);
console.log(`\n  LIBRARY STATS · ${s.n} gate-visible scenes\n`);
row('paint ONE bg window', `${s.oneBg} · ${pct('oneBg')}%`, 'a backdrop that never turns is a choice you have to justify');
row('ship mute', `${s.mute} · ${pct('mute')}%`, `${s.noAudioKey} carry no audio key, ${s.silentDeclared} declare silent`);
row('  ...and say WHY they are silent', s.silentWithWhy, `of the ${s.silentDeclared} that declare it`);
row('use a {type:"beat"} blueprint', s.beatBlueprint, 'the mechanism is there; almost nobody reaches for it');
row('carry ZERO pictorial layers', s.zeroPictorial, `of any size (${[...PICTORIAL].join(' ')})`);
row('median share of layers that are picture', `${s.medianPictorialShare}%`, 'a COUNT of layers, never a share of the frame');
console.log('\n  Quote these, not a number typed by hand. quality/gates/docs-drift.mjs checks the three');
console.log('  headline counts CLAUDE.md cites; the rest are yours to re-run before you cite them.\n');
