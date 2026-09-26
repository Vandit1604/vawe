//     motion, twice too fast with folds half the size (engine-doctrine/MISTAKES.md #155). So each candidate is a
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { BG_NAMES, BG_BLURBS, bgPreset, bgPaletteFrom, bgOptKeys, bgOverErrors } from '../../core/backgrounds/index.js';
import { isLightBg, parseColor, colorAlpha } from '../../core/color/engine.js';
import { expandTheme, isTokenFile } from '../../core/theme/roles.js';
import { junctionTable, marksOf, bindWindowsToJunctions } from '../../core/timeline/junctions.js';
import { bgErrors } from '../../core/validate/validate.mjs';
import { checkCuts } from '../../core/fx/ancestor-kills.js';
import { sceneDims } from '../../core/layout/safe.js';
import { collect as arsenalCollect, coverageIn, toks } from '../author/arsenal.mjs';
import { newSince } from '../author/recency.mjs';
import { serveRepo, launchPage, waitForEngine } from '../lib/render-harness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');


/**
 * look(name, value, palette) → the VISIBLE facts about a bg preset under one film's palette: how light
 * it is, whether it moves, and which family it belongs to. Read off `bgPreset`, the engine's own
 * builder, so a palette change moves these with it and nothing here restates a colour.
 *
 * LIGHTNESS IS MEASURED, NOT READ OFF THE NAME, and it asks `isLightBg` (core/motion.js), the single
 * definition of light-versus-dark this engine has. films/scene/scene.js:307 decides the same thing
 * the same way for the same reason: `bgPreset` builds every base out of the THEME's ramp, so `accent`
 * is a pale tint in a white-first brand and a saturated field in a dark one, and a hand-kept list of
 * "light preset names" is right for one family of themes and silently wrong for the other.
 */
export function look(name, value, palette) {
  const spec = bgPreset(name, value, palette);
  const base = spec?.base?.color ?? spec?.base?.from ?? null;
  const light = (value === 'dark' || value === 'ink') ? false : (base == null ? false : isLightBg(base));
  const fx = (spec.fx || []).map((f) => f.type).filter((t) => t !== 'grain');
  return { spec, tone: light ? 'light' : 'dark', moves: fx.length > 0,
    family: fx.length ? fx.sort().join('+') : 'flat' };
}

/**
 * patchOps(winIdx, name, dropOpts) → RFC 6902, so the panel can apply a choice with any json-patch
 * implementation and needs to know nothing about how it was picked. Two ops at most, and the second
 * one is VISIBLE on purpose: an `opts` block the new preset has no knob for is removed where the
 * author can see it go, never silently.
 */
export function patchOps(winIdx, name, dropOpts = false) {
  const ops = [{ op: 'replace', path: `/bg/${winIdx}/preset`, value: name }];
  if (dropOpts) ops.push({ op: 'remove', path: `/bg/${winIdx}/opts` });
  return ops;
}

/** The subset of RFC 6902 patchOps emits, applied to a COPY. Nothing here writes to the scene. */
export function applyPatch(data, ops) {
  const out = structuredClone(data);
  for (const op of ops) {
    const segs = op.path.split('/').slice(1);
    const last = segs.pop();
    let node = out;
    for (const s of segs) node = node[s];
    if (op.op === 'replace') node[last] = op.value;
    else if (op.op === 'remove') delete node[last];
  }
  return out;
}

/**
 * pickForVariety(pool, n) → n candidates that look DIFFERENT from each other, not the n best.
 *
 * SIX GOOD OPTIONS BEAT FORTY-TWO, and six settings of one look are one option. `bg` alone has 21
 * presets and several pairs differ by a shade, so taking the top n by relevance returns a strip whose
 * halves are indistinguishable at thumbnail size, which is the one thing a chooser cannot afford.
 *
 * Three passes, each looser than the last: an unseen family AND an unseen tone, then an unseen family,
 * then anything left. Deterministic: the caller sorts, and the name breaks every tie, so the same
 * scene at the same time always offers the same six.
 */
