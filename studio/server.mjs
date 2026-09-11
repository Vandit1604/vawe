// studio/server.mjs: a LIVE SCRUBBABLE preview of a scene, for fast iteration without rendering an
// mp4. Starts a local static server and serves a wrapper page: the real scene.html in an iframe, plus a
// scrubber + play/pause + frame/time readout that drive `__engine.renderFrame(n)` directly (the same pure
// function the Go renderer seeks). Edit the JSON, hit reload, scrub, no 30-60s render round-trip.
//
// The shell is studio/page.mjs + studio/ui/ (shell.html, studio.css, studio.js): a top bar, an icon
// sidebar of the four states, a property panel, the preview and its transport, the timeline along the
// bottom, and a draggable divider between preview and timeline. This file owns the server, the gate run behind the timeline model,
// and the write side.
//
// The timeline: one bar per top-level layer against a seconds/frames ruler, with the
// cuts/seams/stings marked, the enter/exit ramps shaded off the settled middle, and every dead-air hole
// painted as a hazard band. It answers the question a contact sheet cannot, what is on screen WHEN.
//
//   make studio D=formats/scene/<file>.json [PORT=8799]
//     → open the printed URL, leave it running (Ctrl-C to stop).
//
// DEV TOOLING ONLY. It does not touch the renderer or the determinism contract; it just calls the engine's
// own renderFrame(n) from the parent frame (same-origin), exactly as the Go capture loop does per frame.
import fs from 'node:fs';
import { onScreenText } from '../harness/lib/text.mjs';
import path from 'node:path';
import { execFile, execFileSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { patchMotion, upsertKey, applyOps } from '../harness/author/patch-motion.mjs';
import { serveRepo, REPO_ROOT, launchPage, waitForEngine } from '../harness/lib/render-harness.mjs';
import { sceneDims } from '../core/layout/safe.js';
import { resolveBridges } from '../core/audio/bridges.js';
import { scratch } from '../harness/lib/scratch.mjs';
import { studioPage } from './page.mjs';
import { parseStoryboard, timeline, fieldIn, blocksOf, referenceDevices } from '../harness/author/storyboard-parse.mjs';
import { fragPage, FULLBLEED_RE, INSET_RE } from '../harness/lib/frag-page.mjs';
import { stageOf } from '../quality/gates/stage.mjs';
import { extractKitBlock } from '../harness/lib/stagekit.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataArg = process.env.D || process.argv[2];
if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: make studio D=formats/scene/<file>.json [PORT=8799]'); process.exit(2); }
const dataUrl = '/' + path.relative(repoRoot, path.resolve(dataArg)).split(path.sep).join('/');
// The film's theme, read once. The plan pane previews every fragment on it, and a fragment previewed
// on the wrong palette is a different picture with no warning (docs/MISTAKES.md #382).
const THEME_NAME = (() => { try { return JSON.parse(fs.readFileSync(dataArg, 'utf8')).theme || 'default'; } catch { return 'default'; } })();
const PORT = Number(process.env.PORT) || 8799;


// ---------- the timeline model ----------
// Where "dead air" comes from. The definition (which layers count as content: a full-canvas opaque rect
// is a blackout, a box under 8% of the canvas is a speck, track:0 is backdrop) lives in
// quality/gates/beat-check.mjs. That file is a SCRIPT, not a module, it reads process.argv and calls
// process.exit at top level, so it cannot be imported into a long-lived server. Restating its rules here
// would give the timeline a second definition free to drift from the gate that blocks the build, which is
// the one thing this band must never do. So the gate is RUN and its findings are read back. If it is ever
// split into an importable core, import it and delete this.
const beatCheck = (file) => {
  let out = '';
  try { out = execFileSync(process.execPath, [path.join(repoRoot, 'quality/gates/beat-check.mjs'), file], { encoding: 'utf8' }); }
  catch (e) { out = String(e.stdout || '') + String(e.stderr || ''); } // the gate exits 1 when it finds something
  const finding = (code) => (out.match(new RegExp(`[✗~] \\[${code}\\] ([^\\n]*)`)) || [])[1] || '';
  const spans = (s, re) => [...s.matchAll(re)].map((m) => [+m[1], +m[2]]);
  return {
    // "6.38s to 6.86s (0.48s) · …": the trailing "(" keeps the fix prose ("anything under 0.40s") out.
    deadAir: spans(finding('dead-air'), /([\d.]+)s to ([\d.]+)s \(/g),
    emptyBeat: spans(finding('empty-beat'), /at ([\d.]+)s \(to ([\d.]+)s\)/g),
    tail: +((finding('ends-on-nothing').match(/from ([\d.]+)s\)/) || [])[1] || 0) || null,
    duration: +((out.match(/content layer\(s\) · ([\d.]+)s/) || [])[1] || 0) || null,
    codes: [...out.matchAll(/✗ \[([a-z-]+)\]/g)].map((m) => m[1]),
  };
};

// The JSON's own view of the film: the transition markers, and a label pool the page matches its DOM bars
// against (the DOM knows the real timing, the JSON knows what each layer IS).
const label = (L) => L.id || (L.text && onScreenText(L.text))
  || (L.src && path.basename(String(L.src))) || L.comp || L.capture || L.preset || '';
// UNDO is a stack of whole previous file contents. A scene is a few kilobytes and an editing session is
// tens of edits, so keeping the bytes is simpler and more honest than replaying inverse operations.
// There is no way for it to drift from what is on disk.
const undoStack = [];

// ---- the AUDIO lane -------------------------------------------------------------------------------
// A film's sound is not a layer and it never was: it has a bed, a beat grid, one-shot cues and bridges
// that hang off the film's own joints. Drawn as another grey bar it said nothing at all. What this
// gathers is what the SCENE declares plus the one thing measured off disk, the beat map, because seams
// are supposed to land on it and that is checkable by eye the moment the grid is on screen.
//
// The bridges are RESOLVED by the engine's own resolver (core/audio-bridges.js), never re-derived: a
// bridge is hung off a named junction (`at: "cut@2"`) and a second implementation of "where does this
// film turn" is the drift MISTAKES #159 is about.
const beatMap = (music) => {
  if (!music) return null;
  const p = path.join(REPO_ROOT, String(music).replace(/\.[a-z0-9]+$/i, '.beats.json'));
  if (!fs.existsSync(p)) return null;
  try {
    const b = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { bpm: b.bpm || null, beats: b.beats || [], downbeats: b.downbeats || [],
             file: path.relative(REPO_ROOT, p) };
  } catch { return null; }
};
const audioLane = (d, marks, duration) => {
  const a = d.audio;
  if (!a || typeof a !== 'object') return { none: true };
  if (a.silent) return { silent: true, why: a._why || null };
  let bridges = [], bridgeError = null;
  // NOT swallowed into an empty lane: a bridge that will not resolve is a scene that will not mix, and
  // the message the resolver throws names the junction it could not find.
  try { bridges = resolveBridges(a, marks, duration).map((b) => ({ start: b.start, end: b.end, sound: b.sound, at: b.at })); }
  catch (e) { bridgeError = String(e.message); }
  return {
    music: a.music || null, gain: a.musicGain ?? null, fade: a.musicFade || null, auto: !!a.auto,
    cues: (Array.isArray(a.cues) ? a.cues : []).filter((c) => c && typeof c.t === 'number')
      .map((c) => ({ t: c.t, name: c.name || 'cue' })),
    bridges, bridgeError, beats: beatMap(a.music),
  };
};

const timelineModel = (file) => {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const marks = (key) => (Array.isArray(d[key]) ? d[key] : []).filter((c) => c && typeof c.t === 'number')
    .map((c) => ({ kind: key.replace(/s$/, ''), t: c.t, dur: c.dur ?? 0.5, name: c.fx || c.style || c.kind || '' }));
  return {
    file: path.basename(file),
    path: path.relative(REPO_ROOT, path.resolve(file)),
    duration: d.duration || null,
    marks: [...marks('cuts'), ...marks('seams'), ...marks('stings')].sort((a, b) => a.t - b.t),
    layers: (Array.isArray(d.layers) ? d.layers : []).filter((L) => L && typeof L === 'object')
      // `raw` is the authored object, carried whole. The picker hands it back when you click the
      // picture, and the point is that what you copy is EXACTLY what is in the file: a summary you
      // then have to reconcile with the JSON is worth less than the JSON.
      .map((L, i) => ({ i, type: L.type || 'text', label: label(L), start: L.start ?? 0, dur: L.duration ?? L.dur ?? 2,
        keys: Array.isArray(L.motion) ? L.motion.map((k) => k.t ?? 0) : [], raw: L })),
    // The backdrop is a layer of the film in every sense that matters, so it is selectable too.
    bg: Array.isArray(d.bg) ? d.bg : (d.bg ? [d.bg] : []),
    // Captions are a KIND OF ROW, not a layer: they are authored as [{t0,t1,text}] and were being drawn
    // as ordinary grey bars, which said they were the same sort of thing as a `text` layer. They are not.
    captions: (Array.isArray(d.captions) ? d.captions : []).filter((c) => c && typeof c === 'object')
      .map((c) => ({ t0: c.t0 ?? c.start ?? c.t ?? 0, t1: c.t1 ?? ((c.t0 ?? 0) + (c.dur ?? 2)), text: String(c.text || '') })),
    audio: audioLane(d, [...marks('cuts'), ...marks('seams'), ...marks('stings')], d.duration || 0),
    gate: beatCheck(file),
  };
};

// The ambition floor (plain-slideshow, no-continuous-object, no-camera, no-transition, no-bg-motion...)
// is a SCRIPT, same shape as beat-check above, so it is run the same way: once, and its findings read
// back from stdout+stderr rather than re-implemented here. Console only, never blocking: `make studio`
// is the iteration loop, and the loop is not where a gate gets teeth.
const directionFloorFindings = (file) => {
  let out = '';
  try { out = execFileSync(process.execPath, [path.join(repoRoot, 'quality/gates/direction-floor.mjs'), file], { encoding: 'utf8' }); }
  catch (e) { out = String(e.stdout || '') + String(e.stderr || ''); } // the gate exits 1 on a FAIL
  return out.split('\n').map((l) => l.trim()).filter((l) => /^[^[]*\[[a-z-]+\]/.test(l));
};

const page = () => studioPage({ fmt: 'scene', dataUrl, title: path.basename(dataArg) });

// stage.mjs writes the next step as one string: a command, sometimes followed by ", then ..." or a
// "   (note)". The stage chip copies only what can be run, so the two are sent apart.
const splitNext = (next) => {
  const s = String(next || '');
  const paren = /^(.*?)\s{2,}\((.*)\)\s*$/.exec(s);
  const head = paren ? paren[1] : s;
  const at = head.indexOf(', then ');
  return {
    command: (at >= 0 ? head.slice(0, at) : head).trim(),
    note: [at >= 0 ? head.slice(at + 2).trim() : '', paren ? paren[2].trim() : ''].filter(Boolean).join('; '),
  };
};

const SLUG = path.basename(dataArg, '.json');
const MP4 = path.join(REPO_ROOT, 'out', `${SLUG}.mp4`);

// A JSON body, read once, with the reply the handler owes. Three handlers below wrote this by hand and
// the fourth is where that stops being worth it.
const withBody = (req, res, run) => {
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on('end', () => run(body, (o, code = 200) => {
    res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o));
  }));
};

