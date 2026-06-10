// studio/app.js — Shortwave Studio logic: load a format, edit content live, drive the preview,
// edit timeline pacing by dragging segment edges, hear audio (music + sfx), and a zoomable /
// resizable timeline with a separate audio lane. Plain script so init() runs on load and the DOM
// ids stay globally wired (the headless check drives these).

const $ = (id) => document.getElementById(id);
const frame = $('frame'), box = $('box');
let state = { format: null, data: {}, schema: null, meta: null };
let playing = false, rafId = 0, curFrame = 0, lastTs = 0, zoom = 1;

const setStatus = (msg, kind = '') => { const s = $('status'); s.textContent = msg; s.className = 'status ' + kind; };

async function init() {
  const formats = await (await fetch('/__formats')).json();
  $('fmt').innerHTML = formats.map((f) => `<option>${f}</option>`).join('');
  $('fmt').value = formats.includes('bracket') ? 'bracket' : formats[0];
  await loadFormat($('fmt').value);
}

async function loadFormat(f) {
  // fetch FIRST, commit to state only after — so an overlapping apply during the fetch gap never
  // pairs the new format with the old data (which crashes the scene build).
  const data = await (await fetch(`/formats/${f}/sample.json?_=${Date.now()}`)).json();
  let schema = null; try { schema = await (await fetch(`/formats/${f}/schema.json`)).json(); } catch {}
  state.format = f; state.data = data; state.schema = schema;
  $('orient').value = data.orientation === 'landscape' ? 'landscape' : 'portrait';
  syncOrient();
  buildQuick();
  syncJsonFromData();
  await apply();
}

// schema-driven controls for top-level string/number fields (the common ones to tweak)
function buildQuick() {
  const fields = state.schema?.fields || {};
  const rows = Object.entries(fields)
    .filter(([, def]) => def.type === 'string' || def.type === 'number')
    .map(([key, def]) => {
      const v = state.data[key] ?? '';
      const type = def.type === 'number' ? 'number' : 'text';
      return `<label class="f">${def.label || key}<input data-key="${key}" type="${type}" value="${String(v).replace(/"/g, '&quot;')}" /></label>`;
    });
  $('quick').innerHTML = rows.length ? rows.join('') : '<span class="hint">No top-level fields — edit JSON below.</span>';
  $('quick').querySelectorAll('input[data-key]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const def = fields[inp.dataset.key];
      state.data = { ...state.data, [inp.dataset.key]: def.type === 'number' ? Number(inp.value) : inp.value };
      syncJsonFromData();
      debouncedApply();
    });
  });
}

const syncJsonFromData = () => { $('json').value = JSON.stringify(state.data, null, 2); };

let dT;
const debouncedApply = () => { clearTimeout(dT); dT = setTimeout(apply, 450); };

// each apply gets a generation token; data travels IN the iframe url as a data: URL, so there is
// no shared server state for overlapping applies (rapid format/orient/edit) to race on.
let applyGen = 0;
async function apply() {
  const gen = ++applyGen;
  let data;
  try { data = JSON.parse($('json').value); }
  catch (e) { return setStatus('JSON error: ' + e.message, 'err'); }
  data.orientation = $('orient').value;            // orientation control wins
  state.data = data;
  const fps = Number($('fps').value) || 30;
  const dataUrl = 'data:application/json,' + encodeURIComponent(JSON.stringify(data));
  await new Promise((resolve) => {
    frame.onload = resolve;
    frame.src = `/formats/${state.format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=${fps}&_=${Date.now()}`;
  });
  if (gen !== applyGen) return;                    // superseded by a newer apply — drop this one
  await waitReady(fps, gen);
}

