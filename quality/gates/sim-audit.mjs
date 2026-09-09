// scripts/gates/sim-audit.mjs: is the offline tier still deterministic, and is what shipped
// actually what the sim says?
//
//   node scripts/gates/sim-audit.mjs        (make sim-audit)
//
// Tier B moves non-determinism from render time to BAKE time. That only helps if the bake itself is
// reproducible and if the frames on disk are the frames the current sim produces. Three ways it
// silently is not, and one check each:
//
//   (i)   UNSEEDED    a sim reaches for Math.random / the wall clock. It still renders, it still
//                     plays, and it is a different sequence every time anyone re-bakes it. Nothing
//                     downstream can tell, because a frame sequence carries no evidence of its own
//                     reproducibility.
//   (ii)  STALE       the sim was edited after the bake. The old PNGs keep playing and the video
//                     ships the previous version of the effect. This is the exact shape of MISTAKES
//                     #96. A record that does not grow stale loudly, decays quietly.
//   (iii) SEQUENCE    a frame is missing or misnumbered. `clip` indexes by array position, so one
//                     absent PNG does not error: it shows the previous frame, or a broken <img>.
//
// Plus a contract check, because a sim missing an export fails at BAKE time with a message about
// undefined rather than about the contract it did not meet.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sourceHash } from '../sim/provenance.mjs';
import { gateFindings } from '../lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SIMS = path.join(repoRoot, 'sims');
const BAKED = path.join(repoRoot, 'assets/baked');

const problems = [];
const note = (kind, where, msg) => problems.push({ kind, where, msg });

