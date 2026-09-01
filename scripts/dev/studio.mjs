// scripts/dev/studio.mjs: a LIVE SCRUBBABLE preview of a scene, for fast iteration without rendering an
// mp4. Starts a local static server and serves a wrapper page: the real scene.html in an iframe, plus a
// scrubber + play/pause + frame/time readout that drive `__engine.renderFrame(n)` directly (the same pure
// function the Go renderer seeks). Edit the JSON, hit reload, scrub, no 30-60s render round-trip.
//
// The shell is scripts/dev/studio-page.mjs: a left rail of panels, the preview and its transport in the
// centre, the timeline full width along the bottom, and a draggable divider between them. This file owns
// the server, the gate run behind the timeline model, and the write side.
//
// The timeline: one bar per top-level layer against a seconds/frames ruler, with the
// cuts/seams/stings marked, the enter/exit ramps shaded off the settled middle, and every dead-air hole
// painted as a hazard band. It answers the question a contact sheet cannot, what is on screen WHEN.
//
//   make studio D=formats/scene/<file>.json [PORT=8799] [THEME=dark]
//     → open the printed URL, leave it running (Ctrl-C to stop). Light is the default; the toggle in the
//       transport switches to dark and the choice sticks per browser.
//
// DEV TOOLING ONLY. It does not touch the renderer or the determinism contract; it just calls the engine's
// own renderFrame(n) from the parent frame (same-origin), exactly as the Go capture loop does per frame.
import fs from 'node:fs';
import { onScreenText } from '../lib/text.mjs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { patchMotion, upsertKey } from '../author/patch-motion.mjs';
import { serveRepo, REPO_ROOT } from '../lib/render-harness.mjs';
import { studioPage } from './studio-page.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataArg = process.env.D || process.argv[2];
if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: make studio D=formats/scene/<file>.json [PORT=8799]'); process.exit(2); }
const dataUrl = '/' + path.relative(repoRoot, path.resolve(dataArg)).split(path.sep).join('/');
const PORT = Number(process.env.PORT) || 8799;


// ---------- the timeline model ----------
// Where "dead air" comes from. The definition (which layers count as content: a full-canvas opaque rect
// is a blackout, a box under 8% of the canvas is a speck, track:0 is backdrop) lives in
// scripts/gates/beat-check.mjs. That file is a SCRIPT, not a module, it reads process.argv and calls
// process.exit at top level, so it cannot be imported into a long-lived server. Restating its rules here
// would give the timeline a second definition free to drift from the gate that blocks the build, which is
// the one thing this band must never do. So the gate is RUN and its findings are read back. If it is ever
// split into an importable core, import it and delete this.
const beatCheck = (file) => {
  let out = '';
  try { out = execFileSync(process.execPath, [path.join(repoRoot, 'scripts/gates/beat-check.mjs'), file], { encoding: 'utf8' }); }
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

const timelineModel = (file) => {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const marks = (key) => (Array.isArray(d[key]) ? d[key] : []).filter((c) => c && typeof c.t === 'number')
    .map((c) => ({ kind: key.replace(/s$/, ''), t: c.t, dur: c.dur ?? 0.5, name: c.fx || c.style || c.kind || '' }));
  return {
    file: path.basename(file),
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
    gate: beatCheck(file),
  };
};

// LIGHT IS STILL THE DEFAULT, and the dark room is the better of the two. Vawe is a white-first product,
// so the instrument you photograph beside the site stays light; the grey room behind the toggle is where
// frames get judged, because an achromatic surround is the only one that does not skew the picture.
const THEME0 = (process.env.THEME || 'light').toLowerCase() === 'dark' ? 'dark' : 'light';
const page = () => studioPage({ fmt: 'scene', dataUrl, title: path.basename(dataArg), theme: THEME0 });

// Studio's own endpoints. Anything it does not answer falls through to the shared static handler.
const studioRoutes = (req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/studio') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(page()); return true; }
  // rebuilt per request (and the gate re-run), so an edit + reload shows the new timeline
  // ---- the PLAN, drawn ---------------------------------------------------------------------------
  // A film has two artefacts and studio only ever showed one. The storyboard is where the beats were
  // decided and `make panels` renders it as a sheet, but that sheet lived in /tmp and nobody opened
  // it: the gate that asks for it has been warning "no panels have been drawn" on this very film.
  // Putting it behind a button in the tool that shows the RESULT is the whole point, because the
  // question worth asking is whether the result matches the plan.
  if (url === '/__panels') {
    // Same resolution order as author-check: an explicit `storyboard` field, then a sibling file.
    let sbPath = null;
    try {
      const d = JSON.parse(fs.readFileSync(dataArg, 'utf8'));
      const named = typeof d.storyboard === 'string' ? path.join(REPO_ROOT, d.storyboard) : null;
      const sibling = dataArg.replace(/\.json$/, '.storyboard.md');
      sbPath = [named, sibling].find((f) => f && fs.existsSync(f)) || null;
    } catch (e) {
      // NOT swallowed. A bare catch here returned "no storyboard for this scene" over a
      // ReferenceError and sent me looking at path resolution for ten minutes.
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('could not resolve the storyboard: ' + e.message), true;
    }
    if (!sbPath) { res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('no storyboard for this scene: add a top-level "storyboard" field, or put <name>.storyboard.md beside it'), true; }
    const out = path.join('/tmp/panels', path.basename(sbPath).replace(/\.storyboard\.md$/, ''), '..');
    const png = path.join('/tmp/panels', path.basename(sbPath).replace(/\.storyboard\.md$/, '') + '.png');
    // Redrawn when the storyboard is NEWER than the sheet, so the plan on screen is never stale.
    const stale = !fs.existsSync(png) || fs.statSync(sbPath).mtimeMs > fs.statSync(png).mtimeMs;
    if (stale) {
      const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts/author/panels.mjs'), sbPath],
        { cwd: REPO_ROOT, encoding: 'utf8' });
      if (!fs.existsSync(png)) { res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('panels failed:\n' + String(r.stderr || r.stdout).slice(0, 900)), true; }
    }
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store',
                         'X-Storyboard': path.relative(REPO_ROOT, sbPath) });
    fs.createReadStream(png).pipe(res);
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
  if (url === '/api/timeline') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    try { res.end(JSON.stringify(timelineModel(dataArg))); }
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
console.log(`    scrub the slider · ← → a frame · shift+← → a second · home/end the ends · space plays`);
console.log(`    timeline below: drag it to seek · hazard bands are dead air (beat-check) · hover a bar for its ramps`);
console.log(`    drag the divider to trade preview height for timeline height (it sticks)`);
console.log(`    theme: light · the toggle switches to the grey room and it sticks · start dark with THEME=dark`);
console.log(`    Ctrl-C to stop.\n`);