async function waitReady(fps, gen) {
  const win = frame.contentWindow;
  const t0 = performance.now();
  while (performance.now() - t0 < 30000) {
    if (gen !== applyGen) return;                  // a newer apply took over
    if (win.__engineError) return setStatus('Scene error: ' + win.__engineError.split('\n')[0], 'err');
    if (win.__engineReady) break;
    await new Promise((r) => setTimeout(r, 30));
  }
  if (gen !== applyGen) return;
  if (!win.__engine) return setStatus('Scene did not become ready', 'err');
  state.meta = win.__engine.meta;
  sizePreview();
  buildTimeline();
  buildPacing();
  buildAudioPanel();
  loadAudio();                                     // fire-and-forget: ready before the user hits play
  curFrame = Math.min(curFrame, Math.max(0, state.meta.totalFrames - 1));
  draw(curFrame);
  requestAnimationFrame(() => { sizePreview(); draw(curFrame); });
  setStatus(`✓ ${state.format} · ${state.meta.width}×${state.meta.height} · ${state.meta.duration.toFixed(1)}s · ${state.meta.totalFrames} frames`, 'ok');
}

function sizePreview() {
  const { width: W, height: H } = state.meta;
  const wrap = document.querySelector('.stage-wrap').getBoundingClientRect();
  const scale = Math.min((wrap.width - 40) / W, (wrap.height - 40) / H);
  frame.style.width = W + 'px'; frame.style.height = H + 'px';
  frame.style.transform = `scale(${scale})`;
  box.style.width = W * scale + 'px'; box.style.height = H * scale + 'px';
}

function positionHead() {
  const fps = state.meta?.fps || 30, D = state.meta?.duration || 1, h = $('tlHead');
  if (h) h.style.left = ((curFrame / fps) / D * 100).toFixed(3) + '%';
}
function draw(n) {
  const win = frame.contentWindow;
  if (!win || !win.__engine) return;
  win.__engine.renderFrame(n);
  $('time').textContent = `${(n / (state.meta.fps || 30)).toFixed(1)}s · f${n}`;
  positionHead();
  if (playing) autoScrollHead();
}

// ---- timeline: ruler + segment blocks (resizable) + audio lane + playhead, scaled by zoom ----
const SEG_COLOR = { hook:'#f5c451', roundcard:'#7c8aff', match:'#4ad295', bracket:'#ff8f5e', cta:'#ff6b81' };
const fmtDur = (s) => (s >= 10 ? s.toFixed(0) : s.toFixed(1)) + 's';
const niceStep = (D) => [1, 2, 5, 10, 15, 30, 60].find((t) => t >= D / 8) || 60;
const baseName = (p) => String(p || '').split('/').pop();

function buildTimeline() {
  const { duration, segments = [], sfx = [], stings = [] } = state.meta;
  const D = duration || 1, pct = (t) => (t / D) * 100;
  $('tlInner').style.width = (zoom * 100) + '%';
  // ruler ticks + second labels
  const step = niceStep(D);
  let ruler = '';
  for (let s = 0; s <= D + 1e-6; s += step) ruler += `<div class="tl-tick" style="left:${pct(s)}%"><i></i><b>${(+s.toFixed(1))}s</b></div>`;
  $('ruler').innerHTML = ruler;
  // segment blocks
  let html = '';
  segments.forEach((s, idx) => {
    const c = SEG_COLOR[s.type] || '#8a90a0', lbl = s.label || s.type, dur = s.t1 - s.t0;
    const editable = isEditable(s), wide = pct(dur) > 7;
    html += `<div class="tl-seg${editable ? ' edit' : ''}" data-i="${idx}" data-t0="${s.t0}" style="left:${pct(s.t0)}%;width:${pct(dur)}%;--seg:${c}"`
      + ` title="${lbl} · ${s.t0.toFixed(1)}–${s.t1.toFixed(1)}s${editable ? ' · drag the right edge to retime' : ''}">`
      + `<span class="tl-lbl">${lbl}</span>${wide ? `<span class="tl-dur">${fmtDur(dur)}</span>` : ''}`
      + (editable ? '<i class="tl-grip" title="drag to retime"></i>' : '') + '</div>';
  });
  $('track').innerHTML = html;
  $('track').querySelectorAll('.tl-seg.edit').forEach(wireGrip);
  // audio lane: music bar + sfx/sting cue markers (separate from the segment track)
  const a = state.data.audio || {};
  let au = '';
  if (a.music) au += `<div class="tl-music" style="left:0;width:100%" title="${a.music}">♪ ${baseName(a.music)}</div>`;
  for (const c of sfx) au += `<div class="tl-cue" style="left:${pct(c.t)}%" title="${c.name}"><i></i></div>`;
  for (const t of stings) au += `<div class="tl-cue sting" style="left:${pct(t)}%" title="sting"><i></i><b>sting</b></div>`;
  const empty = !a.music && !sfx.length && !stings.length;
  $('audio').innerHTML = empty ? '<div class="tl-empty">no audio</div>' : au;
  $('audio').classList.toggle('empty', empty);
}