// ---- (i) unseeded randomness / wall clock --------------------------------------------------------
// Comments are stripped first: this file's own prose names every pattern it bans, and so does
// sims/README.md. A scanner that cannot tell code from commentary condemns its own documentation.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const BANNED = [
  { re: /\bMath\.random\s*\(/, why: 'Math.random(), use ctx.rng (sims/lib/rng.mjs), seeded from the sim\'s exported seed' },
  { re: /\bDate\.now\s*\(/, why: 'Date.now(). A bake that depends on when it ran is not a bake' },
  { re: /\bnew\s+Date\s*\(/, why: 'new Date(), same: wall-clock time makes the bake unrepeatable' },
  { re: /\bperformance\.now\s*\(/, why: 'performance.now(), wall-clock time' },
  { re: /\bcrypto\.getRandomValues\s*\(/, why: 'crypto.getRandomValues(), platform entropy' },
  { re: /\bMath\.random\b/, why: 'a reference to Math.random' },
];

function simFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? simFiles(p) : e.name.endsWith('.mjs') ? [p] : [];
  });
}

const sims = simFiles(SIMS);
for (const f of sims) {
  const rel = path.relative(repoRoot, f);
  const code = stripComments(fs.readFileSync(f, 'utf8'));
  for (const b of BANNED) {
    const m = code.match(b.re);
    if (!m) continue;
    const line = code.slice(0, m.index).split('\n').length;
    note('unseeded', `${rel}:${line}`, b.why);
    break;   // one report per file; the fix is the same for all of them
  }
}

// ---- contract: every entry sim exports the shape the runner calls --------------------------------
// `lib/` holds helpers, not sims, so it is exempt by PATH rather than by name, a name-based exempt
// list is the thing that stops matching the moment somebody adds a second helper (MISTAKES #96).
const REQUIRED = ['dims', 'fps', 'frames', 'seed', 'setup', 'step', 'draw'];
const entrySims = sims.filter((f) => path.dirname(f) === SIMS);
for (const f of entrySims) {
  const rel = path.relative(repoRoot, f);
  let mod;
  try { mod = await import(pathToFileURL(f).href); }
  catch (e) { note('contract', rel, `does not import: ${e.message}`); continue; }
  const missing = REQUIRED.filter((k) => mod[k] === undefined);
  if (missing.length) note('contract', rel, `missing export(s): ${missing.join(', ')}`);
  if (mod.dims && (!(mod.dims.w > 0) || !(mod.dims.h > 0))) note('contract', rel, 'dims must be {w>0,h>0}');
  if (mod.frames !== undefined && !(mod.frames > 0)) note('contract', rel, 'frames must be > 0');
  if (mod.seed !== undefined && !Number.isInteger(mod.seed)) note('contract', rel, 'seed must be an integer (it is the PRNG state)');
}

// ---- (ii) stale bakes and (iii) broken sequences --------------------------------------------------
const bakes = fs.existsSync(BAKED)
  ? fs.readdirSync(BAKED, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  : [];

for (const name of bakes) {
  const dir = path.join(BAKED, name);
  const rel = `assets/baked/${name}`;
  const metaP = path.join(dir, 'meta.json'), manP = path.join(dir, 'manifest.json');
  if (!fs.existsSync(metaP)) { note('sequence', rel, 'no meta.json. This bake has no provenance, so nothing can tell whether it is current. Re-bake it.'); continue; }
  if (!fs.existsSync(manP)) { note('sequence', rel, 'no manifest.json. The clip layer has nothing to play.'); continue; }

  let meta, man;
  try { meta = JSON.parse(fs.readFileSync(metaP, 'utf8')); man = JSON.parse(fs.readFileSync(manP, 'utf8')); }
  catch (e) { note('sequence', rel, `unreadable json: ${e.message}`); continue; }

  // (ii) stale: does the source still hash to what produced these frames?
  const simAbs = path.join(repoRoot, meta.sim || '');
  if (!meta.sim || !fs.existsSync(simAbs)) {
    note('stale', rel, `meta.sim points at "${meta.sim}", which does not exist. The bake cannot be traced to a source.`);
  } else {
    const now = sourceHash(simAbs);
    if (now.hash !== meta.sourceHash) {
      const moved = Object.keys(now.files).filter((k) => now.files[k] !== (meta.sources || {})[k]);
      const gone = Object.keys(meta.sources || {}).filter((k) => !now.files[k]);
      note('stale', rel,
        `${meta.sim} has changed since this was baked, so the scene is playing the PREVIOUS version of the effect.\n` +
        `         changed: ${[...moved, ...gone.map((g) => g + ' (removed)')].join(', ') || '(source graph reshaped)'}\n` +
        `         fix: make sim D=${meta.sim} WRITE=1`);
    }
  }

  // (iii) sequence: manifest, meta and the files on disk must agree, with no gaps
  const pngs = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  if (man.count !== man.frames?.length) note('sequence', rel, `manifest count ${man.count} but ${man.frames?.length} frame entries`);
  if (meta.count !== man.count) note('sequence', rel, `meta.count ${meta.count} disagrees with manifest.count ${man.count}`);
  if (pngs.length !== man.count) note('sequence', rel, `${pngs.length} png files on disk but the manifest declares ${man.count}`);
  for (let i = 0; i < (man.frames || []).length; i++) {
    const want = `f${String(i + 1).padStart(4, '0')}.png`;
    const got = path.basename(man.frames[i] || '');
    if (got !== want) { note('sequence', rel, `frame ${i} is "${got}", expected "${want}". A misnumbered sequence plays the wrong moment silently`); break; }
    if (!fs.existsSync(path.join(dir, want))) { note('sequence', rel, `${want} is declared in the manifest and missing on disk. Clip would hold the previous frame rather than error`); break; }
  }
  if (man.fps !== meta.fps) note('sequence', rel, `manifest fps ${man.fps} disagrees with meta fps ${meta.fps}`);
}

// ---- report --------------------------------------------------------------------------------------
console.log('── sim audit: seeded, fresh, intact?\n');
console.log(`   sims:  ${entrySims.length} (+${sims.length - entrySims.length} helper module(s))`);
console.log(`   bakes: ${bakes.length}${bakes.length ? '  ' + bakes.join(', ') : ''}`);
// An audit over an empty set is not a pass, it is a no-op wearing a tick (MISTAKES #45/#68). Say so.
if (!entrySims.length) console.log('\n   (no sims: nothing to check)');
console.log('');

const f = gateFindings();
if (!problems.length) {
  console.log('='.repeat(72));
  // The old line claimed three things unconditionally. `assets/baked/` is gitignored, so a checkout with
  // none printed "every bake matches its source" having compared no bakes at all.
  console.log(`✓ sim audit OK, ${entrySims.length ? `all ${entrySims.length} sim(s) seeded` : 'no sims to seed-check'}`
    + `, ${bakes.length ? `all ${bakes.length} bake(s) match their source and their sequences are intact` : 'NO bakes present (assets/baked is gitignored) so nothing was compared against a source'}`);
  f.emit();
  process.exit(0);
}
console.log('='.repeat(72));
console.log(`SIM AUDIT FAILED (${problems.length})\n`);
for (const p of problems) {
  console.log(`  ✗ [${p.kind}] ${p.where}\n      ${p.msg}\n`);
  f.fail(`sim-${p.kind}`, p.msg, { at: p.where, doc: 'sims/README.md' });
}
console.log('Determinism moved to bake time; it did not disappear (sims/README.md).');
f.emit();
process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
