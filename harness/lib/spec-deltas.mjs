// harness/lib/spec-deltas.mjs: two specs of the same shape (ref-spec.mjs run on the reference mp4 AND on
// the page's own render) in, one list of numeric deltas out, worst first. Both sides come from the same
// pixel code, so a delta is a real difference, not two instruments disagreeing. Pure: no browser, no ffmpeg.
// Frames are printed at the page's fps; every comparison runs in seconds.
//
// Names. The page DOM only NAMES things: attachNames (render-spec.mjs) puts `name: { label, line }` on
// each page element and layout box, so a delta says `#card (page.html:34)`, not "element 2.1".
//
// Matching. Shots pair by cut order. Inside a shot, moving elements pair one to one, greedy by cost:
// size, where they land, when they land, and fill colour. Text pairs line to line by the same words,
// then word to word by text and order of appearance.
//
// Confidence. Each side carries a calibrated error per measure (spec.err, quality/baselines/ref-spec-error.json)
// and each fitted move its own fit error. A delta smaller than the two errors combined is not reported;
// one under twice that is `low`: the line says "confirm by eye" and names the frame and a sheet.
import { deltaE } from './color-delta.mjs';
import { norm } from './ref-measure/words.mjs';
import { readHoldProblems } from '../../quality/gates/page-check.mjs';

const MATCH_MAX_COST = 3;
const LAND_FRAMES = 1;
const K_RATIO = 0.15;
const OVERSHOOT_GAP = 0.02;
const COLOR_DE = 4;
const PALETTE_DE = 6;
const TEXT_RATIO = 0.12;
const TEXT_POS = 0.03;
const AUDIO_MS = 40;
const AUDIO_WINDOW = 0.25;
const LAYOUT_GAP = 0.02;
const SHUTTER_GAP = 60;
const LINE_MATCH = 0.5;
const r1 = (v) => Math.round(v * 10) / 10;
const sign = (v, pos, neg) => (v > 0 ? pos : neg);
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

function context(ref, page) {
  const k = page.media.width / ref.media.width;
  return { k, pf: page.fps, rf: ref.fps, frame: (spec, f) => Math.round((f / spec.fps) * page.fps), sec: (spec, f) => f / spec.fps,
    W: page.media.width, H: page.media.height };
}

// Combined calibrated error of one measure on both sides (same unit as the measure), never under `floor`.
function allow(ref, page, key, floor = 0) {
  const p90 = (s) => (s.err && s.err[key] ? s.err[key].p90 : 0);
  return Math.max(floor, Math.hypot(p90(ref), p90(page)));
}

// A delta under the allowance is noise, under twice it is a maybe, above it is a fact.
const grade = (gap, allowed) => (Math.abs(gap) < allowed ? 'none' : Math.abs(gap) < 2 * allowed ? 'low' : 'high');

// The share of remaining distance per frame, restated at the reference's frame rate so two fps compare.
const kAt = (k, fromFps, toFps) => 1 - (1 - k) ** (toFps / fromFps);

const landT = (e, spec) => (e.land ? e.land.t : e.f1 / spec.fps);
const startT = (e, spec) => (e.start ? e.start.t : e.f0 / spec.fps);

function elementCost(c, ref, page, re, pe) {
  const area = (e, s) => Math.max(1, e.size[0] * s * e.size[1] * s);
  const size = Math.abs(Math.log(area(re, c.k) / area(pe, 1))) / 2;
  const where = Math.hypot(re.to[0] * c.k - pe.to[0], re.to[1] * c.k - pe.to[1]) / c.W;
  const when = Math.abs(landT(re, ref) - landT(pe, page));
  const colour = re.color && pe.color ? deltaE(re.color, pe.color) / 50 : 0;
  return size * 1.5 + where * 3 + when + colour;
}

