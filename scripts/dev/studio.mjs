// scripts/dev/studio.mjs — a LIVE SCRUBBABLE preview of a scene, for fast iteration without rendering an
// mp4. Starts a local static server and serves a wrapper page: the real scene.html in an iframe, plus a
// scrubber + play/pause + frame/time readout that drive `__engine.renderFrame(n)` directly (the same pure
// function the Go renderer seeks). Edit the JSON, hit reload, scrub — no 30-60s render round-trip.
//
// Under the scrubber is a TIMELINE: one bar per top-level layer against a seconds/frames ruler, with the
// cuts/seams/stings marked, the enter/exit ramps shaded off the settled middle, and every dead-air hole
// painted as a hazard band. It answers the question a contact sheet cannot — what is on screen WHEN.
//
//   make studio D=formats/scene/<file>.json [PORT=8799]   → open the printed URL, leave it running (Ctrl-C to stop)
//
// DEV TOOLING ONLY — it does not touch the renderer or the determinism contract; it just calls the engine's
// own renderFrame(n) from the parent frame (same-origin), exactly as the Go capture loop does per frame.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { patchMotion, upsertKey } from '../author/patch-motion.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataArg = process.env.D || process.argv[2];
if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: make studio D=formats/scene/<file>.json [PORT=8799]'); process.exit(2); }
const dataUrl = '/' + path.relative(repoRoot, path.resolve(dataArg)).split(path.sep).join('/');
const PORT = Number(process.env.PORT) || 8799;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

// ---------- the timeline model ----------
// Where "dead air" comes from. The definition (which layers count as content: a full-canvas opaque rect
// is a blackout, a box under 8% of the canvas is a speck, track:0 is backdrop) lives in
// scripts/gates/beat-check.mjs. That file is a SCRIPT, not a module — it reads process.argv and calls
// process.exit at top level — so it cannot be imported into a long-lived server. Restating its rules here
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
    // "6.38s to 6.86s (0.48s) · …" — the trailing "(" keeps the fix prose ("anything under 0.40s") out.
    deadAir: spans(finding('dead-air'), /([\d.]+)s to ([\d.]+)s \(/g),
    emptyBeat: spans(finding('empty-beat'), /at ([\d.]+)s \(to ([\d.]+)s\)/g),
    tail: +((finding('ends-on-nothing').match(/from ([\d.]+)s\)/) || [])[1] || 0) || null,
    duration: +((out.match(/content layer\(s\) · ([\d.]+)s/) || [])[1] || 0) || null,
    codes: [...out.matchAll(/✗ \[([a-z-]+)\]/g)].map((m) => m[1]),
  };
};

// The JSON's own view of the film: the transition markers, and a label pool the page matches its DOM bars
// against (the DOM knows the real timing, the JSON knows what each layer IS).
const label = (L) => L.id || (L.text && String(L.text).replace(/<[^>]*>/g, '').trim())
  || (L.src && path.basename(String(L.src))) || L.comp || L.capture || L.preset || '';
// UNDO is a stack of whole previous file contents. A scene is a few kilobytes and an editing session is
// tens of edits, so keeping the bytes is simpler and more honest than replaying inverse operations —
// there is no way for it to drift from what is on disk.
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
      .map((L, i) => ({ i, type: L.type || 'text', label: label(L), start: L.start ?? 0, dur: L.duration ?? L.dur ?? 2,
        keys: Array.isArray(L.motion) ? L.motion.map((k) => k.t ?? 0) : [] })),
    gate: beatCheck(file),
  };
};