function seekTime(t) {
  if (!state.meta) return;
  if (playing) togglePlay();
  const fps = state.meta.fps || 30, max = Math.max(0, state.meta.totalFrames - 1);
  curFrame = Math.max(0, Math.min(max, Math.round(t * fps)));
  audioSeek(curFrame / fps);
  draw(curFrame);
}
function seekAtClientX(clientX) {
  const r = $('tlInner').getBoundingClientRect();
  const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  seekTime(f * (state.meta?.duration || 0));
}

// ---- editable pacing: each editable segment's width IS its pacing value (bracket reads data.pacing.*) ----
const PACE_MIN = { hook: 0.4, roundcard: 0.4, bracket: 0.4, cta: 0.4, match: 4.0 };
const PACE_MAX = { hook: 15, roundcard: 15, bracket: 15, cta: 15, match: 20 };
const PACE_SCALAR = { hook: 'hook', roundcard: 'roundCard', bracket: 'bracket', cta: 'cta' };
const isEditable = (s) => s.type === 'match' || s.type in PACE_SCALAR;
const paceNote = (type) => (type === 'roundcard' || type === 'bracket') ? ' · all rounds' : '';
const clampDur = (type, v) => Math.round(Math.max(PACE_MIN[type] || 0.4, Math.min(PACE_MAX[type] || 15, v)) * 10) / 10;

function setPace(data, seg, dur) {
  const pacing = { ...(data.pacing || {}) };
  if (seg.type === 'match') {
    const m = Array.isArray(pacing.match) ? pacing.match.slice() : [];
    m[seg.r] = dur; pacing.match = m;
  } else { pacing[PACE_SCALAR[seg.type]] = dur; }
  return { ...data, pacing };
}

function wireGrip(el) {
  const grip = el.querySelector('.tl-grip');
  grip.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); e.preventDefault();
    if (playing) togglePlay();
    const seg = state.meta.segments[+el.dataset.i];
    const pxPerSec = $('track').getBoundingClientRect().width / (state.meta.duration || 1);
    const base = seg.t1 - seg.t0, startX = e.clientX;
    grip.setPointerCapture(e.pointerId);
    const durAt = (ev) => clampDur(seg.type, base + (ev.clientX - startX) / pxPerSec);
    const onMove = (ev) => previewResize(+el.dataset.i, durAt(ev), ev.clientX, seg);
    const onUp = (ev) => {
      grip.releasePointerCapture(e.pointerId);
      grip.removeEventListener('pointermove', onMove);
      grip.removeEventListener('pointerup', onUp);
      $('tlReadout').classList.remove('on');
      commitResize(seg, durAt(ev));
    };
    grip.addEventListener('pointermove', onMove);
    grip.addEventListener('pointerup', onUp);
  });
}

// live (cheap) relayout during drag: seg i takes the new width, everything after shifts by the
// delta. no scene rebuild — apply() does the authoritative re-render on release.
function previewResize(i, dur, clientX, seg) {
  const segs = state.meta.segments, base = segs[i].t1 - segs[i].t0, delta = dur - base;
  const newD = (state.meta.duration || 1) + delta, pct = (t) => (t / newD) * 100;
  const els = $('track').querySelectorAll('.tl-seg');
  segs.forEach((s, k) => {
    const el = els[k]; if (!el) return;
    const shift = k > i ? delta : 0;
    const t0 = s.t0 + shift, t1 = (k === i ? s.t0 + dur : s.t1 + shift);
    el.style.left = pct(t0) + '%'; el.style.width = pct(t1 - t0) + '%';
  });
  const r = $('tlReadout');
  r.textContent = `${seg.label || seg.type}: ${base.toFixed(1)} → ${dur.toFixed(1)}s${paceNote(seg.type)}`;
  r.style.left = clientX + 'px'; r.classList.add('on');
}

