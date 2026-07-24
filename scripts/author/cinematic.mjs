// cinematic.mjs — the CINEMATIC MOTION director. Real launch films are never static: a continuous
// camera push + a dolly enter/exit on every hero word is what makes them feel alive (docs/CRAFT/
// REFERENCE-STUDY.md). Authoring that by hand on every beat is slow and is how static/off beats slip in.
// This emits the motion SCAFFOLD — camera push + per-hero dolly + motion-blur — derived from the scene's
// OWN beats (not a template), which you then refine. Suggest-first; WRITE=1 → <file>.cinematic.json.
//
//   make cinematic D=formats/scene/x.json            # report: what it would add
//   make cinematic D=formats/scene/x.json WRITE=1    # → x.cinematic.json (then `make reveal` it)
//
// NOT a template: it adds MOTION to the layers/beats you already authored and never invents content or
// a canned layout. The ledger + `make direct` one-family rule stay the gate. Verify with `make reveal`.
import fs from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/author/cinematic.mjs <scene.json> [--write]'); process.exit(2); }
const WRITE = process.env.WRITE === '1' || process.argv.includes('--write');
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const layers = d.layers || [];
const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, '').trim();
const wordCount = (s) => stripHtml(s).split(/\s+/).filter(Boolean).length;

// duration: explicit, else last layer end (+0.4 tail) — mirrors scene.html
let duration = d.duration || 0;
if (!duration) for (const l of layers) duration = Math.max(duration, (l.start ?? 0) + (l.duration ?? 2));
duration = +(duration + (d.duration ? 0 : 0.4)).toFixed(2);

// beats = layer-start clusters (>1.4s gap), same signal as the critique/motion-director
const starts = [...new Set(layers.filter((l) => l.track !== 0).map((l) => l.start ?? 0))].sort((a, b) => a - b);
const beats = [];
for (const t of starts) { const last = beats[beats.length - 1]; if (last == null || t - last > 1.4) beats.push(t); }

// HERO = a big, short text word (the thing that should dolly). Not a sentence, not a chip, not already moving.
const isHero = (l) => l.type === 'text' && (l.size ?? 96) >= 180 && wordCount(l.text) <= 2 && !l.motion && l.text != null;
// PHRASE = a multi-word text line (candidate for typing / inkflash colour-wave)
const isPhrase = (l) => l.type === 'text' && wordCount(l.text) >= 2 && !l.typing && l.preset == null && l.text != null;

// the dolly: enter oversized → settle → drift → exit bigger (with motion-blur streak). Pure motion track.
const dolly = (du) => [
  { t: 0, scale: 1.45, opacity: 0, ease: 'easeOutCubic' },
  { t: 0.42, scale: 1.0, opacity: 1, ease: 'easeOutCubic' },
  { t: +Math.max(0.55, du - 0.3).toFixed(2), scale: 1.04, ease: 'linear' },
  { t: +du.toFixed(2), scale: 1.8, opacity: 0, ease: 'easeInCubic' },
];

const heroes = layers.filter(isHero);
const phrases = layers.filter(isPhrase);
const hasCamera = Array.isArray(d.camera) && d.camera.length;

console.log(`\n  cinematic director · ${file}`);
console.log(`  ${beats.length} beats · ${duration}s · ${heroes.length} hero word(s) to dolly · camera ${hasCamera ? 'present (kept)' : 'MISSING → add a smooth push'}`);
console.log('');
console.log('  WILL ADD (the aliveness — camera + dolly, derived from your beats):');
if (!hasCamera) console.log(`    · camera: a smooth global push  s 1.0 → 1.09 over ${duration}s (one continuous move, no reversals — MISTAKES #125)`);
for (const h of heroes) console.log(`    · dolly + motionBlur on "${stripHtml(h.text).slice(0, 20)}" @${(h.start ?? 0).toFixed(1)}s (enter oversized → settle → exit bigger)`);
if (!heroes.length) console.log('    · (no hero words detected — nothing to dolly)');
console.log('');
console.log('  RECOMMENDS (compose these yourself — they are content choices, not pure motion):');
console.log('    · CENTER hero/sentence words (the reference is centered; the MOTION gives the dynamism, not asymmetry).');
for (const p of phrases.slice(0, 6)) console.log(`    · "${stripHtml(p.text).slice(0, 24)}" → typing:true or preset:"inkflash" (a typewriter / colour-wave reveal)`);
console.log('    · Verify with `make reveal` — read the GREEN cells: does every beat animate IN?');

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
  console.log(`    Now: refine (center, typing/inkflash), then \`make reveal D=${out}\` and render.\n`);
} else {
  console.log('\n  suggest-only. Re-run with WRITE=1 to apply → <file>.cinematic.json\n');
}
