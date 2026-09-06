// scripts/dev/previews.mjs: one rendered preview per beat blueprint, so an author picks a finished part
// by SEEING it (another engine' registry carries a preview per item; its frame presets ship a rendered
// showcase sheet). Companion to `make blueprints`, which lists beats but shows nothing.
//
// For every registered beat (blueprints/index.mjs BEATS, whatever `make blueprints` lists at run time),
// this builds a minimal ~4s scene that uses just that beat with real-looking placeholder copy, expands
// it, draft-renders it, and writes:
//   site/public/blocklib/beats/<id>/{preview.mp4, poster.png, sheet.png}
//   site/public/blocklib/beats/index.json   (id, blurb, role, duration, dims, files)
//
//   node scripts/dev/previews.mjs [--only=<id>]   ·   make previews [ONLY=<id>]
//
// Renders are DRAFT, 2 workers, one beat at a time: this repo's renderer is CPU-heavy and other agents
// render concurrently, so a previews run must stay small per scene rather than fast in aggregate.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BEATS, BEAT_BLURBS } from '../../blueprints/index.mjs';
import { frameTile, tileGrid, tileBox, renderOf } from '../gates/tile.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRATCH = path.join(ROOT, 'formats/scene/_batch/previews'); // _batch/ is already gitignored whole
const OUT_DIR = path.join(ROOT, 'site/public/blocklib/beats');

