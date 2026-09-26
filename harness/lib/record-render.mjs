// on success; nothing there is machine-readable on purpose (engine-doctrine/MISTAKES.md #401 is about a script
import fs from 'node:fs';
import { appendRun } from './runlog.mjs';

const [cmd, film, logfile, wallMsArg] = process.argv.slice(2);
if (!cmd || !film || !logfile) process.exit(0);

let text = '';
try { text = fs.readFileSync(logfile, 'utf8'); } catch { process.exit(0); }

const m = text.match(/✓ done → (\S+)\s+\(([\d.]+)s, (\d+) frames/);
if (!m) process.exit(0);
const [, file, secs, frames] = m;
const seconds = parseFloat(secs);
const frameCount = Number(frames);
const wallMs = Number.isFinite(Number(wallMsArg)) && wallMsArg !== undefined ? Number(wallMsArg) : null;

appendRun(film, {
  cmd,
  wallMs,
  render: {
    file,
    frames: frameCount,
    fps: seconds > 0 ? Math.round((frameCount / seconds) * 100) / 100 : null,
    ms: Math.round(seconds * 1000),
    wallMs,
  },
});
process.exit(0);
