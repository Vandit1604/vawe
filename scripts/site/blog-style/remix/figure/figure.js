// figure.html?spec=<slug>/<name>: one blog figure, 680 CSS px wide, drawn from specs/<slug>/<name>.json.
// A spec is { title, note?, parts: [part, ...] }; each part has a kind:
//   number   { items: [{ value, label, sub?, tag? }] }
//   bars     { rows: [{ label, value, text, mark? } | { heading }], max? }
//   ranges   { min, max, rows: [{ label, lo, hi, loText, hiText, mid?, midText? }] }
//   split    { label?, parts: [{ label, value, text, mark? }] }
//   flow     { dir: 'row' | 'col', steps: [{ name, note?, tag?, mark? }], links?: [text], back? }
//   timeline { events: [{ at, name, note?, pos?, mark? }], spans?: [{ from, to, text }] }
//   compare  { panels: [{ title, tag?, lines: [text], foot?, mark? }] }
//   stack    { layers: [{ name, note?, tag?, mark? }] }
//   list     { items: [{ name, note?, mark? }], plain? }
//   table    { cols: [text], rows: [[text]], num?: [col index], marks?: { rowIndex: 'hi' | 'lo' } }
//   code     { lines: [{ code, note? }] }
//   plot     { x: { label?, min, max, ticks?: [v | [v, text]] }, y: { label, min, max, ticks? }, series: [{ name, points? | bezier? }], marks?: [{ x, y, text }] }
//   text     { text }
// mark is 'hi' (the one accent, for the key value) or 'lo' (muted). Every string is shown as written.

const q = new URLSearchParams(location.search);
const specPath = q.get('spec');

const UNIT = /(\d)[ \u00a0](s|ms|min|px|%|dB|MB|KB|GB|fps|x)(?=$|[\s.,;:!?)\]/])/g;
const DATE = /\b\d{4}-\d{2}(?:-\d{2})?\b/g;
// A hyphen between two numbers is a range (en dash); a date or a hyphen before a letter stays a hyphen.
function typeset(text) {
  const dates = [];
  const masked = text.replace(DATE, (d) => `\u0000${dates.push(d) - 1}\u0000`);
  return masked
    .replace(/(^|[^\w.-])(\d[\d.,]*)-(\d[\d.,]*)(?![\w-])/g, '$1$2\u2013$3')
    .replace(UNIT, '$1\u00a0$2')
    .replace(/\u0000(\d+)\u0000/g, (_, i) => dates[i]);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) {
    e.style.whiteSpace = 'pre-line';
    if (tag === 'code') { e.textContent = String(text); return e; }
    // Plus Jakarta Sans draws its hyphen nearly as wide as an en dash; a compound hyphen gets a narrower glyph box.
    typeset(String(text)).split(/(?<=\w)-(?=\w)/).forEach((part, i) => {
      if (i) e.appendChild(Object.assign(document.createElement('span'), { className: 'hy', textContent: '-' }));
      e.appendChild(document.createTextNode(part));
    });
  }
  return e;
}
const add = (parent, ...kids) => { kids.filter(Boolean).forEach((k) => parent.appendChild(k)); return parent; };
const marked = (cls, mark) => (mark ? `${cls} ${mark}` : cls);

