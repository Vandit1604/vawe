// simple.html?spec=<slug>/<name>&v=mesh|edge|glow|tint[&font=<family>]: one simple blog figure from simple-specs/<slug>/<name>.json.
// kinds: bars { rows: [[label, value, text]], hi }, flow { steps: [[name, note]], hi },
//        compare { sides: [{ label, items: [text], note, hi? }] }, number { value, label, sub }.
const displayFont = new URLSearchParams(location.search).get('font');
if (displayFont) document.documentElement.style.setProperty('--display', `'${displayFont}'`);
const fontLoaded = displayFont ? document.fonts.load(`800 64px '${displayFont}'`) : Promise.resolve();
const q = new URLSearchParams(location.search);
const specPath = q.get('spec');
const variant = q.get('v') || 'mesh';
const post = window.POSTS.find((x) => x.slug === specPath.split('/')[0]);
if (!post) throw new Error(`no post for ${specPath}`);
window.Rays.TONES[post.tone].forEach((t, i) => document.documentElement.style.setProperty(`--t${i}`, t.join(',')));
document.body.className = `v-${variant}`;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = String(text);
  return e;
}
const add = (parent, ...kids) => { kids.filter(Boolean).forEach((k) => parent.appendChild(k)); return parent; };

const KINDS = {
  bars(s) {
    const max = Math.max(...s.rows.map((r) => r[1]));
    const box = el('div', 'bars');
    s.rows.forEach(([label, value, text], i) => {
      const bar = el('div', 'bar');
      bar.style.width = `${(78 * value) / max}%`;
      add(box, add(el('div', i === s.hi ? 'bar-row key' : 'bar-row'), el('div', 'label', label),
        add(el('div', 'bar-line'), bar, el('span', i === s.hi ? 'val key-text' : 'val', text))));
    });
    return box;
  },
  flow(s) {
    const box = el('div', 'flow');
    box.style.setProperty('--n', s.steps.length);
    s.steps.forEach(([name, note], i) => add(box, add(el('div', i === s.hi ? 'step key' : 'step'), el('div', 'dot'), el('div', i === s.hi ? 'label key-text' : 'label', name), note && el('div', 'note', note))));
    return box;
  },
  compare(s) {
    const box = el('div', 'compare');
    for (const side of s.sides) {
      const marks = el('div', 'marks');
      side.items.forEach((t) => marks.appendChild(el('div', 'mark', t)));
      add(box, add(el('div', side.hi ? 'side key' : 'side'), el('div', side.hi ? 'label key-text' : 'label', side.label), marks, side.note && el('div', 'note', side.note)));
    }
    return box;
  },
  number(s) {
    return add(el('div', 'number key'), el('div', 'big', s.value), el('div', 'label', s.label), s.sub && el('div', 'note', s.sub));
  },
};

async function render() {
  const spec = await (await fetch(`simple-specs/${specPath}.json`)).json();
  const body = KINDS[spec.kind](spec);
  const holder = variant === 'tint' ? add(el('div', 'card'), body) : body;
  add(document.getElementById('content'), el('div', 'title', spec.title), holder);
  await fontLoaded;
  await document.fonts.ready;
  const fig = document.getElementById('fig');
  const box = fig.getBoundingClientRect();
  const key = fig.querySelector('.key .bar, .step.key .dot, .side.key .marks, .number .big') || fig;
  const k = key.getBoundingClientRect();
  fig.style.setProperty('--gx', `${k.left + k.width / 2 - box.left}px`);
  fig.style.setProperty('--gy', `${k.top + k.height / 2 - box.top}px`);
  const w = 680, h = Math.ceil(box.height), dpr = window.devicePixelRatio || 1;
  if (variant === 'edge') {
    const canvas = document.getElementById('dither');
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    window.Rays.draw(ctx, w, h, { ...post, cy: 1.1 }, { cell: 6, gain: 0.9 });
  }
  window.__height = h;
  window.__ready = true;
}
render().catch((e) => { window.__error = String(e.stack || e); });
