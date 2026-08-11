// scripts/gates/inspect.mjs — INTENT VERIFICATION. Checks a scene against a declared `.intent.json`
// sidecar: for each beat you state the artifact that earns it + what must show + whether it must
// animate. inspect confirms the render actually delivers it. This is the another engine motion-verify
// idea: the agent verifies its OWN output against intent before a human sees it.
//
// Sidecar shape (scene.intent.json next to scene.json, or pass --intent):
//   { "spine": { "object": "the generate button", ... },
//     "beats": [
//     { "at": 4.6, "span": [3.4, 5.8], "name": "cold-open", "mustShow": ["Ship faster"],
//       "mustAnimate": true, "artifact": "a real mini-scene rendering with a loading bar",
//       "object": "the dot, spinning", "becomes": "the dot becomes the spinner" }, ... ] }
// `spine`, `span`, `object` and `becomes` are all optional — older sidecars without them still verify.
//
// WHAT IS ENFORCED, AND WHAT IS NOT. Read this before trusting a green run.
//   ENFORCED (machine-checked, fails the gate): `mustShow` — the copy is in a layer live at `at`;
//     `mustAnimate` — some layer live at `at` carries motion.
//   RECORDED ONLY (printed, never checked): `spine`, `object`, `becomes`. inspect reads the live DOM at
//     ONE timestamp. `becomes` is a claim about TWO moments and about IDENTITY — that the dot at 4.4s is
//     the same thing as the spinner at 4.6s. Nothing here can see that, and no check below pretends to.
//     They print so a failure names what was supposed to be happening, and so `make inspect` reads as a
//     director's checklist. A human (or the judge gate) verifies the transformation; this file does not.
//   Do not add a check for `becomes` that tests, say, "a layer exists in both beats" and call it
//     verified. That is silent substitution wearing a tick, the exact bug class this repo hates most.
//
// Usage: node scripts/gates/inspect.mjs <scene.json> [--intent path] [--strict]
import fs from 'node:fs';
import { plain } from '../lib/text.mjs';

const file = process.argv[2];
const strict = process.argv.includes('--strict');
const intentPath = (() => { const i = process.argv.indexOf('--intent'); return i >= 0 ? process.argv[i + 1] : file.replace(/\.json$/, '.intent.json'); })();
if (!file) { console.error('usage: node scripts/gates/inspect.mjs <scene.json> [--intent p] [--strict]'); process.exit(2); }
if (!fs.existsSync(intentPath)) { console.log(`  (no intent sidecar at ${intentPath} — nothing to verify)`); process.exit(0); }

const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
const layers = d.layers || [];
const s0 = (l) => l.start ?? 0, s1 = (l) => s0(l) + (l.duration ?? 0);
const active = (t) => layers.filter((l) => s0(l) <= t + 0.001 && s1(l) >= t - 0.001);
const flat = (l, acc = []) => { acc.push(l); (l.children || []).forEach((c) => flat(c, acc)); return acc; };
// STRIPPED. The needle comes from the storyboard's plain prose and the layer holds HTML, so matching
// the authored string fails every film that emphasises a word (docs/MISTAKES.md #313).
const textOf = (l) => (l.type === 'text' ? plain(l.text) : '') + (l.block ? ` [block:${l.block}]` : '');
const animated = (l) => !!(l.anim || l.split || l.preset || l.type === 'count' || l.ken || (l.children || []).some(animated));

let pass = 0, fail = 0;
console.log(`\n  inspect · ${file} vs ${intentPath}\n`);
if (intent.spine?.object) {
  console.log(`  spine · ${intent.spine.object}`);
  if (intent.spine.object_t0) console.log(`         t0: ${intent.spine.object_t0}`);
  if (intent.spine.object_last) console.log(`       last: ${intent.spine.object_last}`);
  console.log('         (recorded from the storyboard, verified by eye — not checked here)\n');
}
for (const b of intent.beats || []) {
  const at = b.at;
  const here = active(at).flatMap((l) => flat(l));
  const shown = (b.mustShow || []).filter((needle) =>
    here.some((l) => textOf(l).toLowerCase().includes(String(needle).toLowerCase()) || l.block === needle));
  const missing = (b.mustShow || []).filter((n) => !shown.includes(n));
  const hasMotion = b.mustAnimate ? active(at).some(animated) : true;
  const ok = missing.length === 0 && hasMotion;
  ok ? pass++ : fail++;
  const window = Array.isArray(b.span) ? ` (${b.span[0]}s–${b.span[1]}s)` : '';
  console.log(`  ${ok ? '✓' : '✗'} @${at}s${window} ${b.name || ''}`);
  // REPORTING, not a check: the transformation this beat owes. Printed so the run reads as a director's
  // checklist. Nothing above or below tests it — see the honesty note at the top of this file.
  if (b.becomes) console.log(`      · becomes: ${b.becomes}`);
  if (missing.length) console.log(`      missing artifact: ${missing.map((m) => JSON.stringify(m)).join(', ')} — expected: ${b.artifact || '?'}`);
  if (b.mustAnimate && !hasMotion) console.log(`      declared mustAnimate but no animated layer is live at ${at}s`);
  // a failure should say what was supposed to be happening here, not just which string went missing.
  if (!ok && (b.becomes || b.object)) {
    if (b.object) console.log(`      at this moment the object should be: ${b.object}`);
    if (b.becomes) console.log(`      and the junction should deliver: ${b.becomes}`);
  }
}
console.log(`\n  ${pass} pass · ${fail} fail\n`);
process.exit(fail && (strict || true) ? (fail ? 1 : 0) : 0);