const KINDS = {
  number(p) {
    const box = el('div', p.items.length === 1 ? 'numbers one' : 'numbers');
    for (const it of p.items) add(box, add(el('div', marked('glass', it.mark)), it.tag && el('div', 'tag', it.tag), el('div', 'big', it.value), el('div', 'name', it.label), it.sub && el('div', 'sub', it.sub)));
    return box;
  },
  bars(p) {
    const max = p.max ?? Math.max(...p.rows.filter((r) => !r.heading).map((r) => r.value));
    const box = el('div', 'glass bars');
    for (const r of p.rows) {
      if (r.heading) { box.appendChild(el('div', 'tag', r.heading)); continue; }
      const fill = el('div', 'fill');
      fill.style.width = `${Math.max(0.6, (100 * r.value) / max)}%`;
      add(box, add(el('div', r.mark || ''), add(el('div', 'bar-head'), el('div', 'name', r.label), el('div', 'val', r.text)), add(el('div', 'track'), fill)));
    }
    return box;
  },
  ranges(p) {
    const at = (v) => `${(100 * (v - p.min)) / (p.max - p.min)}%`;
    const box = el('div', 'glass bars');
    for (const r of p.rows) {
      const fill = el('div', 'fill range');
      fill.style.left = at(r.lo);
      fill.style.width = `calc(${at(r.hi)} - ${at(r.lo)})`;
      const track = add(el('div', 'track'), fill);
      if (r.mid !== undefined) { const t = el('div', 'tick'); t.style.left = at(r.mid); track.appendChild(t); }
      add(box, add(el('div'), add(el('div', 'bar-head'), el('div', 'name', r.label), r.midText && el('div', 'val', r.midText)), track,
        add(el('div', 'ends mono'), el('span', '', r.loText), el('span', '', r.hiText))));
    }
    return box;
  },
  split(p) {
    const total = p.parts.reduce((a, b) => a + b.value, 0);
    const bar = el('div', 'split'), legend = el('div', 'legend');
    for (const s of p.parts) {
      const i = el('i', s.mark || '');
      i.style.flex = `${s.value / total} 1 0`;
      bar.appendChild(i);
      add(legend, add(el('div', s.mark || ''), el('b'), el('span', 'name', s.label), el('span', 'val', s.text)));
    }
    return add(el('div', 'glass bars'), p.label && el('div', 'tag', p.label), bar, legend);
  },
  flow(p) {
    const dir = p.dir || 'row';
    const box = el('div', `flow ${dir}`);
    p.steps.forEach((s, i) => {
      if (i) {
        const text = p.links?.[i - 1];
        add(box, add(el('div', text && dir === 'row' ? 'link wide' : 'link'), el('span', 'arrow', dir === 'row' ? '→' : '↓'), text && el('span', '', text)));
      }
      add(box, add(el('div', marked('glass step', s.mark)), s.tag && el('div', 'tag', s.tag), el('div', 'name', s.name), s.note && el('div', 'sub', s.note)));
    });
    if (!p.back) return box;
    return add(el('div'), box, add(el('div', 'glass back mono'), el('span', 'arrow', '↺'), el('span', '', p.back)));
  },
  timeline(p) {
    const n = p.events.length;
    if (n > 4 && !p.horizontal) {
      const list = el('div', 'tl-v');
      for (const e of p.events) add(list, add(el('div', e.mark || ''), el('div', 'when mono', e.at), el('div', 'pip'), add(el('div'), el('div', 'name', e.name), e.note && el('div', 'sub', e.note))));
      return add(el('div', 'glass tl'), list);
    }
    const pos = p.events.map((e, i) => e.pos ?? (n === 1 ? 0.5 : i / (n - 1)));
    const axis = el('div', 'tl-axis'), row = el('div', 'tl-row');
    p.events.forEach((e, i) => {
      const dot = el('div', marked('tl-dot', e.mark));
      dot.style.left = `${pos[i] * 100}%`;
      axis.appendChild(dot);
      const ev = add(el('div', marked('tl-ev', e.mark)), el('div', 'mono when', e.at), el('div', 'name', e.name), e.note && el('div', 'sub', e.note));
      row.appendChild(ev);
    });
    for (const s of p.spans || []) {
      const span = el('div', 'tl-span mono', s.text);
      span.style.left = `${pos[s.from] * 100}%`;
      span.style.width = `${(pos[s.to] - pos[s.from]) * 100}%`;
      axis.appendChild(span);
    }
    return add(el('div', 'glass tl'), axis, row);
  },
  compare(p) {
    const box = el('div', 'panels');
    for (const c of p.panels) {
      const ul = el('ul');
      (c.lines || []).forEach((l) => ul.appendChild(el('li', '', l)));
      add(box, add(el('div', marked('glass panel', c.mark)), c.tag && el('div', 'tag', c.tag), el('div', 'name', c.title), ul, c.foot && el('div', 'foot', c.foot)));
    }
    return box;
  },
  stack(p) {
    const box = el('div', 'stack');
    for (const l of p.layers) add(box, add(el('div', marked('glass layer', l.mark)), el('div', 'name', l.name), l.tag ? el('div', 'tag', l.tag) : el('div'), l.note && el('div', 'sub', l.note)));
    return box;
  },
  list(p) {
    const box = el('div', p.plain || p.items.length === 1 ? 'list plain' : 'list');
    for (const it of p.items) add(box, add(el('div', marked('glass item', it.mark)), el('div', 'name', it.name), it.note && el('div', 'sub', it.note)));
    return box;
  },
  table(p) {
    const num = new Set(p.num || []);
    const table = el('table'), head = el('tr');
    p.cols.forEach((c, i) => head.appendChild(el('th', num.has(i) ? 'num' : '', c)));
    if (p.cols.some((c) => c)) add(table, add(el('thead'), head));
    const body = el('tbody');
    p.rows.forEach((r, j) => {
      const tr = el('tr', p.marks?.[j] || '');
      r.forEach((c, i) => tr.appendChild(el('td', num.has(i) ? 'num' : '', c)));
      body.appendChild(tr);
    });
    return add(el('div', 'glass table'), add(table, body));
  },
  code(p) {
    const box = el('div', 'glass code');
    add(box, add(el('div', 'bar'), el('i'), el('i'), el('i')));
    const notes = p.lines.some((l) => l.note);
    for (const l of p.lines) add(box, add(el('div', notes ? 'code-line' : 'code-line solo'), el('code', '', l.code), notes && el('div', 'sub mono', l.note || '')));
    return box;
  },
  text(p) {
    return el('div', p.text.length <= 60 && !p.text.includes('\n') ? 'note short' : 'note', p.text);
  },
  plot(p) {
    const W = 600, H = 300, L = 62, R = 16, T = 14, B = 52;
    const sx = (v) => L + ((v - p.x.min) / (p.x.max - p.x.min)) * (W - L - R);
    const sy = (v) => H - B - ((v - p.y.min) / (p.y.max - p.y.min)) * (H - T - B);
    const colours = [0, 1, 2, 0, 1, 2].map((i) => `var(--s${i})`);
    const dashes = ['', '', '', '8 6', '8 6', '8 6'];
    const ticks = (a) => a.ticks || [a.min, a.max];
    let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    const tick = (t) => (Array.isArray(t) ? t : [t, t]);
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    for (const [v, t] of ticks(p.y).map(tick)) s += `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" stroke="rgba(255,255,255,.16)"/><text x="${L - 10}" y="${sy(v) + 5}" text-anchor="end">${esc(t)}</text>`;
    for (const [v, t] of ticks(p.x).map(tick)) s += `<text x="${sx(v)}" y="${H - B + 24}" text-anchor="${v === p.x.min ? 'start' : v === p.x.max ? 'end' : 'middle'}">${esc(t)}</text>`;
    s += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="rgba(255,255,255,.5)"/>`;
    if (p.x.label) s += `<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle"></text>`;
    p.series.forEach((ser, k) => {
      const pts = ser.points || bezierPoints(ser.bezier);
      s += `<polyline fill="none" style="stroke: ${colours[k % 6]}" stroke-width="3" stroke-dasharray="${dashes[k % 6]}" stroke-linejoin="round" points="${pts.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')}"/>`;
    });
    for (const m of p.marks || []) s += `<circle cx="${sx(m.x)}" cy="${sy(m.y)}" r="5" fill="#fff"/><text x="${sx(m.x) + 10}" y="${sy(m.y) - 10}"></text>`;
    s += '</svg>';
    const wrap = el('div', 'glass plot');
    wrap.innerHTML = s;
    const texts = wrap.querySelectorAll('text:empty');
    let ti = 0;
    if (p.x.label) texts[ti++].textContent = p.x.label;
    for (const m of p.marks || []) texts[ti++].textContent = m.text;
    if (p.y.label) wrap.prepend(el('div', 'mono', p.y.label));
    if (p.series.length > 1 || p.series[0].name) {
      const keys = el('div', 'keys');
      p.series.forEach((ser, k) => {
        const b = el('b');
        b.style.background = colours[k % 6];
        if (dashes[k % 6]) b.style.background = `repeating-linear-gradient(90deg, ${colours[k % 6]} 0 6px, transparent 6px 10px)`;
        add(keys, add(el('span', 'mono'), b, el('span', '', ser.name)));
      });
      wrap.appendChild(keys);
    }
    return wrap;
  },
};

function bezierPoints([x1, y1, x2, y2]) {
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, u = 1 - t;
    pts.push([3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3, 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3]);
  }
  return pts;
}

async function render() {
  const spec = await (await fetch(`specs/${specPath}.json`)).json();
  const content = document.getElementById('content');
  add(content, el('div', 'title', spec.title));
  for (const part of spec.parts) {
    if (!KINDS[part.kind]) throw new Error(`unknown kind ${part.kind}`);
    content.appendChild(KINDS[part.kind](part));
  }
  if (spec.note) content.appendChild(el('div', 'note', spec.note));
  await document.fonts.ready;
  const fig = document.getElementById('fig');
  window.__height = Math.ceil(fig.getBoundingClientRect().height);
  window.__ready = true;
}
render().catch((e) => { window.__error = String(e.stack || e); });
