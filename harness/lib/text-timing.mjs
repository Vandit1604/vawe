// Text as data: when each line of text enters, is fully readable, and leaves, and where its glyph ink
// leaves the box that clips it. The in-page collector reads the live DOM; everything after it is pure.

const READ_PER_WORD = 0.6;   // taste/rules/readable-hold.md: words x 0.6 s, no hold under 1.2 s
const READ_FLOOR = 1.2;
const CLIP_TOL_PX = 2;
const CLIP_REVEALED = 0.8;   // a line this far revealed is judged on its clipping edge, moving or not
const SOFT_MASK_ALPHA = 0.2; // a gradient mask under this opacity at the ink's bottom edge fades text by design
const REF_HOLD_TOL = 0.1;    // a recreation keeps the reference's own hold to within this many seconds
const REF_START_NEAR = 0.5;  // a reference run counts as the same line when it starts this close

/** Runs in the page: one record per visible text node, with its ink box, opacity, blur and clipping boxes. */
export function collectTextNodes() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const rect = (r) => ({ x: r.left, y: r.top, w: r.width, h: r.height });
  const pathOf = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) parts.push(`${e.tagName}${[...e.parentElement.children].indexOf(e)}`);
    return parts.join('<');
  };
  const insetBox = (r, cp) => {
    const m = /^inset\(([^)]*)\)/.exec(cp);
    if (!m) return null;
    const vals = m[1].split(' round')[0].trim().split(/\s+/);
    const order = { 1: [0, 0, 0, 0], 2: [0, 1, 0, 1], 3: [0, 1, 2, 1], 4: [0, 1, 2, 3] }[vals.length];
    if (!order) return null;
    const px = (s, size) => (s.endsWith('%') ? (parseFloat(s) / 100) * size : parseFloat(s));
    const [top, right, bottom, left] = order.map((i, k) => px(vals[i], k % 2 ? r.width : r.height));
    return { x: r.left + left, y: r.top + top, w: r.width - left - right, h: r.height - top - bottom };
  };
  // A vertical linear-gradient mask is soft when its bottom edge is nearly transparent; any other gradient is judged soft.
  const softBottom = (mask) => {
    const m = /^linear-gradient\(([^)]*(?:\([^)]*\)[^)]*)*)\)/.exec(mask);
    if (!m) return true;
    const alphas = (m[1].match(/rgba?\([^)]*\)/g) || []).map((c) => { const p = c.match(/[\d.]+/g); return p.length > 3 ? Number(p[3]) : 1; });
    const dir = m[1].split(',')[0].trim();
    const up = dir === 'to top' || /^(0|360)deg$/.test(dir);
    const down = !/^(to |-?[\d.]+deg)/.test(dir) || dir === 'to bottom' || dir === '180deg';
    if (!alphas.length || !(up || down)) return true;
    return alphas[up ? 0 : alphas.length - 1] < SOFT_MASK_ALPHA;
  };
  const clipsOf = (el) => {
    const out = [];
    for (let e = el; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      if (/hidden|clip|scroll|auto/.test(cs.overflowX + cs.overflowY)) out.push({ kind: 'overflow', ...rect(r) });
      if (cs.clipPath && cs.clipPath !== 'none') { const b = insetBox(r, cs.clipPath); if (b) out.push({ kind: 'clip-path', ...b }); }
      const mask = cs.maskImage || cs.webkitMaskImage;
      if (mask && mask !== 'none' && !(mask.includes('gradient') && softBottom(mask))) out.push({ kind: 'mask', ...rect(r) });
    }
    return out;
  };
  const ancestry = (el) => {
    let opacity = 1, blur = 0;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      opacity *= Number(cs.opacity);
      const m = /blur\(([\d.]+)px\)/.exec(cs.filter || '');
      if (m) blur += Number(m[1]);
    }
    return { opacity, blur };
  };
  const PHRASE_WORDS = 6;
  const layoutBox = (el) => {
    let x = 0, y = 0;
    for (let p = el; p; p = p.offsetParent) { x += p.offsetLeft; y += p.offsetTop; }
    return { left: x, right: x + el.offsetWidth, top: y };
  };
  // Text a reader sees: letters or words in separate spans join into one word unless a visual gap
  // (layout offsets, so a transform mid-animation does not fake one) or a new line separates them.
  const lineOf = (e) => {
    const walk = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    let out = '', prev = null, n;
    while ((n = walk.nextNode())) {
      const el = n.parentElement;
      if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) || !n.textContent.trim()) continue;
      const own = el.childNodes.length === 1 && el !== e ? layoutBox(el) : null;
      const sized = parseFloat(getComputedStyle(el).fontSize);
      const apart = prev && own && (Math.abs(own.top - prev.top) > sized * 0.5 || own.left - prev.right > sized * 0.15);
      const spaced = /\s$/.test(out) || /^\s/.test(n.textContent);
      out += (apart && !spaced ? ' ' : '') + n.textContent;
      prev = own;
    }
    return out.replace(/\s+/g, ' ').trim();
  };
  const wordsOf = (e) => lineOf(e).split(' ').length;
  // The unit a viewer reads: the block, and a lone word (or a letter of one) joins its short phrase.
  const blockOf = (el) => {
    let e = el;
    while (e.parentElement && getComputedStyle(e).display.startsWith('inline')) e = e.parentElement;
    while (e.parentElement && e.parentElement !== document.body && wordsOf(e) < 2 && wordsOf(e.parentElement) <= PHRASE_WORDS) e = e.parentElement;
    return e;
  };
  const canvas = document.createElement('canvas').getContext('2d');
  // The range box is the font's content area, taller than the ink of most strings; a one-line run is
  // narrowed to the ink the font reports for these exact glyphs, scaled by the page's transforms (advance width ratio).
  const inkOf = (box, lines, cs, text) => {
    if (lines !== 1) return box;
    canvas.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const shown = cs.textTransform === 'uppercase' ? text.toUpperCase() : text;
    const m = canvas.measureText(shown);
    if (!m.fontBoundingBoxAscent) return box;
    const k = m.width ? box.width / m.width : 1;
    if (k < 0.05 || k > 4) return box;
    const top = box.top + (m.fontBoundingBoxAscent - m.actualBoundingBoxAscent) * k;
    return { left: box.left, top, width: box.width, height: (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) * k };
  };
  const nodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const el = node.parentElement, text = node.textContent.trim();
    if (!text || !el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) continue;
    const ink = inkOf(box, range.getClientRects().length, cs, text);
    const { opacity, blur } = ancestry(el);
    const block = blockOf(el), line = lineOf(block);
    nodes.push({
      id: pathOf(el), group: pathOf(block), text: text.slice(0, 60), line: line.slice(0, 80), words: line.split(' ').length,
      opacity, blur, size: parseFloat(cs.fontSize), ink: rect(ink), clips: clipsOf(el), vw, vh,
    });
  }
  return nodes;
}

