// Link the states of a page: each [data-world] is one state, `view-transition-name` marks the same element in two
// states, and the in-betweens are Web Animations the renderer seeks. The planner functions are pure (tested in
// tests/motion/states.test.mjs); only linkStates and describeWorld touch the DOM.
import { BANDS, EASE, bandSeconds, easeFn, enterSpecs, leaveSpecs, pickBand, staggerTimes } from './presets.js';

const ms = (s) => Math.round(s * 1000);
const ENTER_LAG_S = 0.12;
const SETTLE_SHARE = 0.85;
const ARC_FROM_PX = 240;
const ARC_BOW = 0.08;
const ARC_STEPS = 8;
const STAGGER_TOTAL_S = 0.5;
const MOVE_SPREAD_S = STAGGER_TOTAL_S / 2;
const GROUND_SHARE = 0.5;
const MOVE_MAX_S = BANDS.gravity[1];
const SAME_PX = 0.5;
const SAME_SCALE = 0.005;

/** [{ id, start, end }] from the worlds' data-at seconds; the first starts at 0 unless it says otherwise, the last ends at `duration`. Pure. */
export function cutTimes(worlds, duration) {
  const starts = worlds.map((w, i) => {
    const at = w.at == null || w.at === '' ? (i === 0 ? 0 : NaN) : Number(w.at);
    if (!Number.isFinite(at)) throw new Error(`linkStates: world ${w.id} needs data-at="<seconds>", the second it appears`);
    return at;
  });
  starts.forEach((s, i) => {
    if (i > 0 && !(s > starts[i - 1])) throw new Error(`linkStates: world ${worlds[i].id} data-at ${s} must come after ${worlds[i - 1].id} (${starts[i - 1]})`);
  });
  return worlds.map((w, i) => ({ id: w.id, start: starts[i], end: i + 1 < worlds.length ? starts[i + 1] : duration }));
}

const PSEUDO = /::view-transition-(group|old|new)\(\s*([^)\s]+)\s*\)/;
const seconds = (css) => {
  const m = /^\s*(-?[\d.]+)(ms|s)\s*(?:,|$)/.exec(css || '');
  return m ? (m[2] === 'ms' ? Number(m[1]) / 1000 : Number(m[1])) : undefined;
};
const firstOf = (css) => (css ? css.replace(/^(.*?)\s*,(?![^(]*\)).*$/s, '$1').trim() || undefined : undefined);

/** Map of "kind:name" to { duration, easing, delay } from rules shaped { selectorText, style }; kind is group, old or new. Later rules win. Pure. */
export function parseTimings(rules) {
  const table = new Map();
  for (const rule of rules) {
    for (const part of rule.selectorText.split(',')) {
      const m = PSEUDO.exec(part);
      if (!m) continue;
      const key = `${m[1]}:${m[2]}`;
      const got = { duration: seconds(rule.style.animationDuration), easing: firstOf(rule.style.animationTimingFunction), delay: seconds(rule.style.animationDelay) };
      const merged = { ...table.get(key) };
      for (const [k, v] of Object.entries(got)) if (v !== undefined) merged[k] = v;
      table.set(key, merged);
    }
  }
  return table;
}

const KINDS = { move: ['group'], leave: ['old', 'group'], enter: ['new', 'group'] };

/** One timing { duration?, easing?, delay } for a role (move, leave, enter) of a name (null for unnamed content): the exact name, then root, then `*`. Pure. */
export function timingFor(table, role, name) {
  const names = name == null ? ['root', '*'] : [name, '*'];
  const pick = (field) => {
    for (const n of names) for (const kind of KINDS[role]) {
      const v = table.get(`${kind}:${n}`)?.[field];
      if (v !== undefined) return v;
    }
    return undefined;
  };
  return { duration: pick('duration'), easing: pick('easing'), delay: pick('delay') ?? 0 };
}

const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const ratio = (a, b) => (a > 0 && b > 0 ? a / b : 1);

/**
 * The move of one element from its old rect to its own: translate of the centres and the scale of its size.
 * kind text scales by height only (a changed word keeps its glyph shapes), box (holds children) by the geometric mean,
 * plain (a bar, a shape) by width and height. Pure.
 */
