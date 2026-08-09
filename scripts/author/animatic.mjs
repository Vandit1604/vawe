// scripts/author/animatic.mjs — cut the picture to the sound, before building the film.
//
// THE FIRST VERSION OF THIS FILE WAS NOT AN ANIMATIC. It laid grey boxes on the storyboard's own
// declared timings and shipped `audio: {silent: true}`, and the trade's own definition is blunt about
// that: "a silent animatic is just a slideshow — without scratch voiceover and temp music you cannot
// evaluate pacing accurately." It tested the plan against itself, which is the one thing
// `storyboard-check` already does, so nobody ever ran it and it was deleted.
//
// What an animatic is FOR is the clock, and the clock comes from the voice. So this one works the way
// a studio does: synthesize a scratch read of the script, MEASURE it, and cut the picture to what the
// words actually take. The storyboard says a beat is five seconds; the scratch read says the copy takes
// six and a half. That gap is the entire product of this step, and no static gate can produce it.
//
// Scratch audio is meant to be ugly. macOS `say` is a robot and that is correct: its only job is to
// carry the rhythm the picture is cut against, and a beautiful read would tempt you to judge the read.
// It is also DETERMINISTIC (same text + voice → same audio, same timings), so an animatic never breaks
// the render's purity contract.
//
//   node scripts/author/animatic.mjs <STORYBOARD.md> [--voice Samantha] [--out <scene.json>]
//   make animatic SB=<file>            (generates, then renders draft)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseStoryboard } from './storyboard-parse.mjs';

const args = process.argv.slice(2);
const SB = args.find((a) => !a.startsWith('--'));
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
if (!SB || !fs.existsSync(SB)) {
  console.error('usage: animatic <STORYBOARD.md> [--voice Name] [--out <scene.json>]');
  console.error('       template: docs/CRAFT/STORYBOARD-TEMPLATE.md');
  process.exit(2);
}

const sb = parseStoryboard(fs.readFileSync(SB, 'utf8'));
if (!sb.beats.length) { console.error(`✗ no beats in ${SB} — beats are "## Beat N: Title (0s-6s)" headings.`); process.exit(1); }

const name = path.basename(SB).replace(/\.(md|markdown)$/i, '').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
const OUT = flag('--out') || `formats/scene/${name}.animatic.json`;
// `make animatic` renders what this writes, so it needs the path. It used to rebuild the name in shell
// and got a different answer (`tr -c` turned basename's trailing newline into an extra dash), so the
// render ran against a file that never existed. One derivation, asked for by name.
if (args.includes('--path')) { console.log(OUT); process.exit(0); }
const VOICE = flag('--voice');
const VODIR = path.join('/tmp/animatic', name);
fs.rmSync(VODIR, { recursive: true, force: true });
fs.mkdirSync(VODIR, { recursive: true });

// ── the scratch read ───────────────────────────────────────────────────────────────────────────────
// TWO CLOCKS, AND THEY ARE NOT THE SAME CLOCK. Narration is SPOKEN, and the honest way to measure it
// is to say it and time it. On-screen copy is READ, and reading is far faster than speech: ~238wpm for
// silent English reading against ~150wpm for a voice, and a three-word headline is grasped well inside
// a second. The first cut of this file ran both through TTS and reported a 12s storyboard as 35.3s,
// which is not a finding, it is a unit error wearing a finding's clothes.
const READ_WPM = 238;      // Brysbaert 2019, silent reading of English prose
const FIXATION = 0.35;     // per line: the eye has to land before it can read
const readSec = (lines) => {
  const words = lines.join(' ').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  return words / (READ_WPM / 60) + FIXATION * lines.length;
};
const speech = sb.beats.map((b) => {
  const narration = (b.narration || '').trim();
  return {
    beat: b,
    text: narration.replace(/<[^>]+>/g, '').trim(),
    read: readSec(b.onscreen),          // how long the frame's copy takes to READ
    proxy: !narration,                  // no voice on this beat; the clock comes from reading
  };
});