// ---- the CHOOSER, and the LOOK sheets: three CLIs, spawned ------------------------------------------
// candidates.mjs, beats.mjs and seam-snap.mjs each open a browser or a decoder, print, and exit. They
// are spawned rather than imported for the reason beat-check is: they read process.argv and exit at top
// level. Spawning also keeps them ASYNC, which matters more here than anywhere else in this file: a
// candidate set takes about fifteen seconds and the page has to stay answerable throughout, not least
// because the six mp4s it is about to play come off this same server.
const jobs = new Map();   // name → true while it runs, so a second click cannot fight the first
const run = (name, args, done) => {
  if (jobs.get(name)) return done(new Error(`a ${name} run is already going, wait for it`), '', '');
  jobs.set(name, true);
  execFile(process.execPath, args, { cwd: REPO_ROOT, maxBuffer: 64 << 20 },
    (err, stdout, stderr) => { jobs.delete(name); done(err, stdout, stderr); });
};

// The two contact sheets Look is built out of, each with the file it writes and what it needs first.
// The paths are the ones those tools choose, read from the same helper they use, never restated as a
// literal: a sheet the page cannot find is indistinguishable from a sheet that was never drawn.
// LOOK IS PRE-RENDER, and two of these three prove it: `beats` and `frames` both seek renderFrame in a
// headless page exactly as the scrubber does, so they are available on a scene that has never been
// rendered, which is the whole point of looking at a strip. Only `seams` needs an mp4, because a seam is
// composited during the encode and exists nowhere else. The half that needs a render must never gate the
// half that does not, so they are three buttons and not one.
const SHEETS = {
  beats: { file: () => scratch('beats', `${SLUG}.png`), args: ['harness/author/beats.mjs', dataArg],
           what: 'every beat, in · mid · out' },
  // preview.mjs names its sheet after the FORMAT, not the scene (/tmp/preview_scene.png), so two studios
  // on two scenes would overwrite each other's. Copied to a per-scene path the moment it lands, which
  // narrows that to the width of one run rather than the width of a session.
  frames: { file: () => scratch('look', `${SLUG}.png`), args: ['harness/author/preview.mjs', 'scene', '--data', dataArg],
            what: 'the key frames of the whole film',
            after: () => { const src = '/tmp/preview_scene.png';
              if (fs.existsSync(src)) fs.copyFileSync(src, scratch('look', `${SLUG}.png`)); } },
  seams: { file: () => `/tmp/seams/${SLUG}.png`, args: ['quality/gates/seam-snap.mjs', dataArg],
           what: 'the frames straddling every transition, out of the rendered mp4',
           // seam-snap reads PIXELS, so it cannot run without one. Said plainly rather than drawn as
           // an empty grid, and the page offers the render.
           needs: () => (fs.existsSync(MP4) ? null : `seams are composited during the render, so they exist only in out/${SLUG}.mp4, and there is no such file yet.`) },
};

