// scripts/dev/sound-lab.mjs: hear every cue the engine can make, and say which ones are any good.
//
// WHY THIS EXISTS. core/audio-kit.mjs synthesises 20 cues from parameters, and until now the only way
// to hear one was to put it in a film and render the film. So the voicings have never been judged as
// voicings: they were tuned by reading numbers, and it shows. A film shipped today was pulled back for
// exactly that.
//
// The verdicts are the point, not the page. `verify/sound-verdicts.json` is a record of which cues a
// person actually liked, per cue, with a note. That is the input a tuning pass needs and has never had:
// without it, "the sounds are bad" is one sentence covering twenty different sounds.
//
//   node scripts/dev/sound-lab.mjs            # bake the wavs, write the page, print the path
//   node scripts/dev/sound-lab.mjs --open     # and open it
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { CUES, renderCue, normalize, writeWav, SR } from '../../core/audio-kit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'out/sound-lab');
const VERDICTS = 'verify/sound-verdicts.json';

fs.mkdirSync(OUT, { recursive: true });
const names = Object.keys(CUES).sort();
for (const n of names) writeWav(path.join(OUT, `${n}.wav`), normalize(renderCue(CUES[n], 1)));

// A cue's own family, so the page groups sounds that should be judged against each other rather than
// against the whole set: a `thud` and a `sparkle` are not competing for the same slot.
// A CUE MISSING FROM THIS MAP DOES NOT RENDER ON THE PAGE, because the groups below are a fixed list
// and an unfamilied cue falls to 'other', which no group prints. Silent omission from a judging tool
// is the worst failure it can have: the sound is never heard and the absence looks like a decision.
const FAMILY = {
  whoosh: 'movement', riser: 'movement', swell: 'movement',
  impact: 'weight', drop: 'weight', braam: 'weight',
  pluck: 'accent', chime: 'accent', sparkle: 'accent', droplet: 'accent', bloom: 'accent',
  success: 'state', ready: 'state',
};
const GROUPS = ['movement', 'weight', 'accent', 'state'];
const orphans = names.filter((n) => !FAMILY[n]);
if (orphans.length) { console.error(`\u2717 sound-lab: no family for ${orphans.join(', ')}, so they would not render. Add them to FAMILY.`); process.exit(1); }

const rows = names.map((n) => `
  <div class="cue" data-cue="${n}">
    <button class="play" aria-label="play ${n}">▶</button>
    <div class="meta"><b>${n}</b><span>${FAMILY[n] || 'other'}</span></div>
    <div class="verdict">
      <button data-v="keep">keep</button>
      <button data-v="weak">weak</button>
      <button data-v="reject">reject</button>
    </div>
    <input class="note" placeholder="what is wrong with it, in your words">
    <audio preload="none" src="${n}.wav"></audio>
  </div>`).join('');

fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8">
<title>Sound lab</title><style>
:root{color-scheme:light dark}
body{margin:0;padding:48px 28px 120px;font:15px/1.55 ui-sans-serif,system-ui,sans-serif;background:#0d1017;color:#eef1f7}
.wrap{max-width:760px;margin:0 auto}
h1{font-size:1.4rem;letter-spacing:-.02em;margin:0 0 6px}
p.lede{color:#9aa3b7;margin:0 0 28px;max-width:62ch}
.cue{display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;
  padding:12px 14px;border:1px solid #232a3a;border-radius:11px;background:#141926;margin-bottom:9px}
.cue.keep{border-color:#2f9e5f;background:#122018}
.cue.weak{border-color:#9a7b28;background:#1d1a12}
.cue.reject{border-color:#9e3f3f;background:#1e1315;opacity:.62}
.play{width:38px;height:38px;border-radius:9px;border:1px solid #2c3547;background:#1b2233;color:#eef1f7;cursor:pointer;font-size:13px}
.meta b{display:block}.meta span{color:#7d8699;font-size:12px}
.verdict button{margin-left:5px;padding:5px 11px;border-radius:100px;border:1px solid #2c3547;
  background:transparent;color:#aab2c4;cursor:pointer;font-size:12px}
.verdict button[aria-pressed=true]{background:#2563eb;border-color:#2563eb;color:#fff}
.note{grid-column:2/4;width:100%;box-sizing:border-box;padding:7px 10px;border-radius:8px;
  border:1px solid #232a3a;background:#0f1420;color:#eef1f7;font:13px ui-sans-serif,system-ui}
.bar{position:fixed;left:0;right:0;bottom:0;padding:14px 28px;background:#0d1017ee;
  border-top:1px solid #232a3a;backdrop-filter:blur(8px);display:flex;gap:14px;align-items:center}
.bar button{padding:9px 16px;border-radius:9px;border:0;background:#2563eb;color:#fff;cursor:pointer;font:600 13px ui-sans-serif}
#tally{color:#9aa3b7;font-size:13px}
h2{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7d8699;margin:26px 0 8px}
</style>
<div class="wrap">
<h1>Sound lab</h1>
<p class="lede">Every cue the engine can synthesise, from <code>core/audio-kit.mjs</code>. Play each one and
judge it. Space plays the focused row. Your verdicts are saved as you go; <b>Copy verdicts</b> puts them
on the clipboard as JSON to paste back, and that file is what a tuning pass reads.</p>
${GROUPS
    .map((f) => `<h2>${f}</h2>` + names.filter((n) => (FAMILY[n] || 'other') === f)
      .map((n) => rows.split('\\n  <div class="cue"').find((r) => r.includes(`data-cue="${n}"`))
        ? `<div class="cue" data-cue="${n}">
    <button class="play">▶</button>
    <div class="meta"><b>${n}</b><span>${f}</span></div>
    <div class="verdict">
      <button data-v="keep">keep</button><button data-v="weak">weak</button><button data-v="reject">reject</button>
    </div>
    <input class="note" placeholder="what is wrong with it, in your words">
    <audio preload="none" src="${n}.wav"></audio>
  </div>` : '').join('')).join('')}
</div>
<div class="bar"><button id="copy">Copy verdicts</button><span id="tally"></span></div>
<script>
const KEY='vawe-sound-verdicts';
const stored=JSON.parse(localStorage.getItem(KEY)||'{}');
// PRUNE ON LOAD. A cue deleted between rounds leaves its verdict behind, and Copy verdicts then
// emits a union of the live set and every ghost: one paste carried 25 verdicts for 13 cues, and
// twelve of them judged sounds that no longer exist. The page knows which cues it just rendered,
// so it is the only place that can tell a stale verdict from a real one.
const live=new Set(Array.from(document.querySelectorAll('[data-cue]')).map(el=>el.dataset.cue));
const state={}; for(const k of Object.keys(stored)) if(live.has(k)) state[k]=stored[k];
localStorage.setItem(KEY,JSON.stringify(state));
function paint(){
  document.querySelectorAll('.cue').forEach(c=>{
    const n=c.dataset.cue, s=state[n]||{};
    c.className='cue'+(s.verdict?' '+s.verdict:'');
    c.querySelectorAll('.verdict button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===s.verdict)));
    if(s.note!==undefined) c.querySelector('.note').value=s.note;
  });
  const n=Object.values(state).filter(s=>s.verdict).length;
  document.getElementById('tally').textContent=n+' of '+document.querySelectorAll('.cue').length+' judged';
}
document.addEventListener('click',e=>{
  const cue=e.target.closest('.cue'); if(!cue) return;
  if(e.target.matches('.play')){ const a=cue.querySelector('audio'); a.currentTime=0; a.play(); return; }
  const v=e.target.dataset.v; if(!v) return;
  const n=cue.dataset.cue; state[n]=state[n]||{};
  state[n].verdict = state[n].verdict===v ? null : v;   // click again to clear
  localStorage.setItem(KEY,JSON.stringify(state)); paint();
});
document.addEventListener('input',e=>{
  if(!e.target.matches('.note')) return;
  const n=e.target.closest('.cue').dataset.cue;
  state[n]=state[n]||{}; state[n].note=e.target.value;
  localStorage.setItem(KEY,JSON.stringify(state));
});
document.getElementById('copy').onclick=async()=>{
  await navigator.clipboard.writeText(JSON.stringify(state,null,1));
  document.getElementById('copy').textContent='copied';
  setTimeout(()=>document.getElementById('copy').textContent='Copy verdicts',1200);
};
paint();
</script>`);

console.log(`\\n  SOUND LAB · ${names.length} cues baked to out/sound-lab/\\n`);
console.log(`  open out/sound-lab/index.html`);
console.log(`\\n  Judge them, hit Copy verdicts, and paste into ${VERDICTS}.`);
console.log('  That file is the input a voicing pass needs and has never had: without it,');
console.log('  "the sounds are bad" is one sentence covering twenty different sounds.\\n');

if (process.argv.includes('--open')) execFileSync('open', [path.join(OUT, 'index.html')]);

// ---------------------------------------------------------------- --measure
// WHY A NUMBER AND NOT A VERDICT. Nobody can judge a sound from its parameters, and an agent tuning
// these cues cannot hear at all. What it CAN do is check that a sound has the shape its name claims:
// a whoosh whose brightness never moves is a static buzz, and a "tail" of 40ms is a click whatever the
// comment above it says. So this prints, per cue, the two things a spec lies about most often:
// the loudness envelope over time, and where the spectrum sits over time.
//
// THE CENTROID IS AN RMS FREQUENCY, NOT AN FFT BIN CENTROID, and the difference is worth knowing before
// you quote it. For any signal, sqrt(∫f²|X(f)|² df / ∫|X(f)|² df) equals RMS(dx/dt) / (2π·RMS(x)), so
// the quadratic spectral centroid falls straight out of the derivative with no transform at all
// (Parseval; the identity is standard in the "spectral moments" literature). It weights the top octave
// harder than a linear-mean centroid does, so treat it as a brightness INDEX that must MOVE, never as
// a frequency you could tune a filter to.
//
//   node scripts/dev/sound-lab.mjs --measure          # every cue
//   node scripts/dev/sound-lab.mjs --measure whoosh   # one
function measure(x, slices = 8) {
  const n = x.length, per = Math.floor(n / slices);
  const rmsOf = (a, i0, i1) => { let s = 0; for (let i = i0; i < i1; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, i1 - i0)); };
  const d = new Float32Array(n); for (let i = 1; i < n; i++) d[i] = (x[i] - x[i - 1]) * SR;
  const band = [];
  for (let s = 0; s < slices; s++) {
    const i0 = s * per, i1 = s === slices - 1 ? n : i0 + per;
    const r = rmsOf(x, i0, i1);
    band.push({ rms: r, centroid: r < 1e-5 ? 0 : rmsOf(d, i0, i1) / (2 * Math.PI * r) });
  }
  let peak = 0, peakAt = 0;
  for (let i = 0; i < n; i++) { const a = Math.abs(x[i]); if (a > peak) { peak = a; peakAt = i; } }
  // Tail = time from the peak until the signal stays under -40dB of it. Measured backwards so one
  // late ring does not get averaged away by the silence around it.
  let end = n - 1; while (end > peakAt && Math.abs(x[end]) < peak * 0.01) end--;
  return { dur: n / SR, peak, peakAt: peakAt / SR, tail: (end - peakAt) / SR, band };
}

if (process.argv.includes('--measure')) {
  const only = process.argv[process.argv.indexOf('--measure') + 1];
  const pick = only && CUES[only] ? [only] : names;
  console.log('\n  cue          dur   attack   tail    peak   | RMS envelope (8 slices)      | centroid Hz (8 slices)');
  for (const n of pick) {
    const m = measure(normalize(renderCue(CUES[n], 1)));
    const env = m.band.map((b) => String(Math.round((b.rms / Math.max(1e-9, Math.max(...m.band.map((z) => z.rms)))) * 9))).join('');
    const cen = m.band.map((b) => (b.centroid < 1 ? '   .' : String(Math.round(b.centroid)).padStart(5))).join('');
    console.log(`  ${n.padEnd(12)}${m.dur.toFixed(2)}s ${m.peakAt.toFixed(3)}s ${m.tail.toFixed(3)}s ${m.peak.toFixed(2)}   | ${env.padEnd(28)} |${cen}`);
  }
  console.log('\n  RMS envelope: each digit is that slice as 0-9 of the loudest slice.');
  console.log('  centroid: RMS frequency per slice. A row of identical numbers is a sound that never moves.\n');
  process.exit(0);
}
