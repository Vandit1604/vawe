#!/usr/bin/env node
// Render every prompts/moves/demo/<move>.html to prompts/moves/<move>.mp4: 1280 px wide, 60 fps, the
// demo's own duration. Renders only stale clips (source hash differs from clips.lock.json); --all or --only forces.
// Runs a few renders at once; each waits for a machine-wide render slot (harness/lib/render-slots.mjs).
//   node harness/media/render-moves.mjs [--only <name>] [--all]
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveFrame } from './render-page.mjs';

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

const readLock = () => (fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : {});
const writeLock = (lock) => fs.writeFileSync(LOCK, `${JSON.stringify(Object.fromEntries(Object.entries(lock).sort()), null, 2)}\n`);

/** Why the clip must be rendered again, or '' when its sources match the recorded hash. */
export function staleReason(name, lock) {
  if (!fs.existsSync(path.join(MOVES, `${name}.mp4`))) return 'no clip yet';
  return lock[name] === sourceHash(name) ? '' : 'the clip size, demo, demo.css or a core/ import changed';
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

async function renderAll(names) {
  const queue = [...names], results = [];
  const lane = async () => {
    for (let name = queue.shift(); name; name = queue.shift()) {
      const r = await renderOne(name);
      console.log(r.code === 0 ? `  rendered ${name}` : `  FAILED   ${name}: ${r.stderr.split('\n').slice(-3).join(' | ')}`);
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
  const results = await renderAll(names);
  const failed = results.filter((r) => r.code !== 0);
  for (const r of results) if (r.code === 0) lock[r.name] = sourceHash(r.name);
  if (results.length) writeLock(lock);
  console.log(`${results.length - failed.length} of ${results.length} clips rendered to prompts/moves/`);
  process.exit(failed.length ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