function pairElements(c, ref, page, rs, ps) {
  const pairs = [];
  for (const re of rs.elements) for (const pe of ps.elements) pairs.push({ re, pe, cost: elementCost(c, ref, page, re, pe) });
  pairs.sort((a, b) => a.cost - b.cost);
  const usedR = new Set(), usedP = new Set(), out = [];
  for (const p of pairs) {
    if (p.cost > MATCH_MAX_COST || usedR.has(p.re) || usedP.has(p.pe)) continue;
    usedR.add(p.re); usedP.add(p.pe); out.push(p);
  }
  return { out, lostRef: rs.elements.filter((e) => !usedR.has(e)), extraPage: ps.elements.filter((e) => !usedP.has(e)) };
}

const nameOf = (o) => (o.name ? `${o.name.label}${o.name.line ? ` (page.html:${o.name.line})` : ''}` : `element ${o.id}`);

function kPart(c, re, pe) {
  const rf = re.fit, pf = pe.fit;
  if (!rf || !pf) return null;
  if (rf.kind !== pf.kind) return { hurt: 2, text: `curve ${pf.kind} vs ref ${rf.kind}${rf.kind === 'spring' ? ` (k ${rf.k} d ${rf.d})` : ` (k ${rf.k})`}` };
  if (pf.kind === 'approach') {
    const kp = kAt(pf.k, c.pf, c.rf);
    const ratio = Math.log(kp / rf.k);
    if (Math.abs(ratio) < K_RATIO) return null;
    return { hurt: Math.abs(ratio) * 10, text: `k ${pf.k} vs ${rf.k}${c.pf === c.rf ? '' : ` (${r1(kp * 1000) / 1000} at ref fps)`} -> arrives too ${sign(ratio, 'fast', 'slow')}` };
  }
  const ratio = Math.log(pf.k / rf.k);
  const damp = pf.d - rf.d;
  if (Math.abs(ratio) < K_RATIO && Math.abs(damp) < 6) return null;
  return { hurt: Math.abs(ratio) * 8 + Math.abs(damp) / 4, text: `spring k ${pf.k} d ${pf.d} vs k ${rf.k} d ${rf.d} -> ${sign(ratio, 'stiffer', 'softer')}${damp ? `, ${sign(damp, 'more', 'less')} damped` : ''}` };
}

const part = (axis, hurt, text) => ({ axis, hurt, text });

function timingParts(c, ref, page, re, pe) {
  const parts = [];
  const gapMs = (landT(pe, page) - landT(re, ref)) * 1000, gapF = (gapMs / 1000) * page.fps;
  const fitMs = ((re.land ? re.land.errFrames / ref.fps : 0) + (pe.land ? pe.land.errFrames / page.fps : 0)) * 1000;
  const grading = grade(gapMs, Math.max(1000 / page.fps * LAND_FRAMES, allow(ref, page, 'landMs'), fitMs));
  if (grading !== 'none') parts.push(part('timing', Math.abs(gapF) * 2, `lands f${c.frame(page, landT(pe, page) * page.fps)}, ref f${c.frame(ref, landT(re, ref) * ref.fps)} -> ${Math.round(Math.abs(gapF))} frames ${sign(gapF, 'late', 'early')}`));
  if (pe.axis === re.axis && ['x', 'y'].includes(pe.axis)) {
    const kp = kPart(c, re, pe);
    if (kp) parts.push(part('timing', kp.hurt, kp.text));
    if (pe.overshoot != null && re.overshoot != null && Math.abs(pe.overshoot - re.overshoot) >= Math.max(OVERSHOOT_GAP, allow(ref, page, 'overshoot')))
      parts.push(part('timing', Math.abs(pe.overshoot - re.overshoot) * 100, `overshoot x${pe.overshoot.toFixed(2)} vs x${re.overshoot.toFixed(2)}`));
  }
  return { parts, grading };
}

