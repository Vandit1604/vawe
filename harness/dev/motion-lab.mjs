#!/usr/bin/env node
// scripts/dev/motion-lab.mjs: does a motion change actually raise the local-motion floor, or is it an
// opinion. Renders a BASE storyboard's named VARIANTS the same way and reports one table, so "I think
// this motion helps" becomes a number instead of a feeling.
//
//   node scripts/dev/motion-lab.mjs <base.storyboard.md> --variants <variants.json> [--keep]
//   node scripts/dev/motion-lab.mjs --self-test
//   make motion-lab D=<base.storyboard.md> VARIANTS=<variants.json>
//
// variants.json: { "<name>": { "<beat number>": "<selector>@<kind>:<band>", ... }, ... }. A variant
// touches ONLY the named beats' `motion:` line (scripts/lib/contract.mjs parseMotion), because that is
// the one knob docs/MISTAKES.md #608 did NOT already rule out: it proved structure (a shared fragment,
// a keyed object chain) moves the floor by nothing, so what is left to test is density, the number and
// placement of keyed reveals per second. An implicit "base" variant (no edits) always runs first, so
// every named variant is read against the unmodified film.
//
// A variant copied under a scratch name still has to find the real fragments on disk: any beat that
// names no explicit `fragment:` gets one pointing at the ORIGINAL film's own fragment
// (`<origBase>.sceneN.html`), so assemble.mjs's default naming (`<scratchBase>.sceneN.html`) never gets
// asked to resolve against a file that was never written.
//
// EVERY VARIANT IS BUILT, RENDERED AND MEASURED THE SAME WAY, on purpose: `assemble.mjs` then
// `./bin/vawe --draft` then `quality/gates/motion-floor.mjs`'s own `pullFrames`/`profile` (imported, not
// reimplemented) on the resulting out/<name>.mp4. If the variants were not rendered identically the
// comparison would be worthless, which is the whole reason this file exists instead of eyeballing three
// renders.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseMotion } from '../lib/contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRATCH_TAG = '_motion-lab';

// motion-floor.mjs runs ITS OWN self-test as an unguarded top-level side effect the instant
// `process.argv` contains `--self-test` (it has no `import.meta.url === main` guard around that one
// check, only around its CLI). A static `import` of it here would run and exit(0) before this file's
// own `--self-test` ever got to do anything, because both scripts share one process's argv. So the
// import is deferred and process.argv is hidden from it for the one moment it evaluates, restored
// right after: motion-floor.mjs itself is untouched, per the plan ("call it as it is").
let motionFloor = null;
async function loadMotionFloor() {
  if (motionFloor) return motionFloor;
  const real = process.argv;
  process.argv = real.filter((a) => a !== '--self-test');
  try {
    motionFloor = await import('../../quality/gates/motion-floor.mjs');
  } finally {
    process.argv = real;
  }
  return motionFloor;
}

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
}

// ── storyboard mutation: touch ONLY the beats' `motion:` line, plus a fragment default that keeps a
// scratch-named copy pointed at the ORIGINAL film's fragments ─────────────────────────────────────

/** setField(block, key, value) -> block with `- key: value` set, replacing an existing line or
 * inserting one right after the beat's title line. */
function setField(block, key, value) {
  const re = new RegExp(`^(\\s*[-*]?\\s*${key}\\s*:\\s*).*$`, 'mi');
  if (re.test(block)) return block.replace(re, `$1${value}`);
  const lines = block.split('\n');
  lines.splice(1, 0, `- ${key}: ${value}`);
  return lines.join('\n');
}

/** mutateStoryboard(src, origBase, edits) -> variant text. `edits` maps 1-based beat number -> a new
 * `motion:` string. `origBase` is the ORIGINAL film's basename (no extension), used to backfill a
 * `fragment:` default on any beat that does not already declare one. */
