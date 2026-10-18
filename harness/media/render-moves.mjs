#!/usr/bin/env node
// Render every prompts/moves/demo/<move>.html to prompts/moves/<move>.mp4: 1280 px wide, 60 fps, the
// demo's own duration. Renders only stale clips (source hash differs from clips.lock.json); --all or --only forces.
// Runs a few renders at once; each waits for a machine-wide render slot (harness/lib/render-slots.mjs).
//   node harness/media/render-moves.mjs [--only <name>] [--all]
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveFrame } from './render-page.mjs';
import { ensureFonts, fontFilesIn } from '../lib/ensure-fonts.mjs';
import { chooseCrf, RENDER_CRF, CLIP_BUDGET_BYTES } from '../lib/clip-budget.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MOVES = path.join(ROOT, 'prompts', 'moves');
const CLIP_WIDTH = 1280;
const CLIP_FPS = 60;
const WORKERS_PER_RENDER = 2;
const PARALLEL = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)));

export const moveNames = () => fs.readdirSync(path.join(MOVES, 'demo')).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)).sort();

const LOCK = path.join(MOVES, 'clips.lock.json');
const IMPORT = /(?:from\s*|import\s*\(?\s*)['"]([^'"]+\.m?js)['"]/g;

function importedFiles(file, seen = new Set()) {
  if (seen.has(file) || !fs.existsSync(file)) return seen;
  seen.add(file);
  for (const [, spec] of fs.readFileSync(file, 'utf8').matchAll(IMPORT)) {
    if (spec.startsWith('/')) importedFiles(path.join(ROOT, spec), seen);
    else if (spec.startsWith('.')) importedFiles(path.resolve(path.dirname(file), spec), seen);
  }
  return seen;
}

/** Hash of the clip size and rate, the demo page, demo.css and every core/ file the page imports. */
export function sourceHash(name) {
  const demo = path.join(MOVES, 'demo', `${name}.html`);
  const files = [demo, path.join(MOVES, 'demo', 'demo.css'), ...[...importedFiles(demo)].filter((f) => f !== demo).sort()];
  const h = crypto.createHash('sha256').update(`${CLIP_WIDTH}w ${CLIP_FPS}fps`);
  for (const f of files) h.update(path.relative(ROOT, f)).update(fs.readFileSync(f));
  return h.digest('hex').slice(0, 16);
}

const hashOf = (entry) => (typeof entry === 'string' ? entry : entry?.hash);
const readLock = (file = LOCK) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});
const LOCK_WAIT_MS = 15_000;

/** Merges `entries` into the lock file. Two renders at once each hold the mkdir lock for the read, merge and rename, so neither loses the other's clips. */
export async function recordClips(entries, lockFile = LOCK) {
  const guard = `${lockFile}.d`;
  const giveUp = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try { fs.mkdirSync(guard); break; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (Date.now() > giveUp) throw new Error(`${guard} has been held for ${LOCK_WAIT_MS / 1000} s; remove it if no render is running`);
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  try {
    const merged = { ...readLock(lockFile), ...entries };
    const tmp = `${lockFile}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(Object.fromEntries(Object.entries(merged).sort()), null, 2)}\n`);
    fs.renameSync(tmp, lockFile);
  } finally {
    fs.rmdirSync(guard);
  }
}

/** Why the clip must be rendered again, or '' when its sources match the recorded hash. */
export function staleReason(name, lock) {
  if (!fs.existsSync(path.join(MOVES, `${name}.mp4`))) return 'no clip yet';
  return hashOf(lock[name]) === sourceHash(name) ? '' : 'the clip size, demo, demo.css or a core/ import changed';
}

function fetchMissingFonts(names) {
  const read = (f) => fs.readFileSync(f, 'utf8');
  const files = fontFilesIn(read(path.join(MOVES, 'demo', 'demo.css')), ...names.map((n) => read(path.join(MOVES, 'demo', `${n}.html`))));
  if (ensureFonts(ROOT, files)) console.log('  fonts    a face was missing from assets/fonts; fetched with generators/media/fonts.mjs');
}

function renderArgs(name) {
  const demo = path.join(MOVES, 'demo', `${name}.html`);
  const { width, height } = resolveFrame(demo);
  return ['harness/media/render-page.mjs', demo, path.join(MOVES, `${name}.mp4`), '--w', String(CLIP_WIDTH), '--h', String(Math.round((CLIP_WIDTH * height) / width)), '--fps', String(CLIP_FPS), '--workers', String(WORKERS_PER_RENDER)];
}

function renderOne(name) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, renderArgs(name), { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, VAWE_RENDER_KIND: 'clip' } });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => resolve({ name, code, stderr: stderr.trim() }));
  });
}

// The render encodes at RENDER_CRF. A clip over the budget is encoded again from that file at the next CRFs; the last file written is the one kept.
function fitBudget(name) {
  const file = path.join(MOVES, `${name}.mp4`), fit = path.join(MOVES, `${name}.fit.mp4`);
  const sizeAt = (crf) => {
    if (crf === RENDER_CRF) return fs.statSync(file).size;
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-preset', 'fast', '-crf', String(crf), '-x264-params', 'aq-mode=3', '-movflags', '+faststart', '-f', 'mp4', fit]);
    if (r.status !== 0) throw new Error(`ffmpeg re-encode of ${name} at crf ${crf} failed: ${r.stderr}`);
    return fs.statSync(fit).size;
  };
  const chosen = chooseCrf(sizeAt);
  if (chosen.crf !== RENDER_CRF) fs.renameSync(fit, file);
  if (!chosen.fits) console.log(`  warn     ${name}: ${(chosen.bytes / 1048576).toFixed(1)} MB at crf ${chosen.crf}, over the ${CLIP_BUDGET_BYTES / 1048576} MB budget`);
  return chosen.crf;
}

async function renderAll(names) {
  const queue = [...names], results = [];
  const lane = async () => {
    for (let name = queue.shift(); name; name = queue.shift()) {
      const r = await renderOne(name);
      if (r.code === 0) r.crf = fitBudget(name);
      console.log(r.code === 0 ? `  rendered ${name} (crf ${r.crf})` : `  FAILED   ${name}: ${r.stderr.split('\n').slice(-3).join(' | ')}`);
      results.push(r);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, names.length) }, lane));
  return results;
}

async function main() {
  const argv = process.argv.slice(2);
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
  const all = moveNames();
  if (only && !all.includes(only)) {
    console.error(`vawe moves: no demo named ${only}; valid: ${all.join(' ')}`);
    process.exit(2);
  }
  const lock = readLock();
  const force = only || argv.includes('--all');
  const names = (only ? [only] : all).filter((name) => {
    const reason = staleReason(name, lock);
    if (reason) console.log(`  stale    ${name}: ${reason}`);
    return force || reason;
  });
  for (const name of names) {
    if (!fs.existsSync(path.join(MOVES, `${name}.md`))) console.log(`  warn     ${name}: no ${name}.md next to the clip`);
  }
  if (!names.length) {
    console.log(`all ${all.length} clips are current; --all re-renders them`);
    return;
  }
  fetchMissingFonts(names);
  const results = await renderAll(names);
  const failed = results.filter((r) => r.code !== 0);
  const done = results.filter((r) => r.code === 0);
  if (done.length) await recordClips(Object.fromEntries(done.map((r) => [r.name, { hash: sourceHash(r.name), crf: r.crf }])));
  console.log(`${results.length - failed.length} of ${results.length} clips rendered to prompts/moves/`);
  process.exit(failed.length ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