// Real-looking placeholder content per beat, never "lorem". Short, plausible words a real product
// might ship. Coordinates/dur left at each factory's own default except where the default runs well
// past a ~4s preview (cardCascade, chipGrid, kineticHook, logoLockup, logoReveal, screenDive,
// slotSwap, terminalReveal, verdictProof), which are pulled in to a duration checked against that
// beat's own internal timing budget (several factories throw if a track cannot fit inside `dur`).
const CONTENT = {
  kineticHook: { eyebrow: 'How fast do teams ship now?', to: 94, unit: '%', sub: 'of teams ship weekly.', dur: 3.6 },
  statReveal: { to: 12, unit: 'x', label: 'faster than last quarter' },
  cardCascade: { title: 'Built for every team', dur: 3.6, cards: [
    { name: 'Plan', desc: 'Map the work before it starts.', detail: '$ plan run' },
    { name: 'Ship', desc: 'Ship in small, safe steps.', detail: '$ ship deploy' },
    { name: 'Learn', desc: 'See what worked, fast.', detail: '$ learn report' },
  ] },
  chipGrid: { title: 'Works with your stack', dur: 3.6, chips: ['GitHub', 'Slack', 'Linear', 'Figma', 'Notion', 'Jira'], footer: 'and 40 more' },
  terminalReveal: { title: 'One command to ship', dur: 4.6, command: 'npm run deploy', output: ['Live at preview.app'], result: 'Deployed in 4.2s' },
  screenDive: { title: 'See it in action', dur: 3.6, image: 'assets/cutouts/bulb.png', caption: 'Your dashboard, live' },
  logoLockup: { markX: 690, markY: 300, markW: 150, mark: 'assets/cutouts/bulb.png', headline: 'Built for builders', sub: 'Ship with confidence', dur: 3.4 },
  logoReveal: { mark: 'M50 5 L95 95 L5 95 Z', wordmark: 'Nimbus', sub: 'cloud, simplified', dur: 3.4 },
  verdictProof: { title: 'Does it hold under load?', dur: 3.8, command: 'loadtest --rps 5000', note: 'p99 latency 42ms', verdict: 'HOLDS', tone: 'ok' },
  ctaEnd: { mark: 'assets/cutouts/bulb.png', command: 'npx create-app', sub: 'Ready in under a minute', url: 'example.com/start' },
  typedHook: { text: 'Ship faster. Worry less.' },
  // The ten beats mined from studied references (blueprints/beats-mined.mjs). Figures are the
  // engine's own, read from the registry, so a preview never advertises a number the product lacks.
  blurResolveHook: { text: 'Ship the whole film', sub: 'from one file', dur: 2.4 },
  dialogueAccumulate: { dur: 5.5, bloomLine: 'One file does it all.', pairs: [
    { sans: 'Write', serif: 'a scene.' }, { sans: 'Render', serif: 'a film.' }, { sans: 'Ship', serif: 'it.' },
  ] },
  containerFill: { dur: 4.5, items: ['24 layer types', '703 effects', '56 families', '29 blueprints', '5 canvases'] },
  cardFan: { dur: 3.5, cards: [
    { title: 'Plan', detail: '$ plan run' }, { title: 'Ship', detail: '$ ship deploy' }, { title: 'Learn', detail: '$ learn report' },
  ] },
  listBuildRows: { dur: 5, items: ['text', 'image', 'video', 'html', 'svg'] },
  chipConverge: { dur: 2.6, chips: ['cuts', 'seams', 'stings', 'camera', 'captions', 'audio'] },
  cellMosaic: { dur: 3.5, cells: [
    { text: 'Plan' }, { text: 'Write' }, { text: 'Render' }, { text: 'Ship' },
    { text: 'Judge' }, { text: 'Ledger' }, { text: 'Post' }, { text: 'Repeat' },
  ] },
  wordWipe: { word: 'SHIP', revealText: 'One JSON in.', subText: 'One film out.', dur: 1.8 },
  wordmarkAssemble: { wordmark: 'vawe', dur: 3.2, tiles: ['assets/cutouts/bulb.png', 'assets/cutouts/bulb.png', 'assets/cutouts/bulb.png'] },
  viewportTrio: { image: 'assets/cutouts/bulb.png', caption: 'One scene, three viewports', dur: 3.4 },
  morphButton: { label: 'GENERATE' },
  propSentence: { items: [{ word: 'Ship' }, { chip: '$ deploy' }, { word: 'in' }, { chip: '4.2s' }, { word: 'flat.' }] },
  slotSwap: { dur: 3.6, passes: [
    { label: 'Users', payload: { to: 12000, unit: '+' } },
    { label: 'Teams', payload: { word: '420' } },
    { label: 'Uptime', payload: { chip: '99.99%' } },
  ] },
  recordedPan: { w: 2400, html: '<div style="width:2400px;height:1080px;background:linear-gradient(90deg,#1c2333,#2a3350,#1c2333);display:flex;align-items:center;padding:0 80px;color:#fff;font:700 48px sans-serif">Dashboard preview, scrolled by the beat</div>' },
  echoRing: { dur: 1.2 },
  scrollStory: { dur: 3.6, sections: [900, 900, 900], html: '<div style="width:1920px;height:2700px;background:linear-gradient(180deg,#1c2333,#2a3350,#1c2333);display:flex;flex-direction:column;color:#fff;font:700 44px sans-serif"><div style="height:900px;padding:60px">Section one</div><div style="height:900px;padding:60px">Section two</div><div style="height:900px;padding:60px">Section three</div></div>' },
  focusRack: { sharp: { type: 'text', text: 'In focus', x: 560, y: 420, w: 800, size: 64, weight: 700, color: 'var(--ink)' },
    soft: { type: 'text', text: 'Out of focus', x: 560, y: 620, w: 800, size: 64, weight: 700, color: 'var(--ink)' } },
  wordBlast: { text: 'Faster.' },
};

const missing = Object.keys(BEATS).filter((n) => !CONTENT[n]);
if (missing.length) {
  console.error(`! previews.mjs has no placeholder content for: ${missing.join(', ')}. Add an entry to CONTENT before running.`);
  process.exit(2);
}

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length) : (process.env.ONLY || '');
const ids = only ? only.split(',').map((s) => s.trim()).filter(Boolean) : Object.keys(BEATS);

