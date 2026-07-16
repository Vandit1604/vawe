// scripts/motion-director.mjs — the MOTION DIRECTOR. Picks the right cut/sting per beat-transition from
// the brand's motion personality (theme.motion) + the MOTION-CRAFT ruleset, so effects are chosen with
// restraint instead of the author over-reaching. Suggest-first: prints a director's report; WRITE=1 (or
// --write) applies the picks into <file>.directed.json. Deterministic (pure mapping, no Date/random).
//
// Rules encoded (docs/MOTION-CRAFT.md): cover a hard background jump with a sting · whip/punch only when
// the background DOESN'T change · one cut family per film, rotated so no archetype repeats · match the
// brand: punchy → snap cuts, calm → dissolves.
//
// Usage: node scripts/motion-director.mjs <scene.json> [--write]   ·   make direct D=<file> [WRITE=1]
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/motion-director.mjs <scene.json> [--write]'); process.exit(2); }
const WRITE = process.env.WRITE === '1' || process.argv.includes('--write');
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const layers = d.layers || [];

// resolve the brand's motion personality from its theme (string name → themes/<name>.json, or inline).
let motion = {};
try { motion = typeof d.theme === 'string' ? (JSON.parse(fs.readFileSync(path.join('themes', d.theme + '.json'), 'utf8')).motion || {}) : (d.theme?.motion || {}); } catch {}
const settle = motion.settle ?? 0.5, bounce = motion.bounce ?? 0;
const personality = (bounce > 0.1 || settle < 0.4) ? 'punchy' : (settle >= 0.55 && bounce < 0.05) ? 'calm' : 'neutral';

const FAMILY = {
  punchy: { cuts: ['punch', 'whip', 'zoom', 'slide'], stings: ['flash', 'streak'] },
  calm: { cuts: ['fade', 'blur', 'riseBlur', 'wipe'], stings: ['dissolve', 'ink', 'bokeh'] },
  neutral: { cuts: ['fade', 'slide', 'wipe', 'blur'], stings: ['dissolve', 'flash'] },
}[personality];

// beats = clusters of layer start-times (a >1.4s gap starts a new beat), same as critique.
const s0 = (l) => l.start ?? 0;
const starts = [...new Set(layers.filter((l) => l.track !== 0).map(s0))].sort((a, b) => a - b);
const beats = [];
for (const t of starts) { const last = beats[beats.length - 1]; if (!last || t - last > 1.4) beats.push(t); }

// bg window active at time t (preset+value); a change across a transition = a hard cut → sting.
const bgAt = (t) => { let w = null; for (const b of d.bg || []) if (t >= (b.from ?? 0) && t < (b.to ?? 1e9)) w = b; return w ? `${w.preset || 'plain'}:${w.value || ''}` : null; };

const picks = [];
beats.forEach((t, i) => {
  if (i === 0) return; // the first beat opens; nothing to transition FROM
  const bgChanged = bgAt(t - 0.05) !== bgAt(t + 0.05);
  const cut = FAMILY.cuts[(i - 1) % FAMILY.cuts.length];
  const sting = bgChanged ? FAMILY.stings[(i - 1) % FAMILY.stings.length] : null;
  const reason = bgChanged ? 'background jumps → cover the cut with a sting' : 'same background → a clean cut reads';
  picks.push({ t, cut, sting, reason });
});

// ---- report ----
console.log(`\n  motion director · ${file}`);
console.log(`  brand personality: ${personality}  (settle ${settle}, bounce ${bounce}) → cut family [${FAMILY.cuts.join(', ')}]\n`);
if (!picks.length) console.log('  only one beat — no transitions to direct.\n');
for (const p of picks) {
  console.log(`  @${p.t.toFixed(1)}s  cut: ${p.cut.padEnd(9)}${p.sting ? `sting: ${p.sting.padEnd(9)}` : ''.padEnd(16)}${p.reason}`);
}

if (WRITE) {
  const stings = [...(d.stings || [])];
  for (const p of picks) {
    // apply the cut to the beat's top-level content layers that don't already declare one.
    for (const L of layers) if (Math.abs((L.start ?? 0) - p.t) < 0.01 && L.track !== 0 && !L.cut && (L.type === undefined || L.type !== 'rect')) L.cut = p.cut;
    if (p.sting && !stings.some((s) => Math.abs((s.t ?? 0) - p.t) < 0.2)) stings.push({ t: r2(p.t), fx: p.sting, dur: 0.6 });
  }
  if (stings.length) d.stings = stings.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  const out = file.replace(/\.json$/, '.directed.json');
  fs.writeFileSync(out, JSON.stringify(d, null, 2));
  console.log(`\n  ✓ applied → ${out}  (${picks.length} cuts, ${picks.filter((p) => p.sting).length} stings)\n`);
} else {
  console.log(`\n  suggest-only. Re-run with WRITE=1 (or --write) to apply → <file>.directed.json\n`);
}

function r2(n) { return Math.round(n * 100) / 100; }
