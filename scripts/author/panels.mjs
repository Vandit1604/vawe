// scripts/author/panels.mjs: the storyboard stop, as a picture.
//
// docs/CRAFT/APPROVAL-STOPS.md states the rule: "a stop is a picture, not a report." The storyboard
// stop was the one with no picture. A storyboard here is prose, so a reviewer was asked to approve a
// film from `picture:` and `onscreen:` written in English, and prose hides the two things that decide
// whether a plan is any good: how much of the frame is used, and how the beats compare to each other.
// `onefilm` was approved as text and later rejected on its beats sheet for a dead opening. That
// rejection was decidable before a line of JSON existed.
//
// So: one rough still per beat, tiled into a sheet, rendered from the markdown alone.
//
// WHAT MAKES THIS DIFFERENT FROM `make animatic`, which also draws grey boxes. The animatic is a CLOCK
// check. It synthesizes a scratch read and asks whether each beat has room for its own words. This is
// a COMPOSITION check, and it asks where things sit and how big they are. The animatic draws every
// beat's slot the same size, so a `wide` and a `close` look identical in it. Here `shot:` drives the
// subject box, which is the one field that turns a storyboard into blocking.
//
// DELIBERATELY GREY. No theme, no accent, no real assets. Nobody may mistake a panel for a finished
// frame; palette and type are judged later, at `make styleframes`. A panel is blocking, not drawing.
//
// WHAT `style:` AND `layout:` DO HERE. They are the two slots the beat formula has (Element · Motion ·
// Layout · Style · Timing) and this repo had nowhere to spend. `layout:` is DRAWN: a coarse region
// inside the frame, and the subject box is sized or centred against it, so a plan that says "the UI
// fills the lower two thirds" no longer draws a medium box dead centre. `style:` is NOT drawable here
// and must not pretend to be, because a panel is grey on purpose and the look is judged at
// `make styleframes`. It is carried as WORDS on the panel and listed beat by beat under the report,
// where the thing a reviewer needs is the comparison: five beats declaring one treatment is a film
// shot at one volume, and that is only visible with the five lines side by side.
//
//   node scripts/author/panels.mjs <STORYBOARD.md> [--out /tmp/panels]
//   node scripts/author/panels.mjs --self-test        # the region/area arithmetic, asserted
//   make panels SB=formats/scene/<name>.storyboard.md
import fs from 'node:fs';
import { onScreenText } from '../lib/text.mjs';
import path from 'node:path';
import { parseStoryboard, timeline } from './storyboard-parse.mjs';
import { openScene } from './scene-page.mjs';
import { frameTile, tileGrid, tileBox, baseOf } from '../gates/tile.mjs';
import { writeReceipt } from '../lib/receipt.mjs';

const args = process.argv.slice(2);
const SB = args.find((a) => !a.startsWith('--'));
const SELFTEST = args.includes('--self-test');
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
if (!SELFTEST && (!SB || !fs.existsSync(SB))) {
  console.error('usage: panels <STORYBOARD.md> [--out /tmp/panels]');
  console.error('       template: docs/CRAFT/STORYBOARD-TEMPLATE.md');
  process.exit(2);
}

// ── the shot vocabulary → how much of the frame the subject occupies ───────────────────────────────
// This is the whole reason the file exists. The template already glosses its own terms in exactly these
// terms, "wide (establishing, the frame is mostly empty)", "medium (the object arrives and owns the
// middle third)", so the box is sized to what the words already mean rather than to a new convention.
// A `shot:` value is often a sentence ("medium, the caret dead centre with the frame deliberately empty
// around it"), so the keyword is found inside it and the rest is kept and shown as written.
const SHOTS = [
  [/\b(macro|extreme[\s-]?close(?:[\s-]?up)?|ecu)\b/i, 'extreme close', 0.94, 0.90],
  [/\b(close(?:[\s-]?up)?|cu)\b/i, 'close', 0.78, 0.72],
  [/\b(extreme[\s-]?wide|very[\s-]?wide|establishing|ews)\b/i, 'extreme wide', 0.20, 0.16],
  [/\b(wide|ws|long)\b/i, 'wide', 0.34, 0.28],
  [/\b(medium|mid|full|ms)\b/i, 'medium', 0.55, 0.48],
];
const DEFAULT_SHOT = SHOTS.find((s) => s[1] === 'medium');
const readShot = (raw) => {
  if (!raw) return { kind: 'medium', sx: DEFAULT_SHOT[2], sy: DEFAULT_SHOT[3], note: '', why: 'missing' };
  for (const [re, kind, sx, sy] of SHOTS) {
    if (re.test(raw)) return { kind, sx, sy, note: raw.replace(re, '').replace(/^[\s,(–, -]+|[\s,)]+$/g, '').trim(), why: 'named' };
  }
  return { kind: 'medium', sx: DEFAULT_SHOT[2], sy: DEFAULT_SHOT[3], note: raw.trim(), why: 'unknown' };
};