function commitResize(seg, dur) {
  state.data = setPace(state.data, seg, dur);
  syncJsonFromData();
  apply();
}

// ---- pacing inspector: one stepper per editable pacing key (bracket only) ----
function buildPacing() {
  const segs = state.meta?.segments || [];
  const editable = segs.filter(isEditable);
  $('pacingSec').style.display = editable.length ? '' : 'none';
  if (!editable.length) { $('pacing').innerHTML = ''; return; }
  const seen = new Set(), rows = [];
  const LABEL = { hook: 'Hook', roundcard: 'Round card', bracket: 'Bracket', cta: 'CTA' };
  segs.forEach((s, idx) => {
    if (!isEditable(s)) return;
    const key = s.type === 'match' ? `m${s.r}` : s.type;
    if (seen.has(key)) return; seen.add(key);
    const lbl = s.type === 'match' ? `Match · round ${s.r + 1}` : LABEL[s.type];
    rows.push(`<label class="pace"><span>${lbl}${paceNote(s.type)}</span>`
      + `<input type="number" step="0.1" min="${PACE_MIN[s.type]}" data-i="${idx}" value="${(s.t1 - s.t0).toFixed(1)}"></label>`);
  });
  $('pacing').innerHTML = rows.join('');
  $('pacing').querySelectorAll('input[data-i]').forEach((inp) => inp.addEventListener('change', () => {
    const seg = state.meta.segments[+inp.dataset.i];
    commitResize(seg, clampDur(seg.type, Number(inp.value)));
  }));
}

// ---- audio inspector: music file + gain + sfx count ----
function buildAudioPanel() {
  const a = state.data.audio || {}, sfxN = (state.meta?.sfx || []).length;
  if (!a.music && !sfxN) { $('audioSec').style.display = 'none'; $('audioPanel').innerHTML = ''; return; }
  $('audioSec').style.display = '';
  const gain = a.musicGain ?? 0.6;
  $('audioPanel').innerHTML =
    `<div class="arow"><span>Music</span><b>${a.music ? baseName(a.music) : '—'}</b></div>`
    + `<div class="arow"><span>Gain</span><input type="range" id="aGain" min="0" max="1" step="0.05" value="${gain}"><b id="aGainV">${gain.toFixed(2)}</b></div>`
    + `<div class="arow"><span>SFX cues</span><b>${sfxN}</b></div>`
    + `<div class="anote">▶ Play to hear music + sfx — the engine renders the final mix.</div>`;
  const g = $('aGain');
  if (g) g.addEventListener('input', () => {
    const v = Number(g.value); $('aGainV').textContent = v.toFixed(2);
    state.data = { ...state.data, audio: { ...(state.data.audio || {}), musicGain: v } };
    if (musicEl) musicEl.volume = v; syncJsonFromData();
  });
}

// ---- audio preview: music (HTMLAudio) + sfx cues (Web Audio), synced to the playhead ----
let audioCtx = null, sfxBuf = {}, musicEl = null, muted = false, lastAudioT = 0;
const SFX_GAIN = { tick: 0.45, whoosh: 0.45, reveal: 0.82, correct: 0.7, wrong: 0.6, beep: 0.5, beep3: 0.58 };
const resolveAsset = (p) => !p ? '' : p[0] === '/' ? p : p.startsWith('assets/') ? '/engine/' + p : '/' + p.replace(/^\/+/, '');

