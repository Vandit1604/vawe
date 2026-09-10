// harness/lib/record-render.mjs: read the render log `make dev`/`make ship` just captured and
// append what it says to the run log (harness/lib/runlog.mjs). Best-effort: a render that already
// succeeded or failed must never be turned into a failure by the logging step, so every error here is
// swallowed and the exit code is always 0.
//
// internal/render/render.go prints exactly one of a few "✓ done → <out>  (<n>s, <n> frames...)" lines
// on success; nothing there is machine-readable on purpose (docs/MISTAKES.md #401 is about a script
// misreading exactly this kind of line), so this reads the one stable substring rather than the whole
// sentence. `fps` here is the REALIZED rate (frames / seconds) of this render, not the requested
// --fps: the Go side never prints its target rate, and the realized one is the more useful number for
// noticing a render that ran far slower than usual.
//
// Usage: node harness/lib/record-render.mjs <cmd> <film.json> <logfile>
import fs from 'node:fs';
import { appendRun } from './runlog.mjs';

const [cmd, film, logfile] = process.argv.slice(2);
if (!cmd || !film || !logfile) process.exit(0);

let text = '';
try { text = fs.readFileSync(logfile, 'utf8'); } catch { process.exit(0); }

const m = text.match(/✓ done → (\S+)\s+\(([\d.]+)s, (\d+) frames/);
if (!m) process.exit(0);
const [, file, secs, frames] = m;
const seconds = parseFloat(secs);
const frameCount = Number(frames);

appendRun(film, {
  cmd,
  render: {
    file,
    frames: frameCount,
    fps: seconds > 0 ? Math.round((frameCount / seconds) * 100) / 100 : null,
    ms: Math.round(seconds * 1000),
  },
});
process.exit(0);