// ── where the subject sits, when the plan says ─────────────────────────────────────────────────────
// `shot:` sizes the box; nothing in the contract positions it. Centring every box by default would be a
// convention masquerading as a finding: a reviewer would read "the bottom third is empty" off a panel
// whose bottom third is empty because this file put it there. So placement words are read out of the
// prose when they are there, and a panel that has none SAYS it has none. An unread placement is a fact
// about the storyboard, and it is the one a reviewer must know before trusting the blocking.
const PLACE = [
  [/\b(?:on the |the )?left(?:\s+(?:half|third|side|two[\s-]?thirds))?\b/i, 'left'],
  [/\b(?:on the |the )?right(?:\s+(?:half|third|side|two[\s-]?thirds))?\b/i, 'right'],
  [/\b(?:lower|bottom)\s+(?:half|third|two[\s-]?thirds|edge)\b/i, 'bottom'],
  [/\b(?:upper|top)\s+(?:half|third|two[\s-]?thirds|edge)\b/i, 'top'],
  [/\b(?:dead )?cent(?:re|er)(?:d|red)?\b/i, 'centre'],
];
// The FIRST placement word wins. In "a caret blinking on the left, the right half empty" both halves
// are named and only one holds the subject; the one named first is it.
const readPlace = (...sources) => {
  for (const src of sources) {
    if (!src) continue;
    let best = null;
    for (const [re, where] of PLACE) {
      const m = re.exec(src);
      if (m && (!best || m.index < best.at)) best = { where, at: m.index };
    }
    if (best) {
      const axis = best.where === 'top' || best.where === 'bottom' ? 'vertical'
        : best.where === 'centre' ? 'both' : 'horizontal';
      return { where: best.where, axis, stated: true };
    }
  }
  return { where: 'centre', axis: 'none', stated: false };
};
// What the panel says about its own placement, because the half it did not read is the half a reviewer
// would otherwise mistake for a decision. `onefilm` states a left/right split on every beat and states
// nothing vertical, so the empty bottom of its panels is this file talking, not the plan.
const placeLabel = (p) => p.axis === 'none' ? 'placement not stated · centred here by default'
  : p.axis === 'both' ? 'centred, as the plan states'
  : p.axis === 'horizontal' ? `placed ${p.where} · nothing vertical stated`
  : `placed ${p.where} · nothing horizontal stated`;

// ── `layout:` → a coarse region of the frame ───────────────────────────────────────────────────────
// The contract asks for a region and a frame share, never coordinates, because that is the level a
// reviewer can approve. So this reads exactly that much and refuses to invent the rest.
//
// AREA IS WIDTH TIMES HEIGHT. Nothing else. Mis-measuring a picture's size is what killed the
// `visual-vocabulary` gate: its helper squared a layer that declared one axis, so a 590x18 rule scored
// as 590x590 and a hairline was credited with a tenth of the frame. The rule here is therefore that a
// share on ONE axis stays on that axis and produces NO area at all, and the panel says which axis was
// stated. `--self-test` asserts both halves against that same hairline.
const R = (name, x, y, w, h) => ({ name, x, y, w, h, area: w * h });
const REGIONS = [
  [/\b(?:lower|bottom)\s+two[\s-]?thirds\b/i, R('lower two thirds', 0, 1 / 3, 1, 2 / 3)],
  [/\b(?:upper|top)\s+two[\s-]?thirds\b/i, R('upper two thirds', 0, 0, 1, 2 / 3)],
  [/\bleft\s+two[\s-]?thirds\b/i, R('left two thirds', 0, 0, 2 / 3, 1)],
  [/\bright\s+two[\s-]?thirds\b/i, R('right two thirds', 1 / 3, 0, 2 / 3, 1)],
  [/\b(?:top|upper)[\s-]left\b/i, R('top left quarter', 0, 0, 0.5, 0.5)],
  [/\b(?:top|upper)[\s-]right\b/i, R('top right quarter', 0.5, 0, 0.5, 0.5)],
  [/\b(?:bottom|lower)[\s-]left\b/i, R('bottom left quarter', 0, 0.5, 0.5, 0.5)],
  [/\b(?:bottom|lower)[\s-]right\b/i, R('bottom right quarter', 0.5, 0.5, 0.5, 0.5)],
  [/\b(?:lower|bottom)\s+half\b/i, R('lower half', 0, 0.5, 1, 0.5)],
  [/\b(?:upper|top)\s+half\b/i, R('upper half', 0, 0, 1, 0.5)],
  [/\bleft\s+half\b/i, R('left half', 0, 0, 0.5, 1)],
  [/\bright\s+half\b/i, R('right half', 0.5, 0, 0.5, 1)],
  [/\b(?:lower|bottom)\s+third\b/i, R('lower third', 0, 2 / 3, 1, 1 / 3)],
  [/\b(?:upper|top)\s+third\b/i, R('upper third', 0, 0, 1, 1 / 3)],
  [/\bleft\s+third\b/i, R('left third', 0, 0, 1 / 3, 1)],
  [/\bright\s+third\b/i, R('right third', 2 / 3, 0, 1 / 3, 1)],
  // A "middle third" holding type is the horizontal band, not a column. Named here rather than guessed
  // per storyboard, so every panel reads it the same way and the label says which third it drew.
  [/\b(?:middle|centre|center)\s+third\b/i, R('middle third', 0, 1 / 3, 1, 1 / 3)],
];
// Full-bleed is a fallback, never a winner. It describes the ground reaching the edges, so a narrower
// region named in the same line is the one the subject actually sits in ("full-bleed, type filling the
// middle third"). Taking full-bleed first would draw the whole frame and say nothing.
const FULL = [/\bfull[\s-]?bleed\b|\bfull[\s-]?frame\b|\bedge[\s-]to[\s-]edge\b|\bwhole frame\b/i, R('full frame', 0, 0, 1, 1)];
// A clause that says a region is EMPTY is a statement about what is not there. "lower half deliberately
// empty" must not tint the lower half as the subject's region, so those clauses are dropped before any
// region or placement word is read out of the line.
const NEGATED = /\bempt(?:y|ied)\b|\bnothing\b|\bno one\b|\bbare\b|\bclear of\b|\bfree of\b/i;
const clausesOf = (raw) => String(raw || '').split(/[,;·]| and (?=[a-z])/).map((s) => s.trim()).filter((s) => s && !NEGATED.test(s));
// The subject OWNS the region, or merely sits inside it. "the UI fills the lower two thirds" sizes the
// box to the region; "the claim sits top-left" keeps the size `shot:` gave it and only moves it.
const FILLS = /\bfills?\b|\bfilling\b|\bowns?\b|\bspans?\b|\bcovers?\b|\bacross\b|\bfull[\s-]?bleed\b/i;

