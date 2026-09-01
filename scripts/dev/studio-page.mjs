// scripts/dev/studio-page.mjs: the studio SHELL, as one served page. Split out of studio.mjs so the
// server (routes, the gate run, the write side) and the interface stop sharing one 600-line file.
//
// THE SURROUND IS ACHROMATIC, chroma zero, on purpose. A colourist grades in a neutral grey room because
// any hue in the surround skews the judgement of the picture, and this shell exists to judge frames. So
// every token below is a true grey; the only colour on screen is the film itself, the one accent the
// playhead needs, and the safety colours on the hazard bands (red and amber are a warning, not a style).
//
// Layout: a left rail of panels · the preview and its transport in the centre · the timeline full width
// along the bottom, with a draggable divider between them whose position sticks per browser.
//
// DEV TOOLING ONLY. It calls the engine's own renderFrame(n) from the parent frame, exactly as the Go
// capture loop does per frame. It never touches the renderer or the determinism contract.
export const studioPage = ({ fmt, dataUrl, title, theme }) => `<!doctype html><html data-theme=${theme}><head><meta charset=utf8><title>vawe studio · ${title}</title>
<style>
 @font-face{font-family:Anybody;src:url(/assets/fonts/Anybody.woff2) format('woff2');font-weight:100 900;font-display:swap}
 @font-face{font-family:'JetBrains Mono';src:url(/assets/fonts/JetBrainsMono.woff2) format('woff2');font-weight:100 800;font-display:swap}
 /* The greys, and nothing but. #1C1C1C #2E2E2E #4A4A4A #8A8A8A #E8E8E8 are the five the room is built
    from; the rest are steps between them. Lines are black/white at low alpha so a panel is separated by
    structure rather than by a heavy border. */
 :root{--tlh:300px;--rail:300px;--pad:8px;--r-out:12px;--r-in:calc(var(--r-out) - var(--pad))}
 :root[data-theme=light]{color-scheme:light;
   --bg:#F2F2F2;--panel:#FFFFFF;--panel-2:#F7F7F7;--field:#EDEDED;--stage:#E8E8E8;
   --line:rgba(0,0,0,.10);--line-2:rgba(0,0,0,.20);
   --ink:#1C1C1C;--ink-2:#4A4A4A;--muted:#8A8A8A;
   --accent:#2563eb;--accent-soft:#EDF2FE;
   --bad:#a3282d;--bad-bg:#FBF4F4;--hz:#a3282d;--hz-beat:#8a5a00;--hz-mute:#8A8A8A;
   --wash:#1C1C1C;--wash-a:.34;
   --shadow:0 1px 2px rgba(0,0,0,.05),0 18px 44px -18px rgba(0,0,0,.22)}
 /* the grey room. The stage sits at #2E2E2E, the value the brief names, and everything around it is
    darker so the picture is the brightest thing in the frame. */
 :root[data-theme=dark]{color-scheme:dark;
   --bg:#161616;--panel:#1C1C1C;--panel-2:#232323;--field:#111111;--stage:#2E2E2E;
   --line:rgba(255,255,255,.09);--line-2:rgba(255,255,255,.18);
   --ink:#E8E8E8;--ink-2:#B4B4B4;--muted:#8A8A8A;
   /* the engine's #2563eb lifted one step for the dark room: same hue, readable on #1C1C1C */
   --accent:#3d7bf5;--accent-soft:#1a2740;
   --bad:#e0787f;--bad-bg:#2A1B1D;--hz:#e0505f;--hz-beat:#d69a30;--hz-mute:#8A8A8A;
   --wash:#000;--wash-a:.42;
   --shadow:0 1px 2px rgba(0,0,0,.4),0 24px 60px -24px rgba(0,0,0,.7)}
 /* narrow screens: the rail gives its width back to the picture, and the chrome keeps one line */
 @media (max-width:1240px){:root{--rail:212px}}
 *{box-sizing:border-box}
 body{margin:0;background:var(--bg);color:var(--ink);height:100vh;overflow:hidden;
   font:12.5px/1.45 Anybody,system-ui,-apple-system,sans-serif;font-variation-settings:'wdth' 100}
 /* every digit that can change sits in the mono face with tabular figures, so a frame counter ticking
    from 9 to 10 does not shove the seconds beside it */
 .num,#read,#sel,input,#pickjson,#lanes{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}
 h2{margin:0;font:600 11px/1 Anybody,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
 #shell{display:flex;height:100vh;gap:var(--pad);padding:var(--pad)}
 /* ---- left rail: a column of panels. One today. A second one is another <section class=panel>. ---- */
 #rail{width:var(--rail);flex:none;display:flex;flex-direction:column;gap:var(--pad);overflow:auto}
 /* the keys sit at the foot of the rail, so a column with one panel in it does not read as unfinished */
 .panel.keys{margin-top:auto} .panel.keys .body p{font-size:11px;line-height:2}
 .panel{background:var(--panel);border-radius:var(--r-out);box-shadow:var(--shadow);
   outline:1px solid var(--line);outline-offset:-1px;padding:var(--pad);display:flex;flex-direction:column;gap:var(--pad)}
 .panel .body{background:var(--panel-2);border-radius:var(--r-in);padding:10px;color:var(--ink-2);font-size:12px}
 .panel .body p{margin:0 0 8px} .panel .body p:last-child{margin:0}
 .stub{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:11px}
 .stub i{width:7px;height:7px;border-radius:50%;background:var(--muted);display:inline-block}
 #main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:var(--pad)}
 /* ---- top bar: the breadcrumb, then the app chrome. Nothing here touches the picture, which is why
    it is not in the transport: a row of five equal buttons beside a scrubber has no rank. ---- */
 #top{display:flex;align-items:center;gap:6px;flex:none;min-height:30px}
 #top .sp{flex:1}
 #crumbs{display:flex;align-items:center;gap:6px;min-width:0;padding:0 4px;height:22px;color:var(--muted);font-size:12px;overflow:hidden;white-space:nowrap}
 #crumbs button{background:none;border:0;color:var(--ink-2);cursor:pointer;padding:2px 6px;border-radius:6px;font:inherit}
 #crumbs button:hover{background:var(--panel-2);color:var(--ink)}
 #crumbs button[aria-current=page]{color:var(--ink);font-weight:600;cursor:default}
 #crumbs .sep{color:var(--muted);opacity:.7}
 #crumbs .none{color:var(--muted);font-size:11px}
 /* ---- centre: the preview, then the transport ---- */
 #centre{flex:1;min-height:120px;flex-basis:0;display:flex;flex-direction:column;background:var(--panel);border-radius:var(--r-out);
   box-shadow:var(--shadow);outline:1px solid var(--line);outline-offset:-1px;padding:var(--pad);gap:var(--pad);overflow:hidden}
 #stage{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;
   background:var(--stage);border-radius:var(--r-in);cursor:crosshair}
 iframe{border:0;background:#fff;box-shadow:0 20px 60px -24px rgba(0,0,0,.6);flex:none}
 #bar{display:flex;align-items:center;gap:14px;flex:none;padding:0 2px}
 #scrub{flex:1;min-width:80px;accent-color:var(--accent);height:22px}
 #scrub:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
 button{background:var(--panel-2);color:var(--ink);border:1px solid var(--line-2);border-radius:8px;padding:6px 11px;cursor:pointer;
   font:600 12px/1 Anybody,system-ui,sans-serif;white-space:nowrap}
 button:hover{background:var(--field);border-color:var(--muted)}
 button:active{transform:translateY(1px)}
 button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
 button[aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
 /* the icons are drawn here, one set, stroked at 1.5 to sit beside 12px labels */
 button svg{width:13px;height:13px;vertical-align:-2px;margin-right:5px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
 button svg.solid{fill:currentColor;stroke:none}
 /* the frame number is the one figure a person watches all day, so it is the largest thing in the row */
 #read{flex:none;color:var(--ink);font-size:15px;letter-spacing:-.01em}
 #read b{font-weight:700} #read .of{color:var(--muted);font-weight:400;font-size:13px}
 /* the selection readout is a status line under the transport, not a column that grows */
 #sel{flex:none;min-height:14px;color:var(--ink-2);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 /* ---- the divider: the preview and the timeline compete for height, so the user arbitrates ---- */
 #split{flex:none;height:9px;cursor:row-resize;display:flex;align-items:center;justify-content:center;border-radius:5px}
 #split:hover,#split.on{background:var(--panel-2)}
 #split::after{content:'';width:44px;height:3px;border-radius:2px;background:var(--line-2)}
 #split:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
 /* ---- timeline ---- */
 #tl{height:var(--tlh);flex:none;background:var(--panel);border-radius:var(--r-out);box-shadow:var(--shadow);
   outline:1px solid var(--line);outline-offset:-1px;display:flex;flex-direction:column;overflow:hidden}
 #tl.off{height:36px} #tl.off #lanes,#tl.off #alerts{display:none} #tl.off+#split,body.tloff #split{visibility:hidden}
 #tlhead{display:flex;align-items:center;gap:10px;padding:9px 12px;color:var(--ink-2);font-size:11px;border-bottom:1px solid var(--line);flex:none}
 #tlhead b{font:700 12px/1 Anybody,system-ui,sans-serif;color:var(--ink)}
 #tlhead .sp{flex:1} #tlhead .k{display:inline-flex;align-items:center;gap:4px;margin-left:8px;color:var(--muted)}
 #tlhead .k i{width:9px;height:9px;border-radius:2px;display:inline-block}
 #alerts:empty{display:none}
 #alerts{padding:8px 12px 0;display:flex;flex-wrap:wrap;gap:6px;flex:none}
 #alerts span{background:var(--bad-bg);border:1px solid var(--bad);color:var(--bad);border-radius:6px;padding:3px 8px;font-size:11px}
 #alerts span.dis{background:var(--panel-2);border-color:var(--line-2);color:var(--ink-2)}
 #lanes{position:relative;overflow-y:auto;overflow-x:hidden;padding:0 12px 12px;cursor:col-resize;flex:1}
 #ruler{position:sticky;top:0;z-index:4;height:32px;background:var(--panel);border-bottom:1px solid var(--line)}
 #ruler .t{position:absolute;top:0;bottom:0;border-left:1px solid var(--line)}
 #ruler .t s{position:absolute;left:4px;top:2px;color:var(--ink-2);text-decoration:none;font-size:10px}
 #ruler .t.end s{left:auto;right:4px}
 #ruler .t s em{color:var(--muted);font-style:normal;margin-left:5px}
 /* a transition is a moment, not a layer: it lives on the ruler, above every track */
 #ruler .m{position:absolute;top:14px;bottom:0;border-left:2px solid var(--ink-2);color:var(--ink-2);padding-left:3px;font-size:10px;font-weight:700;white-space:nowrap}
 #ruler .ms{position:absolute;top:14px;bottom:0;background:var(--ink-2);opacity:.12}
 #rows{position:relative}
 /* the ruler's ticks carried down through the stack, so the bars read against a clock */
 .grid{position:absolute;top:0;bottom:0;border-left:1px solid var(--line);pointer-events:none}
 .row{position:relative;height:18px}
 .bar{position:absolute;top:1px;height:16px;border-radius:3px;overflow:hidden;font-size:10px;line-height:16px;white-space:nowrap;cursor:pointer;
   font-family:'JetBrains Mono',ui-monospace,monospace}
 /* the ramps are the point: an open window is not the same as a readable frame. The ramp is DARKENED
    rather than faded toward the panel, so a long label running into its own exit ramp still reads. */
 .bar i{position:absolute;top:0;bottom:0;background:var(--wash);opacity:var(--wash-a)}
 .bar i.in{left:0;border-right:1px solid var(--panel)} .bar i.out{right:0;border-left:1px solid var(--panel)}
 /* the tail the engine held open past the authored window, hatched in the label's own ink */
 .bar .held{position:absolute;top:0;bottom:0;right:0;border-left:1px solid currentColor;
   background:repeating-linear-gradient(135deg,color-mix(in srgb,currentColor 42%,transparent) 0 2px,transparent 2px 6px)}
 .bar span{position:absolute;top:0;font-weight:600;pointer-events:none}
 .bar span em{font-style:normal;opacity:.75;font-weight:400}
 .bar.sel{outline:2px solid var(--accent);outline-offset:1px}
 .bar u{position:absolute;top:0;bottom:0;width:2px;background:currentColor;opacity:.85}
 /* dead air: the hole beat-check blocks on, drawn where it actually is. The label gets its own solid
    chip or the hatch runs straight through the letters. */
 .hz{position:absolute;top:0;bottom:0;z-index:3;pointer-events:none;
   background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--hz) 34%,transparent) 0 6px,color-mix(in srgb,var(--hz) 9%,transparent) 6px 12px);
   border-left:1px solid var(--hz);border-right:1px solid var(--hz)}
 .hz.beat{--hz:var(--hz-beat)} .hz.disputed{--hz:var(--hz-mute)}
 .hz b{position:absolute;top:2px;left:3px;color:var(--hz);font-size:10px;font-weight:700;white-space:nowrap;
   background:var(--panel);border:1px solid var(--hz);padding:0 4px;border-radius:3px}
 #ph{position:absolute;top:0;bottom:0;width:1px;background:var(--accent);z-index:5;pointer-events:none}
 #ph::before{content:'';position:absolute;top:0;left:-4px;border:4px solid transparent;border-top:6px solid var(--accent)}
 /* ---- floating surfaces: the picker, the plan, the boot failure ---- */
 #pick{position:fixed;right:16px;top:16px;width:390px;max-height:74vh;display:none;flex-direction:column;
   background:var(--panel);color:var(--ink);outline:1px solid var(--line-2);outline-offset:-1px;border-radius:var(--r-out);z-index:40;
   font:12px/1.5 'JetBrains Mono',ui-monospace,Menlo,monospace;box-shadow:var(--shadow)}
 #pick.on{display:flex}
 #pickhead{display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid var(--line)}
 #pickname{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 #pickjson{margin:0;padding:11px;overflow:auto;user-select:text;white-space:pre-wrap;color:var(--ink-2)}
 #planel{position:fixed;inset:36px;display:none;flex-direction:column;z-index:60;background:var(--panel);
   outline:1px solid var(--line-2);outline-offset:-1px;border-radius:var(--r-out);box-shadow:var(--shadow);overflow:hidden}
 #planel.on{display:flex}
 #planhead{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--line);color:var(--ink)}
 #planpath{flex:1;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px}
 #planbody{flex:1;overflow:auto;background:#fff;display:flex;align-items:flex-start;justify-content:center}
 #planimg{max-width:100%;display:block}
 /* the boot failure, said out loud: core/boot.js parks the reason on window.__engineError */
 #err{position:absolute;z-index:6;max-width:min(920px,86%);max-height:80%;overflow:auto;
   background:var(--bad-bg);border:1px solid var(--bad);border-radius:var(--r-out);box-shadow:var(--shadow);
   padding:16px 18px;color:var(--ink);white-space:pre-wrap;font-size:12.5px;line-height:1.55}
 #err b{display:block;margin-bottom:8px;color:var(--bad);font:700 15px/1.2 Anybody,system-ui,sans-serif}
 #drag{position:absolute;inset:0;display:none;cursor:grab}
 #drag.on{display:block} #drag.on.dragging{cursor:grabbing;background:color-mix(in srgb,var(--accent) 12%,transparent)}
 kbd{font:11px/1 'JetBrains Mono',ui-monospace,monospace;border:1px solid var(--line-2);border-bottom-width:2px;
   border-radius:4px;padding:2px 4px;margin-right:2px;color:var(--ink-2);background:var(--panel);white-space:nowrap}
</style></head><body>
 <div id=planel><div id=planhead><b>the plan, drawn from the storyboard</b><span id=planpath></span><button id=planclose>close</button></div><div id=planbody><img id=planimg alt="storyboard panels"></div></div>
 <div id=pick><div id=pickhead><b id=pickname>nothing selected</b><button id=pickcopy>copy JSON</button><button id=pickclose>close</button></div><pre id=pickjson></pre></div>
 <div id=shell>
  <aside id=rail>
   <section class=panel>
    <h2>chooser</h2>
    <div class=body>
     <p>Picks between candidate takes of the same film, side by side.</p>
     <p class=stub><i></i>not wired yet</p>
    </div>
   </section>
   <section class="panel keys">
    <h2>keys</h2>
    <div class=body>
     <p><kbd>space</kbd> play, pause</p>
     <p><kbd>&larr;</kbd><kbd>&rarr;</kbd> a frame</p>
     <p><kbd>shift</kbd>+<kbd>&larr;</kbd><kbd>&rarr;</kbd> a second</p>
     <p><kbd>home</kbd><kbd>end</kbd> the ends</p>
     <p><kbd>p</kbd> panels, <kbd>esc</kbd> closes</p>
    </div>
   </section>
  </aside>
  <div id=main>
   <div id=top>
    <nav id=crumbs aria-label="composition stack"></nav>
    <span class=sp></span>
    <button id=key aria-pressed=false><svg viewBox="0 0 16 16"><path d="M8 2l6 6-6 6-6-6z"/></svg>key</button>
    <button id=undo><svg viewBox="0 0 16 16"><path d="M3 8h7a3 3 0 010 6H7"/><path d="M6 5L3 8l3 3"/></svg>undo</button>
    <button id=plan><svg viewBox="0 0 16 16"><rect x=2 y=3 width=12 height=10 rx=1.5/><path d="M6 3v10M10 3v10"/></svg>panels</button>
    <button id=tgl aria-pressed=true><svg viewBox="0 0 16 16"><path d="M2 4h12M2 8h8M2 12h10"/></svg>timeline</button>
    <button id=theme><svg viewBox="0 0 16 16"><circle cx=8 cy=8 r=5.5/><path d="M8 2.5v11" /></svg>theme: <span id=themetxt>light</span></button>
   </div>
   <div id=centre>
    <div id=stage><iframe id=sc title="scene preview" src="/formats/${fmt}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30"></iframe><div id=drag></div><div id=err hidden></div></div>
    <div id=bar>
     <button id=play aria-label="play or pause"><svg class=solid viewBox="0 0 16 16"><path d="M4 2.5l9 5.5-9 5.5z"/></svg>play</button>
     <input id=scrub type=range min=0 max=100 value=0 step=1 aria-label="frame">
     <span id=read>frame <b>0</b> <span class=of>/ 0</span> <span class=of>·</span> 0.00<span class=of>s</span></span>
    </div>
    <div id=sel>click a layer in the picture, or a bar in the timeline, to select it</div>
   </div>
   <div id=split role=separator aria-label="resize the timeline" tabindex=0></div>
   <div id=tl>
    <div id=tlhead><b id=tlwhat>timeline</b><span class=sp></span><span id=tlkey></span></div>
    <div id=alerts></div>
    <div id=lanes><div id=ruler></div><div id=rows></div><div id=ph></div></div>
   </div>
  </div>
 </div>
<script>
 const $=(id)=>document.getElementById(id);
 const sc=$('sc'),scrub=$('scrub'),read=$('read'),play=$('play');
 const lanes=$('lanes'),ruler=$('ruler'),rows=$('rows'),ph=$('ph');
 let fps=30,total=0,n=0,playing=false,W=1920,H=1080,dur=1,model=null;
 const typing=()=>/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);

 // ---------- the divider ----------
 // The preview and the timeline compete for the same vertical space and only the person looking knows
 // which one they need right now, so the split is theirs and it sticks per browser.
 const split=$('split'), tl=$('tl');
 const TLH_KEY='vawe-studio-tlh';
 function setTlh(px){ const max=Math.max(120,innerHeight-240);
   const v=Math.max(96,Math.min(max,Math.round(px)));
   document.documentElement.style.setProperty('--tlh',v+'px');
   try{ localStorage.setItem(TLH_KEY,String(v)); }catch(_){}
   fit(); }
 let tlhChosen=false;
 try{ const s=+localStorage.getItem(TLH_KEY); if(s){ tlhChosen=true; setTlh(s); } }catch(_){}
 split.addEventListener('pointerdown',e=>{ split.setPointerCapture(e.pointerId); split.classList.add('on'); });
 split.addEventListener('pointermove',e=>{ if(!split.hasPointerCapture||!split.classList.contains('on'))return;
   if(!(e.buttons&1))return; setTlh(innerHeight-e.clientY-14); });
 split.addEventListener('pointerup',()=>split.classList.remove('on'));
 split.addEventListener('keydown',e=>{ const h=tl.getBoundingClientRect().height;
   if(e.key==='ArrowUp'){ e.preventDefault(); setTlh(h+24); }
   if(e.key==='ArrowDown'){ e.preventDefault(); setTlh(h-24); } });

 // ---------- the composition breadcrumb ----------
 // HONEST STUB, and the honesty is the feature. A \`composition\` layer does NOT hold a nested layer tree:
 // core/layers/composition.js looks the name up in core/compositions/ and hands a first-party JS function
 // the DOM plus its props. There is nothing on disk to drill INTO, so the crumb lists the compositions
 // this scene names and drilling in shows what that comp is and the data it was given. When the engine
 // grows real nested scenes, this is where the deeper levels attach.
 let crumbAt=null;
 function drawCrumbs(){ const c=$('crumbs'); const file=(model&&model.file)||'scene';
   const comps=(model?model.layers:[]).filter(L=>L.type==='composition');
   let h='<button '+(crumbAt==null?'aria-current=page':'data-back=1')+'>'+esc(file)+'</button>';
   if(crumbAt!=null){ const L=comps.find(x=>x.i===crumbAt);
     h+='<span class=sep>/</span><button aria-current=page>comp: '+esc((L&&L.raw&&L.raw.comp)||'?')+'</button>'; }
   else if(comps.length) h+='<span class=sep>/</span>'+comps.map(L=>
     '<button data-comp="'+L.i+'">'+esc((L.raw&&L.raw.comp)||('layer '+L.i))+'</button>').join('<span class=sep>·</span>');
   else h+='<span class=none>no compositions in this scene</span>';
   c.innerHTML=h;
   c.querySelectorAll('[data-comp]').forEach(b=>b.addEventListener('click',()=>enterComp(+b.dataset.comp)));
   c.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>{ crumbAt=null; drawCrumbs(); })); }
 function enterComp(i){ crumbAt=i; drawCrumbs(); setSel(i);
   const L=model.layers.find(x=>x.i===i);
   showPick('comp','layers['+i+']  composition',L?L.raw:{},
     '// a composition is FIRST-PARTY JS, core/compositions/'+((L&&L.raw&&L.raw.comp)||'?')+'.js.'+String.fromCharCode(10)+
     '// It has no nested layer tree to open: what the JSON carries is the name and its props.'); }

 // ---------- keyframing ----------
 // ONE interaction, end to end: pick a layer, scrub to a frame, drag it. That writes a motion key at
 // that frame. Everything else an editor eventually needs sits on top of this loop.
 let FITS=1, keyMode=false, selIdx=-1, selStart=0, selLabel='', dragging=null;
 const dragEl=$('drag'), keyBtn=$('key'), selOut=$('sel');
 function setSel(i){ selIdx=i; const L=model&&model.layers.find(l=>l.i===i);
   selStart=L?L.start:0; selLabel=L?(L.type+' '+(L.label||'')):'';
   selReadout();
   [...rows.querySelectorAll('.bar')].forEach(b=>b.classList.toggle('sel',+b.dataset.i===i)); }
 // ---- THE PLAN, one keypress away ----------------------------------------------------------------
 const planel=$('planel'), planImg=$('planimg'), planPath=$('planpath');
 function openPlan(){
   planel.classList.add('on'); planPath.textContent='drawing...';
   // cache-busted every open: the server redraws when the storyboard is newer than the sheet
   fetch('/__panels?t='+Date.now()).then(r=>{
     if(!r.ok) return r.text().then(t=>{ planPath.textContent=t.split(String.fromCharCode(10))[0]; planImg.removeAttribute('src'); });
     planPath.textContent=r.headers.get('X-Storyboard')||'';
     return r.blob().then(b=>{ planImg.src=URL.createObjectURL(b); }); })
    .catch(e=>{ planPath.textContent='could not draw the panels: '+e.message; });
 }
 $('plan').addEventListener('click',openPlan);
 $('planclose').addEventListener('click',()=>planel.classList.remove('on'));
 // ---- THE PICKER: click the picture, get the JSON that made it -----------------------------------
 const pick=$('pick'), pickName=$('pickname'), pickJson=$('pickjson');
 function bgAt(t){ if(!model) return null;
   const bg=model.bg||[]; if(!bg.length) return null;
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
 $('pickclose').addEventListener('click',()=>pick.classList.remove('on'));
 $('pickcopy').addEventListener('click',()=>{
   const b=$('pickcopy');
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
 const SEL_HINT='click a layer in the picture, or a bar in the timeline, to select it';
 function selReadout(){ if(selIdx<0){ selOut.textContent=SEL_HINT; return; }
   const lt=n/fps-selStart;
   selOut.textContent='selected '+selLabel+'  ·  key at '+lt.toFixed(2)+'s'+(lt<0?'  (before it starts)':''); }
 keyBtn.addEventListener('click',()=>{ keyMode=!keyMode; keyBtn.setAttribute('aria-pressed',String(keyMode));
   dragEl.classList.toggle('on',keyMode); });
 $('undo').addEventListener('click',async()=>{
   const r=await fetch('/api/undo',{method:'POST'}).then(x=>x.json());
   if(r.ok) reloadScene(); else selOut.textContent='could not undo: '+r.error; });
 function reloadScene(){ const keep=n; sc.src=sc.src; sc.addEventListener('load',()=>{ ready(); setTimeout(()=>{ n=Math.min(keep,total); draw(); },120); },{once:true}); }
 dragEl.addEventListener('pointerdown',e=>{
   if(!keyMode) return;
   if(selIdx<0){ selOut.textContent='click a layer bar first'; return; }
   dragEl.setPointerCapture(e.pointerId); dragEl.classList.add('dragging');
   dragging={x0:e.clientX,y0:e.clientY,dx:0,dy:0}; });
 dragEl.addEventListener('pointermove',e=>{
   if(!dragging) return;
   dragging.dx=(e.clientX-dragging.x0)/FITS; dragging.dy=(e.clientY-dragging.y0)/FITS;
   selOut.textContent='drag  '+Math.round(dragging.dx)+', '+Math.round(dragging.dy)+' px'; });
 dragEl.addEventListener('pointerup',async e=>{
   if(!dragging) return;
   const d=dragging; dragging=null; dragEl.classList.remove('dragging');
   if(Math.abs(d.dx)<1&&Math.abs(d.dy)<1) return;
   // the key carries the layer's CURRENT offset at this frame plus the drag, so dragging a layer that
   // already has a track nudges from where it is rather than snapping back to the origin
   const cur=offsetAt(selIdx,n/fps-selStart);
   const body={layer:selIdx,t:n/fps-selStart,x:cur.x+d.dx,y:cur.y+d.dy};
   const r=await fetch('/api/key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(x=>x.json());
   selOut.textContent=r.ok?('key at '+body.t.toFixed(2)+'s · '+r.keys+' keys'):('could not write the key: '+r.error);
   if(r.ok&&r.changed) reloadScene(); });
 // where the layer already is at local time lt, read from the engine's own interpolator via the iframe
 function offsetAt(i,lt){ try{ const e=sc.contentWindow.__engine; const L=(e&&e.data&&e.data.layers)||[];
   const m=L[i]&&L[i].motion; if(!m||!m.length) return {x:0,y:0};
   let a=m[0]; for(const k of m){ if((k.t??0)<=lt) a=k; }
   return {x:a.x??0,y:a.y??0}; }catch(_){ return {x:0,y:0}; } }
 function fit(){ // scale the iframe to fit the stage, preserving the canvas aspect
   const st=$('stage'),pad=32; const s=Math.min((st.clientWidth-pad)/W,(st.clientHeight-pad)/H);
   sc.style.width=W+'px';sc.style.height=H+'px';sc.style.transform='scale('+s+')';sc.style.transformOrigin='center';
   FITS=s;
 }
 function draw(){ const e=sc.contentWindow.__engine; if(!e)return; e.renderFrame(n);
   read.innerHTML='frame <b>'+n+'</b> / '+total+' · '+(n/fps).toFixed(2)+'s'; scrub.value=n;
   ph.style.left='calc(12px + '+pc(n/fps)+')'; if(selIdx>=0&&!dragging)selReadout(); }
 const errBox=$('err');
 // AN ERROR YOU CANNOT COPY IS AN ERROR YOU RETYPE BY HAND. The text is selectable, one button copies
 // it, and it is POSTed to the server so the terminal that started studio hears about it too.
 function fail(title,detail){ errBox.hidden=false;
   errBox.innerHTML='<b></b><pre></pre><button class="ecopy">copy</button>';
   errBox.querySelector('b').textContent=title;
   const pre=errBox.querySelector('pre');
   pre.textContent=detail; pre.style.cssText='white-space:pre-wrap;user-select:text;margin:.5em 0;font:12px/1.5 ui-monospace,monospace';
   const btn=errBox.querySelector('.ecopy');
   btn.onclick=()=>{ navigator.clipboard.writeText(title+String.fromCharCode(10)+detail).then(()=>{btn.textContent='copied';setTimeout(()=>btn.textContent='copy',1200);}); };
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
 sc.addEventListener('load',()=>ready()); addEventListener('resize',fit);
 // the stage resizes without the WINDOW resizing (the divider moves, a hazard band wraps), and a scale
 // computed against the old height overflows and clips the frame
 if(window.ResizeObserver) new ResizeObserver(()=>fit()).observe($('stage'));
 scrub.addEventListener('input',()=>{ n=+scrub.value; draw(); });
 function loop(){ if(!playing)return; n=(n+1)%(total+1); draw(); setTimeout(()=>requestAnimationFrame(loop),1000/fps); }
 function setPlaying(p){ playing=p;
   play.innerHTML=(p?'<svg class=solid viewBox="0 0 16 16"><rect x=3.5 y=2.5 width=3.5 height=11 rx=.6/><rect x=9 y=2.5 width=3.5 height=11 rx=.6/></svg>pause'
                     :'<svg class=solid viewBox="0 0 16 16"><path d="M4 2.5l9 5.5-9 5.5z"/></svg>play');
   if(p)loop(); }
 play.addEventListener('click',()=>setPlaying(!playing));
 const go=(v)=>{ n=Math.max(0,Math.min(total,v)); draw(); };
 // A SCRUBBER YOU CAN ONLY DRAG IS HALF A TOOL. Arrows step a frame, shift+arrow a second, home/end the
 // ends, space plays. The range input handles its own arrows, so we stand back when it has focus rather
 // than stepping the frame twice.
 addEventListener('keydown',e=>{
   if(e.key==='Escape'){ planel.classList.remove('on'); pick.classList.remove('on'); return; }
   if(typing()||e.metaKey||e.ctrlKey||e.altKey) return;
   const step=e.shiftKey?fps:1;
   if(e.key==='ArrowRight'){ e.preventDefault(); go(n+step); }
   else if(e.key==='ArrowLeft'){ e.preventDefault(); go(n-step); }
   else if(e.key==='Home'){ e.preventDefault(); go(0); }
   else if(e.key==='End'){ e.preventDefault(); go(total); }
   else if(e.key===' '){ e.preventDefault(); setPlaying(!playing); }
   else if(e.key==='p'||e.key==='P'){ planel.classList.contains('on')?planel.classList.remove('on'):openPlan(); }
 });

 // ---------- timeline ----------
 const pc=(t)=>(100*Math.max(0,Math.min(1,t/dur)))+'%';
 const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 // THE BARS ARE CHROME, SO THEY ARE GREY. A hue per layer type would put fifteen colours in the surround
 // the eye is meant to judge the picture against, and the type is already written on every bar, so the
 // colour was redundant coding. What is left is a lightness ramp: enough to tell one row from the next,
 // achromatic, and legible in both rooms. Colour on this page means the film, the playhead, or danger.
 const RAMP={
  dark:[['#E8E8E8','#1C1C1C'],['#CFCFCF','#1C1C1C'],['#B6B6B6','#1C1C1C'],['#9D9D9D','#1C1C1C'],
        ['#848484','#141414'],['#6E6E6E','#F0F0F0'],['#5A5A5A','#F0F0F0'],['#494949','#E8E8E8']],
  light:[['#2E2E2E','#F5F5F5'],['#414141','#F5F5F5'],['#545454','#F5F5F5'],['#676767','#F5F5F5'],
         ['#7A7A7A','#FFFFFF'],['#8D8D8D','#1C1C1C'],['#A0A0A0','#1C1C1C'],['#B3B3B3','#1C1C1C']],
 };
 // A stable step per type, so a bar does not change shade when the layer order does.
 const STEP={text:0,type:0,count:1,beat:1,image:2,video:2,lottie:2,clip:2,html:3,component:3,canvas:3,composition:3,
   rect:4,cursor:4,group:5,board:5,doc:5,glow:6,svg:6,paint:6,shader:6,beam:6};
 let ramp=RAMP.light;
 const shade=(t)=>ramp[STEP[t]!=null?STEP[t]:7];
 const themeBtn=$('theme'), themeTxt=$('themetxt');
 function applyTheme(t){ document.documentElement.dataset.theme=t;
   ramp=RAMP[t]; themeTxt.textContent=t; try{ localStorage.setItem('vawe-studio-theme',t); }catch(_){}
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
                // what the AUTHOR wrote, when beat wrapping overruled it. The engine records both, so the
                // bar draws the authored window and the held tail as two different things.
                aw:d.authoredDuration!=null?+d.authoredDuration:null,
                anim:d.anim||'', out:d.out||'', txt:(el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,44),
                cls:(el.className.match(/hs-(img-wrap|rect|comp-wrap|group|text)/)||[])[1] }; });
 }
 const CLS={'img-wrap':'image','comp-wrap':'component','rect':'rect','group':'group','text':'text'};
 function timeline(){
   fetch('/api/timeline').then(r=>r.json()).then(m=>{ model=m; drawCrumbs(); paint(m); })
     .catch(e=>{ $('tlwhat').textContent='timeline unavailable: '+e; });
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
     // the engine can hold a layer open past its declared window; it says so itself, per layer, so take
     // its word rather than pairing a bar to a JSON layer by start time.
     b.grew=b.aw!=null?Math.max(0,b.w-b.aw):(L?Math.max(0,(b.s+b.w)-(L.start+L.dur)):0); }
   const grown=bars.filter(b=>b.grew>0.01).map(b=>[b.s+ (b.w-b.grew), b.s+b.w]);
   bars.sort((a,b)=>a.s-b.s||a.w-b.w);
   // ruler: a tick per beat of the clock, labelled in seconds AND frames
   const step=dur<=6?.5:dur<=16?1:dur<=45?2:5;
   let r='';
   // the final tick is pinned to the right edge and its label reads leftward, so it lands on top of the
   // one before it whenever a tick is narrower than the label. Below that width, the penultimate label
   // is dropped and the tick line stays.
   const tickPx=ruler.clientWidth*step/dur, last=Math.floor((dur+1e-6)/step)*step;
   for(let t=0;t<=dur+1e-6;t+=step){ const end=t>dur-step*.6, hide=tickPx<96&&!end&&t>last-step-1e-6;
     r+='<div class="t'+(end?' end':'')+'" style="left:'+pc(t)+'">'+(hide?'':'<s>'+(+t.toFixed(2))+'s<em>'+Math.round(t*fps)+'f</em></s>')+'</div>'; }
   for(const k of m.marks){
     r+='<div class=ms style="left:'+pc(k.t)+';width:'+(100*k.dur/dur)+'%"></div>'
       +'<div class=m style="left:'+pc(k.t)+'" title="'+esc(k.kind+' '+k.t+'s'+(k.name?' '+k.name:''))+'">'+k.kind.charAt(0).toUpperCase()+'</div>'; }
   ruler.innerHTML=r;
   let h='';
   for(let t=step;t<=dur+1e-6;t+=step) h+='<div class=grid style="left:'+pc(t)+'"></div>';
   for(const b of bars){ const sh=shade(b.type), wpc=100*b.w/dur, inp=b.w?100*Math.min(b.enter,b.w)/b.w:0, outp=b.w?100*Math.min(b.exit,b.w)/b.w:0;
     const heldp=b.grew>0.005&&b.w?100*Math.min(b.grew,b.w)/b.w:0;
     h+='<div class=row><div class=bar data-i="'+(b.i??-1)+'" data-t="'+b.s+'" style="left:'+pc(b.s)+';width:'+wpc+'%;background:'+sh[0]+';color:'+sh[1]+'" title="'+esc(b.type+' '+(b.name||'')+' · '+b.s.toFixed(2)+'s to '+(b.s+b.w).toFixed(2)+'s · enter '+b.enter+'s / exit '+b.exit+'s'+(b.anim?' · '+b.anim:'')+(b.out?' then '+b.out:'')+(heldp?' · authored to '+(b.s+b.w-b.grew).toFixed(2)+'s, held '+b.grew.toFixed(2)+'s longer by beat wrapping':''))+'">'
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
   $('tlwhat').textContent=m.file+' · '+bars.length+' layers · '+dur.toFixed(2)+'s / '+total+'f';
   // no colour key: the bars are a grey ramp, not a code, and each one prints its own type. What is
   // worth naming here is WHICH types the film is made of.
   $('tlkey').textContent=[...new Set(bars.map(b=>b.type))].join(' · ');
   $('alerts').innerHTML=holes.map(([a,b,lab])=>{
     const dis=grown.some(([x,y])=>x<b-1e-9&&y>a+1e-9);
     return '<span'+(dis?' class=dis':'')+'>'+(dis?'? ':'')+lab+' '+a.toFixed(2)+'s to '+b.toFixed(2)+'s'
       +(dis?': the engine holds a window open here that the JSON does not declare, so beat-check may be reading a hole that does not render':'')+'</span>'; }).join('');
   if(selIdx>=0) setSel(selIdx);
   // fit the timeline to the film ONCE, so a 19-layer scene does not open with half its rows below the
   // fold. The moment the divider is dragged the choice is the user's and this never fires again.
   if(!tlhChosen){ tlhChosen=true;
     setTlh(Math.min(innerHeight*0.55, bars.length*18+$('ruler').offsetHeight+$('tlhead').offsetHeight+30)); }
 }
 // drag anywhere in the lanes to seek; the playhead and the scrubber are the same value
 const seek=(e)=>{ const r=ruler.getBoundingClientRect(); n=Math.max(0,Math.min(total,Math.round((e.clientX-r.left)/r.width*dur*fps))); draw(); };
 lanes.addEventListener('pointerdown',e=>{
   // BEFORE the capture: setPointerCapture retargets everything that follows to the lanes element, so
   // a click handler on the bar never sees its own bar and selection silently did nothing.
   const bar=e.target&&e.target.closest&&e.target.closest('.bar');
   if(bar){ const i=+bar.dataset.i;
     if(i<0) selOut.textContent='that bar has no JSON layer (the produced baseline added it)';
     else setSel(i); }
   lanes.setPointerCapture(e.pointerId); seek(e); });
 lanes.addEventListener('pointermove',e=>{ if(e.buttons&1) seek(e); });
 $('tgl').addEventListener('click',()=>{ const off=tl.classList.toggle('off');
   $('tgl').setAttribute('aria-pressed',String(!off)); document.body.classList.toggle('tloff',off); fit(); });
 drawCrumbs();
</script></body></html>`;
