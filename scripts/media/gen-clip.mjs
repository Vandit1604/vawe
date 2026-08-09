// gen-clip.mjs — turn a video (a kie.ai generation, or any mp4) into a DETERMINISTIC clip the engine
// can play frame-by-frame. renderFrame(n) must be pure, so we never seek a <video> mid-render (async
// decode); instead we pre-extract the video to a PNG frame sequence + a manifest, and the `clip` layer
// swaps a preloaded <img> src per frame. Frames are downscaled to the display width to stay light.
//
//   node scripts/media/gen-clip.mjs assets/gen/city.mp4 city            # → assets/gen/city/
//   node scripts/media/gen-clip.mjs in.mp4 city --fps 30 --w 720
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [input, name, ...rest] = process.argv.slice(2);
if (!input || !name) { console.error('usage: node scripts/media/gen-clip.mjs <input.mp4> <name> [--fps 30] [--w 720]'); process.exit(1); }
if (!fs.existsSync(input)) { console.error(`not found: ${input}`); process.exit(1); }
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const fps = Number(opt('--fps', 30));
const W = Number(opt('--w', 720));

const outDir = path.join('assets/gen', name);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// extract at a fixed fps, downscaled to W (height auto, kept even for codecs). PNG = lossless per frame.
execFileSync('ffmpeg', ['-y', '-i', input, '-vf', `fps=${fps},scale=${W}:-2`, path.join(outDir, 'f%04d.png')], { stdio: 'inherit' });

const frameFiles = fs.readdirSync(outDir).filter((f) => /^f\d+\.png$/.test(f)).sort();
if (!frameFiles.length) { console.error('ffmpeg produced no frames'); process.exit(1); }
// read real dims from the first frame (PNG IHDR: width/height are big-endian uint32 at bytes 16..24)
const first = fs.readFileSync(path.join(outDir, frameFiles[0]));
const w = first.readUInt32BE(16), h = first.readUInt32BE(20);
const frames = frameFiles.map((f) => `/${outDir}/${f}`);
const manifest = { fps, w, h, count: frames.length, frames };
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`✓ clip "${name}": ${frames.length} frames @ ${fps}fps, ${w}x${h}  →  ${outDir}/manifest.json`);
console.log(`  use:  { "type": "clip", "src": "/${outDir}/manifest.json", "x": .., "y": .., "w": .., "start": .., "duration": ${(frames.length / fps).toFixed(1)} }`);