// A percentage on ONE axis is a width or a height, and it is never an area. See the note above.
const readShare = (text) => {
  const axis = /(\d+(?:\.\d+)?)\s*%\s*(?:of\s+(?:the\s+)?)?(?:frame\s+)?(width|height)\b/i.exec(text);
  // Match the axis word WHOLE. Testing it for the letter h is how "width" also set the height, which is
  // the one-axis-becomes-two failure this whole section exists to avoid.
  if (axis) {
    const isW = axis[2].toLowerCase() === 'width';
    return { w: isW ? +axis[1] / 100 : null, h: isW ? null : +axis[1] / 100, area: null, said: `${axis[1]}% of ${axis[2].toLowerCase()}` };
  }
  const whole = /(\d+(?:\.\d+)?)\s*%\s*of\s+(?:the\s+)?frame\b/i.exec(text);
  if (whole) return { w: null, h: null, area: +whole[1] / 100, said: `${whole[1]}% of the frame` };
  return { w: null, h: null, area: null, said: null };
};

const readLayout = (raw) => {
  const clauses = clausesOf(raw);
  const text = clauses.join(', ');
  let best = null;
  for (const [re, region] of REGIONS) {
    const m = re.exec(text);
    if (m && (!best || m.index < best.at)) best = { region, at: m.index };
  }
  if (!best && FULL[0].test(text)) best = { region: FULL[1], at: 0 };
  return { raw: raw ? raw.trim() : '', stated: !!raw, text, region: best ? best.region : null,
    fills: !!best && FILLS.test(text), share: readShare(text),
    // A line can say WHERE without saying HOW MUCH ("mark centre, wordmark under it"). That is half an
    // answer, not no answer, and the two deserve different words in the report.
    placed: readPlace(text).stated };
};

// What the panel says it read out of `layout:`. An unread line is the fact a reviewer most needs, so it
// is said out loud rather than left to look like a decision this file made.
const pct = (v) => `${Math.round(v * 100)}%`;
const layoutLabel = (lay) => {
  if (!lay.stated) return 'layout not stated';
  const bits = [];
  // Kept short on purpose. This label sits in a narrow column beside `camera:`, and a portrait panel
  // wraps anything longer into the line below it.
  if (lay.region) bits.push(`region: ${lay.region.name} · ${pct(lay.region.area)}${lay.fills ? ' · filled' : ' · subject inside'}`);
  if (lay.share.said) bits.push(lay.share.area != null ? lay.share.said : `${lay.share.said} only`);
  return bits.length ? bits.join(' · ') : 'no region read from the layout line';
};

// The share of the frame a drawn box really takes: width times height, each as a fraction. The one
// piece of arithmetic this file must not get wrong.
const shareOf = (w, h, fw, fh) => (w / fw) * (h / fh);

if (SELFTEST) {
  const ok = [];
  const is = (name, got, want) => { const pass = Math.abs(got - want) < 1e-3; ok.push([pass, name, got, want]); };
  // The hairline that killed `visual-vocabulary`: a 590x18 rule in a 1920x1080 frame is half a percent
  // of it, not the 16.8% a squared width would claim.
  is('hairline 590x18 share', shareOf(590, 18, 1920, 1080), 0.00512);
  ok.push([shareOf(590, 18, 1920, 1080) < 0.01, 'hairline is under 1% of the frame', shareOf(590, 18, 1920, 1080), '<0.01']);
  ok.push([Math.abs(shareOf(590, 18, 1920, 1080) - (590 * 590) / (1920 * 1080)) > 0.1, 'hairline is NOT the squared width', 'w*h', 'not w*w']);
  is('lower half area', readLayout('the UI fills the lower half').region.area, 0.5);
  is('lower two thirds area', readLayout('the UI fills the lower two thirds').region.area, 2 / 3);
  is('top left quarter area', readLayout('the claim sits top-left against it').region.area, 0.25);
  ok.push([readLayout('the number owns the centre at 60% of frame width').share.area === null,
    'one axis yields no area', 'null', 'null']);
  is('one axis keeps its axis', readLayout('the number owns the centre at 60% of frame width').share.w, 0.6);
  ok.push([readLayout('the number owns the centre at 60% of frame width').share.h === null,
    'a stated width leaves the height unstated', readLayout('the number owns the centre at 60% of frame width').share.h, 'null']);
  ok.push([readLayout('the mark at 40% of frame height').share.w === null,
    'a stated height leaves the width unstated', readLayout('the mark at 40% of frame height').share.w, 'null']);
  is('a stated height is a height', readLayout('the mark at 40% of frame height').share.h, 0.4);
  ok.push([readLayout('mark centre, lower half deliberately empty').region === null,
    'an empty region is not the subject region', 'null', 'null']);
  is('full frame is the fallback only', readLayout('full-bleed, type filling the middle third').region.area, 1 / 3);
  let bad = 0;
  for (const [pass, name, got, want] of ok) { if (!pass) bad++; console.log(`  ${pass ? '✓' : '✗'} ${name}${pass ? '' : `  got ${got}, want ${want}`}`); }
  console.log(bad ? `\n  ${bad} assertion(s) failed\n` : `\n  ${ok.length} assertion(s) passed\n`);
  process.exit(bad ? 1 : 0);
}

