// scripts/inspect.mjs — INTENT VERIFICATION. Checks a scene against a declared `.intent.json`
// sidecar: for each beat you state the artifact that earns it + what must show + whether it must
// animate. inspect confirms the render actually delivers it. This is the another engine motion-verify
// idea: the agent verifies its OWN output against intent before a human sees it.
//
// Sidecar shape (scene.intent.json next to scene.json, or pass --intent):
//   { "beats": [
//     { "at": 4.6, "name": "cold-open", "mustShow": ["Ship faster"], "mustAnimate": true,
//       "artifact": "a real mini-scene rendering with a loading bar" }, ... ] }
//
// Usage: node scripts/inspect.mjs <scene.json> [--intent path] [--strict]
import fs from 'node:fs';

const file = process.argv[2];
const strict = process.argv.includes('--strict');
const intentPath = (() => { const i = process.argv.indexOf('--intent'); return i >= 0 ? process.argv[i + 1] : file.replace(/\.json$/, '.intent.json'); })();
if (!file) { console.error('usage: node scripts/inspect.mjs <scene.json> [--intent p] [--strict]'); process.exit(2); }
if (!fs.existsSync(intentPath)) { console.log(`  (no intent sidecar at ${intentPath} — nothing to verify)`); process.exit(0); }

const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
const layers = d.layers || [];
const s0 = (l) => l.start ?? 0, s1 = (l) => s0(l) + (l.duration ?? 0);
const active = (t) => layers.filter((l) => s0(l) <= t + 0.001 && s1(l) >= t - 0.001);
const flat = (l, acc = []) => { acc.push(l); (l.children || []).forEach((c) => flat(c, acc)); return acc; };
const textOf = (l) => (l.type === 'text' ? l.text || '' : '') + (l.block ? ` [block:${l.block}]` : '');
const animated = (l) => !!(l.anim || l.split || l.preset || l.type === 'count' || l.ken || (l.children || []).some(animated));

let pass = 0, fail = 0;
console.log(`\n  inspect · ${file} vs ${intentPath}\n`);
for (const b of intent.beats || []) {
  const at = b.at;
  const here = active(at).flatMap((l) => flat(l));
  const shown = (b.mustShow || []).filter((needle) =>
    here.some((l) => textOf(l).toLowerCase().includes(String(needle).toLowerCase()) || l.block === needle));
  const missing = (b.mustShow || []).filter((n) => !shown.includes(n));
  const hasMotion = b.mustAnimate ? active(at).some(animated) : true;
  const ok = missing.length === 0 && hasMotion;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} @${at}s ${b.name || ''}`);
  if (missing.length) console.log(`      missing artifact: ${missing.map((m) => JSON.stringify(m)).join(', ')} — expected: ${b.artifact || '?'}`);
  if (b.mustAnimate && !hasMotion) console.log(`      declared mustAnimate but no animated layer is live at ${at}s`);
}
console.log(`\n  ${pass} pass · ${fail} fail\n`);
process.exit(fail && (strict || true) ? (fail ? 1 : 0) : 0);