export function mutateStoryboard(src, origBase, edits = {}) {
  const splitAt = src.search(/^##\s+/m);
  const head = splitAt === -1 ? src : src.slice(0, splitAt);
  const blocks = splitAt === -1 ? [] : src.slice(splitAt).split(/^(?=##\s+)/m);
  const out = blocks.map((block, i) => {
    const n = i + 1;
    let b = block;
    if (edits[n] != null) b = setField(b, 'motion', edits[n]);
    if (!/^\s*[-*]?\s*fragment\s*:/mi.test(b)) b = setField(b, 'fragment', `${origBase}.scene${n}.html`);
    return b;
  });
  return head + out.join('');
}

/** movesPerBeat(storyboardSrc) -> total legal `motion:` entries / beat count, for the report table. */
function movesPerBeat(src) {
  const splitAt = src.search(/^##\s+/m);
  const blocks = splitAt === -1 ? [] : src.slice(splitAt).split(/^(?=##\s+)/m);
  if (!blocks.length) return 0;
  const motionLine = (b) => /^\s*[-*]?\s*motion\s*:\s*(.+)$/mi.exec(b)?.[1];
  const total = blocks.reduce((n, b) => n + parseMotion(motionLine(b)).filter((e) => !e.error).length, 0);
  return total / blocks.length;
}

// ── run ONE variant: write, assemble, render, measure. Same steps, same order, every time ──────────

async function measure(mp4) {
  const { pullFrames, profile, DEAD } = await loadMotionFloor();
  const frames = pullFrames(mp4);
  if (!frames) return { error: 'ffmpeg returned no frames' };
  const prof = profile(frames);
  // Same convention motion-floor.mjs uses: the last two windows are the outro, allowed to hold.
  const body = prof.slice(0, -2);
  if (!body.length) return { error: 'render too short to profile (need at least 3 windows of 0.5s)' };
  const dead = body.filter((w) => w.local < DEAD).length;
  const sorted = [...body.map((w) => w.local)].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const peak = Math.max(...body.map((w) => w.local));
  return { windows: body.length, dead, median, peak };
}

function scratchFiles(dir, tag) {
  const base = path.join(dir, `${SCRATCH_TAG}-${tag}`);
  return { sbPath: `${base}.storyboard.md`, jsonPath: `${base}.json`, mp4: path.join(ROOT, 'out', `${SCRATCH_TAG}-${tag}.mp4`) };
}

/** runVariant({name, tag, dir, storyboardText, jsonSeed, extraFiles}) -> {name, moves, stats|error}.
 * `extraFiles` (self-test only) are scratch fragment files this variant also owns and must clean up. */
async function runVariant({ name, tag, dir, storyboardText, jsonSeed, extraFiles = [], keep = false }) {
  const { sbPath, jsonPath, mp4 } = scratchFiles(dir, tag);
  const owned = [sbPath, jsonPath, mp4, ...extraFiles];
  try {
    fs.writeFileSync(sbPath, storyboardText);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonSeed, null, 1) + '\n');

    const check = run('node', ['quality/gates/storyboard-check.mjs', sbPath]);
    if (check.status !== 0) return { name, error: `storyboard-check: ${(check.stdout + check.stderr).trim()}` };

    const asm = run('node', ['scripts/author/assemble.mjs', jsonPath]);
    if (asm.status !== 0) return { name, error: `assemble: ${(asm.stdout + asm.stderr).trim()}` };

    const key = path.basename(jsonPath, '.json');
    const render = run('sh', ['-c',
      `. scripts/dev/chrome-pin.sh motion-lab >/dev/null 2>&1; scripts/dev/render-lock.sh "${key}" ./bin/vawe "${jsonPath}" --draft`]);
    if (render.status !== 0) return { name, error: `render: ${(render.stdout + render.stderr).trim().slice(-800)}` };

    const stats = await measure(mp4);
    const moves = movesPerBeat(storyboardText);
    return { name, moves, ...(stats.error ? { error: `motion-floor: ${stats.error}` } : { stats }) };
  } finally {
    if (!keep) for (const f of owned) { try { fs.unlinkSync(f); } catch {} }
  }
}

function printTable(rows) {
  console.log(`\n  ${'variant'.padEnd(16)} ${'moves/beat'.padStart(10)} ${'dead'.padStart(6)} ${'median'.padStart(8)} ${'peak'.padStart(8)}`);
  for (const r of rows) {
    if (r.error) { console.log(`  ${r.name.padEnd(16)}  ✗ ${r.error}`); continue; }
    const s = r.stats;
    console.log(`  ${r.name.padEnd(16)} ${r.moves.toFixed(2).padStart(10)} ${`${s.dead}/${s.windows}`.padStart(6)} ${s.median.toFixed(2).padStart(8)} ${s.peak.toFixed(2).padStart(8)}`);
  }
  console.log('');
}

// ── self-test: reproduce docs/MISTAKES.md #608 (the A/B/C structural experiment) end to end ────────
//
// A: two beats, a fragment each, torn down and rebuilt at the cut. B: the same two beats sharing ONE
// fragment (acrossBeats survives the cut), no object. C: B plus a keyed object chain across the cut
// (a slow center@900x420 -> center@760x360 drift, the SAME shape #608 measured: ambient, not local).
// Same theme, same copy, same 6 seconds, one fadeUp reveal per 3s beat in every variant: the only thing
// that differs between A/B/C is the structure #608 is about, never the motion plan under it.
async function selfTest() {
  const dir = path.join(ROOT, 'formats/scene');
  const FRAG = (label) => `<style>.stage{position:absolute;inset:0;display:flex;align-items:center;`
    + `justify-content:center;background:#0b0d10}.headline{font:700 96px/1.1 sans-serif;color:#fff}</style>`
    + `<div class="stage"><div class="headline" data-part="headline">${label}</div></div>\n`;

  const frontmatter = `---\n`
    + `message: "motion-lab self-test: structure alone does not raise the local-motion floor."\n`
    + `audience: "internal, docs/MISTAKES.md #608"\n`
    + `arc: "hold -> hold"\n`
    + `format: 1920x1080\n`
    + `theme: "themes/vawe.json"\n`
    + `duration: 6s\n`
    + `threads: "one reveal per beat, held for the rest of its three seconds; the same headline both times"\n`
    + `spectacle: "beat 1 - the headline's single reveal is the only loud moment in either beat"\n`
    + `not: "no idle, no breathe, no second reveal per beat"\n`
    + `---\n\n`;
  const beat = (n, startS, endS, becomes) => `## Beat ${n}: Hold ${n} (${startS}s-${endS}s)\n`
    + `- type: ${n === 1 ? 'hook' : 'payoff'}\n`
    + `- onscreen: "Motion Lab"\n`
    + `- mechanism: a single fadeUp reveal on the headline, then nothing else moves\n`
    + `- becomes: ${becomes}\n`
    + `- motion: [data-part="headline"]@fadeUp:professional\n`
    + `- why: repeat the identical reveal so only the structural change under it can differ\n`
    + `- duration: 3s\n\n`;

  const results = [];

  // A: two distinct fragments, no fragment: override needed (default naming already gives each beat
  // its own file), no object chain.
  {
    const tag = 'a';
    const f1 = path.join(dir, `${SCRATCH_TAG}-${tag}.scene1.html`);
    const f2 = path.join(dir, `${SCRATCH_TAG}-${tag}.scene2.html`);
    fs.writeFileSync(f1, FRAG('Motion Lab'));
    fs.writeFileSync(f2, FRAG('Motion Lab'));
    const sb = frontmatter + beat(1, 0, 3, 'an empty frame becomes a held headline')
      + beat(2, 3, 6, 'the first hold becomes the second, torn down and rebuilt');
    results.push(await runVariant({ name: 'A tear-down', tag, dir, storyboardText: sb,
      jsonSeed: { module: 'scene', theme: 'vawe' }, extraFiles: [f1, f2] }));
  }

  // B: the same two beats sharing ONE fragment (fragment: named explicitly on both, so assemble.mjs's
  // run-merging keeps the DOM alive across the cut), still no object.
  {
    const tag = 'b';
    const shared = path.join(dir, `${SCRATCH_TAG}-${tag}.shared.html`);
    fs.writeFileSync(shared, FRAG('Motion Lab'));
    const fragLine = `${SCRATCH_TAG}-${tag}.shared.html`;
    let sb = frontmatter + beat(1, 0, 3, 'an empty frame becomes a held headline')
      + beat(2, 3, 6, 'the first hold becomes the second, DOM kept alive across the cut');
    sb = sb.split(/^(?=##\s+)/m).map((block, i) => i === 0 ? block : setField(block, 'fragment', fragLine)).join('');
    results.push(await runVariant({ name: 'B shared-DOM', tag, dir, storyboardText: sb,
      jsonSeed: { module: 'scene', theme: 'vawe' }, extraFiles: [shared] }));
  }

  // C: B plus a keyed object chain, a slow drift (center@900x420 -> center@760x360 over the whole
  // film), the SAME shape #608 measured: ambient (whole-frame, gentle) rather than local (a reveal).
  {
    const tag = 'c';
    const shared = path.join(dir, `${SCRATCH_TAG}-${tag}.shared.html`);
    fs.writeFileSync(shared, FRAG('Motion Lab'));
    const fragLine = `${SCRATCH_TAG}-${tag}.shared.html`;
    let sb = frontmatter + beat(1, 0, 3, 'an empty frame becomes a held headline')
      + beat(2, 3, 6, 'the first hold becomes the second, DOM kept alive across the cut');
    sb = sb.split(/^(?=##\s+)/m).map((block, i) => {
      if (i === 0) return block;
      let b = setField(block, 'fragment', fragLine);
      b = setField(b, 'object_in', i === 1 ? 'center@900x420' : 'center@830x390');
      b = setField(b, 'object_out', i === 1 ? 'center@830x390' : 'center@760x360');
      return b;
    }).join('');
    results.push(await runVariant({ name: 'C object-chain', tag, dir, storyboardText: sb,
      jsonSeed: { module: 'scene', theme: 'vawe' }, extraFiles: [shared] }));
  }

  printTable(results);

  const dead = results.map((r) => r.stats && r.stats.dead);
  if (results.some((r) => r.error)) {
    console.error(`✗ self-test: a variant failed to render, see the table above. Cannot judge dead-window counts.`);
    process.exit(1);
  }
  console.log(`  measured dead windows: A=${dead[0]} B=${dead[1]} C=${dead[2]} (docs/MISTAKES.md #608: A=9 B=9 C=10)`);
  const reproduced = dead[0] === 9 && dead[1] === 9 && dead[2] === 10;
  if (reproduced) {
    console.log('  ✓ motion-lab self-test: reproduced the exact #608 figures (9, 9, 10)');
    process.exit(0);
  }
  // The qualitative finding, checked honestly rather than declared: structure (A vs B) buys nothing,
  // and the object chain (C) is worse or equal, never better, because its motion is ambient.
  const structureBuysNothing = dead[0] === dead[1];
  const chainNotBetter = dead[2] >= dead[1];
  if (structureBuysNothing && chainNotBetter) {
    console.log('  ~ self-test: did not reproduce the exact digits (9, 9, 10) on these fixtures, but the finding');
    console.log('    holds: A and B measure the same dead-window count, and C is no better than B. See the');
    console.log('    real numbers above rather than the ones #608 recorded on a different film.');
    process.exit(0);
  }
  console.error('✗ self-test: this rig does NOT reproduce the #608 finding on these fixtures. A and B agree');
  console.error('  (structure alone buys nothing, confirmed), but the object-chain variant (C) measured');
  console.error(`  ${dead[2]} dead windows against B's ${dead[1]}, not "no better". Likely cause: #608's object`);
  console.error('  chain read as GLOBAL (spread, ambient); a size-only key on a solid rect changes only a');
  console.error('  thin border ring each window, which pairProfile\'s share metric reads as LOCAL (concentrated),');
  console.error('  the opposite classification. Reproducing the exact #608 film is not possible (its scratch');
  console.error('  files were thrown away, per the entry); this is a different film built to the same');
  console.error('  description, and it disagrees with the C claim rather than confirming it. Reporting this');
  console.error('  rather than adjusting the fixture until the number matches.');
  process.exit(1);
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    await selfTest();
    return;
  }
  const keep = args.includes('--keep');
  const sbArg = args.find((a) => !a.startsWith('--'));
  const variantsArg = args.includes('--variants') ? args[args.indexOf('--variants') + 1] : null;
  if (!sbArg || !fs.existsSync(sbArg)) {
    console.error('usage: node scripts/dev/motion-lab.mjs <base.storyboard.md> --variants <variants.json> [--keep]');
    console.error('       node scripts/dev/motion-lab.mjs --self-test');
    process.exit(2);
  }
  const baseSb = fs.readFileSync(sbArg, 'utf8');
  const dir = path.dirname(sbArg);
  const origBase = path.basename(sbArg).replace(/\.storyboard\.md$/, '');
  const baseJsonPath = path.join(dir, `${origBase}.json`);
  if (!fs.existsSync(baseJsonPath)) {
    console.error(`motion-lab: no film at ${baseJsonPath} for this storyboard (assemble.mjs needs one to write into).`);
    process.exit(2);
  }
  const jsonSeed = JSON.parse(fs.readFileSync(baseJsonPath, 'utf8'));
  const variantSpecs = variantsArg ? JSON.parse(fs.readFileSync(variantsArg, 'utf8')) : {};
  const names = ['base', ...Object.keys(variantSpecs).filter((n) => n !== 'base')];

  const results = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const edits = variantSpecs[name] || {};
    const text = mutateStoryboard(baseSb, origBase, edits);
    results.push(await runVariant({ name, tag: `sweep${i}`, dir, storyboardText: text, jsonSeed, keep }));
  }
  printTable(results);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