const sb = parseStoryboard(fs.readFileSync(SB, 'utf8'));
if (!sb.beats.length) { console.error(`✗ no beats in ${SB}, beats are "## Beat N: Title (0s-6s)" headings.`); process.exit(1); }
const { beats, guessed } = timeline(sb);

const NAME = baseOf(SB).replace(/\.storyboard$/i, '');
const OUTDIR = path.join(flag('--out', '/tmp/panels'), NAME);
fs.rmSync(OUTDIR, { recursive: true, force: true });
fs.mkdirSync(OUTDIR, { recursive: true });

// ── the canvas ─────────────────────────────────────────────────────────────────────────────────────
const fmt = /(\d+)\s*[x×]\s*(\d+)/.exec(sb.format || '');
const W = fmt ? +fmt[1] : 1920, H = fmt ? +fmt[2] : 1080;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const g = gcd(W, H);
const ASPECT = `${W / g}:${H / g}`;

const INK = '#111111', GREY = '#bdbdbd', SLOT = '#e8e8e8', MUTED = '#7a7a7a', FAINT = '#a8a8a8', RED = '#b00020';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[, –]/g, ',');
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

// The drawn frame, inset so the panel can carry a slate above it and a caption below without either
// eating picture space. The inset keeps the film's real ratio: a panel whose frame is not the shape of
// the film would lie about every placement inside it.
// The frame gives up a little height when the plan states `layout:` or `style:`, because those lines
// go UNDER it and a portrait panel has only about a sixth of its height down there, most of it already
// spent by `becomes:`. Scaling the frame keeps the film's ratio exactly (the height is derived from the
// width), and a storyboard that states neither field is drawn at the size it always was.
const FRAME_SCALE = beats.some((b) => b.layout || b.style) ? 0.66 : 0.72;
const FRAME_W = Math.round(W * FRAME_SCALE), FRAME_H = Math.round(FRAME_W * H / W);
const FRAME_X = Math.round((W - FRAME_W) / 2), FRAME_Y = Math.round(H * 0.115);
const PAD = Math.round(FRAME_W * 0.045);

// rough line count for a block of text at a size, so the copy stack advances like real copy does
const linesOf = (text, size, box) => Math.max(1, Math.ceil(text.length * size * 0.5 / box));

const layers = [];
const rows = [];
const extras = [];