export function flipOf(from, to, kind) {
  const a = center(from), b = center(to);
  const rx = ratio(from.w, to.w), ry = ratio(from.h, to.h);
  const [sx, sy] = kind === 'text' ? [ry, ry] : kind === 'box' ? [Math.sqrt(rx * ry), Math.sqrt(rx * ry)] : [rx, ry];
  return { dx: a.x - b.x, dy: a.y - b.y, sx, sy };
}

const IDENTITY = { s: 1, x: 0, y: 0 };
const apply = (m, p) => ({ x: m.s * p.x + m.x, y: m.s * p.y + m.y });
export const compose = (f, g) => ({ s: f.s * g.s, x: f.s * g.x + f.x, y: f.s * g.y + f.y });
export const invert = (m) => ({ s: 1 / m.s, x: -m.x / m.s, y: -m.y / m.s });

/** The map (uniform scale, shift) from where an element lays out to where its flip shows it at progress 0. Pure. */
export function startMap(flip, to) {
  const c = center(to);
  return { s: flip.sx, x: c.x + flip.dx - flip.sx * c.x, y: c.y + flip.dy - flip.sx * c.y };
}

/** An old rect as seen from inside a parent that moves by `parentMap` at progress 0, so parent and child compose to the old rect. Pure. */
export function insideParent(old, parentMap) {
  const inv = invert(parentMap), c = apply(inv, center(old)), w = old.w * inv.s, h = old.h * inv.s;
  return { x: c.x - w / 2, y: c.y - h / 2, w, h };
}

/** Keyframes for a flip as `translate` and `scale` values that end at rest; a far move bows to its own right, so two movers never cross. Pure. */
export function moveFrames(flip, { steps = ARC_STEPS } = {}) {
  const dist = Math.hypot(flip.dx, flip.dy);
  const bow = dist > ARC_FROM_PX ? ARC_BOW * dist : 0;
  const px = dist ? -flip.dy / dist : 0, py = dist ? flip.dx / dist : 0;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps, arc = bow * Math.sin(Math.PI * u);
    return {
      offset: u,
      translate: `${+(flip.dx * (1 - u) + px * arc).toFixed(2)}px ${+(flip.dy * (1 - u) + py * arc).toFixed(2)}px`,
      scale: `${+(flip.sx + (1 - flip.sx) * u).toFixed(4)} ${+(flip.sy + (1 - flip.sy) * u).toFixed(4)}`,
    };
  });
}

/** n start seconds from `at`, staggerTimes' gaps, the whole run squeezed inside `total` seconds however many. Pure. */
export function fitStagger(n, at, total = STAGGER_TOTAL_S) {
  const times = staggerTimes(n, { at });
  const span = times[n - 1] - at;
  return span > total ? times.map((t) => +(at + ((t - at) * total) / span).toFixed(4)) : times;
}

const hasMotion = (f) => Math.hypot(f.dx, f.dy) > SAME_PX || Math.abs(f.sx - 1) > SAME_SCALE || Math.abs(f.sy - 1) > SAME_SCALE;

/** The movers, the one landing furthest along the common direction of travel first: it clears the way, so a follower never has to pass through it. Pure. */
export function travelOrder(movers) {
  const sum = movers.reduce((s, m) => ({ x: s.x - m.flip.dx, y: s.y - m.flip.dy }), { x: 0, y: 0 });
  const len = Math.hypot(sum.x, sum.y) || 1;
  const ahead = (m) => (center(m.rect).x * sum.x + center(m.rect).y * sum.y) / len;
  return movers.map((m, i) => ({ m, i })).sort((a, b) => ahead(b.m) - ahead(a.m) || a.i - b.i).map((x) => x.m);
}

const lerpRect = (a, b, p) => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, w: a.w + (b.w - a.w) * p, h: a.h + (b.h - a.h) * p });
const overlapShare = (a, b) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? (w * h) / Math.min(a.w * a.h, b.w * b.h) : 0;
};
const COLLIDE_FROM = 0.1;
const HOLDS = 3;
const PUSH_STEP_S = 0.04;
const PUSH_MAX_S = 0.6;
const SAMPLE_S = 1 / 30;

