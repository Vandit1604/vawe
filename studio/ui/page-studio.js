// studio/ui/page-studio.js: the browser side of `make studio PAGE=`. A preview iframe seeked by the
// renderer's own seekTo (core/engine/page-seek.js), a timeline read from the page (page-model.js), and
// edits written back as text patches at the literals' source ranges (page-edit.js, /api/edit). After each
// edit the iframe reloads and seeks to the same time.
import { seekTo } from '/core/engine/page-seek.js';
import { SPRINGS, springLinear, springDuration } from '/core/motion/springs.js';
import { buildRows } from './page-model.js';
import { cssToHex, fmt, quoteLike, setVar, setText } from './page-edit.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const GUTTER = 176;
const EASINGS = [
  ['linear', 'linear'], ['ease', 'ease'], ['ease-in', 'ease-in'], ['ease-out', 'ease-out'], ['ease-in-out', 'ease-in-out'],
  ['expo out', 'cubic-bezier(0.16, 1, 0.3, 1)'], ['quart out', 'cubic-bezier(0.25, 1, 0.5, 1)'], ['quart in-out', 'cubic-bezier(0.76, 0, 0.24, 1)'],
];

const S = { data: null, rows: [], fps: 30, duration: 6, aspect: '16:9', t: 0, pps: 100, sel: null, units: {}, playing: false, win: null, dragging: false, busy: false };

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter((c) => c != null));
  return el;
}

function say(msg, bad = false) { const el = $('say'); el.textContent = msg; el.classList.toggle('bad', bad); }
const api = async (url, body) => {
  const r = await fetch(url, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);
  return r.json();
};

// ---- preview ---------------------------------------------------------------------------------------
function dims() { const [w, h2] = S.data.aspects[S.aspect] || [1920, 1080]; return { w, h: h2 }; }

function fit() {
  const { w, h: hh } = dims();
  const st = $('stage');
  const k = Math.min((st.clientWidth - 24) / w, (st.clientHeight - 24) / hh);
  const f = $('frame');
  f.style.width = `${w}px`; f.style.height = `${hh}px`;
  f.style.transform = `scale(${k})`;
  f.style.left = `${(st.clientWidth - w * k) / 2}px`; f.style.top = `${(st.clientHeight - hh * k) / 2}px`;
}

function mountFrame() {
  const sc = $('sc');
  return new Promise((resolve) => {
    sc.onload = async () => {
      S.win = sc.contentWindow;
      try { await S.win.document.fonts.ready; } catch { /* the page still seeks */ }
      await seek(S.t);
      rebuild();
      resolve();
    };
    fit();
    sc.src = `/${S.data.path}?aspect=${encodeURIComponent(S.aspect)}&r=${encodeURIComponent(S.data.rev)}`;
  });
}

let want = null;
async function seek(t) {
  S.t = clamp(t, 0, S.duration);
  paintPlayhead();
  want = S.t;
  if (S.busy || !S.win) return;
  S.busy = true;
  try {
    while (want != null) { const w = want; want = null; await seekTo(w, S.win); }
  } catch (e) { say(`seek failed: ${e.message}`, true); } finally { S.busy = false; }
}

const px = (t) => GUTTER + t * S.pps;
function paintPlayhead() {
  $('ph').style.left = `${px(S.t)}px`;
  $('read').textContent = `f ${Math.round(S.t * S.fps)} / ${Math.round(S.duration * S.fps)}   ${S.t.toFixed(3)}s / ${S.duration}s   ${S.fps}fps`;
}

// ---- timeline --------------------------------------------------------------------------------------
function rebuild() {
  S.rows = buildRows(S.win, S.data.model, { fps: S.fps, duration: S.duration, units: S.units });
  renderTimeline();
  renderInspector();
  renderVars();
  renderTexts();
}

function selected() {
  if (!S.sel) return null;
  const row = S.rows.find((r) => r.id === S.sel.row);
  return row ? { row, key: S.sel.key != null ? row.keys[S.sel.key] : null } : null;
}