function lookParts(c, ref, page, re, pe) {
  const parts = [];
  if (re.color && pe.color) {
    const dE = deltaE(re.color, pe.color);
    if (dE >= Math.max(COLOR_DE, allow(ref, page, 'paletteDE'))) parts.push(part('colour', dE / 2, `${pe.color} vs ${re.color} (dE ${Math.round(dE)})`));
  }
  const grow = Math.sqrt((pe.size[0] * pe.size[1]) / Math.max(1, re.size[0] * c.k * re.size[1] * c.k));
  if (Math.abs(grow - 1) >= Math.max(0.1, allow(ref, page, 'sizeFrac'))) parts.push(part('layout', Math.abs(grow - 1) * 30, `size ${Math.round(pe.size[0])}x${Math.round(pe.size[1])} vs ref ${Math.round(re.size[0] * c.k)}x${Math.round(re.size[1] * c.k)}`));
  if (re.blur && !pe.blur) parts.push(part('timing', 3, `ref blurs f${c.frame(ref, re.blur.f0)}-${c.frame(ref, re.blur.f1)}, page does not`));
  else if (pe.blur && !re.blur) parts.push(part('timing', 3, `page blurs f${c.frame(page, pe.blur.f0)}-${c.frame(page, pe.blur.f1)}, ref does not`));
  if (re.shutter && pe.shutter && Math.abs(re.shutter.angleDeg - pe.shutter.angleDeg) >= Math.max(SHUTTER_GAP, re.shutter.errDeg + pe.shutter.errDeg))
    parts.push(part('timing', 2, `shutter ${pe.shutter.angleDeg} deg vs ref ${re.shutter.angleDeg} deg`));
  return parts;
}

function elementDelta(c, ref, page, shot, re, pe) {
  const { parts: timing, grading } = timingParts(c, ref, page, re, pe);
  const parts = [...timing, ...lookParts(c, ref, page, re, pe)];
  if (!parts.length) return null;
  const low = re.confidence === 'low' || pe.axis !== re.axis || pe.confidence === 'low' || grading === 'low';
  return { kind: 'element', shot, hurt: parts.reduce((a, p) => a + p.hurt, 0), parts, confidence: low ? 'low' : 'high',
    frame: c.frame(page, landT(pe, page) * page.fps), refFrame: c.frame(ref, landT(re, ref) * ref.fps),
    line: `S${shot} ${nameOf(pe)}: ${parts.map((p) => p.text).join(' | ')}` };
}

function cutDeltas(c, ref, page) {
  const out = [];
  const n = Math.min(ref.cuts.length, page.cuts.length);
  const allowMs = allow(ref, page, 'cutMs', 1000 / page.fps * LAND_FRAMES);
  for (let i = 0; i < n; i++) {
    const rc = ref.cuts[i], pc = page.cuts[i];
    const gapMs = (pc.t - rc.t) * 1000, gap = (gapMs / 1000) * page.fps;
    const frame = Math.round(pc.t * page.fps), refFrame = Math.round(rc.t * page.fps);
    if (grade(gapMs, allowMs) !== 'none')
      out.push({ kind: 'cut', axis: 'timing', shot: i + 2, hurt: Math.abs(gap) * 3, confidence: Math.abs(gap) > 12 ? 'low' : 'high', frame, refFrame,
        line: `cut ${i + 1}: page f${frame}, ref f${refFrame} -> ${Math.round(Math.abs(gap))} frames ${sign(gap, 'late', 'early')}` });
    const rt = rc.transition, pt = pc.transition;
    if (rt && pt && (rt.type !== pt.type || (rt.dir && pt.dir && rt.dir !== pt.dir) || Math.abs(rt.frames * page.fps / ref.fps - pt.frames) > 2))
      out.push({ kind: 'transition', axis: 'transitions', shot: i + 2, hurt: 6, confidence: rt.confidence < 0.6 || pt.confidence < 0.6 ? 'low' : 'high', frame, refFrame,
        line: `cut ${i + 1} is a ${pt.type}${pt.dir ? ` ${pt.dir}` : ''} over ${pt.frames} f; the reference has a ${rt.type}${rt.dir ? ` ${rt.dir}` : ''} over ${rt.frames} f` });
  }
  if (ref.cuts.length !== page.cuts.length)
    out.push({ kind: 'cut', axis: 'transitions', shot: 0, hurt: 20, confidence: 'low', frame: 0, refFrame: 0,
      line: `cuts: page has ${page.cuts.length}, ref has ${ref.cuts.length}` });
  return out;
}

