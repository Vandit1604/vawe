// ledger.mjs. The DESIGN LEDGER: cross-video memory that makes anti-sameness enforceable.
// Every shipped video logs its fingerprint; every new design is checked against history BEFORE
// shipping. Per-video QA can't see repetition, this can.
//
//   node quality/gates/ledger.mjs check formats/x/brand-video.json   # compare vs all logged designs
//   node quality/gates/ledger.mjs add   formats/x/brand-video.json   # log it (after it ships)
//   node quality/gates/ledger.mjs list
//   node quality/gates/ledger.mjs not [theme]                        # the FORWARD query: see deriveNotLine
//   make ledger D=… (check) · make ledger-add D=…
//
// Rules enforced by `check`: cross-brand SAME (>0.75) exits 1; cross-brand CLOSE (>0.55) warns;
// same-brand videos may share style but not an identical beat skeleton (SAME-SKELETON warns).
import fs from 'node:fs';
import path from 'node:path';
import { fingerprint, similarity, verdict } from './similarity.mjs';
import { gateFindings } from '../../scripts/lib/findings.mjs';
import { readReceipt } from '../../scripts/lib/receipt.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const LEDGER = path.join(ROOT, 'quality', 'ledger', 'ledger.json');

export const load = () => (fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : []);

// THE FORWARD QUERY. `check` asks "does this finished design repeat history"; an author staring at a
// blank brief needs the opposite direction: "what has recent work already leant on, so I can exclude it
// BY NAME instead of guessing". Same corpus (quality/ledger/ledger.json), same fingerprint, read the other way.
//
// A NOT line is a constraint, never a ban: it names what recent films used, it never tells the author
// what to use instead (that is `make arsenal`'s job), and a film with a real reason to repeat a value
// still can, via `authoring.allow` + `_why`.
//
// The item count is evidence, not taste: only a value used by a STRICT MAJORITY of the pool (more than
// half; a pool of one counts its own vocab, since one film is all the evidence there is) counts as
// "leant on", and each category is capped at 3 so the line stays pasteable. A twenty-item NOT line
// excludes nothing, because nobody reads it before ignoring it.
export function deriveNotLine(theme, entries) {
  const pool = theme ? entries.filter((e) => e.theme === theme) : entries;
  if (!pool.length) return { pool, line: null };
  const majority = Math.floor(pool.length / 2) + 1; // a STRICT majority: for a pool of 1, its own vocab
  const tally = (pick) => {
    const counts = new Map();
    for (const e of pool) for (const v of new Set(pick(e.fp))) counts.set(v, (counts.get(v) || 0) + 1);
    return [...counts.entries()].filter(([, n]) => n >= majority).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([v]) => v);
  };
  const cats = (fp) => fp.cats || {};
  const bg = tally((fp) => cats(fp).bg || []);
  const entrance = tally((fp) => cats(fp).entrance || []);
  const exit = tally((fp) => cats(fp).exit || []);
  const cut = tally((fp) => cats(fp).cut || []);
  const clauses = [];
  if (bg.length) clauses.push(`no ${bg.join('/')} background`);
  if (entrance.length) clauses.push(`no ${entrance.join('/')} entrance`);
  if (exit.length) clauses.push(`no ${exit.join('/')} exit`);
  if (cut.length) clauses.push(`no ${cut.join('/')} cut`);
  if (!clauses.length) return { pool, line: null };
  const scope = `${pool.length} logged design(s)${theme ? ` for theme "${theme}"` : ''}`;
  return { pool, line: `NOT   ${clauses.join(', ')}  (derived from ${scope})` };
}

// CLI ONLY WHEN RUN DIRECTLY. deriveNotLine and load are imported (by tests, and by preflight.mjs
// spawning this file rather than importing it), and an import must never run the dispatch below with
// the IMPORTER's argv (that was the whole bug class this guard exists to close).
if (process.argv[1] && process.argv[1].endsWith('ledger.mjs')) {
  const [cmd, file] = process.argv.slice(2);

  if (cmd === 'list') {
    const entries = load();
    if (!entries.length) console.log('ledger empty: nothing shipped yet');
    for (const e of entries) console.log(`${e.file}  (${e.theme}) · ${e.fp.structure.join('→')}`);
    process.exit(0);
  }
  if (cmd === 'not') {
    const theme = file; // second arg reused as an optional theme filter; omit it to read the whole corpus
    const entries = load();
    const { pool, line } = deriveNotLine(theme, entries);
    if (!pool.length) {
      console.log(theme ? `ledger has no logged design for theme "${theme}": no NOT line to derive.`
        : 'ledger empty: no NOT line to derive.');
    } else if (!line) {
      console.log(`${pool.length} logged design(s)${theme ? ` for theme "${theme}"` : ''}, but nothing crosses the majority bar: no NOT line to derive.`);
    } else {
      console.log(line);
    }
    process.exit(0);
  }
  if (!cmd || !file || !['check', 'add'].includes(cmd)) {
    console.error('usage: node quality/gates/ledger.mjs check|add|list|not [formats/x/video.json | theme]');
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
    // DONE MEANS THE EYE PASSED (taste loop, phase 1+4). The ledger is the design memory of FINISHED
    // work, so a cut is not logged until it has been judged and the verdict is PASS. The judge receipt is
    // hashed to the scene, so a PASS on an older cut reads as stale and does not count: the loop is not
    // done until the eye stops finding fixes against THIS render.
    const jr = readReceipt('judge', file);
    const v = jr.exists ? (jr.receipt && jr.receipt.verdict) : null;
    if (!jr.exists || jr.stale || v !== 'PASS') {
      const why = !jr.exists ? 'this cut has no judge verdict'
        : jr.stale ? 'the judge verdict is for an older cut of this film'
        : `the last judge verdict was ${v || 'not PASS'}`;
      console.error(`✗ ledger-add refused: ${why}. A film is done when the EYE passes, not when it renders.`);
      console.error(`    make judge D=${file}                 # render the key frames, score every one against the rubric`);
      console.error(`    make judge D=${file} --verdict PASS  # once the eye is satisfied (or --verdict FIX, then fix and re-judge)`);
      process.exit(1);
    }
    const next = entries.filter((e) => e.file !== rel);
    next.push({ file: rel, theme: fp.theme, module: data.module, added: new Date().toISOString().slice(0, 10), fp });
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    fs.writeFileSync(LEDGER, JSON.stringify(next, null, 2) + '\n');
    console.log(`✓ logged ${rel} (${fp.theme}): ledger now ${next.length} design(s)`);
  }
}
