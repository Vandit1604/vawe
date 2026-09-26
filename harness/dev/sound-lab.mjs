import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { CUES, renderCue, normalize, encodeWav, SR } from '../../core/audio/kit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'out/sound-lab');
const VERDICTS = 'quality/baselines/sound-verdicts.json';

fs.mkdirSync(OUT, { recursive: true });
const names = Object.keys(CUES).sort();
for (const n of names) fs.writeFileSync(path.join(OUT, `${n}.wav`), encodeWav(normalize(renderCue(CUES[n], 1))));

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