function paletteDeltas(c, ref, page, rs, ps, shot) {
  const out = [];
  const have = ps.palette.map((p) => p.hex);
  if (!have.length) return out;
  const tol = Math.max(PALETTE_DE, allow(ref, page, 'paletteDE'));
  for (const r of rs.palette.filter((p) => p.share >= 0.08).slice(0, 3)) {
    let best = null;
    for (const h of have) { const d = deltaE(r.hex, h); if (!best || d < best.d) best = { hex: h, d }; }
    if (best.d < tol) continue;
    out.push({ kind: 'palette', axis: 'colour', shot, hurt: best.d / 3, confidence: r.share >= 0.15 ? 'high' : 'low', frame: Math.round((ps.f0 + ps.f1) / 2), refFrame: Math.round((rs.f0 + rs.f1) / 2),
      line: `S${shot} palette: ref ${r.hex} (${Math.round(r.share * 100)}% of frame) vs nearest page colour ${best.hex} (dE ${Math.round(best.d)})` });
  }
  return out;
}

function layoutDeltas(c, ref, page, rs, ps, shot) {
  const rl = rs.layout, pl = ps.layout;
  if (!rl || !pl) return [];
  const tol = Math.max(LAYOUT_GAP, allow(ref, page, 'layoutFrac') * 2);
  const pairs = [];
  for (const rb of rl.boxes) for (const pb of pl.boxes) pairs.push({ rb, pb, d: Math.hypot(rb.x + rb.w / 2 - pb.x - pb.w / 2, rb.y + rb.h / 2 - pb.y - pb.h / 2) + Math.abs(rb.w - pb.w) + Math.abs(rb.h - pb.h) });
  pairs.sort((a, b) => a.d - b.d);
  const usedR = new Set(), usedP = new Set(), out = [];
  for (const p of pairs) {
    if (p.d > 0.25 || usedR.has(p.rb) || usedP.has(p.pb)) continue;
    usedR.add(p.rb); usedP.add(p.pb);
    const dx = p.pb.x - p.rb.x, dy = p.pb.y - p.rb.y, dw = p.pb.w - p.rb.w, dh = p.pb.h - p.rb.h;
    const worst = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dw), Math.abs(dh));
    if (worst < tol) continue;
    const bits = [['x', dx], ['y', dy], ['w', dw], ['h', dh]].filter(([, v]) => Math.abs(v) >= tol).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${Math.round(v * 1000) / 10}%`);
    out.push({ kind: 'layout', axis: 'layout', shot, hurt: worst * 100, confidence: worst < 2 * tol ? 'low' : 'high', frame: ps.layout.frame, refFrame: rs.layout.frame,
      line: `S${shot} box ${nameOf(p.pb)} at ref (x ${r1(p.rb.x * 100)}% y ${r1(p.rb.y * 100)}% w ${r1(p.rb.w * 100)}% h ${r1(p.rb.h * 100)}%): page off by ${bits.join(', ')} of the frame` });
  }
  return out;
}

// Two lines are the same line when they share at least half their words.
function lineScore(a, b) {
  const wa = a.words.map((w) => norm(w.word)), wb = b.words.map((w) => norm(w.word));
  const pool = [...wb];
  let hit = 0;
  for (const w of wa) { const i = pool.indexOf(w); if (i >= 0) { hit++; pool.splice(i, 1); } }
  return hit / Math.max(wa.length, wb.length, 1);
}

// Reference words paired to page words of the same text: the k-th appearance of a word, left to right, pairs with the k-th on the other side.
function pairWords(rl, pl) {
  const seen = {}, pool = pl.words.map((w) => ({ ...w, key: norm(w.word) })), pairs = [];
  for (const rw of [...rl.words].sort((a, b) => a.x - b.x)) {
    const key = norm(rw.word);
    seen[key] = (seen[key] || 0) + 1;
    const same = pool.filter((w) => w.key === key).sort((a, b) => a.x - b.x)[seen[key] - 1];
    if (same) pairs.push({ rw, pw: same });
  }
  return pairs;
}

function revealParts(c, ref, page, rl, pl, pairs) {
  const parts = [], allowMs = allow(ref, page, 'wordT0Ms', 1000 / page.fps * LAND_FRAMES);
  const dts = pairs.map((p) => (p.pw.t0 - p.rw.t0) * 1000), offset = med(dts), frames = (ms) => Math.round((Math.abs(ms) / 1000) * page.fps);
  if (grade(offset, allowMs) !== 'none')
    parts.push(part('text', frames(offset) * 2, `reveals ${frames(offset)} frames ${sign(offset, 'late', 'early')} (first word f${Math.round(Math.min(...pl.words.map((w) => w.t0)) * page.fps)}, ref f${Math.round(rl.t0 * page.fps)})`));
  if (rl.stagger !== pl.stagger && rl.stagger !== 'single' && pl.stagger !== 'single') parts.push(part('text', 4, `stagger ${pl.stagger} vs ref ${rl.stagger}`));
  else if (rl.stepS > 0 && pl.stepS > 0 && Math.abs(Math.log(pl.stepS / rl.stepS)) > 0.35 && Math.abs(pl.stepS - rl.stepS) * 1000 > allowMs)
    parts.push(part('text', 3, `${Math.round(pl.stepS * 1000)} ms between words vs ref ${Math.round(rl.stepS * 1000)} ms`));
  const off = pairs.filter((p, i) => Math.abs(dts[i] - offset) > 2 * allowMs);
  if (off.length && off.length < pairs.length)
    parts.push(part('text', off.length, `${off.slice(0, 3).map((p) => `"${p.pw.word}" ${Math.round((p.pw.t0 - p.rw.t0) * page.fps)} f off`).join(', ')} against the line's own offset`));
  return parts;
}