function renderTimeline() {
  const width = px(S.duration) + 40;
  $('ruler').style.width = `${width}px`;
  const step = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30].find((s) => s * S.pps >= 70) || 60;
  $('ruler').replaceChildren(...Array.from({ length: Math.floor(S.duration / step) + 1 }, (_, i) => {
    const t = i * step;
    return h('i', { style: `left:${px(t)}px` }, `${fmt(t, 2)}s`);
  }));
  $('rows').replaceChildren(...S.rows.map((row) => {
    const sel = S.sel?.row === row.id;
    return h('div', { class: 'row', 'data-kind': row.kind, style: `width:${width}px`, title: row.source },
      h('span', { class: `name${sel ? ' sel' : ''}`, onclick: () => selectKey(row.id, null) }, row.label),
      row.span ? h('i', { class: 'bar', style: `left:${px(row.span[0])}px;width:${Math.max(2, (row.span[1] - row.span[0]) * S.pps)}px` }) : null,
      row.keys.map((k, i) => keyEl(row, k, i)));
  }));
  paintPlayhead();
}

function keyEl(row, key, i) {
  const el = h('b', { class: `key${key.move ? '' : ' locked'}${S.sel?.row === row.id && S.sel.key === i ? ' sel' : ''}`, style: `left:${px(key.t)}px`, title: key.label });
  el.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    selectKey(row.id, i, false);
    if (!key.move) return;
    el.setPointerCapture(ev.pointerId);
    S.dragging = true;
    const x0 = ev.clientX, t0 = key.t;
    let t = t0;
    el.onpointermove = (e) => {
      t = Math.max(0, t0 + (e.clientX - x0) / S.pps);
      el.style.left = `${px(t)}px`;
      $('say').textContent = `${row.label}: ${t.toFixed(3)}s (f ${Math.round(t * S.fps)})`;
    };
    el.onpointerup = () => {
      el.onpointermove = el.onpointerup = null;
      S.dragging = false;
      if (Math.abs(t - t0) * S.pps < 2) return;
      commit(key.move(t));
    };
  });
  return el;
}

function selectKey(rowId, key, redraw = true) {
  S.sel = { row: rowId, key };
  const s = selected();
  if (s?.key) seek(s.key.t);
  if (redraw) renderTimeline();
  document.querySelectorAll('.key.sel').forEach((k) => k.classList.remove('sel'));
  renderInspector();
  showTab('key');
}

// ---- write-back ------------------------------------------------------------------------------------
async function commit(edits) {
  if (!edits?.length) { say('the page computes this number, edit its source', true); return; }
  const res = await api('/api/edit', { edits });
  if (!res.ok) { say(res.error, true); return; }
  adopt(res);
  await mountFrame();
  say('saved');
}

function adopt(res) {
  S.data = res;
  S.fps = Number(res.model.meta.fps) || 30;
  S.duration = Number(res.model.meta.duration) || 6;
  $('undo').disabled = !res.undo;
}

async function undo() {
  const res = await api('/api/undo', {});
  if (!res.ok) { say(res.error, true); return; }
  adopt(res);
  await mountFrame();
  say('undone');
}

// ---- side panels -----------------------------------------------------------------------------------
function numField(label, value, onchange, step = 0.01) {
  const input = h('input', { type: 'number', step, value: fmt(value, 4) });
  input.addEventListener('change', () => onchange(parseFloat(input.value)));
  return h('label', { class: 'fld' }, h('span', {}, label), input);
}

function textField(label, value, onchange) {
  const input = h('input', { type: 'text', value });
  input.addEventListener('change', () => onchange(input.value));
  return h('label', { class: 'fld' }, h('span', {}, label), input);
}

