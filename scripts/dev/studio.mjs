// scripts/dev/studio.mjs: a LIVE SCRUBBABLE preview of a scene, for fast iteration without rendering an
// mp4. Starts a local static server and serves a wrapper page: the real scene.html in an iframe, plus a
// scrubber + play/pause + frame/time readout that drive `__engine.renderFrame(n)` directly (the same pure
// function the Go renderer seeks). Edit the JSON, hit reload, scrub, no 30-60s render round-trip.
//
// Under the scrubber is a TIMELINE: one bar per top-level layer against a seconds/frames ruler, with the
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

// LIGHT FIRST. Vawe is a white-first product and names the dark creative-tool look as an anti-reference
// (PRODUCT.md), so the instrument you photograph beside the site cannot be a black box with neon on it.
// The tokens below are `site/app/globals.css` verbatim, because a second palette drifts from the first.
// Dark stays, behind the toggle: the timeline reads well dark and people work at night.
const THEME0 = (process.env.THEME || 'light').toLowerCase() === 'dark' ? 'dark' : 'light';

const studioPage = (fmt) => `<!doctype html><html data-theme=${THEME0}><head><meta charset=utf8><title>vawe studio · ${path.basename(dataArg)}</title>
<style>
 @font-face{font-family:Anybody;src:url(/assets/fonts/Anybody.woff2) format('woff2');font-weight:100 900;font-display:swap}
 @font-face{font-family:'JetBrains Mono';src:url(/assets/fonts/JetBrainsMono.woff2) format('woff2');font-weight:100 800;font-display:swap}
 /* the site's committed tokens. Ink 17:1, ink-2 8:1, muted 5:1, accent 5.17:1, all on white. */
 :root[data-theme=light]{color-scheme:light;
   --accent:#2563eb;--accent-2:#1d4ed8;--accent-soft:#eef3ff;--accent-line:#cfe0ff;
   --bg:#fff;--bg-2:#f6f8fb;--field:#e9ecf1;--surface:#fff;--line:#e7eaf0;--line-2:#d7dce4;
   --ink:#0f1620;--ink-2:#454f5e;--muted:#697182;--ok:#2f7d55;--bad:#a3282d;--bad-bg:#fdf3f3;
   --panel:#fff;--stage:#e9ecf1;--bar-ink:#fff;--wash:#0f1620;--wash-a:.34;
   --shadow:0 1px 2px rgba(16,22,32,.04),0 18px 44px -18px rgba(16,22,32,.24);
   --hz:#a3282d;--hz-beat:#8a5a00;--hz-mute:#697182;--play:#a3282d}
 :root[data-theme=dark]{color-scheme:dark;
   --accent:#5ee0c8;--accent-2:#5ee0c8;--accent-soft:#1d4b41;--accent-line:#5ee0c8;
   --bg:#0b0d12;--bg-2:#11141b;--field:#05060a;--surface:#1b2130;--line:#222;--line-2:#333;
   --ink:#e6e9ef;--ink-2:#9aa4b2;--muted:#7c8797;--ok:#84e06a;--bad:#ff9aa2;--bad-bg:#3a1418;
   --panel:#0e1117;--stage:#05060a;--bar-ink:#08090d;--wash:#0e1117;--wash-a:.62;
   --shadow:0 8px 40px #000a;
   --hz:#ff3b4e;--hz-beat:#ffb02e;--hz-mute:#8a93a3;--play:#ff4d6d}
 body{margin:0;background:var(--bg);color:var(--ink);font:12.5px/1.45 'JetBrains Mono',ui-monospace,Menlo,monospace;display:flex;flex-direction:column;height:100vh}
 #stage{flex:1;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--stage)}
 iframe{border:0;background:var(--bg);box-shadow:var(--shadow);flex:none}
 #bar{display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--surface);border-top:1px solid var(--line)}
 #scrub{flex:1;accent-color:var(--accent)}
 button{background:var(--surface);color:var(--ink);border:1px solid var(--line-2);border-radius:10px;padding:7px 14px;cursor:pointer;
   font:600 12.5px/1 'JetBrains Mono',ui-monospace,monospace}
 button:hover{background:var(--bg-2);border-color:var(--muted)}
 button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
 #read{min-width:158px;font-variant-numeric:tabular-nums;color:var(--ink-2)} b{color:var(--accent);font-weight:700}
 #sel{color:var(--ink-2);min-width:170px}
 /* ---- timeline ---- */
 #tl{background:var(--panel);border-top:1px solid var(--line);display:flex;flex-direction:column;max-height:58vh}
 #tl.off #lanes,#tl.off #alerts{display:none}
 #pick{position:fixed;right:14px;top:14px;width:390px;max-height:74vh;display:none;flex-direction:column;
   background:#12151c;color:#e8ecf3;border:1px solid #2a3140;border-radius:8px;z-index:40;
   font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 18px 50px -12px rgba(0,0,0,.6)}
 #pick.on{display:flex}
 #planel{position:fixed;inset:36px;display:none;flex-direction:column;z-index:60;background:#0e1116;
   border:1px solid #2a3140;border-radius:10px;box-shadow:0 30px 90px -20px rgba(0,0,0,.7)}
 #planel.on{display:flex}
 #planhead{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #2a3140;
   color:#e8ecf3;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
 #planhead b{font-weight:600} #planpath{flex:1;color:#7d8798;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 #planhead button{background:#1c2130;color:#cfd6e2;border:1px solid #2a3140;border-radius:5px;
   padding:.34em .66em;cursor:pointer;font:11px/1 ui-monospace,monospace}
 #planbody{flex:1;overflow:auto;background:#fff;display:flex;align-items:flex-start;justify-content:center}
 #planimg{max-width:100%;display:block}
 #pickhead{display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid #2a3140}
 #pickname{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 #pickhead button{background:#1c2130;color:#cfd6e2;border:1px solid #2a3140;border-radius:5px;
   padding:.32em .6em;cursor:pointer;font:11px/1 ui-monospace,monospace}
 #pickhead button:hover{background:#243044}
 #pickjson{margin:0;padding:11px;overflow:auto;user-select:text;white-space:pre-wrap;color:#cfd6e2}
 #stage{cursor:crosshair}
 #tlhead{display:flex;align-items:center;gap:10px;padding:8px 16px;color:var(--ink-2);font-size:12px;border-bottom:1px solid var(--line)}
 #tlhead b{font-family:Anybody,system-ui,sans-serif;font-variation-settings:'wdth' 105;font-weight:700;font-size:13px;color:var(--ink)}
 #tlhead .sp{flex:1} #tlhead .k{display:inline-flex;align-items:center;gap:4px;margin-left:10px}
 #tlhead .k i{width:9px;height:9px;border-radius:2px;display:inline-block}
 #alerts:empty{display:none}
 #alerts{padding:8px 16px 0;display:flex;flex-wrap:wrap;gap:6px}
 #alerts span{background:var(--bad-bg);border:1px solid var(--bad);color:var(--bad);border-radius:6px;padding:3px 8px;font-size:11px}
 #alerts span.dis{background:var(--bg-2);border-color:var(--line-2);color:var(--ink-2)}
 #lanes{position:relative;overflow-y:auto;overflow-x:hidden;padding:0 16px 12px;cursor:col-resize;flex:1}
 #ruler{position:sticky;top:0;z-index:4;height:34px;background:var(--panel);border-bottom:1px solid var(--line)}
 #ruler .t{position:absolute;top:0;bottom:0;border-left:1px solid var(--line)}
 #ruler .t s{position:absolute;left:4px;top:2px;color:var(--ink-2);text-decoration:none;font-size:11px}
 #ruler .t.end s{left:auto;right:4px}
 #ruler .t s em{color:var(--muted);font-style:normal;margin-left:5px}
 /* a transition is a moment, not a layer: it lives on the ruler, above every track */
 #ruler .m{position:absolute;top:15px;bottom:0;border-left:2px solid;padding-left:3px;font-size:10px;font-weight:700;white-space:nowrap}
 #ruler .ms{position:absolute;top:15px;bottom:0;opacity:.2}
 #rows{position:relative}
 /* the ruler's ticks carried down through the stack. On black the bars glowed against the field and
    stood as a timeline on their own; on white a row of chips floating on paper reads as a chart, and
    the grid is what puts them back on a clock. */
 .grid{position:absolute;top:0;bottom:0;border-left:1px solid var(--line);pointer-events:none}
 .row{position:relative;height:18px}
 .bar{position:absolute;top:1px;height:16px;border-radius:3px;overflow:hidden;color:var(--bar-ink);font-size:11px;line-height:16px;white-space:nowrap;cursor:pointer}
 /* the ramps are the point: an open window is not the same as a readable frame. Both themes DARKEN the
    ramp rather than fading it toward the panel: a bar carries a label, and on white a fill washed toward
    the paper drops white text under 3:1 wherever a long label runs into its own exit ramp. */
 .bar i{position:absolute;top:0;bottom:0;background:var(--wash);opacity:var(--wash-a)}
 .bar i.in{left:0;border-right:1px solid var(--panel)} .bar i.out{right:0;border-left:1px solid var(--panel)}
 /* the tail beat wrapping added. The bar used to be drawn at the REWRITTEN duration with nothing to say
    the author had asked for less, so the picture agreed with the render and quietly overruled the JSON.
    Hatched in the label's own colour, so it reads on every fill in both themes. */
 .bar .held{position:absolute;top:0;bottom:0;right:0;border-left:1px solid var(--bar-ink);
   background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--bar-ink) 42%,transparent) 0 2px,transparent 2px 6px)}
 .bar span{position:absolute;top:0;font-weight:600;pointer-events:none}
 .bar span em{font-style:normal;opacity:.72;font-weight:400}
 /* dead air: the hole the beat-check gate blocks on, drawn where it actually is. On white the hatch
    has to be DARKER than it is on black (a wash that reads as danger over ink disappears over paper),
    and the label needs its own solid chip or the hatch runs straight through the letters. */
 .hz{position:absolute;top:0;bottom:0;z-index:3;pointer-events:none;
   background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--hz) 34%,transparent) 0 6px,color-mix(in srgb,var(--hz) 9%,transparent) 6px 12px);
   border-left:1px solid var(--hz);border-right:1px solid var(--hz)}
 .hz.beat{--hz:var(--hz-beat)} .hz.disputed{--hz:var(--hz-mute)}
 .hz b{position:absolute;top:2px;left:3px;color:var(--hz);font-size:10px;font-weight:700;white-space:nowrap;
   background:var(--panel);border:1px solid var(--hz);padding:0 4px;border-radius:3px}
 /* the boot failure, said out loud. core/boot.js validates the scene before the first frame and parks the
    reason on window.__engineError; studio polled for __engineReady alone, so an invalid scene showed a
    blank stage and a frame counter reading 0 of 0, while the exact message sat one property away. */
 #err{position:absolute;z-index:6;max-width:min(920px,86%);max-height:80%;overflow:auto;
   background:var(--bad-bg);border:1px solid var(--bad);border-radius:12px;box-shadow:var(--shadow);
   padding:16px 18px;color:var(--ink);white-space:pre-wrap;font-size:12.5px;line-height:1.55}
 #err b{display:block;margin-bottom:8px;color:var(--bad);font-family:Anybody,system-ui,sans-serif;
   font-variation-settings:'wdth' 105;font-weight:700;font-size:15px}
 #drag{position:absolute;inset:0;display:none;cursor:grab}
 #drag.on{display:block} #drag.on.dragging{cursor:grabbing;background:color-mix(in srgb,var(--accent) 12%,transparent)}
 .bar.sel{outline:2px solid var(--ink);outline-offset:1px}
 .bar u{position:absolute;top:0;bottom:0;width:2px;background:var(--bar-ink);opacity:.85}
 #key.on{background:var(--accent-soft);border-color:var(--accent-line);color:var(--accent-2)}
 #ph{position:absolute;top:0;bottom:0;width:1px;background:var(--play);z-index:5;pointer-events:none}
 #ph::before{content:'';position:absolute;top:0;left:-4px;border:4px solid transparent;border-top:6px solid var(--play)}
</style></head><body>
 <div id=planel><div id=planhead><b>the plan, drawn from the storyboard</b><span id=planpath></span><button id=planclose>x</button></div><div id=planbody><img id=planimg alt="storyboard panels"></div></div>
 <div id=pick><div id=pickhead><b id=pickname>nothing selected</b><button id=pickcopy>copy JSON</button><button id=pickclose>x</button></div><pre id=pickjson></pre></div>
 <div id=stage><iframe id=sc src="/formats/${fmt}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30"></iframe><div id=drag></div><div id=err hidden></div></div>
 <div id=bar>
  <button id=play>▶ play</button>
  <input id=scrub type=range min=0 max=100 value=0 step=1 aria-label="frame">
  <span id=read>frame 0 / 0 · 0.00s</span>
  <button id=key>◇ key: off</button>
  <button id=undo>⤺ undo</button>
  <span id=sel></span>
  <button id=plan>▤ panels</button>
  <button id=tgl>timeline</button>
  <button id=theme>◐ light</button>
 </div>
 <div id=tl>
  <div id=tlhead><b id=tlwhat>timeline</b><span class=sp></span><span id=tlkey></span></div>
  <div id=alerts></div>
  <div id=lanes><div id=ruler></div><div id=rows></div><div id=ph></div></div>
 </div>
<script>
 const sc=document.getElementById('sc'),scrub=document.getElementById('scrub'),read=document.getElementById('read'),play=document.getElementById('play');
 const lanes=document.getElementById('lanes'),ruler=document.getElementById('ruler'),rows=document.getElementById('rows'),ph=document.getElementById('ph');
 let fps=30,total=0,n=0,playing=false,W=1920,H=1080,dur=1,model=null;
 // ---------- keyframing ----------
 // ONE interaction, end to end: pick a layer, scrub to a frame, drag it. That writes a motion key at
 // that frame. Everything else an editor eventually needs (curves, paths, onion skin) sits on top of
 // this loop, and none of it matters until this loop is trustworthy.
 let FITS=1, keyMode=false, selIdx=-1, selStart=0, selLabel='', dragging=null;
 const dragEl=document.getElementById('drag'), keyBtn=document.getElementById('key'), selOut=document.getElementById('sel');
 function setSel(i){ selIdx=i; const L=model&&model.layers.find(l=>l.i===i);
   selStart=L?L.start:0; selLabel=L?(L.type+' '+(L.label||'')):'';
   selReadout();
   [...rows.querySelectorAll('.bar')].forEach(b=>b.classList.toggle('sel',+b.dataset.i===i)); }
 // a key lands at the layer's LOCAL time, so that is the number the readout has to show, live. Before
 // this it froze at whatever it was when you clicked, which is the one moment it does not matter.
 // ---- THE PLAN, one keypress away ---------------------------------------------------------------
 // The storyboard decided these beats and the film is the answer to it. Studio showed only the answer.
 const planel=document.getElementById('planel'), planImg=document.getElementById('planimg'),
       planPath=document.getElementById('planpath');
 function openPlan(){
   planel.classList.add('on'); planPath.textContent='drawing...';
   // cache-busted every open, because the server redraws when the storyboard is newer than the sheet
   // and a browser holding the old png would show a plan that has already changed.
   fetch('/__panels?t='+Date.now()).then(r=>{
     if(!r.ok) return r.text().then(t=>{ planPath.textContent=t.split(String.fromCharCode(10))[0]; planImg.removeAttribute('src'); });
     planPath.textContent=r.headers.get('X-Storyboard')||'';
     return r.blob().then(b=>{ planImg.src=URL.createObjectURL(b); }); })
    .catch(e=>{ planPath.textContent='could not draw the panels: '+e.message; });
 }
 document.getElementById('plan').addEventListener('click',openPlan);
 document.getElementById('planclose').addEventListener('click',()=>planel.classList.remove('on'));
 window.addEventListener('keydown',(e)=>{
   if(e.key==='Escape') planel.classList.remove('on');
   // The p key opens the plan, the way space plays. Not while typing in a field.
   if((e.key==='p'||e.key==='P') && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName))
     planel.classList.contains('on')?planel.classList.remove('on'):openPlan(); });
 // ---- THE PICKER: click the picture, get the JSON that made it ----------------------------------
 // The timeline could already select a layer by its BAR. Nothing could select one by looking at it, so
 // describing a problem meant describing where it was on screen and hoping. Now a click hit-tests the
 // rendered frame and hands back the exact object, which is the thing you paste to somebody who can
 // change it. The backdrop is selectable too: it is a layer of the film in every sense that matters.
 const pick=document.getElementById('pick'), pickName=document.getElementById('pickname'),
       pickJson=document.getElementById('pickjson');
 function bgAt(t){ if(!model) return null;
   const bg=model.bg||[]; if(!bg.length) return null;
   // Windows bound to junctions carry no from/to, so which one is showing has to come from the ENGINE,
   // never re-derived here: core/junctions.js owns that and a second answer would drift from it.
   let i=0; for(let k=0;k<bg.length;k++){ const w=bg[k]; if(w&&w.from!=null&&t>=w.from) i=k; }
   // Windows with no from/to are bound to the film's joints by core/junctions.js, one each in order,
   // so the marks studio already parsed give the same answer without re-deriving it here.
   if(bg.length>1 && bg.every(w=>w&&w.from==null)){
     const joints=(model.marks||[]).filter(m=>m.kind!=='sting').map(m=>m.t).sort((a,b)=>a-b);
     i=0; for(let k=0;k<joints.length && t>=joints[k];k++) i=Math.min(k+1,bg.length-1); }
   return { i, win: bg[i], count: bg.length }; }
 function showPick(kind, name, obj, extra){
   pick.classList.add('on'); pickName.textContent=name;
   pickJson.textContent=(extra?extra+String.fromCharCode(10):'')+JSON.stringify(obj,null,2); }
 document.getElementById('pickclose').addEventListener('click',()=>pick.classList.remove('on'));
 document.getElementById('pickcopy').addEventListener('click',()=>{
   const b=document.getElementById('pickcopy');
   navigator.clipboard.writeText(pickJson.textContent).then(()=>{
     b.textContent='copied'; setTimeout(()=>b.textContent='copy JSON',1200); }); });
 sc.addEventListener('load',()=>{ try{
   const doc=sc.contentDocument; if(!doc) return;
   doc.addEventListener('click',(ev)=>{
     if(!model) return;
     // topmost FIRST: elementsFromPoint is painted order reversed, which is what "the thing you
     // clicked on" means when layers overlap.
     const hit=(doc.elementsFromPoint(ev.clientX,ev.clientY)||[])
       .map(el=>el.closest && el.closest('.hs-layer')).find(Boolean);
     const t=n/fps;
     if(hit && hit.dataset.idx!=null){
       const i=+hit.dataset.idx, m=model.layers.find(l=>l.i===i), L=m&&m.raw;
       if(L){ setSel(i);
         showPick('layer','layers['+i+']  '+(L.type||'?'),L,
           '// frame '+n+' ('+t.toFixed(2)+'s) of '+total+'   layers['+i+']'); return; } }
     const b=bgAt(t);
     if(b) showPick('bg','bg['+b.i+']  backdrop',b.win,
       '// frame '+n+' ('+t.toFixed(2)+'s)   bg window '+(b.i+1)+' of '+b.count+
       ', bound to the film'+String.fromCharCode(39)+'s own cuts');
   },true);
 }catch(err){ /* a cross-origin doc cannot be picked; the timeline still selects */ } });
 function selReadout(){ if(selIdx<0){ selOut.textContent=''; return; }
   const lt=n/fps-selStart;
   selOut.textContent='▸ '+selLabel+'  ·  key at '+lt.toFixed(2)+'s'+(lt<0?'  (before it starts)':''); }
 keyBtn.addEventListener('click',()=>{ keyMode=!keyMode; keyBtn.classList.toggle('on',keyMode);
   keyBtn.textContent='◇ key: '+(keyMode?'on':'off'); dragEl.classList.toggle('on',keyMode); });
 document.getElementById('undo').addEventListener('click',async()=>{
   const r=await fetch('/api/undo',{method:'POST'}).then(x=>x.json());
   if(r.ok) reloadScene(); else selOut.textContent='⚠ '+r.error; });
 function reloadScene(){ const keep=n; sc.src=sc.src; sc.addEventListener('load',()=>{ ready(); setTimeout(()=>{ n=Math.min(keep,total); draw(); },120); },{once:true}); }
 dragEl.addEventListener('pointerdown',e=>{
   if(!keyMode) return;
   if(selIdx<0){ selOut.textContent='⚠ click a layer bar first'; return; }
   dragEl.setPointerCapture(e.pointerId); dragEl.classList.add('dragging');
   dragging={x0:e.clientX,y0:e.clientY,dx:0,dy:0}; });
 dragEl.addEventListener('pointermove',e=>{
   if(!dragging) return;
   dragging.dx=(e.clientX-dragging.x0)/FITS; dragging.dy=(e.clientY-dragging.y0)/FITS;
   selOut.textContent='▸ drag  '+Math.round(dragging.dx)+', '+Math.round(dragging.dy)+' px'; });
 dragEl.addEventListener('pointerup',async e=>{
   if(!dragging) return;
   const d=dragging; dragging=null; dragEl.classList.remove('dragging');
   if(Math.abs(d.dx)<1&&Math.abs(d.dy)<1) return;
   // the key carries the layer's CURRENT offset at this frame plus the drag, so dragging a layer that
   // already has a track nudges from where it is rather than snapping back to the origin
   const cur=offsetAt(selIdx,n/fps-selStart);
   const body={layer:selIdx,t:n/fps-selStart,x:cur.x+d.dx,y:cur.y+d.dy};
   const r=await fetch('/api/key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(x=>x.json());
   selOut.textContent=r.ok?('✓ key @'+body.t.toFixed(2)+'s · '+r.keys+' keys'):('⚠ '+r.error);
   if(r.ok&&r.changed) reloadScene(); });
 // where the layer already is at local time lt, read from the engine's own interpolator via the iframe
 function offsetAt(i,lt){ try{ const e=sc.contentWindow.__engine; const L=(e&&e.data&&e.data.layers)||[];
   const m=L[i]&&L[i].motion; if(!m||!m.length) return {x:0,y:0};
   let a=m[0]; for(const k of m){ if((k.t??0)<=lt) a=k; }
   return {x:a.x??0,y:a.y??0}; }catch(_){ return {x:0,y:0}; } }
 function fit(){ // scale the iframe to fit the stage, preserving the canvas aspect
   const st=document.getElementById('stage'),pad=32; const s=Math.min((st.clientWidth-pad)/W,(st.clientHeight-pad)/H);
   sc.style.width=W+'px';sc.style.height=H+'px';sc.style.transform='scale('+s+')';sc.style.transformOrigin='center';
   FITS=s;
 }
 function draw(){ const e=sc.contentWindow.__engine; if(!e)return; e.renderFrame(n); read.innerHTML='frame <b>'+n+'</b> / '+total+' · '+(n/fps).toFixed(2)+'s'; scrub.value=n; ph.style.left='calc(16px + '+pc(n/fps)+')'; if(selIdx>=0&&!dragging)selReadout(); }
 const errBox=document.getElementById('err');
 // The engine already knows why it did not boot, core/boot.js runs core/validate.mjs before the first
 // frame and parks the reason on __engineError. Waiting only on __engineReady turned that into a blank
 // stage, which is the same picture a slow load gives, so the one state that needs a message had none.
 // The deadline covers the third case: neither flag ever arrives (a syntax error before boot even runs).
 // AN ERROR YOU CANNOT COPY IS AN ERROR YOU RETYPE BY HAND. The box printed the engine's message and
 // nothing else: no way to select it cleanly, and nothing outside the browser ever heard about it, so
 // the terminal that started studio sat there looking healthy while the page showed a stack trace. Now
 // the text is selectable, one button copies it, and it is POSTed to the server so it lands in the
 // terminal too. That last part is the one that matters when somebody else is driving.
 function fail(title,detail){ errBox.hidden=false;
   errBox.innerHTML='<b></b><pre></pre><button class="ecopy">copy</button>';
   errBox.querySelector('b').textContent=title;
   const pre=errBox.querySelector('pre');
   pre.textContent=detail; pre.style.cssText='white-space:pre-wrap;user-select:text;margin:.5em 0;font:12px/1.5 ui-monospace,monospace';
   const btn=errBox.querySelector('.ecopy');
   btn.style.cssText='font:11px/1 ui-monospace,monospace;padding:.4em .7em;cursor:pointer';
   btn.onclick=()=>{ navigator.clipboard.writeText(title+'\\n'+detail).then(()=>{btn.textContent='copied';setTimeout(()=>btn.textContent='copy',1200);}); };
   read.textContent='scene did not load';
   try{ fetch('/__err',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({title:title,detail:detail})}); }catch(e){}
 }
 function ready(deadline){ const w=sc.contentWindow;
   if(w.__engineError) return fail('this scene does not render',String(w.__engineError));
   if(!w.__engineReady||!w.__engine){
     const dl=deadline||Date.now()+20000;
     if(Date.now()>dl) return fail('the scene never signalled ready',
       'No __engineReady and no __engineError after 20s. The page failed before core/boot.js could report, open '+sc.src+' directly and read the console.');
     return setTimeout(()=>ready(dl),80); }
   errBox.hidden=true;
   const m=w.__engine.meta||{}; fps=m.fps||30; dur=m.duration||5; total=Math.max(1,Math.round(dur*fps)); W=m.width||1920;H=m.height||1080; scrub.max=total; fit(); timeline(); n=0; draw(); }
 sc.addEventListener('load',()=>ready()); window.addEventListener('resize',fit);
 // the stage resizes without the WINDOW resizing (the timeline expands, a hazard band wraps), and a
 // scale computed against the old height overflows and clips the frame
 if(window.ResizeObserver) new ResizeObserver(()=>fit()).observe(document.getElementById('stage'));
 scrub.addEventListener('input',()=>{ n=+scrub.value; draw(); });
 function loop(){ if(!playing)return; n=(n+1)%(total+1); draw(); setTimeout(()=>requestAnimationFrame(loop),1000/fps); }
 play.addEventListener('click',()=>{ playing=!playing; play.textContent=playing?'⏸ pause':'▶ play'; if(playing)loop(); });
 addEventListener('keydown',e=>{ if(e.key==='ArrowRight'){n=Math.min(total,n+1);draw();} if(e.key==='ArrowLeft'){n=Math.max(0,n-1);draw();} if(e.key===' '){e.preventDefault();play.click();} });

 // ---------- timeline ----------
 const pc=(t)=>(100*Math.max(0,Math.min(1,t/dur)))+'%';
 const esc=(s)=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 // A lane bar carries its own label, so the fill and the label have to pass contrast TOGETHER. Dark
 // keeps the light-on-dark neons (dark label). Light inverts the relationship rather than the colours:
 // saturated fills carrying WHITE labels, every one at or above 4.9:1 against white, the same trick a
 // status chip uses, and the reason the stack still reads as bars rather than as highlighted prose.
 const PALETTE={
  dark:{color:{text:'#5ee0c8',type:'#5ee0c8',count:'#84e06a',image:'#f0a35e',rect:'#5c6b86',component:'#b78bf0',html:'#b78bf0',
    group:'#e05e8a',glow:'#e0d05e',svg:'#e0d05e',paint:'#e0d05e',shader:'#e0d05e',clip:'#5e9ef0',board:'#f06e6e',doc:'#f06e6e',beat:'#f0c05e'},
   mark:{cut:'#ff9f43',seam:'#b78bf0',sting:'#ffd93d'},fallback:'#7d8799'},
  light:{color:{text:'#2563eb',type:'#2563eb',count:'#2f7d55',image:'#9a5410',rect:'#697182',component:'#6d3fd4',html:'#6d3fd4',
    group:'#a8296b',glow:'#7d6210',svg:'#7d6210',paint:'#7d6210',shader:'#7d6210',clip:'#0f6b9c',board:'#8e3b2f',doc:'#8e3b2f',beat:'#8a5a00'},
   mark:{cut:'#9a5410',seam:'#6d3fd4',sting:'#8a5a00'},fallback:'#5b6474'},
 };
 let COLOR=PALETTE.light.color,MARK=PALETTE.light.mark,FALLBACK=PALETTE.light.fallback;
 const themeBtn=document.getElementById('theme');
 function applyTheme(t){ document.documentElement.dataset.theme=t;
   COLOR=PALETTE[t].color; MARK=PALETTE[t].mark; FALLBACK=PALETTE[t].fallback;
   themeBtn.textContent='◐ '+t; try{ localStorage.setItem('vawe-studio-theme',t); }catch(_){}
   if(model) paint(model); }
 themeBtn.addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
 applyTheme((()=>{ try{ return localStorage.getItem('vawe-studio-theme')||document.documentElement.dataset.theme; }
   catch(_){ return document.documentElement.dataset.theme; } })());
 // The bars come from the LIVE DOM, not from the JSON: the engine writes each clip's real window and ramp
 // into data-start/duration/enter/exitDur (core/clips.js reads exactly these), and that survives the theme's
 // durationScale, sceneUnits rewrites and the produced baseline. The JSON only supplies the label.
 function domBars(){
   const doc=sc.contentDocument;
   return [...doc.querySelectorAll('.hs-layer[data-start]')]
     .filter(el=>!el.parentElement.closest('.hs-layer'))  // top-level only: a group's window covers its children
     .map(el=>{ const d=el.dataset, s=+d.start||0, w=d.duration!=null?+d.duration:dur-s;
       return { s, w:Math.max(0,Math.min(w,dur-s)), enter:d.enter!=null?+d.enter:.3, exit:d.exitDur!=null?+d.exitDur:.26,
                // what the AUTHOR wrote, when beat wrapping overruled it. The engine records both now,
                // so the bar can draw the authored window and the held tail as two different things
                // instead of drawing the rewritten number and calling it the layer.
                aw:d.authoredDuration!=null?+d.authoredDuration:null,
                anim:d.anim||'', out:d.out||'', txt:(el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,44),
                cls:(el.className.match(/hs-(img-wrap|rect|comp-wrap|group|text)/)||[])[1] }; });
 }
 const CLS={'img-wrap':'image','comp-wrap':'component','rect':'rect','group':'group','text':'text'};
 function timeline(){
   fetch('/api/timeline').then(r=>r.json()).then(m=>{ model=m; paint(m); }).catch(e=>{ document.getElementById('tlwhat').textContent='timeline unavailable: '+e; });
 }
 function paint(m){
   const bars=domBars();
   // name each bar: consume the first unclaimed JSON layer that starts at the same instant. A layer the
   // produced baseline added has no JSON entry and falls back to what the DOM says it is.
   const pool=m.layers.slice();
   for(const b of bars){ const i=pool.findIndex(L=>Math.abs(L.start-b.s)<1e-3); const L=i>=0?pool.splice(i,1)[0]:null;
     b.type=L?L.type:(CLS[b.cls]||'text'); b.name=(L&&L.label)||b.txt||'';
     // the JSON index, when this bar could be paired with a declared layer. A bar the produced baseline
     // invented has none, and must not be selectable: there is nothing on disk to write a key into.
     b.i=L?L.i:-1; b.keys=(L&&L.keys)||[];
     // the engine can hold a layer open past its declared window (produceBaseline turns sceneUnits on for
     // any scene with cuts, and a beat's layers then live through the beat's exit slide). The engine says
     // so itself now, per layer, so take its word: pairing a bar to a JSON layer by start time is a guess,
     // and it was the only source of this number before data-authored-duration existed.
     b.grew=b.aw!=null?Math.max(0,b.w-b.aw):(L?Math.max(0,(b.s+b.w)-(L.start+L.dur)):0); }
   const grown=bars.filter(b=>b.grew>0.01).map(b=>[b.s+ (b.w-b.grew), b.s+b.w]);
   bars.sort((a,b)=>a.s-b.s||a.w-b.w);
   // ruler: a tick per beat of the clock, labelled in seconds AND frames
   const step=dur<=6?.5:dur<=16?1:dur<=45?2:5;
   let r='';
   for(let t=0;t<=dur+1e-6;t+=step) r+='<div class="t'+(t>dur-step*.6?' end':'')+'" style="left:'+pc(t)+'"><s>'+(+t.toFixed(2))+'s<em>'+Math.round(t*fps)+'f</em></s></div>';
   for(const k of m.marks){ const c=MARK[k.kind]||'#fff';
     r+='<div class=ms style="left:'+pc(k.t)+';width:'+(100*k.dur/dur)+'%;background:'+c+'"></div>'
       +'<div class=m style="left:'+pc(k.t)+';border-color:'+c+';color:'+c+'" title="'+esc(k.kind+' '+k.t+'s'+(k.name?' '+k.name:''))+'">'+k.kind.charAt(0).toUpperCase()+'</div>'; }
   ruler.innerHTML=r;
   let h='';
   for(let t=step;t<=dur+1e-6;t+=step) h+='<div class=grid style="left:'+pc(t)+'"></div>';
   for(const b of bars){ const c=COLOR[b.type]||FALLBACK, wpc=100*b.w/dur, inp=b.w?100*Math.min(b.enter,b.w)/b.w:0, outp=b.w?100*Math.min(b.exit,b.w)/b.w:0;
     const heldp=b.grew>0.005&&b.w?100*Math.min(b.grew,b.w)/b.w:0;
     h+='<div class=row><div class=bar data-i="'+(b.i??-1)+'" data-t="'+b.s+'" style="left:'+pc(b.s)+';width:'+wpc+'%;background:'+c+'" title="'+esc(b.type+' '+(b.name||'')+' · '+b.s.toFixed(2)+'s → '+(b.s+b.w).toFixed(2)+'s · enter '+b.enter+'s / exit '+b.exit+'s'+(b.anim?' · '+b.anim:'')+(b.out?' → '+b.out:'')+(heldp?' · authored to '+(b.s+b.w-b.grew).toFixed(2)+'s, held '+b.grew.toFixed(2)+'s longer by beat wrapping':''))+'">'
       +(heldp?'<div class=held style="width:'+heldp+'%"></div>':'')
       +'<i class=in style="width:'+inp+'%"></i><i class=out style="width:'+outp+'%"></i>'
       +(b.keys||[]).map(kt=>'<u style="left:'+(b.w?100*Math.max(0,Math.min(1,kt/b.w)):0)+'%"></u>').join('')
       +'<span style="left:calc('+inp+'% + 4px)">'+esc(b.type)+' <em>'+esc(b.name)+'</em></span></div></div>'; }
   // the hazard bands stretch the whole track stack, so a hole is impossible to miss
   const holes=[...m.gate.deadAir.map(x=>[x[0],x[1],'dead air','']),
                ...(m.gate.tail?[[m.gate.tail,m.gate.duration||dur,'ends on nothing','']]:[]),
                ...m.gate.emptyBeat.map(x=>[x[0],x[1],'empty beat','beat'])];
   for(const [a,b,lab,cls] of holes){
     const dis=grown.some(([x,y])=>x<b-1e-9&&y>a+1e-9);
     h+='<div class="hz '+(dis?'disputed':cls)+'" style="left:'+pc(a)+';width:'+(100*(b-a)/dur)+'%"><b>'+(dis?'disputed ':'')+lab+' '+(b-a).toFixed(2)+'s</b></div>'; }
   rows.innerHTML=h;
   rows.style.height=(bars.length*18)+'px';
   document.getElementById('tlwhat').textContent=m.file+' · '+bars.length+' layers · '+dur.toFixed(2)+'s / '+total+'f';
   document.getElementById('tlkey').innerHTML=[...new Set(bars.map(b=>b.type))]
     .map(t=>'<span class=k><i style="background:'+(COLOR[t]||FALLBACK)+'"></i>'+esc(t)+'</span>').join('');
   document.getElementById('alerts').innerHTML=holes.map(([a,b,lab])=>{
     const dis=grown.some(([x,y])=>x<b-1e-9&&y>a+1e-9);
     return '<span'+(dis?' class=dis':'')+'>'+(dis?'? ':'⚠ ')+lab+' '+a.toFixed(2)+'s → '+b.toFixed(2)+'s'
       +(dis?': the engine holds a window open here that the JSON does not declare, so beat-check may be reading a hole that does not render':'')+'</span>'; }).join('');
 }
 // drag anywhere in the lanes to seek; the playhead and the scrubber are the same value
 const seek=(e)=>{ const r=ruler.getBoundingClientRect(); n=Math.max(0,Math.min(total,Math.round((e.clientX-r.left)/r.width*dur*fps))); draw(); };
 lanes.addEventListener('pointerdown',e=>{
   // BEFORE the capture: setPointerCapture retargets everything that follows to the lanes element, so
   // a click handler on the bar never sees its own bar and selection silently did nothing.
   const bar=e.target&&e.target.closest&&e.target.closest('.bar');
   if(bar){ const i=+bar.dataset.i;
     if(i<0) selOut.textContent='⚠ that bar has no JSON layer (the produced baseline added it)';
     else setSel(i); }
   lanes.setPointerCapture(e.pointerId); seek(e); });
 lanes.addEventListener('pointermove',e=>{ if(e.buttons&1) seek(e); });
 document.getElementById('tgl').addEventListener('click',()=>document.getElementById('tl').classList.toggle('off'));
</script></body></html>`;

// Studio's own endpoints. Anything it does not answer falls through to the shared static handler.
const studioRoutes = (req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/studio') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(studioPage('scene')); return true; }
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
console.log(`    scrub the slider · ← → step a frame · space plays · edit the JSON + reload to see changes`);
console.log(`    timeline below: drag it to seek · hazard bands are dead air (beat-check) · hover a bar for its ramps`);
console.log(`    theme: light (◐ toggles to dark, and it sticks) · start dark with THEME=dark`);
console.log(`    Ctrl-C to stop.\n`);
