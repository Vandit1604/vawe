// scripts/gates/motion-audit.mjs — check ANIMATION OVER TIME without rendering video. Renders every frame
// headless (no encode, no screenshots), builds a per-element time series ({effective opacity, position,
// text}) for id'd / [data-layer="critical"] elements, and asserts the motion contract per segment:
//
//   FAIL  (i)   final hold        — the last visible frame of a segment (and of the video) is not faded
//   FAIL  (ii)  reveal monotonic  — a reveal's opacity never drops mid-scene (outside transitions)
//   FAIL  (iii) settle before exit— payoffs reach steady state ≥0.5s before the exit transition
//   FAIL  (iv)  count-up sane     — counters are non-decreasing and stable at the end
//   FAIL  (v)   typing completes  — typewriter text reaches its full length before the exit
//   WARN  (vi)  frozen span       — nothing tracked changes for >15% of the runtime (capped 0.6-2s)
//   WARN  (vii) velocity spike    — >80px/frame jumps outside segment boundaries
//
// Exemptions are declarative: elements (or ancestors) with data-motion="loop" (carets, spinners,
// pulsing chrome) are skipped by (ii)/(iii). Segment windows come from meta.segments (each format
// returns its SEGS); fallback: meta.stings, then the whole video as one segment.
//
//   node scripts/gates/motion-audit.mjs [format ...] [--stride N] [--data path.json] [--json]
//   make motion [M=<format>] [STRIDE=2]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/safe.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const STRIDE = Math.max(1, parseInt(flag('--stride') || '1', 10));
const DATA = flag('--data');
const JSON_OUT = args.includes('--json');
let formats = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--stride' && args[i - 1] !== '--data');
if (!formats.length) formats = fs.readdirSync(path.join(repoRoot, 'formats')).filter((f) => fs.existsSync(path.join(repoRoot, 'formats', f, 'sample.json'))).sort();

const FPS = 30;
const HOLDW = 0.5;              // settle window: payoffs must be steady for this long before the exit
const INFRA = new Set(['cv', 'root', 'dip', 'grain', 'stage', 'ripple', 'cursor', 'brand', 'vig']); // chrome, not content

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const server = await new Promise((r) => { const s = http.createServer((req, res) => { const p = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '')); if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); });
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });

// parse "$1,247", "2.5M", "412ms", "88%" → number (for count-up monotonicity)
const parseNum = (t) => {
  const m = /-?\$?\s*([\d,]+(?:\.\d+)?)\s*([KMB])?/.exec(t || '');
  if (!m) return null;
  const v = parseFloat(m[1].replace(/,/g, ''));
  return v * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]] || 1);
};