function colorField(label, text, onchange, wrap = (s) => s) {
  const raw = text.replace(/^['"]|['"]$/g, '');
  const pick = h('input', { type: 'color', value: cssToHex(raw) });
  const box = h('input', { type: 'text', value: raw });
  pick.addEventListener('input', () => { box.value = pick.value; });
  pick.addEventListener('change', () => onchange(wrap(pick.value)));
  box.addEventListener('change', () => onchange(wrap(box.value)));
  return h('div', { class: 'fld' }, h('span', {}, label), h('div', { class: 'line' }, pick, box));
}

function easingField(timing, row) {
  const cur = String(timing.easing.value || 'linear').trim();
  const presets = [...EASINGS, ...Object.entries(SPRINGS).map(([n, { k, d }]) => [`spring ${n}`, springLinear(k, d), { k, d }])];
  const sel = h('select', {}, ...presets.map(([name, css]) => h('option', { value: css, selected: css === cur }, name)),
    presets.some(([, css]) => css === cur) ? null : h('option', { value: cur, selected: true }, 'custom'));
  sel.addEventListener('change', () => {
    const preset = presets.find(([, css]) => css === sel.value);
    const edits = timing.easing.set?.(sel.value);
    const dur = preset?.[2] ? timing.duration.set?.(springDuration(preset[2].k, preset[2].d)) : null;
    commit([...(edits || []), ...(dur || [])]);
  });
  return h('label', { class: 'fld' }, h('span', {}, 'easing'), sel);
}

function renderInspector() {
  const body = $('tab-key');
  const s = selected();
  if (!s) { body.replaceChildren(h('p', { class: 'note' }, 'Select a row or a key on the timeline. Drag a key to move it. Every edit is a text patch in the page file.')); return; }
  const { row, key } = s;
  const parts = [h('div', { class: 'kv' }, h('b', {}, row.label), h('span', {}, row.kind)), h('p', { class: 'note' }, row.source)];
  if (row.kind === 'table') {
    parts.push(h('button', { onclick: () => { S.units[row.id] = row.unit === 'frames' ? 'seconds' : 'frames'; rebuild(); } }, `keys are ${row.unit}, switch to ${row.unit === 'frames' ? 'seconds' : 'frames'}`));
  }
  if (row.timing) {
    parts.push(numField('duration (s)', row.timing.duration.value, (v) => commit(row.timing.duration.set?.(v))),
      numField('delay (s)', row.timing.delay.value, (v) => commit(row.timing.delay.set?.(v))),
      easingField(row.timing, row));
    if (!row.timing.duration.set) parts.push(h('p', { class: 'note' }, 'No literal found for this animation: edit its source.'));
  }
  if (key) {
    parts.push(h('div', { class: 'kv' }, h('span', {}, 'key'), h('b', {}, `f ${Math.round(key.t * S.fps)} · ${key.t.toFixed(3)}s`)));
    if (key.value) {
      const v = key.value;
      if (v.kind === 'number') parts.push(numField('value', v.num, (n) => commit(key.setValue(fmt(n)))));
      else if (v.kind === 'color') parts.push(colorField('value', v.text, (t) => commit(key.setValue(t)), (t) => quoteLike(v, t)));
      else parts.push(textField('value (source text)', v.text, (t) => commit(key.setValue(t))));
    }
    for (const d of key.decls || []) {
      parts.push(textField(d.name, d.text, (t) => commit([{ start: d.start, end: d.end, expect: d.text, text: t }])));
    }
  }
  body.replaceChildren(...parts);
}

function renderVars() {
  const vars = S.data.model.vars;
  $('tab-vars').replaceChildren(...(vars.length ? vars.map((v) => (v.color
    ? colorField(v.name, v.text, (t) => commit(setVar(v, t)))
    : textField(v.name, v.text, (t) => commit(setVar(v, t))))) : [h('p', { class: 'note' }, 'No :root custom properties in this page.')]));
}

function renderTexts() {
  const texts = S.data.model.texts;
  $('tab-text').replaceChildren(...(texts.length ? texts.map((t) => {
    const area = h('textarea', { rows: Math.min(4, t.text.split('\n').length + 1) }, t.text);
    area.addEventListener('change', () => commit(setText(t, area.value)));
    return h('label', { class: 'fld' }, h('span', {}, t.owner), area);
  }) : [h('p', { class: 'note' }, 'No text nodes found.')]));
}

function showTab(name) {
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === name)));
  document.querySelectorAll('.tabbody').forEach((el) => { el.hidden = el.id !== `tab-${name}`; });
}

