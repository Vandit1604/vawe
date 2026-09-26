import fs from 'node:fs';
import { onScreenText } from '../lib/text.mjs';
import path from 'node:path';
import { parseStoryboard, timeline } from './storyboard-parse.mjs';
import { openScene } from './scene-page.mjs';
import { frameTile, tileGrid, tileBox, baseOf } from '../../quality/gates/tile.mjs';
import { writeReceipt } from '../lib/receipt.mjs';

const args = process.argv.slice(2);
const SB = args.find((a) => !a.startsWith('--'));
const SELFTEST = args.includes('--self-test');
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
if (!SELFTEST && (!SB || !fs.existsSync(SB))) {
  console.error('usage: panels <STORYBOARD.md> [--out /tmp/panels]');
  console.error('       template: engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md');
  process.exit(2);
}

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

const PLACE = [
  [/\b(?:on the |the )?left(?:\s+(?:half|third|side|two[\s-]?thirds))?\b/i, 'left'],
  [/\b(?:on the |the )?right(?:\s+(?:half|third|side|two[\s-]?thirds))?\b/i, 'right'],
  [/\b(?:lower|bottom)\s+(?:half|third|two[\s-]?thirds|edge)\b/i, 'bottom'],
  [/\b(?:upper|top)\s+(?:half|third|two[\s-]?thirds|edge)\b/i, 'top'],
  [/\b(?:dead )?cent(?:re|er)(?:d|red)?\b/i, 'centre'],
];
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
const placeLabel = (p) => p.axis === 'none' ? 'placement not stated · centred here by default'
  : p.axis === 'both' ? 'centred, as the plan states'
  : p.axis === 'horizontal' ? `placed ${p.where} · nothing vertical stated`
  : `placed ${p.where} · nothing horizontal stated`;

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
  [/\b(?:middle|centre|center)\s+third\b/i, R('middle third', 0, 1 / 3, 1, 1 / 3)],
];
const FULL = [/\bfull[\s-]?bleed\b|\bfull[\s-]?frame\b|\bedge[\s-]to[\s-]edge\b|\bwhole frame\b/i, R('full frame', 0, 0, 1, 1)];
const NEGATED = /\bempt(?:y|ied)\b|\bnothing\b|\bno one\b|\bbare\b|\bclear of\b|\bfree of\b/i;
const clausesOf = (raw) => String(raw || '').split(/[,;·]| and (?=[a-z])/).map((s) => s.trim()).filter((s) => s && !NEGATED.test(s));
const FILLS = /\bfills?\b|\bfilling\b|\bowns?\b|\bspans?\b|\bcovers?\b|\bacross\b|\bfull[\s-]?bleed\b/i;

const readShare = (text) => {
  const axis = /(\d+(?:\.\d+)?)\s*%\s*(?:of\s+(?:the\s+)?)?(?:frame\s+)?(width|height)\b/i.exec(text);
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
    placed: readPlace(text).stated };
};

const pct = (v) => `${Math.round(v * 100)}%`;
const layoutLabel = (lay) => {
  if (!lay.stated) return 'layout not stated';
  const bits = [];
  if (lay.region) bits.push(`region: ${lay.region.name} · ${pct(lay.region.area)}${lay.fills ? ' · filled' : ' · subject inside'}`);
  if (lay.share.said) bits.push(lay.share.area != null ? lay.share.said : `${lay.share.said} only`);
  return bits.length ? bits.join(' · ') : 'no region read from the layout line';
};

const shareOf = (w, h, fw, fh) => (w / fw) * (h / fh);

if (SELFTEST) {
  const ok = [];
  const is = (name, got, want) => { const pass = Math.abs(got - want) < 1e-3; ok.push([pass, name, got, want]); };
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
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/–/g, ',')   // an en dash between clauses reads as a comma at panel scale;
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