const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** Share of the ink that is inside the viewport and every clipping box. Pure. */
export function shownShare(n) {
  const area = n.ink.w * n.ink.h;
  if (!area) return 0;
  let inside = overlap(n.ink, { x: 0, y: 0, w: n.vw, h: n.vh });
  for (const c of n.clips) inside = Math.min(inside, overlap(n.ink, c));
  return inside / area;
}

const isVisible = (n) => n.opacity >= 0.05 && shownShare(n) > 0.05;
const isReadable = (n) => n.opacity >= 0.9 && n.blur < 1 && shownShare(n) >= 0.95;

function runsOf(times, flags, step) {
  const runs = [];
  let start = null;
  flags.forEach((on, i) => {
    if (on && start === null) start = i;
    if ((!on || i === flags.length - 1) && start !== null) {
      const end = on ? i : i - 1;
      runs.push({ from: times[start], to: times[end] + step, open: on });
      start = null;
    }
  });
  return runs;
}

/**
 * Per text line (nodes sharing a block ancestor, words that were never visible left out): each
 * fully readable run as { text, words, enter, readable, leave, hold, need, endsFilm }. Pure.
 * samples: [{ t, nodes }] at a fixed step; dur: film seconds.
 */
export function timingRows(samples, step, dur) {
  const everSeen = new Set();
  for (const s of samples) for (const n of s.nodes) if (isVisible(n)) everSeen.add(n.id);
  const groups = new Map();
  for (const s of samples) for (const n of s.nodes) if (everSeen.has(n.id)) groups.set(n.group, (groups.get(n.group) || new Map()).set(n.id, n));
  const rows = [];
  for (const [group, ids] of groups) {
    const first = ids.values().next().value;
    const { words, line: text } = first;
    const times = samples.map((s) => s.t);
    const inGroup = samples.map((s) => s.nodes.filter((n) => n.group === group && everSeen.has(n.id)));
    const visible = inGroup.map((ns) => ns.some(isVisible));
    const readable = inGroup.map((ns) => ns.length > 0 && ns.every(isReadable) && ns.length >= ids.size);
    const enter = times[visible.indexOf(true)];
    for (const r of runsOf(times, readable, step)) {
      rows.push({ group, text, words, enter, readable: r.from, leave: r.to, hold: r.to - r.from, need: Math.max(READ_FLOOR, words * READ_PER_WORD), endsFilm: r.open || r.to >= dur - step });
    }
  }
  return rows.sort((a, b) => a.readable - b.readable);
}