for (const b of beats) {
  const start = b.start, dur = Math.max(0.4, (b.end ?? b.start + 2) - b.start);
  const hold = { start: +start.toFixed(2), duration: +dur.toFixed(2), exitDur: 0, enterDur: 0 };
  const shot = readShot(b.shot);
  const hasPic = !!(b.picture || b.blueprint);

  // ── the slate ────────────────────────────────────────────────────────────────────────────────────
  layers.push({ type: 'text', text: esc(`${b.i + 1} · ${b.name}`), x: Math.round(W * 0.04), y: Math.round(H * 0.035),
    w: Math.round(W * 0.55), size: Math.round(H * 0.030), weight: 700, color: INK, align: 'left', ...hold });
  layers.push({ type: 'text',
    // The shot's own share of the frame is printed next to its name. Without it, a panel whose box was
    // sized by `layout:` cannot be compared against the shot the same plan declared, and the override
    // reads as agreement.
    text: esc(`${start.toFixed(1)}s to ${(start + dur).toFixed(1)}s · ${dur.toFixed(1)}s · ${shot.kind.toUpperCase()}${shot.why === 'missing' ? ' (assumed)' : ` ${pct(shot.sx * shot.sy)}`}${b.type ? ' · ' + b.type : ''}`),
    x: Math.round(W * 0.41), y: Math.round(H * 0.038), w: Math.round(W * 0.55), size: Math.round(H * 0.024),
    weight: 500, color: shot.why === 'missing' ? RED : MUTED, align: 'right', ...hold });
  if (shot.note) layers.push({ type: 'text', text: esc(clip(`shot: ${shot.note}`, 150)),
    x: Math.round(W * 0.04), y: Math.round(H * 0.076), w: Math.round(W * 0.92), size: Math.round(H * 0.020),
    weight: 400, color: FAINT, align: 'left', ...hold });

  // ── the frame, drawn, so emptiness inside it is visible as emptiness ─────────────────────────────
  layers.push({ type: 'rect', x: FRAME_X, y: FRAME_Y, w: FRAME_W, h: FRAME_H, radius: 2,
    bg: '#fcfcfc', border: `2px solid ${GREY}`, ...hold });

  // ── the region the layout names, drawn under everything it contains ──────────────────────────────
  // Tinted, dotted and labelled, so a reviewer sees the part of the frame the beat committed to and
  // the part it left alone. Skipped when the subject FILLS the region, because then the region and the
  // subject box are the same rectangle and drawing both twice says nothing.
  const lay = readLayout(b.layout);
  const reg = lay.region;
  if (reg && !lay.fills) {
    layers.push({ type: 'rect', x: FRAME_X + Math.round(FRAME_W * reg.x), y: FRAME_Y + Math.round(FRAME_H * reg.y),
      w: Math.round(FRAME_W * reg.w), h: Math.round(FRAME_H * reg.h), radius: 2,
      bg: '#f4f4f4', border: `2px dotted ${FAINT}`, ...hold });
  }

  // ── the subject, at the size the shot says, in the region the layout names ───────────────────────
  // Precedence, and each step is a field being more specific than the one under it: a region the
  // subject FILLS sizes the box outright, a stated per-axis share sizes that axis only, and `shot:`
  // sizes whatever is left. A share on one axis never touches the other, so nothing here can turn a
  // width into an area.
  const bw = Math.round(FRAME_W * (reg && lay.fills ? reg.w : lay.share.w ?? shot.sx));
  const bh = Math.round(FRAME_H * (reg && lay.fills ? reg.h : lay.share.h ?? shot.sy));
  // `placement` FIRST, because a field whose entire job is to say where things go should outrank a
  // placement word that happens to appear in a prose description. It was not read at all until now: a
  // storyboard stating "HUD top-left" on every beat still drew seven centred boxes and labelled them
  // "placement not stated", which is a declaration accepted and ignored. `layout:` joins it at the
  // front, because a region is the same declaration written coarser.
  const place = readPlace(lay.text, b.placement, b.picture, b.shot);
  const EDGE = 0.06;
  let bx = FRAME_X + Math.round((FRAME_W - bw) / 2), by = FRAME_Y + Math.round((FRAME_H - bh) / 2);
  if (place.where === 'left') bx = FRAME_X + Math.round(FRAME_W * EDGE);
  if (place.where === 'right') bx = FRAME_X + FRAME_W - bw - Math.round(FRAME_W * EDGE);
  if (place.where === 'top') by = FRAME_Y + Math.round(FRAME_H * EDGE);
  if (place.where === 'bottom') by = FRAME_Y + FRAME_H - bh - Math.round(FRAME_H * EDGE);
  // A region wins the position outright: it is the coarser, more deliberate statement. The box is
  // centred in it and NEVER resized to fit, so a `shot:` too big for its region overflows on the panel
  // and is reported. That disagreement is a finding about the plan, not a thing to quietly correct.
  if (reg) {
    bx = FRAME_X + Math.round(FRAME_W * (reg.x + reg.w / 2)) - Math.round(bw / 2);
    by = FRAME_Y + Math.round(FRAME_H * (reg.y + reg.h / 2)) - Math.round(bh / 2);
    bx = Math.min(Math.max(bx, FRAME_X), FRAME_X + FRAME_W - bw);
    by = Math.min(Math.max(by, FRAME_Y), FRAME_Y + FRAME_H - bh);
  }
  layers.push({ type: 'rect', x: bx, y: by, w: bw, h: bh, radius: 4,
    bg: hasPic ? SLOT : 'transparent', border: hasPic ? `2px solid ${GREY}` : `3px dashed ${RED}`, ...hold });
  const capt = b.picture || (b.blueprint ? `blueprint: ${b.blueprint}` : 'NO PICTURE NAMED · this beat is type only');
  layers.push({ type: 'text', text: esc(clip(capt, 230)), x: bx + 18, y: by + 16, w: bw - 36,
    size: Math.round(H * 0.020), weight: 400, color: hasPic ? MUTED : RED, align: 'left', ...hold });

  // ── the on-screen copy, at plausible scale, over the picture the way copy really sits ────────────
  // First line large because a first line is large. The point is not the wording, it is the MASS: a
  // beat holding two seconds and one character is a hole, and prose never reads as one.
  let cy = FRAME_Y + Math.round(FRAME_H * 0.06);
  const copyBox = FRAME_W - PAD * 2;
  b.onscreen.slice(0, 4).forEach((line, j) => {
    const big = j === 0;
    const txt = esc(clip(line, 90));
    const size = Math.round(FRAME_H * (big ? 0.105 : 0.042));
    layers.push({ type: 'text', text: txt, x: FRAME_X + PAD, y: cy, w: copyBox, size,
      weight: big ? 700 : 400, color: big ? INK : MUTED, align: 'left', ls: big ? '-0.02em' : '0', ...hold });
    cy += Math.round(size * 1.16 * linesOf(txt, size, copyBox)) + (big ? 12 : 6);
  });

  // ── camera and change, under the frame ───────────────────────────────────────────────────────────
  const underY = FRAME_Y + FRAME_H + Math.round(H * 0.018);
  layers.push({ type: 'text', text: esc(clip(`camera: ${b.camera || 'not named'}`, 50)),
    x: FRAME_X, y: underY, w: Math.round(FRAME_W * 0.52), size: Math.round(H * 0.021),
    weight: 500, color: b.camera ? MUTED : FAINT, align: 'left', ...hold });
  // The region label replaces the placement one when a region was read, because it is the same
  // question answered better: a named region says where AND how much.
  const readLayoutHere = !!reg || !!lay.share.said;
  layers.push({ type: 'text', text: esc(clip(readLayoutHere ? layoutLabel(lay) : placeLabel(place), 90)),
    x: FRAME_X + Math.round(FRAME_W * 0.54), y: underY, w: Math.round(FRAME_W * 0.46),
    size: Math.round(H * 0.021), weight: 400, color: readLayoutHere || place.stated ? MUTED : FAINT, align: 'right', ...hold });
  const becomesTxt = esc(clip(`becomes: ${b.becomes || 'no change named'}`, 150));
  const becomesY = FRAME_Y + FRAME_H + Math.round(H * 0.050), becomesSize = Math.round(H * 0.021);
  layers.push({ type: 'text', text: becomesTxt,
    x: FRAME_X, y: becomesY, w: FRAME_W, size: becomesSize,
    weight: 400, color: b.becomes ? INK : RED, align: 'left', ...hold });
  // `layout:` and `style:` in the author's own words, under the drawing they produced. The region label
  // above is this file's READING of the layout line; the line itself belongs on the panel so a reviewer
  // can see when the reading is thinner than the plan. Style is WORDS here and nothing else: a grey
  // panel cannot show a treatment, and one that tried would be judging the look at the one stop that
  // deliberately refuses to.
  // Held aside rather than pushed, because the scene has a layer ceiling and a 13-beat storyboard sits
  // three layers under it. What gets spent on these lines is decided once, after every beat is known.
  //
  // Stacked from where `becomes:` actually ENDS, never at a fixed offset. A portrait panel wraps that
  // line to three, so a fixed offset would print the layout over the top of it, and a line under a line
  // is the one thing a blocking sheet must not be. A line that will not fit below the canvas is not
  // drawn at all and is named in the report instead of half-appearing off the bottom edge.
  const EX_X = Math.round(W * 0.04), EX_W = Math.round(W * 0.92), EX_SIZE = Math.round(H * 0.019);
  const stackTop = becomesY + Math.round(becomesSize * 1.16 * linesOf(becomesTxt, becomesSize, FRAME_W)) + Math.round(H * 0.008);
  const stack = (spec) => {
    const out = [];
    let y = stackTop;
    for (const [text, weight, color] of spec) {
      const txt = esc(clip(text, 130));
      const h = Math.round(EX_SIZE * 1.16 * linesOf(txt, EX_SIZE, EX_W));
      if (y + h > H - Math.round(H * 0.01)) return null;
      out.push({ type: 'text', text: txt, x: EX_X, y, w: EX_W, size: EX_SIZE, weight, color, align: 'left', ...hold });
      y += h + 6;
    }
    return out;
  };
  if (lay.stated || b.style) {
    const two = [lay.stated ? [`layout: ${lay.raw}`, 400, MUTED] : null, b.style ? [`style: ${b.style}`, 500, INK] : null].filter(Boolean);
    const one = [[two.map((t) => t[0]).join(' · '), 400, INK]];
    const twoLine = stack(two), oneLine = stack(one);
    extras.push({ name: b.name, full: twoLine || oneLine || [], combined: oneLine || [],
      squeezed: !twoLine && !!oneLine, dropped: !twoLine && !oneLine });
  }

  rows.push({ b, shot, place, lay, hasPic, start, dur,
    // The share of the frame this box really covers: its width times its height. Not the shot's nominal
    // size, because a region or a stated axis may have changed it.
    fill: shareOf(bw, bh, FRAME_W, FRAME_H),
    shotFill: shot.sx * shot.sy,
    sizedBy: reg && lay.fills ? 'the region' : lay.share.said ? 'the stated share' : 'shot',
    overflows: !!reg && !lay.fills && shareOf(bw, bh, FRAME_W, FRAME_H) > reg.area + 0.02,
    words: onScreenText(b.onscreen.join(' ')).split(/\s+/).filter(Boolean).length });
}

