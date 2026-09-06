// scripts/media/vo-captions.mjs: VO CAPTION BUILDER. Turns a voiceover word-timing sidecar
// (audio.voWords → [{ w, t }]) into timed caption layers the scene engine reads: a top-level
// `captions` array of { t0, t1, text, words } plus a `captionStyle` (core/captions.js CAP_STYLES).
// Deterministic + pure: reads files only, no TTS, no speech recognition, no network/clock/random.
//
// Grouping: words pack into a phrase until it hits the target size (--group, default 6) OR a pause
// longer than PAUSE_GAP opens between two words (a natural sentence break). Each word's end is the
// next word's start (or +TAIL for the last word), so the per-line `words` windows track the real VO.
//
// Usage: node scripts/media/vo-captions.mjs <scene.json> [--style weightShift] [--group 6] [--write]
//   default: PRINT the caption array (dry run). --write merges into <scene>.captioned.json (non-destructive).
import fs from 'node:fs';
import path from 'node:path';
import { CAP_STYLE_REGISTRY } from '../../core/type/captions.js';

const PAUSE_GAP = 0.6; // a gap > this between two words starts a new caption (a spoken pause)
const TAIL = 0.3;      // the last word of the sidecar holds this long (no next word to bound it)
const DEFAULT_GROUP = 6;

const file = process.argv[2];
if (!file || file.startsWith('--')) {
  console.error('usage: node scripts/media/vo-captions.mjs <scene.json> [--style weightShift] [--group 6] [--write]');
  process.exit(2);
}
const WRITE = process.env.WRITE === '1' || process.argv.includes('--write');
const style = argVal('--style') || 'weightShift';
const group = Math.max(1, parseInt(argVal('--group') || String(DEFAULT_GROUP), 10) || DEFAULT_GROUP);

// The registry writes the refusal, including the cross-registry hint; this stays a clean CLI exit
// rather than a stack trace, which is the only reason it is caught rather than thrown through.
try { CAP_STYLE_REGISTRY.pick(style); } catch (e) { console.error(`--style: ${e.message}`); process.exit(2); }

const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
const voRef = scene.audio && scene.audio.voWords;
if (!voRef) {
  console.error(`no audio.voWords in ${file}: nothing to caption (expected a path to a [{w,t}] sidecar)`);
  process.exit(2);
}

const wordsPath = resolveVo(voRef, file);
if (!wordsPath) {
  console.error(`audio.voWords "${voRef}" not found (looked next to the scene, at repo root, and under formats/scene/)`);
  process.exit(2);
}
const raw = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
if (!Array.isArray(raw) || !raw.length) { console.error(`voWords sidecar ${wordsPath} is empty or not an array`); process.exit(2); }

// normalize + sort by absolute start time; end = next word's start, last word gets +TAIL.
const words = raw
  .map((x) => ({ w: String(x.w), t: Number(x.t) }))
  .filter((x) => x.w.trim() && Number.isFinite(x.t))
  .sort((a, b) => a.t - b.t)
  .map((x, i, arr) => ({ ...x, end: i + 1 < arr.length ? arr[i + 1].t : x.t + TAIL }));

// group into phrases: break at the target size, or after a pause. Each word's end is the next
// word's onset, so a silence shows up as a long trailing word (end - t): a big gap AFTER a word
// means the speaker paused, so the phrase breaks before the next word.
const phrases = [];
let cur = [];
for (const word of words) {
  const prev = cur[cur.length - 1];
  const pausedAfterPrev = prev && prev.end - prev.t > PAUSE_GAP;
  if (cur.length && (cur.length >= group || pausedAfterPrev)) {
    phrases.push(cur);
    cur = [];
  }
  cur.push(word);
}
if (cur.length) phrases.push(cur);

// one caption per phrase. `words` gives the engine exact per-word windows (core/captions.js:16),
// so the karaoke tracks the real VO instead of the length-proportional fallback.
const captions = phrases.map((p) => ({
  t0: r3(p[0].t),
  t1: r3(p[p.length - 1].end),
  text: p.map((x) => x.w).join(' '),
  words: p.map((x) => ({ t0: r3(x.t), t1: r3(x.end) })),
}));

if (WRITE) {
  scene.captionStyle = style;
  scene.captions = captions;
  const out = file.replace(/\.json$/, '.captioned.json');
  fs.writeFileSync(out, JSON.stringify(scene, null, 2));
  console.log(`\n  ✓ ${captions.length} captions (style ${style}, group ${group}) → ${out}\n`);
} else {
  console.log(`\n  vo captions · ${file}`);
  console.log(`  sidecar: ${wordsPath}  (${words.length} words → ${captions.length} captions, style ${style}, group ${group})\n`);
  for (const c of captions) console.log(`  @${c.t0.toFixed(2)}–${c.t1.toFixed(2)}s  ${c.text}`);
  console.log(`\n  { "captionStyle": "${style}", "captions": ${JSON.stringify(captions, null, 2).replace(/\n/g, '\n  ')} }`);
  console.log(`\n  dry run. Re-run with --write (or WRITE=1) to apply → <file>.captioned.json\n`);
}

function argVal(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}
function resolveVo(ref, sceneFile) {
  const candidates = [
    path.resolve(path.dirname(sceneFile), ref), // next to the scene
    path.resolve(ref),                          // repo root / cwd
    path.resolve('formats/scene', ref),         // the scene home
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}
function r3(n) { return Math.round(n * 1000) / 1000; }