// ---- THE FILMSTRIP: the timeline shows PICTURES, not only names -----------------------------------
// A browser cannot screenshot itself, so the strip cannot be grabbed out of the preview iframe however
// convenient that sounds. It is captured the way everything else in this repo captures: a headless page
// on this same server, seeking the engine's own renderFrame and shooting each frame. That also settles
// the stutter question by construction, since it happens in another process and the strip is then a set
// of static images: scrubbing never touches it.
//
// MEASURED, on a 15s portrait film: ~1.1s to launch, ~55ms a frame at 74x132, 14 frames, 1.9s all in.
// The stride is duration/14 with a 0.6s floor, so a 5s film gets 8 thumbs and a 60s film gets 14 wider
// apart. Cached against the scene's mtime, so it is built once and then free until the film changes.
const STRIP_N = 14;
let strip = null;
async function buildStrip() {
  const mtime = fs.statSync(dataArg).mtimeMs;
  if (strip && strip.mtime === mtime) return strip;
  const t0 = Date.now();
  const d = JSON.parse(fs.readFileSync(dataArg, 'utf8'));
  const dur = Number(d.duration) || 0;
  if (!dur) return { error: 'this scene declares no `duration`, so there is no span to lay a strip along' };
  const [VW, VH] = sceneDims(d);
  const fps = Number(d.fps) || 30;
  const n = Math.max(3, Math.min(STRIP_N, Math.floor(dur / 0.6)));
  const dir = path.join(REPO_ROOT, 'out', 'strip', SLUG);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  // 132px tall whatever the canvas is: the band is one height and a portrait film must not get a
  // thumbnail eight pixels wide.
  const { page, close } = await launchPage({ width: VW, height: VH, scale: Math.min(1, 132 / VH) });
  const frames = [], samples = [];
  try {
    await page.goto(`http://127.0.0.1:${PORT}/formats/scene/scene.html?data=${encodeURIComponent(dataUrl)}&fps=${fps}`,
      { waitUntil: 'load' });
    const err = await waitForEngine(page, { timeout: 40000, throwOnTimeout: false });
    if (err) return { error: `the scene will not boot, so there are no frames to strip: ${err}` };
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) * (dur / n);
      await page.evaluate((k) => window.__engine.renderFrame(k), Math.round(t * fps));
      const file = path.join(dir, `${String(i).padStart(2, '0')}.jpg`);
      await page.screenshot({ path: file, type: 'jpeg', quality: 72, clip: { x: 0, y: 0, width: VW, height: VH } });
      frames.push({ t: +t.toFixed(3), src: `/out/strip/${SLUG}/${String(i).padStart(2, '0')}.jpg` });
      // A LAYER THAT NEVER MOVES ACROSS ITS OWN WINDOW, measured while we are already seeking. This is
      // the fault that gets caught by eye after a render: an image sitting dead still for six seconds.
      // Per LAYER rather than per frame, which is the difference from the motion figure we already have.
      samples.push(await page.evaluate(() => [...document.querySelectorAll('.hs-layer[data-idx]')]
        .filter((el) => !el.parentElement.closest('.hs-layer'))
        .map((el) => { const s = getComputedStyle(el), r = el.getBoundingClientRect();
          return { i: +el.dataset.idx, sig: [s.transform, s.filter, Math.round(r.x), Math.round(r.y),
            Math.round(r.width), Math.round(r.height), (el.textContent || '').slice(0, 60)].join('|') }; })));
    }
  } finally { await close(); }
  strip = { mtime, frames, stride: +(dur / n).toFixed(3), ms: Date.now() - t0, w: VW, h: VH,
            still: stillLayers(samples) };
  return strip;
}