const studioPage = (fmt) => `<!doctype html><html><head><meta charset=utf8><title>vawe studio · ${path.basename(dataArg)}</title>
<style>
 :root{color-scheme:dark} body{margin:0;background:#0b0d12;color:#e6e9ef;font:14px/1.4 ui-monospace,Menlo,monospace;display:flex;flex-direction:column;height:100vh}
 #stage{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#05060a}
 iframe{border:0;background:#000;box-shadow:0 8px 40px #000a}
 #bar{display:flex;align-items:center;gap:14px;padding:12px 16px;background:#11141b;border-top:1px solid #222}
 #scrub{flex:1;accent-color:#5ee0c8} button{background:#1b2130;color:#e6e9ef;border:1px solid #333;border-radius:8px;padding:7px 14px;cursor:pointer;font:inherit}
 button:hover{background:#232b3d} #read{min-width:150px;font-variant-numeric:tabular-nums;color:#9aa4b2} b{color:#5ee0c8}
 /* ---- timeline ---- */
 #tl{background:#0e1117;border-top:1px solid #222;display:flex;flex-direction:column;max-height:58vh}
 #tl.off #lanes,#tl.off #alerts{display:none}
 #tlhead{display:flex;align-items:center;gap:10px;padding:7px 16px;color:#7c8797;font-size:12px;border-bottom:1px solid #1b202b}
 #tlhead .sp{flex:1} #tlhead .k{display:inline-flex;align-items:center;gap:4px;margin-left:10px}
 #tlhead .k i{width:9px;height:9px;border-radius:2px;display:inline-block}
 #alerts:empty{display:none}
 #alerts{padding:6px 16px 0;display:flex;flex-wrap:wrap;gap:6px}
 #alerts span{background:#3a1418;border:1px solid #7d2530;color:#ff9aa2;border-radius:5px;padding:2px 8px;font-size:11px}
 #alerts span.dis{background:#1a1e26;border-color:#39404d;color:#aab3c2}
 #lanes{position:relative;overflow-y:auto;overflow-x:hidden;padding:0 16px 12px;cursor:col-resize;flex:1}
 #ruler{position:sticky;top:0;z-index:4;height:34px;background:#0e1117;border-bottom:1px solid #1b202b}
 #ruler .t{position:absolute;top:0;bottom:0;border-left:1px solid #222836}
 #ruler .t s{position:absolute;left:4px;top:2px;color:#8a94a4;text-decoration:none;font-size:11px}
 #ruler .t.end s{left:auto;right:4px}
 #ruler .t s em{color:#4c5666;font-style:normal;margin-left:5px}
 /* a transition is a moment, not a layer — it lives on the ruler, above every track */
 #ruler .m{position:absolute;top:15px;bottom:0;border-left:2px solid;padding-left:3px;font-size:10px;font-weight:700;white-space:nowrap}
 #ruler .ms{position:absolute;top:15px;bottom:0;opacity:.2}
 #rows{position:relative}
 .row{position:relative;height:18px}
 .bar{position:absolute;top:1px;height:16px;border-radius:3px;overflow:hidden;color:#08090d;font-size:11px;line-height:16px;white-space:nowrap;cursor:pointer}
 /* the ramps are the point: an open window is not the same as a readable frame */
 .bar i{position:absolute;top:0;bottom:0;background:#0e1117;opacity:.62}
 .bar i.in{left:0;border-right:1px solid #0e1117} .bar i.out{right:0;border-left:1px solid #0e1117}
 .bar span{position:absolute;top:0;font-weight:600;text-shadow:0 1px 0 #fff3;pointer-events:none}
 .bar span em{font-style:normal;opacity:.62;font-weight:500}
 /* dead air: the hole the beat-check gate blocks on, drawn where it actually is */
 .hz{position:absolute;top:0;bottom:0;z-index:3;pointer-events:none;background:repeating-linear-gradient(135deg,#ff3b4e33 0 6px,#ff3b4e0d 6px 12px);border-left:1px solid #ff3b4ecc;border-right:1px solid #ff3b4ecc}
 .hz.beat{background:repeating-linear-gradient(135deg,#ffb02e33 0 6px,#ffb02e0d 6px 12px);border-color:#ffb02ecc}
 .hz.disputed{background:repeating-linear-gradient(135deg,#8a93a333 0 6px,#8a93a30d 6px 12px);border-color:#8a93a3aa}
 .hz b{position:absolute;top:2px;left:3px;color:#ff8b95;font-size:10px;white-space:nowrap;background:#12060a;padding:0 3px;border-radius:2px}
 .hz.beat b{color:#ffc46a;background:#120c04} .hz.disputed b{color:#aab3c2;background:#0e1117}
 #drag{position:absolute;inset:0;display:none;cursor:grab}
 #drag.on{display:block} #drag.on.dragging{cursor:grabbing;background:#5ee0c81a}
 .bar.sel{outline:2px solid #fff;outline-offset:1px}
 .bar u{position:absolute;top:0;bottom:0;width:2px;background:#fff;opacity:.85}
 #key.on{background:#1d4b41;border-color:#5ee0c8;color:#5ee0c8}
 #ph{position:absolute;top:0;bottom:0;width:1px;background:#ff4d6d;z-index:5;pointer-events:none;box-shadow:0 0 6px #ff4d6d}
 #ph::before{content:'';position:absolute;top:0;left:-4px;border:4px solid transparent;border-top:6px solid #ff4d6d}
</style></head><body>
 <div id=stage><iframe id=sc src="/formats/${fmt}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30"></iframe><div id=drag></div></div>
 <div id=bar>
  <button id=play>▶ play</button>
  <input id=scrub type=range min=0 max=100 value=0 step=1>
  <span id=read>frame 0 / 0 · 0.00s</span>
  <button id=key>◇ key: off</button>
  <button id=undo>⤺ undo</button>
  <span id=sel style="color:#7c8797;min-width:170px"></span>
  <button id=tgl>timeline</button>
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
 let FITS=1, keyMode=false, selIdx=-1, selStart=0, dragging=null;
 const dragEl=document.getElementById('drag'), keyBtn=document.getElementById('key'), selOut=document.getElementById('sel');
 function setSel(i){ selIdx=i; const L=model&&model.layers.find(l=>l.i===i);
   selStart=L?L.start:0;
   selOut.textContent=L?('▸ '+L.type+' '+(L.label||'')+'  ·  local t '+(n/fps-selStart).toFixed(2)+'s'):'';
   [...rows.querySelectorAll('.bar')].forEach(b=>b.classList.toggle('sel',+b.dataset.i===i)); }
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
 function draw(){ const e=sc.contentWindow.__engine; if(!e)return; e.renderFrame(n); read.innerHTML='frame <b>'+n+'</b> / '+total+' · '+(n/fps).toFixed(2)+'s'; scrub.value=n; ph.style.left='calc(16px + '+pc(n/fps)+')'; }
 function ready(){ const w=sc.contentWindow; if(!w.__engineReady||!w.__engine){return setTimeout(ready,80);} const m=w.__engine.meta||{}; fps=m.fps||30; dur=m.duration||5; total=Math.max(1,Math.round(dur*fps)); W=m.width||1920;H=m.height||1080; scrub.max=total; fit(); timeline(); n=0; draw(); }
 sc.addEventListener('load',ready); window.addEventListener('resize',fit);
 scrub.addEventListener('input',()=>{ n=+scrub.value; draw(); });
 function loop(){ if(!playing)return; n=(n+1)%(total+1); draw(); setTimeout(()=>requestAnimationFrame(loop),1000/fps); }
 play.addEventListener('click',()=>{ playing=!playing; play.textContent=playing?'⏸ pause':'▶ play'; if(playing)loop(); });
 addEventListener('keydown',e=>{ if(e.key==='ArrowRight'){n=Math.min(total,n+1);draw();} if(e.key==='ArrowLeft'){n=Math.max(0,n-1);draw();} if(e.key===' '){e.preventDefault();play.click();} });

 // ---------- timeline ----------
 const pc=(t)=>(100*Math.max(0,Math.min(1,t/dur)))+'%';
 const esc=(s)=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 const COLOR={text:'#5ee0c8',type:'#5ee0c8',count:'#84e06a',image:'#f0a35e',rect:'#5c6b86',component:'#b78bf0',html:'#b78bf0',
   group:'#e05e8a',glow:'#e0d05e',svg:'#e0d05e',paint:'#e0d05e',shader:'#e0d05e',clip:'#5e9ef0',board:'#f06e6e',doc:'#f06e6e',beat:'#f0c05e'};
 const MARK={cut:'#ff9f43',seam:'#b78bf0',sting:'#ffd93d'};
 // The bars come from the LIVE DOM, not from the JSON: the engine writes each clip's real window and ramp
 // into data-start/duration/enter/exitDur (core/clips.js reads exactly these), and that survives the theme's
 // durationScale, sceneUnits rewrites and the produced baseline. The JSON only supplies the label.
 function domBars(){
   const doc=sc.contentDocument;
   return [...doc.querySelectorAll('.hs-layer[data-start]')]
     .filter(el=>!el.parentElement.closest('.hs-layer'))  // top-level only: a group's window covers its children
     .map(el=>{ const d=el.dataset, s=+d.start||0, w=d.duration!=null?+d.duration:dur-s;
       return { s, w:Math.max(0,Math.min(w,dur-s)), enter:d.enter!=null?+d.enter:.3, exit:d.exitDur!=null?+d.exitDur:.26,
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
     // any scene with cuts, and a beat's layers then live through the beat's exit slide). beat-check reads
     // the JSON, so it cannot see that — and would report a hole the rendered film does not have.
     b.grew=L?Math.max(0,(b.s+b.w)-(L.start+L.dur)):0; }
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
   for(const b of bars){ const c=COLOR[b.type]||'#7d8799', wpc=100*b.w/dur, inp=b.w?100*Math.min(b.enter,b.w)/b.w:0, outp=b.w?100*Math.min(b.exit,b.w)/b.w:0;
     h+='<div class=row><div class=bar data-i="'+(b.i??-1)+'" data-t="'+b.s+'" style="left:'+pc(b.s)+';width:'+wpc+'%;background:'+c+'" title="'+esc(b.type+' '+(b.name||'')+' · '+b.s.toFixed(2)+'s → '+(b.s+b.w).toFixed(2)+'s · enter '+b.enter+'s / exit '+b.exit+'s'+(b.anim?' · '+b.anim:'')+(b.out?' → '+b.out:''))+'">'
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
     .map(t=>'<span class=k><i style="background:'+(COLOR[t]||'#7d8799')+'"></i>'+esc(t)+'</span>').join('');
   document.getElementById('alerts').innerHTML=holes.map(([a,b,lab])=>{
     const dis=grown.some(([x,y])=>x<b-1e-9&&y>a+1e-9);
     return '<span'+(dis?' class=dis':'')+'>'+(dis?'? ':'⚠ ')+lab+' '+a.toFixed(2)+'s → '+b.toFixed(2)+'s'
       +(dis?' — the engine holds a window open here that the JSON does not declare, so beat-check may be reading a hole that does not render':'')+'</span>'; }).join('');
 }
 // drag anywhere in the lanes to seek; the playhead and the scrubber are the same value
 const seek=(e)=>{ const r=ruler.getBoundingClientRect(); n=Math.max(0,Math.min(total,Math.round((e.clientX-r.left)/r.width*dur*fps))); draw(); };
 rows.addEventListener('click',e=>{ const bar=e.target.closest('.bar'); if(!bar) return;
   const i=+bar.dataset.i; if(i<0){ selOut.textContent='⚠ that bar has no JSON layer (the produced baseline added it)'; return; }
   setSel(i); });
 lanes.addEventListener('pointerdown',e=>{ lanes.setPointerCapture(e.pointerId); seek(e); });
 lanes.addEventListener('pointermove',e=>{ if(e.buttons&1) seek(e); });
 document.getElementById('tgl').addEventListener('click',()=>document.getElementById('tl').classList.toggle('off'));
</script></body></html>`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/studio') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(studioPage('scene')); }
  // rebuilt per request (and the gate re-run), so an edit + reload shows the new timeline
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
        // the layer's start — the single easiest thing to get wrong when writing these by hand.
        const keys = upsertKey(Array.isArray(L.motion) ? L.motion : [], {
          t: +(+t).toFixed(3), x: Math.round(x), y: Math.round(y),
        });
        const out = patchMotion(src, layer, keys);
        if (out !== src) { undoStack.push(src); fs.writeFileSync(dataArg, out); }
        return reply({ ok: true, keys: keys.length, changed: out !== src, undo: undoStack.length });
      } catch (e) { return reply({ ok: false, error: String(e.message) }, 500); }
    });
    return;
  }
  if (url === '/api/timeline') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    try { return res.end(JSON.stringify(timelineModel(dataArg))); }
    catch (e) { return res.end(JSON.stringify({ file: path.basename(dataArg), marks: [], layers: [], gate: { deadAir: [], emptyBeat: [], codes: [], error: String(e.message) } })); }
  }
  const p = path.join(repoRoot, decodeURIComponent(url).replace(/^\/+/, ''));
  if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `✗ port ${PORT} is busy — set a free one: make studio D=${dataArg} PORT=8800` : e.message); process.exit(1); });
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ▶ vawe studio — ${path.basename(dataArg)}`);
  console.log(`    open  http://127.0.0.1:${PORT}/studio`);
  console.log(`    scrub the slider · ← → step a frame · space plays · edit the JSON + reload to see changes`);
  console.log(`    timeline below: drag it to seek · hazard bands are dead air (beat-check) · hover a bar for its ramps`);
  console.log(`    Ctrl-C to stop.\n`);
});
