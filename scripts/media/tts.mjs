// scripts/media/tts.mjs — LOCAL narration: synthesize a voiceover WAV + word-timing sidecar from a script,
// entirely offline with macOS `say` (on-device neural voices, no cloud, no API key, no downloads). The
// engine already mixes VO (audio.go: `vo` + `voWords`, ducks the music under speech) — this is the missing
// generation half, adapted from another engine' Step 3.1 to a local model.
//
//   node scripts/media/tts.mjs --script narration.txt --out formats/scene/myvideo.vo [--voice Samantha]
//   node scripts/media/tts.mjs --text "Line one.\nLine two." --out out/vo
//   make tts SCRIPT=narration.txt OUT=formats/scene/myvideo.vo VOICE=Samantha
//
// Writes <out>.wav (the VO) and <out>.words.json ([{w,t}] — the voWords format captions read). Each
// non-empty line of the script is one caption UNIT: it is synthesized separately so line boundaries are
// exact, the wavs are concatenated, and words inside a line are timed by character weight across that
// line's measured duration. Deterministic: same text + voice → same audio + same timings (TTS has no
// randomness), so it never breaks the render's determinism.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

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

// lines = caption units (drop blank lines and markdown headings/comments)
const lines = text.replace(/\\n/g, '\n').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));
if (!lines.length) { console.error('✗ script has no speakable lines'); process.exit(2); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-tts-'));
const dur = (f) => parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', f]).stdout.toString().trim()) || 0;

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
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', aiff, '-ar', '48000', '-ac', '2', wav]);
  const d = dur(wav);
  wavs.push(wav);
  // distribute this line's words across its duration by character weight (a longer word takes longer to
  // say). A small 4% head/tail padding keeps the first word off the exact boundary.
  const ws = line.split(/\s+/).filter(Boolean);
  const totalChars = ws.reduce((s, w) => s + w.length + 1, 0);
  const speak = d * 0.92, head = offset + d * 0.04;
  let acc = 0;
  for (const w of ws) { words.push({ w, t: +(head + (acc / totalChars) * speak).toFixed(3) }); acc += w.length + 1; }
  offset += d;
}

// concatenate the line wavs into one VO track
const listFile = path.join(tmp, 'list.txt');
fs.writeFileSync(listFile, wavs.map((w) => `file '${w}'`).join('\n'));
const wavOut = out.endsWith('.wav') ? out : `${out}.wav`;
fs.mkdirSync(path.dirname(path.resolve(wavOut)), { recursive: true });
spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', wavOut]);
if (!fs.existsSync(wavOut)) { console.error('✗ concat failed'); process.exit(1); }
const wordsOut = wavOut.replace(/\.wav$/, '.words.json');
fs.writeFileSync(wordsOut, JSON.stringify(words, null, 2) + '\n');
fs.rmSync(tmp, { recursive: true, force: true });

const total = dur(wavOut);
console.log(`✓ tts — ${lines.length} line(s) · ${words.length} words · ${total.toFixed(1)}s${voice ? ` · voice ${voice}` : ' · system voice'}`);
console.log(`  vo    → ${wavOut}`);
console.log(`  words → ${wordsOut}`);
console.log(`  wire it: "audio": { "vo": "${path.basename(wavOut)}", "voWords": "${path.basename(wordsOut)}" }  (paths resolve against the scene dir)`);