// ── spend what is left of the layer budget on the layout and style lines ───────────────────────────
// `formats/scene/schema.json` caps a scene at 120 layers, and the longest storyboard here already
// builds 117. So these lines are fitted to the room that is left: both, or one line carrying both, or
// neither and a loud line in the report saying where they went. A panel silently missing a field it was
// asked to show is the failure this whole join exists to end.
const LAYER_CAP = 120;
const spend = (key) => extras.reduce((n, e) => n + e[key].length, 0);
let extrasMode = 'full';
if (layers.length + spend('full') > LAYER_CAP) extrasMode = layers.length + spend('combined') > LAYER_CAP ? 'none' : 'combined';
if (extrasMode !== 'none') for (const e of extras) layers.push(...e[extrasMode]);

const total = +Math.max(...beats.map((b) => b.end ?? 0)).toFixed(2);
const scene = {
  module: 'scene',
  theme: 'vawe',
  aspect: ASPECT,
  duration: total,
  authoringNote: `PANELS of ${path.basename(SB)}: blocking only. Grey by design; judge WHERE things sit and HOW BIG they are, never the look.`,
  // WAIVE ONLY CODES A GATE STILL EMITS, AND KEY THE REASON BY CODE. This block used to carry
  // 'no-visual-vocabulary', which `waiver-drift.mjs:49-53` classifies as RETIRED, so every generated
  // panel scene self-inflicted a DEAD WAIVER finding on the census the repo reads as evidence. Its
  // `_why` was also keyed 'panels' rather than per-code, which is not the shape `author-check.mjs:74-80`
  // requires, so these scenes would have failed the always-on half on their own waivers.
  authoring: (() => {
    const allow = ['dead-air', 'ends-on-nothing', 'plain-slideshow', 'no-continuous-object',
      'no-continuous-object-inferred', 'static-bg', 'overlap', 'contrast', 'safe'];
    const why = 'Generated blocking panels, never a deliverable. Waived by construction, not by an author arguing themselves into it.';
    return { allow, _why: Object.fromEntries(allow.map((c) => [c, why])) };
  })(),
  layers,
  bg: [{ t: 0, preset: 'plain', from: 0, to: total }],
};
// The scene has to live inside the repo: the render server serves core/, themes/, formats/, assets/
// and .vawe-data/ only, so a scene written to /tmp boots to a 404. The pictures still go to /tmp; this
// is scratch, gitignored, and overwritten every run.
const SCENE_JSON = path.join('.vawe-data', 'scenes', `panels-${NAME}.json`);
fs.mkdirSync(path.dirname(SCENE_JSON), { recursive: true });
fs.writeFileSync(SCENE_JSON, JSON.stringify(scene, null, 2) + '\n');

