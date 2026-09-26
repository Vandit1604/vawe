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

const cloneForExpand = structuredClone(data);
delete cloneForExpand.tempo;
const expanded = expandScene(cloneForExpand);

function findLayer(id, layers) {
  for (const L of layers || []) {
    if (!L || typeof L !== 'object') continue;
    if (L.id === id) return L;
    const found = findLayer(id, L.children);
    if (found) return found;
  }
  return null;
}

function inspectLayer(id) {
  const el = document.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (!el) return null;

  const topIdxOf = (e) => { const a = e.closest('[data-idx]'); return a ? Number(a.dataset.idx) : null; };
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

function buildRow(id, authoredLayer, dom, pageT) {
  // `parts` here is the EXPANDED value (core/engine/expand.js already ran, above): an `html` layer
  // authored with data-part-* attributes and no `parts` array shows its lowered spec here, same as a
  // hand-written one would, so the lowering is checkable without opening devtools.
  const row = { id, authored: authoredLayer ? { type: authoredLayer.type, start: authoredLayer.start ?? 0, duration: authoredLayer.duration ?? null, parts: authoredLayer.parts ?? null } : null, dom };
  if (!authoredLayer) row.warning = 'no layer with this id in the scene JSON (checked top-level and every group child)';
  if (!dom) row.warning = (row.warning ? row.warning + '; ' : '') + 'no [data-id] element in the DOM at this frame (did the scene ever build this layer?)';
  if (dom && authoredLayer) {
    const clipStart = dom.dataStart, clipEnd = clipStart + (dom.dataDuration ?? Infinity);
    row.liveAtT = pageT >= clipStart && pageT < clipEnd;
    row.clipWindow = [clipStart, dom.dataDuration == null ? null : clipEnd];
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
    if (row.authored?.parts) console.log(`  parts (resolved): ${JSON.stringify(row.authored.parts)}`);
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