function shapeParts(c, ref, page, pairs) {
  const parts = [];
  const hr = med(pairs.map((p) => p.pw.h / (p.rw.h * c.k)));
  if (Math.abs(hr - 1) >= Math.max(TEXT_RATIO, allow(ref, page, 'textSizeFrac')))
    parts.push(part('text', Math.abs(hr - 1) * 30, `${r1(hr * 100)}% of the ref size (box ${r1(med(pairs.map((p) => p.pw.h)))} px vs ${r1(med(pairs.map((p) => p.rw.h * c.k)))} px)`));
  const dx = med(pairs.map((p) => (p.pw.x - p.rw.x * c.k) / c.W)), dy = med(pairs.map((p) => (p.pw.y - p.rw.y * c.k) / c.H));
  const pct = (v) => Math.abs(Math.round(v * 1000) / 10);
  if (Math.hypot(dx, dy) >= Math.max(TEXT_POS, allow(ref, page, 'textPosFrac')))
    parts.push(part('text', Math.hypot(dx, dy) * 60, `sits ${pct(dx)}% ${dx > 0 ? 'right' : 'left'}, ${pct(dy)}% ${dy > 0 ? 'lower' : 'higher'} than the ref`));
  return parts;
}

function bestLine(rl, plines, used) {
  let best = null;
  for (const pl of plines) {
    if (used.has(pl)) continue;
    const s = lineScore(rl, pl);
    if (s >= LINE_MATCH && Math.abs(pl.t0 - rl.t0) <= 2 && (!best || s > best.s)) best = { pl, s };
  }
  return best;
}

function textDeltas(c, ref, page) {
  const out = [];
  if (!ref.ocr || !page.ocr) return out;
  const rlines = (ref.textLines || []).filter((l) => l.words.some((w) => norm(w.word).length >= 3));
  const used = new Set();
  for (const rl of rlines) {
    const best = bestLine(rl, page.textLines || [], used);
    const tag = `T${rl.index} "${rl.text.slice(0, 40)}"`, refFrame = Math.round(rl.t0 * page.fps);
    if (!best) {
      if (rl.words.length >= 2 || rl.t1 - rl.t0 >= 0.6)
        out.push({ kind: 'text', axis: 'text', shot: 0, hurt: 3 + rl.words.length, confidence: 'low', frame: refFrame, refFrame,
          line: `${tag} at ${rl.t0.toFixed(2)}s: no page line with the same words near it (OCR spelling may be off)` });
      continue;
    }
    used.add(best.pl);
    const pairs = pairWords(rl, best.pl);
    const parts = pairs.length ? [...revealParts(c, ref, page, rl, best.pl, pairs), ...shapeParts(c, ref, page, pairs)] : [];
    if (parts.length)
      out.push({ kind: 'text', axis: 'text', shot: 0, hurt: parts.reduce((a, p) => a + p.hurt, 0), parts, confidence: best.s < 0.8 || rl.words.length < 2 ? 'low' : 'high',
        frame: Math.round(best.pl.t0 * page.fps), refFrame, line: `${tag}: ${parts.map((p) => p.text).join(' | ')}` });
  }
  return out;
}

