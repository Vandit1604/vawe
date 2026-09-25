 const $=(id)=>document.getElementById(id);
 const sc=$('sc'),read=$('read'),play=$('play');
 const lanes=$('lanes'),ruler=$('ruler'),rows=$('rows'),ph=$('ph');
 let fps=30,total=0,n=0,playing=false,W=1920,H=1080,dur=1,model=null;
// The stage chip's own fetch below is the ONE place `/api/stage` is read; cached here so a scene/look/
// sound pane that finds no engine can say WHICH stage the film is in and the one command that moves it,
// instead of re-deriving that (make stage already owns it) or just printing a raw boot failure.
let stageInfo=null;
// A pre-assemble film (AGENTS.md stages brief..approval) has no `layers` yet on purpose
// (no scene JSON exists before approval) so the engine's own validator refusing to boot it is not a
// bug to report, it is the expected shape of an unbuilt film. One line, reused by every pane that
// would otherwise show a raw engine error for this exact, ordinary case.
function preAssembleNote(){
  if(!stageInfo||!stageInfo.ok) return null;
  const order=stageInfo.order||[], at=order.indexOf(stageInfo.stage), asm=order.indexOf('assemble');
  if(at<0||asm<0||at>=asm) return null; // already assembled, or the stage could not be read: show the real error
  return 'This film has no scene yet: it is at the '+stageInfo.stage+' stage.\nNext: '+(stageInfo.command||stageInfo.next);
}
 // ---- GEOMETRY IS MEASURED ONCE PER CHANGE, NEVER PER EVENT ---------------------------------------
 // Every hover used to read the ruler's rect, the peek's own offsetWidth and the timeline panel's rect
 // and then write three style properties, which is a forced synchronous layout inside a pointermove,
 // thirty to a hundred times a second, on a page whose lane stack can be seventy rows. The playhead did
 // the same every frame of playback. Nothing here changes without something else changing first (a
 // resize, a zoom, the divider, a repaint), so the reads happen there and the hot paths read variables.
 let rulerW=1, rulerL=0, laneScroll=0, stageBox=null, scBox=null, tlTop=0, peekW=0, peekH=0, workL=8;
 function measureBoxes(){
   rulerW=ruler.clientWidth||1; rulerL=ruler.getBoundingClientRect().left;
   laneScroll=lanes.scrollLeft;
   stageBox=$('stage').getBoundingClientRect(); scBox=sc.getBoundingClientRect();
   tlTop=$('tl').getBoundingClientRect().top; workL=$('work').getBoundingClientRect().left;
 }
 const el=()=>document.activeElement||document.body;
 const typing=()=>/^(INPUT|TEXTAREA|SELECT)$/.test(el().tagName);
 // THE ONE LIVE REGION. The chooser's status line used to be aria-live and carried a seconds counter
 // ticking four times a second, so a screen reader read the whole panel again every 250ms for fifteen
 // seconds. The ticking figure is for the eye; this is for the ear, and it is written twice: once when
 // the work starts and once when it finishes.
 const say=(m)=>{ const el=$('say'); el.textContent=''; setTimeout(()=>{ el.textContent=m; },40); };
 // FOCUS SURVIVES A STATE CHANGE. The rail, the centre and the timeline are display:none'd by state,
 // and focus inside one of them was dropped to the body, which puts the next Tab back at the top of
 // the page. Whatever was hidden, focus lands on the control that hid it.
 const keepFocus=(fallback)=>{ const a=document.activeElement;
   if(a&&a!==document.body&&a.checkVisibility&&!a.checkVisibility()) fallback.focus(); };

 // ---------- the divider ----------
 // The preview and the timeline compete for the same vertical space and only the person looking knows
 // which one they need right now, so the split is theirs and it sticks per browser.
 const split=$('split'), tl=$('tl');
 const TLH_KEY='vawe-studio-tlh';
 function setTlh(px){ const max=Math.max(120,innerHeight-240);
   const v=Math.max(96,Math.min(max,Math.round(px)));
   document.documentElement.style.setProperty('--tlh',v+'px');
   split.setAttribute('aria-valuenow',String(v)); split.setAttribute('aria-valuemax',String(max));
   try{ localStorage.setItem(TLH_KEY,String(v)); }catch{}
   fit(); measureBoxes(); }
 try{ const s=+localStorage.getItem(TLH_KEY); if(s) setTlh(s); }catch{}
 // GRAB OFFSET, not a snap. Dragging from the bottom of the 9px handle used to jerk the divider up to
   // put the pointer at its middle; the timeline now keeps the size it had when you took hold of it.
 let splitGrab=0;
 split.addEventListener('pointerdown',e=>{ split.setPointerCapture(e.pointerId); split.classList.add('on');
   splitGrab=(innerHeight-e.clientY)-tl.getBoundingClientRect().height; });
 split.addEventListener('pointermove',e=>{ if(!split.hasPointerCapture(e.pointerId))return;
   setTlh(innerHeight-e.clientY-splitGrab); });
 // a cancelled gesture ends the drag as surely as a clean release does
 const splitDone=()=>split.classList.remove('on');
 split.addEventListener('pointerup',splitDone); split.addEventListener('pointercancel',splitDone);
 split.addEventListener('keydown',e=>{ const h=tl.getBoundingClientRect().height;
   if(e.key==='ArrowUp'){ e.preventDefault(); setTlh(h+24); }
   if(e.key==='ArrowDown'){ e.preventDefault(); setTlh(h-24); } });

 // ---------- the composition breadcrumb ----------
 // HONEST STUB, and the honesty is the feature. A \`composition\` layer does NOT hold a nested layer tree:
 // core/layers/composition.js looks the name up in core/compositions/ and hands a first-party JS function
 // the DOM plus its props. There is nothing on disk to drill INTO, so the crumb lists the compositions
 // this scene names and drilling in shows what that comp is and the data it was given. When the engine
 // grows real nested scenes, this is where the deeper levels attach.
 let crumbAt=null, insideLayer=null;
 function drawCrumbs(){ const c=$('crumbs'); const file=(model&&model.file)||document.title.split(' · ').pop();
   const comps=(model?model.layers:[]).filter(L=>L.type==='composition');
   let h='<button '+(crumbAt==null&&!insideLayer?'aria-current=page':'data-back=1')+'>'+esc(file)+'</button>';
   if(insideLayer) h+='<span class=sep>&rsaquo;</span><button aria-current=page>'+esc(insideLayer.id)+'</button>';
   else if(crumbAt!=null){ const L=comps.find(x=>x.i===crumbAt);
     h+='<span class=sep>/</span><button aria-current=page>comp: '+esc((L&&L.raw&&L.raw.comp)||'?')+'</button>'; }
   else if(comps.length) h+='<span class=sep>/</span>'+comps.map(L=>
     '<button data-comp="'+L.i+'">'+esc((L.raw&&L.raw.comp)||('layer '+L.i))+'</button>').join('<span class=sep>·</span>');
   c.innerHTML=h;
   c.querySelectorAll('[data-comp]').forEach(b=>b.addEventListener('click',()=>enterComp(+b.dataset.comp)));
   c.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>{ crumbAt=null; exitInside(); })); }
 function enterComp(i){ crumbAt=i; drawCrumbs(); setSel(i); }

 // ---- INSIDE VIEW: double-click a layer bar (or its "Open" button) to zoom the timeline to that
 // layer's own window, and see what runs inside it: its parts, its motion keys, and the camera moves
 // and transitions that happen while it is on screen. Nothing here edits the file; chat does that.
 let insideParts=null;   // the last /api/fragment result for the open layer's src, or [] / null
 function overlapPct(s,e,vs,ve){ return { l:100*Math.max(0,Math.min(1,(s-vs)/(ve-vs)))+'%',
   w:100*Math.max(0.006,Math.min(1,(e-s)/(ve-vs)))+'%' }; }
 function insideRow(label,kind,items,idAttr){
   if(!items.length) return '<div class=irow><b>'+esc(label)+'</b><span class=inone>none</span></div>';
   return '<div class=irow><b>'+esc(label)+'</b><div class=row>'+items.map(it=>{
     const p=overlapPct(it.s,it.e,insideLayer.start,insideLayer.start+insideLayer.dur);
     const id=idAttr&&it.i!=null?' data-'+idAttr+'="'+it.i+'"':'';
     return '<div class="bar k-'+kind+'"'+id+' style="left:'+p.l+';width:'+p.w+'" title="'+esc(it.title)+'"><span>'+esc(it.label)+'</span></div>';
   }).join('')+'</div></div>';
 }
 function paintInside(){
   if(!insideLayer) return;
   const L=insideLayer, vs=L.start, ve=L.start+L.dur, span=Math.max(1e-6,ve-vs);
   const step=span<=3?.25:span<=8?.5:1;
   let rh=''; for(let t=Math.ceil(vs/step)*step;t<=ve+1e-6;t+=step)
     rh+='<div class=t style="left:'+(100*(t-vs)/span)+'%"><s>'+clock(t-vs)+'</s></div>';
   ruler.innerHTML=rh; $('film').innerHTML='';
   const cams=overlappingCamera(vs,ve).map(c=>({i:c.i,s:Math.max(vs,c.start),e:Math.min(ve,c.start+c.dur),
     label:c.move||'camera',title:c.move+' '+c.from+' → '+c.to+' at '+c.start.toFixed(2)+'s'}));
   const trans=overlappingTransitions(vs,ve).map(t=>({i:t.i,s:Math.max(vs,t.at),e:Math.min(ve,t.at+t.dur),
     label:t.fx||t.mech||'transition',title:(t.fx||t.mech||'transition')+' at '+t.at.toFixed(2)+'s'}));
   const motion=(Array.isArray(L.raw.motion)?L.raw.motion:[]).map(k=>({s:vs+(k.t||0),e:vs+(k.t||0)+.3,
     label:'key '+(k.t||0).toFixed(2)+'s',title:JSON.stringify(k)}));
   const parts=(Array.isArray(L.raw.parts)?L.raw.parts:[]).map(p=>{ const s=vs+(p.delay||0), e=s+(p.each||0)+(p.exitDur||.3);
     return { s, e, label:(p.select||p.anim||'part'), title:JSON.stringify(p) }; });
   let h=insideRow('Camera','camera',cams,'cam-i')+insideRow('Transitions','fx',trans,'trans-i')+insideRow('Motion','motion',motion)+insideRow('Parts','part',parts);
   if(L.raw.src){
     h+='<div class=irow><b>Fragment</b>'+(insideParts==null?'<span class=inone>loading…</span>'
       :insideParts.length?'<div class=ichips>'+insideParts.map(p=>'<span class=ichip>'+esc(p.name)+(p.id?' #'+esc(p.id):'')+'</span>').join('')+'</div>'
       :'<span class=inone>no [data-part] found</span>')+'</div>';
   }
   rows.innerHTML=h;
   $('tlwhat').textContent=insideLayer.id+' · '+L.dur.toFixed(2)+'s';
   $('alerts').innerHTML='';
 }
 function loadInsideFragment(src){
   insideParts=null; paintInside();
   fetch('/api/fragment?src='+encodeURIComponent(src)).then(r=>r.json())
     .then(r=>{ insideParts=r.ok?r.parts:[]; if(insideLayer) paintInside(); })
     .catch(()=>{ insideParts=[]; if(insideLayer) paintInside(); });
 }
 function enterInside(i){
   const L=model&&model.layers.find(l=>l.i===i); if(!L) return;
   insideLayer={ i, id:(L.raw&&L.raw.id)||('layer '+i), start:L.start, dur:L.dur, raw:L.raw||{} };
   drawCrumbs(); setSel(i);
   if(insideLayer.raw.src) loadInsideFragment(insideLayer.raw.src); else { insideParts=null; paintInside(); }
   go(Math.round(insideLayer.start*fps));
 }
 function exitInside(){ if(!insideLayer&&crumbAt==null) return; insideLayer=null; crumbAt=null;
   drawCrumbs(); if(model) paint(model); if(selIdx>=0) layerProps(selIdx); }

 // ---------- keyframing ----------
 // ONE interaction, end to end: pick a layer, scrub to a frame, drag it. That writes a motion key at
 // that frame. Everything else an editor eventually needs sits on top of this loop.
 let FITS=1, keyMode=false, selIdx=-1, selStart=0, selLabel='', dragging=null, selCam=-1, selTrans=-1;
 // ---- eye toggle: PREVIEW ONLY. Never touches the scene JSON, never affects a render: it hides the
 // layer's element in the iframe every frame it draws, so a hidden layer stays hidden through seeking
 // and playback. Alt-click solos one layer (hides every other). Persisted per film, best effort.
 let hiddenLayers=new Set(), soloLayer=-1;
 const EYE_ON='<svg viewBox="0 0 16 16"><path d="M1.5 8S4 3 8 3s6.5 5 6.5 5-2.5 5-6.5 5S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>';
 const EYE_OFF='<svg viewBox="0 0 16 16"><path d="M1.5 8S4 3 8 3s6.5 5 6.5 5-2.5 5-6.5 5S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/><path d="M2 2l12 12"/></svg>';
 const hiddenKey=()=>'vawe-studio-hidden:'+((model&&model.file)||'');
 function loadHidden(){ try{ const raw=localStorage.getItem(hiddenKey()); hiddenLayers=new Set(raw?JSON.parse(raw):[]); }catch{ hiddenLayers=new Set(); } soloLayer=-1; }
 function saveHidden(){ try{ localStorage.setItem(hiddenKey(),JSON.stringify([...hiddenLayers])); }catch{} }
 const isHiddenState=(i)=>soloLayer>=0?i!==soloLayer:hiddenLayers.has(i);
 function refreshEyeUI(){
   rows.querySelectorAll('.eye').forEach(b=>{ const i=+b.dataset.eye, h=isHiddenState(i);
     b.classList.toggle('off',h); b.setAttribute('aria-pressed',String(h));
     b.setAttribute('aria-label',h?'show layer':'hide layer'); b.innerHTML=h?EYE_OFF:EYE_ON; });
   rows.querySelectorAll('.bar').forEach(b=>{ const i=+b.dataset.i; b.classList.toggle('hidden-layer',i>=0&&isHiddenState(i)); }); }
 function toggleEye(i,alt){
   if(alt) soloLayer=soloLayer===i?-1:i;
   else { soloLayer=-1; if(hiddenLayers.has(i)) hiddenLayers.delete(i); else hiddenLayers.add(i); saveHidden(); }
   refreshEyeUI(); applyHiddenVisibility(); }
 // re-applied every frame draw(), so a hidden layer stays hidden across a seek or a play loop.
 // An ATTRIBUTE plus one injected rule, never the layer's own visibility style: the engine writes that
 // style itself (a matte source, a resample source and its clone), so clearing it re-showed layers the
 // engine had hidden. Runs even with nothing hidden, so a layer shown again loses its mark.
 function applyHiddenVisibility(){
   try{ const doc=sc.contentDocument; if(!doc||!doc.head) return;
     if(!doc.getElementById('studio-hidden-rule')){ const st=doc.createElement('style'); st.id='studio-hidden-rule';
       st.textContent='[data-studio-hidden]{visibility:hidden!important}'; doc.head.appendChild(st); }
     doc.querySelectorAll('.hs-layer[data-idx]').forEach(el=>{
       if(isHiddenState(+el.dataset.idx)) el.setAttribute('data-studio-hidden',''); else el.removeAttribute('data-studio-hidden'); });
   }catch{ /* cross-origin doc: nothing to hide */ } }
 const dragEl=$('drag'), keyBtn=$('key'), selOut=$('sel');
 function setSel(i){ if(i!==selIdx) selOut.textContent='';
   selIdx=i; selCam=-1; selTrans=-1; const L=model&&model.layers.find(l=>l.i===i);
   selStart=L?L.start:0; selLabel=L?(L.type+' '+(L.label||'')):'';
   layerProps(i); selReadout();
   [...rows.querySelectorAll('.bar')].forEach(b=>b.classList.toggle('sel',b.dataset.camI==null&&b.dataset.transI==null&&+b.dataset.i===i));
   drawSelBox(); paintSel(); }
 // a camera leg or transition is a moment, not a layer: selecting one shows its OWN Curves, not a
 // layer's, so it goes through showProps directly rather than layerProps. curvesFor is reused with an
 // empty layer (no motion/parts) and just the one camera or transition in its list.
 function paintSel(){
   [...document.querySelectorAll('#ruler .camleg,#ruler .m,.bar[data-cam-i],.bar[data-trans-i]')].forEach(el=>
     el.classList.toggle('sel',(el.dataset.camI!=null&&+el.dataset.camI===selCam)||(el.dataset.transI!=null&&+el.dataset.transI===selTrans)));
 }
 function camProps(i){
   const c=model&&(model.cameraMove||[]).find(x=>x.i===i); if(!c) return;
   selIdx=-1; selCam=i; selTrans=-1;
   [...rows.querySelectorAll('.bar')].forEach(b=>b.dataset.camI==null&&b.dataset.transI==null&&b.classList.remove('sel'));
   drawSelBox();
   showProps('Camera',prow('Type',fld('camera'))+prow('Move',fld(c.move||'?'))
     +prow('Time',fld(c.start.toFixed(2),'S'),fld(c.dur.toFixed(2),'D'))+curvesFor(-1,null,{},[c],[]),c.raw);
   paintSel();
 }
 function transProps(i){
   const t=model&&(model.transitions||[]).find(x=>x.i===i); if(!t) return;
   selIdx=-1; selCam=-1; selTrans=i;
   [...rows.querySelectorAll('.bar')].forEach(b=>b.dataset.camI==null&&b.dataset.transI==null&&b.classList.remove('sel'));
   drawSelBox();
   showProps('Transition',prow('Type',fld('transition'))+prow('FX',fld(t.fx||t.mech||'?'))
     +prow('At',fld(t.at.toFixed(2),'S'),fld(t.dur.toFixed(2),'D'))+curvesFor(-1,null,{},[],[t]),t.raw);
   paintSel();
 }
 // ---- THE FOUR STATES ----------------------------------------------------------------------------
 // One scene, one playhead, four things you might be doing with them. Nothing here touches sc.src: the
 // centre is hidden and shown, so the engine stays booted and the frame you left is the frame you
 // return to. Entering a state does its work LAZILY, because two of them cost seconds of rendering.
 function setState(s){
   document.body.dataset.state=s;
   keepFocus(document.querySelector('#states button[data-state="'+s+'"]'));
   [...document.querySelectorAll('#states button[data-state]')].forEach(b=>
     b.setAttribute('aria-pressed',String(b.dataset.state===s)));
   // Each pane has its own route (/studio/plan etc, studio/server.mjs), so the address bar always names
   // the pane on screen: an agent (or a bookmark) can come straight back to the one that was broken.
   if(history.replaceState) history.replaceState(null,'','/studio/'+s);
   if(s==='make') fit();
   if(s==='plan'){ drawPlan(); if(planSub==='sheets') showSheet(sheetKind); }
   if(s==='ship') drawShip();
   if(s==='sound') drawSound();
 }
 document.querySelectorAll('#states button[data-state]').forEach(b=>b.addEventListener('click',()=>setState(b.dataset.state)));

 // ---- PLAN's two sub-views: the composed frames (default), and the rendered contact sheets that
 // used to be their own "Look" nav entry. One place answers both "what is in this beat" and "what did
 // it look like once assembled", because approving a plan and checking it against the render are the
 // same errand, not two.
 let planSub='frames';
 const planviewEl=$('planview'), lookpaneEl=$('lookpane');
 function setPlanSub(sub){
   planSub=sub;
   [...document.querySelectorAll('#planpane .panehead .seg [data-sub]')].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sub===sub)));
   planviewEl.hidden=sub!=='frames'; lookpaneEl.hidden=sub!=='sheets';
   if(sub==='sheets') showSheet(sheetKind);
 }
 document.querySelectorAll('#planpane .panehead .seg [data-sub]').forEach(b=>b.addEventListener('click',()=>setPlanSub(b.dataset.sub)));

 // ---- PLAN: the film as its own frames, not as grey boxes ---------------------------------------
 // The person signing a plan off judges what is in the frame (engine-doctrine/MISTAKES.md #592), so every beat that
 // names a `fragment:` shows that markup live, on the film's theme. The pane keeps only what that person
 // decides yes or no on; the fields written for the agents that build the film stay in the storyboard.
 const planPath=$('planpath'), planNote=$('plannote'), planBody=$('planbody');
 let planDrawn=false;
 // A STORYBOARD SAYS "NO COPY" IN PROSE: "onscreen: (none, the mark itself is the only mark)" is the
 // author declining the slot, not words that will be in the film, so it is never shown as copy.
 const declined=(l)=>/^\s*\(?\s*none\b/i.test(l) || /^\s*\(.*\)\s*$/.test(l);
 // a gate line as a value: its first clause, and for a long clause only its subject ("no panels")
 const shortFinding=(s)=>{ const c=String(s).split(/[,:;(\x60]|\.\s/)[0].trim();
   return c.split(/\s+/).length>5?c.split(/\s+(?:have|has|is|are|was|were|does|do)\s/)[0]:c; };
 function planEmpty(why){
   planBody.innerHTML=''; planNote.hidden=false;
   planNote.innerHTML='<h2>No storyboard</h2><p>'+esc(why)+'</p>'
     +'<ul><li><code>&lt;name&gt;.storyboard.md</code></li>'
     +'<li><code>make storyboard-check SB=&lt;file&gt;</code></li></ul>';
 }
 const planRow=(label,v)=>v?'<div class=prow><dt>'+label+'</dt><dd>'+esc(v)+'</dd></div>':'';
 // the film as a whole: its message, who it is for, how long, what shape, its one loud moment and what it
 // refuses, and only the storyboard gate's warnings and errors
 // the gate's warnings and errors as short values; five "beat X has no scene layer" lines are one fact
 function gateChips(findings){
   const warn=(findings||[]).filter(f=>f.kind!=='✓'&&!/make panels|continuous-object contract/.test(f.line));
   const unbuilt=warn.filter(f=>/no scene layer starts there/.test(f.line));
   const chips=warn.filter(f=>!unbuilt.includes(f))
     .map(f=>[f.kind,/continuous-object contract/.test(f.line)?'object contract not assembled':shortFinding(f.line)]);
   if(unbuilt.length) chips.unshift([unbuilt[0].kind,unbuilt.length+' beat'+(unbuilt.length===1?'':'s')+' not assembled']);
   return chips.length?'<div id=plangate>'+chips.map(([k,t])=>'<span class="'+(k==='✗'?'err':'warn')+'">'+esc(t)+'</span>').join('')+'</div>':'';
 }
 function planHead(d,frames){
   return '<div id=planhead><p id=planmsg>'+esc(d.message||'No message')+'</p>'
     +'<div id=planfacts>'+(d.audience?'<span>Audience <b>'+esc(d.audience)+'</b></span>':'')
     +'<span>Duration <b>'+esc(d.duration||'?')+'s</b></span>'
     +(d.format?'<span>Format <b>'+esc(d.format)+'</b></span>':'')+'</div>'
     +(d.spectacle||d.not?'<dl class=planspine>'+planRow('Spectacle',d.spectacle)+planRow('Not',d.not)+'</dl>':'')
     +gateChips(d.findings)
     +colorStrip(d.beats,frames)
     +feedbackBlock(d.feedback,null)
     +'</div>';
 }
 // ---- THE COLOUR STRIP: one swatch per beat, storyboard order, seams marked between them ---------
 // "when storyboarding the frames do we see colors across frames and how transitions will handle the
 // colors" (the owner's own words). Today that arc is one paragraph of frontmatter prose nobody sees
 // until the film renders; this draws it here, in the state where approval happens.
 //
 // EVERY SWATCH IS THE REAL RENDERED FRAME'S OWN COLOUR, never a value read off the storyboard's
 // `ground:` line: two authors reading the same "ground: dusk" line pictured different colours before
 // this existed, which is exactly the gap `/api/plan-frames` (studio/server.mjs) closed for the
 // picture beneath each beat. A swatch is a downsample of THAT SAME frame (`paintColorStrip` below),
 // so it can never show a colour the render would not. A seam's arrow is `transition_value`
 // (harness/lib/contract.mjs, closed vocabulary: dark->light · light->dark · held), read off the ONE
 // storyboard parser like every other field on this pane.
 //
 // A beat with no rendered frame yet says so IN WORDS and names the command that renders one, the same
 // honest-missing shape `beatPicture()` uses for the picture itself. Never a hatched placeholder: a
 // shape that says nothing is indistinguishable from a colour nobody looked at.
 function seamChip(v){
   if(!v) return '<span class="cseam none" title="no transition_value declared for this join">?</span>';
   if(v==='held') return '<span class="cseam held" title="transition_value: held">held</span>';
   return '<span class="cseam flip '+(v==='dark->light'?'up':'down')+'" title="transition_value: '+esc(v)+'">'
     +(v==='dark->light'?'dark → light':'light → dark')+'</span>';
 }
 function colorStrip(beats,frames){
   if(!beats||!beats.length) return '';
   const cells=beats.map((b,i)=>{
     const f=(frames||[])[i];
     let swatch;
     if(f&&f.src){
       swatch='<span class=cswatch data-src="'+esc(f.src)+'" title="'+esc(b.name)+', dominant colour of the rendered frame at '+f.t+'s"></span>';
     } else {
       const why=(f&&f.missing)||'the rendered frames have not loaded yet.';
       const cmd=f&&f.cmd;
       swatch='<span class="cswatch none" title="'+esc(b.name)+', '+esc(why)+(cmd?' Run: '+esc(cmd):'')+'">'
         +(cmd?'<code>'+esc(cmd)+'</code>':'<b>no frame</b>')+'</span>';
     }
     const join=i>0?'<span class=cjoin>'+seamChip(beats[i].transition_value)+'</span>':'';
     return join+'<span class=ccell>'+swatch+'<b>'+(i+1)+'</b></span>';
   }).join('');
   return '<div id=colorstrip role=group aria-label="colour arc: one swatch per beat, storyboard order">'
     +'<h4>Colour arc</h4><div id=cstrip>'+cells+'</div></div>';
 }
 // paintColorStrip(): fills every swatch left blank by colorStrip (a real frame exists, its colour does
 // not yet) by downsampling that SAME jpg to a few pixels and averaging them. Canvas, not a library: a
 // dominant colour for a 44x32 swatch does not need k-means, it needs the frame's own average tone.
 // Runs after the HTML lands because it needs the <img> decode; harmless to call again on a re-draw,
 // `data-painted` skips a swatch already done.
 function paintColorStrip(){
   document.querySelectorAll('#cstrip .cswatch[data-src]').forEach((el)=>{
     if(el.dataset.painted) return; el.dataset.painted='1';
     const img=new Image();
     img.onload=()=>{
       try{
         const c=document.createElement('canvas'); c.width=8; c.height=8;
         const cx=c.getContext('2d'); cx.drawImage(img,0,0,8,8);
         const px=cx.getImageData(0,0,8,8).data;
         let r=0,g=0,b=0,n=px.length/4;
         for(let i=0;i<px.length;i+=4){ r+=px[i]; g+=px[i+1]; b+=px[i+2]; }
         el.style.background='rgb('+Math.round(r/n)+','+Math.round(g/n)+','+Math.round(b/n)+')';
       }catch{ el.classList.add('none'); el.innerHTML='<b>unreadable</b>'; }
     };
     img.onerror=()=>{ el.classList.add('none'); el.innerHTML='<b>unreadable</b>'; };
     img.src=el.dataset.src;
   });
 }
 // ---- THE PICTURE: a real rendered still of the assembled scene at this beat's start, or the honest
 // reason there is none yet. Never a shape, never a fragment previewed alone (MISTAKES.md #592, and
 // the owner's own words: "plan should only show complete rendered sheet actual how it will look in
 // video"). `frames[i]` comes from /api/plan-frames, one entry per beat, built server-side by seeking
 // the real scene.html this studio already boots.
 function beatPicture(b,i,frames){
   const f=(frames||[])[i];
   if(f&&f.src) return '<div class=pstage><img loading=lazy alt="'+esc(b.name)+' at '+f.t+'s"'
     +' width="'+f.w+'" height="'+f.h+'" src="'+esc(f.src)+'"></div>';
   const why=(f&&f.missing)||'the rendered frames have not loaded yet.';
   return '<div class="pstage none"><b>No rendered frame yet</b><span>'+esc(why)+'</span>'
     +(f&&f.cmd?'<code>'+esc(f.cmd)+'</code>':'')+'</div>';
 }
 // One beat is one row: the picture on the left at the film's real ratio, what it says and why on the right
 function beatHtml(b,i,prevArch,frames){
   const words=(b.onscreen||[]).filter(l=>l&&!declined(l)&&l.split(/\s+/).length<=12&&!/[()]/.test(l));
   return '<section class=pbeat id="pbeat-'+(i+1)+'"><header><span class=pn>'+(i+1)+'</span><h3>'+esc(b.name)+'</h3>'
     +'<span class=pmeta>'+(+b.start).toFixed(1)+'s to '+(+b.end).toFixed(1)+'s</span>'
     +'<span class="pmeta pdur">'+(b.end-b.start).toFixed(1)+'s</span><span class=sp></span>'
     +(b.weight==='peak'?'<span class="ptag peak">Peak</span>':'')
     +(b.archetype&&prevArch===b.archetype?'<span class="ptag repeat">Repeat</span>':'')
     +'</header>'+beatPicture(b,i,frames)+'<div>'
     +(words.length?'<ul class=pcopy>'+words.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul>':'')
     +'<dl>'+planRow('Picture',b.picture)+planRow('Object',b.object)+planRow('Shot',b.shot)+planRow('Placement',b.placement)+planRow('Why',b.why)+'</dl>'
     +motionBlock(b)+feedbackBlock(b.feedback,i)+'</div></section>';
 }
 // ---- HOW IT ANIMATES, in the beat's own words -----------------------------------------------
 // "how they will be animated, written in english" (the owner's own words). No new vocabulary: this
 // reads the fields a beat already declares (`becomes:`, `mechanism:`, `eye:`, `camera:`, `move:`,
 // `motion:`, `transition_in:`/`transition_why:`/`transition_value:`) and shows them legibly, in
 // storyboard order, rather than inventing a keyframe grammar this repo does not have. `becomes:` and
 // `mechanism:` are already prose (the before/after and the how); `move:`/`motion:`/`camera:` are the
 // engine's own compact grammar strings and are shown as declared, not re-narrated.
 function motionBlock(b){
   const seam=b.transition_in?(b.transition_in+(b.transition_why?' · '+b.transition_why:'')):null;
   const rows=[planRow('Becomes',b.becomes),planRow('Mechanism',b.mechanism),planRow('Eye',b.eye),
     planRow('Camera',b.camera),planRow('Move',b.move),planRow('Motion',b.motion),planRow('Transition in',seam)].join('');
   return rows?'<h4 class=psub>How it animates</h4><dl>'+rows+'</dl>':'';
 }
 // ---- FEEDBACK, written straight into the storyboard --------------------------------------------
 // "in plan mode itself i should be able to give feedback in studio so i can do changes there only"
 // (the owner). The storyboard file is the only store: a submit POSTs to /api/plan/feedback, the
 // server appends a `- feedback:` line into this beat's own block (or the frontmatter for a film-level
 // note, `beatIdx===null`), and the pane re-fetches the plan, so what is shown here is always exactly
 // what is on disk, never a second copy that could drift from it.
 function feedbackBlock(list,beatIdx){
   const items=(list||[]).map((t)=>'<li>'+esc(t)+'</li>').join('');
   return '<div class=pfeedback>'
     +(items?'<h4 class=psub>Feedback</h4><ul class=pflist>'+items+'</ul>':'')
     +'<form class=pfform data-beat="'+(beatIdx==null?'':beatIdx)+'">'
     +'<input type=text placeholder="Leave feedback on this '+(beatIdx==null?'film':'beat')+'…" maxlength=500 required>'
     +'<button type=submit>Add</button></form></div>';
 }
 planBody.addEventListener('submit',(e)=>{
   const form=e.target.closest('.pfform'); if(!form) return;
   e.preventDefault();
   const input=form.querySelector('input'), text=input.value.trim(); if(!text) return;
   const beat=form.dataset.beat===''?null:Number(form.dataset.beat);
   const btn=form.querySelector('button'); btn.disabled=true; btn.textContent='Adding…';
   fetch('/api/plan/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beat,text})})
     .then((r)=>r.json()).then((d)=>{
       if(!d.ok){ btn.disabled=false; btn.textContent='Add'; say('feedback not saved: '+(d.error||'unknown error')); return; }
       say('feedback saved to the storyboard'); drawPlan(true);
     }).catch((err)=>{ btn.disabled=false; btn.textContent='Add'; say('feedback not saved: '+err.message); });
 });
 // Two fetches: the storyboard's own fields, and the rendered still per beat (/api/plan-frames, which
 // seeks the real scene.html server-side and can take a couple of seconds the first time). Neither
 // blocks the other's failure: a storyboard with no scene yet still shows its words, with an honest
 // "no rendered frame yet" in place of a picture.
 function drawPlan(force){
   if(planDrawn&&!force) return;
   planDrawn=true; planPath.textContent='reading…';
   Promise.all([
     fetch('/api/plan?t='+Date.now()).then(r=>r.json()),
     fetch('/api/plan-frames?t='+Date.now()).then(r=>r.json()).catch(()=>({frames:[]})),
   ]).then(([d,pf])=>{
     planPath.textContent='';
     if(!d.ok) return planEmpty(d.error||'no storyboard');
     planNote.hidden=true;
     const frames=(pf&&pf.frames)||[];
     let prev='';
     planBody.innerHTML=planHead(d,frames)+d.beats.map((b,i)=>{ const s=beatHtml(b,i,prev,frames); prev=b.archetype||''; return s; }).join('');
     paintColorStrip();
     say('the plan is drawn, '+d.beats.length+' beats');
     // The frame render is still running server-side (a scene launch + N seeks): come back for the
     // pictures once it finishes, rather than leaving every beat on "not loaded yet" forever.
     if(pf&&pf.busy) setTimeout(()=>drawPlan(true),1500);
   }).catch(e=>{ planPath.textContent=''; planEmpty('could not read the plan: '+e.message); });
 }
 $('planredraw').addEventListener('click',()=>drawPlan(true));

 // ---- the stage chip, filled from the same reader that make stage prints ----------------------------
 // READ-ONLY: the stage comes from the files on disk (quality/gates/stage.mjs), so the chip cannot claim
 // a stage the repo is not in. Clicking it copies the one next command.
 fetch('/api/stage').then(r=>r.json()).then(d=>{
   stageInfo=d;
   if(!d||!d.ok) return;
   const chip=$('stagechip'), name=$('stagename'), at=d.order.indexOf(d.stage), label=cap(d.stage);
   name.textContent=label;
   chip.title=d.command||d.next;
   chip.setAttribute('aria-label','stage '+d.stage+', copy the next command');
   chip.hidden=false;
   chip.addEventListener('click',()=>{
     const back=()=>setTimeout(()=>{ name.textContent=label; },1400);
     navigator.clipboard.writeText(d.command||d.next).then(()=>{ name.textContent='Copied'; say('copied: '+(d.command||d.next)); back(); },
       ()=>{ name.textContent='Copy failed'; back(); }); });
 }).catch(()=>{});

 // ---- PLAN / Rendered sheets: the film as a STRIP, which is a different question from a frame -----
 // Scrubbing tells you what a frame IS. A strip tells you whether the film WORKS, and the two sheets
 // here are the ones this repo already makes and least often reads: every beat in · mid · out, and
 // both sides of every transition pulled out of the rendered mp4. Neither needs new engine work. This
 // used to be its own "Look" state; it is now Plan's second sub-view (setPlanSub above), because
 // approving what a beat shows and checking what it rendered to are the same errand.
 const sheetImg=$('sheet'), sheetBtn=$('sheetzoom'), sheetNote=$('sheetnote'), lookStat=$('lookstat');
 // THE SHEET'S REAL SIZE, SENT WITH IT. The server reads the PNG's IHDR and answers X-Dim; the page
 // writes it to the width/height ATTRIBUTES, so the box is the right shape before a byte is decoded.
 // The CSS keeps both axes auto, which is the guard against the scar this repo already has: a mapped
 // height attribute beating an aspect-ratio and squashing every thumbnail on the site.
 const dimOf=(s)=>{ const p=String(s||'').split('x').map(Number);
   return (p.length===2&&p[0]>0&&p[1]>0)?p:null; };
 function setSheet(u,dim){ const d=dimOf(dim);
   if(d){ sheetImg.width=d[0]; sheetImg.height=d[1]; } else { sheetImg.removeAttribute('width'); sheetImg.removeAttribute('height'); }
   sheetImg.src=u; sheetBtn.hidden=false; sheetNote.hidden=true; }
 // The first two need NO RENDER: both seek renderFrame in a headless page, exactly as the scrubber does,
 // so a scene that has never been rendered can still be judged as a strip. Only the seams need an mp4.
 let sheetKind='beats', sheetHave={};
 let renderPoll=null;
 function lookBusy(msg){ lookStat.innerHTML='<span class=work><i></i>'+esc(msg)+'</span>'; }
 function note(title,body){ sheetBtn.hidden=true; sheetNote.hidden=false;
   sheetNote.innerHTML='<b>'+esc(title)+'</b>'+body; }
 const sheetErr={};   // a sheet the scene cannot draw is kept, so each visit does not re-run the failing render
 function showSheet(kind,force){
   sheetKind=kind;
   [...document.querySelectorAll('[data-sheet]')].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sheet===kind)));
   if(sheetHave[kind]&&!force){ setSheet(sheetHave[kind].u,sheetHave[kind].dim); lookStat.textContent=''; return; }
   if(sheetErr[kind]&&!force){ lookStat.textContent=''; note('Scene did not load',sheetErr[kind]); return; }
   const busy={beats:'rendering beats',frames:'rendering key frames',seams:'decoding seams'}[kind]||'rendering';
   lookBusy(busy); say(busy);
   sheetBtn.hidden=true; sheetNote.hidden=true;
   // EACH SHEET COSTS SECONDS, so two can be in flight and the slower one used to land last and
   // overwrite the one you asked for second. A reply for a sheet nobody is looking at now is dropped.
   const mine=()=>sheetKind===kind;
   fetch('/__sheet?kind='+kind+'&t='+Date.now()).then(r=>{
     if(!mine()) return;
     const dim=r.headers.get('X-Dim');
     if(r.headers.get('X-Needs-Render')) return r.text().then(()=>{ lookStat.textContent=''; say('there are no seam frames yet');
       // SAY IT, never draw an empty grid. And offer the one thing that would fix it.
       note('No seam frames yet',window.sceneFailed?'':'<p><button id=dorender>Render</button></p>');
       const dr=$('dorender'); if(dr) dr.addEventListener('click',startRender); });
     if(r.headers.get('X-Scene-Error')) return r.text().then(t=>{ lookStat.textContent='';
       sheetErr[kind]='<details><summary>Output</summary><pre style="white-space:pre-wrap;user-select:text;font:11px/1.5 ui-monospace,monospace">'+esc(t)+'</pre></details>';
       say('the scene did not load'); note('Scene did not load',sheetErr[kind]); });
     if(!r.ok) return r.text().then(t=>{ lookStat.textContent=''; say('that sheet could not be drawn'); note('that sheet could not be drawn','<pre style="white-space:pre-wrap;user-select:text;font:11px/1.5 ui-monospace,monospace">'+esc(t)+'</pre>'); });
     return r.blob().then(b=>{ const u=URL.createObjectURL(b); sheetHave[kind]={u,dim};
       setSheet(u,dim); lookStat.textContent=''; say('the '+kind+' sheet is ready'); }); })
   .catch(e=>{ lookStat.textContent=''; say('that sheet could not be drawn'); note('that sheet could not be drawn',esc(e.message)); });
 }
 document.querySelectorAll('[data-sheet]').forEach(b=>b.addEventListener('click',()=>showSheet(b.dataset.sheet)));
 sheetBtn.addEventListener('click',()=>{ const full=sheetBtn.classList.toggle('full');
   sheetBtn.setAttribute('aria-pressed',String(full));
   sheetBtn.setAttribute('aria-label',full?'fit the sheet to the pane':'show the sheet at real pixels'); });
 // THE RENDER, polled rather than awaited: a fetch held open for four minutes is a frozen panel with
 // nothing to say for itself.
 function startRender(){
   fetch('/api/render',{method:'POST'}).then(r=>r.json()).then(pollRender);
 }
 function pollRender(st){
   if(!st) return;
   if(!st.done){ lookBusy('rendering · '+(st.secs||0)+'s · '+(st.line||''));   // the ticking figure is for the eye; say() spoke once at the start
     clearTimeout(renderPoll); renderPoll=setTimeout(()=>fetch('/api/render').then(r=>r.json()).then(pollRender),1500); return; }
   lookStat.textContent='';
   if(st.error){ note('the render failed','<pre style="white-space:pre-wrap;user-select:text;font:11px/1.5 ui-monospace,monospace">'+esc(st.error)+'</pre>'); return; }
   sheetHave.seams=null; say('the render finished'); showSheet('seams',true);
 }
 // THE PLAYHEAD IS SHARED, and this is where that pays: every marked moment in the film is one click
 // from the strip, and the click lands you in Make at that frame.
 function drawJump(){
   const j=$('jump'); if(!model) return;
   const ms=(model.marks||[]).map(k=>[k.t,k.kind]);
   j.hidden=!ms.length;
   j.innerHTML=ms.map(([t,k])=>'<button data-t="'+t+'">'+esc(k)+' '+(+t).toFixed(2)+'s</button>').join('');
   j.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{
     setState('make'); go(Math.round(+b.dataset.t*fps)); }));
 }

 // ---- SHIP: a stub, and it says which gate it is showing you --------------------------------------
 // The ladder is \`make ship\`, twenty steps that declare themselves as they run, and none of it is
 // wired here. What IS real is beat-check, because the timeline already runs it, so this shows exactly
 // that one gate's codes and refuses to imply it has seen the other nineteen.
 function drawShip(){
   const g=(model&&model.gate)||{codes:[]};
   const codes=g.codes||[], cmd='make ship D='+((model&&(model.path||model.file))||'');
   $('shipstat').textContent=window.sceneFailed?'scene did not load':codes.length?codes.length+' finding'+(codes.length===1?'':'s'):'no findings';
   $('shipbody').innerHTML=(codes.length?'<h2>Findings</h2><ul>'+codes.map(c=>'<li><code>'+esc(c)+'</code></li>').join('')+'</ul>':'')
     +'<button class=copycmd id=shipcmd><code>'+esc(cmd)+'</code><span>Copy</span></button>';
   const b=$('shipcmd'), lab=b.querySelector('span'), back=()=>setTimeout(()=>{ lab.textContent='Copy'; },1400);
   b.addEventListener('click',()=>navigator.clipboard.writeText(cmd)
     .then(()=>{ lab.textContent='Copied'; say('copied: '+cmd); back(); },()=>{ lab.textContent='Copy failed'; back(); }));
 }
 // ---- SOUND: hear every cue before it ships, against the frame it lands on ------------------------
 // Sound used to be the one decision made blind: an author wrote a cue's NAME into JSON and only heard
 // it after a full render. This reads the SAME list the render mixes, `window.__engine.meta.sfx`
 // (films/scene/scene.js buildSfx()), so the row can never claim a different mix than the one that
 // ships. It includes the IMPLICIT cues (a keystroke, a layer arrival, a tactile pluck), not just the
 // three an author might have hand-placed, because those are the ones a cue list that only reads
 // `audio.cues` would lie about.
 //
 // `why` (what happens at this instant) is RECONSTRUCTED here from the model this pane already holds
 // (layers, transitions, camera, typing), never re-derived engine-side: a wrong guess here only
 // mislabels a row, it can never change what plays.
 let soundSfx=[];
 const sfxWavExists={}; // cue name -> true/false, HEAD-checked once and cached for the session
 function playCue(name){
   try{ const a=new Audio('/assets/sfx/'+encodeURIComponent(name)+'.wav'); a.play().catch(()=>{}); }catch{}
 }
 // The verb is read off the CUE NAME, never the event: the same "pluck" always "pops", whatever
 // caused it, so the row names what will be HEARD, matching the label to a sound the ear can learn.
 const SOUND_VERB={impact:'lands',pluck:'pops',bloom:'opens',droplet:'drops',whoosh:'pans',
   riser:'builds',chime:'chimes',sparkle:'sparkles',success:'resolves',ready:'settles',
   drop:'falls',swell:'swells',braam:'hits',
   // the interaction-vocabulary ALIASES a keystroke or a UI-style cue actually names
   // (generators/media/audio-bake.mjs ROLES), each pointing at the voicing it bakes to.
   click:'pops',pop:'drops',tick:'pops',key:'pops',press:'pops',release:'pops',toggle:'pops',
   page:'pans',loading:'swells',error:'lands',whisper:'swells',thud:'lands',travel:'pans',
   sweep:'pans',reveal:'chimes'};
 // The timeline model only lists TOP-LEVEL layers (studio/server.mjs), but a `group`'s children
 // (nested under `children`) are where most typed text and small parts actually live, so a keystroke
 // is invisible here unless this pane walks down into them itself. `path` records the exact chain of
 // array/index hops (`['layers',3,'children',1]`) so an override can be written back through the same
 // hops with `/api/apply`, which only ever edits the object literal actually on disk.
 // A group CHILD'S clock is its parent's, offset by `delay`, and that is the whole vocabulary
 // (core/layers/util.js addGroupChild): a child's own `start` is authored but never read by the
 // engine, only `delay` is. Recomputing that same rule here (rather than the child's `start`) is what
 // made the first pass of this pane mislabel every nested keystroke by up to a second.
 function flattenLayers(m){
   const out=[];
   const walk=(L,start,path,label)=>{
     out.push({ raw:L, path, label:label||L.id||L.type||'layer', start });
     if(Array.isArray(L.children)) L.children.forEach((c,j)=>
       walk(c, start+Math.max(0,+c.delay||0), path.concat(['children',j]), (label||L.id||L.type)+' > '+(c.id||c.type)));
   };
   (m.layers||[]).forEach(L=>walk(L.raw||{},+(L.start||0),['layers',L.i],L.label||L.type));
   return out;
 }
 function cueWhy(t,flat,m){
   const eps=0.06;
   for(const F of flat){
     if(!F.raw.typing||F.raw.keyClicks===false) continue;
     const cps=F.raw.typing===true?24:+F.raw.typing, full=String(F.raw.text||'');
     if(!full.length) continue;
     // one keystroke every 1/cps seconds, closer together than `eps`, so the NEAREST index is solved
     // directly (core/type/type.js: character i lands at start+(i+1)/cps) rather than found by a
     // threshold scan, which used to match several adjacent keys to the same row.
     const i=Math.round((t-F.start)*cps)-1;
     if(i<0||i>=full.length) continue;
     if(Math.abs(t-(F.start+(i+1)/cps))<eps) return { label:F.label+' keystroke '+(i+1)+' of '+full.length, path:F.path };
   }
   for(const c of ((m&&m.transitions)||[])) if(Math.abs(t-c.at)<eps)
     return { label:(c.mech||'transition')+(c.fx?' '+c.fx:'') };
   for(const c of ((m&&m.cameraMove)||[])) if(Math.abs(t-c.start)<eps)
     return { label:'camera '+(c.move||'move')+' begins' };
   for(const F of flat) if(Math.abs(t-F.start)<eps)
     return { label:F.label+' arrives', arrival:true };
   return { label:null };
 }
 // Every row is overridable, even a purely derived one: `audio.cues[]` placed by hand ALWAYS beats a
 // derived cue at the same joint (core/audio/tactile.js), so "choose an alternative" always ends up
 // writing one. If this exact cue is already an authored entry, its own index is patched in place;
 // otherwise a new one is hand-placed 1ms earlier, which is enough to win buildSfx's tie-break (sorts
 // by time, then keeps the first of any two cues under 0.09s apart) without touching the engine.
 function cueTarget(c,m){
   const authored=(m.audio&&m.audio.cues)||[];
   const ci=authored.findIndex(a=>Math.abs(a.t-c.t)<0.03&&a.name===c.name);
   if(ci>=0) return { kind:'authored', ci };
   if(c.why.path&&!c.why.arrival) return { kind:'keystroke', path:c.why.path };
   return { kind:'derive', authoredLen:authored.length };
 }
 function chooseCue(i,newName){
   const c=soundSfx[i]; if(!c||!model) return;
   const t=cueTarget(c,model);
   let ops;
   if(t.kind==='authored') ops=[{op:'replace',path:'audio/cues/'+t.ci+'/name',value:newName}];
   else if(t.kind==='keystroke') ops=[{op:'add',path:t.path.join('/')+'/keyCue',value:newName}];
   else { const idx=t.authoredLen, at=Math.max(0,+(c.t-0.001).toFixed(3));
     ops=[{op:'add',path:'audio/cues/'+idx+'/t',value:at},{op:'add',path:'audio/cues/'+idx+'/name',value:newName}]; }
   fetch('/api/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ops})})
     .then(r=>r.json()).then(res=>{
       if(!res.ok){ say('could not change the sound: '+res.error); return; }
       say(newName+' at '+c.t.toFixed(2)+'s'); timeline();
       reloadScene(); sc.addEventListener('load',()=>{ setTimeout(()=>{
         if(document.body.dataset.state==='sound') drawSound(); },250); },{once:true});
     });
 }
 function soundRowHtml(c,i,roles){
   const label=c.why.label?esc(c.why.label):'cue', verb=SOUND_VERB[c.name]||'sounds';
   if(sfxWavExists[c.name]==null) fetch('/assets/sfx/'+encodeURIComponent(c.name)+'.wav',{method:'HEAD'})
     .then(r=>{ sfxWavExists[c.name]=r.ok; if(!r.ok) drawSound(); }).catch(()=>{ sfxWavExists[c.name]=false; });
   const missing=sfxWavExists[c.name]===false;
   return '<div class=srow>'
     +'<button class=splay data-name="'+esc(c.name)+'" aria-label="play '+esc(c.name)+'" title="Play '+esc(c.name)+'">'+ICON.sound+'</button>'
     +'<button class=swhat data-t="'+c.t+'" title="Go to '+c.t.toFixed(2)+'s in Make">'
       +'<b>'+label+' &middot; '+verb+'</b><s>'+c.t.toFixed(2)+'s</s></button>'
     +'<span class=scur>'+esc(c.name)+(missing?'<i class=miss>needs <code>make audio</code></i>':'')+'</span>'
     +'<div class=spick>'+roles.map(r=>'<span class=alt>'
       +'<button class=altplay data-name="'+esc(r)+'" aria-label="Play '+esc(r)+'" title="Play '+esc(r)+'">'+ICON.sound+'</button>'
       +'<button class=altuse data-i="'+i+'" data-name="'+esc(r)+'" aria-pressed="'+(r===c.name)+'" title="Use '+esc(r)+' here">'+esc(r)+'</button></span>').join('')+'</div>'
     +'</div>';
 }
 let soundWired=false;
 function drawSound(){
   const note=$('soundnote'), body=$('soundbody');
   const eng=sc.contentWindow&&sc.contentWindow.__engine;
   if(!model||!eng||!eng.meta){ note.hidden=false; body.innerHTML='';
     // A scene that failed to boot never sets `eng`, so this branch would otherwise say "Loading…"
     // forever. `window.sceneFailed` (set by fail()) tells the two states apart.
     if(window.sceneFailed){ const pre=preAssembleNote();
       note.innerHTML='<h2>No sound yet</h2><p>'+esc(pre||'The scene did not load, so there is nothing to derive sound from yet.')+'</p>'; }
     else note.innerHTML='<h2>Loading&hellip;</h2><p>Waiting for the scene to boot.</p>';
     $('soundstat').textContent=''; return; }
   // The label is reconstructed once per draw, off the SAME flattened layer tree (group children
   // included, studio/server.mjs's model only lists the top level) rather than re-walked per row.
   const flat=flattenLayers(model);
   soundSfx=(eng.meta.sfx||[]).map(c=>({ ...c, why:cueWhy(c.t,flat,model) }));
   if(!soundSfx.length){ note.hidden=false; body.innerHTML='';
     note.innerHTML='<h2>No sound yet</h2><p>This film has no derived or authored cues. Write '
       +'<code>audio:{auto:true}</code> or <code>audio:{tactile:true}</code>, or place one by hand in <code>audio.cues</code>.</p>';
     $('soundstat').textContent=''; return; }
   note.hidden=true;
   const roles=model.sfxRoles||[];
   $('soundstat').textContent=soundSfx.length+' sound'+(soundSfx.length===1?'':'s');
   body.innerHTML=soundSfx.map((c,i)=>soundRowHtml(c,i,roles)).join('');
   if(!soundWired){ soundWired=true;
     body.addEventListener('click',e=>{
       const p=e.target.closest('.splay,.altplay'); if(p){ playCue(p.dataset.name); return; }
       const u=e.target.closest('.altuse'); if(u){ chooseCue(+u.dataset.i,u.dataset.name); return; }
       const w=e.target.closest('.swhat'); if(w){ setState('make'); go(Math.round(+w.dataset.t*fps)); return; }
     });
   }
 }
 // ---- THE CHOOSER: six takes of this film, at this frame ------------------------------------------
 // IT NEVER ASKS FOR A WORD. There is no search box here and there will not be one: the person this
 // panel is for can see what they want and cannot name it, which is exactly what \`make arsenal\` cannot
 // help with. You point at a frame, it renders six real versions of that frame, and you pick one.
 //
 // Every card is a LOOPING CLIP, never a still. A still hides speed, scale and direction, and this repo
 // has been burned by exactly that (engine-doctrine/MISTAKES.md #155).
 const cands=$('cands'), candStat=$('candstat'), candGo=$('candgo');
 let candBusy=false, candTick=null;
 function candWorking(){
   const t0=Date.now();
   candStat.innerHTML='<span class=work><i></i>rendering six takes at '+(n/fps).toFixed(2)+'s · <b class=el>0</b>s</span>';
   // six clips of the real scene take roughly ten to fifteen seconds. SAY SO WHILE IT HAPPENS: a panel
   // that sits still for fifteen seconds reads as broken, which is the one thing this cannot afford.
   cands.style.setProperty('--ar',W+'/'+H);
   cands.innerHTML=Array.from({length:6},()=>'<div class=cand><span class=sk></span></div>').join('');
   clearInterval(candTick);
   candTick=setInterval(()=>{ const el=candStat.querySelector('.el');
     if(el) el.textContent=String(Math.round((Date.now()-t0)/1000)); },250);
 }
 // a failure is one line and one action; the raw output stays one click away
 function candFail(raw){ clearInterval(candTick);
   const cp=$('candplay'); if(cp) cp.remove();   // a play control for takes that did not arrive does nothing
   candStat.innerHTML='<span class=candfail><b>Takes failed</b><button id=candretry>Retry</button></span>'
     +'<details><summary>Output</summary><pre>'+esc(raw)+'</pre></details>';
   $('candretry').addEventListener('click',askCandidates); }
 function askCandidates(){
   if(candBusy) return;
   candBusy=true; candGo.disabled=true; candWorking();
   say('rendering six takes, this takes about fifteen seconds');
   fetch('/api/candidates',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({at:+(n/fps).toFixed(2),n:6})})
    .then(r=>r.json()).then(d=>{
      candBusy=false; candGo.disabled=false;
      if(!d.ok){ cands.innerHTML='';
        // The refusals are the useful half: a window painted with \`html\` has no preset to swap, and
        // saying which window and why beats an empty strip.
        candFail(d.error||'no candidates');
        say('no candidates: '+(d.error||''));
        return; }
      drawCands(d);
    }).catch(e=>{ candBusy=false; candGo.disabled=false; candFail(e.message);
      say('the chooser failed: '+e.message); });
 }
 function drawCands(d){
   const w=d.window||{}, cs=(d.candidates||[]).filter(c=>c.clip);
   clearInterval(candTick);
   candStat.textContent='';
   // SIX AUTOPLAYING LOOPS IS EXACTLY THE MOTION SOMEBODY MAY HAVE ASKED TO BE SPARED, so under
   // prefers-reduced-motion they load paused and the panel offers one control that starts them all.
   // Not silently replaced by stills: a still hides speed, scale and direction, which is the whole
   // reason these are clips, so the honest answer is "paused, and here is how to play them".
   const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
   // a <button> takes phrasing content, so the card is spans: a <p> inside a button is invalid markup
   // and the parser closes the button around it, which is why the cards were one hit target on paper
   // and several in the tree.
   cands.innerHTML=cs.map((c,i)=>'<button class=cand data-i="'+i+'">'
     +'<video src="/'+esc(c.clip)+'" loop muted playsinline preload=metadata'+(still?'':' autoplay')+'></video>'
     +'<span class=t><b>'+esc(c.name)+'</b>'+(c.new?'<s>new</s>':'')+'</span>'
     +(c.warnings||[]).map(w2=>'<span class="d warn">'+esc(w2)+'</span>').join('')
     +'</button>').join('');
   cands.querySelectorAll('.cand').forEach(b=>b.addEventListener('click',()=>applyCand(cs[+b.dataset.i])));
   // SIX LOOPS THAT NEVER STOP IS AN AUTOPLAY NOBODY CAN INTERRUPT. The control was only drawn under
   // prefers-reduced-motion, which reads the setting as the only reason to want them still. It is one
   // button either way, and it says which state it is about to move you to.
   if(!$('candplay')) cands.insertAdjacentHTML('afterend','<button id=candplay class=wide></button>');
   const cp=$('candplay'); let running=!still;
   const label=()=>{ cp.textContent=running?'Pause takes':'Play takes'; };
   label();
   cp.onclick=()=>{ running=!running;
     cands.querySelectorAll('video').forEach(v=>{ if(running) v.play(); else v.pause(); }); label(); };
 }
 function applyCand(c){
   candStat.innerHTML='<span class=work><i></i>applying '+esc(c.name)+'</span>';
   fetch('/api/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ops:c.patch})})
    .then(r=>r.json()).then(r=>{
      if(!r.ok){ candStat.innerHTML='<span style="color:var(--bad)">'+esc(r.error)+'</span>'; return; }
      candStat.textContent=r.changed?('applied \u201c'+c.name+'\u201d'):('already \u201c'+c.name+'\u201d, no change');
      say(candStat.textContent);
      if(r.changed) reloadScene();
    });
 }
 candGo.addEventListener('click',askCandidates);

 // ---- THE PROPERTY PANEL: what you clicked, as rows, and the JSON that made it -------------------
 const pickJson=$('pickjson'), propsEl=$('props');
 function bgAt(t){ if(!model) return null;
   const bg=model.bg||[]; if(!bg.length) return null;
   let i=0; for(let k=0;k<bg.length;k++){ const w=bg[k]; if(w&&w.from!=null&&t>=w.from) i=k; }
   // Windows with no from/to are bound to the film's joints by core/junctions.js, one each in order,
   // so the marks studio already parsed give the same answer without re-deriving it here.
   if(bg.length>1 && bg.every(w=>w&&w.from==null)){
     const joints=(model.marks||[]).filter(m=>m.kind!=='sting').map(m=>m.t).sort((a,b)=>a-b);
     i=0; for(let k=0;k<joints.length && t>=joints[k];k++) i=Math.min(k+1,bg.length-1); }
   return { i, win: bg[i], count: bg.length }; }
 const cap=(s)=>{ s=String(s||''); return s.charAt(0).toUpperCase()+s.slice(1); };
 const fld=(v,tag,id)=>'<span class="fld'+(tag?'':' txt')+'">'+(tag?'<i>'+tag+'</i>':'')+'<b'+(id?' id='+id:'')+'>'+esc(v)+'</b></span>';
 const prow=(label,...cells)=>'<div class=pr><span class=lab>'+label+'</span><div class=flds>'+cells.join('')+'</div></div>';
 function showProps(title,html,obj){
   $('proptitle').textContent=title;
   $('propempty').hidden=!!obj; propsEl.hidden=!obj; $('propjson').hidden=!obj;
   propsEl.innerHTML=obj?html:'';
   pickJson.textContent=obj?JSON.stringify(obj,null,2):'';
 }
 // camera moves whose window touches [start,end): shared by the property panel and the inside view.
 function overlappingCamera(start,end){
   return ((model&&model.cameraMove)||[]).filter(c=>c.start<end-1e-9&&start<c.start+c.dur-1e-9);
 }
 function overlappingTransitions(start,end){
   return ((model&&model.transitions)||[]).filter(t=>t.at<end-1e-9&&start<t.at+t.dur-1e-9);
 }
 // ---- curves panel: every tween that controls speed or camera, read from the engine's OWN easing
 // function so the graph matches the render, never a hand-copied formula. Loaded once; the panel
 // re-draws once it lands, so the first paint before it arrives just shows "loading".
 let MOTION=null;
 import('/core/motion/motion.js').then(m=>{ MOTION=m; if(selIdx>=0&&!insideLayer) layerProps(selIdx); }).catch(()=>{});
 function easeFn(v){
   if(!MOTION) return null;
   if(Array.isArray(v)&&v.length===4) return MOTION.cubicBezier(+v[0],+v[1],+v[2],+v[3]);
   try{ return MOTION.resolveEasing(v); }catch{ return MOTION.EASINGS.easeOutCubic; }
 }
 function easeGraphSvg(fn){
   const W=180,H=100,pad=6,N=48,lo=-0.4,hi=1.4;
   const y2p=(y)=>H-pad-(Math.max(lo,Math.min(hi,y))-lo)/(hi-lo)*(H-2*pad);
   let d='';
   for(let k=0;k<=N;k++){ const t=k/N; let y; try{ y=fn(t); }catch{ y=t; }
     d+=(k?'L':'M')+(pad+t*(W-2*pad)).toFixed(1)+' '+y2p(y).toFixed(1)+' '; }
   return '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" class="curvegraph">'
     +'<line x1='+pad+' y1='+y2p(0).toFixed(1)+' x2='+(W-pad)+' y2='+y2p(0).toFixed(1)+' class="cg0" />'
     +'<line x1='+pad+' y1='+y2p(1).toFixed(1)+' x2='+(W-pad)+' y2='+y2p(1).toFixed(1)+' class="cg1" />'
     +'<path d="'+d+'" class="cgpath" /></svg>';
 }
 // one <select> of the engine's real named easings (Object.keys(EASINGS), never a hand list), or the
 // raw numbers for a bezier ease (engine-doctrine/PRIMITIVES.md never names draggable-handle math a requirement
 // this panel skips: it takes the four numbers directly, same value the JSON carries).
 function easeControl(path,v){
   if(!MOTION) return '<span class=inone>loading…</span>';
   if(Array.isArray(v)&&v.length===4)
     return '<span class=bez>'+v.map((n,k)=>'<input type=number step=0.05 data-curve-bez="'+path+'" data-k='+k+' value="'+esc(n)+'">').join('')+'</span>';
   const cur=typeof v==='string'&&v?v:'easeOutCubic';
   return '<select data-curve-ease="'+path+'">'+Object.keys(MOTION.EASINGS)
     .map((n)=>'<option'+(n===cur?' selected':'')+'>'+n+'</option>').join('')+'</select>';
 }
 function curveRow(label,path,v,extra){
   const fn=easeFn(v);
   return '<div class=curve><b>'+esc(label)+'</b>'+(fn?easeGraphSvg(fn):'<span class=inone>no curve</span>')
     +easeControl(path,v)+(extra||'')+'</div>';
 }
 const numIn=(path,label,v)=>v==null?'':'<label class=cnum>'+esc(label)+' <input type=number step=0.01 data-curve-num="'+path+'" value="'+esc(v)+'"></label>';

 // ---- speed graph: AE's graph editor. A value curve (above) says WHERE; this says HOW FAST, which is
 // the derivative of that same curve, and since a segment's fn(0)=0, fn(1)=1, its average slope is
 // exactly 1 -- so d/dt already IS "a multiple of the average velocity", no extra scaling needed.
 function speedAt(fn,t){ const h=0.01,t0=Math.max(0,t-h),t1=Math.min(1,t+h);
   try{ return t1>t0?(fn(t1)-fn(t0))/(t1-t0):0; }catch{ return 0; } }
 function speedGraphSvg(fn){
   const W=220,H=110,pad=10,N=64,lo=0,hi=6;
   const xOf=(t)=>pad+Math.max(0,Math.min(1,t))*(W-2*pad);
   const y2p=(s)=>H-pad-(Math.max(lo,Math.min(hi,s))-lo)/(hi-lo)*(H-2*pad);
   let d='',dv='';
   for(let k=0;k<=N;k++){ const t=k/N; let v=t; try{ v=fn(t); }catch{ /* keep linear fallback */ }
     d+=(k?'L':'M')+xOf(t).toFixed(1)+' '+y2p(speedAt(fn,t)).toFixed(1)+' ';
     dv+=(k?'L':'M')+xOf(t).toFixed(1)+' '+(H-pad-Math.max(0,Math.min(1,v))*(H-2*pad)).toFixed(1)+' '; }
   return { d, dv, xOf, y2p, W, H, pad };
 }
 let curveDrag=null;   // the handle side mid-drag: {seg,side,outPath,inPath,out:{speed,influence},in:{...}}
 // one segment's speed graph, driven by the engine's OWN handleCurve: two draggable handles, one per
 // side, each carrying {speed,influence}. Absent handles default to the linear side (resolveHandle).
 function speedRow(label,outPath,inPath,outH,inH){
   if(!MOTION) return '<div class=curve><b>'+esc(label)+'</b><span class=inone>loading…</span></div>';
   let oi,ii,fn;
   try{ oi=MOTION.resolveHandle(outH==null?null:outH,'easeOut'); }catch{ oi={influence:100/3,speed:1}; }
   try{ ii=MOTION.resolveHandle(inH==null?null:inH,'easeIn'); }catch{ ii={influence:100/3,speed:1}; }
   try{ fn=MOTION.handleCurve(outH==null?null:outH,inH==null?null:inH)||((t)=>t); }catch{ fn=(t)=>t; }
   const g=speedGraphSvg(fn);
   const ox=g.xOf(oi.influence/100),oy=g.y2p(oi.speed),ix=g.xOf(1-ii.influence/100),iy=g.y2p(ii.speed);
   return '<div class="curve speedseg" data-out="'+esc(outPath)+'" data-in="'+esc(inPath)+'"><b>'+esc(label)+'</b>'
     +'<svg viewBox="0 0 '+g.W+' '+g.H+'" width='+g.W+' height='+g.H+' class=curvegraph>'
     +'<line x1='+g.pad+' y1='+g.y2p(1).toFixed(1)+' x2='+(g.W-g.pad)+' y2='+g.y2p(1).toFixed(1)+' class=cg1 />'
     +'<path d="'+g.d+'" class=cgpath data-speedpath></path>'
     +'<path d="'+g.dv+'" class="cgpath cgval" data-valpath hidden></path>'
     +'<circle class=hnd data-side=out cx='+ox.toFixed(1)+' cy='+oy.toFixed(1)+' r=5></circle>'
     +'<circle class=hnd data-side=in cx='+ix.toFixed(1)+' cy='+iy.toFixed(1)+' r=5></circle>'
     +'</svg><label class=valtoggle><input type=checkbox data-valtoggle> value</label>'
     +'<div class=hvals>'
     +'<label>out speed<input type=number step=0.05 min=0 max=6 data-hnum="out.speed" value="'+oi.speed.toFixed(2)+'"></label>'
     +'<label>out infl<input type=number step=0.1 min=0.1 max=100 data-hnum="out.influence" value="'+oi.influence.toFixed(1)+'"></label>'
     +'<label>in speed<input type=number step=0.05 min=0 max=6 data-hnum="in.speed" value="'+ii.speed.toFixed(2)+'"></label>'
     +'<label>in infl<input type=number step=0.1 min=0.1 max=100 data-hnum="in.influence" value="'+ii.influence.toFixed(1)+'"></label>'
     +'</div></div>';
 }
 // a segment still on a named ease: show what it does as a speed curve too (same graph, read-only),
 // plus a button that writes handles approximating it -- sampled from the engine's own eased fn, not
 // guessed, so "convert" never redraws a shape the render did not actually have.
 function namedSpeedRow(label,easePath,outPath,inPath,v){
   const fn=easeFn(v)||((t)=>t), g=speedGraphSvg(fn);
   const so=Math.max(0,Math.min(6,Math.round(speedAt(fn,0.02)/0.05)*0.05));
   const si=Math.max(0,Math.min(6,Math.round(speedAt(fn,0.98)/0.05)*0.05));
   return '<div class=curve><b>'+esc(label)+'</b>'
     +'<svg viewBox="0 0 '+g.W+' '+g.H+'" width='+g.W+' height='+g.H+' class=curvegraph>'
     +'<line x1='+g.pad+' y1='+g.y2p(1).toFixed(1)+' x2='+(g.W-g.pad)+' y2='+g.y2p(1).toFixed(1)+' class=cg1 />'
     +'<path d="'+g.d+'" class=cgpath data-speedpath></path>'
     +'<path d="'+g.dv+'" class="cgpath cgval" data-valpath hidden></path></svg>'
     +'<label class=valtoggle><input type=checkbox data-valtoggle> value</label>'
     +easeControl(easePath,v)
     +'<button type=button class=convertbtn data-convert data-convert-remove="'+esc(easePath)+'" data-convert-out="'+esc(outPath)
     +'" data-convert-in="'+esc(inPath)+'" data-outspeed="'+so+'" data-inspeed="'+si+'">Convert to handles</button></div>';
 }
 // every tween this layer's window touches: its own motion keys, a split-text part's timing, and any
 // camera leg or transition overlapping it (the ones "speed and camera movement" actually means).
 function curvesFor(i,L,raw,cams,trans){
   let h='';
   const keys=Array.isArray(raw.motion)?raw.motion:[];
   keys.forEach((k,j)=>{ if(j===0) return;
     const prev=keys[j-1], label='key '+(j-1)+'→'+j;
     if(k.ease!==undefined) h+=namedSpeedRow(label,`/layers/${i}/motion/${j}/ease`,`/layers/${i}/motion/${j-1}/easeOut`,`/layers/${i}/motion/${j}/easeIn`,k.ease);
     else h+=speedRow(label,`/layers/${i}/motion/${j-1}/easeOut`,`/layers/${i}/motion/${j}/easeIn`,prev.easeOut,k.easeIn); });
   (Array.isArray(raw.parts)?raw.parts:[]).forEach((p,j)=>{
     h+='<div class=curve><b>part '+esc(p.select||p.anim||j)+'</b>'
       +numIn(`/layers/${i}/parts/${j}/each`,'each',p.each)+numIn(`/layers/${i}/parts/${j}/stagger`,'stagger',p.stagger)+'</div>'; });
   cams.forEach((c)=>{ if(c.i==null||!c.arrayed) return;
     if(c.move==='travel'&&Array.isArray(c.raw.stations)){
       const st=c.raw.stations;
       st.forEach((s,j)=>{ if(s.dur==null&&s.dwell==null&&s.s==null) return;
         h+='<div class=curve><b>station '+j+'</b>'+numIn(`/cameraMove/${c.i}/stations/${j}/dur`,'dur',s.dur)
           +numIn(`/cameraMove/${c.i}/stations/${j}/dwell`,'dwell',s.dwell)+numIn(`/cameraMove/${c.i}/stations/${j}/s`,'s',s.s)
           +numIn(`/cameraMove/${c.i}/stations/${j}/tx`,'tx',s.tx)+numIn(`/cameraMove/${c.i}/stations/${j}/ty`,'ty',s.ty)+'</div>'; });
       for(let j=0;j<st.length-1;j++) h+=speedRow('station '+j+'→'+(j+1),
         `/cameraMove/${c.i}/stations/${j}/easeOut`,`/cameraMove/${c.i}/stations/${j+1}/easeIn`,st[j].easeOut,st[j+1].easeIn);
     }
     else h+=curveRow('camera '+c.move,`/cameraMove/${c.i}/dur`,c.raw.ease,numIn(`/cameraMove/${c.i}/dur`,'dur',c.dur)); });
   trans.forEach((t)=>{ if(t.i==null) return;
     h+='<div class=curve><b>transition '+esc(t.fx||t.mech)+'</b>'+numIn(`/transitions/${t.i}/dur`,'dur',t.dur)
       +numIn(`/transitions/${t.i}/timing`,'timing',t.timing)+'</div>'; });
   return h?'<section class=psec><h3>Curves</h3>'+h+'</section>':'';
 }
 propsEl.addEventListener('change',async(e)=>{
   const vt=e.target.closest('[data-valtoggle]');
   if(vt){ const c=vt.closest('.curve'), vp=c&&c.querySelector('[data-valpath]'); if(vp) vp.hidden=!vt.checked; return; }
   const sel=e.target.closest('[data-curve-ease]'), bez=e.target.closest('[data-curve-bez]'), num=e.target.closest('[data-curve-num]');
   const hnum=e.target.closest('[data-hnum]');
   let path,value;
   if(sel){ path=sel.dataset.curveEase; value=sel.value; }
   else if(bez){ path=bez.dataset.curveBez; const sib=[...bez.parentElement.querySelectorAll('[data-curve-bez]')]; value=sib.map((el)=>+el.value); }
   else if(num){ path=num.dataset.curveNum; value=+num.value; }
   else if(hnum){
     const seg=hnum.closest('.speedseg'), [side]=hnum.dataset.hnum.split('.');
     const gv=(p)=>+seg.querySelector('[data-hnum="'+side+'.'+p+'"]').value;
     path=side==='out'?seg.dataset.out:seg.dataset.in; value={speed:gv('speed'),influence:gv('influence')};
   }
   else return;
   const r=await fetch('/api/apply',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({ops:[{op:'replace',path,value}]})}).then((x)=>x.json()).catch((err)=>({ok:false,error:String(err)}));
   if(r.ok) reloadScene(); else selOut.textContent='could not write the curve: '+r.error;
 });
 // ---- speed handle drag: live redraw from the engine's own curve as the pointer moves, one write
 // (and one undo step) on pointerup only.
 propsEl.addEventListener('pointerdown',e=>{
   const h=e.target.closest('.hnd'); if(!h) return;
   const seg=h.closest('.speedseg'), svg=h.closest('svg'); if(!seg||!svg) return;
   const gv=(s,p)=>+seg.querySelector('[data-hnum="'+s+'.'+p+'"]').value;
   curveDrag={seg,svg,side:h.dataset.side,outPath:seg.dataset.out,inPath:seg.dataset.in,
     out:{speed:gv('out','speed'),influence:gv('out','influence')},in:{speed:gv('in','speed'),influence:gv('in','influence')}};
   svg.setPointerCapture(e.pointerId); e.preventDefault();
 });
 propsEl.addEventListener('pointermove',e=>{
   if(!curveDrag||!MOTION) return;
   const d=curveDrag, rect=d.svg.getBoundingClientRect(), W=220,H=110,pad=10;
   const x=Math.max(pad,Math.min(W-pad,(e.clientX-rect.left)*(W/rect.width)));
   const y=Math.max(pad,Math.min(H-pad,(e.clientY-rect.top)*(H/rect.height)));
   const inflRaw=d.side==='out'?((x-pad)/(W-2*pad))*100:((W-pad-x)/(W-2*pad))*100;
   const spdRaw=Math.round((((H-pad-y)/(H-2*pad))*6)/0.05)*0.05;
   d[d.side]={speed:Math.max(0,Math.min(6,spdRaw)),influence:Math.max(0.1,Math.min(100,inflRaw))};
   let fn; try{ fn=MOTION.handleCurve(d.out,d.in)||((t)=>t); }catch{ fn=(t)=>t; }
   const g=speedGraphSvg(fn);
   d.seg.querySelector('[data-speedpath]').setAttribute('d',g.d);
   const vp=d.seg.querySelector('[data-valpath]'); if(vp) vp.setAttribute('d',g.dv);
   const oc=d.svg.querySelector('circle[data-side=out]'), ic=d.svg.querySelector('circle[data-side=in]');
   oc.setAttribute('cx',g.xOf(d.out.influence/100)); oc.setAttribute('cy',g.y2p(d.out.speed));
   ic.setAttribute('cx',g.xOf(1-d.in.influence/100)); ic.setAttribute('cy',g.y2p(d.in.speed));
   d.seg.querySelector('[data-hnum="out.speed"]').value=d.out.speed.toFixed(2);
   d.seg.querySelector('[data-hnum="out.influence"]').value=d.out.influence.toFixed(1);
   d.seg.querySelector('[data-hnum="in.speed"]').value=d.in.speed.toFixed(2);
   d.seg.querySelector('[data-hnum="in.influence"]').value=d.in.influence.toFixed(1);
 });
 propsEl.addEventListener('pointerup',async()=>{
   if(!curveDrag) return;
   const d=curveDrag; curveDrag=null;
   const path=d.side==='out'?d.outPath:d.inPath;
   const value={speed:Math.round(d[d.side].speed*100)/100,influence:Math.round(d[d.side].influence*10)/10};
   const r=await fetch('/api/apply',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({ops:[{op:'replace',path,value}]})}).then((x)=>x.json()).catch((err)=>({ok:false,error:String(err)}));
   if(r.ok) reloadScene(); else selOut.textContent='could not write the curve: '+r.error;
 });
 function layerProps(i){
   const L=model&&model.layers.find(l=>l.i===i);
   if(!L) return showProps('Layer','',null);
   const raw=L.raw||{}, id=raw.id!=null?raw.id:null;
   const end=L.start+L.dur, cams=id?overlappingCamera(L.start,end):[];
   // one compact fact per move: five separate fld cells do not fit this rail's width (engine-doctrine/MISTAKES.md
   // pattern: a fixed-width grid squeezed to nothing is the same as not showing the value at all).
   const camRows=cams.map(c=>prow('Camera',fld(c.move+' '+c.from+'→'+c.to+' at '+c.start.toFixed(2)+'s for '+c.dur.toFixed(2)+'s'))).join('');
   const actions='<div class=pactions>'
     +(id?'<button type=button data-mention="'+esc(id)+'">Mention in chat</button>':'')
     +(insideLayer&&insideLayer.i===i?'<button type=button data-editchat="'+esc(id||'')+'">Edit in chat</button>'
       :'<button type=button data-open="'+i+'">Open</button>')+'</div>';
   showProps(cap(L.type),
     prow('Type',fld(L.type))+prow('ID',fld(id!=null?id:'layers['+i+']'))
     +(L.type==='composition'?prow('Comp',fld(raw.comp||'?')):'')
     +prow('Time',fld((+L.start).toFixed(2),'S'),fld((+L.dur).toFixed(2),'D'))
     +camRows
     +'<div id=pbox class=psub hidden>'+prow('Position',fld('','X','pX'),fld('','Y','pY'))+prow('Size',fld('','W','pW'),fld('','H','pH'))+'</div>'
     +prow('Key at',fld('','T','pK'))
     +actions+curvesFor(i,L,raw,cams,id?overlappingTransitions(L.start,end):[]), raw);
 }
 // one delegated listener: the panel's inner HTML is replaced on every selection, so a button bound
 // directly would be re-bound (or silently dropped) on the next render.
 propsEl.addEventListener('click',async(e)=>{
   const m=e.target.closest('[data-mention],[data-editchat]');
   if(m){ const id=m.dataset.mention!=null?m.dataset.mention:m.dataset.editchat; if(id) insertMention(id); return; }
   const o=e.target.closest('[data-open]');
   if(o){ enterInside(+o.dataset.open); return; }
   const c=e.target.closest('[data-convert]');
   if(c){
     const ops=[{op:'remove',path:c.dataset.convertRemove},
       {op:'add',path:c.dataset.convertOut,value:{speed:+c.dataset.outspeed,influence:100/3}},
       {op:'add',path:c.dataset.convertIn,value:{speed:+c.dataset.inspeed,influence:100/3}}];
     const r=await fetch('/api/apply',{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({ops})}).then(x=>x.json()).catch(err=>({ok:false,error:String(err)}));
     if(r.ok) reloadScene(); else selOut.textContent='could not convert: '+r.error;
   }
 });
 function bgProps(b){
   setSel(-1);
   const w=b.win||{};
   showProps('Backdrop',prow('Type',fld('backdrop'))+prow('ID',fld('bg['+b.i+']'))+prow('Window',fld((b.i+1)+' of '+b.count))
     +(w.preset?prow('Preset',fld(w.preset)):'')
     +(w.from!=null?prow('Time',fld((+w.from).toFixed(2),'S'),fld((+(w.to!=null?w.to:dur)).toFixed(2),'E')):''), w);
 }
 // the box the selection outline measures, in the film's own pixels
 function boxRows(r){ const pb=$('pbox'); if(!pb) return; pb.hidden=!r; if(!r) return;
   $('pX').textContent=Math.round(r.left); $('pY').textContent=Math.round(r.top);
   $('pW').textContent=Math.round(r.width); $('pH').textContent=Math.round(r.height); }
 $('pickcopy').addEventListener('click',()=>{
   const b=$('pickcopy'), back=()=>setTimeout(()=>{ b.textContent='Copy JSON'; },1200);
   navigator.clipboard.writeText(pickJson.textContent).then(()=>{ b.textContent='Copied'; say('the JSON is on the clipboard'); back(); },
     ()=>{ b.textContent='Copy failed'; back(); }); });
 sc.addEventListener('load',()=>{ try{
   const doc=sc.contentDocument; if(!doc) return;
   doc.addEventListener('click',(ev)=>{
     if(!model) return;
     // topmost FIRST: elementsFromPoint is painted order reversed, which is what "the thing you
     // clicked on" means when layers overlap.
     const hit=(doc.elementsFromPoint(ev.clientX,ev.clientY)||[])
       .map(el=>el.closest && el.closest('.hs-layer')).find(Boolean);
     const i=hit&&hit.dataset.idx!=null?+hit.dataset.idx:-1;
     if(i>=0&&model.layers.some(l=>l.i===i)){ selOut.textContent=''; return setSel(i); }
     const b=bgAt(n/fps);
     if(b) bgProps(b);
   },true);
 }catch{ /* a cross-origin doc cannot be picked; the timeline still selects */ } });
 function selReadout(){ const k=$('pK'); if(!k||selIdx<0) return;
   const lt=n/fps-selStart;
   k.textContent=lt.toFixed(2)+'s'+(lt<0?' (before start)':''); }
 keyBtn.addEventListener('click',()=>{ keyMode=!keyMode; keyBtn.setAttribute('aria-pressed',String(keyMode));
   dragEl.classList.toggle('on',keyMode); });
 $('undo').addEventListener('click',async()=>{
   const r=await fetch('/api/undo',{method:'POST'}).then(x=>x.json());
   $('undo').disabled=!(r.ok&&r.left>0);
   if(r.ok) reloadScene(); });
 function reloadScene(){ const keep=n; sc.contentWindow.location.reload(); sc.addEventListener('load',()=>{ ready(); setTimeout(()=>{ n=Math.min(keep,total); draw(); },120); },{once:true}); }
 dragEl.addEventListener('pointerdown',e=>{
   if(!keyMode) return;
   if(selIdx<0){ selOut.textContent='no layer selected'; return; }
   dragEl.setPointerCapture(e.pointerId); dragEl.classList.add('dragging');
   dragging={x0:e.clientX,y0:e.clientY,dx:0,dy:0}; });
 dragEl.addEventListener('pointermove',e=>{
   if(!dragging) return;
   dragging.dx=(e.clientX-dragging.x0)/FITS; dragging.dy=(e.clientY-dragging.y0)/FITS;
   selOut.textContent='drag  '+Math.round(dragging.dx)+', '+Math.round(dragging.dy)+' px'; });
 dragEl.addEventListener('pointercancel',()=>{ dragging=null; dragEl.classList.remove('dragging'); });
 dragEl.addEventListener('pointerup',async()=>{
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
   return {x:a.x??0,y:a.y??0}; }catch{ return {x:0,y:0}; } }
 function fit(){ // scale the iframe to fit the stage, preserving the canvas aspect
   const st=$('stage'),pad=64; const s=Math.min((st.clientWidth-pad)/W,(st.clientHeight-pad)/H);
   sc.style.width=W+'px';sc.style.height=H+'px';sc.style.transform='scale('+s+')';sc.style.transformOrigin='center';
   FITS=s;
   measureBoxes();
 }
 function draw(){ const e=sc.contentWindow.__engine; if(!e)return; e.renderFrame(n); applyHiddenVisibility();
   read.innerHTML=stamp(n/fps)+'<s>/</s><span>'+stamp(dur)+'</span><em>'+n+'f</em>';
   // measured off the RULER, which is the element the times are drawn on. A percentage of the lanes
   // box was 12px out at the end of the film and moved again when a scrollbar appeared.
   ph.style.transform='translateX('+atX(n/fps)+'px)';
   if(selIdx>=0&&!dragging)selReadout();
   drawSelBox(); }
 // THE SELECTED LAYER, OUTLINED ON THE PICTURE. Redrawn every frame because the layer MOVES: a box
 // measured once is wrong on the next frame, which is worse than no box. Measured in the iframe's own
 // coordinates and mapped through the same scale fit() applied, so it lands on the pixels it names.
 const selBox=$('selbox');
 function drawSelBox(){
   if(selIdx<0){ selBox.classList.remove('on'); return; }
   try{
     const doc=sc.contentDocument;
     const el=doc&&doc.querySelector('.hs-layer[data-idx="'+selIdx+'"]');
     if(!el){ selBox.classList.remove('on'); return; }
     const r=el.getBoundingClientRect();
     if(!r.width||!r.height){ selBox.classList.remove('on'); return; }
     // the iframe's and the stage's boxes only move when fit() runs, so they are read there
     const f=scBox||sc.getBoundingClientRect(), st=stageBox||$('stage').getBoundingClientRect();
     selBox.style.left=(f.left-st.left+r.left*FITS)+'px';
     selBox.style.top=(f.top-st.top+r.top*FITS)+'px';
     selBox.style.width=(r.width*FITS)+'px';
     selBox.style.height=(r.height*FITS)+'px';
     selBox.querySelector('b').textContent=selLabel.trim()||('layer '+selIdx);
     selBox.classList.add('on');
     boxRows(r);
   }catch{ selBox.classList.remove('on'); }   // a cross-origin document cannot be measured
 }
 const errBox=$('err');
 // AN ERROR YOU CANNOT COPY IS AN ERROR YOU RETYPE BY HAND. The text is selectable, one button copies
 // it, and it is POSTed to the server so the terminal that started studio hears about it too.
 // `note`, when given, is the plain-language explanation (e.g. which stage the film is in and the
 // one command that moves it forward): shown OPEN, above the fold. `detail` is the engine's own raw
 // error, kept behind the collapsed "Output" disclosure, still one click away, never the first thing read.
 function fail(title,detail,note){ errBox.hidden=false;
   window.sceneFailed=true;
   errBox.innerHTML='<b></b>'+(note?'<p class=failnote></p>':'')+'<details><summary>Output</summary><pre></pre></details><button class="ecopy">Copy</button>';
   ['prev','play','next','zin','zout','key','candgo'].forEach(id=>{ const e=$(id); if(e) e.disabled=true; });
   errBox.querySelector('b').textContent=title;
   if(note){ const p=errBox.querySelector('.failnote'); p.textContent=note;
     p.style.cssText='white-space:pre-wrap;user-select:text;margin:.5em 0'; }
   const pre=errBox.querySelector('pre');
   pre.textContent=detail; pre.style.cssText='white-space:pre-wrap;user-select:text;margin:.5em 0;font:12px/1.5 ui-monospace,monospace';
   const btn=errBox.querySelector('.ecopy');
   btn.onclick=()=>{ navigator.clipboard.writeText(title+String.fromCharCode(10)+(note?note+String.fromCharCode(10,10):'')+detail).then(()=>{btn.textContent='copied';setTimeout(()=>btn.textContent='copy',1200);}); };
   read.textContent=title;
   try{ timeline(); }catch{}
   try{ fetch('/__err',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({title:title,detail:detail})}); }catch{}
   redrawLiveEnginePanes();
 }
 // A direct hit on /studio/sound or /studio/ship (each pane's own route, so an agent can open one
 // without passing through Make first) draws its pane BEFORE either of its two async inputs is ready:
 // the iframe's own boot (`sc.contentWindow.__engine`, read directly by drawSound()) and the server
 // fetch (`model`, from timeline() below, read by both drawSound() and drawShip()). Sound needs BOTH.
 // Called once, on the FIRST of the two to resolve, it stayed on "Loading... Waiting for the scene to
 // boot" even once both had actually landed, because nothing ever asked it to redraw a second time.
 // Called from every place either input can finish (fail() and ready() for the boot, timeline()'s own
 // fetch for the model), so whichever settles LAST is the one that redraws the pane, not only a click
 // that happens to land after both already have.
 function redrawLiveEnginePanes(){
   const st=document.body.dataset.state;
   if(st==='sound') drawSound(); else if(st==='ship') drawShip();
 }
 function ready(deadline){ const w=sc.contentWindow;
   if(w.__engineError){
     const note=preAssembleNote();
     return fail(note?'No scene yet':'This scene does not render',String(w.__engineError),note);
   }
   if(!w.__engineReady||!w.__engine){
     const dl=deadline||Date.now()+20000;
     if(Date.now()>dl){
       const note=preAssembleNote();
       return fail(note?'No scene yet':'The scene never signalled ready',
         'No __engineReady and no __engineError after 20s. The page failed before core/boot.js could report, open '+sc.src+' directly and read the console.',
         note);
     }
     return setTimeout(()=>ready(dl),80); }
   errBox.hidden=true;
   const m=w.__engine.meta||{}; fps=m.fps||30; dur=m.duration||5; total=Math.max(1,Math.round(dur*fps)); W=m.width||1920;H=m.height||1080; fit(); timeline(); n=0; draw();
   redrawLiveEnginePanes(); }
 sc.addEventListener('load',()=>ready()); addEventListener('resize',fit);
 // A LABEL MEASURED IN THE FALLBACK FACE IS THE WRONG WIDTH. The first paint can land before
 // JetBrains Mono has loaded, and the ruler then chose a 1s stride the real face has no room for:
 // the dark room and the light room disagreed about the same window, which is how it was caught.
 if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ if(model) paint(model); });
 // the ruler is measured against its own width, so a resize has to re-measure it
 addEventListener('resize',()=>{ if(model) paint(model); });
 // the stage resizes without the WINDOW resizing (the divider moves, a hazard band wraps), and a scale
 // computed against the old height overflows and clips the frame
 // draw() after fit(), so the selection box is re-measured at the new scale (divider, collapse, fullscreen)
 if(window.ResizeObserver) new ResizeObserver(()=>{ fit(); draw(); }).observe($('stage'));
 // 00:07.00, the reference editor's clock: minutes, seconds, hundredths
 const stamp=(t)=>{ const c=Math.round(Math.max(0,t)*100), p=(v)=>String(v).padStart(2,'0');
   return p(Math.floor(c/6000))+':'+p(Math.floor(c/100)%60)+'.'+p(c%100); };
 function loop(){ if(!playing)return; n=(n+1)%(total+1); draw(); setTimeout(()=>requestAnimationFrame(loop),1000/fps); }
 function setPlaying(p){ if(p&&!(sc.contentWindow&&sc.contentWindow.__engine)) return; playing=p;
   play.innerHTML=p?'<svg class=solid viewBox="0 0 20 20"><rect x=5 y=4 width=3.5 height=12 rx=1 /><rect x=11.5 y=4 width=3.5 height=12 rx=1 /></svg>'
                   :'<svg class=solid viewBox="0 0 20 20"><path d="M6 3.8v12.4L16 10z"/></svg>';
   play.setAttribute('aria-label',p?'pause':'play'); play.title=p?'Pause':'Play';
   if(p)loop(); }
 play.addEventListener('click',()=>setPlaying(!playing));
 const go=(v)=>{ n=Math.max(0,Math.min(total,v)); draw(); };
 $('prev').addEventListener('click',()=>go(n-1));
 $('next').addEventListener('click',()=>go(n+1));
 $('fs').addEventListener('click',()=>{ if(document.fullscreenElement) document.exitFullscreen(); else $('stage').requestFullscreen().catch(()=>{}); });
 // THE PANEL COLLAPSES and the picture takes the width; the timeline re-measures its ruler for the new width
 function setProp(open){ document.body.classList.toggle('propoff',!open);
   $('propopen').hidden=open;
   (open?$('propclose'):$('propopen')).focus();
   requestAnimationFrame(()=>{ fit(); if(model) paint(model); draw(); }); }
 $('propclose').addEventListener('click',()=>setProp(false));
 $('propopen').addEventListener('click',()=>setProp(true));

 // ---- CHAT: a prompt in, the agent's own words streamed back, then the scene reloaded on success ----
 const chatLog=$('chatlog'), chatInput=$('chatinput'), chatSend=$('chatsend'), chatStop=$('chatstop');
 let chatBusy=false, chatAbort=null, chatReset=false;

 // ---- @MENTIONS: typing @ opens the film's own layer ids, filtered as you type -------------------
 const mentionBox=$('mention');
 let mentionOpen=false, mentionList=[], mentionSel=0;
 const layerIds=()=>(model?model.layers:[]).map(L=>L.raw&&L.raw.id).filter(Boolean);
 // the "@word" ending at the caret, or null: a mention is only live while the caret sits inside it
 function mentionQuery(){ const v=chatInput.value.slice(0,chatInput.selectionStart);
   const m=/@([A-Za-z0-9_.-]*)$/.exec(v); return m?{start:m.index,q:m[1]}:null; }
 function closeMention(){ mentionOpen=false; mentionBox.hidden=true; }
 const mentionMouseDown=(e)=>{ const el=e.target.closest('.mi'); if(!el) return; e.preventDefault(); pickMention(+el.dataset.i); };
 mentionBox.addEventListener('mousedown',mentionMouseDown);
 function drawMention(){ if(!mentionList.length) return closeMention();
   mentionOpen=true; mentionBox.hidden=false;
   mentionBox.innerHTML=mentionList.map((id,i)=>'<div class="mi'+(i===mentionSel?' on':'')+'" data-i="'+i+'" role=option>@'+esc(id)+'</div>').join(''); }
 function pickMention(i){ const q=mentionQuery(), id=mentionList[i]; if(!q||!id) return closeMention();
   const before=chatInput.value.slice(0,q.start), after=chatInput.value.slice(chatInput.selectionStart), ins=before+'@'+id+' ';
   chatInput.value=ins+after; closeMention(); chatInput.focus(); chatInput.setSelectionRange(ins.length,ins.length); }
 // "Mention in chat" / "Edit in chat": the same move from the property panel, without typing @ by hand.
 // `@5.63s`, at the cursor: the reference is to a FRAME, not a layer, so it carries the time itself
 // rather than a name, for "this exact instant looks wrong" kind of report.
 function insertTimeMention(t){ setChat(true);
   const text='@'+t.toFixed(2)+'s ', el=chatInput, s=el.selectionStart??el.value.length, e=el.selectionEnd??s;
   el.value=el.value.slice(0,s)+text+el.value.slice(e);
   el.style.height='auto'; el.style.height=Math.min(140,el.scrollHeight)+'px';
   el.focus(); const p=s+text.length; el.setSelectionRange(p,p); }
 function insertMention(id){ setChat(true);
   const v=chatInput.value, sep=v&&!/\s$/.test(v)?' ':'';
   chatInput.value=v+sep+'@'+id+' ';
   chatInput.style.height='auto'; chatInput.style.height=Math.min(140,chatInput.scrollHeight)+'px';
   chatInput.focus(); chatInput.setSelectionRange(chatInput.value.length,chatInput.value.length); }
 function setChat(open){ document.body.classList.toggle('chatoff',!open);
   $('chatopen').hidden=open;
   (open?$('chatclose'):$('chatopen')).focus();
   requestAnimationFrame(()=>{ fit(); if(model) paint(model); draw(); }); }
 $('chatclose').addEventListener('click',()=>setChat(false));
 $('chatopen').addEventListener('click',()=>setChat(true));
 function addMsg(cls,text){ const d=document.createElement('div'); d.className='cmsg '+cls; d.textContent=text;
   chatLog.appendChild(d); chatLog.scrollTop=chatLog.scrollHeight; return d; }
 // the CLI exited: report it, or reload the scene it changed
 function chatDone(data,agentEl,agentText){
   if(!agentText) agentEl.remove();
   if(data.error==='not-found') addMsg('err','Claude Code CLI not found');
   else if(data.code!==0) addMsg('err',data.error||('exited '+data.code));
   else{ addMsg('note','Updated, scene reloaded'); reloadScene(); }
 }
 // The CLI's own stdout, as SSE lines: "event: X\ndata: {...}\n\n" blocks, read off a fetch body
 // stream rather than EventSource, which cannot carry the POST body a prompt needs.
 async function runChat(prompt,reset){
   chatBusy=true; chatSend.disabled=true; chatStop.hidden=false;
   addMsg('me',prompt);
   const agentEl=addMsg('agent',''); let agentText='', done=false;
   chatAbort=new AbortController();
   try{
     const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({prompt,reset:!!reset}),signal:chatAbort.signal});
     if(!res.ok){ const e=await res.json().catch(()=>({error:'chat failed'})); agentEl.remove(); addMsg('err',e.error||'chat failed'); return; }
     const reader=res.body.getReader(), dec=new TextDecoder(); let buf='';
     for(;;){
       const r=await reader.read(); if(r.done) break;
       buf+=dec.decode(r.value,{stream:true});
       let idx;
       while((idx=buf.indexOf('\n\n'))>=0){
         const chunk=buf.slice(0,idx); buf=buf.slice(idx+2);
         const evM=chunk.match(/^event: (.+)$/m), dataM=chunk.match(/^data: (.+)$/m);
         if(!dataM) continue;
         let data; try{ data=JSON.parse(dataM[1]); }catch{ continue; }
         const ev=evM?evM[1]:'message';
         if(ev==='text'){ agentText+=data.text; agentEl.textContent=agentText; chatLog.scrollTop=chatLog.scrollHeight; }
         else if(ev==='done'){ done=true; chatDone(data,agentEl,agentText); }
       }
     }
   }catch(e){ if(e.name!=='AbortError') addMsg('err',e.message); }
   finally{ if(!done&&!agentText) agentEl.remove(); chatBusy=false; chatSend.disabled=false; chatStop.hidden=true; chatAbort=null; }
 }
 function sendChat(){ if(chatBusy) return; const v=chatInput.value.trim(); if(!v) return;
   chatInput.value=''; chatInput.style.height='auto';
   const reset=chatReset; chatReset=false; runChat(v,reset); }
 chatSend.addEventListener('click',sendChat);
 $('chatnew').addEventListener('click',()=>{ if(chatBusy) return; chatLog.innerHTML=''; chatReset=true; say('new chat'); });
 chatStop.addEventListener('click',()=>{ if(chatAbort) chatAbort.abort(); fetch('/api/chat/stop',{method:'POST'}); });
 const mentionKeys={ArrowDown:1,ArrowUp:1,Enter:1,Tab:1,Escape:1};
 function mentionKeydown(e){
   if(e.key==='ArrowDown'){ mentionSel=Math.min(mentionList.length-1,mentionSel+1); drawMention(); return; }
   if(e.key==='ArrowUp'){ mentionSel=Math.max(0,mentionSel-1); drawMention(); return; }
   if(e.key==='Enter'||e.key==='Tab'){ pickMention(mentionSel); return; }
   closeMention(); // Escape
 }
 chatInput.addEventListener('keydown',e=>{
   if(mentionOpen&&mentionKeys[e.key]){ e.preventDefault(); e.stopPropagation(); mentionKeydown(e); return; }
   if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendChat(); } });
 chatInput.addEventListener('input',()=>{ chatInput.style.height='auto'; chatInput.style.height=Math.min(140,chatInput.scrollHeight)+'px';
   const q=mentionQuery();
   if(!q){ closeMention(); return; }
   mentionList=layerIds().filter(id=>id.toLowerCase().includes(q.q.toLowerCase())).slice(0,8);
   mentionSel=0; drawMention(); });

 // Arrows step a frame, shift+arrow a second, home/end the ends, space plays.
 addEventListener('keydown',e=>{
   // Escape steps back out of the inside view first, then closes an open popover, then clears the selection
   if(e.key==='Escape'){
     if(insideLayer){ exitInside(); return; }
     if(!document.querySelector(':popover-open')&&(selIdx>=0||!propsEl.hidden)) setSel(-1); return; }
   if(typing()||e.metaKey||e.ctrlKey||e.altKey) return;
   // the states, in the order they are asked. Cheap to move between, so they are one keystroke apart.
   const st={'1':'plan','2':'make','3':'ship','4':'sound'}[e.key];
   if(st){ e.preventDefault(); setState(st); return; }
   const step=e.shiftKey?fps:1;
   if(e.key==='ArrowRight'){ e.preventDefault(); go(n+step); }
   else if(e.key==='ArrowLeft'){ e.preventDefault(); go(n-step); }
   else if(e.key==='Home'){ e.preventDefault(); go(0); }
   else if(e.key==='End'){ e.preventDefault(); go(total); }
   else if(e.key===' '){ e.preventDefault(); setPlaying(!playing); }
 });

 // ---------- timeline ----------
 const pc=(t)=>(100*Math.max(0,Math.min(1,t/dur)))+'%';
 // where a TIME sits on screen, once. The playhead and the hover mark both ask this and the second one
 // would have got it wrong the moment zoom arrived, so there is one answer: the ruler's own width, the
 // lane's left padding, and whatever the lane is scrolled by.
 const atX=(t)=>12+rulerW*Math.max(0,Math.min(1,t/dur))-laneScroll;
 let Z=1;
 function setZoom(z){
   Z=Math.max(1,Math.min(40,z));
   lanes.style.setProperty('--z',Z);
   $('zlab').textContent=Z.toFixed(1)+'x';
   $('zout').disabled=$('zfit').disabled=Z<=1;   // at 1.0x there is nothing further out to show
   // ANCHOR ON THE PLAYHEAD: zooming is what you do to look closer at where you ARE, so the frame you
   // are on stays put and the film grows around it.
   requestAnimationFrame(()=>{
     const frac=Math.max(0,Math.min(1,n/fps/dur));
     lanes.scrollLeft=Math.max(0,ruler.clientWidth*frac-lanes.clientWidth/2);
     if(model) paint(model);        // the label stride and the beat grid are MEASURED, so they re-space
     measureBoxes(); draw();
   });
 }
 $('zin').addEventListener('click',()=>setZoom(Z*1.6));
 $('zout').addEventListener('click',()=>setZoom(Z/1.6));
 $('zfit').addEventListener('click',()=>setZoom(1));
 lanes.addEventListener('scroll',()=>{ laneScroll=lanes.scrollLeft; rulerL=ruler.getBoundingClientRect().left;
   ph.style.transform='translateX('+atX(n/fps)+'px)'; });
 const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 // what a ruler label ACTUALLY measures, in the face and size it is drawn in. Rendered into the ruler
 // itself so it inherits every rule that applies to a real one, then removed.
 function measure(html){ const el=document.createElement('s');
   el.style.cssText='position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap';
   el.innerHTML=html; ruler.appendChild(el); const w=el.offsetWidth; el.remove(); return w; }
 // Clip colour by kind, the reference editor's roles: text purple, media grey, anything else a neutral
 // pill. Captions (blue) and sound (green) are drawn by their own rows.
 const KIND={text:'text',type:'text',count:'text',beat:'text',image:'media',video:'media',lottie:'media',clip:'media',
   rect:'shape',svg:'shape',paint:'shape',glow:'shape',shader:'shape',beam:'shape',canvas:'shape',cursor:'shape'};
 const kindOf=(t)=>KIND[t]||'comp';
 const ICON={
   text:'<svg viewBox="0 0 16 16"><path d="M3.5 3.5h9M8 3.5v9"/></svg>',
   media:'<svg viewBox="0 0 16 16"><rect x=2.5 y=3 width=11 height=10 rx=1.5 /><path d="M2.5 10.5l3-3 3 3 2-2 3 3"/></svg>',
   shape:'<svg viewBox="0 0 16 16"><rect x=3 y=3 width=10 height=10 rx=2 /></svg>',
   comp:'<svg viewBox="0 0 16 16"><path d="M2.5 5.5L8 3l5.5 2.5L8 8z"/><path d="M2.5 10.5L8 13l5.5-2.5"/></svg>',
   cap:'<svg viewBox="0 0 16 16"><rect x=2 y=3.5 width=12 height=9 rx=1.5 /><path d="M4.5 9.5h2M8.5 9.5h3"/></svg>',
   sound:'<svg viewBox="0 0 16 16"><path d="M6 12V3.5l6.5-1.5v8.5"/><circle cx=4.5 cy=12 r=1.6 /><circle cx=11 cy=10.5 r=1.6 /></svg>' };
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
                anim:d.anim||'', out:d.out||'', txt:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,44),
                cls:(el.className.match(/hs-(img-wrap|rect|comp-wrap|group|text)/)||[])[1] }; });
 }
 const CLS={'img-wrap':'image','comp-wrap':'component','rect':'rect','group':'group','text':'text'};
 // ---- the filmstrip ------------------------------------------------------------------------------
 // NEVER BLOCKS THE FIRST PAINT. The timeline draws, then this asks for the strip and fills the band in
 // when it arrives; the band is display:none until it has something, so nothing reserves a hole.
 let stripDone=false, stripNote='', stripStride=0;
 // the strip's cells keep the film's own shape: the band's height follows the cell width, and contain
 // covers the clamp, so no frame is cropped
 function sizeFilm(){ if(!stripStride) return;
   const cw=(ruler.clientWidth||1)*stripStride/dur;
   $('film').style.height=Math.round(Math.max(36,Math.min(72,cw*H/W)))+'px'; }
 let lastStrip=null;
 function markStill(s){
   lastStrip=s;
   const still=new Set(s.still||[]);
   if(!still.size) return;
   [...rows.querySelectorAll('.bar')].forEach(b=>{ if(still.has(+b.dataset.i)){ b.classList.add('still');
     b.title+='  ·  unchanged across '+s.frames.length+' sampled instants'; } });
   stripNote=still.size+' layer'+(still.size===1?'':'s')+' never change'+(still.size===1?'s':'');
   $('tlkey').textContent=stripNote;
 }
 function filmstrip(){
   if(stripDone) return; stripDone=true;
   const band=$('film');
   fetch('/api/strip').then(r=>r.json()).then(s=>{
     if(!s||!s.frames||!s.frames.length){ stripDone=false;
       if(s&&s.error){ stripNote='no strip: '+s.error; $('tlkey').textContent=stripNote; } return; }
     const w=100*s.stride/dur;
     stripFrames=s.frames; stripStride=s.stride; sizeFilm();
     band.innerHTML=s.frames.map(f=>'<div class=fr style="left:'+pc(f.t-s.stride/2)+';width:'+w+'%;background-image:url('+f.src+')"></div>').join('');
     markStill(s);
   }).catch(()=>{ stripDone=false; });
 }
 const paintRows=paint;
 paint=function(m){ paintRows(m); if(lastStrip) markStill(lastStrip); };
 function timeline(){
   fetch('/api/timeline').then(r=>r.json()).then(m=>{ model=m; loadHidden(); $('undo').disabled=!(m.undo>0); drawCrumbs();
     if(insideLayer) paintInside(); else paint(m); drawJump();
     // Sound and Ship both read `model`, not just the iframe's engine: Sound needs BOTH it and
     // `eng.meta`, so whichever of the two async loads (this fetch, the iframe boot) finishes LAST is
     // the one that has to trigger the redraw, or the pane is stuck on whatever it showed at the first.
     redrawLiveEnginePanes(); })
     .catch(e=>{ $('tlwhat').textContent='timeline unavailable: '+e; });
 }
 // name each bar: consume the first unclaimed JSON layer that starts at the same instant. A layer the
 // produced baseline added has no JSON entry and falls back to what the DOM says it is. Returns the
 // windows the engine held open past what the JSON declares.
 function nameBars(m,bars){
   const pool=m.layers.slice();
   for(const b of bars){ const i=pool.findIndex(L=>Math.abs(L.start-b.s)<1e-3); const L=i>=0?pool.splice(i,1)[0]:null;
     b.type=L?L.type:(CLS[b.cls]||'text'); b.name=(L&&L.label)||b.txt||'';
     // a bar the produced baseline invented has no JSON index and must not be selectable
     b.i=L?L.i:-1; b.keys=(L&&L.keys)||[];
     b.grew=b.aw!=null?Math.max(0,b.w-b.aw):(L?Math.max(0,(b.s+b.w)-(L.start+L.dur)):0); }
   return bars.filter(b=>b.grew>0.01).map(b=>[b.s+(b.w-b.grew), b.s+b.w]);
 }
 const clock=(t)=>{ const s=Math.round(t*10)/10, f=Math.round((s%1)*10);
   return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')+(f?'.'+f:''); };
 // LABELS ARE DROPPED BY MEASUREMENT: the widest label is rendered offscreen in the real face, and the
 // stride is however many ticks it takes to clear that width.
 function rulerHtml(m,step){
   const ticks=[]; for(let t=0;t<=dur+1e-6;t+=step) ticks.push(+t.toFixed(4));
   const labW=measure(clock(ticks[ticks.length-1]))+18;
   const rw=ruler.clientWidth||1, stride=Math.max(1,Math.ceil(labW/(rw*step/dur)));
   let r=ticks.map((t,k)=>{ const end=k===ticks.length-1, x=rw*Math.min(1,t/dur);
     const show=end||(k%stride===0&&x+labW<=rw-labW-6);
     return '<div class="t'+(end?' end':'')+'" style="left:'+pc(t)+'">'+(show?'<s>'+clock(t)+'</s>':'')+'</div>'; }).join('');
   // a transition is a moment, not a layer: it lives on the ruler, above every track. Drawn from
   // model.transitions (not model.marks) so an authored one carries its `i` and can be clicked; a
   // lowered cut/seam/sting has none and stays read-only, same rule the curves panel already keeps.
   for(const t of (m.transitions||[])){
     const kind=t.mech||'transition';
     r+='<div class=ms style="left:'+pc(t.at)+';width:'+(100*t.dur/dur)+'%"></div>'
       +'<div class=m'+(t.i!=null?'':' ro')+' style="left:'+pc(t.at)+'"'+(t.i!=null?' data-trans-i="'+t.i+'"':'')
       +' title="'+esc(kind+' '+t.at+'s'+(t.fx?' '+t.fx:''))+'">'+kind.charAt(0).toUpperCase()+'</div>'; }
   // camera legs: one pill per authored cameraMove entry, clickable the same way.
   for(const c of (m.cameraMove||[])){
     if(c.i==null) continue;
     r+='<div class=camleg style="left:'+pc(c.start)+';width:'+(100*c.dur/dur)+'%" data-cam-i="'+c.i+'"'
       +' title="camera '+esc(c.move||'')+' '+c.start.toFixed(2)+'s for '+c.dur.toFixed(2)+'s">'+(c.move||'cam').charAt(0).toUpperCase()+'</div>'; }
   return r;
 }
 function captionRow(caps){
   if(!caps.length) return '';
   return '<div class="row cap">'+caps.map(c=>'<b style="left:'+pc(c.t0)+';width:'+(100*Math.max(0,c.t1-c.t0)/dur)+'%" title="'+esc(c.text)+'">'
     +'<span>'+ICON.cap+esc(c.text)+'</span></b>').join('')+'</div>';
 }
 // the beat grid, because a seam is supposed to LAND on it. A grid denser than a tick every 3px is a
 // wash, not a grid, so it is dropped and said so.
 function beatGrid(B){
   const bts=((B&&B.beats)||[]).filter(t=>t<=dur), dbs=new Set(((B&&B.downbeats)||[]).map(x=>+x.toFixed(3)));
   const dense=bts.length>0&&(ruler.clientWidth/bts.length<3);
   if(dense) return {html:'',dense};
   return {html:bts.map(t=>'<i class="bt'+(dbs.has(+t.toFixed(3))?' db':'')+'" style="left:'+pc(t)+'"></i>').join(''),dense};
 }
 function soundExtras(A){
   let a='';
   if(A.fade&&A.fade.in) a+='<div class=fade style="left:0;width:'+(100*A.fade.in/dur)+'%"></div>';
   if(A.fade&&A.fade.out) a+='<div class=fade style="right:0;width:'+(100*A.fade.out/dur)+'%"></div>';
   for(const b of (A.bridges||[])) a+='<div class=br style="left:'+pc(b.start)+';width:'+(100*(b.end-b.start)/dur)+'%" title="'+esc((b.sound||'bridge')+' at '+b.at)+'"></div>';
   // two cues a tenth of a second apart would print on top of each other, so the labels alternate
   (A.cues||[]).forEach((c,i)=>{ a+='<div class=cue style="left:'+pc(c.t)+'"><s style="top:'+(i%2?16:1)+'px">'+esc(c.name)+'</s></div>'; });
   return a;
 }
 function soundRows(A){
   if(A.none) return '';
   // A DECLARED SILENCE IS A DEVICE, and an undeclared one is a hole. The lane says which.
   if(A.silent) return '<div class=lane-note><span'+(A.why?' title="'+esc(A.why)+'"':'')+'>silent</span></div>';
   const grid=beatGrid(A.beats);
   // audio.auto voices the transitions (core/audio/cues.js) and picks no music, so without a bed the
   // pill says exactly that rather than a bare "auto"
   const name=A.music?esc(A.music.split('/').pop()):'no bed';
   const meta=[A.auto?'auto cues':'',A.gain!=null?'gain '+A.gain:'',A.beats?Math.round(A.beats.bpm)+' bpm':'',grid.dense?'grid hidden':''].filter(Boolean).join(' · ');
   let h='<div class="row aud"><div class=bed>'+grid.html+soundExtras(A)
     +'<span class=name>'+ICON.sound+name+(meta?' <s>'+esc(meta)+'</s>':'')+'</span></div></div>';
   if(A.bridgeError) h+='<div class=lane-note><span>bridges did not resolve: '+esc(A.bridgeError)+'</span></div>';
   return h;
 }
 const barTitle=(b)=>b.type+' '+(b.name||'')+' · '+b.s.toFixed(2)+'s to '+(b.s+b.w).toFixed(2)
   +(b.anim?' · '+b.anim:'')+(b.out?' then '+b.out:'')+(b.grew>0.005?' · held '+b.grew.toFixed(2)+'s past '+(b.s+b.w-b.grew).toFixed(2)+'s':'');
 function eyeBtn(i){
   if(i<0) return '';
   const h=isHiddenState(i);
   return '<button type=button class="eye'+(h?' off':'')+'" data-eye="'+i+'" aria-pressed="'+h+'" aria-label="'+(h?'show layer':'hide layer')+'" title="'+(h?'Show layer (alt-click: solo)':'Hide layer (alt-click: solo)')+'">'+(h?EYE_OFF:EYE_ON)+'</button>';
 }
 function barHtml(b){
   const wpc=100*b.w/dur, inp=b.w?100*Math.min(b.enter,b.w)/b.w:0, outp=b.w?100*Math.min(b.exit,b.w)/b.w:0;
   const heldp=b.grew>0.005&&b.w?100*Math.min(b.grew,b.w)/b.w:0, k=kindOf(b.type);
   return '<div class=row>'+eyeBtn(b.i)+'<div class="bar k-'+k+(b.i>=0&&isHiddenState(b.i)?' hidden-layer':'')+'" data-i="'+b.i+'" data-t="'+b.s+'" style="left:'+pc(b.s)+';width:'+wpc+'%" title="'+esc(barTitle(b))+'">'
     +(heldp?'<div class=held style="width:'+heldp+'%"></div>':'')
     +'<i class=in style="width:'+inp+'%"></i><i class=out style="width:'+outp+'%"></i>'
     +b.keys.map(kt=>'<u style="left:'+(b.w?100*Math.max(0,Math.min(1,kt/b.w)):0)+'%"></u>').join('')
     +'<span style="left:calc('+inp+'% + 10px)">'+ICON[k]+esc(b.type)+' <em>'+esc(b.name)+'</em></span></div></div>';
 }
 // the hazard bands stretch the whole track stack, so a hole is impossible to miss
 const holesOf=(g)=>[...(g.deadAir||[]).map(x=>[x[0],x[1],'dead air','']),
   ...(g.tail?[[g.tail,g.duration||dur,'ends on nothing','']]:[]),
   ...(g.emptyBeat||[]).map(x=>[x[0],x[1],'empty beat','beat'])];
 const disputed=(grown,a,b)=>grown.some(([x,y])=>x<b-1e-9&&y>a+1e-9);
 const hazardHtml=(holes,grown)=>holes.map(([a,b,lab,cls])=>{ const dis=disputed(grown,a,b);
   return '<div class="hz '+(dis?'disputed':cls)+'" style="left:'+pc(a)+';width:'+(100*(b-a)/dur)+'%"><b>'+(dis?'disputed ':'')+lab+' '+(b-a).toFixed(2)+'s</b></div>'; }).join('');
 const alertsHtml=(holes,grown)=>holes.map(([a,b,lab])=>{ const dis=disputed(grown,a,b);
   return '<span'+(dis?' class=dis title="the engine holds a window open here that the JSON does not declare"':'')+'>'
     +(dis?'disputed ':'')+lab+' '+a.toFixed(2)+'s to '+b.toFixed(2)+'s</span>'; }).join('');
 function paint(m){
   const bars=domBars(), grown=nameBars(m,bars);
   bars.sort((a,b)=>a.s-b.s||a.w-b.w);
   const step=dur<=6?.5:dur<=16?1:dur<=45?2:5;
   ruler.innerHTML=rulerHtml(m,step);
   let h='';
   for(let t=step;t<=dur+1e-6;t+=step) h+='<div class=grid style="left:'+pc(t)+'"></div>';
   // Sound and captions are FEW and FIXED; the layer stack is unbounded, so they come first and the
   // stack that can be any length scrolls beneath them.
   const holes=holesOf(m.gate||{});
   h+=soundRows(m.audio||{})+captionRow(m.captions||[])+bars.map(barHtml).join('')+hazardHtml(holes,grown);
   rows.innerHTML=h;
   filmstrip(); sizeFilm();
   $('tlwhat').textContent=bars.length+' layer'+(bars.length===1?'':'s');
   $('tlkey').textContent=stripNote;
   $('alerts').innerHTML=alertsHtml(holes,grown);
   if(selIdx>=0) setSel(selIdx);
   measureBoxes();
 }
 // ---- THE THUMBNAIL AT THE POINTER ---------------------------------------------------------------
 // HOVER LOOKS, DRAG COMMITS. This never writes the playhead and never touches the main iframe: it owns a second
 // engine of its own, so the picture in the centre is exactly where you left it while you read ahead.
 //
 // THROTTLED TO ONE SEEK PER ANIMATION FRAME, coalesced: the pointer writes a time into a variable and
 // a single rAF drains it, so twenty mousemoves inside one frame cost ONE renderFrame and it is always
 // the latest one. Measured on the 76-layer film: a peek seek is 4 to 9ms at this size, so the drain
 // never overruns its frame, and scrubbing the main preview is unaffected because it is a different
 // engine in a different document.
 const peek=$('peek'), peekBox=$('peekbox'), peekT=$('peekt');
 let peekFrame=null, peekReady=false, peekWant=null, peekPending=false, peekScale=1;
 function peekBoot(){
   if(peekFrame) return;
   peekFrame=document.createElement('iframe');
   peekFrame.title='frame preview'; peekFrame.setAttribute('aria-hidden','true');
   // 120px tall whatever the canvas is, so a portrait film is not a sliver
   peekScale=120/H;
   peekFrame.style.width=W+'px'; peekFrame.style.height=H+'px';
   peekFrame.style.transform='scale('+peekScale+')';
   peekBox.style.width=Math.round(W*peekScale)+'px'; peekBox.style.height=Math.round(H*peekScale)+'px';
   // COMPUTED, not read back: the box is what we just wrote plus the 3px padding on each side
   peekW=Math.round(W*peekScale)+6; peekH=Math.round(H*peekScale)+6;
   peekBox.insertBefore(peekFrame,peekT);
   peekFrame.src=sc.src;
   peekFrame.addEventListener('load',()=>{ const w=peekFrame.contentWindow;
     const wait=()=>{ if(w.__engineReady&&w.__engine){ peekReady=true; peekDraw(); }
                      else if(!w.__engineError) setTimeout(wait,80); };
     wait(); });
 }
 function peekDraw(){
   peekPending=false;
   if(peekWant==null||!peekReady) return;
   try{ peekFrame.contentWindow.__engine.renderFrame(Math.round(peekWant*fps)); }catch{ }
 }
 // the nearest thumbnail the strip already holds, painted behind the live frame so the box is never
 // empty: instant first, exact a frame later.
 let stripFrames=[];
 function peekAt(t,clientX){
   peekBoot();
   peekWant=Math.max(0,Math.min(dur,t));
   if(!peekPending){ peekPending=true; requestAnimationFrame(peekDraw); }
   const near=stripFrames.length?stripFrames.reduce((a,b)=>Math.abs(b.t-peekWant)<Math.abs(a.t-peekWant)?b:a):null;
   if(near) peekBox.style.backgroundImage='url('+near.src+')';
   peekT.textContent=peekWant.toFixed(2)+'s · '+Math.round(peekWant*fps)+'f';
   peek.classList.add('on');
   // clamped to the work area, so the thumbnail never covers the property panel
   peek.style.transform='translate3d('+Math.max(workL,Math.min(innerWidth-peekW-8,clientX-peekW/2))+'px,'
     +Math.max(8,tlTop-peekH-8)+'px,0)';
   $('hov').style.display='block';
   $('hov').style.transform='translateX('+atX(peekWant)+'px)';
 }
 function peekOff(){ peek.classList.remove('on'); $('hov').style.display='none'; peekWant=null; }
 $('atchip').addEventListener('pointerdown',(e)=>{ e.stopPropagation(); e.preventDefault();
   if(peekWant!=null) insertTimeMention(peekWant); });
 lanes.addEventListener('pointermove',e=>{
   // a drag is a scrub and owns the pointer; hovering is the only thing that peeks
   if(e.buttons&1){ peekOff(); return; }
   peekAt((e.clientX-rulerL)/rulerW*dur, e.clientX);
 });
 // the peek box floats ABOVE the lanes rect (so it never covers the row you are pointing at), which
 // means reaching for its @ chip leaves `lanes` from the pointer's point of view. Do not drop the
 // hovered time just because the cursor is now over the thing that reads it.
 lanes.addEventListener('pointerleave',e=>{ if(peek.contains(e.relatedTarget)) return; peekOff(); });
 // SELECTING A LAYER WAS POINTER-ONLY. Every bar is a div, and making seventy of them tab stops would
 // bury the rest of the page, so the lane stack is one stop and the arrows walk it: the same shape a
 // list box has. Left and right still seek, because the global handler owns those.
 lanes.addEventListener('keydown',e=>{
   if(e.key==='@'){ e.preventDefault(); insertTimeMention(n/fps); return; }
   if(e.key==='Enter'&&selIdx>=0&&!insideLayer){ e.preventDefault(); enterInside(selIdx); return; }
   if(e.key!=='ArrowDown'&&e.key!=='ArrowUp') return;
   const bars=[...rows.querySelectorAll('.bar')].filter(b=>+b.dataset.i>=0);
   if(!bars.length) return;
   e.preventDefault(); e.stopPropagation();
   const at=bars.findIndex(b=>+b.dataset.i===selIdx);
   const to=bars[Math.max(0,Math.min(bars.length-1,at<0?0:at+(e.key==='ArrowDown'?1:-1)))];
   setSel(+to.dataset.i); to.scrollIntoView({block:'nearest'});
   say(selLabel.trim()||('layer '+selIdx)); });
 // NOT e.target: lanes holds the pointer capture from the pointerdown half of this same click, which
 // retargets the compatibility mouse events (click, dblclick) to the capturing element, so e.target is
 // lanes itself, not the bar under the cursor. A hit test at the real point is the only thing that still
 // names the bar (the same fix the iframe pick handler above needed for the topmost element).
 lanes.addEventListener('dblclick',e=>{
   const bar=(document.elementsFromPoint(e.clientX,e.clientY)||[]).find(el=>el.classList&&el.classList.contains('bar'));
   if(bar&&+bar.dataset.i>=0) enterInside(+bar.dataset.i); });

 // drag anywhere in the lanes to seek
 const seek=(e)=>{ n=Math.max(0,Math.min(total,Math.round((e.clientX-rulerL)/rulerW*dur*fps))); draw(); };
 lanes.addEventListener('pointerdown',e=>{
   const eye=e.target&&e.target.closest&&e.target.closest('.eye');
   if(eye){ e.preventDefault(); e.stopPropagation(); toggleEye(+eye.dataset.eye,e.altKey); return; }
   // BEFORE the capture: setPointerCapture retargets everything that follows to the lanes element, so
   // a click handler on the bar never sees its own bar and selection silently did nothing.
   const camPill=e.target&&e.target.closest&&e.target.closest('.camleg,.bar[data-cam-i]');
   const transPill=e.target&&e.target.closest&&e.target.closest('#ruler .m[data-trans-i],.bar[data-trans-i]');
   const bar=e.target&&e.target.closest&&e.target.closest('.bar:not([data-cam-i]):not([data-trans-i])');
   if(camPill) camProps(+camPill.dataset.camI);
   else if(transPill) transProps(+transPill.dataset.transI);
   else if(bar){ const i=+bar.dataset.i;
     if(i<0) selOut.textContent='no JSON layer: the produced baseline added this bar';
     else setSel(i); }
   lanes.setPointerCapture(e.pointerId); seek(e); });
 // only a press the lanes captured scrubs: an eye click never captures, so holding it must not move the playhead
 lanes.addEventListener('pointermove',e=>{ if((e.buttons&1)&&lanes.hasPointerCapture(e.pointerId)) seek(e); });
 // The server already knows which stage this film is in (/api/stage, quality/gates/stage.mjs) and picks
 // the pane a plan/approval-stage film should open on: `document.body.dataset.state` is written into the
 // shell at that point (page.mjs, studio/server.mjs paneForStage). A direct hit on /studio/<pane> sets
 // the same attribute to that pane. Never re-derive the stage here, just read what the server decided.
 drawCrumbs(); setState(document.body.dataset.state||'make');
