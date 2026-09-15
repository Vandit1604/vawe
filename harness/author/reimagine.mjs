// harness/author/reimagine.mjs: rebuild the flagged beats through the taste library. Run once.
import fs from 'node:fs';
// index.mjs is the registry, not a barrel of 200 re-exported names. Alias it back to the `B.<factory>`
// shape this file was written in; `TOKENS` rides along because the colours here come from the kit.
import { BLOCKS, TOKENS } from '../../blocks/index.mjs';
const B = { ...BLOCKS, TOKENS };
import { boundaryMechanism } from '../../core/transitions/lower.js';
const p = 'formats/scene/vawe-launch.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
const T = B.TOKENS;
const has = (l, t) => l.type === 'text' && (l.text || '').includes(t);
const rm = (pred) => { d.layers = d.layers.filter((l) => !pred(l)); };
const L = () => d.layers;
const push = (...xs) => d.layers.push(...xs);

// 0 ── remove decorative terracotta chrome (left bar, ticks, underline); keep CTA (a text-chip, not a rect)
rm((l) => l.type === 'rect' && l.bg === T.accent && ((l.w <= 6 && l.h >= 200) || (l.h <= 6 && l.w <= 320)));

// 9 ── cold-open right card → a real mini-scene rendering + green loading bar
rm((l) => (l.type === 'text' && (l.text === 'scene' || l.text === 'rendered') && (l.x ?? 0) >= 980)
       || (l.type === 'rect' && (l.x ?? 0) >= 1000 && l.bg === T.hair && ((l.w <= 20 && l.h <= 20) || l.w === 244)));
push(
  { type: 'text', text: 'Ship faster', x: 1090, y: 430, size: 56, weight: 700, color: T.ink, ls: '-0.02em', start: 4.5, duration: 2.4, anim: 'rise', enterDur: 0.4 },
  { type: 'group', x: 1090, y: 512, layout: 'row', gap: 8, start: 4.8, duration: 2.1, anim: 'rise', enterDur: 0.35, children: [
    { type: 'text', text: 'live', size: 18, weight: 500, color: T.accentInk, bg: T.accentSoft, radius: 100, pad: '6px 14px' },
    { type: 'text', text: 'pure(n)', size: 18, weight: 500, color: T.accentInk, bg: T.accentSoft, radius: 100, pad: '6px 14px' },
  ] },
);
push(...B.loadingBar({ x: 1090, y: 700, w: 560, start: 3.7, fillDur: 1.5, label: 'rendering scene.json', done: true }));

// 11 ── any theme/colour: drop placeholder "scene"; add a card that morphs through themes (proof of "any colour")
rm((l) => l.type === 'text' && l.text === 'scene' && (l.y ?? 0) === 430);
[['#FCFCFC', '#0A0A0A', '#C96442'], ['#0E0E10', '#F4F4F2', '#22C55E'], ['#635BFF', '#FFFFFF', '#3ECF8E'], ['#F6A417', '#141210', '#1E5BF0']]
  .forEach(([bg, fg, ac], i) => push({ type: 'group', x: 700, y: 420, w: 520, h: 160, bg, radius: 16, elevation: 2,
    layout: 'column', pad: 26, gap: 14, items: 'flex-start', start: +(12.4 + i * 0.82).toFixed(2), duration: 0.86, anim: 'fade', enterDur: 0.22, children: [
      { type: 'text', text: 'Dashboard', size: 30, weight: 700, color: fg },
      { type: 'group', bg: ac, radius: 8, pad: '10px 18px', children: [{ type: 'text', text: 'Deploy', size: 18, weight: 600, color: bg }] },
    ] }));

// cuts beat ── kill the false "22 shader stings" claim; relabel the invisible "blinds"
L().forEach((l) => { if (has(l, '26 cuts')) l.text = 'every cut, deterministic'; if (l.type === 'text' && l.text === 'blinds') l.text = 'push'; });
// Both surfaces, because a boundary can be declared raw or through the unified `transitions` list, and
// a rewrite that saw only one of them left the invisible blinds on screen (engine-doctrine/MISTAKES.md #408).
// This script WRITES the scene back, so it edits the authored surface in place instead of lowering:
// lowering here would silently convert an author's `transitions` into raw cuts and stings.
// `boundaryMechanism` decides what a unified entry IS, so the rule is not duplicated here.
(d.stings || []).forEach((s) => { if (s.fx === 'blinds') s.fx = 'wipe'; });
(d.transitions || []).forEach((t) => {
  if (t.fx === 'blinds' && boundaryMechanism(t.fx, t.mech) === 'sting') t.fx = 'wipe';
});

// 12 ── backdrops: remove the "14 backdrops" claim + fake player; show 3 LIVE micro-demos
rm((l) => has(l, '14 live backdrops') || (l.type === 'group' && (l.start ?? 0) >= 30 && (l.start ?? 0) < 32.5 && (l.y ?? 0) === 620));
push({ type: 'text', text: 'Backdrops, motion, captions.', x: 160, y: 250, size: 58, weight: 700, color: T.ink, ls: '-0.02em', start: 29.6, duration: 2.8, anim: 'rise', enterDur: 0.4 });
push(
  { type: 'image', src: '/assets/brands/vawe/land1.png', x: 200, y: 430, w: 460, h: 260, radius: 12, ken: { from: 1.08, to: 1 }, start: 29.9, duration: 2.5, anim: 'rise', enterDur: 0.4 },
  { type: 'text', text: 'ken burns', x: 200, y: 704, font: 'mono', size: 18, color: T.dim, start: 30.1, duration: 2.3 },
  { type: 'group', x: 730, y: 430, w: 460, h: 260, bg: T.card, radius: 12, elevation: 1, layout: 'column', justify: 'center', items: 'center', start: 30.1, duration: 2.3, anim: 'rise', enterDur: 0.4,
    children: [{ type: 'text', text: 'captions, live', size: 30, weight: 600, color: T.ink, split: 'char', preset: 'decode', each: 0.7, stagger: 0.03 }] },
  { type: 'text', text: 'captions', x: 730, y: 704, font: 'mono', size: 18, color: T.dim, start: 30.3, duration: 2.1 },
);
push(...B.statBig({ x: 1270, y: 470, to: 60, unit: 'fps', label: 'motion + camera', size: 86, start: 30.3, dur: 2.1 }));

