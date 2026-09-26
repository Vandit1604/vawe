// harness/author/review-server.mjs: ONE page per render, served like `make tune`. HyperFrames forces
// an agent to paste the raw output of w2h-verify.mjs because agents skip required steps unless the
// numbers are put in front of them; this is that idea for the eye review, one page carrying the frame
// grid, a time slider, the reference side by side (when REF is given), the verify block AND the judge
// JSON, so nobody has to open four tools to look at one render.
//
// Usage: node harness/author/review-server.mjs D=<film.json> [REF=<ref.mp4>] [PORT=8802]
//        node harness/author/review-server.mjs D=<film.json> --screenshot <out.png>   (headless, one shot, exits)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { frameTile, tileBox, baseOf, renderOf, gradeable } from '../../quality/gates/tile.mjs';
import { beatsOf } from '../../quality/gates/beats-of.mjs';
import { verify } from '../dev/verify.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readArg(key, positionalIdx) {
  const pref = `${key}=`;
  const hit = process.argv.slice(2).find((a) => a.startsWith(pref));
  if (hit) return hit.slice(pref.length);
  if (process.env[key]) return process.env[key];
  const flagIdx = process.argv.indexOf(`--${key.toLowerCase()}`);
  if (flagIdx >= 0) return process.argv[flagIdx + 1];
  return positionalIdx != null ? process.argv[positionalIdx] : undefined;
}

const D = readArg('D', 2);
const REF = readArg('REF');
const SCREENSHOT = readArg('screenshot');
const PORT = Number(readArg('PORT')) || 8802;
if (!D || !fs.existsSync(D)) {
  console.error('usage: node harness/author/review-server.mjs D=<film.json> [REF=<ref.mp4>] [PORT=8802] [--screenshot <out.png>]');
  process.exit(2);
}

const filmPath = path.resolve(D);
const scene = JSON.parse(fs.readFileSync(filmPath, 'utf8'));
const mp4 = renderOf(filmPath);
const ready = gradeable(filmPath, mp4);
if (!ready.ok) { console.error(`✗ ${ready.why}. fix: ${ready.fix}`); process.exit(1); }