/**
 * stillLayers(samples) → the layer indices whose every sampled frame is identical.
 *
 * A NOTE, NEVER A BLOCK, and the reason is in the films: a held frame is sometimes the beat. What it
 * can say honestly is "nothing about this layer changed at any time we looked at it", and it only says
 * it when it looked at least three times, because two samples of a two-second layer prove nothing. It
 * is a sampled measurement and it says so: a layer that moves and returns between samples reads as
 * still, which is why this is a note for the eye rather than a number anything is graded on.
 */
function stillLayers(samples) {
  const seen = new Map();
  for (const frame of samples) for (const { i, sig } of frame) {
    if (!seen.has(i)) seen.set(i, []);
    seen.get(i).push(sig);
  }
  return [...seen].filter(([, sigs]) => sigs.length >= 3 && sigs.every((s) => s === sigs[0])).map(([i]) => i);
}

// ---- the render, as a job with a status ---------------------------------------------------------
// A render is minutes, so it is started and then polled. Holding a fetch open for the whole of one is
// how a panel ends up frozen with nothing to say for itself.
let render = null;
const startRender = () => {
  render = { started: Date.now(), done: false, error: null, line: 'starting make video' };
  const p = spawn('make', ['video', `D=${dataArg}`, 'NOCHECK=1', 'NOAUDIT=1'], { cwd: REPO_ROOT });
  const note = (b) => { const l = String(b).trim().split('\n').filter(Boolean).pop(); if (l) render.line = l.slice(0, 160); };
  p.stdout.on('data', note); p.stderr.on('data', note);
  p.on('close', (code) => {
    render.done = true; render.ms = Date.now() - render.started;
    if (code !== 0) render.error = `make video exited ${code}: ${render.line}`;
    else if (!fs.existsSync(MP4)) render.error = `make video exited 0 but wrote no out/${SLUG}.mp4`;
  });
  p.on('error', (e) => { render.done = true; render.error = `could not start make: ${e.message}`; });
};