// ── shoot one still per beat, then tile ────────────────────────────────────────────────────────────
const page = await openScene(SCENE_JSON, { scale: 1, fps: 30 });
const shots = [];
for (const r of rows) {
  const f = path.join(OUTDIR, `beat-${String(r.b.i + 1).padStart(2, '0')}.png`);
  await page.grab(r.start + r.dur / 2, f);
  shots.push(f);
}
await page.close();

const { tw, th } = tileBox(W >= H);
// No tile label: the panel already carries its own slate, and drawing the beat name twice puts an
// opaque box over the shot line the slate is there to show.
const tiles = shots.map((f, i) => frameTile(f, 0, path.join(OUTDIR, `.tile-${i}.png`), { tw, th }));
const SHEET = path.join(path.dirname(OUTDIR), `${NAME}.png`);
tileGrid(tiles, { cols: Math.min(3, tiles.length), tw, th, out: SHEET });
for (const t of tiles) fs.unlinkSync(t);

writeReceipt('panels', SB, { sheet: SHEET, beats: rows.length, dir: OUTDIR });

// ── the report ─────────────────────────────────────────────────────────────────────────────────────
console.log(`\n  PANELS · ${path.basename(SB)} · ${rows.length} beat(s) at ${W}x${H} (${ASPECT})`);
console.log('\n  beat                          span        shot            subject  placement  region                copy');
for (const r of rows) {
  console.log(`  ${(r.b.i + 1 + '. ' + r.b.name).slice(0, 28).padEnd(30)}`
    + `${(r.start.toFixed(1) + '-' + (r.start + r.dur).toFixed(1) + 's').padEnd(12)}`
    + `${(r.shot.why === 'missing' ? 'medium (assumed)' : r.shot.kind).padEnd(16)}`
    + `${(Math.round(r.fill * 100) + '%').padStart(6)}   `
    + `${(r.place.stated ? r.place.where : '·').padEnd(11)}`
    + `${(r.lay.region ? `${r.lay.region.name} ${pct(r.lay.region.area)}` : '·').padEnd(22)}`
    + `${r.words} word(s)${r.hasPic ? '' : '   NO PICTURE'}`);
}

// STYLE, BEAT BY BEAT, AS A COLUMN OF ITS OWN. The value of the field is the comparison: it exists so
// that treatment is decided per beat instead of once for the whole film, and five lines stacked is the
// only view in which "these are all the same" is obvious. Nothing grades the prose, and nothing should.
console.log('\n  style, beat by beat. They should not all read alike:');
for (const r of rows) {
  console.log(`  ${(r.b.i + 1 + '. ' + r.b.name).slice(0, 28).padEnd(30)}${r.b.style ? clip(r.b.style, 84) : 'not stated'}`);
}

const noShot = rows.filter((r) => r.shot.why === 'missing').map((r) => r.b.name);
const oddShot = rows.filter((r) => r.shot.why === 'unknown').map((r) => `${r.b.name} ("${r.b.shot}")`);
const noPic = rows.filter((r) => !r.hasPic).map((r) => r.b.name);
console.log('');
if (noShot.length) console.log(`  ~ ${noShot.length} beat(s) name no \`shot:\`, drawn as medium: ${noShot.join(', ')}. A panel can only block what the plan states.`);
if (oddShot.length) console.log(`  ~ ${oddShot.length} beat(s) name a shot this reader does not know, drawn as medium: ${oddShot.join(', ')}.`);
if (noPic.length) console.log(`  ~ ${noPic.length} beat(s) name no picture; they are the red dashed boxes. A type-only beat is what that looks like.`);
if (guessed.length) console.log(`  ~ ${guessed.length} span(s) were inferred, not stated: ${guessed.join(', ')}.`);
const noPlace = rows.filter((r) => !r.place.stated && !r.lay.region).map((r) => r.b.name);
if (noPlace.length) console.log(`  ~ ${noPlace.length} beat(s) place nothing in the frame, so their box is centred by default: ${noPlace.join(', ')}. Where the empty part of those panels falls is this tool's convention, not your plan.`);