function audioDeltas(ref, page) {
  const out = [];
  if (!ref.audio) return out;
  const cues = page.audio ? page.audio.hits.filter((h) => h.strength >= 0.3) : [];
  const refHits = ref.audio.hits.filter((h) => h.strength >= 0.3);
  const at = (h) => (h.attack != null ? h.attack : h.t);
  const allowMs = allow(ref, page, 'attackMs', AUDIO_MS);
  const used = new Set();
  for (const cue of cues) {
    const near = refHits.filter((h) => Math.abs(at(h) - at(cue)) <= AUDIO_WINDOW).sort((a, b) => Math.abs(at(a) - at(cue)) - Math.abs(at(b) - at(cue)))[0];
    const f = Math.round(at(cue) * page.fps);
    if (!near) { out.push({ kind: 'audio', axis: 'audio', shot: 0, hurt: 4, confidence: 'low', frame: f, refFrame: f, line: `page sound at ${at(cue).toFixed(2)}s (f${f}): no reference hit within ${AUDIO_WINDOW * 1000} ms` }); continue; }
    used.add(near);
    const ms = (at(cue) - at(near)) * 1000;
    if (Math.abs(ms) >= allowMs) out.push({ kind: 'audio', axis: 'audio', shot: 0, hurt: Math.abs(ms) / 10, confidence: Math.abs(ms) < 2 * allowMs ? 'low' : 'high', frame: f, refFrame: Math.round(at(near) * page.fps),
      line: `sound attack at f${f}, ref at f${Math.round(at(near) * page.fps)} -> ${Math.round(Math.abs(ms))} ms ${sign(ms, 'late', 'early')}` });
  }
  for (const h of refHits.filter((x) => x.strength >= 0.6 && !used.has(x)))
    if (!cues.some((cue) => Math.abs(at(cue) - at(h)) <= AUDIO_WINDOW))
      out.push({ kind: 'audio', axis: 'audio', shot: 0, hurt: 6, confidence: 'high', frame: Math.round(at(h) * page.fps), refFrame: Math.round(at(h) * page.fps),
        line: `ref has a hit at ${at(h).toFixed(2)}s (f${Math.round(at(h) * page.fps)}, strength ${h.strength}); the page has no sound near it` });
  return out;
}

const AXES = ['timing', 'layout', 'colour', 'text', 'transitions', 'audio'];

// One number per axis: 100 minus the hurt of its deltas, floor 0, and the worst line of that axis.
export function axisScores(deltas) {
  return AXES.map((axis) => {
    const mine = deltas.flatMap((d) => (d.parts ? d.parts.filter((p) => p.axis === axis).map((p) => ({ hurt: p.hurt, d })) : d.axis === axis ? [{ hurt: d.hurt, d }] : []));
    const worst = mine.sort((a, b) => b.hurt - a.hurt)[0];
    return { axis, score: Math.max(0, Math.round(100 - mine.reduce((s, m) => s + m.hurt, 0))), worst: worst ? worst.d.line : '' };
  });
}