export function pickForVariety(pool, n) {
  const ranked = [...pool].sort((a, b) => b.relevance - a.relevance || a.name.localeCompare(b.name));
  const picked = [];
  const seenFamily = new Set(), seenTone = new Set();
  for (const pass of [0, 1, 2]) {
    for (const c of ranked) {
      if (picked.length >= n || picked.includes(c)) continue;
      if (pass === 0 && (seenFamily.has(c.family) || seenTone.has(c.tone))) continue;
      if (pass === 1 && seenFamily.has(c.family)) continue;
      picked.push(c); seenFamily.add(c.family); seenTone.add(c.tone);
    }
  }
  return picked;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : argv[i + 1]; };
  const die = (msg) => { console.error(`candidates: ${msg}`); process.exit(2); };

  const USAGE = `usage: node harness/dev/candidates.mjs <scene.json> --at <seconds> [--axis bg] [--n 6]
                                       [--dur 2] [--scale 0.35] [--fps 30] [--outdir out/candidates]`;

  const VALUE_FLAGS = new Set(['at', 'axis', 'n', 'dur', 'scale', 'outdir', 'fps']);
  const positional = argv.filter((a, i) => {
    if (a.startsWith('--')) return false;
    const prev = argv[i - 1];
    return !(prev && prev.startsWith('--') && VALUE_FLAGS.has(prev.slice(2)));
  });

  if (!positional.length) die(`no scene file.\n${USAGE}`);
  const scenePath = path.resolve(positional[0]);
  if (!fs.existsSync(scenePath)) die(`no such scene file: ${positional[0]}`);

  const at = Number(flag('at', NaN));
  if (!Number.isFinite(at) || at < 0) die(`--at needs a time in seconds (got ${JSON.stringify(flag('at'))}).\n${USAGE}`);

  const AXES = ['bg'];
  const axis = String(flag('axis', 'bg'));
  if (!AXES.includes(axis)) die(`unknown axis "${axis}". Known axes: ${AXES.join(', ')}.`);

  const N = Math.max(1, Number(flag('n', 6)) || 6);
  const CLIP_DUR = Math.max(0.5, Number(flag('dur', 2)) || 2);
  const SCALE = Math.max(0.05, Math.min(1, Number(flag('scale', 0.35)) || 0.35));
  const OUTDIR = String(flag('outdir', 'out/candidates'));

  let scene;
  try { scene = JSON.parse(fs.readFileSync(scenePath, 'utf8')); }
  catch (e) { die(`${path.relative(repoRoot, scenePath)} is not valid JSON: ${e.message}`); }
  if (scene.module !== 'scene') die(`${path.relative(repoRoot, scenePath)} declares "module": ${JSON.stringify(scene.module)}; this tool renders scenes.`);
  const duration = Number(scene.duration) || 0;
  if (duration && at > duration) die(`--at ${at}s is past the end of a ${duration}s film.`);

  // ---- which bg window paints `--at` -----------------------------------------------------------------
  // The joints are resolved by the ENGINE'S owner (core/junctions.js), never re-derived here: a second
  // copy of "where does this film turn" is the drift engine-doctrine/MISTAKES.md #358 is about.
  const bg = Array.isArray(scene.bg) ? scene.bg : [];
  if (!bg.length) die(`this scene declares no \`bg\`, so there is no backdrop to offer alternatives for.`);
  let bound;
  try { bound = bindWindowsToJunctions(bg, junctionTable(marksOf(scene)), duration || Infinity); }
  catch (e) { die(`cannot resolve the backdrop windows of this scene: ${e.message}`); }

  const covers = (b, t) => (b.from ?? 0) <= t && t < (b.to ?? Infinity);
  let winIdx = bound.findIndex((b) => covers(b, at));
  if (winIdx < 0) winIdx = bound.length - 1;               // past the last `to`: the final window holds
  const win = bg[winIdx];
  if (win.html != null || win.src != null || win.use != null)
    die(`bg[${winIdx}] paints its backdrop with \`${win.html != null ? 'html' : win.src != null ? 'src' : 'use'}\`, not a preset, `
      + `so swapping a preset in would give the window two sources and the engine refuses that. `
      + `Point --at at a window that names a \`preset\`.`);
  const current = win.preset || 'paper';

  const themeName = typeof scene.theme === 'string' ? scene.theme : null;
  let theme = null;
  if (themeName) {
    const tp = path.join(repoRoot, 'themes', `${themeName}.json`);
    if (fs.existsSync(tp)) {
      try {
        const raw = JSON.parse(fs.readFileSync(tp, 'utf8'));
        theme = isTokenFile(raw) ? expandTheme(raw, { parseColor, colorAlpha }) : raw;
      } catch { /* palette falls back */ }
    }
  }
  const PAL = (theme && theme.bg) || bgPaletteFrom(theme && theme.palette) || undefined;

  const lookOf = (name) => look(name, win.value, PAL);

  function presetUsage() {
    const dir = path.join(repoRoot, 'films/scene');
    const counts = new Map(BG_NAMES.map((n) => [n, 0]));
    let scenes = 0;
    for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
      if (!f.endsWith('.json') || f === 'schema.json') continue;
      let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
      if (d.module !== 'scene' || !Array.isArray(d.bg)) continue;
      scenes++;
      const here = new Set(d.bg.map((b) => b && b.preset).filter(Boolean));
      for (const n of here) if (counts.has(n)) counts.set(n, counts.get(n) + 1);
    }
    return { counts, scenes };
  }

  /** Would the engine take this? Returns the reasons it would not, from the engine's own validators. */
  function refusals(patched) {
    const out = [];
    for (const m of bgErrors(patched)) if (m.startsWith(`bg[${winIdx}]`) || m.startsWith('bg:')) out.push(m);
    try { checkCuts({ cuts: patched.cuts || [], layers: patched.layers || [], sceneUnits: patched.sceneUnits }); }
    catch (e) { out.push(e.message); }
    return out;
  }

  const feel = [scene.note, scene.spectacle && scene.spectacle.of, scene.title, scene.description]
    .filter((s) => typeof s === 'string').join(' ').trim();

  const all = await arsenalCollect();
  const coverage = coverageIn(all);
  const byName = new Map(all.filter((e) => e.kind === 'background preset').map((e) => [e.name, e]));
  const qt = toks(feel);

  const { counts, scenes: libSize } = presetUsage();
  const themeInk = ((theme && theme.palette) || {}).ink || ((theme && theme.palette) || {}).text || null;
  const inkIsLight = themeInk ? isLightBg(themeInk) : false;
  const fresh = newSince(BG_NAMES, { cwd: repoRoot });

  const pool = [];
  for (const name of BG_NAMES) {
    if (name === current) continue;                            // the status quo is the thing being replaced
    const entry = byName.get(name) || { name, kind: 'background preset', blurb: BG_BLURBS[name] || '' };
    let L; try { L = lookOf(name); } catch (e) { continue; }     // a preset this palette cannot build is not an option
    const warnings = [];
    // `opts` is a PER-PRESET vocabulary. Carrying a `liquid` window's scale/warp onto `paperDots` is a
    // key nothing reads, which core/backgrounds.js throws on by design (engine-doctrine/MISTAKES.md #157). So the
    // patch removes them and says so, rather than offering a candidate that dies at boot.
    const dropOpts = win.opts != null && bgOverErrors(L.spec, win.opts).length > 0;
    if (dropOpts) warnings.push(`this window's \`opts\` (${Object.keys(win.opts).join(', ')}) are knobs of `
      + `"${current}", not of "${name}" (which takes ${bgOptKeys(L.spec).join(', ') || 'none'}), so the patch removes them.`);
    if (L.tone === 'light' && inkIsLight)
      warnings.push(`this backdrop is LIGHT, and a light window makes the engine default text to \`var(--ink)\`, `
        + `which theme "${themeName || 'default'}" sets to ${themeInk}, itself light. Any layer that does not name `
        + `its own \`color\` will paint near-white on near-white. Look at the clip before choosing it.`);
    const patch = patchOps(winIdx, name, dropOpts);
    const bad = refusals(applyPatch(scene, patch));
    if (bad.length) continue;                                  // never offer something that will not work
    pool.push({ name, blurb: entry.blurb || BG_BLURBS[name] || '', relevance: +coverage(entry, qt).toFixed(3),
      scenes: counts.get(name) ?? 0, new: fresh.has(name), tone: L.tone, moves: L.moves, family: L.family,
      warnings, patch, dropOpts });
  }
  if (!pool.length) die(`no alternative background preset survives this scene's own validation at bg[${winIdx}].`);

  const picked = pickForVariety(pool, N);

  const [VW, VH] = sceneDims(scene);
  const W = Math.round(VW * SCALE), H = Math.round(VH * SCALE);
  const fps = Number(flag('fps', scene.fps || 30)) || 30;
  const t0 = Math.max(0, at - CLIP_DUR / 2);
  const t1 = duration ? Math.min(duration, t0 + CLIP_DUR) : t0 + CLIP_DUR;
  const f0 = Math.round(t0 * fps), f1 = Math.max(f0 + 1, Math.round(t1 * fps));

  const slug = path.basename(scenePath, '.json');
  const runDir = path.join(repoRoot, OUTDIR, `${slug}-${axis}-${at}s`);
  fs.rmSync(runDir, { recursive: true, force: true });
  fs.mkdirSync(runDir, { recursive: true });

  const { server, port, close: closeServer } = await serveRepo();
  const { browser, page, close: closeBrowser } = await launchPage({ width: VW, height: VH, scale: SCALE });

  const started = Date.now();
  async function renderOne(cand) {
    const t = Date.now();
    const dataFile = path.join(runDir, `${cand.name}.json`);
    fs.writeFileSync(dataFile, JSON.stringify(applyPatch(scene, cand.patch), null, 1));
    const dataUrl = '/' + path.relative(repoRoot, dataFile).split(path.sep).join('/');
    const frames = path.join(runDir, `.f-${cand.name}`);
    fs.mkdirSync(frames, { recursive: true });

    await page.goto(`http://127.0.0.1:${port}/films/scene/scene.html?data=${encodeURIComponent(dataUrl)}&fps=${fps}`,
      { waitUntil: 'load' });
    const err = await waitForEngine(page, { timeout: 60000, throwOnTimeout: false });
    if (err) return { ...cand, clip: null, error: `the scene failed to boot with "${cand.name}": ${err}` };

    for (let n = f0; n < f1; n++) {
      await page.evaluate((k) => window.__engine.renderFrame(k), n);
      await page.screenshot({ path: path.join(frames, `${String(n - f0).padStart(4, '0')}.jpg`),
        type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: VW, height: VH } });
    }
    const clip = path.join(runDir, `${cand.name}.mp4`);
    const ff = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i',
      path.join(frames, '%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-vf', `scale=${W - (W % 2)}:${H - (H % 2)}`, clip], { encoding: 'utf8' });
    fs.rmSync(frames, { recursive: true, force: true });
    if (ff.status !== 0) return { ...cand, clip: null, error: `ffmpeg failed: ${(ff.stderr || '').trim().slice(0, 200)}` };
    return { ...cand, clip: path.relative(repoRoot, clip), ms: Date.now() - t };
  }

  const results = [];
  for (const c of picked) results.push(await renderOne(c));
  const wall = Date.now() - started;

  await closeBrowser(); closeServer();

  console.log(JSON.stringify({
    scene: path.relative(repoRoot, scenePath),
    axis,
    at,
    window: { index: winIdx, from: bound[winIdx].from ?? 0, to: bound[winIdx].to ?? duration, current },
    clip: { from: +t0.toFixed(3), to: +t1.toFixed(3), fps, frames: f1 - f0, width: W - (W % 2), height: H - (H % 2) },
    library: { scenes: libSize, note: 'scenes reads films/scene/*.json; most films are gitignored, so a clone sees fewer' },
    ranked: { query: feel || null, considered: pool.length, note: feel ? 'ranked by the arsenal\'s coverage of what the film says it is, then picked for variety'
      : 'this scene says nothing about itself (no note/title/description), so relevance is 0 everywhere and variety picked the whole strip' },
    ms: wall,
    dir: path.relative(repoRoot, runDir),
    candidates: results.map(({ dropOpts, ...c }) => c),
  }, null, 1));

}
