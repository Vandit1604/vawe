// quality/gates/render-verify.mjs: does the RENDERED mp4 match what the scene declares?
//
// Measured tonight: two renders to the same out/<name>.mp4 raced (harness/dev/render-lock.sh now
// refuses that outright), and the loser's half-written file was left behind, reported as SUCCESS by
// `./bin/vawe` (exit 0) because the renderer only checks that ffmpeg exited clean, never that the
// file it produced matches the duration the scene actually asked for. A 17.5s film shipped as an
// 0.87s file and nothing said so.
//
// This gate is the missing comparison: ffprobe the real mp4's duration, compare it against
// scene-timing.mjs's `sceneTiming(scene).duration` (the same declared-duration rule the renderer
// itself uses), and fail loudly on a mismatch past a small tolerance. It does not re-derive that
// rule: scene-timing.mjs already owns it and two copies is how a gate goes stale (see that file's
// own header).
//
//   node quality/gates/render-verify.mjs films/scene/<file>.json     ·     make render-verify D=<file>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadScene } from '../../core/engine/expand.js';
import { sceneTiming } from './scene-timing.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const f = gateFindings();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataArg = process.argv[2];
if (!dataArg || !fs.existsSync(dataArg)) {
  console.error('usage: node quality/gates/render-verify.mjs <scene.json>');
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(dataArg, 'utf8'));
const data = loadScene(structuredClone(raw));
const declared = sceneTiming(data).duration;
const name = path.basename(dataArg).replace(/\.(expanded\.)?json$/, '');

// A multi-aspect render writes `<name>-<aspect>.mp4` files instead of `<name>.mp4` (Makefile:167);
// check every one that exists so a clobbered NARROW canvas is not hidden by a clean WIDE one.
const outDir = path.join(ROOT, 'out');
const candidates = fs.existsSync(outDir)
  ? fs.readdirSync(outDir).filter((n) => n.endsWith('.mp4') && (n === `${name}.mp4` || n.startsWith(`${name}-`)))
  : [];
if (!candidates.length) {
  console.error(`✗ render-verify: no out/${name}[.-*].mp4 found. Render first.`);
  process.exit(2);
}

// TOLERANCE: ffmpeg's own container rounding and the last frame's exact hold time move the muxed
// duration a few hundredths of a second even on a clean render. A RACE truncates by whole seconds
// (0.87s of 17.5s in the case that found this bug), so a loose 5%-or-1s floor still catches every
// real truncation while never flagging normal encode jitter.
const TOLERANCE = Math.max(1, declared * 0.05);

let worst = null;
for (const file of candidates) {
  const mp4 = path.join(outDir, file);
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of',
    'default=noprint_wrappers=1:nokey=1', mp4], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout.trim()) {
    f.warn('render-unreadable', `${file} would not probe (ffprobe: ${(r.stderr || '').trim().split('\n')[0] || 'no output'})`, { at: file });
    continue;
  }
  const actual = parseFloat(r.stdout.trim());
  const short = declared - actual;
  if (short > TOLERANCE) {
    f.fail('render-truncated',
      `${file} is ${actual.toFixed(2)}s, the scene declares ${declared.toFixed(2)}s (short by ${short.toFixed(2)}s)`,
      { at: file, doc: 'engine-doctrine/MISTAKES.md' });
    if (!worst || short > worst.short) worst = { file, actual, short };
  }
}

if (worst) {
  console.error(`✗ render-verify: ${worst.file} looks truncated (${worst.actual.toFixed(2)}s of ${declared.toFixed(2)}s declared).`);
  console.error('  A likely cause: two renders to this output path raced (harness/dev/render-lock.sh now refuses that). Re-render and try again.');
  f.emit();
  process.exit(1);
}
console.log(`✓ render-verify · ${candidates.length} file(s) match the declared ${declared.toFixed(2)}s within ${TOLERANCE.toFixed(2)}s`);
f.emit();
process.exit(0);