const dur = Number(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', mp4]).toString().trim());
const beats = beatsOf(scene, dur, filmPath);

// One frame per beat, at full render resolution (never the judge sheet's letterboxed tile): a slider
// review needs the real pixels, the contact sheet is for structure only.
const slug = baseOf(mp4);
const framesDir = path.join('/tmp/review', slug);
fs.rmSync(framesDir, { recursive: true, force: true }); fs.mkdirSync(framesDir, { recursive: true });
const refDur = REF && fs.existsSync(REF) ? Number(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', REF]).toString().trim()) : null;

const dims = execFileSync('ffprobe',
  ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', mp4])
  .toString().trim().split(',').map(Number);
const { tw, th } = tileBox(dims[0] >= dims[1]);

const beatData = beats.map((b, i) => {
  const out = frameTile(mp4, b.t, path.join(framesDir, `out${i}.png`), { tw, th });
  const refOut = refDur != null
    ? frameTile(REF, Math.min(refDur - 0.05, Math.max(0, b.t * (refDur / dur))), path.join(framesDir, `ref${i}.png`), { tw, th })
    : null;
  return { i, label: b.label, t: b.t, out: path.basename(out), ref: refOut ? path.basename(refOut) : null };
});

const verifyResult = verify(filmPath, REF);

// judge JSON: whatever the structured judge already wrote for this cut (make judge D=... STRUCT=1,
// then each independent run's verdicts/*.json). Read-only here; this page never invents a verdict.
const judgeDir = `/tmp/judge/${slug}`;
const verdictsDir = path.join(judgeDir, 'verdicts');
const verdicts = fs.existsSync(verdictsDir)
  ? fs.readdirSync(verdictsDir).filter((f) => f.endsWith('.json'))
    .map((f) => ({ run: f.replace(/\.json$/, ''), json: fs.readFileSync(path.join(verdictsDir, f), 'utf8') }))
  : [];
const judgeSheet = fs.existsSync(`${judgeDir}/sheet.png`) ? `${judgeDir}/sheet.png` : null;

function page() {
  const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const verdictBlocks = verdicts.length
    ? verdicts.map((v) => `<h3>run ${esc(v.run)}</h3><pre>${esc(v.json)}</pre>`).join('\n')
    : '<p class="muted">no structured verdict yet. `make judge D=&lt;file&gt; STRUCT=1`, score it, then --verdict-json.</p>';
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>review: ${esc(slug)}</title>
<style>
  body { background:#0a0a0c; color:#e8e8ea; font:14px/1.5 -apple-system,sans-serif; margin:0; padding:24px; }
  h1 { font-size:18px; margin:0 0 4px; } .muted { color:#8a8a92; }
  .frame-pair { display:flex; gap:12px; align-items:flex-start; margin:16px 0; }
  .frame-pair figure { margin:0; } .frame-pair img { max-width:560px; display:block; border:1px solid #2a2a30; }
  .frame-pair figcaption { color:#8a8a92; font-size:12px; margin-top:4px; }
  #slider { width:600px; } .grid { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0; }
  .grid img { width:140px; border:1px solid #2a2a30; cursor:pointer; }
  .grid img.active { border-color:#5b9dff; }
  pre { background:#141418; padding:12px; border-radius:6px; overflow:auto; max-height:340px; font-size:12px; }
  section { margin-bottom:32px; } h2 { font-size:14px; text-transform:uppercase; letter-spacing:0.04em; color:#8a8a92; }
</style></head>
<body>
<h1>review · ${esc(slug)}</h1>
<p class="muted">${esc(dur.toFixed(1))}s · ${beatData.length} beat(s)${REF ? ` · REF: ${esc(REF)}` : ''}</p>

<section>
  <h2>frame + reference</h2>
  <input id="slider" type="range" min="0" max="${beatData.length - 1}" value="0">
  <div class="frame-pair">
    <figure><img id="mainFrame" src="/frames/${esc(beatData[0].out)}"><figcaption id="mainCap">${esc(beatData[0].label)}</figcaption></figure>
    ${REF ? `<figure><img id="refFrame" src="/frames/${beatData[0].ref ? esc(beatData[0].ref) : ''}"><figcaption>reference</figcaption></figure>` : ''}
  </div>
  <div class="grid" id="grid">
    ${beatData.map((b) => `<img data-i="${b.i}" class="${b.i === 0 ? 'active' : ''}" src="/frames/${esc(b.out)}">`).join('\n    ')}
  </div>
</section>

<section>
  <h2>verify (harness/dev/verify.mjs)</h2>
  <pre>${esc(verifyResult.text)}</pre>
</section>

<section>
  <h2>judge</h2>
  ${judgeSheet ? `<p class="muted">sheet: ${esc(judgeSheet)}</p>` : ''}
  ${verdictBlocks}
</section>

<script>
const beats = ${JSON.stringify(beatData)};
const slider = document.getElementById('slider'), grid = document.getElementById('grid');
function show(i) {
  const b = beats[i];
  document.getElementById('mainFrame').src = '/frames/' + b.out;
  document.getElementById('mainCap').textContent = b.label;
  const rf = document.getElementById('refFrame');
  if (rf && b.ref) rf.src = '/frames/' + b.ref;
  [...grid.children].forEach((img) => img.classList.toggle('active', Number(img.dataset.i) === i));
  slider.value = i;
}
slider.addEventListener('input', (e) => show(Number(e.target.value)));
grid.addEventListener('click', (e) => { if (e.target.dataset.i != null) show(Number(e.target.dataset.i)); });
</script>
</body></html>`;
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '') {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end(page()); return;
  }
  if (url.startsWith('/frames/')) {
    const file = path.join(framesDir, path.basename(url));
    if (fs.existsSync(file)) { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(fs.readFileSync(file)); return; }
  }
  res.writeHead(404); res.end('not found');
});

server.listen(PORT, async () => {
  console.log(`  review · ${slug} · ${beatData.length} beat(s) → http://127.0.0.1:${PORT}/`);
  if (!SCREENSHOT) return;
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1400, height: 1600, deviceScaleFactor: 1 });
  await page2.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  fs.mkdirSync(path.dirname(path.resolve(SCREENSHOT)), { recursive: true });
  await page2.screenshot({ path: path.resolve(SCREENSHOT), fullPage: true });
  await browser.close();
  console.log(`  ✓ screenshot → ${SCREENSHOT}`);
  server.close(() => process.exit(0));
});