async function loadAudio() {
  const a = state.data.audio || {};
  if (!musicEl) { musicEl = new Audio(); musicEl.loop = true; }
  const src = resolveAsset(a.music);
  if (src) { if (musicEl.dataset.src !== src) { musicEl.src = src; musicEl.dataset.src = src; } musicEl.volume = a.musicGain ?? 0.6; }
  else { musicEl.pause(); musicEl.removeAttribute('src'); musicEl.dataset.src = ''; }
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const names = [...new Set((state.meta?.sfx || []).map((c) => c.name))];
    await Promise.all(names.map(async (n) => {
      if (sfxBuf[n]) return;
      const r = await fetch(`/engine/assets/sfx/${n}.wav`); if (!r.ok) return;
      sfxBuf[n] = await audioCtx.decodeAudioData(await r.arrayBuffer());
    }));
  } catch (e) { /* audio is best-effort in preview */ }
}
function playSfx(name) {
  const b = sfxBuf[name]; if (!b || !audioCtx || muted) return;
  const s = audioCtx.createBufferSource(), g = audioCtx.createGain();
  g.gain.value = SFX_GAIN[name] ?? 0.6; s.buffer = b; s.connect(g).connect(audioCtx.destination); s.start();
}
function fireSfx(prevT, t) {
  if (muted) return;
  for (const c of (state.meta?.sfx || [])) if (c.t > prevT && c.t <= t) playSfx(c.name);
}
function audioSeek(t) {
  if (musicEl?.dataset.src) { try { musicEl.currentTime = t % (musicEl.duration || 1e9) || 0; } catch {} }
  lastAudioT = t;
}
function audioPlay() {
  if (muted) return;
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  if (musicEl?.dataset.src) musicEl.play().catch(() => {});
}
function audioStop() { if (musicEl) musicEl.pause(); }

// ---- zoom + scroll ----
const ZMIN = 1, ZMAX = 24;
function setZoom(z, anchorClientX) {
  const scroll = $('tlScroll'), inner = $('tlInner'), old = zoom;
  zoom = Math.max(ZMIN, Math.min(ZMAX, z));
  const rect = scroll.getBoundingClientRect();
  const ax = anchorClientX != null ? anchorClientX - rect.left : rect.width / 2;
  const contentX = scroll.scrollLeft + ax;
  inner.style.width = (zoom * 100) + '%';
  scroll.scrollLeft = contentX * (zoom / old) - ax;
  positionHead();
}
function autoScrollHead() {
  const scroll = $('tlScroll'), fps = state.meta.fps || 30, D = state.meta.duration || 1;
  const x = (curFrame / fps) / D * $('tlInner').offsetWidth, m = 48;
  if (x < scroll.scrollLeft + m) scroll.scrollLeft = x - m;
  else if (x > scroll.scrollLeft + scroll.clientWidth - m) scroll.scrollLeft = x - scroll.clientWidth + m;
}

// ---- transport ----
function togglePlay() {
  playing = !playing;
  $('play').textContent = playing ? '⏸' : '▶';
  if (playing) { lastTs = performance.now(); lastAudioT = curFrame / (state.meta?.fps || 30); audioPlay(); rafId = requestAnimationFrame(tick); }
  else { cancelAnimationFrame(rafId); audioStop(); }
}
function tick(ts) {
  if (!playing || !state.meta) return;
  const fps = state.meta.fps || 30, max = state.meta.totalFrames - 1;
  curFrame += ((ts - lastTs) / 1000) * fps; lastTs = ts;
  const prevT = lastAudioT, t = Math.min(curFrame, max) / fps;
  if (curFrame >= max) { fireSfx(prevT, max / fps); curFrame = 0; audioSeek(0); }       // loop
  else { fireSfx(prevT, t); lastAudioT = t; }
  draw(Math.floor(curFrame));
  rafId = requestAnimationFrame(tick);
}

function jumpBoundary(dir) {
  const fps = state.meta.fps || 30, t = curFrame / fps;
  const bounds = [0, ...(state.meta.segments || []).map((s) => s.t1)];
  const target = dir > 0 ? bounds.find((b) => b > t + 1e-3) : [...bounds].reverse().find((b) => b < t - 1e-3);
  if (target != null) seekTime(target);
}
document.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || !state.meta) return;
  const fps = state.meta.fps || 30, max = state.meta.totalFrames - 1;
  const seekF = (n) => { if (playing) togglePlay(); curFrame = Math.max(0, Math.min(max, n)); audioSeek(curFrame / fps); draw(curFrame); };
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); seekF(Math.round(curFrame) + (e.shiftKey ? fps : 1)); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); seekF(Math.round(curFrame) - (e.shiftKey ? fps : 1)); }
  else if (e.key === '[') { e.preventDefault(); jumpBoundary(-1); }
  else if (e.key === ']') { e.preventDefault(); jumpBoundary(1); }
  else if (e.key === 'Home') { e.preventDefault(); seekF(0); }
  else if (e.key === 'End') { e.preventDefault(); seekF(max); }
});