// ---- transport -------------------------------------------------------------------------------------
function play() {
  S.playing = !S.playing;
  $('play').setAttribute('aria-label', S.playing ? 'pause' : 'play');
  if (!S.playing) return;
  let last = performance.now();
  const tick = async (now) => {
    if (!S.playing) return;
    const next = S.t + (now - last) / 1000;
    last = now;
    await seek(next >= S.duration ? 0 : next);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function scrub(ev) {
  const move = (e) => { const r = $('lanes').getBoundingClientRect(); seek((e.clientX - r.left + $('lanes').scrollLeft - GUTTER) / S.pps); };
  move(ev);
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function zoom(k) { S.pps = clamp(S.pps * k, 12, 2400); renderTimeline(); }
function fitZoom() { S.pps = Math.max(12, ($('lanes').clientWidth - GUTTER - 40) / S.duration); }

// ---- actions, job, chat ----------------------------------------------------------------------------
async function startJob(kind) {
  const res = await api('/api/job', { kind, aspect: S.aspect });
  showTab('job');
  if (!res.ok) say(res.error, true);
  pollJob();
}

let jobTimer = null;
async function pollJob() {
  clearTimeout(jobTimer);
  const { job } = await api('/api/job');
  if (!job) return;
  $('jobcmd').textContent = `${job.cmd}${job.running ? ' (running)' : ` (exit ${job.code})`}`;
  $('joblog').textContent = job.lines.join('\n');
  if (job.running) jobTimer = setTimeout(pollJob, 1000);
}

async function sendChat() {
  const input = $('chatinput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const log = $('chatlog');
  log.append(h('p', { class: 'me' }, text));
  const reply = h('p', {});
  log.append(reply);
  const s = selected();
  const prompt = `${text}\n\n(studio context: playhead at ${S.t.toFixed(3)}s, frame ${Math.round(S.t * S.fps)}${s ? `, selected row ${s.row.label}` : ''})`;
  $('chatstop').hidden = false;
  const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ prompt }) });
  if (!res.ok || !res.body) { reply.textContent = (await res.json()).error; $('chatstop').hidden = true; return; }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i); buf = buf.slice(i + 2);
      const ev = /^event: (.*)$/m.exec(block)?.[1];
      const data = JSON.parse(/^data: (.*)$/m.exec(block)?.[1] || '{}');
      if (ev === 'text') reply.textContent = data.text;
      if (ev === 'done' && data.error) reply.textContent += `\n${data.error === 'not-found' ? 'the claude CLI is not installed' : data.error}`;
      log.scrollTop = log.scrollHeight;
    }
  }
  $('chatstop').hidden = true;
}

// The agent (or an editor) may change the file behind the studio: adopt it when the revision moves.
async function watchFile() {
  if (!S.dragging && !S.busy) {
    try {
      const res = await api('/api/page');
      if (res.rev && res.rev !== S.data.rev) { adopt(res); await mountFrame(); say('page changed on disk, reloaded'); }
    } catch { /* the server is restarting */ }
  }
  setTimeout(watchFile, 1200);
}

// ---- boot ------------------------------------------------------------------------------------------
async function boot() {
  const res = await api('/api/page');
  if (res.error) { say(res.error, true); return; }
  S.aspect = res.aspect;
  adopt(res);
  fitZoom();
  $('aspects').replaceChildren(...Object.keys(res.aspects).map((a) => h('button', { 'aria-pressed': String(a === S.aspect), 'data-aspect': a, onclick: async () => {
    S.aspect = a;
    document.querySelectorAll('#aspects button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.aspect === a)));
    await mountFrame();
  } }, a)));
  document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $('play').onclick = play;
  $('prev').onclick = () => seek(S.t - 1 / S.fps);
  $('next').onclick = () => seek(S.t + 1 / S.fps);
  $('zin').onclick = () => zoom(1.4);
  $('zout').onclick = () => zoom(1 / 1.4);
  $('undo').onclick = undo;
  $('draft').onclick = () => startJob('draft');
  $('final').onclick = () => startJob('final');
  $('critique').onclick = () => startJob('critique');
  $('ruler').addEventListener('pointerdown', scrub);
  $('lanes').addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); } }, { passive: false });
  $('chatsend').onclick = sendChat;
  $('chatstop').onclick = () => api('/api/chat/stop', {});
  $('chatnew').onclick = async () => { $('chatlog').replaceChildren(); await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ prompt: '', reset: true }) }); };
  $('chatinput').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } });
  window.addEventListener('resize', fit);
  window.addEventListener('keydown', (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undo(); }
    else if (e.key === ' ') { e.preventDefault(); play(); }
    else if (e.key === 'ArrowLeft') seek(S.t - (e.shiftKey ? 1 : 1 / S.fps));
    else if (e.key === 'ArrowRight') seek(S.t + (e.shiftKey ? 1 : 1 / S.fps));
    else if (e.key === 'Home') seek(0);
    else if (e.key === 'End') seek(S.duration);
  });
  await mountFrame();
  watchFile();
}
boot();