const durOf = (wav) => parseFloat(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], { encoding: 'utf8' }).trim());

// Synthesize each beat SEPARATELY rather than as one script, because the number wanted is per beat and
// deriving it from a combined word track means guessing where one beat's words end and the next begin.
const parts = [];
for (const [i, s] of speech.entries()) {
  if (!s.text) { parts.push({ ...s, sec: 0, wav: null, words: [] }); continue; }
  const base = path.join(VODIR, `beat-${String(i).padStart(2, '0')}`);
  execFileSync('node', ['scripts/media/tts.mjs', '--text', s.text, '--out', base,
    ...(VOICE ? ['--voice', VOICE] : [])], { stdio: 'pipe' });
  parts.push({ ...s, sec: durOf(`${base}.wav`), wav: `${base}.wav`,
    words: JSON.parse(fs.readFileSync(`${base}.words.json`, 'utf8')) });
}

// ── the clock: picture cut TO the sound ────────────────────────────────────────────────────────────
const BREATH = 0.45;      // the pause a reader leaves between beats; without it every cut lands on a syllable
const MIN_SILENT = 1.2;   // a beat with no copy still has to be seen
let t = 0;
const timed = parts.map((p) => {
  const planned = p.beat.duration ?? (p.beat.end != null && p.beat.start != null ? p.beat.end - p.beat.start : null);
  // A narrated beat lasts as long as the voice takes. An un-narrated one lasts as long as its copy
  // takes to READ. Either way the number comes from the content, never from the author's estimate of
  // it, and that inversion is the whole reason this file exists.
  const need = p.sec > 0 ? p.sec + BREATH : Math.max(MIN_SILENT, p.read + FIXATION);
  const row = { ...p, planned, spoken: +need.toFixed(2), start: +t.toFixed(2), voiced: p.sec > 0 };
  t += need;
  return row;
});
const total = +t.toFixed(2);

