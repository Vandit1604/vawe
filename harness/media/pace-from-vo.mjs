import fs from 'node:fs';

const VO = process.env.VO || process.argv[2];
if (!VO || !fs.existsSync(VO)) { console.error('usage: make check GATE=pace-from-vo VO=<file>.words.json [BEATS=<n>]'); process.exit(2); }
const words = JSON.parse(fs.readFileSync(VO, 'utf8'));
if (!Array.isArray(words) || !words.length || words[0].t == null) { console.error(`✗ ${VO} is not a voWords sidecar ([{w,t}]).`); process.exit(1); }

const gaps = []; for (let i = 1; i < words.length; i++) gaps.push(words[i].t - words[i - 1].t);
const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0.4;
const total = +(words[words.length - 1].t + Math.max(0.4, avgGap * 2)).toFixed(2);

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