async function audit(format) {
  const dataPath = DATA || `formats/${format}/sample.json`;
  const dataName = dataPath.split('/').pop();
  const data = JSON.parse(fs.readFileSync(path.join(repoRoot, dataPath), 'utf8'));
  const [VW, VH] = sceneDims(data);
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/formats/${format}/scene.html?data=/${dataPath}&fps=${FPS}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
  const err = await page.evaluate(() => window.__engineError);
  if (err) { await page.close(); return { format, data: dataName, error: String(err), findings: [] }; }
  const meta = await page.evaluate(() => window.__engine.meta);
  const total = meta.totalFrames;
  const TOTAL_SEC = total / FPS;   // runtime in seconds — the frozen-span budget scales with it

  // ---- capture: per-element time series across every (strided) frame ----
  const series = await page.evaluate(async (total, stride) => {
    const els = [...document.querySelectorAll('[id], [data-layer="critical"]')];
    const keys = els.map((el, i) => el.id || ((typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName) + '#' + i));
    const chains = els.map((el) => { const c = [el]; let p = el.parentElement; while (p && p !== document.body) { c.push(p); p = p.parentElement; } return c; });
    const loop = els.map((el) => !!el.closest('[data-motion]')); // any data-motion (loop/swap/…) opts out of motion checks
    const out = { keys, loop, frames: [], rows: keys.map(() => []) };
    for (let f = 0; f < total; f += stride) {
      window.__engine.renderFrame(f);
      out.frames.push(f);
      els.forEach((el, i) => {
        const b = el.getBoundingClientRect();
        if ((b.width < 1 && b.height < 1) || !el.getClientRects().length) { out.rows[i].push(null); return; }
        let eop = 1, hidden = false;
        for (const node of chains[i]) { const s = getComputedStyle(node); if (s.display === 'none' || s.visibility === 'hidden') { hidden = true; break; } eop *= +s.opacity; }
        if (hidden) { out.rows[i].push(null); return; }
        const t = (el.textContent || '').trim();
        // A layer can be busy inside its own box: an svg whose bars scale on var(--t) animates hard while
        // its bounding rect, opacity and text all sit perfectly still. Measuring only the outside made
        // `cadence`'s waveform read as frozen through the exact seconds it was drawing itself on. So a
        // cheap fingerprint of descendant transforms rides along, capped so a 90-layer film stays cheap.
        let sig = 0, seen = 0;
        for (const kid of el.querySelectorAll('*')) {
          if (seen++ >= 24) break;
          const tr = getComputedStyle(kid).transform;
          if (tr && tr !== 'none') for (let c = 0; c < tr.length; c++) sig = (sig * 31 + tr.charCodeAt(c)) | 0;
        }
        out.rows[i].push([Math.round((b.left + b.width / 2) * 10) / 10, Math.round((b.top + b.height / 2) * 10) / 10, Math.round(eop * 1000) / 1000, t.length, t.slice(0, 32), sig]);
      });
    }
    return out;
  }, total, STRIDE);
  await page.close();

  // ---- segments (frame windows + transition) ----
  // meta.segments = the format DECLARES its scene windows → the motion contract is enforceable (FAIL).
  // Fallback to stings is heuristic (stings are often beat markers, not cuts) → observations only (WARN).
  let segs = (meta.segments || []).map((s) => ({ name: s.name || s.label || s.type, dur: s.dur ?? (s.t1 - s.t0), trans: s.transition ?? 0.4 })); // accepts {dur} or {t0,t1}
  const declared = segs.length > 0;
  if (!segs.length && (meta.stings || []).length) {
    const cuts = [...meta.stings, total / FPS]; let prev = 0;
    segs = cuts.map((c, i) => { const s = { name: 'seg' + i, dur: c - prev, trans: 0.4 }; prev = c; return s; });
  }
  if (!segs.length) segs = [{ name: 'all', dur: total / FPS, trans: 0 }];
  let acc = 0;
  const windows = segs.map((s, i) => {
    const start = Math.round(acc * FPS); acc += s.dur;
    const isLast = i === segs.length - 1;
    const end = Math.min(Math.round(acc * FPS), total);                       // exclusive
    const visEnd = isLast ? end : end - Math.round(s.trans * FPS);            // content window end (exit starts here)
    return { ...s, i, start, end, visEnd, isLast };
  });

  // ---- checks ----
  const F = series.frames, at = (i, f) => { const idx = F.findIndex((x) => x >= f); return series.rows[i][idx < 0 ? F.length - 1 : idx]; };
  const findings = [];
  const add = (level, check, seg, key, msg) => findings.push({ level: declared ? level : 'WARN', check, seg: seg?.name, key, msg });
  const K = series.keys, LOOP = series.loop;
  const content = K.map((k, i) => !INFRA.has(k) && !LOOP[i]);

  const ENTRIES = []; // (ix) entry durations across the whole video
  for (const w of windows) {
    if (w.visEnd - w.start < FPS * 0.8) continue; // too short to judge
    const lastVisF = w.visEnd - 1 - ((w.visEnd - 1 - F[0]) % STRIDE || 0);

    // (i) final hold — the payoff frame of this segment must not be faded
    let maxOp = 0, any = false;
    K.forEach((k, i) => { if (!content[i]) return; const v = at(i, lastVisF); if (v) { any = true; maxOp = Math.max(maxOp, v[2]); } });
    if (any && maxOp < 0.9) add('FAIL', 'i:final-hold', w, '', `at ${(lastVisF / FPS).toFixed(2)}s max content opacity ${maxOp.toFixed(2)} < 0.9 (segment ends faded)`);
    if (!any) add('WARN', 'coverage', w, '', 'no tracked content elements — add data-layer="critical" to key elements');

    // (ix) rhythm data: per-element entry duration in this window = first frame opacity >= 0.9
    K.forEach((k, i) => {
      if (!content[i]) return;
      const lo = F.findIndex((f) => f >= w.start);
      if (lo < 0) return;
      for (let jj = lo; jj < F.length && F[jj] <= w.visEnd; jj++) {
        const v = series.rows[i][jj];
        if (v && v[2] >= 0.9) { const d = (F[jj] - w.start) / FPS; if (d <= 2 && d > 0) ENTRIES.push(+d.toFixed(2)); break; }
      }
    });

    K.forEach((k, i) => {
      if (!content[i]) return;
      const idx0 = F.findIndex((f) => f >= w.start), idx1 = F.findIndex((f) => f >= w.visEnd), idx2 = F.findIndex((f) => f >= w.end);
      const lo = idx0 < 0 ? F.length : idx0, hi = idx1 < 0 ? F.length : idx1, hiFull = idx2 < 0 ? F.length : idx2;
      // typewriter length over the FULL segment — typing that spills into the exit window is the bug
      let maxTl = 0;
      for (let j = lo; j < hiFull; j++) { const v = series.rows[i][j]; if (v) maxTl = Math.max(maxTl, v[3]); }
      let prev = null, prevF = -1, nums = [], maxDrop = 0, dropAt = 0;
      for (let j = lo; j < hi; j++) {
        const v = series.rows[i][j]; const f = F[j];
        if (v) { const n = parseNum(v[4]); if (n !== null && v[3] < 24) nums.push(n); }
        if (v && prev && prevF === F[j - 1]) {
          const dop = prev[2] - v[2];
          if (dop > maxDrop && f - w.start > w.trans * FPS) { maxDrop = dop; dropAt = f; }
          const dx = Math.abs(v[0] - prev[0]), dy = Math.abs(v[1] - prev[1]);
          if ((dx > 80 || dy > 80) && f - w.start > 2 && w.end - f > 2) add('WARN', 'vii:jump', w, k, `${Math.max(dx, dy).toFixed(0)}px jump at ${(f / FPS).toFixed(2)}s`);
        }
        prev = v; prevF = f;
      }
      // (viii) SHIMMER — sustained sub-pixel motion on settled text reads as "shaking glyphs":
      // slow camera scales and coarse rounding move text 0.05–1.5px EVERY frame with little net
      // travel. Flag any ≥1s span where ≥80% of steps are tiny but nonzero and net travel < 4px.
      {
        const winN = Math.max(4, Math.round(FPS / STRIDE));  // ~1s of samples
        const pts = [];
        for (let j = lo; j < hi; j++) { const v = series.rows[i][j]; pts.push(v ? [v[0], v[1]] : null); }
        let flagged = false;
        for (let s0 = 0; s0 + winN < pts.length && !flagged; s0 += Math.max(2, winN >> 1)) {
          let tiny = 0, total = 0;
          for (let j = s0 + 1; j <= s0 + winN; j++) {
            if (!pts[j] || !pts[j - 1]) { total = 0; break; }
            const d = Math.abs(pts[j][0] - pts[j - 1][0]) + Math.abs(pts[j][1] - pts[j - 1][1]);
            total++;
            if (d > 0.04 && d < 1.5) tiny++;
          }
          if (total >= winN - 1 && tiny / total >= 0.8) {
            const net = Math.abs(pts[s0 + winN][0] - pts[s0][0]) + Math.abs(pts[s0 + winN][1] - pts[s0][1]);
            if (net < 4) { add('WARN', 'viii:shimmer', w, k, `sub-pixel motion every frame ~${((F[lo + s0]) / FPS).toFixed(1)}s (slow camera scale or coarse rounding) — text shakes`); flagged = true; }
          }
        }
      }
      // (ii) reveal monotonicity — opacity must not visibly dip mid-scene
      if (maxDrop > 0.15) add('FAIL', 'ii:monotonic', w, k, `opacity drops ${maxDrop.toFixed(2)} at ${(dropAt / FPS).toFixed(2)}s (mid-scene fade)`);
      // (iv) count-up sanity — a counter must be monotone (up OR down: timers count down,
      // data-tracking values may dip legitimately → only flag when it reverses BOTH ways)
      if (new Set(nums).size >= 3) {
        const range = Math.max(...nums) - Math.min(...nums), eps = Math.max(range * 0.01, 0.001);
        let up = false, down = false, at = null;
        for (let j = 1; j < nums.length; j++) { if (nums[j] > nums[j - 1] + eps) up = true; if (nums[j] < nums[j - 1] - eps) { down = true; if (up) at = `${nums[j - 1]} → ${nums[j]}`; } }
        if (up && down && at) add('WARN', 'iv:countup', w, k, `counter reverses direction (${at}) — overshoot or wrong easing?`);
      }
      // (v) typewriter completes — text reaches its max length before the exit.
      // Only a MONOTONE-growing text is a typewriter; count-ups wobble in length ("999,999" → "1.2M").
      const endV = at(i, lastVisF);
      if (maxTl >= 8 && endV && maxTl - endV[3] > 0) {
        const grew = series.rows[i].slice(lo, hi).filter(Boolean).map((v) => v[3]);
        const monotone = grew.every((v, j) => j === 0 || v >= grew[j - 1]);
        if (monotone && grew.length > 2 && grew[grew.length - 1] < maxTl && grew[grew.length - 1] - grew[0] >= 8)
          add('FAIL', 'v:typing', w, k, `text ends at ${endV[3]}/${maxTl} chars before the exit`);
      }
      // (iii) settle before exit — steady over the last HOLDW s of the content window
      const sIdx0 = F.findIndex((f) => f >= w.visEnd - Math.round(HOLDW * FPS));
      if (sIdx0 >= 0) {
        let ok = true, why = '';
        let pv = null, pf = -1;
        for (let j = sIdx0; j < hi; j++) {
          const v = series.rows[i][j];
          if (!v) { pv = null; continue; }
          if (pv && pf === F[j - 1]) {
            if (Math.abs(v[0] - pv[0]) > 0.7 || Math.abs(v[1] - pv[1]) > 0.7) { ok = false; why = `still moving (Δ${Math.max(Math.abs(v[0] - pv[0]), Math.abs(v[1] - pv[1])).toFixed(1)}px/f)`; }
            else if (Math.abs(v[2] - pv[2]) > 0.02) { ok = false; why = `opacity still changing (Δ${Math.abs(v[2] - pv[2]).toFixed(3)}/f)`; }
            else if (v[3] !== pv[3]) { ok = false; why = 'text still changing'; }
            if (!ok) { add('FAIL', 'iii:settle', w, k, `${why} at ${(F[j] / FPS).toFixed(2)}s — payoff not settled ${HOLDW}s before exit`); break; }
          }
          pv = v; pf = F[j];
        }
      }
    });

    // (vi) frozen span — nothing tracked changes for >2s inside the content window
    const idx0 = F.findIndex((f) => f >= w.start), idx1 = F.findIndex((f) => f >= w.visEnd);
    const lo = idx0 < 0 ? F.length : idx0, hi = idx1 < 0 ? F.length : idx1;
    let lastChange = lo;
    for (let j = lo + 1; j < hi; j++) {
      let changed = false;
      for (let i = 0; i < K.length; i++) {
        if (!content[i]) continue;
        const a = series.rows[i][j - 1], b = series.rows[i][j];
        if (!!a !== !!b) { changed = true; break; }
        if (a && b && (Math.abs(a[0] - b[0]) > 0.3 || Math.abs(a[1] - b[1]) > 0.3 || Math.abs(a[2] - b[2]) > 0.005 || a[3] !== b[3] || a[5] !== b[5])) { changed = true; break; }
      }
      if (changed) lastChange = j;
      // A flat 2s misses the whole short-film end of the library, and "how long is too long to be still"
      // is a fraction of the runtime, not an absolute. `cadence` held a perfectly frozen frame for 0.9s
      // out of 5s — a fifth of the film — and sat under this threshold while `beat-check` called the
      // span covered because the layers were still present. A short dead tail fell between the two
      // gates, and only a person watching found it (docs/MISTAKES.md #196, #200).
      else if (F[j] - F[lastChange] > Math.min(2, Math.max(0.6, TOTAL_SEC * 0.15)) * FPS) { add('WARN', 'vi:frozen', w, '', `nothing moves ${(F[lastChange] / FPS).toFixed(1)}s → ${(F[j] / FPS).toFixed(1)}s (${((F[j] - F[lastChange]) / FPS / TOTAL_SEC * 100).toFixed(0)}% of a ${TOTAL_SEC.toFixed(1)}s film)`); lastChange = j; }
    }
  }

  // global final frame (whole video must not end faded)
  let gMax = 0, gAny = false;
  K.forEach((k, i) => { if (!content[i]) return; const v = series.rows[i][F.length - 1]; if (v) { gAny = true; gMax = Math.max(gMax, v[2]); } });
  if (gAny && gMax < 0.9) findings.unshift({ level: 'FAIL', check: 'i:final-hold', seg: '(video)', key: '', msg: `final frame max content opacity ${gMax.toFixed(2)} < 0.9 — the video ends faded out` });

  // (ix) rhythm monotony — timing is a voice, not a constant (MOTION-CRAFT rule 1)
  if (ENTRIES.length >= 8) {
    const buckets = {};
    for (const e of ENTRIES) { const bk = (Math.round(e / 0.1) * 0.1).toFixed(1); buckets[bk] = (buckets[bk] || 0) + 1; }
    const top = Object.entries(buckets).sort((x, y) => y[1] - x[1])[0];
    if (top[1] / ENTRIES.length > 0.8) findings.push({ level: 'WARN', check: 'ix:rhythm', seg: '(video)', key: '', msg: top[1] + '/' + ENTRIES.length + ' entrances land in the same ~' + top[0] + 's bucket — uniform rhythm reads monotone; vary enterDur/stagger per beat' });
  }

  // (x) preset monotony — one entrance device for the whole film = the "all text just rises" failure.
  // Static read of the data (the preset isn't visible in frames). MOTION-CRAFT: one device per scene role.
  const presets = (data.layers || []).filter((L) => L.split).map((L) => L.preset || 'up');
  if (presets.length >= 5) {
    const cnt = {}; for (const p of presets) cnt[p] = (cnt[p] || 0) + 1;
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    if (top[1] / presets.length > 0.7) findings.push({ level: 'WARN', check: 'x:preset', seg: '(video)', key: '', msg: top[1] + '/' + presets.length + ' kinetic text layers use preset "' + top[0] + '" — vary the entrance device per scene (decode/riseClip/tilt/stretch/…), not one global reveal' });
  }

  return { format, data: dataName, total, segments: windows.length, findings };
}

