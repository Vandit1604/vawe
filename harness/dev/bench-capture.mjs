// harness/dev/bench-capture.mjs: where capture time goes, per variant.
//   node harness/dev/bench-capture.mjs --case colour-sting,colour-sting-window,seek-canvas,final-window [--label name]
//     [--workers 2] [--runs 3] [--out dir]
// Each run is one render in a child process and prints one JSON line (md5 is the framemd5 digest of the mp4).
// The preview daemons are stopped before each run, so every run pays the browser start.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { stateFile } from '../media/preview-server.mjs';
import { scratch } from '../lib/scratch.mjs';

const SELF = fileURLToPath(import.meta.url);
const CASES = {
  'colour-sting': { page: 'films/examples/colour-sting/page.html', opts: { fps: 30 } },
  'colour-sting-final': { page: 'films/examples/colour-sting/page.html', opts: { fps: 60, w: 1920, blur: 32, from: 1, durArg: 1 } },
  'colour-sting-final-q': { page: 'films/examples/colour-sting/page.html', opts: { fps: 60, w: 1920, blur: 32, from: 1, durArg: 0.25 } },
  'final-2s-blur4': { page: 'films/examples/colour-sting/page.html', opts: { fps: 60, w: 1920, blur: 4, from: 1, durArg: 2 } },
  'colour-sting-window': { page: 'films/examples/colour-sting/page.html', opts: { fps: 30, from: 2, durArg: 1 } },
  'final-window': { page: 'films/examples/colour-sting/page.html', opts: { fps: 60, final: true, audio: false, from: 1, durArg: 0.25 } },
  'seek-canvas': { page: 'tests/fixtures/pages/seek-canvas.html', opts: { fps: 30 } },
};

const arg = (name, d) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : d; };
const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0);
const round = (x, d = 1) => Number(x.toFixed(d));

function stopDaemon() {
  for (const final of [true, false]) stopDaemonOf(stateFile(final));
}

function stopDaemonOf(state) {
  try {
    const { pid } = JSON.parse(fs.readFileSync(state, 'utf8'));
    spawnSync('pkill', ['-9', '-P', String(pid)]);
    try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ }
    const until = Date.now() + 5000;
    while (Date.now() < until) { try { process.kill(pid, 0); spawnSync('sleep', ['0.1']); } catch { break; } }
  } catch { /* no daemon */ }
  fs.rmSync(state, { force: true });
}

function framemd5(mp4) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', mp4, '-f', 'framemd5', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const lines = r.stdout.split('\n').filter((l) => l && !l.startsWith('#'));
  return createHash('sha1').update(lines.map((l) => l.split(',').pop().trim()).join('\n')).digest('hex').slice(0, 12);
}

async function child() {
  const { renderPage } = await import('../media/render-page.mjs');
  const c = CASES[arg('--case')];
  const out = arg('--mp4');
  const workers = Number(arg('--workers'));
  const timing = process.env.VAWE_BENCH_TIMING_FILE;
  fs.rmSync(timing, { force: true });
  const t0 = Date.now();
  const r = await renderPage(c.page, out, { ...c.opts, workers });
  const wallS = (Date.now() - t0) / 1000;
  const rows = fs.existsSync(timing) ? fs.readFileSync(timing, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const perFrame = new Map();
  for (const x of rows) perFrame.set(x.i, (perFrame.get(x.i) || 0) + x.seek + x.settle + x.shot + x.write);
  const frameMs = [...perFrame.values()].sort((a, b) => a - b);
  const avg = (k) => (rows.length ? rows.reduce((a, x) => a + x[k], 0) / rows.length : 0);
  console.log(JSON.stringify({
    frames: r.frames, subframes: r.subframes, reused: r.reused, wallS: round(wallS, 2), prepassS: round(r.prepassMs / 1000, 2), captureS: round(r.captureMs / 1000, 2), encodeS: round(r.encodeMs / 1000, 2),
    frameMsMedian: round(pct(frameMs, 0.5)), frameMsP90: round(pct(frameMs, 0.9)),
    shotsTimed: rows.length, avgMs: { seek: round(avg('seek')), settle: round(avg('settle')), shot: round(avg('shot')), write: round(avg('write')) }, avgFrameKB: round(avg('bytes') / 1024),
  }));
}

async function main() {
  const cases = arg('--case', 'colour-sting').split(',');
  const label = arg('--label', 'run');
  const workers = Number(arg('--workers', 2));
  const runs = Number(arg('--runs', 3));
  const outDir = path.resolve(arg('--out', scratch('bench-capture')));
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of cases) for (let run = 1; run <= runs; run++) {
    stopDaemon();
    const mp4 = path.join(outDir, `${name}-${label}-w${workers}-r${run}.mp4`);
    const env = { ...process.env, VAWE_BENCH_TIMING_FILE: path.join(outDir, 'timing.jsonl'), VAWE_AGENT: process.env.VAWE_AGENT || 'speed-spike-a', VAWE_MODEL: process.env.VAWE_MODEL || 'sonnet' };
    const r = await new Promise((resolve) => {
      let out = '';
      const p = spawn(process.execPath, [SELF, '--child', '--case', name, '--mp4', mp4, '--workers', String(workers)], { env, stdio: ['ignore', 'pipe', 'inherit'] });
      p.stdout.on('data', (d) => { out += d; });
      p.on('close', (code) => resolve({ code, out }));
    });
    const line = r.out.trim().split('\n').pop();
    let data;
    try { data = JSON.parse(line); } catch { data = { error: `exit ${r.code}: ${r.out.slice(-300)}` }; }
    const digest = fs.existsSync(mp4) ? framemd5(mp4) : null;
    console.log(JSON.stringify({ case: name, label, workers, run, ...data, md5: digest, mp4 }));
  }
  stopDaemon();
}

if (process.argv.includes('--child')) child().then(() => process.exit(0)); else main();
