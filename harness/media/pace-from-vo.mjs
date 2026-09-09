// harness/media/pace-from-vo.mjs: SCRIPT-FIRST PACING. Write the narration first (make tts), then pace the
// video TO THE VOICE instead of guessing seconds per beat. This reads a voWords sidecar ([{w,t}], from
// make tts / captions) and proposes beat boundaries at the sentence breaks, with each beat's start +
// duration taken from when the words are actually spoken. Transcribe those onto each beat's hero layer and
// the reveals land on the narration, the way another engine times shots to audio. It PROPOSES; it never
// mutates the scene.
//
//   make pace-from-vo VO=<file>.words.json [BEATS=<n>]   (BEATS forces n roughly-equal chunks by word count)
import fs from 'node:fs';

const VO = process.env.VO || process.argv[2];
if (!VO || !fs.existsSync(VO)) { console.error('usage: make pace-from-vo VO=<file>.words.json [BEATS=<n>]'); process.exit(2); }
const words = JSON.parse(fs.readFileSync(VO, 'utf8'));
if (!Array.isArray(words) || !words.length || words[0].t == null) { console.error(`✗ ${VO} is not a voWords sidecar ([{w,t}]).`); process.exit(1); }

// average inter-word gap → a sensible tail for the last beat (and a floor for degenerate gaps).
const gaps = []; for (let i = 1; i < words.length; i++) gaps.push(words[i].t - words[i - 1].t);
const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0.4;
const total = +(words[words.length - 1].t + Math.max(0.4, avgGap * 2)).toFixed(2);

// segment: by sentence-ending punctuation, or into N equal-ish chunks if BEATS is set.
const N = process.env.BEATS ? Math.max(1, parseInt(process.env.BEATS, 10)) : null;
const groups = [];
if (N) {
  const per = Math.ceil(words.length / N);
  for (let i = 0; i < words.length; i += per) groups.push(words.slice(i, i + per));
} else {
  let cur = [];
  for (const w of words) { cur.push(w); if (/[.!?:]["')]?$/.test(w.w)) { groups.push(cur); cur = []; } }
  if (cur.length) groups.push(cur);
}

const beats = groups.map((g, i) => {
  const start = +g[0].t.toFixed(2);
  const nextStart = i < groups.length - 1 ? groups[i + 1][0].t : total;
  return { start, duration: +(nextStart - start).toFixed(2), line: g.map((x) => x.w).join(' ') };
});

console.log(`\n  pace-from-vo · ${VO}  ·  ${words.length} words · ${beats.length} beat(s) ${N ? '(equal chunks)' : '(sentence-segmented)'} · ~${total}s`);
for (const [i, b] of beats.entries()) console.log(`    beat ${String(i + 1).padStart(2)}  ${b.start.toFixed(2)}s–${(b.start + b.duration).toFixed(2)}s  (${b.duration.toFixed(2)}s)  "${b.line.slice(0, 60)}${b.line.length > 60 ? '…' : ''}"`);
console.log(`\n  transcribe onto each beat's hero layer (start + duration timed to the voice):`);
console.log(JSON.stringify(beats.map((b) => ({ start: b.start, duration: b.duration, line: b.line })), null, 2));
console.log(`\n  the reveals now land on the narration. Keep audio.voWords wired so captions + inspect stay in sync.\n`);