// ── what `layout:` and `style:` said, and what they left unsaid ────────────────────────────────────
const noLay = rows.filter((r) => !r.lay.stated).map((r) => r.b.name);
const unreadLay = rows.filter((r) => r.lay.stated && !r.lay.region && !r.lay.share.said && !r.lay.placed).map((r) => r.b.name);
const noShare = rows.filter((r) => r.lay.stated && !r.lay.region && !r.lay.share.said && r.lay.placed).map((r) => r.b.name);
const overflow = rows.filter((r) => r.overflows);
const noStyle = rows.filter((r) => !r.b.style).map((r) => r.b.name);
const styles = rows.map((r) => (r.b.style || '').toLowerCase().trim()).filter(Boolean);
const regions = rows.map((r) => r.lay.region && r.lay.region.name).filter(Boolean);
if (noLay.length) console.log(`  ~ ${noLay.length} beat(s) state no \`layout:\`, so nothing but \`shot:\` decided the box: ${noLay.join(', ')}. Composition then gets settled at JSON time, one layer at a time.`);
if (unreadLay.length) console.log(`  ~ ${unreadLay.length} beat(s) state a \`layout:\` this reader found no region in: ${unreadLay.join(', ')}. Name a coarse region (a half, a third, a quarter) or a share of the frame, never coordinates.`);
if (noShare.length) console.log(`  ~ ${noShare.length} beat(s) say WHERE the subject sits and not HOW MUCH of the frame it takes: ${noShare.join(', ')}. Their box is the size \`shot:\` gave it, so the mass on those panels is not your decision.`);
for (const r of overflow) console.log(`  ~ ${r.b.name}: the shot fills ${pct(r.fill)} of the frame and \`layout:\` gives it ${pct(r.lay.region.area)}. The box on the panel overflows its own region, so one of the two lines is wrong.`);
// A NAMED shot that `layout:` then resized is a decision overruled, and it must be said. Silent
// substitution is the failure this repo has been bitten by most; a panel that quietly drew a third of
// the frame where the plan said "extreme wide" would read as the plan agreeing with itself.
for (const r of rows.filter((x) => x.sizedBy !== 'shot' && x.shot.why === 'named' && Math.abs(x.fill - x.shotFill) > 0.08)) {
  console.log(`  ~ ${r.b.name}: \`shot:\` says ${r.shot.kind} (${pct(r.shotFill)} of the frame) and \`layout:\` says ${pct(r.fill)}. The panel drew ${r.sizedBy}, because it is the more specific line. Settle the two.`);
}
if (extrasMode === 'combined') console.log(`  ~ this storyboard is close to the ${LAYER_CAP}-layer scene ceiling, so each panel carries its \`layout:\` and \`style:\` on ONE line instead of two.`);
if (extrasMode === 'none') console.log(`  ~ this storyboard is at the ${LAYER_CAP}-layer scene ceiling, so the \`layout:\` and \`style:\` lines are NOT on the panels. The drawn regions still are, and both fields are listed above. Split the storyboard to get them back.`);
const squeezed = extras.filter((e) => e.squeezed).map((e) => e.name);
const droppedEx = extras.filter((e) => e.dropped).map((e) => e.name);
if (extrasMode !== 'none' && squeezed.length) console.log(`  ~ ${squeezed.length} panel(s) had room for one line under the frame, not two, so their layout and style share it: ${squeezed.join(', ')}.`);
if (extrasMode !== 'none' && droppedEx.length) console.log(`  ~ ${droppedEx.length} panel(s) had no room under the frame for their layout and style lines, so those are NOT drawn: ${droppedEx.join(', ')}. Shorten \`becomes:\`, or read them from the list above.`);
if (noStyle.length) console.log(`  ~ ${noStyle.length} beat(s) state no \`style:\`: ${noStyle.join(', ')}. An unstated treatment is inherited, and a film whose treatment is decided once reads as one long shot.`);
if (styles.length > 1 && new Set(styles).size === 1) console.log(`  ~ every beat declares the SAME style ("${clip(styles[0], 60)}"). That is one treatment for the whole runtime, which is the thing the field exists to prevent.`);
if (regions.length > 1 && new Set(regions).size === 1) console.log(`  ~ every beat puts its subject in the same region (${regions[0]}). The frame is being divided once and reused, so every cut lands on the same composition.`);

console.log(`\n  sheet:  ${SHEET}`);
console.log(`  stills: ${OUTDIR}/beat-NN.png`);
console.log('\n  READ IT. These are BLOCKING, not drawing: where things sit, how big they are, and how the');
console.log('  beats compare. They cannot show motion (that is `make animatic`) and they cannot show the');
console.log('  look (that is `make styleframes`). They are only ever as good as the storyboard.\n');
