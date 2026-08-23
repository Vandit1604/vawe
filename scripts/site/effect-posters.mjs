// scripts/site/effect-posters.mjs · one still per previewable effect on /showcase/effects, shot
// MID-MOTION, so the index shows what an effect does before anyone clicks it.
//
//   node scripts/site/effect-posters.mjs [--only <substring>]
//
// Reads site/lib/effects.json (written by scripts/site/effects-json.mjs) for the list of
// previewable effects and the real scene each one already has at
// site/public/assets/effects/<stem>.json. Writes site/public/assets/effects/<stem>.jpg beside it.
// Output path is fixed and not configurable: the page derives the poster path by swapping the
// scene's extension, so a stem here must match a stem there exactly.
//
// THE FRAME-CHOICE RULE. A settled still of 227 effects is 227 photographs of the same word
// "Deterministic" sitting still (or the same two-line cut card, or the same plain shader field at
// frame 0): a worse page than no page (the same failure scripts/site/type-specimens.mjs solves for
// /type). So every still is taken PARTWAY THROUGH the thing it is showing, never at rest and never
// at the very first frame. Two shapes of effect need two different reads of "partway":
//
//   ENTRANCE effects (a kinetic-text preset, an enter/exit anim, a GSAP named effect) arrive once
//   and settle. The default is 45% of the way through the layer's own entrance, the same fraction
//   type-specimens.mjs uses for the same reason: early enough to show arrival, late enough to read.
//
//   JUNCTION and FIELD effects have no entrance to be partway through, so the default above would
//   photograph the wrong thing (a cut's `t` is a point in time, not a ramp; a paint/shader/3D field
//   is already full-frame from t=0 and only grows more textured). These get a FAMILY override:
//   just after the cut/sting/seam fires, or the middle of the scene for a continuous field. See
//   FAMILY_POSTER below: one override per family that needs it, not per effect.
//
// If the chosen frame turns out EMPTY (pixel-identical to frame 0, the same failure mode
// type-specimens.mjs guards against: a layer that renders nothing looks like a deliberate blank
// still and ships silently), the effect is retried at a few other times before it is reported as a
// genuine miss. No poster ships for an effect that stayed blank at every time tried.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EFFECTS_JSON = path.join(repoRoot, 'site/lib/effects.json');
const SCENES_DIR = path.join(repoRoot, 'site/public/assets/effects');

const onlyIdx = process.argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

// ── which frame, per family ────────────────────────────────────────────────────────────────────
const mid = (scene) => scene.duration / 2;

const FAMILY_POSTER = {
  // Continuous, per-frame fields with no entrance to be partway through: a paint field, an ambient
  // shader, a 3D scene, a beam loop, a background preset, an idle hold. Any point mid-scene shows
  // the motion settled into its pattern; frame 0 still looks like the plain backdrop it grew from.
  'idles-ambient-hold-motion': mid,
  backgrounds: mid,
  'generative-paint-fx-per-frame': mid,
  'per-frame-accent-layers': mid,
  'three-js-scenes-real-geometry': mid,
  'raymarched-surfaces': mid,
  'ambient-shader-fields': mid,

  // The junction IS the effect. Shoot just after it fires, not somewhere inside either scene's own
  // entrance (which would show the wrong device entirely).
  'scene-cuts': (scene) => scene.cuts[0].t + 0.25,
  'shader-stings': (scene) => scene.stings[0].t + 0.25,
  'seams-2-scene-blends': (scene) => scene.seams[0].t + scene.seams[0].dur / 2,

  // The effect on show here is the EXIT (`fxOut`), not the plain `rise` entrance ahead of it. The
  // scene's own `exitDur` prop (1s here) is NOT the ramp fxOut actually plays: every EXITS entry in
  // core/gsap-effects.js carries its own short tween (0.45-0.6s, `.in`-eased so most of the visible
  // motion crams into its last third) anchored to the layer's own end, independent of `exitDur`.
  // Confirmed by rendering candidate frames across five exits (blurOut/dropOut/spinOut/collapseOut/
  // fadeOut): the layer is still fully settled half a second before its end and fully gone a
  // hundredth of a second before it; 0.05s before the end reliably lands mid-flight (faded, moved
  // or rotated, still legible) for all five.
  'gsap-exits': (scene) => {
    const l = scene.layers[0];
    return l.start + l.duration - 0.05;
  },
};

// Default: 45% into the layer's own entrance. `enterDur` names it directly; `each` is the
// per-unit duration a split preset reads (every preview here is one word, so it collapses to one
// unit and needs no stagger term); 0.6 is the median GSAP named-effect duration in
// core/gsap-effects.js, used only when neither prop is set at all.
function defaultPoster(scene) {
  const layer = scene.layers.find((l) => l.type === 'text') ?? scene.layers[0];
  const start = layer.start ?? 0;
  const dur = layer.duration ?? (scene.duration - start);
  const entrance = layer.enterDur ?? layer.each ?? 0.6;
  return start + 0.45 * entrance;
}