const results = [];
for (const f of formats) {
  try { results.push(await audit(f)); }
  catch (e) { results.push({ format: f, error: String(e && e.message || e), findings: [] }); }
}
await browser.close(); server.close();

if (JSON_OUT) { console.log(JSON.stringify(results, null, 2)); }
else {
  console.log('==================== MOTION AUDIT ====================');
  for (const r of results) {
    if (r.error) { console.log(`✗ err  ${r.format} — ${r.error}`); continue; }
    const fails = r.findings.filter((x) => x.level === 'FAIL'), warns = r.findings.filter((x) => x.level === 'WARN');
    // name the data file audited: `make motion D=...` used to drop D and silently audit sample.json,
    // and the report gave no way to tell which scene you were reading (MISTAKES #47).
    console.log(`${fails.length ? '✗ FAIL' : warns.length ? '~ warn' : '✓ ok  '}  ${r.format} · ${r.data}  (${r.total} frames · ${r.segments} segments · ${fails.length} fail · ${warns.length} warn)`);
    const show = [...fails, ...warns];
    for (const x of show.slice(0, 30)) console.log(`    [${x.level === 'FAIL' ? x.check : x.check + ' · warn'}] ${x.seg || ''}${x.key ? ' "' + x.key + '"' : ''} — ${x.msg}`);
    if (show.length > 30) console.log(`    … +${show.length - 30} more`);
  }
}
const failed = results.some((r) => r.error || r.findings.some((x) => x.level === 'FAIL'));
console.log(failed ? '\n✗ motion audit found hard failures' : '\n✓ motion contract holds across all checked formats');
process.exit(failed ? 1 : 0);