const holds = (big, small) => {
  const c = center(small);
  return big.w * big.h >= HOLDS * small.w * small.h && c.x > big.x && c.x < big.x + big.w && c.y > big.y && c.y < big.y + big.h;
};

// A box that holds a much smaller one (a tray and its bars) is no collision; two of a size that overlap are.
const collide = (a, b) => overlapShare(a, b) > COLLIDE_FROM && !holds(a, b) && !holds(b, a);

/**
 * Where the straight paths of two movers would put them on top of each other, each one later start that avoids it. `moves` is
 * [{ from, to, start, duration }] in lead order: a mover is pushed (PUSH_STEP_S at a time, at most PUSH_MAX_S) until it
 * collides with none of the movers before it; one that cannot be cleared keeps its own start. Returns Map(move, start). Pure.
 */
export function retime(moves) {
  const ease = easeFn('carry');
  const at = (m, start, t) => lerpRect(m.from, m.to, ease(Math.min(1, Math.max(0, (t - start) / m.duration))));
  const placed = new Map();
  moves.forEach((m) => {
    const clashes = (start) => {
      const end = Math.max(start + m.duration, ...[...placed].map(([o, s]) => s + o.duration));
      for (let t = Math.min(start, ...[...placed.values()]); t <= end; t += SAMPLE_S) {
        const mine = at(m, start, t);
        if ([...placed].some(([o, s]) => collide(mine, at(o, s, t)))) return true;
      }
      return false;
    };
    const push = Array.from({ length: Math.round(PUSH_MAX_S / PUSH_STEP_S) + 1 }, (_, k) => k * PUSH_STEP_S).find((p) => !clashes(m.start + p));
    placed.set(m, m.start + (push ?? 0));
  });
  return placed;
}

/**
 * The movers in the order they must go: one leaves before any mover that lands where it stands (a word cannot land on
 * a word that has not left); otherwise travelOrder. A ring of such pairs falls back to travelOrder. Pure.
 */
export function moveOrder(movers) {
  const rest = travelOrder(movers);
  const blocks = (a, b) => a !== b && collide(a.old, b.rect);
  const out = [];
  while (rest.length) {
    const free = rest.findIndex((b) => !rest.some((a) => blocks(a, b)));
    out.push(...rest.splice(free < 0 ? 0 : free, 1));
  }
  return out;
}

const depthOf = (name, byName) => { let d = 0; for (let p = byName.get(name)?.parent; p && byName.has(p); p = byName.get(p).parent) d++; return d; };

function planMovers(prevByName, next, table, at) {
  const nextByName = new Map(next.named.map((n) => [n.name, n]));
  const shared = next.named.filter((n) => prevByName.has(n.name));
  const sharedNames = new Set(shared.map((n) => n.name));
  const byName = new Map(shared.map((n) => [n.name, { ...n, old: prevByName.get(n.name).rect }]));
  const maps = new Map(), timings = new Map(), anims = [];
  const top = [];
  for (const n of [...byName.values()].sort((a, b) => depthOf(a.name, nextByName) - depthOf(b.name, nextByName))) {
    const parent = sharedNames.has(n.parent) ? byName.get(n.parent) : null;
    const parentMap = parent ? maps.get(parent.name) : IDENTITY;
    const old = parent ? insideParent(n.old, parentMap) : n.old;
    const flip = flipOf(old, n.rect, n.kind);
    maps.set(n.name, compose(parentMap, startMap(flip, n.rect)));
    Object.assign(n, { flip, parent: parent?.name });
    if (!parent) top.push(n);
  }
  const lead = moveOrder(top);
  const starts = fitStagger(lead.length, at, MOVE_SPREAD_S);
  const plan = lead.map((n, i) => {
    const css = timingFor(table, 'move', n.name);
    const reach = Math.max(Math.hypot(n.flip.dx, n.flip.dy), Math.abs(n.rect.w * (n.flip.sx - 1)), Math.abs(n.rect.h * (n.flip.sy - 1)));
    const duration = css.duration ?? Math.min(MOVE_MAX_S, bandSeconds(pickBand(reach)));
    return { n, css, duration, start: starts[i] + css.delay, from: n.old, to: n.rect, moves: hasMotion(n.flip) };
  });
  const clear = retime(plan.filter((p) => p.moves));
  plan.forEach((p) => timings.set(p.n.name, { start: clear.get(p) ?? p.start, duration: p.duration, easing: p.css.easing ?? EASE.carry }));
  for (const n of byName.values()) {
    if (!hasMotion(n.flip)) continue;
    let root = n;
    while (root.parent) root = byName.get(root.parent);
    const t = timings.get(root.name);
    anims.push({ el: n.el, name: n.name, role: 'move', keyframes: moveFrames(n.flip), timing: { delay: ms(t.start), duration: ms(t.duration), easing: t.easing, fill: 'both', id: 'move' } });
  }
  const settled = anims.map((a) => (a.timing.delay + SETTLE_SHARE * a.timing.duration) / 1000);
  return { anims, moved: anims.map((a) => ({ name: a.name, at: a.timing.delay / 1000, duration: a.timing.duration / 1000 })), settled: Math.max(at, ...settled) };
}