// Retry order when the primary time comes back blank: the scene's own middle and quarters, then a
// fixed early point. Not per-family, a blank is the engine doing something wrong, not a taste call.
function candidatesFor(scene, primary) {
  const d = scene.duration;
  const clamp = (t) => Math.round(Math.max(0.05, Math.min(t, d - 0.05)) * 1000) / 1000;
  return [...new Set([primary, d * 0.5, d * 0.75, d * 0.25, 0.6].map(clamp))];
}

// ── collect targets ─────────────────────────────────────────────────────────────────────────────
const effects = JSON.parse(fs.readFileSync(EFFECTS_JSON, 'utf8'));
// allTargets is every previewable effect, unfiltered. It defines what "current" means for the
// stale sweep below. targets is what THIS run shoots. --only must narrow the second without the
// first, or reshooting one family would delete every other family's poster as "no longer wanted".
const allTargets = [];
for (const family of effects.list) {
  for (const entry of family.entries) {
    if (!entry.scene) continue;
    const stem = entry.scene.replace(/^\/assets\/effects\//, '').replace(/\.json$/, '');
    allTargets.push({ familyId: family.id, stem });
  }
}
const targets = ONLY ? allTargets.filter((t) => t.stem.includes(ONLY) || t.familyId.includes(ONLY)) : allTargets;
if (!targets.length) {
  console.error(ONLY ? `no previewable effect matches --only ${ONLY}` : 'no previewable effects found in site/lib/effects.json');
  process.exit(1);
}

// ── static server + browser, same shape as scripts/site/type-specimens.mjs ────────────────────────
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = await new Promise((r) => {
  const s = http.createServer((req, res) => {
    const p = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
    if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  s.listen(0, '127.0.0.1', () => r(s));
});
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
// A card on the page is ~400px wide. 1920x1080 native canvas at a third scale is 640x360, already
// ~1.6x that card, so a full-size capture (960x540+) would only be extra bytes for 227 files.
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 / 3 });

let shot = 0, failed = 0;
const failures = [];
for (const { familyId, stem } of targets) {
  const scenePath = path.join(SCENES_DIR, `${stem}.json`);
  const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
  const rule = FAMILY_POSTER[familyId] ?? defaultPoster;
  const candidates = candidatesFor(scene, rule(scene));

  await page.goto(`http://127.0.0.1:${port}/formats/scene/scene.html?data=/site/public/assets/effects/${stem}.json&fps=30&aspect=16:9`, { waitUntil: 'load' });
  const boot = await page.evaluate(() => new Promise((res) => {
    const t0 = Date.now();
    const tick = () => {
      if (window.__engineError) return res(String(window.__engineError));
      if (window.__engineReady) return res(null);
      if (Date.now() - t0 > 30000) return res('timeout');
      requestAnimationFrame(tick);
    };
    tick();
  }));
  if (boot) {
    console.error(`  boot fail ${stem}: ${boot}`);
    failures.push({ stem, reason: `boot error: ${boot}` });
    failed++;
    continue;
  }

  try {
    // The control: this scene at frame 0, before anything has happened. Every candidate time is
    // compared against it, exactly as type-specimens.mjs does. The DOM cannot tell a painted-but-
    // transparent layer from an empty one, only the pixels can.
    await page.evaluate(() => window.__engine.renderFrame(0));
    const blank = await page.screenshot();

    let written = false;
    for (const t of candidates) {
      await page.evaluate((tt) => window.__engine.renderFrame(Math.round(tt * 30)), t);
      const png = await page.screenshot();
      if (!Buffer.from(png).equals(Buffer.from(blank))) {
        const jpg = await page.screenshot({ type: 'jpeg', quality: 70 });
        fs.writeFileSync(path.join(SCENES_DIR, `${stem}.jpg`), jpg);
        shot++;
        written = true;
        break;
      }
    }
    if (!written) {
      console.error(`  ✗ ${stem}: blank at every time tried (${candidates.join('s, ')}s)`);
      failures.push({ stem, reason: 'blank at every time tried' });
      failed++;
    }
  } catch (e) {
    console.error(`  still fail ${stem}: ${e.message.slice(0, 90)}`);
    failures.push({ stem, reason: e.message.slice(0, 90) });
    failed++;
  }
}
await page.close();
await browser.close();
server.close();

// An effect renamed or dropped from effects.json leaves its old poster behind, still linked from
// nowhere. Only .jpg is swept: the .json scenes belong to scripts/site/effects-json.mjs. Built from
// allTargets, not targets, so a --only run never sweeps away another family's posters.
const keep = new Set(allTargets.map((t) => `${t.stem}.jpg`));
const stale = fs.existsSync(SCENES_DIR)
  ? fs.readdirSync(SCENES_DIR).filter((f) => f.endsWith('.jpg') && !keep.has(f))
  : [];
for (const f of stale) fs.rmSync(path.join(SCENES_DIR, f));

const bytes = fs.readdirSync(SCENES_DIR).filter((f) => f.endsWith('.jpg'))
  .reduce((a, f) => a + fs.statSync(path.join(SCENES_DIR, f)).size, 0);
console.log(`effect-posters: ${targets.length} target(s) · ${shot} shot · ${failed} failed (${(bytes / 1e6).toFixed(1)}MB total)`
  + (stale.length ? `\n  removed ${stale.length} stale poster(s)` : ''));
if (failed) process.exitCode = 1;
