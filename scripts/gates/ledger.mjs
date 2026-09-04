// ledger.mjs. The DESIGN LEDGER: cross-video memory that makes anti-sameness enforceable.
// Every shipped video logs its fingerprint; every new design is checked against history BEFORE
// shipping. Per-video QA can't see repetition, this can.
//
//   node scripts/gates/ledger.mjs check formats/x/brand-video.json   # compare vs all logged designs
//   node scripts/gates/ledger.mjs add   formats/x/brand-video.json   # log it (after it ships)
//   node scripts/gates/ledger.mjs list
//   make ledger D=… (check) · make ledger-add D=…
//
// Rules enforced by `check`: cross-brand SAME (>0.75) exits 1; cross-brand CLOSE (>0.55) warns;
// same-brand videos may share style but not an identical beat skeleton (SAME-SKELETON warns).
import fs from 'node:fs';
import path from 'node:path';
import { fingerprint, similarity, verdict } from './similarity.mjs';
import { gateFindings } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const LEDGER = path.join(ROOT, 'dna', 'ledger.json');
const [cmd, file] = process.argv.slice(2);

const load = () => (fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : []);

if (cmd === 'list') {
  const entries = load();
  if (!entries.length) console.log('ledger empty: nothing shipped yet');
  for (const e of entries) console.log(`${e.file}  (${e.theme}) · ${e.fp.structure.join('→')}`);
  process.exit(0);
}
if (!cmd || !file || !['check', 'add'].includes(cmd)) {
  console.error('usage: node scripts/gates/ledger.mjs check|add|list [formats/x/video.json]');
  process.exit(1);
}

const rel = path.relative(ROOT, path.resolve(ROOT, file));
const data = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8'));
const fp = fingerprint(data);
const entries = load();

if (cmd === 'check') {
  const f = gateFindings();
  for (const e of entries) {
    if (e.file === rel) continue; // re-checking a shipped file against itself is meaningless
    const sameBrand = e.theme === fp.theme;
    const s = similarity(fp, e.fp);
    const v = verdict(s, sameBrand);
    if (v === 'ok' || v === 'distinct') continue;
    const scoreStr = `score ${(s.score * 100).toFixed(0)}% · vocab ${(s.vocab * 100).toFixed(0)}% · structure ${(s.struct * 100).toFixed(0)}%`;
    const fix = v === 'SAME-SKELETON' ? 'same brand retelling the same beat skeleton, vary the structure'
      : v === 'SAME' ? 'differentiate: change ≥2 of {cut family, beat structure, layout archetype}' : undefined;
    const add = v === 'SAME' ? f.fail : f.warn;
    add.call(f, v.toLowerCase(), `vs ${e.file}${sameBrand ? ' (same brand)' : ''}, ${scoreStr}`, { at: e.file, fix });
  }
  if (!f.count) console.log(`✓ distinct from all ${entries.length} logged design(s)`);
  f.emit();
  process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
}

if (cmd === 'add') {
  const next = entries.filter((e) => e.file !== rel);
  next.push({ file: rel, theme: fp.theme, module: data.module, added: new Date().toISOString().slice(0, 10), fp });
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, JSON.stringify(next, null, 2) + '\n');
  console.log(`✓ logged ${rel} (${fp.theme}): ledger now ${next.length} design(s)`);
}
