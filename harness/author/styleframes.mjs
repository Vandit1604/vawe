import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { openScene } from './scene-page.mjs';

const args = process.argv.slice(2);
const D = args.find((a) => !a.startsWith('--'));
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
if (!D || !fs.existsSync(D)) { console.error('usage: styleframes <scene.json> [--n 4] [--scale 2]'); process.exit(2); }
const N = Math.max(2, Math.min(8, +flag('--n', 4)));
const SCALE = +flag('--scale', 2);

const SLUG = path.basename(D, '.json');
const OUT = `/tmp/styleframes/${SLUG}`;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const scene = await openScene(D, { scale: SCALE, fps: 30 });
const dur = scene.meta.duration;

const PROBES = Math.min(48, Math.max(12, Math.round(dur * 2)));
const sig = (file) => {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'scale=8:8', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 1 << 20 });
  return Array.from(raw);
};
const dist = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;

process.stderr.write(`  probing ${PROBES} moments across ${dur.toFixed(1)}s…\n`);
const probes = [];
for (let i = 0; i < PROBES; i++) {
  const t = dur * (0.06 + 0.88 * (i / Math.max(1, PROBES - 1)));
  const f = path.join(OUT, `.probe-${i}.png`);
  await scene.grab(t, f);
  probes.push({ t, f, s: sig(f) });
}

for (let i = 0; i < probes.length; i++) {
  const prev = probes[i - 1] || probes[i + 1] || probes[i];
  const next = probes[i + 1] || probes[i - 1] || probes[i];
  probes[i].motion = (dist(probes[i].s, prev.s) + dist(probes[i].s, next.s)) / 2;
}
const calm = Math.max(1, Math.min(...probes.map((p) => p.motion)) + 1);

const score = (p, chosen) => Math.min(...chosen.map((q) => dist(p.s, q.s))) / (1 + p.motion / calm);
const picked = [probes.reduce((a, b) => (b.motion < a.motion ? b : a))];
while (picked.length < N && picked.length < probes.length) {
  let best = null, bestD = -1;
  for (const p of probes) {
    if (picked.includes(p)) continue;
    const d = score(p, picked);
    if (d > bestD) { bestD = d; best = p; }
  }
  if (!best) break;
  picked.push(best);
}
picked.sort((a, b) => a.t - b.t);

// ── write them full size ───────────────────────────────────────────────────────────────────────────
const frames = [];
for (const [i, p] of picked.entries()) {
  const file = path.join(OUT, `frame-${i + 1}-${p.t.toFixed(2).replace('.', 'p')}s.png`);
  fs.renameSync(p.f, file);
  frames.push({ t: p.t, file });
}
for (const p of probes) if (fs.existsSync(p.f)) fs.unlinkSync(p.f);
await scene.close();

const sheet = path.join(OUT, 'sheet.png');
const cols = Math.min(2, frames.length);
const tileW = 900;
const inputs = frames.flatMap((f) => ['-i', f.file]);
const chain = frames.map((_, i) => `[${i}:v]scale=${tileW}:-2,pad=iw+16:ih+16:8:8:white[t${i}]`).join(';');
const rows = [];
for (let i = 0; i < frames.length; i += cols) {
  const r = frames.slice(i, i + cols).map((_, j) => `[t${i + j}]`).join('');
  rows.push(`${r}hstack=${Math.min(cols, frames.length - i)}[r${i}]`);
}
const stack = rows.length > 1 ? `;${rows.map((_, i) => `[r${i * cols}]`).join('')}vstack=${rows.length}[v]` : ';[r0]null[v]';
spawnSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${chain};${rows.join(';')}${stack}`, '-map', '[v]', sheet]);

// `slop` used to run here too. It was retired in 2026-08 (engine-doctrine/MISTAKES.md #340) and its script deleted,
const look = [];
for (const g of ['designspec-check']) {
  const script = `quality/gates/${g}.mjs`;
  if (!fs.existsSync(script)) { console.error(`✗ styleframes: gate script ${script} does not exist. Fix the list, do not report it as a failing gate.`); process.exit(2); }
  const r = spawnSync('node', [script, D], { encoding: 'utf8' });
  look.push({ gate: g, code: r.status, out: (r.stdout || '') + (r.stderr || '') });
}

const hash = crypto.createHash('sha256').update(fs.readFileSync(D)).digest('hex').slice(0, 16);
const lock = { scene: D, sceneHash: hash, frames: frames.map((f) => ({ t: +f.t.toFixed(2), file: f.file })), scale: SCALE };
fs.writeFileSync(path.join(OUT, 'styleframes.lock.json'), JSON.stringify(lock, null, 2) + '\n');

console.log(`\n  STYLE FRAMES · ${SLUG} · ${frames.length} of ${PROBES} probed moments, most visually distinct first`);
for (const f of frames) console.log(`    ${f.t.toFixed(2).padStart(6)}s   ${f.file}`);
  console.log('  (picked for visual distinctness, biased toward SETTLED frames over mid-transition ones)');
console.log(`\n  sheet: ${sheet}`);
for (const l of look) {
  const bad = l.code !== 0;
  console.log(`  ${bad ? '✗' : '✓'} ${l.gate}${bad ? ': ' + (l.out.split('\n').find((x) => /[✗×]/.test(x)) || 'failed').trim() : ''}`);
}
console.log('\n  These are the LOOK, not the motion. Open them full size and answer only: is this the film');
console.log('  I want to have made? Composition, hierarchy, palette, type. Approve, then animate.\n');
process.exit(look.some((l) => l.code !== 0) ? 1 : 0);