const FRAME_SCALE = beats.some((b) => b.layout || b.style) ? 0.66 : 0.72;
const FRAME_W = Math.round(W * FRAME_SCALE), FRAME_H = Math.round(FRAME_W * H / W);
const FRAME_X = Math.round((W - FRAME_W) / 2), FRAME_Y = Math.round(H * 0.115);
const PAD = Math.round(FRAME_W * 0.045);

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
    text: esc(`${start.toFixed(1)}s to ${(start + dur).toFixed(1)}s · ${dur.toFixed(1)}s · ${shot.kind.toUpperCase()}${shot.why === 'missing' ? ' (assumed)' : ` ${pct(shot.sx * shot.sy)}`}${b.type ? ' · ' + b.type : ''}`),
    x: Math.round(W * 0.41), y: Math.round(H * 0.038), w: Math.round(W * 0.55), size: Math.round(H * 0.024),
    weight: 500, color: shot.why === 'missing' ? RED : MUTED, align: 'right', ...hold });
  if (shot.note) layers.push({ type: 'text', text: esc(clip(`shot: ${shot.note}`, 150)),
    x: Math.round(W * 0.04), y: Math.round(H * 0.076), w: Math.round(W * 0.92), size: Math.round(H * 0.020),
    weight: 400, color: FAINT, align: 'left', ...hold });

  // ── the frame, drawn, so emptiness inside it is visible as emptiness ─────────────────────────────
  layers.push({ type: 'rect', x: FRAME_X, y: FRAME_Y, w: FRAME_W, h: FRAME_H, radius: 2,
    bg: '#fcfcfc', border: `2px solid ${GREY}`, ...hold });

  const lay = readLayout(b.layout);
  const reg = lay.region;
  if (reg && !lay.fills) {
    layers.push({ type: 'rect', x: FRAME_X + Math.round(FRAME_W * reg.x), y: FRAME_Y + Math.round(FRAME_H * reg.y),
      w: Math.round(FRAME_W * reg.w), h: Math.round(FRAME_H * reg.h), radius: 2,
      bg: '#f4f4f4', border: `2px dotted ${FAINT}`, ...hold });
  }

  const bw = Math.round(FRAME_W * (reg && lay.fills ? reg.w : lay.share.w ?? shot.sx));
  const bh = Math.round(FRAME_H * (reg && lay.fills ? reg.h : lay.share.h ?? shot.sy));
  const place = readPlace(lay.text, b.placement, b.picture, b.shot);
  const EDGE = 0.06;
  let bx = FRAME_X + Math.round((FRAME_W - bw) / 2), by = FRAME_Y + Math.round((FRAME_H - bh) / 2);
  if (place.where === 'left') bx = FRAME_X + Math.round(FRAME_W * EDGE);
  if (place.where === 'right') bx = FRAME_X + FRAME_W - bw - Math.round(FRAME_W * EDGE);
  if (place.where === 'top') by = FRAME_Y + Math.round(FRAME_H * EDGE);
  if (place.where === 'bottom') by = FRAME_Y + FRAME_H - bh - Math.round(FRAME_H * EDGE);
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
  const readLayoutHere = !!reg || !!lay.share.said;
  layers.push({ type: 'text', text: esc(clip(readLayoutHere ? layoutLabel(lay) : placeLabel(place), 90)),
    x: FRAME_X + Math.round(FRAME_W * 0.54), y: underY, w: Math.round(FRAME_W * 0.46),
    size: Math.round(H * 0.021), weight: 400, color: readLayoutHere || place.stated ? MUTED : FAINT, align: 'right', ...hold });
  const becomesTxt = esc(clip(`becomes: ${b.becomes || 'no change named'}`, 150));
  const becomesY = FRAME_Y + FRAME_H + Math.round(H * 0.050), becomesSize = Math.round(H * 0.021);
  layers.push({ type: 'text', text: becomesTxt,
    x: FRAME_X, y: becomesY, w: FRAME_W, size: becomesSize,
    weight: 400, color: b.becomes ? INK : RED, align: 'left', ...hold });
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
    fill: shareOf(bw, bh, FRAME_W, FRAME_H),
    shotFill: shot.sx * shot.sy,
    sizedBy: reg && lay.fills ? 'the region' : lay.share.said ? 'the stated share' : 'shot',
    overflows: !!reg && !lay.fills && shareOf(bw, bh, FRAME_W, FRAME_H) > reg.area + 0.02,
    words: onScreenText(b.onscreen.join(' ')).split(/\s+/).filter(Boolean).length });
}

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
  authoring: (() => {
    const allow = ['dead-air', 'ends-on-nothing', 'plain-slideshow', 'no-continuous-object',
      'no-continuous-object-inferred', 'static-bg', 'overlap', 'contrast', 'safe'];
    const why = 'Generated blocking panels, never a deliverable. Waived by construction, not by an author arguing themselves into it.';
    return { allow, _why: Object.fromEntries(allow.map((c) => [c, why])) };
  })(),
  layers,
  bg: [{ t: 0, preset: 'plain', from: 0, to: total }],
};
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
console.log('  beats compare. They cannot show motion (that is `make dev-tool X=animatic`) and they cannot show the');
console.log('  look (that is `make dev-tool X=styleframes`). They are only ever as good as the storyboard.\n');
