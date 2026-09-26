// harness/dev/probe-frame.mjs: answer "where is layer X at time T, and why can't I see it" in ONE
// command, without a throwaway puppeteer script.
//
// This replaces five one-off scripts written in a single session to answer exactly this question.
// Boots the scene the way every other author-side tool does (harness/lib/render-harness.mjs), seeks
// to the frame with the pure renderFrame(n), then reads back everything a human would otherwise open
// devtools for: authored vs resolved timing, transform, opacity, bounding box, and (the part devtools
// does not answer in one step) WHAT COVERS the layer's centre and corners, by name.
//
// TIME. `T` is film time as the VIEWER sees it: post-tempo, the same clock `--from`/`--to` use
// (cmd/render/main.go, internal/scene/scene.go Capture: "fromSec/toSec ... in final (post-tempo) film
// seconds"). The PAGE this tool boots is served the scene's RAW JSON (same as every other harness/dev
// tool, harness/lib/render-harness.mjs bootPathFor only expands block/beat/comp sugar, never tempo),
// so it runs on AUTHORED, pre-tempo time: core/engine/tempo.js resolves tempo once, at expandScene,
// which cmd/render/main.go runs before a real render but this tool never does. resolveTempo scales
// every authored time by 1/tempo to produce the post-tempo (viewer) time, so the inverse holds:
//   pageTime = viewerTime * tempo
// (tempo absent, or 1, is a no-op). Both times are printed so a mismatch is visible rather than silent.
//
//   node harness/dev/probe-frame.mjs films/scene/x.json --t 12.9 --id card-a,card-b --json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, waitForEngine, bootPathFor, REPO_ROOT } from '../lib/render-harness.mjs';
import { sceneDims } from '../../core/layout/safe.js';
import { sourceTime } from '../../core/layers/video.js';
import { expandScene } from '../../core/engine/expand.js';

const argv = process.argv.slice(2);
const file = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const asJson = argv.includes('--json');
const tArg = flag('--t', null);
const idArg = flag('--id', null);

if (!file || tArg == null || !idArg) {
  console.error('usage: probe-frame.mjs <scene.json> --t <seconds> --id <layerId>[,<id>...] [--json]');
  process.exit(1);
}
const viewerT = Number(tArg);
const ids = idArg.split(',').map((s) => s.trim()).filter(Boolean);
if (!Number.isFinite(viewerT)) { console.error(`--t "${tArg}" is not a number`); process.exit(1); }

const abs = path.resolve(file);
const raw = fs.readFileSync(abs, 'utf8');
const data = JSON.parse(raw);
const rel = path.relative(REPO_ROOT, abs);
const module = data.module;
if (!module) { console.error(`${file}: no "module" field`); process.exit(1); }

const tempo = typeof data.tempo === 'number' ? data.tempo : 1;
const pageT = viewerT * tempo;

// The scene the PAGE actually sees. `block`/`beat`/`comp` sugar (SUGAR_RE, harness/lib/render-harness.mjs)
// rewrites a layer's `start` from a beat-relative number to its true absolute one; a layer's raw JSON
// entry can therefore say `start: 0` while it is live from 10s onward. Expanding here, same as
// bootPathFor does for the boot URL, means "authored" below means what boot.js actually built from,
// not a number this scene never runs on.
// tempo is deliberately dropped before expanding: the PAGE never resolves it (bootPathFor only expands
// sugar, never tempo), so an "authored" number here must stay in the page's own pre-tempo clock too.
const cloneForExpand = structuredClone(data);
delete cloneForExpand.tempo;
const expanded = expandScene(cloneForExpand);

// Find a layer by id anywhere in the tree (top-level or a group child at any depth), for the AUTHORED
// fields (type, start, duration, video in/rate/out) the DOM dataset does not carry verbatim once a
// beat wrapper has stretched data-duration (films/scene/scene.js setLayerTiming, data-authoredDuration).
function findLayer(id, layers) {
  for (const L of layers || []) {
    if (!L || typeof L !== 'object') continue;
    if (L.id === id) return L;
    const found = findLayer(id, L.children);
    if (found) return found;
  }
  return null;
}

