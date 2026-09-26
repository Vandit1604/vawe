import fs from 'node:fs';
import { onScreenText } from '../lib/text.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: node harness/author/cinematic.mjs <scene.json> [--write]'); process.exit(2); }
const WRITE = process.env.WRITE === '1' || process.argv.includes('--write');
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const layers = d.layers || [];
const stripHtml = onScreenText;
const wordCount = (s) => stripHtml(s).split(/\s+/).filter(Boolean).length;

let duration = d.duration || 0;
if (!duration) for (const l of layers) duration = Math.max(duration, (l.start ?? 0) + (l.duration ?? 2));
duration = +(duration + (d.duration ? 0 : 0.4)).toFixed(2);

const starts = [...new Set(layers.filter((l) => l.track !== 0).map((l) => l.start ?? 0))].sort((a, b) => a - b);
const beats = [];
for (const t of starts) { const last = beats[beats.length - 1]; if (last == null || t - last > 1.4) beats.push(t); }

const isHero = (l) => l.type === 'text' && (l.size ?? 96) >= 180 && wordCount(l.text) <= 2 && !l.motion && l.text != null;
const isPhrase = (l) => l.type === 'text' && wordCount(l.text) >= 2 && !l.typing && l.preset == null && l.text != null;

const dolly = (du) => [
  { t: 0, scale: 1.5, opacity: 0, ease: 'easeOutCubic' },
  { t: 0.34, scale: 1.0, opacity: 1, ease: 'spring' },
  { t: +Math.max(0.5, du - 0.3).toFixed(2), scale: 1.04, ease: 'linear' },
  { t: +du.toFixed(2), scale: 1.8, opacity: 0, ease: 'easeInCubic' },
];

const heroes = layers.filter(isHero);
const phrases = layers.filter(isPhrase);
const hasCamera = Array.isArray(d.camera) && d.camera.length;

console.log(`\n  cinematic director · ${file}`);
console.log(`  ${beats.length} beats · ${duration}s · ${heroes.length} hero word(s) to dolly · camera ${hasCamera ? 'present (kept)' : 'MISSING → add a smooth push'}`);
console.log('');
console.log('  WILL ADD (the aliveness: camera + dolly, derived from your beats):');
if (!hasCamera) console.log(`    · camera: a smooth global push  s 1.0 → 1.09 over ${duration}s (one continuous move, no reversals, MISTAKES #125)`);
for (const h of heroes) console.log(`    · dolly + motionBlur on "${stripHtml(h.text).slice(0, 20)}" @${(h.start ?? 0).toFixed(1)}s (enter oversized → settle → exit bigger)`);
if (!heroes.length) console.log('    · (no hero words detected, nothing to dolly)');
console.log('');
console.log('  RECOMMENDS (compose these yourself: they are content choices, not pure motion):');
console.log('    · CENTER hero/sentence words (the reference is centered; the MOTION gives the dynamism, not asymmetry).');
for (const p of phrases.slice(0, 6)) console.log(`    · "${stripHtml(p.text).slice(0, 24)}" → typing:true or preset:"colorWave" (a typewriter / colour-wave reveal)`);
console.log('    · Verify with `make reveal`, read the GREEN cells: does every beat animate IN?');

if (WRITE) {
  if (!hasCamera) d.camera = [{ t: 0, s: 1.0 }, { t: duration, s: 1.09 }];
  let n = 0;
  for (const l of layers) {
    if (isHero(l)) {
      const du = l.duration ?? 1.2;
      l.motion = dolly(du); l.motionBlur = true; l.anim = 'none'; l.exitDur = 0; n++;
    }
  }
  const out = file.replace(/\.json$/, '.cinematic.json');
  fs.writeFileSync(out, JSON.stringify(d, null, 2));
  console.log(`\n  ✓ scaffold applied → ${out}  (${n} dollies${hasCamera ? '' : ' + camera'})`);
  console.log(`    Now: refine (center, typing/colorWave), then \`make reveal D=${out}\` and render.\n`);
} else {
  console.log('\n  suggest-only. Re-run with WRITE=1 to apply → <file>.cinematic.json\n');
}
