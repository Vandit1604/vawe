 const $=(id)=>document.getElementById(id);
 const sc=$('sc'),scrub=$('scrub'),read=$('read'),play=$('play');
 const lanes=$('lanes'),ruler=$('ruler'),rows=$('rows'),ph=$('ph');
 let fps=30,total=0,n=0,playing=false,W=1920,H=1080,dur=1,model=null;
 // ---- GEOMETRY IS MEASURED ONCE PER CHANGE, NEVER PER EVENT ---------------------------------------
 // Every hover used to read the ruler's rect, the peek's own offsetWidth and the timeline panel's rect
 // and then write three style properties, which is a forced synchronous layout inside a pointermove,
 // thirty to a hundred times a second, on a page whose lane stack can be seventy rows. The playhead did
 // the same every frame of playback. Nothing here changes without something else changing first (a
 // resize, a zoom, the divider, a repaint), so the reads happen there and the hot paths read variables.
 let rulerW=1, rulerL=0, laneScroll=0, stageBox=null, scBox=null, tlTop=0, peekW=0, peekH=0;
 function measureBoxes(){
   rulerW=ruler.clientWidth||1; rulerL=ruler.getBoundingClientRect().left;
   laneScroll=lanes.scrollLeft;
   stageBox=$('stage').getBoundingClientRect(); scBox=sc.getBoundingClientRect();
   tlTop=$('tl').getBoundingClientRect().top;
 }
 const typing=()=>/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
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
   try{ localStorage.setItem(TLH_KEY,String(v)); }catch(_){}
   fit(); measureBoxes(); }
 try{ const s=+localStorage.getItem(TLH_KEY); if(s) setTlh(s); }catch(_){}
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
   [...rows.querySelectorAll('.bar')].forEach(b=>b.classList.toggle('sel',+b.dataset.i===i));
   drawSelBox(); }
 // ---- THE FOUR STATES ----------------------------------------------------------------------------
 // One scene, one playhead, four things you might be doing with them. Nothing here touches sc.src: the
 // centre is hidden and shown, so the engine stays booted and the frame you left is the frame you
 // return to. Entering a state does its work LAZILY, because two of them cost seconds of rendering.
 let state='make';
 function setState(s){
   state=s; document.body.dataset.state=s;
   keepFocus(document.querySelector('#states button[data-state="'+s+'"]'));
   [...document.querySelectorAll('#states button')].forEach(b=>
     b.setAttribute('aria-pressed',String(b.dataset.state===s)));
   if(s==='make') fit();
   if(s==='plan') drawPlan();
   if(s==='look') showSheet(sheetKind);
   if(s==='ship') drawShip();
 }
 document.querySelectorAll('#states button').forEach(b=>b.addEventListener('click',()=>setState(b.dataset.state)));

 // ---- PLAN: the storyboard the beats were decided in ---------------------------------------------
 // ---- PLAN: the film as its own frames, not as grey boxes ---------------------------------------
 // This used to show \`make panels\`, one grey still per beat sized from \`shot:\`. That answers how big
 // and where and nothing at all about what is in the frame, which is the only question the person
 // signing a plan off can answer (docs/MISTAKES.md #592). Every beat that names a \`fragment:\` has real
 // hand-written markup on disk, so the beat shows THAT, live, on the film's theme.
 const planPath=$('planpath'), planNote=$('plannote'), planBody=$('planbody');
 let planDrawn=false;
 const PFIELDS=[['why','why'],['becomes','the change'],['trigger','caused by'],['shot','shot'],
   ['camera','camera'],['layout','layout'],['style','style'],['rest','in the hold'],
   ['mechanism','mechanism'],['motion','motion plan'],['borrows','borrows'],['transition_in','cut in']];
 // ---- the SKETCH: what a fragment-less beat still shows -----------------------------------------
 // A beat with no fragment used to draw a grey box and a struck-through label (docs/MISTAKES.md #592
 // again, one layer down: an html beat got a real picture, everything else still got nothing). The
 // storyboard already decided a composition (archetype:) and often the exact words (onscreen:), so a
 // beat with no fragment still has a picture to draw, just not a hand-written one. Each archetype
 // (docs/CRAFT/STORYBOARD-TEMPLATE.md, the same closed list storyboard-check enforces) gets a fixed
 // box layout on the film's own 1920x1080 canvas; the box carries the beat's own words, not a caption
 // beside an empty rectangle, and the real onscreen line renders as real type because that IS the beat.
 const ARCH_BOXES={
   centred:[[560,210,800,660,'object']],
   split:[[110,240,800,600,'object'],[1010,240,800,600,'object']],
   'hero-object':[[260,90,1400,660,'object'],[260,820,1400,190,'copy']],
   'asymmetric-baseline':[[130,520,880,420,'object']],
   'full-bleed-row':[[0,380,1920,320,'object']],
   'symmetric-pair':[[300,290,560,500,'object'],[1060,290,560,500,'object']],
   lockup:[[560,150,500,520,'object'],[460,730,900,180,'copy']],
 };
 // an archetype the closed list does not name (blank, or "other (a reason)") still gets ONE centred
 // box: a picture with a vague composition beats no picture at all.
 const archBoxes=(name)=>ARCH_BOXES[String(name||'').trim().split(/\\s+\\(/)[0]]||[[460,240,1000,600,'object']];
 const wrapWords=(s,max)=>{ const out=[]; let cur='';
   for(const w of String(s||'').split(/\\s+/)){ const t=cur?cur+' '+w:w;
     if(t.length>max&&cur){ out.push(cur); cur=w; } else cur=t; } if(cur) out.push(cur); return out; };
 // WHY sketchable: any one of these is a real authoring decision, so drawing from it is honest. Their
 // absence together is the only case with truly nothing to draw.
 const hasPicture=(b)=>!!(b.picture||b.object||b.archetype||(b.onscreen&&b.onscreen.length)||b.mechanism||b.becomes);
 function sketchSvg(b,pal){
   const p=pal||{}, bg=p.bg||'#171717', surface=p.surface||'rgba(255,255,255,.08)',
     edge=p.lineStrong||p.line||'rgba(255,255,255,.3)', accent=p.accent||'#2563eb',
     text=p.text||'#fff', dim=p.text2||p.dim||'rgba(255,255,255,.6)';
   // A STORYBOARD SAYS "NO COPY" IN PROSE, and the sketch used to draw that prose as the film's own
  // words: beat 1 of hi-vandit reads "onscreen: (none, the mark itself is the only mark)" and the
  // panel rendered that whole parenthetical as large white type, so the approval surface showed a
  // line that will never be in the film. A parenthesised note, or a bare "none", is the author
  // declining the slot, not filling it.
  const declined=(l)=>/^\s*\(?\s*none\b/i.test(l) || /^\s*\(.*\)\s*$/.test(l);
  const boxes=archBoxes(b.archetype), label=(b.picture||b.object||'').trim(), onscreen=(b.onscreen||[]).filter(Boolean).filter((l)=>!declined(l));
   const copyBoxes=boxes.filter((x)=>x[4]==='copy');
   let s='<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg" font-family="Anybody,system-ui,sans-serif">'
     +'<rect width="1920" height="1080" fill="'+bg+'"/>';
   boxes.filter((x)=>x[4]==='object').forEach(([x,y,w,h])=>{
     s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="18" fill="'+surface+'" stroke="'+edge+'" stroke-width="3" stroke-dasharray="14 10"/>';
     if(label){ const lines=wrapWords(label,Math.max(14,Math.floor(w/26))), startY=y+h/2-(lines.length-1)*26;
       s+='<text x="'+(x+w/2)+'" y="'+startY+'" text-anchor="middle" fill="'+dim+'" font-size="34" font-weight="600">'
         +lines.map((l,i)=>'<tspan x="'+(x+w/2)+'" dy="'+(i===0?0:52)+'">'+esc(l)+'</tspan>').join('')+'</text>'; }
   });
   // onscreen renders as real type: it is not a description of the beat, it IS the beat's own words.
   // A copy slot the archetype names gets it; an archetype with none still gets it, lower third, because
   // dropping decided words for want of a layout slot is a worse lie than an imprecise position.
   if(onscreen.length){ const [cx,cyBox]=copyBoxes.length?[960,copyBoxes[0][1]+copyBoxes[0][3]/2]:[960,940];
     const startY=cyBox-(onscreen.length-1)*30;
     s+='<text x="'+cx+'" y="'+startY+'" text-anchor="middle" fill="'+text+'" font-size="52" font-weight="700">'
       +onscreen.map((l,i)=>'<tspan x="'+cx+'" dy="'+(i===0?0:60)+'">'+esc(l)+'</tspan>').join('')+'</text>'; }
   return s+'</svg>';
 }
 function planEmpty(why){
   planBody.innerHTML=''; planNote.hidden=false;
   planNote.innerHTML='<h2>the plan is not here yet</h2><p>'+esc(why)+'</p>'
     +'<p>The storyboard is where the beats were decided, and every role that writes into the film '
     +'transcribes it. Write one before the JSON:</p>'
     +'<ul><li>a <code>&lt;name&gt;.storyboard.md</code> beside the scene, or a top-level <code>"storyboard"</code> field</li>'
     +'<li><code>make storyboard-check SB=&lt;file&gt;</code></li></ul>';
 }
 // 1920x1080 is wider than this pane, so each fragment is SCALED rather than resized: a fragment
 // reflowed to a narrow viewport is a different picture, and this pane exists to show the real one.
 function fitPlan(){ planBody.querySelectorAll('.pstage iframe').forEach(f=>{
   f.style.transform='scale('+(f.parentElement.clientWidth/1920)+')'; }); }
 addEventListener('resize',fitPlan);
 function drawPlan(force){
   if(planDrawn&&!force) return;
   planDrawn=true; planPath.textContent='reading the storyboard…';
   fetch('/api/plan?t='+Date.now()).then(r=>r.json()).then(d=>{
     if(!d.ok){ planPath.textContent=''; return planEmpty(d.error||'no storyboard'); }
     planNote.hidden=true; planPath.textContent=d.file;
     const frags=new Set(d.beats.map(b=>b.fragment).filter(Boolean));
     let h='<div id=planhead><p id=planmsg>'+esc(d.message||'no message: this film has no spine yet')+'</p>'
       +'<div id=planfacts><span><b>'+esc(d.duration||'?')+'s</b></span>'
       +'<span><b>'+Math.round((d.duration||0)*30)+'</b> frames</span>'
       +'<span><b>'+d.beats.length+'</b> beats</span>'
       +'<span><b>'+frags.size+'</b> fragments</span>'
       +'<span><b>'+esc(d.format||'')+'</b></span><span>theme <b>'+esc(d.theme||'')+'</b></span></div>';
     if(d.pace||d.spectacle||d.not){ h+='<div class=planspine>'
       +(d.pace?'<p><b>pace</b> '+esc(d.pace)+'</p>':'')
       +(d.spectacle?'<p><b>spectacle</b> '+esc(d.spectacle)+'</p>':'')
       +(d.not?'<p><b>not</b> '+esc(d.not)+'</p>':'')+'</div>'; }
     if(d.devices&&d.devices.length){
       const used=d.devices.filter(x=>!x.dropped).length;
       h+='<details id=plandev><summary>the reference, decoded &middot; '+used+' of '+d.devices.length
         +' devices used</summary><table>'
         +d.devices.map(x=>'<tr class="'+(x.dropped?'dropped':'')+'"><td>'+esc(x.id)+'</td><td>'
           +esc(x.device)+'</td><td>'+esc(x.use)+'</td></tr>').join('')
         +'</table></details>'; }
     if(d.findings&&d.findings.length){ h+='<div id=plangate>'
       +d.findings.map(f=>'<div class="'+(f.kind==='✓'?'ok':'')+'">'+f.kind+' '+esc(f.line)+'</div>').join('')+'</div>'; }
     h+='</div>';
     let prevArch='';
     d.beats.forEach((b,i)=>{
       const stage=b.fragment
         ? '<div><div class=pstage><iframe loading=lazy title="'+esc(b.name)+'" src="/__frag?src='+encodeURIComponent(b.fragment)+'"></iframe></div>'
           +'<p class=psrc>'+esc(b.fragment)+'</p></div>'
         : hasPicture(b)
         ? '<div><div class="pstage sketch">'+sketchSvg(b,d.palette)
             +'<span class=psketchtag title="no hand-written fragment yet: drawn from the storyboard&#39;s own archetype/picture/onscreen">sketch</span></div>'
           +'<p class=psrc>'+(b.blueprint?'blueprint: '+esc(String(b.blueprint).split(' (')[0]):'no fragment yet, drawn from the storyboard')+'</p></div>'
         : '<div class="pstage none"><div><s>nothing to show yet</s><b>no picture decided</b>'
           +'<p>This beat names no archetype, picture, object, or onscreen line, so there is nothing honest '
           +'to draw. Add one of those to the storyboard, or write a <code>fragment:</code> and author it: '
           +'stage kit &rarr; the reference&#39;s grammar &rarr; the smallest useful <code>ui-skills</code> set '
           +'&rarr; <code>make preview</code>.</p></div></div>';
       const copy=(b.onscreen||[]).length
         ? '<ul class=pcopy>'+b.onscreen.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul>' : '';
       const rows=PFIELDS.filter(f=>b[f[0]]).map(f=>'<div class=prow><dt>'+f[1]+'</dt><dd>'+esc(b[f[0]])+'</dd></div>').join('');
       h+='<section class=pbeat id="pbeat-'+(i+1)+'"><header><span class=pn>'+(i+1)+'</span>'
         +'<h3>'+esc(b.name)+'</h3>'
         +'<span class=pmeta>'+(+b.start).toFixed(1)+'s to '+(+b.end).toFixed(1)+'s</span>'
         +'<span class="pmeta pdur">'+(b.end-b.start).toFixed(1)+'s</span>'
         +'<span class=sp></span>'
         +(b.archetype?'<span class="ptag'+(prevArch&&prevArch===b.archetype?' repeat':'')+'" title="composition">'+esc(b.archetype)+'</span>':'')
         +(b.weight?'<span class="ptag'+(b.weight==='peak'?' peak':'')+'" title="how loud this beat is">'+esc(b.weight)+'</span>':'')
         +'<span class=pmeta>'+esc(b.type||'')+'</span></header>'
         +stage+'<div>'+copy+'<dl>'+rows+'</dl></div></section>';
       prevArch=b.archetype||'';
     });
     planBody.innerHTML=h;
     // The iframes have no layout until the pane is visible, so fit twice: now, and once they load.
     fitPlan(); planBody.querySelectorAll('.pstage iframe').forEach(f=>f.addEventListener('load',fitPlan));
     say('the plan is drawn, '+d.beats.length+' beats');
   }).catch(e=>{ planPath.textContent=''; planEmpty('could not read the plan: '+e.message); });
 }
 $('planredraw').addEventListener('click',()=>drawPlan(true));

 // ---- the stage strip, filled from the same reader that make stage prints ---------------------------
 // Which pane a stage happens in. A stage with no pane here (brief, assemble, direct) still shows; it
 // just says the command, because pretending every stage has a screen would be the lie this strip is
 // for removing.
 const STAGE_PANE={plan:'plan',approval:'plan',design:'plan',render:'ship',judge:'look'};
 fetch('/api/stage').then(r=>r.json()).then(d=>{
   if(!d||!d.ok) return;
   const at=d.order.indexOf(d.stage);
   $('stagedots').innerHTML=d.order.map((id,i)=>
     '<b class="'+(i<at?'done':i===at?'at':'')+'">'+esc(id)+'</b>').join('<i></i>');
   $('stagenext').innerHTML='<code>'+esc(d.next)+'</code>';
   $('stagenext').title=d.why;
   const pane=STAGE_PANE[d.stage];
   if(pane) $('stagedots').querySelector('b.at').style.cursor='pointer';
   if(pane) $('stagedots').addEventListener('click',(e)=>{ if(e.target.classList.contains('at')) setState(pane); });
 }).catch(()=>{});

 // ---- LOOK: the film as a STRIP, which is a different question from a frame ----------------------
 // Scrubbing tells you what a frame IS. A strip tells you whether the film WORKS, and the two sheets
 // here are the ones this repo already makes and least often reads: every beat in · mid · out, and
 // both sides of every transition pulled out of the rendered mp4. Neither needs new engine work.
 const sheetImg=$('sheet'), sheetBtn=$('sheetzoom'), sheetNote=$('sheetnote'), lookStat=$('lookstat'), lookWhat=$('lookwhat');
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
 const SHEETWHAT={beats:'every beat: in · mid · out. No render needed',
                  frames:'the key frames of the whole film. No render needed',
                  seams:'both sides of every transition, out of the rendered mp4'};
 let sheetKind='beats', sheetHave={};
 let renderPoll=null;
 function lookBusy(msg){ lookStat.innerHTML='<span class=work><i></i>'+esc(msg)+'</span>'; }
 function note(title,body){ sheetBtn.hidden=true; sheetNote.hidden=false;
   sheetNote.innerHTML='<b>'+esc(title)+'</b>'+body; }
 function showSheet(kind,force){
   sheetKind=kind;
   [...document.querySelectorAll('[data-sheet]')].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sheet===kind)));
   lookWhat.textContent=SHEETWHAT[kind]||'';
   if(sheetHave[kind]&&!force){ setSheet(sheetHave[kind].u,sheetHave[kind].dim); lookStat.textContent=''; return; }
   const busy=kind==='seams'?'decoding the seams out of the mp4, this takes a few seconds':'rendering every beat, this takes a few seconds';
   lookBusy(busy); say(busy);
   sheetBtn.hidden=true; sheetNote.hidden=true;
   // EACH SHEET COSTS SECONDS, so two can be in flight and the slower one used to land last and
   // overwrite the one you asked for second. A reply for a sheet nobody is looking at now is dropped.
   const mine=()=>sheetKind===kind;
   fetch('/__sheet?kind='+kind+'&t='+Date.now()).then(r=>{
     if(!mine()) return;
     const dim=r.headers.get('X-Dim');
     if(r.status===409&&r.headers.get('X-Needs-Render')) return r.text().then(t=>{ lookStat.textContent=''; say('there are no seam frames yet');
       // SAY IT, never draw an empty grid. And offer the one thing that would fix it.
       note('there are no seam frames to look at yet','<p>'+esc(t)+'</p><p>A render takes minutes and runs '
         +'<code>make video</code> with the gates off.</p><p><button id=dorender>render it now</button></p>');
       $('dorender').addEventListener('click',startRender); });
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
   j.innerHTML=ms.length?ms.map(([t,k])=>'<button data-t="'+t+'">'+esc(k)+' '+(+t).toFixed(2)+'s</button>').join('')
     :'<span class=stub><i></i>this film declares no cuts, seams or stings to jump to</span>';
   j.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{
     setState('make'); go(Math.round(+b.dataset.t*fps)); }));
 }

 // ---- SHIP: a stub, and it says which gate it is showing you --------------------------------------
 // The ladder is \`make ship\`, twenty steps that declare themselves as they run, and none of it is
 // wired here. What IS real is beat-check, because the timeline already runs it, so this shows exactly
 // that one gate's codes and refuses to imply it has seen the other nineteen.
 function drawShip(){
   const g=(model&&model.gate)||{codes:[]};
   const codes=g.codes||[];
   $('shipstat').textContent=codes.length?codes.length+' beat-check finding(s)':'beat-check is clean';
   $('shipbody').innerHTML='<h2>not wired: this is one gate of twenty</h2>'
     +'<p>The ladder that says a film is done is <code>make ship D='+esc((model&&model.file)||'')+'</code>. '
     +'It declares every step before it runs, and nothing here runs any of them.</p>'
     +'<p>What studio already knows is <b>beat-check</b>, because the timeline\\'s hazard bands come from it:</p>'
     +(codes.length?'<ul>'+codes.map(c=>'<li><code>'+esc(c)+'</code></li>').join('')+'</ul>'
       :'<ul><li>no findings on this scene</li></ul>')
     +'<p>Waivers, legacy debt and what actually blocks are not shown, and a clean panel here is not a '
     +'film cleared to go out.</p>';
 }
 // ---- THE CHOOSER: six takes of this film, at this frame ------------------------------------------
 // IT NEVER ASKS FOR A WORD. There is no search box here and there will not be one: the person this
 // panel is for can see what they want and cannot name it, which is exactly what \`make arsenal\` cannot
 // help with. You point at a frame, it renders six real versions of that frame, and you pick one.
 //
 // Every card is a LOOPING CLIP, never a still. A still hides speed, scale and direction, and this repo
 // has been burned by exactly that (docs/MISTAKES.md #155).
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
 function candDone(msg){ clearInterval(candTick); candStat.textContent=msg; }
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
        candDone(''); candStat.innerHTML='<span style="color:var(--bad)">'+esc(d.error||'no candidates')+'</span>';
        say('no candidates: '+(d.error||''));
        return; }
      drawCands(d);
    }).catch(e=>{ candBusy=false; candGo.disabled=false; candDone('could not ask for candidates: '+e.message);
      say('the chooser failed: '+e.message); });
 }
 function drawCands(d){
   const w=d.window||{}, cs=(d.candidates||[]).filter(c=>c.clip);
   clearInterval(candTick);
   candStat.innerHTML=esc('bg['+w.index+'], now \u201c'+w.current+'\u201d, at '+d.at+'s · '+cs.length+' takes in '+Math.round((d.ms||0)/1000)+'s')
     +'<br>click one to apply it, <kbd>undo</kbd> above puts it back.';
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
     +'<span class=t><b>'+esc(c.name)+'</b><s>'+(c.new?'new':(c.scenes+' film'+(c.scenes===1?'':'s')))+'</s></span>'
     +'<span class=d>'+esc(c.blurb||'')+'</span>'
     +(c.warnings||[]).map(w2=>'<span class="d warn">'+esc(w2)+'</span>').join('')
     +'</button>').join('');
   cands.querySelectorAll('.cand').forEach(b=>b.addEventListener('click',()=>applyCand(cs[+b.dataset.i])));
   // SIX LOOPS THAT NEVER STOP IS AN AUTOPLAY NOBODY CAN INTERRUPT. The control was only drawn under
   // prefers-reduced-motion, which reads the setting as the only reason to want them still. It is one
   // button either way, and it says which state it is about to move you to.
   if(!$('candplay')) candGo.insertAdjacentHTML('beforebegin',
     '<button id=candplay style="width:100%;margin-top:8px"></button>');
   const cp=$('candplay'); let running=!still;
   const label=()=>{ cp.textContent=running?'pause the six clips':'play the six clips'; };
   label();
   cp.onclick=()=>{ running=!running;
     cands.querySelectorAll('video').forEach(v=>{ if(running) v.play(); else v.pause(); }); label(); };
 }
 function applyCand(c){
   candStat.innerHTML='<span class=work><i></i>applying '+esc(c.name)+'</span>';
   fetch('/api/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ops:c.patch})})
    .then(r=>r.json()).then(r=>{
      if(!r.ok){ candStat.innerHTML='<span style="color:var(--bad)">'+esc(r.error)+'</span>'; return; }
      candStat.textContent=r.changed?('applied \u201c'+c.name+'\u201d to the scene. undo is in the top bar.')
        :('the scene already used \u201c'+c.name+'\u201d, nothing changed.');
      say(candStat.textContent);
      if(r.changed) reloadScene();
    });
 }
 candGo.addEventListener('click',askCandidates);

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
     b.textContent='copied'; say('the JSON is on the clipboard'); setTimeout(()=>b.textContent='copy JSON',1200); }); });
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
 dragEl.addEventListener('pointercancel',()=>{ dragging=null; dragEl.classList.remove('dragging'); });
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
   measureBoxes();
 }
 function draw(){ const e=sc.contentWindow.__engine; if(!e)return; e.renderFrame(n);
   read.innerHTML='frame <b>'+n+'</b> / '+total+' · '+(n/fps).toFixed(2)+'s'; scrub.value=n;
   // measured off the RULER, which is the element the times are drawn on. A percentage of the lanes
   // box was 12px out at the end of the film and moved again when a scrollbar appeared.
   ph.style.transform='translateX('+atX(n/fps)+'px)';
   // the range announces "0", not "frame 0 of 420": a bare number is not a position in a film
   scrub.setAttribute('aria-valuetext','frame '+n+' of '+total+', '+(n/fps).toFixed(2)+' seconds');
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
   }catch(_){ selBox.classList.remove('on'); }   // a cross-origin document cannot be measured
 }
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
 // A LABEL MEASURED IN THE FALLBACK FACE IS THE WRONG WIDTH. The first paint can land before
 // JetBrains Mono has loaded, and the ruler then chose a 1s stride the real face has no room for:
 // the dark room and the light room disagreed about the same window, which is how it was caught.
 if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ if(model) paint(model); });
 // the ruler is measured against its own width, so a resize has to re-measure it
 addEventListener('resize',()=>{ if(model) paint(model); });
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
   if(e.key==='Escape'){ pick.classList.remove('on'); return; }
   if(typing()||e.metaKey||e.ctrlKey||e.altKey) return;
   // the states, in the order they are asked. Cheap to move between, so they are one keystroke apart.
   const st={'1':'plan','2':'make','3':'look','4':'ship'}[e.key];
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
   // the browser paints its own chrome behind this page, so it is told which room it is standing in
   $('tcol').setAttribute('content',getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#F2F2F2');
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
 // ---- the filmstrip ------------------------------------------------------------------------------
 // NEVER BLOCKS THE FIRST PAINT. The timeline draws, then this asks for the strip and fills the band in
 // when it arrives; the band is display:none until it has something, so nothing reserves a grey hole.
 // Built once per scene on the server and cached there, so this is one request and then free.
 let stripDone=false;
 function filmstrip(){
   if(stripDone) return; stripDone=true;
   const band=$('film');
   fetch('/api/strip').then(r=>r.json()).then(s=>{
     if(!s||!s.frames||!s.frames.length){ stripDone=false;
       if(s&&s.error) $('tlkey').textContent+='  ·  no strip: '+s.error; return; }
     const w=100*s.stride/dur;
     stripFrames=s.frames;
     band.innerHTML=s.frames.map(f=>'<div class=fr style="left:'+pc(f.t-s.stride/2)+';width:'+w+'%;background-image:url('+f.src+')"></div>').join('');
     // A LAYER THAT NEVER CHANGED at any instant we looked at. A NOTE, never a block: a held frame is
     // sometimes the beat. Marked on the bar and counted once in the header.
     const still=new Set(s.still||[]);
     if(still.size){
       [...rows.querySelectorAll('.bar')].forEach(b=>{ if(still.has(+b.dataset.i)){ b.classList.add('still');
         b.title+='  ·  nothing about this layer changed at any of the '+s.frames.length+' instants sampled'; } });
       $('tlkey').textContent+='  ·  '+still.size+' layer'+(still.size===1?'':'s')+' never change';
     }
   }).catch(()=>{ stripDone=false; });
 }
 function timeline(){
   fetch('/api/timeline').then(r=>r.json()).then(m=>{ model=m; drawCrumbs(); paint(m); drawJump(); })
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
   // LABELS ARE DROPPED BY MEASUREMENT. The old rule dropped the second-to-last label whenever a tick was
   // narrower than a guessed 96px, which at 1440 threw away a label that fitted and at 1100 still let
   // "13s 390f" collide with the pinned end label. So the widest label (the last one, biggest numbers) is
   // rendered offscreen in the real face at the real size, and the stride is however many ticks it takes
   // to clear that width. Nothing here knows what the window is.
   const ticks=[]; for(let t=0;t<=dur+1e-6;t+=step) ticks.push(+t.toFixed(4));
   const lab=(t)=>(+t.toFixed(2))+'s<em>'+Math.round(t*fps)+'f</em>';
   const labW=measure(lab(ticks[ticks.length-1]))+14;   // +14: the gap a label needs before the next tick
   const rw=ruler.clientWidth||1, stride=Math.max(1,Math.ceil(labW/(rw*step/dur)));
   ticks.forEach((t,k)=>{ const end=k===ticks.length-1, x=rw*Math.min(1,t/dur);
     // the last tick owns the right edge and its label reads leftward, so anything whose text would run
     // into that label goes, whatever the stride says
     const show=end||(k%stride===0&&x+labW<=rw-labW-6);
     r+='<div class="t'+(end?' end':'')+'" style="left:'+pc(t)+'">'+(show?'<s>'+lab(t)+'</s>':'')+'</div>'; });
   for(const k of m.marks){
     r+='<div class=ms style="left:'+pc(k.t)+';width:'+(100*k.dur/dur)+'%"></div>'
       +'<div class=m style="left:'+pc(k.t)+'" title="'+esc(k.kind+' '+k.t+'s'+(k.name?' '+k.name:''))+'">'+k.kind.charAt(0).toUpperCase()+'</div>'; }
   ruler.innerHTML=r;
   let h='', H=bars.length*18;
   for(let t=step;t<=dur+1e-6;t+=step) h+='<div class=grid style="left:'+pc(t)+'"></div>';
   // ---- THE OTHER KINDS OF ROW, and they come FIRST -------------------------------------------------
   // Captions and sound are FEW and FIXED; the layer stack is unbounded. Drawn under it, a 76-layer film
   // buries its whole soundtrack below the fold of a scrolling list, which is where it was on the first
   // build of this. Above the layers they are always the first thing under the strip, and the stack that
   // can be any length scrolls beneath them.
   const caps=m.captions||[];
   if(caps.length){
     h+='<div class=lane-h><span>captions<em>'+caps.length+'</em></span></div>'; H+=21;
     for(const c of caps){ const w=Math.max(0,c.t1-c.t0);
       h+='<div class="row cap"><b style="left:'+pc(c.t0)+';width:'+(100*w/dur)+'%" title="'+esc(c.text)+'">'+esc(c.text)+'</b></div>'; H+=16; }
   }
   const A=m.audio||{};
   if(!A.none){
     h+='<div class=lane-h><span>sound'+(A.silent?'<em>silent</em>':(A.music?'<em>'+esc(A.music.split('/').pop())+(A.gain!=null?' · gain '+A.gain:'')+'</em>':'<em>no bed</em>'))+'</span></div>'; H+=21;
     if(A.silent){
       // A DECLARED SILENCE IS A DEVICE, and an undeclared one is a hole. The lane says which.
       h+='<div class=lane-note><span>'+(A.why?esc('silent: '+A.why):'silent, and no reason given: audio._why is where the device gets declared')+'</span></div>'; H+=16;
     } else {
       let a='<div class=bed>';
       const bts=(A.beats&&A.beats.beats)||[], dbs=new Set(((A.beats&&A.beats.downbeats)||[]).map(x=>+x.toFixed(3)));
       // a grid denser than a tick every 3px is a grey wash, not a grid, so it is dropped and said so
       const inRange=bts.filter(t=>t<=dur).length||1;
       const dense=bts.length&&(ruler.clientWidth/inRange<3);
       if(!dense) for(const t of bts){ if(t>dur) break;
         a+='<i class="bt'+(dbs.has(+t.toFixed(3))?' db':'')+'" style="left:'+pc(t)+'"></i>'; }
       if(A.fade&&A.fade.in) a+='<div class=fade style="left:0;width:'+(100*A.fade.in/dur)+'%"></div>';
       if(A.fade&&A.fade.out) a+='<div class=fade style="right:0;width:'+(100*A.fade.out/dur)+'%"></div>';
       for(const b of (A.bridges||[])) a+='<div class=br style="left:'+pc(b.start)+';width:'+(100*(b.end-b.start)/dur)+'%" title="'+esc((b.sound||'bridge')+' at '+b.at)+'"></div>';
       // two cues a tenth of a second apart printed their names on top of each other, so the labels
       // alternate high and low. The ticks stay where they are: it is the TIME that is being read.
       (A.cues||[]).forEach((c,i)=>{ a+='<div class=cue style="left:'+pc(c.t)+'"><s style="top:'+(i%2?12:-1)+'px">'+esc(c.name)+'</s></div>'; });
       a+='<span class=name>'+(A.beats?esc(Math.round(A.beats.bpm)+' bpm'+(dense?', grid too dense to draw':'')):(A.auto?'auto':''))+'</span></div>';
       h+='<div class="row aud">'+a+'</div>'; H+=30;
       if(A.bridgeError){ h+='<div class=lane-note><span>bridges did not resolve: '+esc(A.bridgeError)+'</span></div>'; H+=16; }
     }
     h+='<div class=lane-h><span>layers<em>'+bars.length+'</em></span></div>'; H+=21;
   }
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
   rows.style.height=H+'px';
   filmstrip();
   $('tlwhat').textContent=m.file+' · '+bars.length+' layers · '+dur.toFixed(2)+'s / '+total+'f';
   // no colour key: the bars are a grey ramp, not a code, and each one prints its own type. What is
   // worth naming here is WHICH types the film is made of.
   $('tlkey').textContent=[...new Set(bars.map(b=>b.type))].join(' · ');
   $('alerts').innerHTML=holes.map(([a,b,lab])=>{
     const dis=grown.some(([x,y])=>x<b-1e-9&&y>a+1e-9);
     return '<span'+(dis?' class=dis':'')+'>'+(dis?'? ':'')+lab+' '+a.toFixed(2)+'s to '+b.toFixed(2)+'s'
       +(dis?': the engine holds a window open here that the JSON does not declare, so beat-check may be reading a hole that does not render':'')+'</span>'; }).join('');
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
   try{ peekFrame.contentWindow.__engine.renderFrame(Math.round(peekWant*fps)); }catch(_){ }
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
   peek.style.transform='translate3d('+Math.max(8,Math.min(innerWidth-peekW-8,clientX-peekW/2))+'px,'
     +Math.max(8,tlTop-peekH-8)+'px,0)';
   $('hov').style.display='block';
   $('hov').style.transform='translateX('+atX(peekWant)+'px)';
 }
 function peekOff(){ peek.classList.remove('on'); $('hov').style.display='none'; peekWant=null; }
 lanes.addEventListener('pointermove',e=>{
   // a drag is a scrub and owns the pointer; hovering is the only thing that peeks
   if(e.buttons&1){ peekOff(); return; }
   peekAt((e.clientX-rulerL)/rulerW*dur, e.clientX);
 });
 lanes.addEventListener('pointerleave',peekOff);
 // SELECTING A LAYER WAS POINTER-ONLY. Every bar is a div, and making seventy of them tab stops would
 // bury the rest of the page, so the lane stack is one stop and the arrows walk it: the same shape a
 // list box has. Left and right still seek, because the global handler owns those.
 lanes.addEventListener('keydown',e=>{
   if(e.key!=='ArrowDown'&&e.key!=='ArrowUp') return;
   const bars=[...rows.querySelectorAll('.bar')].filter(b=>+b.dataset.i>=0);
   if(!bars.length) return;
   e.preventDefault(); e.stopPropagation();
   const at=bars.findIndex(b=>+b.dataset.i===selIdx);
   const to=bars[Math.max(0,Math.min(bars.length-1,at<0?0:at+(e.key==='ArrowDown'?1:-1)))];
   setSel(+to.dataset.i); to.scrollIntoView({block:'nearest'});
   say(selLabel.trim()||('layer '+selIdx)); });

 // drag anywhere in the lanes to seek; the playhead and the scrubber are the same value
 const seek=(e)=>{ n=Math.max(0,Math.min(total,Math.round((e.clientX-rulerL)/rulerW*dur*fps))); draw(); };
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
   $('tgl').setAttribute('aria-expanded',String(!off)); document.body.classList.toggle('tloff',off);
   keepFocus($('tgl')); fit(); measureBoxes(); });
 drawCrumbs(); setState('make');
