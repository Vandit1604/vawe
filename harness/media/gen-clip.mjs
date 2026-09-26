import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [input, name, ...rest] = process.argv.slice(2);
if (!input || !name) { console.error('usage: node harness/media/gen-clip.mjs <input.mp4> <name> [--fps 30] [--w 720]'); process.exit(1); }
if (!fs.existsSync(input)) { console.error(`not found: ${input}`); process.exit(1); }
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const fps = Number(opt('--fps', 30));
const W = Number(opt('--w', 720));

const outDir = path.join('assets/gen', name);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

execFileSync('ffmpeg', ['-y', '-i', input, '-vf', `fps=${fps},scale=${W}:-2`, path.join(outDir, 'f%04d.png')], { stdio: 'inherit' });

const frameFiles = fs.readdirSync(outDir).filter((f) => /^f\d+\.png$/.test(f)).sort();
if (!frameFiles.length) { console.error('ffmpeg produced no frames'); process.exit(1); }
const first = fs.readFileSync(path.join(outDir, frameFiles[0]));
const w = first.readUInt32BE(16), h = first.readUInt32BE(20);
const frames = frameFiles.map((f) => `/${outDir}/${f}`);
const manifest = { fps, w, h, count: frames.length, frames };
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`✓ clip "${name}": ${frames.length} frames @ ${fps}fps, ${w}x${h}  →  ${outDir}/manifest.json`);
console.log(`  use:  { "type": "clip", "src": "/${outDir}/manifest.json", "x": .., "y": .., "w": .., "start": .., "duration": ${(frames.length / fps).toFixed(1)} }`);
