// harness/author/tune.js: the browser half of `make tune`. Fetches /api/layers, builds one control
// per motion-key property and per vars channel, and on every input mutates window.__engine.data (the
// SAME object renderFrame(n) reads each call, core/engine/boot.js:wireEngine) then reseeks the current
// frame. No server round trip for a live tweak; the server is only asked to diff/write on demand.
//
// Native controls do the keyboard work for free: a focused <input type=number> already steps on
// Up/Down, and a focused <input type=range> already steps on every arrow key, so there is no custom
// keyboard handler here at all.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const sc = $('#sc'), scrub = $('#scrub'), read = $('#read'), rail = $('#layers');
  let fps = 30, total = 0, n = 0, winLo = 0, winHi = 0;
  let eases = [], layers = [];

  const NUM_PROPS = ['x', 'y', 'scale', 'rot', 'opacity', 'blur', 'w', 'h', 'radius'];
  const STEP = { scale: 0.01, opacity: 0.01, blur: 0.5, rot: 1, x: 1, y: 1, w: 1, h: 1, radius: 1, t: 0.01 };

  function engine() { const w = sc.contentWindow; return w && w.__engineReady && w.__engine ? w.__engine : null; }

  // scale the iframe to fit the stage, same technique as studio/ui/studio.js:fit()
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

  // push every tuned layer's CURRENT (edited) motion/vars into the live engine data and reseek.
  function livePreview() {
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

  function keyBlock(L, k, i) {
    const div = document.createElement('div'); div.className = 'key';
    div.append(row('t', numInput(k.t ?? 0, STEP.t, (v) => { k.t = v ?? 0; })));
    div.append(row('ease', easeSelect(k.ease, (v) => { if (v) k.ease = v; else delete k.ease; })));
    // only the properties THIS layer's track actually uses anywhere, so a text layer doesn't get an
    // empty row for `radius` just because the schema allows it.
    const used = new Set(L.motion.flatMap((kk) => NUM_PROPS.filter((p) => kk[p] !== undefined)));
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