// THE INTRINSIC SIZE OF A SHEET, read out of the PNG's IHDR (bytes 16..24, fixed by the format).
// Both sheets are drawn at a size that depends on the film, so the page cannot know the box to reserve
// and the Look grid reflowed as each image decoded. Sent as X-Dim; the page turns it into the img's
// width/height ATTRIBUTES, which supply a ratio and nothing else (the CSS keeps width/height auto, so
// a mapped height can never beat the layout the way it did on the effects thumbnails).
const pngDim = (f) => {
  try {
    const b = Buffer.alloc(24); const fd = fs.openSync(f, 'r');
    fs.readSync(fd, b, 0, 24, 0); fs.closeSync(fd);
    return b.readUInt32BE(16) + 'x' + b.readUInt32BE(20);
  } catch { return ''; }
};

// Studio's own endpoints. Anything it does not answer falls through to the shared static handler.
const studioRoutes = (req, res) => {
  const url = req.url.split('?')[0];
  // no-store, because this shell is edited while it is being looked at: with no validator on the
  // response Chrome cached it heuristically and a reload showed the previous version of the tool.
  if (url === '/' || url === '/studio') { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end(page()); return true; }
  // studio.css and studio.js are edited right alongside the shell, so they get the same no-store: the
  // static handler below has no validator either and Chrome cached the old JS the same way it once
  // cached the old page.
  if (url === '/studio/ui/studio.css' || url === '/studio/ui/studio.js') {
    const file = path.join(REPO_ROOT, url.slice(1));
    res.writeHead(200, { 'Content-Type': url.endsWith('.css') ? 'text/css' : 'text/javascript', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
    return true;
  }
  // rebuilt per request (and the gate re-run), so an edit + reload shows the new timeline
  // ---- the PLAN, as the film rather than as grey boxes -------------------------------------------
  // A film has two artefacts and studio only ever showed one. This used to serve `make panels`, one
  // grey still per beat sized from `shot:`, which answers how big and where and nothing about what is
  // in the frame, so nobody could approve a plan from it (docs/MISTAKES.md #592). The real pictures
  // were on disk the whole time: every beat that names a `fragment:` has hand-written markup that
  // renders instantly. So the plan is served as DATA and the page draws it in the studio's own room,
  // with each beat's real fragment live beside its reasoning.
  const storyboardPath = () => {
    const named = (() => { try { const d = JSON.parse(fs.readFileSync(dataArg, 'utf8'));
      return typeof d.storyboard === 'string' ? path.join(REPO_ROOT, d.storyboard) : null; } catch { return null; } })();
    return [named, dataArg.replace(/\.json$/, '.storyboard.md')].find((f) => f && fs.existsSync(f)) || null;
  };
  // WHERE THE FILM IS, in the tool that shows the film. `make stage` answers this in a terminal, and a
  // terminal is not where anyone is looking while they work on a film.
  if (url === '/api/stage') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    try { const st = stageOf(dataArg); res.end(JSON.stringify({ ok: true, ...st, ...splitNext(st.next) })); }
    catch (e) { res.end(JSON.stringify({ ok: false, error: String(e.message) })); }
    return true;
  }
  if (url === '/api/plan') {
    const reply = (o, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
    const sbPath = storyboardPath();
    if (!sbPath) return reply({ ok: false, error: 'no storyboard for this scene: add a top-level "storyboard" field, or put <name>.storyboard.md beside it' }, 404), true;
    try {
      const src = fs.readFileSync(sbPath, 'utf8');
      const sb = parseStoryboard(src);
      const blocks = blocksOf(src);
      // `fragment:` is the studio's own field, so it is read off the raw block; everything else comes
      // from the shared reader, because a second storyboard parser is the drift that reader prevents.
      const beats = timeline(sb).beats.map((b, i) => {
        const frag = (fieldIn(blocks[i], 'fragment') || '').split(/\s+\(/)[0].trim();
        return { ...b, fragment: frag && fs.existsSync(path.join(REPO_ROOT, frag)) ? frag : null,
          archetype: (fieldIn(blocks[i], 'archetype') || '').trim(),
          weight: (fieldIn(blocks[i], 'weight') || '').trim(),
          borrows: (fieldIn(blocks[i], 'borrows') || '').trim() };
      });
      let gateOut = '';
      try { gateOut = execFileSync(process.execPath, [path.join(REPO_ROOT, 'quality/gates/storyboard-check.mjs'), sbPath], { encoding: 'utf8' }); }
      catch (e) { gateOut = String(e.stdout || '') + String(e.stderr || ''); }
      // A fragment-less beat is still drawn, from its storyboard fields, on the film's own colours
      // (docs/CRAFT/STORYBOARD-TEMPLATE.md archetypes): a grey box says nothing about what a beat
      // SHOWS, and this repo's whole point is that the picture is the only thing worth approving.
      let palette = null;
      try { palette = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'themes', THEME_NAME + '.json'), 'utf8')).palette; } catch { /* sketch falls back to studio's own greys */ }
      reply({ ok: true, file: path.relative(REPO_ROOT, sbPath), theme: THEME_NAME, palette,
        message: sb.message, audience: sb.audience, pace: sb.pace, spectacle: sb.spectacle, not: sb.not,
        format: sb.format, duration: sb.duration, beats, devices: referenceDevices(src),
        findings: [...gateOut.matchAll(/^\s*([✗~✓])\s+(.+)$/gm)].map((m) => ({ kind: m[1], line: m[2].trim() })) });
    } catch (e) { reply({ ok: false, error: 'could not read the storyboard: ' + e.message }, 500); }
    return true;
  }
  // One fragment, on the film's theme, in the SAME wrapper `make preview` photographs. Sharing that
  // wrapper is the point: two copies would drift, and the drift shows a fragment clean in one tool and
  // wrong in the other with nothing saying which is lying.
  if (url === '/__frag') {
    const rel = new URL(req.url, 'http://x').searchParams.get('src') || '';
    const file = path.join(REPO_ROOT, rel);
    const themeFile = path.join(REPO_ROOT, 'themes', THEME_NAME + '.json');
    if (!file.startsWith(REPO_ROOT) || !fs.existsSync(file) || !fs.existsSync(themeFile)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('no such fragment'); return true;
    }
    const theme = JSON.parse(fs.readFileSync(themeFile, 'utf8'));
    const raw = fs.readFileSync(file, 'utf8');
    const kit = extractKitBlock(raw);
    const own = kit ? raw.replace(kit, '') : raw;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(fragPage({ raw, theme, bg: theme.palette.bg, fullBleed: FULLBLEED_RE.test(own) && INSET_RE.test(own) }));
    return true;
  }

  // ---- the page reports its own failure to the terminal ------------------------------------------
  // A boot error used to exist only inside the iframe. The terminal that started studio printed its
  // banner and then sat silent while the page showed a stack trace, so whoever was watching the shell
  // (a person on a call, an agent driving this remotely) had no idea the scene was dead. The page now
  // POSTs its failure here and it prints once.
  if (req.method === 'POST' && url === '/__err') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body); } catch { /* a malformed report is still a report */ }
      const detail = String(e.detail || '').split('\n').map((l) => '   ' + l).join('\n');
      console.error(`\n\u2717 ${e.title || 'the scene failed'}\n${detail}\n`);
      res.writeHead(204); res.end();
    });
    // TRUE, not a bare return. serveRepo's contract is "return true when you answered", and a handler
    // that answers ASYNCHRONOUSLY still has to claim the request synchronously. Returning undefined let
    // the static handler 404 it first, and this callback then wrote to a response already sent.
    return true;
  }

  // ---- the WRITE side: a drag in the browser becomes a keyframe on disk --------------------------
  // Studio was read-only, so every one of the exemplar's 73 keys was a number typed into JSON by hand,
  // and the library has exactly one film with dense keys as a result. These two endpoints are the whole
  // difference between viewing motion and authoring it.
  if (req.method === 'POST' && (url === '/api/key' || url === '/api/undo')) {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const reply = (o, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      try {
        const src = fs.readFileSync(dataArg, 'utf8');
        if (url === '/api/undo') {
          if (!undoStack.length) return reply({ ok: false, error: 'nothing to undo' });
          fs.writeFileSync(dataArg, undoStack.pop());
          return reply({ ok: true, left: undoStack.length });
        }
        const { layer, t, x, y } = JSON.parse(body || '{}');
        const d = JSON.parse(src);
        const L = d.layers?.[layer];
        if (!L) return reply({ ok: false, error: `no layer at index ${layer}` }, 400);
        // A key is only meaningful at a time the layer is actually on screen, and `motion` t is LOCAL to
        // the layer's start. The single easiest thing to get wrong when writing these by hand.
        const keys = upsertKey(Array.isArray(L.motion) ? L.motion : [], {
          t: +(+t).toFixed(3), x: Math.round(x), y: Math.round(y),
        });
        const out = patchMotion(src, layer, keys);
        if (out !== src) { undoStack.push(src); fs.writeFileSync(dataArg, out); }
        return reply({ ok: true, keys: keys.length, changed: out !== src, undo: undoStack.length });
      } catch (e) { return reply({ ok: false, error: String(e.message) }, 500); }
    });
    return true;
  }
  // ---- the CHOOSER: six real takes of THIS film at the playhead ---------------------------------
  // No search box, by design: the panel asks for a set at a time, and the answer is six clips of the
  // scene you are already looking at. The reply is candidates.mjs's own JSON, passed through whole, so
  // the warnings it attaches (a light backdrop under light ink, an `opts` block the new preset has no
  // knob for) reach the card that offers the take rather than being dropped on the way.
  if (req.method === 'POST' && url === '/api/candidates') {
    withBody(req, res, (body, reply) => {
      let at = 0, n = 6;
      try { const q = JSON.parse(body || '{}'); at = +q.at || 0; n = Math.max(1, Math.min(8, +q.n || 6)); } catch { /* defaults */ }
      run('candidates', ['harness/dev/candidates.mjs', dataArg, '--at', String(+at.toFixed(2)), '--axis', 'bg', '--n', String(n)],
        (err, stdout, stderr) => {
          if (err) return reply({ ok: false, error: String(stderr || stdout || err.message).trim().slice(0, 700) });
          try { reply({ ok: true, ...JSON.parse(stdout) }); }
          catch (e) { reply({ ok: false, error: `candidates printed something that is not JSON:\n${String(stdout).slice(0, 400)}` }); }
        });
    });
    return true;
  }

  // ---- accepting one: the patch it came with, applied to the file ---------------------------------
  // As TEXT (harness/author/patch-motion.mjs), for the reason the keyframe writer is: these scenes are
  // hand formatted and a parse/stringify round trip would turn a one-word choice into a whole-file diff.
  if (req.method === 'POST' && url === '/api/apply') {
    withBody(req, res, (body, reply) => {
      try {
        const { ops } = JSON.parse(body || '{}');
        const src = fs.readFileSync(dataArg, 'utf8');
        const out = applyOps(src, ops);
        if (out !== src) { undoStack.push(src); fs.writeFileSync(dataArg, out); }
        reply({ ok: true, changed: out !== src, undo: undoStack.length });
      } catch (e) { reply({ ok: false, error: String(e.message) }, 400); }
    });
    return true;
  }

  // ---- LOOK: a contact sheet, drawn on demand -----------------------------------------------------
  // Redrawn when the SCENE is newer than the sheet, the same freshness rule /__panels uses: a strip of
  // a film you have since edited is worse than no strip, because it looks like evidence.
  if (url.startsWith('/__sheet')) {
    const kind = new URL(req.url, 'http://x').searchParams.get('kind');
    const S = SHEETS[kind];
    const text = (code, msg, headers = {}) => { res.writeHead(code, { 'Content-Type': 'text/plain', ...headers }); res.end(msg); };
    if (!S) return text(400, `no such sheet "${kind}". Known: ${Object.keys(SHEETS).join(', ')}`), true;
    const blocked = S.needs && S.needs();
    // 200, not 409: "no mp4 yet" is a state the page branches on by header, not a failed request
    if (blocked) return text(200, blocked, { 'X-Needs-Render': '1' }), true;
    const png = S.file();
    const send = () => {
      if (!fs.existsSync(png)) return text(500, `${kind} reported success but wrote no sheet at ${png}`);
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Dim': pngDim(png), 'X-Sheet': png });
      fs.createReadStream(png).pipe(res);
    };
    const stale = !fs.existsSync(png) || fs.statSync(dataArg).mtimeMs > fs.statSync(png).mtimeMs
      || (kind === 'seams' && fs.statSync(MP4).mtimeMs > fs.statSync(png).mtimeMs);
    if (!stale) return send(), true;
    run(kind, S.args, (err, stdout, stderr) => {
      if (S.after) { try { S.after(); } catch { /* the existence check below is the real verdict */ } }
      // seam-snap exits 1 when it FINDS a flash and still writes its sheet, which is the run you most
      // want to look at. So the sheet decides, not the exit code.
      if (fs.existsSync(png)) return send();
      // 200 with a header, not 500: a scene that cannot render is a state the page shows, not a failed request
      text(200, `${kind} drew no sheet:\n${String(stderr || stdout || (err && err.message) || '').trim().slice(0, 900)}`, { 'X-Scene-Error': '1' });
    });
    return true;
  }

  // ---- the filmstrip, built on demand and cached against the scene's mtime -------------------------
  if (url === '/api/strip') {
    const reply = (o) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
    if (jobs.get('strip')) return reply({ busy: true }), true;
    jobs.set('strip', true);
    buildStrip().then((s) => reply(s)).catch((e) => reply({ error: String(e.message) }))
      .finally(() => jobs.delete('strip'));
    return true;
  }

  // ---- the render the seam sheet needs, started and then polled ------------------------------------
  if (url === '/api/render') {
    if (req.method === 'POST') { if (!render || render.done) startRender(); }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(render
      ? { ...render, secs: Math.round((Date.now() - render.started) / 1000) }
      : { done: fs.existsSync(MP4), line: fs.existsSync(MP4) ? `out/${SLUG}.mp4 is already on disk` : 'not started' })), true;
  }

  if (url === '/api/timeline') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    try { res.end(JSON.stringify({ ...timelineModel(dataArg), undo: undoStack.length })); }
    catch (e) { res.end(JSON.stringify({ file: path.basename(dataArg), marks: [], layers: [], gate: { deadAir: [], emptyBeat: [], codes: [], error: String(e.message) } })); }
    return true;
  }
  return false;
};

const oops = (e) => { console.error(e.code === 'EADDRINUSE' ? `✗ port ${PORT} is busy, set a free one: make studio D=${dataArg} PORT=8800` : e.message); process.exit(1); };
const { server } = await serveRepo({ port: PORT, route: studioRoutes }).catch((e) => (oops(e), {}));
server.on('error', oops);
console.log(`\n  ▶ vawe studio: ${path.basename(dataArg)}`);
console.log(`    open  http://127.0.0.1:${PORT}/studio`);
console.log(`    ← → a frame · shift+← → a second · home/end the ends · space plays · 1-4 switch state`);
console.log(`    timeline below: drag it to seek · hazard bands are dead air (beat-check) · hover a bar for its ramps`);
console.log(`    drag the divider to trade preview height for timeline height (it sticks)`);
console.log(`    Ctrl-C to stop.\n`);

// Never fatal: a gate crash here must not take the server down with it.
try {
  const floor = directionFloorFindings(dataArg);
  if (floor.length) {
    console.log(`  direction floor (\`make direction-floor D=${path.relative(repoRoot, dataArg)}\` for the full report):`);
    for (const l of floor) console.log(`    ${l}`);
    console.log('');
  }
} catch { /* the studio loop never blocks on a gate */ }
