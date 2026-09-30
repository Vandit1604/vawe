#!/usr/bin/env node
// Render every prompts/moves/demo/<move>.html to prompts/moves/<move>.mp4: 640 px wide, 60 fps, the
// demo's own duration. Runs a few renders at once; flags a clip older than its demo or its .md.
//   node harness/media/render-moves.mjs [--only <name>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveFrame } from './render-page.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MOVES = path.join(ROOT, 'prompts', 'moves');
const CLIP_WIDTH = 640;
const CLIP_FPS = 60;
const WORKERS_PER_RENDER = 2;
const PARALLEL = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)));
const mtime = (file) => (fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0);

export const moveNames = () => fs.readdirSync(path.join(MOVES, 'demo')).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)).sort();

/** The sources newer than the clip: its demo page and its .md. Empty when the clip is current. */
export function staleSources(name) {
  const clip = mtime(path.join(MOVES, `${name}.mp4`));
  if (!clip) return ['no clip yet'];
  return [`demo/${name}.html`, `${name}.md`].filter((f) => mtime(path.join(MOVES, f)) > clip);
}

function renderArgs(name) {
  const demo = path.join(MOVES, 'demo', `${name}.html`);
  const { width, height } = resolveFrame(demo);
  return ['harness/media/render-page.mjs', demo, path.join(MOVES, `${name}.mp4`), '--w', String(CLIP_WIDTH), '--h', String(Math.round((CLIP_WIDTH * height) / width)), '--fps', String(CLIP_FPS), '--workers', String(WORKERS_PER_RENDER)];
}

function renderOne(name) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, renderArgs(name), { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
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
  const names = only ? [only] : all;
  for (const name of names) {
    const stale = staleSources(name);
    if (stale.length) console.log(`  stale    ${name}: ${stale[0] === 'no clip yet' ? 'no clip yet' : `clip older than ${stale.join(' and ')}`}`);
    if (!fs.existsSync(path.join(MOVES, `${name}.md`))) console.log(`  warn     ${name}: no ${name}.md next to the clip`);
  }
  const results = await renderAll(names);
  const failed = results.filter((r) => r.code !== 0);
  console.log(`${results.length - failed.length} of ${results.length} clips rendered to prompts/moves/`);
  process.exit(failed.length ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