export function compareSpecs(ref, page) {
  const c = context(ref, page);
  const deltas = [...cutDeltas(c, ref, page), ...audioDeltas(ref, page), ...textDeltas(c, ref, page)];
  const notes = [];
  const shots = Math.min(ref.shots.length, page.shots.length);
  if (ref.shots.length !== page.shots.length) notes.push(`shots: page ${page.shots.length}, reference ${ref.shots.length}; the first ${shots} pair by cut order`);
  for (let i = 0; i < shots; i++) {
    const rs = ref.shots[i], ps = page.shots[i], n = i + 1;
    const { out, lostRef, extraPage } = pairElements(c, ref, page, rs, ps);
    for (const p of out) { const d = elementDelta(c, ref, page, n, p.re, p.pe); if (d) deltas.push(d); }
    for (const re of lostRef) {
      const at = c.frame(ref, landT(re, ref) * ref.fps);
      deltas.push({ kind: 'missing', axis: 'timing', shot: n, hurt: 8, confidence: 'low', frame: at, refFrame: at,
        line: `S${n}: ref moves something ${Math.round(re.size[0] * c.k)}x${Math.round(re.size[1] * c.k)} px to (${Math.round(re.to[0] * c.k)}, ${Math.round(re.to[1] * c.k)}), f${c.frame(ref, re.f0)}-f${at}; no page move matches` });
    }
    if (extraPage.length - lostRef.length >= 2 && ps.elements.length > rs.elements.length + 1)
      deltas.push({ kind: 'busy', axis: 'timing', shot: n, hurt: 2 * (ps.elements.length - rs.elements.length), confidence: 'low', frame: ps.f0, refFrame: c.frame(ref, rs.f0),
        line: `S${n}: the page moves ${ps.elements.length} elements, the reference ${rs.elements.length}` });
    deltas.push(...paletteDeltas(c, ref, page, rs, ps, n), ...layoutDeltas(c, ref, page, rs, ps, n));
  }
  deltas.sort((a, b) => b.hurt - a.hurt);
  deltas.forEach((d) => { d.hurt = r1(d.hurt); d.t = d.frame / page.fps; d.refT = d.refFrame / page.fps; });
  return { deltas, notes, axes: axisScores(deltas) };
}

// ── self-checks: what the page's own numbers say with no reference at all ───────────────────────
const atFrame = (page, f) => `f${f} (${(f / page.fps).toFixed(2)}s)`;

function noSettle(page, s) {
  const out = [];
  for (const e of s.elements) {
    const last = e.rows[e.rows.length - 1];
    const exits = e.opacity[1] < 0.05 || e.to[0] > page.media.width * 1.1 || e.to[0] < -page.media.width * 0.1;
    const speed = Math.hypot(last.vx, last.vy);
    const positional = e.axis !== 'o' && e.axis !== 's';
    if (e.f1 >= s.f1 - 1 && !exits && positional && e.peakSpeed > 0 && speed >= 0.25 * e.peakSpeed)
      out.push({ code: 'no-settle', summary: `S${s.index} ${domName(e)} is still moving at ${speed.toFixed(1)} px/f when the shot ends`, at: atFrame(page, e.f1),
        fix: `end the move ${Math.ceil(e.frames * 0.3)} frames before the cut, or finish it with an ease-out so it comes to rest.` });
  }
  return out;
}

function textHold(page, s) {
  const tracks = s.text.map((t) => ({ text: t.text, sizeSettled: t.boxHeightPx / page.media.height, tIn: t.f0 / page.fps, tSettled: t.settleF / page.fps, tOut: t.exitF / page.fps }));
  return readHoldProblems(tracks).map((p) => ({ code: 'text-moves-before-hold',
    summary: `S${s.index} "${p.text.slice(0, 40)}" is still for ${p.hold.toFixed(2)}s and needs ${p.need.toFixed(2)}s`,
    at: atFrame(page, Math.round(p.tSettled * page.fps)), fix: `delay the exit to ${(p.tSettled + p.need).toFixed(2)}s, or start the text earlier.` }));
}

const domName = (e) => `${e.label}${e.text ? ` "${e.text.slice(0, 24)}"` : ''}`;