// concatenate the beat wavs into one scratch track, with the breath between them as real silence, so
// the animatic's audio and its picture are the same clock rather than two clocks that agree on paper.
const listFile = path.join(VODIR, 'concat.txt');
const silence = path.join(VODIR, 'breath.wav');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=stereo:d=${BREATH}`, '-c:a', 'pcm_s16le', silence]);
const seq = [];
for (const r of timed) {
  if (r.wav) { seq.push(r.wav); seq.push(silence); }
  else seq.push(...Array(Math.max(1, Math.round(r.spoken / BREATH))).fill(silence));
}
fs.writeFileSync(listFile, seq.map((f) => `file '${path.resolve(f)}'`).join('\n') + '\n');
const VO = path.join(VODIR, 'scratch.wav');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', VO]);

// one word track for the whole film, each beat's words shifted onto the film clock
const allWords = [];
for (const r of timed) for (const w of r.words) allWords.push({ w: w.w, t: +(r.start + w.t).toFixed(3) });
const WORDS = path.join(VODIR, 'scratch.words.json');
fs.writeFileSync(WORDS, JSON.stringify(allWords, null, 1));

// ── the picture: deliberately ugly ─────────────────────────────────────────────────────────────────
// Grey blocks, one weight of type, no brand, no colour. Every ounce of styling is something the eye
// would rather look at than the pacing, and pacing is the only question this file may answer.
const fmt = /(\d+)\s*[x×]\s*(\d+)/.exec(sb.format || '');
const W = fmt ? +fmt[1] : 1920, H = fmt ? +fmt[2] : 1080;
const INK = '#111111', GREY = '#c9c9c9', SLOT = '#e6e6e6', MUTED = '#8a8a8a';
const PAD = Math.round(W * 0.055);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[—–]/g, ',');
const layers = [];

for (const r of timed) {
  const b = r.beat, dur = r.spoken, enter = Math.min(0.28, dur * 0.22);
  const fit = (text, startSize, maxLines) => {
    const box = W - PAD * 2; let sz = startSize;
    while (sz > 18 && Math.ceil(text.length * sz * 0.5 / box) > maxLines) sz -= 2;
    return { size: sz, lines: Math.max(1, Math.ceil(text.length * sz * 0.5 / box)) };
  };
  let cursorY = Math.round(H * 0.11);
  const copy = [];
  b.onscreen.slice(0, 3).forEach((line, j) => {
    const big = j === 0, txt = esc(line);
    const { size, lines } = fit(txt, Math.round(H * (big ? 0.072 : 0.032)), big ? 3 : 2);
    copy.push({ type: 'text', text: txt, x: PAD, y: cursorY, w: W - PAD * 2, size, weight: big ? 700 : 400,
      color: big ? INK : MUTED, align: 'left', ls: big ? '-0.02em' : '0',
      start: +(r.start + (big ? 0 : 0.12 * j)).toFixed(2),
      duration: +Math.max(0.2, dur - (big ? 0 : 0.12 * j)).toFixed(2),
      anim: 'fade', enterDur: +enter.toFixed(2), exitDur: 0 });
    cursorY += Math.round(size * 1.18 * lines) + (big ? 14 : 6);
  });

  // the picture slot — drawn even when the beat names nothing to draw, because an empty labelled box
  // IS the dual-channel gap and it should be impossible to skim past
  const hasPic = !!(b.picture || b.blueprint);
  const capt = b.picture || (b.blueprint ? `blueprint: ${b.blueprint}` : 'NO PICTURE NAMED, this beat is type only');
  const slotTop = Math.max(Math.round(H * 0.30), cursorY + 16);
  const slotH = Math.max(140, H - slotTop - Math.round(H * 0.14));
  layers.push({ type: 'rect', x: PAD, y: slotTop, w: W - PAD * 2, h: slotH, radius: 6,
    bg: hasPic ? SLOT : 'transparent', border: hasPic ? `2px solid ${GREY}` : `2px dashed ${GREY}`,
    start: +r.start.toFixed(2), duration: +dur.toFixed(2), anim: 'fade', enterDur: +enter.toFixed(2), exitDur: 0 });
  layers.push({ type: 'text', text: esc(capt), x: PAD + 24, y: slotTop + 18, w: W - PAD * 2 - 48,
    size: Math.round(H * 0.024), weight: 500, color: hasPic ? MUTED : '#b00020', align: 'left',
    start: +r.start.toFixed(2), duration: +dur.toFixed(2), anim: 'fade', enterDur: +enter.toFixed(2), exitDur: 0 });
  layers.push(...copy);

  // the HUD carries the VERDICT, not just the clock: a beat that overran its plan says so on the frame
  // at the moment it overruns, which is where the author is actually looking.
  const over = r.planned != null ? r.spoken - r.planned : null;
  const verdict = over == null ? 'no planned span'
    : over > 0.35 ? `PLAN SAID ${r.planned.toFixed(1)}s, NEEDS ${r.spoken.toFixed(1)}s  (+${over.toFixed(1)}s)`
    : over < -0.6 ? `plan said ${r.planned.toFixed(1)}s, only needs ${r.spoken.toFixed(1)}s  (${over.toFixed(1)}s)`
    : `on plan (${r.planned.toFixed(1)}s)`;
  layers.push({ type: 'text',
    text: esc(`${b.i + 1}. ${b.name}   ${r.start.toFixed(1)}s to ${(r.start + dur).toFixed(1)}s   ${verdict}`),
    x: PAD, y: H - Math.round(H * 0.085), w: W - PAD * 2, size: Math.round(H * 0.024), weight: 500,
    color: over != null && over > 0.35 ? '#b00020' : MUTED, align: 'left',
    start: +r.start.toFixed(2), duration: +dur.toFixed(2), exitDur: 0 });
  if (r.text) layers.push({ type: 'text', text: esc(`${r.proxy ? 'reading' : 'vo'}: ${r.text.slice(0, 110)}`),
    x: PAD, y: H - Math.round(H * 0.05), w: W - PAD * 2, size: Math.round(H * 0.021), weight: 400,
    color: GREY, align: 'left', start: +r.start.toFixed(2), duration: +dur.toFixed(2), exitDur: 0 });
}

const scene = {
  module: 'scene',
  authoring: {
    allow: ['no-continuous-object', 'no-continuous-object-inferred', 'plain-slideshow',
      'dead-air', 'ends-on-nothing', 'linear-motion', 'monotone-timing', 'static-bg', 'overlap', 'contrast', 'safe',
      'no-camera', 'no-transition', 'no-kinetic-type', 'no-bg-motion', 'low-vocab', 'front-loaded'],
    _why: { animatic: `Timing pass generated from ${path.basename(SB)} by scripts/author/animatic.mjs. It is meant to look like nothing so that pacing is the only thing left to judge, and it is never a deliverable. The taste gates are waived BY CONSTRUCTION here rather than per-scene by an author talking themselves into it.` },
  },
  theme: 'vawe',
  aspect: W >= H ? '16:9' : '9:16',
  duration: total,
  authoringNote: `ANIMATIC of ${path.basename(SB)}: ${timed.length} beats, ${total.toFixed(1)}s, cut to a scratch read. `
    + 'Judge PACING only: does each beat have room for what it promised, and is any of it over before you can read it?',
  layers,
  bg: [{ t: 0, preset: 'plain', from: 0, to: total }],
  audio: { vo: path.resolve(VO), voWords: path.resolve(WORDS), music: null },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(scene, null, 2) + '\n');

// ── the report — the number the storyboard cannot produce about itself ──────────────────────────────
const plannedTotal = timed.reduce((s, r) => s + (r.planned ?? 0), 0);
console.log(`\n  ANIMATIC · ${path.basename(SB)} → ${OUT}`);
console.log(`  ${timed.filter((r) => r.voiced).length}/${timed.length} beats narrated (${allWords.length} words of scratch read); the rest timed by READING speed at ${READ_WPM}wpm\n`);
console.log('  beat                        clock   planned    needs    verdict');
for (const r of timed) {
  const over = r.planned != null ? r.spoken - r.planned : null;
  const v = over == null ? '—' : over > 0.35 ? `OVER by ${over.toFixed(1)}s` : over < -0.6 ? `${(-over).toFixed(1)}s spare` : 'fits';
  console.log(`  ${(r.beat.i + 1 + '. ' + r.beat.name).slice(0, 26).padEnd(28)}${(r.voiced ? 'voice' : 'read').padEnd(7)}${(r.planned != null ? r.planned.toFixed(1) + 's' : '—').padStart(7)}   ${(r.spoken.toFixed(1) + 's').padStart(7)}    ${v}`);
}
if (plannedTotal > 0) {
  const d = total - plannedTotal;
  console.log(`\n  the film your storyboard describes is ${plannedTotal.toFixed(1)}s. To be read and heard it needs ${total.toFixed(1)}s (${d >= 0 ? '+' : ''}${d.toFixed(1)}s).`);
}
const over = timed.filter((r) => r.planned != null && r.spoken - r.planned > 0.35);
if (over.length) console.log(`  ${over.length} beat(s) do not have room for their own copy: ${over.map((r) => r.beat.name).join(', ')}.`);
const noPic = timed.filter((r) => !r.beat.picture && !r.beat.blueprint);
if (noPic.length) console.log(`  ${noPic.length}/${timed.length} beat(s) name no picture; they render as empty slots, which is what a type-only beat IS.`);
console.log(`\n  watch it:  ./bin/vawe ${OUT} --draft --workers 2\n`);
