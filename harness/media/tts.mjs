import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import { ffmpegOrDie } from '../lib/scratch.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
if (process.platform !== 'darwin' || !spawnSync('which', ['say']).stdout.toString().trim()) {
  console.error('✗ macOS `say` not found. tts.mjs uses the local on-device TTS; on non-mac, wire a local engine (piper/kokoro) here.'); process.exit(2);
}
const out = flag('--out'); if (!out) { console.error('usage: tts.mjs (--script f | --text "…") --out <base> [--voice Name]'); process.exit(2); }
const voice = flag('--voice');
let text = flag('--text');
const scriptPath = flag('--script');
if (scriptPath) { if (!fs.existsSync(scriptPath)) { console.error(`✗ no script at ${scriptPath}`); process.exit(2); } text = fs.readFileSync(scriptPath, 'utf8'); }
if (!text) { console.error('✗ provide --text or --script'); process.exit(2); }

const lines = text.replace(/\\n/g, '\n').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));
if (!lines.length) { console.error('✗ script has no speakable lines'); process.exit(2); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-tts-'));
const dur = (f) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', f], { encoding: 'utf8' });
  if (r.error) { console.error(`✗ could not run ffprobe (${r.error.message})`); process.exit(1); }
  if (r.status !== 0) { console.error(`✗ ffprobe exited ${r.status} on ${f}\n${(r.stderr || '').trim()}`); process.exit(1); }
  const d = parseFloat((r.stdout || '').trim());
  if (!Number.isFinite(d) || d <= 0) { console.error(`✗ ffprobe read no duration from ${f} (got ${JSON.stringify((r.stdout || '').trim())})`); process.exit(1); }
  return d;
};

const wavs = [];
const words = [];
let offset = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const aiff = path.join(tmp, `l${i}.aiff`);
  const wav = path.join(tmp, `l${i}.wav`);
  const sayArgs = [...(voice ? ['-v', voice] : []), '-o', aiff, line];
  const r = spawnSync('say', sayArgs);
  if (r.status !== 0 || !fs.existsSync(aiff)) { console.error(`✗ say failed on line ${i + 1}: ${r.stderr?.toString() || ''}`); process.exit(1); }
  ffmpegOrDie(['-v', 'error', '-y', '-i', aiff, '-ar', '48000', '-ac', '2', wav], wav, `tts line ${i + 1}`);
  const d = dur(wav);
  wavs.push(wav);
  const ws = line.split(/\s+/).filter(Boolean);
  const totalChars = ws.reduce((s, w) => s + w.length + 1, 0);
  const speak = d * 0.92, head = offset + d * 0.04;
  let acc = 0;
  for (const w of ws) { words.push({ w, t: +(head + (acc / totalChars) * speak).toFixed(3) }); acc += w.length + 1; }
  offset += d;
}

const listFile = path.join(tmp, 'list.txt');
fs.writeFileSync(listFile, wavs.map((w) => `file '${w}'`).join('\n'));
const wavOut = out.endsWith('.wav') ? out : `${out}.wav`;
fs.mkdirSync(path.dirname(path.resolve(wavOut)), { recursive: true });
ffmpegOrDie(['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', wavOut], wavOut, 'tts concat');
const wordsOut = wavOut.replace(/\.wav$/, '.words.json');
fs.writeFileSync(wordsOut, JSON.stringify(words, null, 2) + '\n');
fs.rmSync(tmp, { recursive: true, force: true });

const total = dur(wavOut);
console.log(`✓ tts: ${lines.length} line(s) · ${words.length} words · ${total.toFixed(1)}s${voice ? ` · voice ${voice}` : ' · system voice'}`);
console.log(`  vo    → ${wavOut}`);
console.log(`  words → ${wordsOut}`);
console.log(`  wire it: "audio": { "vo": "${path.basename(wavOut)}", "voWords": "${path.basename(wordsOut)}" }  (paths resolve against the scene dir)`);