function twoAtSpectacle(page) {
  if (page.spectacle == null) return [];
  const lo = page.spectacle - 0.1, hi = page.spectacle + 0.3, W = page.media.width;
  const movers = page.shots.flatMap((s) => s.elements).filter((e) => {
    const travel = Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1]);
    const big = travel >= 0.03 * W || Math.abs(e.scale[1] - e.scale[0]) >= 0.15 || Math.abs(e.opacity[1] - e.opacity[0]) >= 0.5;
    return big && e.f0 / page.fps <= hi && e.f1 / page.fps >= lo;
  });
  if (movers.length < 2) return [];
  return [{ code: 'two-at-spectacle', summary: `${movers.length} things move at the spectacle (${page.spectacle}s): ${movers.slice(0, 4).map(domName).join(', ')}`,
    at: atFrame(page, Math.round(page.spectacle * page.fps)), fix: 'let one thing move at the spectacle and hold the rest still for 0.4s around it.' }];
}

function usedColours(page) {
  const seen = new Map();
  const note = (hex, who) => { if (hex && !seen.has(hex)) seen.set(hex, who); };
  for (const s of page.shots) {
    for (const e of s.elements) { note(e.color, `S${s.index} ${domName(e)}`); note(e.textColor, `S${s.index} ${domName(e)}`); }
    for (const t of s.text) note(t.color, `S${s.index} "${t.text.slice(0, 20)}"`);
    for (const p of s.palette.filter((x) => x.share >= 0.05)) note(p.hex, `S${s.index} background`);
  }
  return seen;
}

function offPalette(page) {
  const root = page.rootPalette || [];
  if (root.length < 3) return [];
  const known = [...root, { name: 'white', hex: '#FFFFFF' }, { name: 'black', hex: '#000000' }];
  const out = [];
  for (const [hex, who] of usedColours(page)) {
    const best = known.map((r) => ({ ...r, d: deltaE(hex, r.hex) })).sort((a, b) => a.d - b.d)[0];
    if (best.d >= 5)
      out.push({ code: 'off-palette', summary: `${hex} (${who}) is not in the :root palette; nearest is ${best.name} ${best.hex} (dE ${Math.round(best.d)})`, at: '',
        fix: `use ${best.name.startsWith('--') ? `var(${best.name})` : 'a :root colour'}, or add ${hex} to :root on purpose.` });
  }
  return out;
}

export function selfChecks(page) {
  return [...page.shots.flatMap((s) => [...noSettle(page, s), ...textHold(page, s)]), ...twoAtSpectacle(page), ...offPalette(page)];
}

// ── markdown ────────────────────────────────────────────────────────────────────────────────────
export function deltaLine(d) {
  if (d.confidence !== 'low') return d.line;
  const where = d.frame || d.refFrame ? `: ref f${d.refFrame}, page f${d.frame}` : '';
  return `${d.line} [confirm by eye${where}${d.sheet ? `, ${d.sheet}` : ''}]`;
}

export function deltasMarkdown({ pageName, refName, result, checks, page }) {
  const L = [`# Measured deltas: ${pageName}${refName ? ` vs ${refName}` : ''}`, ''];
  L.push('Every number below was measured with code, on the reference and on the page render by the same pixel code, so no line is one instrument disagreeing with another. They are settled facts; do not re-measure them by eye.');
  L.push('Judge taste, composition, hierarchy and brand. Look only at lines marked "confirm by eye".', '');
  if (result) {
    L.push(`## Page against reference (${result.deltas.length} delta(s), worst first; frames at the page's ${page.fps} fps)`, '');
    if (result.axes) L.push('| axis | score | worst delta |', '|---|---|---|', ...result.axes.map((a) => `| ${a.axis} | ${a.score} | ${a.worst || '-'} |`), '');
    if (!result.deltas.length) L.push('No measured delta above tolerance.');
    result.deltas.forEach((d, i) => L.push(`${i + 1}. ${deltaLine(d)}`));
    for (const n of result.notes) L.push('', `note: ${n}`);
    L.push('');
  }
  L.push(`## Page self-checks (${checks.length})`, '');
  if (!checks.length) L.push('Nothing off.');
  for (const c of checks) L.push(`- \`${c.code}\`: ${c.summary}${c.at ? ` [${c.at}]` : ''}. Fix: ${c.fix}`);
  return `${L.join('\n')}\n`;
}