// 13 ── change data: right panel shows a REAL mini-scene that scales bigger than the label
rm((l) => l.type === 'text' && l.text === 'scene' && (l.x ?? 0) >= 1000);
const mini = (px, start, dur) => ({ type: 'group', x: 1120, y: 430, layout: 'column', gap: 10, items: 'flex-start', start, duration: dur, anim: 'fade', enterDur: 0.22,
  children: [{ type: 'text', text: 'Hello', size: px, weight: 700, color: T.ink, ls: '-0.02em' }, { type: 'text', text: 'a real scene', size: Math.round(px * 0.28), color: T.sub }] });
push(mini(54, 33.8, 2.0), mini(96, 35.9, 2.5));

// 14 ── read CSS: the recognizable Stripe rebuild as the payoff
push(...B.stripeCard({ x: 1260, y: 400, w: 420, start: 40.8, dur: 2.6 }));
push({ type: 'text', text: 'stripe.com, rebuilt', x: 1260, y: 856, font: 'mono', size: 18, color: T.dim, start: 41.3, duration: 2.1 });

// 15 ── capture: the click has a consequence, a deploy success card
L().forEach((l) => { const s = l.start ?? 0; if (s >= 44 && s < 48.4 && ((l.type === 'rect' && l.x === 660) || has(l, 'make capture') || has(l, 'Deploy to production') || l.text === 'Confirm')) l.duration = +(46.8 - s).toFixed(2); });
push({ type: 'group', x: 700, y: 380, w: 620, layout: 'row', items: 'center', gap: 16, pad: 22, bg: T.card, radius: 14, border: `1px solid ${T.greenSoft}`, elevation: 1, start: 46.9, duration: 1.9, anim: 'rise', enterDur: 0.4, children: [
  { type: 'group', bg: T.green, radius: 100, pad: '8px 12px', children: [{ type: 'text', text: '✓', size: 22, weight: 700, color: '#fff' }] },
  { type: 'group', layout: 'column', gap: 4, items: 'flex-start', children: [
    { type: 'text', text: 'Deployed to production', size: 22, weight: 700, color: T.ink },
    { type: 'text', text: 'app.vawe.dev', font: 'mono', size: 18, color: T.green }] },
  { type: 'group', grow: 1, layout: 'row', justify: 'flex-end', children: [{ type: 'text', text: 'Ready in 1.2s', font: 'mono', size: 18, color: T.dim }] },
] });

// 16 ── determinism: shuffled parallel render panes → byte-identical (centered, live)
rm((l) => l.type === 'group' && (l.start ?? 0) >= 49 && (l.start ?? 0) < 53.5 && (l.y ?? 0) === 380);
const ns = [903, 41, 1204, 377], order = [0.2, 1.1, 0.6, 1.5];
ns.forEach((n, i) => push({ type: 'group', x: 560 + i * 220, y: 430, w: 190, h: 150, bg: T.card, radius: 12, border: `1px solid ${T.hair}`, elevation: 1,
  layout: 'column', justify: 'center', items: 'center', gap: 8, start: +(49.8 + order[i]).toFixed(2), duration: +(53.4 - (49.8 + order[i])).toFixed(2), anim: 'rise', enterDur: 0.35,
  children: [{ type: 'text', text: '▲', size: 34, weight: 700, color: T.ink }, { type: 'text', text: `n=${n}`, font: 'mono', size: 18, color: T.dim }] }));
push({ type: 'text', text: 'shuffled order → 0 bytes diff ✓', x: 560, y: 640, font: 'mono', size: 22, weight: 600, color: T.green, start: 51.6, duration: 1.8, anim: 'rise', enterDur: 0.4 });

// 17 ── gates: a live CI cascade, each row pending → ✓, ending "all gates passed"
rm((l) => l.type === 'group' && (l.start ?? 0) >= 54 && (l.start ?? 0) < 58.3 && (l.y ?? 0) === 360);
const gates = ['validate', 'probe', 'snap', 'audit', 'critique', 'ledger'];
gates.forEach((g, i) => { const t = +(54.4 + i * 0.5).toFixed(2), y = 372 + i * 54, dur = +(58.2 - t).toFixed(2);
  push({ type: 'text', text: '✓', x: 830, y, font: 'mono', size: 24, weight: 700, color: T.green, start: t, duration: dur, anim: 'rise', enterDur: 0.3 },
    { type: 'text', text: g, x: 874, y, font: 'mono', size: 22, color: T.ink, start: t, duration: dur }); });
push({ type: 'text', text: 'all gates passed · shipping', x: 830, y: 372 + gates.length * 54 + 14, font: 'mono', size: 20, weight: 600, color: T.green, start: 57.4, duration: 0.8, anim: 'rise', enterDur: 0.3 });

fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('reimagined · layers', d.layers.length);