const outermost = (items) => items.filter((n) => !(n.parent && items.some((p) => p.name === n.parent)));

/**
 * Every animation that takes state `prev` to state `next` at second `at` (prev is null for the first state). A state is
 * { named: [{ name, el, rect, kind, parent }], units: [{ el }] } where units are unnamed elements. In order of time:
 * leavers end at the cut, movers start at it (the new instance starts on the old rect), enterers start ENTER_LAG after.
 * `floor` is the second the old state began: a leaver never starts before it. Pure.
 */
export function planCut(prev, next, table, { at, floor = 0 }) {
  const prevByName = new Map((prev?.named ?? []).map((n) => [n.name, n]));
  const nextNames = new Set(next.named.map((n) => n.name));
  const anims = [];
  const moves = planMovers(prevByName, next, table, at);
  anims.push(...moves.anims);

  if (prev) {
    const gone = new Set(prev.named.filter((n) => !nextNames.has(n.name)).map((n) => n.name));
    const leavers = outermost([...prev.units, ...prev.named.filter((n) => gone.has(n.name))]);
    const base = leaveSpecs({ at: 0 })[0];
    const specs = leavers.map((l) => ({ l, css: timingFor(table, 'leave', l.name ?? null) }));
    const durations = specs.map(({ css }) => css.duration != null ? ms(css.duration) : base.timing.duration);
    const offsets = fitStagger(leavers.length, 0);
    const last = offsets[leavers.length - 1] ?? 0;
    specs.forEach(({ l, css }, i) => {
      const start = Math.max(floor, at - durations[i] / 1000 - (last - offsets[i])) + css.delay;
      anims.push({ el: l.el, name: l.name, role: 'leave', keyframes: base.keyframes, timing: { ...base.timing, delay: ms(start), duration: durations[i], easing: css.easing ?? base.timing.easing } });
    });
  }

  const prevNames = new Set(prevByName.keys());
  const fresh = new Set(next.named.filter((n) => !prevNames.has(n.name)).map((n) => n.name));
  const carrying = new Set(next.named.filter((n) => prevNames.has(n.name)).map((n) => n.parent));
  const enterers = outermost([...next.units, ...next.named.filter((n) => fresh.has(n.name))]);
  const starts = fitStagger(enterers.length, prev ? Math.max(at + ENTER_LAG_S, moves.settled) : at);
  enterers.forEach((e, i) => {
    const css = timingFor(table, 'enter', e.name ?? null);
    const specs = enterSpecs({ at: starts[i] + css.delay, ...(css.duration != null ? { duration: css.duration } : {}) });
    specs.forEach(({ keyframes, timing }) => {
      const main = timing.id === 'enter';
      if (!main && e.name && carrying.has(e.name)) return;
      anims.push({ el: e.el, name: e.name, role: 'enter', keyframes, timing: { ...timing, ...(main && css.easing ? { easing: css.easing } : {}) } });
    });
  });
  return { anims, moved: moves.moved };
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE']);
const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
const ownText = (el) => [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
const kindOf = (el) => (ownText(el) ? 'text' : el.children.length ? 'box' : 'plain');
const nameOf = (el) => { const v = getComputedStyle(el).viewTransitionName; return v && v !== 'none' && v !== 'auto' ? v : null; };

const isGround = (el) => {
  const r = rectOf(el);
  return el.getAttribute('aria-hidden') === 'true' && (r.w * r.h) / (innerWidth * innerHeight) > GROUND_SHARE;
};

/**
 * Runs in the page, the world shown alone: its named elements (with rect, kind and nearest named parent) and its unnamed units.
 * A texture (aria-hidden) that covers over half the frame is the ground: it is no unit, it swaps at the cut, because a leaving ground would show the page's backdrop.
 */
export function describeWorld(world) {
  const named = [], units = [], seen = new Set();
  const holdsName = (el) => [...el.querySelectorAll('*')].some((d) => nameOf(d));
  const walk = (el, parent, inNamed) => {
    for (const child of el.children) {
      if (SKIP.has(child.tagName) || getComputedStyle(child).display === 'none') continue;
      const name = nameOf(child);
      if (name) {
        if (seen.has(name)) throw new Error(`linkStates: view-transition-name "${name}" is on two elements of world ${world.dataset.world}`);
        seen.add(name);
        named.push({ name, el: child, rect: rectOf(child), kind: kindOf(child), parent });
        walk(child, name, true);
      } else if (inNamed) walk(child, parent, true);
      else if (holdsName(child)) walk(child, parent, false);
      else if (!isGround(child)) units.push({ el: child, name: null });
    }
  };
  walk(world, null, false);
  return { named, units };
}

const timingRules = () => {
  const found = [];
  const visit = (list) => { for (const r of list) { if (r.selectorText) found.push(r); else if (r.cssRules) visit(r.cssRules); } };
  for (const sheet of document.styleSheets) { try { visit(sheet.cssRules); } catch { /* a cross-origin sheet is not readable */ } }
  return found.filter((r) => r.selectorText.includes('::view-transition-'));
};

/**
 * Call once, after the worlds are in the page: <section data-world="s2" data-at="1.8">. Shows each world for its span,
 * and between two worlds links every element that carries the same view-transition-name: it moves from where it was
 * to where it is (FLIP), no cross-fade. The rest of the old world leaves before the cut, the rest of the new one enters after.
 * Timing comes from ::view-transition-group|old|new(name | *) rules in the page's CSS. Resolves when the animations exist.
 */
export async function linkStates() {
  const worlds = [...document.querySelectorAll('[data-world]')];
  const spans = cutTimes(worlds.map((w) => ({ id: w.dataset.world, at: w.dataset.at })), Number(document.querySelector('meta[name="duration"]')?.content));
  void document.body.offsetHeight;
  await (window.__pageFonts ? window.__pageFonts() : document.fonts.ready);
  const table = parseTimings(timingRules().map((r) => ({ selectorText: r.selectorText, style: r.style })));
  const hidden = worlds.map((w) => w.style.display);
  const states = worlds.map((w) => {
    worlds.forEach((o) => { o.style.display = o === w ? '' : 'none'; });
    return describeWorld(w);
  });
  worlds.forEach((w, i) => { w.style.display = hidden[i]; });

  const summary = [];
  worlds.forEach((w, i) => {
    const { start, end } = spans[i];
    w.style.opacity = '0';
    const last = i === worlds.length - 1;
    w.animate([{ opacity: 1 }, { opacity: 1 }], { delay: ms(start), duration: ms(end) - ms(start), fill: last ? 'forwards' : 'none', id: 'world' });
    const { anims, moved } = planCut(states[i - 1] ?? null, states[i], table, { at: start, floor: i ? spans[i - 1].start : 0 });
    for (const a of anims) a.el.animate(a.keyframes, a.timing);
    summary.push({ world: w.dataset.world, at: start, moved, animations: anims.length });
  });
  return summary;
}
