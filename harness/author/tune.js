import { sampleSegment, outHandle, inHandle, outHandleFromPoint, inHandleFromPoint } from '/harness/author/curve-math.mjs';

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const sc = $('#sc'), scrub = $('#scrub'), read = $('#read'), rail = $('#layers');
  let fps = 30, total = 0, n = 0, winLo = 0, winHi = 0;
  let eases = [], layers = [];

  const NUM_PROPS = ['x', 'y', 'scale', 'rot', 'opacity', 'blur', 'w', 'h', 'radius'];
  const STEP = { scale: 0.01, opacity: 0.01, blur: 0.5, rot: 1, x: 1, y: 1, w: 1, h: 1, radius: 1, t: 0.01 };
  // The value a keyed prop holds when a key omits it: core/timeline/sequence.js `POSE`'s identity
  // column, copied rather than imported so this file stays plain JS the graph editor owns, not a
  // second reader of the engine's internal table shape.
  const IDENT = { x: 0, y: 0, scale: 1, rot: 0, opacity: 1, blur: 0, w: null, h: null, radius: null };

  function engine() { const w = sc.contentWindow; return w && w.__engineReady && w.__engine ? w.__engine : null; }

  function fit() {
    const e = engine(); if (!e) return;
    const { width: W, height: H } = e.meta;
    const stage = $('#stage'), pad = 48;
    const s = Math.min((stage.clientWidth - pad) / W, (stage.clientHeight - pad) / H);
    sc.width = W; sc.height = H; sc.style.width = W + 'px'; sc.style.height = H + 'px';
    sc.style.transform = 'scale(' + s + ')'; sc.style.transformOrigin = 'center';
  }
  addEventListener('resize', fit);

  function draw() {
    const e = engine(); if (!e) return;
    e.renderFrame(n);
    read.textContent = (n / fps).toFixed(2) + 's · ' + n + 'f';
    scrub.value = String(n);
  }

  // reseekEngine: the engine sync + reseek only, no DOM teardown. Used on every pointermove of a
  // handle drag, where redrawing full graph panels would recreate the dragged <circle> and drop its
  // pointer capture mid-gesture (MISTAKES-shaped: found by trying it).
  function reseekEngine() {
    const e = engine(); if (!e || !e.data) return;
    for (const L of layers) {
      const target = e.data.layers[L.index];
      if (!target) continue;
      target.motion = L.motion.map((k) => ({ ...k }));
      if (L.vars) target.vars = { ...L.vars }; if (L.varsDur != null) target.varsDur = L.varsDur;
      if (L.varsDelay != null) target.varsDelay = L.varsDelay; if (L.varsEase != null) target.varsEase = L.varsEase;
    }
    draw();
  }

  function livePreview() {
    reseekEngine();
    for (const L of layers) if (L._graph) drawGraphs(L);
  }

  function numInput(value, step, onSet) {
    const i = document.createElement('input');
    i.type = 'number'; i.step = String(step);
    if (value !== undefined && value !== null) i.value = value;
    i.addEventListener('input', () => { onSet(i.value === '' ? undefined : +i.value); livePreview(); });
    return i;
  }

  function easeSelect(value, onSet) {
    const s = document.createElement('select');
    s.appendChild(new Option('(unset)', ''));
    for (const name of eases) s.appendChild(new Option(name, name));
    // A scene may already carry a name this list does not enumerate (a GSAP alias like
    // "power2.inOut", accepted by resolveEasing but not one of the curated EASINGS keys): add it so
    // the select shows the real value instead of silently falling back to "(unset)".
    if (value && !eases.includes(value)) s.appendChild(new Option(value, value));
    s.value = value || '';
    s.addEventListener('change', () => { onSet(s.value || undefined); livePreview(); });
    return s;
  }

  function row(labelText, ctrl) {
    const r = document.createElement('div'); r.className = 'row';
    const l = document.createElement('label'); l.textContent = labelText;
    r.append(l, ctrl); return r;
  }

  function usedProps(L) {
    return NUM_PROPS.filter((p) => L.motion.some((k) => k[p] !== undefined));
  }

  function keyBlock(L, k, i) {
    const div = document.createElement('div'); div.className = 'key';
    div.append(row('t', numInput(k.t ?? 0, STEP.t, (v) => { k.t = v ?? 0; })));
    div.append(row('ease', easeSelect(k.ease, (v) => { if (v) k.ease = v; else delete k.ease; })));
    const used = new Set(usedProps(L));
    for (const p of NUM_PROPS) if (used.has(p))
      div.append(row(p, numInput(k[p], STEP[p], (v) => { if (v === undefined) delete k[p]; else k[p] = v; })));
    return div;
  }

  function varsBlock(L) {
    if (!L.vars || typeof L.vars !== 'object') return null;
    const wrap = document.createElement('div'); wrap.className = 'key';
    const h = document.createElement('div'); h.style.cssText = 'color:var(--ink-3);font-size:11px;margin-bottom:4px'; h.textContent = 'vars'; wrap.append(h);
    for (const [name, range] of Object.entries(L.vars)) {
      const [a, b] = Array.isArray(range) ? range : [0, range];
      const r = document.createElement('div'); r.className = 'row';
      const l = document.createElement('label'); l.textContent = name; r.append(l);
      r.append(numInput(a, 0.01, (v) => { L.vars[name] = [v ?? 0, L.vars[name][1]]; }));
      r.append(numInput(b, 0.01, (v) => { L.vars[name] = [L.vars[name][0], v ?? 0]; }));
      wrap.append(r);
    }
    const scalar = (label, key, step) => {
      const v = L[key];
      if (v != null && typeof v === 'object') { // per-channel map: rare, edit the JSON by hand instead of guessing a UI for it
        const p = document.createElement('div'); p.className = 'row';
        p.innerHTML = '<label>' + label + '</label><span style="color:var(--ink-3)">per-channel, edit JSON by hand</span>';
        wrap.append(p); return;
      }
      wrap.append(row(label, numInput(v, step, (val) => { L[key] = val; })));
    };
    scalar('varsDur', 'varsDur', 0.05); scalar('varsDelay', 'varsDelay', 0.05);
    return wrap;
  }

  // ---------- graph editor (value curve + speed curve, drawn from core/motion.js's own easing) ----------
  const GW = 340, GH = 110, SH = 46, PAD = 8;
  const svgNS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => { const e = document.createElementNS(svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  // segmentsOf(L): adjacent key pairs, the unit both sampleSegment and a handle belong to.
  function segmentsOf(L) { const out = []; for (let i = 0; i < L.motion.length - 1; i++) out.push([L.motion[i], L.motion[i + 1]]); return out; }

  // geomFor(L, prop): the fixed value/speed domain for one property, built once per prop switch so
  // dragging never rescales the axis under the mouse. null when the property has no real segment.
  function geomFor(L, prop) {
    const ident = IDENT[prop];
    const segs = segmentsOf(L).map(([a, b]) => ({ a, b, s: sampleSegment(a, b, prop, ident) })).filter((x) => x.s);
    if (!segs.length) return null;
    const t0 = segs[0].a.t, t1 = segs[segs.length - 1].b.t;
    let vmin = Infinity, vmax = -Infinity;
    const speedSegs = segs.map(({ a, b, s }) => {
      const avgVel = (b.t - a.t) > 0 ? (s.bv - s.av) / (b.t - a.t) : 0;
      const sp = s.pts.map((pt, i) => {
        vmin = Math.min(vmin, pt.v); vmax = Math.max(vmax, pt.v);
        const prev = s.pts[Math.max(0, i - 1)], next = s.pts[Math.min(s.pts.length - 1, i + 1)];
        const dt = next.t - prev.t;
        const dv = dt > 0 ? (next.v - prev.v) / dt : 0;
        return { t: pt.t, v: avgVel !== 0 ? dv / avgVel : 0 };
      });
      return sp;
    });
    if (vmin === vmax) { vmin -= 1; vmax += 1; }
    let smax = 0.5;
    for (const sp of speedSegs) for (const p of sp) smax = Math.max(smax, Math.abs(p.v));
    smax *= 1.15;
    return { prop, ident, segs, speedSegs, t0, t1, vmin, vmax, smax };
  }

  const xOf = (g, t) => ((t - g.t0) / (g.t1 - g.t0 || 1)) * GW;
  const tOf = (g, x) => g.t0 + (x / GW) * (g.t1 - g.t0);
  const yOf = (g, v) => (GH - PAD) - ((v - g.vmin) / (g.vmax - g.vmin || 1)) * (GH - 2 * PAD);
  const vOf = (g, y) => g.vmin + (((GH - PAD) - y) / (GH - 2 * PAD)) * (g.vmax - g.vmin);
  const ySOf = (g, s) => SH / 2 - (s / g.smax) * (SH / 2 - 6);

  function pathFor(g, mapY) {
    let d = '';
    for (const seg of g.segs) {
      const s = sampleSegment(seg.a, seg.b, g.prop, g.ident);
      s.pts.forEach((p, i) => { d += (i === 0 ? 'M' : 'L') + xOf(g, p.t).toFixed(2) + ',' + mapY(p.v).toFixed(2) + ' '; });
    }
    return d;
  }
  function speedPathFor(g) {
    let d = '';
    g.speedSegs.forEach((sp) => sp.forEach((p, i) => { d += (i === 0 ? 'M' : 'L') + xOf(g, p.t).toFixed(2) + ',' + ySOf(g, p.v).toFixed(2) + ' '; }));
    return d;
  }

  // handlePoint(g, a, b, side): the draggable dot for one side of one segment, snapped onto the
  // ACTUAL rendered curve (which may still be a named easing, not yet a handle) so the dot is never
  // seen off the line it appears to belong to.
  function handlePoint(g, a, b, side) {
    const h = side === 'out' ? outHandle(a) : inHandle(b);
    const x = side === 'out' ? h.influence / 100 : 1 - h.influence / 100;
    const t = a.t + x * (b.t - a.t);
    const at = sampleSegment(a, b, g.prop, g.ident);
    if (!at) return null;
    const u = (b.t - a.t) > 0 ? (t - a.t) / (b.t - a.t) : 0;
    const idx = Math.round(u * (at.pts.length - 1));
    return { x: xOf(g, t), y: yOf(g, at.pts[Math.max(0, Math.min(at.pts.length - 1, idx))].v), h };
  }

  function nudgeHandle(a, b, side, dInf, dSpeed) {
    if (b.ease != null) delete b.ease;   // touching a handle authors the bezier; a named `ease` beside it is refused at boot
    const cur = side === 'out' ? outHandle(a) : inHandle(b);
    const influence = Math.min(100, Math.max(0, cur.influence + dInf));
    const speed = cur.speed + dSpeed;
    if (side === 'out') a.easeOut = { influence, speed }; else b.easeIn = { influence, speed };
  }

  function drawGraphs(L) {
    const g = L._graph; if (!g) return;
    const geom = geomFor(L, g.prop);
    g.valueSvg.innerHTML = ''; g.speedSvg.innerHTML = '';
    if (!geom) { g.hint.textContent = `${g.prop}: not keyed on two adjacent keys, nothing to graph`; return; }
    g.hint.textContent = 'drag a handle to shape the segment · arrow keys nudge, shift = big step';
    for (let i = PAD; i <= GH - PAD; i += (GH - 2 * PAD) / 4) g.valueSvg.append(el('line', { class: 'grid', x1: 0, x2: GW, y1: i, y2: i }));
    g.valueSvg.append(el('path', { class: 'curve', d: pathFor(geom, (v) => yOf(geom, v)) }));
    g.speedSvg.append(el('line', { class: 'zero', x1: 0, x2: GW, y1: SH / 2, y2: SH / 2 }));
    g.speedSvg.append(el('path', { class: 'curve', d: speedPathFor(geom) }));

    geom.segs.forEach(({ a, b }, i) => {
      for (const side of ['out', 'in']) {
        const p = handlePoint(geom, a, b, side); if (!p) continue;
        const anchorT = side === 'out' ? a.t : b.t;
        const stem = el('line', { class: 'stem', x1: xOf(geom, anchorT), y1: yOf(geom, side === 'out' ? a[g.prop] ?? geom.ident : b[g.prop] ?? geom.ident), x2: p.x, y2: p.y });
        const c = el('circle', {
          class: 'handle', r: 5, cx: p.x, cy: p.y, tabindex: 0, role: 'slider',
          'aria-label': `${g.prop} key ${side === 'out' ? i : i + 1} ${side === 'out' ? 'easeOut' : 'easeIn'}`,
          'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(p.h.influence),
        });
        c.dataset.seg = String(i); c.dataset.side = side;
        const title = document.createElementNS(svgNS, 'title');
        title.textContent = `influence ${p.h.influence.toFixed(1)} · speed ${p.h.speed.toFixed(2)} (drag, or arrow keys)`;
        c.append(title);
        wireHandle(L, a, b, side, c);
        g.valueSvg.append(stem, c);
      }
    });
  }

  // patchLive: the drag-frame update. Mutates the SAME nodes drawGraphs built (the dragged circle,
  // its stem, the two curve paths) instead of rebuilding the panel, so pointer capture survives.
  function patchLive(L, geom, a, b, side, c) {
    const g = L._graph;
    const vp = g.valueSvg.querySelector('path.curve'), sp = g.speedSvg.querySelector('path.curve');
    if (vp) vp.setAttribute('d', pathFor(geom, (v) => yOf(geom, v)));
    if (sp) sp.setAttribute('d', speedPathFor(geom));
    const p = handlePoint(geom, a, b, side); if (!p) return;
    c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
    c.setAttribute('aria-valuenow', Math.round(p.h.influence));
    const stem = c.previousSibling;
    if (stem && stem.tagName === 'line') { stem.setAttribute('x2', p.x); stem.setAttribute('y2', p.y); }
  }

  function pointerToSeg(geom, svg, evt, a, b, side) {
    const r = svg.getBoundingClientRect();
    const x = (evt.clientX - r.left) / r.width * GW, y = (evt.clientY - r.top) / r.height * GH;
    const t = tOf(geom, x), v = vOf(geom, y);
    const seg = b.t - a.t || 1;
    const av = a[geom.prop] ?? geom.ident, bv = b[geom.prop] ?? geom.ident, dv = (bv - av) || 1;
    let bx = (t - a.t) / seg, by = (v - av) / dv;
    bx = side === 'out' ? Math.min(1, Math.max(1e-4, bx)) : Math.min(1 - 1e-4, Math.max(0, bx));
    return { bx, by };
  }

  function wireHandle(L, a, b, side, c) {
    c.addEventListener('pointerdown', (e) => {
      c.classList.add('dragging'); c.setPointerCapture(e.pointerId); e.preventDefault();
    });
    c.addEventListener('pointermove', (e) => {
      if (!c.classList.contains('dragging')) return;
      const geom = geomFor(L, L._graph.prop); if (!geom) return;
      const { bx, by } = pointerToSeg(geom, c.ownerSVGElement, e, a, b, side);
      if (b.ease != null) delete b.ease;
      const h = side === 'out' ? outHandleFromPoint(bx, by) : inHandleFromPoint(bx, by);
      if (side === 'out') a.easeOut = h; else b.easeIn = h;
      reseekEngine();
      patchLive(L, geom, a, b, side, c);
    });
    c.addEventListener('pointerup', (e) => {
      c.classList.remove('dragging'); c.releasePointerCapture(e.pointerId);
      drawGraphs(L);   // one canonical rebuild once the gesture settles
    });
    c.addEventListener('keydown', (e) => {
      const big = e.shiftKey;
      if (e.key === 'ArrowLeft') { nudgeHandle(a, b, side, -(big ? 5 : 1), 0); livePreview(); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { nudgeHandle(a, b, side, big ? 5 : 1, 0); livePreview(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { nudgeHandle(a, b, side, 0, big ? 0.5 : 0.05); livePreview(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { nudgeHandle(a, b, side, 0, -(big ? 0.5 : 0.05)); livePreview(); e.preventDefault(); }
    });
  }

  function curvesPanel(L) {
    const used = usedProps(L);
    if (!used.length) return null;
    const wrap = document.createElement('div'); wrap.className = 'curves';
    const h = document.createElement('h3'); h.textContent = 'curves ';
    const select = document.createElement('select');
    for (const p of used) select.appendChild(new Option(p, p));
    if (!used.includes(L.curveProp)) L.curveProp = used[0];
    select.value = L.curveProp;
    h.append(select);
    const valueSvg = el('svg', { class: 'graph', viewBox: `0 0 ${GW} ${GH}`, height: GH });
    const speedSvg = el('svg', { class: 'graph', viewBox: `0 0 ${GW} ${SH}`, height: SH, style: 'margin-top:4px' });
    const hint = document.createElement('div'); hint.className = 'hint';
    L._graph = { prop: L.curveProp, valueSvg, speedSvg, hint };
    select.addEventListener('change', () => { L.curveProp = select.value; L._graph.prop = select.value; drawGraphs(L); });
    wrap.append(h, valueSvg, speedSvg, hint);
    drawGraphs(L);
    return wrap;
  }

  function flashCopied(btn) { btn.textContent = 'copied'; setTimeout(() => { btn.textContent = 'copy JSON patch'; }, 1200); }

  function actions(L, host) {
    const bar = document.createElement('div'); bar.className = 'actions';
    const copyBtn = document.createElement('button'); copyBtn.textContent = 'copy JSON patch';
    const writeBtn = document.createElement('button'); writeBtn.textContent = 'write to file';
    const diffPre = document.createElement('pre'); diffPre.hidden = true;
    const confirmBtn = document.createElement('button'); confirmBtn.textContent = 'confirm write'; confirmBtn.hidden = true;
    const note = document.createElement('div'); note.id = 'note';

    copyBtn.addEventListener('click', () => {
      const patch = { id: L.id };
      if (L.motion.length) patch.motion = L.motion;
      if (L.vars) patch.vars = L.vars;
      if (L.varsDur != null) patch.varsDur = L.varsDur;
      if (L.varsDelay != null) patch.varsDelay = L.varsDelay;
      if (L.varsEase != null) patch.varsEase = L.varsEase;
      navigator.clipboard.writeText(JSON.stringify(patch, null, 2)).then(() => flashCopied(copyBtn));
    });

    const body = () => ({ layer: L.index, motion: L.motion, vars: L.vars, varsDur: L.varsDur, varsDelay: L.varsDelay, varsEase: L.varsEase, write: false });
    const post = (write) => fetch('/api/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body(), write }) }).then((r) => r.json());

    writeBtn.addEventListener('click', () => {
      post(false).then((r) => {
        if (!r.ok) { note.textContent = r.error; return; }
        if (!r.changed) { note.textContent = 'nothing changed'; diffPre.hidden = true; confirmBtn.hidden = true; return; }
        diffPre.textContent = r.diff; diffPre.hidden = false; confirmBtn.hidden = false; note.textContent = 'review the diff, then confirm';
      });
    });
    confirmBtn.addEventListener('click', () => {
      post(true).then((r) => {
        if (!r.ok) { note.textContent = r.error; return; }
        note.textContent = r.written ? 'written to the file' : 'nothing to write';
        diffPre.hidden = true; confirmBtn.hidden = true;
      });
    });

    bar.append(copyBtn, writeBtn, confirmBtn);
    host.append(bar, diffPre, note);
  }

  function render() {
    rail.innerHTML = '';
    for (const L of layers) {
      const box = document.createElement('div'); box.className = 'layer';
      const h = document.createElement('h2'); h.innerHTML = L.id + ' <code>' + L.type + ' · start ' + L.start.toFixed(2) + 's</code>'; box.append(h);
      L.motion.forEach((k, i) => box.append(keyBlock(L, k, i)));
      const v = varsBlock(L); if (v) box.append(v);
      const cp = curvesPanel(L); if (cp) box.append(cp);
      actions(L, box);
      rail.append(box);
    }
  }

  function frameWindow() {
    let lo = Infinity, hi = -Infinity;
    for (const L of layers) {
      const last = L.motion.length ? L.motion[L.motion.length - 1].t : (L.duration ?? 3);
      lo = Math.min(lo, L.start); hi = Math.max(hi, L.start + last);
    }
    if (!isFinite(lo)) { lo = 0; hi = total / fps; }
    return [Math.max(0, lo - 0.5), Math.min(total / fps, hi + 0.5)];
  }

  function ready(deadline) {
    const w = sc.contentWindow;
    if (w.__engineError) { read.textContent = 'engine error, see console'; console.error(w.__engineError); return; }
    if (!w.__engineReady || !w.__engine) {
      const dl = deadline || Date.now() + 20000;
      if (Date.now() > dl) { read.textContent = 'scene never signalled ready'; return; }
      return setTimeout(() => ready(dl), 80);
    }
    const m = w.__engine.meta || {}; fps = m.fps || 30; total = m.totalFrames || Math.round((m.duration || 5) * fps);
    const [lo, hi] = frameWindow(); winLo = Math.round(lo * fps); winHi = Math.round(hi * fps);
    scrub.min = String(winLo); scrub.max = String(winHi); n = winLo;
    fit(); livePreview();
  }
  sc.addEventListener('load', () => ready());
  scrub.addEventListener('input', () => { n = +scrub.value; draw(); });

  const cloneMotion = (L) => ({ ...L, motion: L.motion.map((k) => ({ ...k })) });
  function onLayers(r) {
    if (!r.ok) { rail.textContent = r.error; return; }
    eases = r.eases; layers = r.layers.map(cloneMotion);
    render();
    if (engine()) ready();
  }
  fetch('/api/layers').then((r) => r.json()).then(onLayers);
})();