fs.mkdirSync(SCRATCH, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

function sceneFor(id) {
  const { dur = 3.6, ...content } = CONTENT[id];
  const start = 0.2;
  const duration = +(start + dur + 0.3).toFixed(2);
  return {
    module: 'scene',
    theme: 'default',
    aspect: '16:9',
    duration,
    bg: [{ t: 0, preset: 'soft' }],
    audio: { silent: true, _why: 'preview' },
    layers: [{ type: 'beat', beat: id, start, dur, ...content }],
  };
}

// role: the clause before the first ":" in the registry blurb ("hook / open loop: eyebrow + ...").
// Beats whose blurb has no colon (a plain sentence) carry no distinct role; omitted rather than guessed.
function roleOf(blurb) {
  const i = blurb.indexOf(':');
  return i > 0 && i < 40 ? blurb.slice(0, i) : undefined;
}

const results = [];
for (const id of ids) {
  const scenePath = path.join(SCRATCH, `${id}.json`);
  const expandedPath = path.join(SCRATCH, `${id}.expanded.json`);
  const destDir = path.join(OUT_DIR, id);
  try {
    fs.writeFileSync(scenePath, JSON.stringify(sceneFor(id), null, 1));
    // validate.mjs does not know the {type:"beat"} sugar (that is expand-blocks' job), so it is run on
    // the EXPANDED scene, the same order `make video` uses.
    execFileSync('node', ['scripts/author/expand-blocks.mjs', scenePath, expandedPath], { cwd: ROOT, stdio: 'pipe' });
    execFileSync('node', ['core/validate.mjs', expandedPath], { cwd: ROOT, stdio: 'pipe' });
    execFileSync('./bin/vawe', [expandedPath, '--draft', '--workers', '2'], { cwd: ROOT, stdio: 'pipe' });

    const mp4 = path.join(ROOT, renderOf(expandedPath)); // out/<id>.mp4 -> renderOf strips .expanded
    if (!fs.existsSync(mp4)) throw new Error(`renderer reported success but ${mp4} is missing`);

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(mp4, path.join(destDir, 'preview.mp4'));

    const box = tileBox(true); // 16:9 everywhere here
    const mid = duration(scenePath) / 2;
    frameTile(mp4, mid, path.join(destDir, 'poster.png'), { ...box, tw: 960, th: 540 });
    const tiles = [0.05, mid, duration(scenePath) - 0.15].map((t, i) =>
      frameTile(mp4, Math.max(0, t), path.join(SCRATCH, `${id}.tile${i}.png`), box));
    tileGrid(tiles, { ...box, cols: 3, out: path.join(destDir, 'sheet.png') });

    results.push({ id, ok: true, duration: sceneFor(id).duration, dims: { w: 1920, h: 1080 },
      blurb: BEAT_BLURBS[id], role: roleOf(BEAT_BLURBS[id]),
      files: { preview: `beats/${id}/preview.mp4`, poster: `beats/${id}/poster.png`, sheet: `beats/${id}/sheet.png` } });
    console.log(`✓ ${id}`);
  } catch (e) {
    const msg = (e.stderr ? e.stderr.toString() : e.message || String(e)).trim().split('\n').slice(-6).join('\n');
    results.push({ id, ok: false, error: msg });
    console.error(`✗ ${id}\n${msg}`);
  }
}

function duration(scenePath) {
  return JSON.parse(fs.readFileSync(scenePath, 'utf8')).duration;
}

// Merge into the existing index rather than clobber it, so `--only=<id>` updates one entry without
// wiping every other beat's previously rendered preview out of the manifest.
const indexPath = path.join(OUT_DIR, 'index.json');
const prior = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')).beats || [] : [];
const byId = new Map(prior.map((b) => [b.id, b]));
for (const r of results) if (r.ok) { const { ok, ...entry } = r; byId.set(r.id, entry); }
fs.writeFileSync(indexPath, JSON.stringify({ beats: [...byId.values()] }, null, 1) + '\n');

const ok = results.filter((r) => r.ok).length;
console.log(`\npreviews: ${ok}/${results.length} rendered → ${path.relative(ROOT, indexPath)}`);
for (const r of results) if (!r.ok) console.log(`  ✗ ${r.id}: ${r.error.split('\n')[0]}`);
process.exit(results.some((r) => !r.ok) ? 1 : 0);
