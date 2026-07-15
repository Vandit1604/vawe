// scripts/argus.mjs — composes the argushq.cc launch teaser (landscape 16:9) from the taste library +
// the brand's signature details (pixel-eye mascot, hand-drawn cobalt underline, X-native surfaces).
// Colours come from themes/argus.json via CSS vars (theme-aware blocks), so everything is cobalt-on-white.
// Writes formats/scene/argus-launch.json. Run: node scripts/argus.mjs
import fs from 'node:fs';
import { tweetCard, chatBubble, statCard, barChart, reactionBar, avatarStack, kpiRow } from '../blocks/index.mjs';

const W = 1920, H = 1080;
const INK = 'var(--ink)', SUB = 'var(--text-2)', DIM = 'var(--dim)', COBALT = 'var(--accent)';
const T = (o) => ({ type: 'text', weight: 400, color: INK, ...o });                 // Archivo defaults light
const L = [];

// the REAL pixel mascot (captured from the site, white bg → composites on our white scene). w centers.
const eye = (w, y, start, dur) => ({ type: 'image', src: '/engine/assets/brands/argus/mascot.png',
  x: Math.round((W - w) / 2), y, w, start, duration: dur, anim: 'rise', enterDur: 0.5, exitDur: 0.3 });

// hand-drawn cobalt underline (a rough marker scribble) under a word — a signature detail.
const underline = (x, y, w, start) => ({ type: 'html', x, y, w, start, duration: 3,
  html: `<svg viewBox="0 0 ${w} 16" width="${w}" height="16" style="display:block"><path d="M2 11 Q ${w * 0.3} 4, ${w * 0.55} 9 T ${w - 4} 7" stroke="#4772f5" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
  anim: 'wipe', enterDur: 0.5 });

// ═══ BEAT 1 · HOOK (0–4.2s) — full-bleed statement, mascot watching ═══
L.push(T({ text: 'argus', x: 92, y: 76, font: 'mono', size: 24, weight: 500, color: DIM, start: 0, duration: 23, track: 1 }));
L.push(eye(240, 360, 0.1, 4.2)); // mascot lower so it reads as one unit with the headline below
L.push(T({ text: "you're posting into", x: 460, y: 560, w: 1000, align: 'center', size: 96, weight: 400, ls: '-0.035em', start: 0.4, duration: 4.2, anim: 'rise', enterDur: 0.55 }));
L.push(T({ text: 'the void.', x: 460, y: 668, w: 1000, align: 'center', size: 96, weight: 400, color: DIM, ls: '-0.035em', start: 0.6, duration: 4, anim: 'rise', enterDur: 0.55 }));

// ═══ BEAT 2 · THE AUDIT (4.2–10s) — split: copy left, analytics right, one metric red ═══
L.push(T({ text: 'argus reads your', x: 130, y: 380, size: 62, weight: 400, ls: '-0.03em', start: 4.4, duration: 5.6, anim: 'rise', enterDur: 0.5, cut: 'punch' }));
L.push(T({ text: 'own X analytics.', x: 130, y: 452, size: 62, weight: 400, ls: '-0.03em', start: 4.5, duration: 5.5, anim: 'rise', enterDur: 0.5 }));
L.push(T({ text: 'find your one leak.', x: 130, y: 600, size: 74, weight: 600, color: COBALT, ls: '-0.03em', start: 5.0, duration: 5, anim: 'rise', enterDur: 0.4 }));
L.push(underline(132, 690, 470, 5.5));
L.push(...barChart({ x: 1080, y: 300, w: 700, h: 300, start: 4.8, dur: 5.2,
  data: [{ label: 'Mon', value: 60 }, { label: 'Tue', value: 52 }, { label: 'Wed', value: 44 }, { label: 'Thu', value: 30 }, { label: 'Fri', value: 22 }] }));
L.push(...statCard({ x: 1080, y: 660, w: 340, to: 0.4, unit: '%', label: 'reply rate · your leak', delta: '-61%', deltaUp: false, start: 5.4, dur: 4.6 }));
L.push(...statCard({ x: 1450, y: 660, w: 330, to: 3, unit: 'k', label: 'impressions / post', delta: '-40%', deltaUp: false, start: 5.7, dur: 4.3 }));

// ═══ BEAT 3 · THE LEAK + FIX (10–16s) — the reply THREADS from the post (connected, not two columns) ═══
L.push(T({ text: 'it drafts each reply in your voice.', x: 360, y: 150, w: 1200, align: 'center', size: 56, weight: 400, ls: '-0.03em', start: 10.2, duration: 5.8, anim: 'rise', enterDur: 0.5, cut: 'whip' }));
L.push(...tweetCard({ x: 460, y: 270, w: 820, name: 'a big account', handle: 'founder', initials: 'F', likes: '1.2k', reposts: '210',
  text: 'shipping is the only growth hack that compounds.', start: 10.4, dur: 5.6 }));
// the reply threads DIRECTLY below the post (indented), so it visibly replies TO it.
L.push(T({ text: '↳ argus drafts in your voice', x: 560, y: 500, font: 'mono', size: 20, weight: 500, color: COBALT, start: 11.4, duration: 4.6, anim: 'rise', enterDur: 0.4 }));
L.push(...chatBubble({ x: 560, y: 542, w: 820, start: 11.6, dur: 4.4, messages: [
  { text: 'agreed. we shipped 40 times last month and every reply here came from argus.', me: true },
  { text: 'the trick: reply to the right 5 people, not the loudest 50.', me: true },
] }));

// ═══ BEAT 4 · THE LIFT (16–20s) — ONE hero (the growth chart) + the kpi row. No cramped middle. ═══
L.push(T({ text: 'your feed, working.', x: 130, y: 210, size: 74, weight: 400, ls: '-0.03em', start: 16.2, duration: 3.8, anim: 'rise', enterDur: 0.5, cut: 'slide' }));
L.push(...kpiRow({ x: 140, y: 380, gap: 120, start: 16.6, dur: 3.4, items: [
  { value: '4.9%', label: 'reply rate' }, { value: '38k', label: 'impressions' }, { value: '+612', label: 'followers / wk' }] }));
L.push(T({ text: 'from replying to the right 5, not the loudest 50.', x: 140, y: 560, size: 26, weight: 400, color: SUB, start: 17.2, duration: 2.8, anim: 'rise', enterDur: 0.4 }));
L.push(...barChart({ x: 1080, y: 300, w: 700, h: 460, color: COBALT, start: 16.8, dur: 3.2,
  data: [{ label: 'W1', value: 22 }, { label: 'W2', value: 34 }, { label: 'W3', value: 55 }, { label: 'W4', value: 90 }] }));

// ═══ BEAT 5 · CTA (20–23s) — the site's exact words + cobalt waitlist pill ═══
L.push(eye(150, 360, 20.1, 3)); // mascot lower so it groups with the headline
// headline + underline as ONE html layer: text-align centres the line, and the underline SVG is
// absolutely positioned UNDER the "purpose." span, so it tracks the word regardless of metrics/centring.
L.push({ type: 'html', x: 360, y: 490, w: 1200, start: 20.2, duration: 2.8, anim: 'rise', enterDur: 0.5,
  html: `<div style="font:400 88px var(--font-sans);letter-spacing:-0.035em;color:var(--ink);text-align:center;line-height:1.05;white-space:nowrap">grow on X, on <span style="position:relative;display:inline-block">purpose.<svg viewBox="0 0 300 18" preserveAspectRatio="none" style="position:absolute;left:0;top:98%;width:100%;height:18px;overflow:visible"><path d="M4 12 Q 90 4, 150 10 T 296 8" stroke="#4772f5" stroke-width="7" fill="none" stroke-linecap="round"/></svg></span></div>` });
L.push({ type: 'group', x: 760, y: 680, w: 400, bg: COBALT, radius: 999, pad: '22px 0', layout: 'row', justify: 'center', items: 'center',
  start: 20.6, duration: 2.4, anim: 'rise', enterDur: 0.45, children: [T({ text: 'join the waitlist', size: 28, weight: 600, color: '#fff' })] });
L.push(T({ text: 'argushq.cc', x: 760, y: 800, w: 400, align: 'center', font: 'mono', size: 24, weight: 500, color: DIM, start: 20.9, duration: 2.1, anim: 'rise', enterDur: 0.4 }));

const scene = { module: 'scene', theme: 'argus', aspect: '16:9', duration: 23,
  audio: { silent: true },
  bg: [{ preset: 'plain', value: 'light', from: 0, to: 23 }],
  layers: L };
fs.writeFileSync('formats/scene/argus-launch.json', JSON.stringify(scene, null, 2));
console.log(`wrote formats/scene/argus-launch.json · ${L.length} layers · 5 beats · 23s · 16:9`);
