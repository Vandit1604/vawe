// captions.mjs: burn muted-social subtitles onto a video with zero hand-timing. Splits a script into
// short readable phrases and distributes them across the video's duration (time ∝ word count), then
// writes `captions` + `captionMode:"pop"` into the JSON. Deterministic: same script + duration → same
// timing. Emphasise a word with <b>…</b> in the script (renders in the theme accent).
//
//   node scripts/author/captions.mjs formats/scene/video.json "First line. Then the <b>payoff</b>."
//   make captions D=formats/scene/video.json TEXT="…"
import fs from 'node:fs';
import { onScreenText } from '../lib/text.mjs';

const [file, text] = [process.argv[2], process.argv[3]];
if (!file || !text || !fs.existsSync(file)) {
  console.error('usage: node scripts/author/captions.mjs <video.json> "<script text>"');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const duration = data.duration || 12;
const START = 0.5, END_PAD = 0.4, GAP = 0.08, MAX_WORDS = 7;

// split into sentences, then chunk long sentences into <= MAX_WORDS phrases (keeps each caption readable)
// The same word list core/captions.js capWords() builds, so the pacing this tool writes and the
// per-word windows the engine derives cannot disagree about how many words a line has.
const wordsOf = (s) => onScreenText(s).split(/\s+/).filter(Boolean).length;
const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const phrases = [];
for (const s of sentences) {
  const toks = s.split(/\s+/);
  if (toks.length <= MAX_WORDS) { phrases.push(s); continue; }
  for (let i = 0; i < toks.length; i += MAX_WORDS) phrases.push(toks.slice(i, i + MAX_WORDS).join(' '));
}
if (!phrases.length) { console.error('no caption text'); process.exit(1); }

// distribute time ∝ word count over the available window, each phrase ≥ 0.9s
const totalWords = phrases.reduce((n, p) => n + Math.max(1, wordsOf(p)), 0);
const avail = Math.max(1, duration - START - END_PAD - GAP * (phrases.length - 1));
let t = START;
const captions = phrases.map((p) => {
  const share = Math.max(1, wordsOf(p)) / totalWords;
  const dur = Math.max(0.9, +(avail * share).toFixed(2));
  const c = { t0: +t.toFixed(2), t1: +(t + dur).toFixed(2), text: p };
  t = c.t1 + GAP;
  return c;
});
// clamp the last window to the duration
if (captions.length) captions[captions.length - 1].t1 = Math.min(captions[captions.length - 1].t1, +(duration - 0.05).toFixed(2));

data.captions = captions;
data.captionMode = 'pop';
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log(`✓ ${captions.length} captions across ${duration}s → ${file}  (captionMode: pop)`);
captions.forEach((c) => console.log(`  ${c.t0.toFixed(2)}–${c.t1.toFixed(2)}  ${c.text}`));