// Runs IN THE PAGE. Everything about one layer at the current frame: authored-vs-resolved timing,
// transform, opacity, box, and (the part devtools makes you do by hand) what covers its centre and
// four inset corners, by name.
/* eslint-disable no-undef */
function inspectLayer(id) {
  const el = document.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (!el) return null;

  // top-level `layers[]` index for the "drawn later" line: the closest data-idx ancestor, itself
  // included (a group child inherits its container's paint order).
  const topIdxOf = (e) => { const a = e.closest('[data-idx]'); return a ? Number(a.dataset.idx) : null; };
  // human label for whatever elementsFromPoint hands back: prefer the author's own id, else the
  // top-level array index, else raw tag+class so nothing is silently dropped.
  const describe = (e) => {
    const named = e.closest('[data-id]');
    if (named) return named.dataset.id;
    const idx = topIdxOf(e);
    return idx != null ? `layers[${idx}]` : `<${e.tagName.toLowerCase()}${e.className ? '.' + String(e.className).split(' ')[0] : ''}>`;
  };

  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  let opacity = 1;
  for (let a = el; a && a !== document.documentElement; a = a.parentElement) opacity *= parseFloat(getComputedStyle(a).opacity || '1');

  const inset = 4; // px inward from each corner, so the sample point lands on the layer, not its edge
  const points = [
    { name: 'centre', x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    { name: 'top-left', x: rect.left + inset, y: rect.top + inset },
    { name: 'top-right', x: rect.right - inset, y: rect.top + inset },
    { name: 'bottom-left', x: rect.left + inset, y: rect.bottom - inset },
    { name: 'bottom-right', x: rect.right - inset, y: rect.bottom - inset },
  ];
  const myIdx = topIdxOf(el);
  const covers = points.map((pt) => {
    if (pt.x < 0 || pt.y < 0 || pt.x > innerWidth || pt.y > innerHeight) return { at: pt.name, note: 'outside viewport' };
    const stack = document.elementsFromPoint(pt.x, pt.y);
    const selfIdx = stack.findIndex((e) => e === el || el.contains(e));
    if (selfIdx === -1) return { at: pt.name, note: 'layer not in hit-test stack here (fully covered or transparent to hit-testing)' };
    if (selfIdx === 0) return { at: pt.name, note: 'nothing above it' };
    const coverer = stack[0], coverIdx = topIdxOf(coverer);
    const order = coverIdx == null || myIdx == null ? ''
      : coverIdx > myIdx ? ' (drawn later in layers[])'
      : coverIdx < myIdx ? ' (drawn earlier in layers[], stacked above by z-index/transform)'
      : ' (same layers[] entry, a sibling group child)';
    return { at: pt.name, coveredBy: describe(coverer) + order };
  });

  const video = el.querySelector('video');
  return {
    dataStart: Number(el.dataset.start ?? 0),
    dataDuration: el.dataset.duration != null ? Number(el.dataset.duration) : null,
    dataAuthoredDuration: el.dataset.authoredDuration ?? null,
    styleTransform: el.style.transform || 'none', computedTransform: cs.transform,
    effectiveOpacity: opacity, ownOpacity: cs.opacity, filter: cs.filter,
    display: cs.display, visibility: cs.visibility,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    videoCurrentTime: video ? video.currentTime : null,
    covers,
  };
}
/* eslint-enable no-undef */

// One id's full row: the authored JSON fields, the DOM read (inspectLayer, run inside the page), and
// the derived live-at-T / clip-window / video-source-time fields that need both sides at once.
function buildRow(id, authoredLayer, dom, pageT) {
  const row = { id, authored: authoredLayer ? { type: authoredLayer.type, start: authoredLayer.start ?? 0, duration: authoredLayer.duration ?? null } : null, dom };
  if (!authoredLayer) row.warning = 'no layer with this id in the scene JSON (checked top-level and every group child)';
  if (!dom) row.warning = (row.warning ? row.warning + '; ' : '') + 'no [data-id] element in the DOM at this frame (did the scene ever build this layer?)';
  if (dom && authoredLayer) {
    const clipStart = dom.dataStart, clipEnd = clipStart + (dom.dataDuration ?? Infinity);
    row.liveAtT = pageT >= clipStart && pageT < clipEnd;
    row.clipWindow = [clipStart, dom.dataDuration == null ? null : clipEnd];
    // A group child's `start` in the JSON is relative to its own group (addGroupChild computes the
    // absolute cStart live in the DOM builder, never writing it back); sourceTime needs the RESOLVED
    // absolute start, which is exactly what the DOM's data-start already carries, so use that instead
    // of the authored field.
    if (authoredLayer.type === 'video') row.videoSourceTimeWanted = sourceTime({ ...authoredLayer, start: dom.dataStart }, pageT);
  }
  return row;
}

async function main() {
  const [vw, vh] = sceneDims(data);
  const { server, port } = await serveRepo({});
  const { browser, page } = await launchPage({ width: vw, height: vh });
  const report = { viewerT, tempo, pageT, module, samples: {} };
  try {
    const bootRel = bootPathFor(REPO_ROOT, raw, data, rel);
    await page.goto(`http://127.0.0.1:${port}/films/${module}/scene.html?data=/${bootRel}&fps=30`, { waitUntil: 'load' });
    const err = await waitForEngine(page, { throwOnTimeout: false });
    if (err) throw new Error(`scene did not load: ${err}`);
    const meta = await page.evaluate(() => window.__engine.meta);
    report.fps = meta.fps;
    // `meta.beatSync` carries bindBeats' own resolved-times line (core/beats/index.js describeBind),
    // produced at boot but never read past this point until now: the render process cannot hear the
    // page's console.log (engine-doctrine/MISTAKES.md #477), so this was the one line an author had no
    // way to see outside a real render.
    if (meta.beatSync) report.beatSync = meta.beatSync;
    if (pageT > meta.duration + 1e-6) {
      console.error(`--t ${viewerT}s (page time ${pageT.toFixed(3)}s) is past this film's authored duration (${meta.duration.toFixed(3)}s)`);
      process.exit(1);
    }
    const frame = Math.min(meta.totalFrames - 1, Math.max(0, Math.round(pageT * meta.fps)));
    report.frame = frame;
    await page.evaluate((n) => window.__engine.renderFrame(n), frame);
    // The same async barrier the real capture drains before it shoots (core/layers/frame-settle.js):
    // a video layer's seek is asynchronous, so reading currentTime one tick early would show whatever
    // the PREVIOUS frame left behind.
    await page.evaluate(() => (window.__frameSettle ? window.__frameSettle() : true));

    report.camera = await page.evaluate(() => {
      const cam = document.getElementById('cam');
      if (!cam) return null;
      const cs = getComputedStyle(cam);
      return { styleTransform: cam.style.transform || 'none', computedTransform: cs.transform, perspective: cs.perspective };
    });

    for (const id of ids) {
      const authoredLayer = findLayer(id, expanded.layers);
      const dom = await page.evaluate(inspectLayer, id);
      report.samples[id] = buildRow(id, authoredLayer, dom, pageT);
    }
  } finally {
    await browser.close();
    server.close();
  }
  return report;
}

function printText(r) {
  console.log(`viewer T=${r.viewerT}s  tempo=${r.tempo}  page T=${r.pageT.toFixed(3)}s (authored clock)  frame ${r.frame} @ ${r.fps}fps`);
  if (r.beatSync) console.log(r.beatSync);
  if (r.camera) console.log(`camera: style="${r.camera.styleTransform}"  computed="${r.camera.computedTransform}"`);
  for (const [id, row] of Object.entries(r.samples)) {
    console.log(`\n-- ${id} --`);
    if (row.warning) console.log(`  WARNING: ${row.warning}`);
    if (row.authored) console.log(`  authored: type=${row.authored.type} start=${row.authored.start} duration=${row.authored.duration}`);
    const d = row.dom;
    if (!d) continue;
    console.log(`  clip window (resolved): [${row.clipWindow[0]}, ${row.clipWindow[1] ?? '∞'}]  live at T: ${row.liveAtT}`);
    if (d.dataAuthoredDuration != null) console.log(`  data-authoredDuration (pre-stretch): ${d.dataAuthoredDuration}`);
    console.log(`  transform: style="${d.styleTransform}"  computed="${d.computedTransform}"`);
    console.log(`  opacity: own=${d.ownOpacity} effective(×ancestors)=${d.effectiveOpacity.toFixed(4)}  filter="${d.filter}"  display=${d.display} visibility=${d.visibility}`);
    console.log(`  box: x=${d.rect.x.toFixed(1)} y=${d.rect.y.toFixed(1)} w=${d.rect.width.toFixed(1)} h=${d.rect.height.toFixed(1)}`);
    if (d.videoCurrentTime != null) console.log(`  video: currentTime=${d.videoCurrentTime}  source time wanted=${row.videoSourceTimeWanted}`);
    for (const c of d.covers) {
      console.log(`  [${c.at}] ${c.coveredBy ? `covered by ${c.coveredBy}` : c.note}`);
    }
  }
}

const r = await main();
if (asJson) console.log(JSON.stringify(r, null, 2));
else printText(r);