// orientation: a segmented control that mirrors the hidden <select id="orient"> (kept so the
// headless check can still drive it via page.select).
const orientSel = $('orient'), orientSeg = $('orientSeg');
function syncOrient() { orientSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === orientSel.value)); }
orientSeg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { orientSel.value = b.dataset.v; orientSel.dispatchEvent(new Event('change')); }));
orientSel.addEventListener('change', () => { syncOrient(); apply(); });

// collapsible inspector sections
$('inspector').querySelectorAll('.sec-head').forEach((h) => h.addEventListener('click', () => h.parentElement.classList.toggle('collapsed')));

// scrub anywhere on the timeline; a clean click snaps to the segment start (jump-to-segment)
(() => {
  const inner = $('tlInner');
  let dragging = false, moved = false, downX = 0;
  inner.addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('tl-grip')) return; // a grip starts a resize, not a scrub
    dragging = true; moved = false; downX = e.clientX;
    inner.setPointerCapture(e.pointerId); seekAtClientX(e.clientX);
  });
  inner.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - downX) > 3) moved = true;
    seekAtClientX(e.clientX);
  });
  inner.addEventListener('pointerup', (e) => {
    if (dragging && !moved && state.meta) {
      const r = inner.getBoundingClientRect();
      const tt = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (state.meta.duration || 0);
      const s = (state.meta.segments || []).find((s) => tt >= s.t0 && tt < s.t1);
      if (s) seekTime(s.t0);
    }
    dragging = false;
  });
})();

// zoom: ctrl/cmd + wheel over the timeline, and the +/fit/- buttons
$('tlScroll').addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.12 : 0.89), e.clientX); } }, { passive: false });
$('zoomIn').addEventListener('click', () => setZoom(zoom * 1.4));
$('zoomOut').addEventListener('click', () => setZoom(zoom / 1.4));
$('zoomFit').addEventListener('click', () => setZoom(1));

// resize: drag the top edge of the transport to change the timeline lane height
(() => {
  const h = $('tlResize');
  h.addEventListener('pointerdown', (e) => {
    h.setPointerCapture(e.pointerId); h.classList.add('drag');
    const y0 = e.clientY, base = document.querySelector('.timeline').offsetHeight;
    const onMove = (ev) => {
      const nh = Math.max(72, Math.min(360, base - (ev.clientY - y0)));
      document.documentElement.style.setProperty('--tl-h', nh + 'px');
      if (state.meta) sizePreview();
    };
    const onUp = () => { h.classList.remove('drag'); h.releasePointerCapture(e.pointerId); document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
  });
})();

// mute
$('mute').addEventListener('click', () => {
  muted = !muted;
  $('mute').innerHTML = muted ? '🔇' : '🔊';
  $('mute').classList.toggle('off', muted);
  if (muted) audioStop(); else if (playing) audioPlay();
});

$('fmt').addEventListener('change', (e) => loadFormat(e.target.value));
$('fps').addEventListener('change', apply);
$('apply').addEventListener('click', apply);
$('play').addEventListener('click', togglePlay);
$('json').addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); apply(); } });
window.addEventListener('resize', () => state.meta && sizePreview());

$('save').addEventListener('click', async () => {
  const name = prompt('Save as formats/' + state.format + '/<name>.json', 'my-video');
  if (!name) return;
  let data; try { data = JSON.parse($('json').value); } catch (e) { return setStatus('JSON error: ' + e.message, 'err'); }
  const r = await (await fetch('/__save', { method: 'POST', body: JSON.stringify({ path: `formats/${state.format}/${name.replace(/\.json$/, '')}.json`, data }) })).json();
  setStatus(r.ok ? `✓ saved — render with:  ${r.cmd}` : 'Save failed: ' + r.error, r.ok ? 'ok' : 'err');
});

init();