/** Holds shorter than the reading time. A line still on screen when the film ends is not judged. Pure. */
export function shortHolds(rows) {
  return rows.filter((r) => !r.endsFilm && r.hold < r.need - 1e-6);
}

/**
 * The short holds that the reference does not have too. A recreation copies the reference's timing, so a
 * hold within `tol` s of a reference text run that starts near it is the reference's own. Pure.
 * refRuns: [{ t0, t1 }] from the reference's text timeline sampled every `refStep` s.
 */
export function holdsBeyondRef(rows, refRuns, refStep, tol = REF_HOLD_TOL) {
  const matches = (r) => refRuns.some((x) => Math.abs(x.t0 - r.readable) <= REF_START_NEAR && Math.abs(x.t1 + refStep - x.t0 - r.hold) <= tol + 1e-6);
  return rows.filter((r) => !matches(r));
}

/** The text line with the least screen time x ink area over the film. Pure. -> { text, seconds } | null */
export function leastSeen(samples, step) {
  const seen = new Map();
  for (const s of samples) {
    for (const n of s.nodes.filter(isVisible)) {
      const g = seen.get(n.group) || { text: n.line, weight: 0, seconds: 0, counted: new Set() };
      g.weight += n.ink.w * n.ink.h * step * shownShare(n);
      if (!g.counted.has(s.t)) { g.counted.add(s.t); g.seconds += step; }
      seen.set(n.group, g);
    }
  }
  const least = [...seen.values()].sort((a, b) => a.weight - b.weight)[0];
  return least ? { text: least.text, seconds: least.seconds } : null;
}

function overshoot(n) {
  let worst = null;
  for (const c of n.clips) {
    if (!overlap(n.ink, c)) continue;
    const sides = { left: c.x - n.ink.x, top: c.y - n.ink.y, right: n.ink.x + n.ink.w - (c.x + c.w), bottom: n.ink.y + n.ink.h - (c.y + c.h) };
    for (const [side, px] of Object.entries(sides)) if (px > CLIP_TOL_PX && (!worst || px > worst.px)) worst = { px, side, kind: c.kind, box: c };
  }
  return worst;
}

/**
 * Text cut by a hard clipping edge: at some sample where the line is at least 80% revealed and opaque, its
 * ink sticks out of an overflow, clip-path or mask box by more than 2 px, and at no such sample is it clean.
 * Movement does not excuse it. A reveal that ends whole (a wipe that uncovers every glyph) has a clean
 * sample and is not a cut. Pure.
 * -> [{ t, id, text, px, side, kind, box, ink, sizeShare }] one per text node, at its least-cut sample.
 */
export function clippedGlyphs(samples) {
  const cut = new Map();
  const clean = new Set();
  for (const s of samples) {
    for (const n of s.nodes) {
      if (n.opacity < 0.5 || shownShare(n) < CLIP_REVEALED) continue;
      const o = overshoot(n);
      if (!o) clean.add(n.id);
      else if (!cut.has(n.id) || o.px < cut.get(n.id).px) cut.set(n.id, { t: s.t, id: n.id, text: n.text, ...o, ink: n.ink, sizeShare: o.px / n.ink.h });
    }
  }
  return [...cut.values()].filter((c) => !clean.has(c.id));
}

/** Drive an open page (render-page.mjs openPage, already loaded and settled) through the film. -> samples. */
export async function sampleText(page, dur, step = 0.1) {
  const samples = [];
  for (let t = 0; t < dur - 1e-9; t += step) {
    const at = +t.toFixed(4);
    await page.evaluate((s) => window.__pageSeek(s), at);
    samples.push({ t: at, nodes: await page.evaluate(collectTextNodes) });
  }
  return samples;
}
