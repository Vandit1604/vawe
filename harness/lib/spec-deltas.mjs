// harness/lib/spec-deltas.mjs: two specs of the same shape (ref-spec.mjs from the reference's pixels,
// render-spec.mjs from the page's DOM) in, one list of numeric deltas out, worst first. Pure: no
// browser, no ffmpeg. Frames are printed at the page's authoring fps; every comparison runs in seconds.
//
// Matching. Shots pair by cut order. Inside a shot, moving elements pair one to one, greedy by cost:
// size (log area ratio), where they land, when they land, and fill colour when both sides have one.
// Text pairs by the same words when both sides have them, else largest first.
//
// Confidence. The page side is exact. The reference side is tracked from pixels, so an element carries
// `confidence` (few frames, or a poor curve fit) and OCR sizes carry a 15% error. A delta is `low`
// when either side is: the line says "confirm by eye" and names the frame to look at.
import { deltaE } from './color-delta.mjs';
import { readHoldProblems } from '../../quality/gates/page-check.mjs';

const MATCH_MAX_COST = 3;
const LAND_FRAMES = 1;
const K_RATIO = 0.15;
const OVERSHOOT_GAP = 0.02;
const COLOR_DE = 4;
const PALETTE_DE = 6;
const TEXT_RATIO = 0.12;
const AUDIO_MS = 40;
const AUDIO_WINDOW = 0.25;
const r1 = (v) => Math.round(v * 10) / 10;
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const sign = (v, pos, neg) => (v > 0 ? pos : neg);

function context(ref, page) {
  const k = page.media.width / ref.media.width;
  return { k, pf: page.fps, rf: ref.fps, frame: (spec, f) => Math.round((f / spec.fps) * page.fps), sec: (spec, f) => f / spec.fps,
    W: page.media.width, H: page.media.height };
}

// The share of remaining distance per frame, restated at the reference's frame rate so two fps compare.
const kAt = (k, fromFps, toFps) => 1 - (1 - k) ** (toFps / fromFps);

function elementCost(c, ref, page, re, pe) {
  const area = (e, s) => Math.max(1, e.size[0] * s * e.size[1] * s);
  const size = Math.abs(Math.log(area(re, c.k) / area(pe, 1))) / 2;
  const where = Math.hypot(re.to[0] * c.k - pe.to[0], re.to[1] * c.k - pe.to[1]) / c.W;
  const when = Math.abs(re.f1 / ref.fps - pe.f1 / page.fps);
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

const nameOf = (pe) => `${pe.label}${pe.text ? ` "${pe.text.slice(0, 24)}"` : ''}`;

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

function elementDelta(c, ref, page, shot, re, pe) {
  const parts = [];
  const push = (hurt, text) => parts.push({ hurt, text });
  const landF = c.frame(page, pe.f1), refLandF = c.frame(ref, re.f1);
  const gap = (pe.f1 / page.fps - re.f1 / ref.fps) * page.fps;
  if (Math.abs(gap) >= LAND_FRAMES) push(Math.abs(gap) * 2, `lands f${landF}, ref f${refLandF} -> ${Math.round(Math.abs(gap))} frames ${sign(gap, 'late', 'early')}`);
  const sameAxis = pe.axis === re.axis && ['x', 'y'].includes(pe.axis);
  if (sameAxis) {
    const kp = kPart(c, re, pe);
    if (kp) push(kp.hurt, kp.text);
    if (pe.overshoot != null && re.overshoot != null && Math.abs(pe.overshoot - re.overshoot) >= OVERSHOOT_GAP)
      push(Math.abs(pe.overshoot - re.overshoot) * 100, `overshoot x${pe.overshoot.toFixed(2)} vs x${re.overshoot.toFixed(2)}`);
  }
  if (re.color && pe.color) {
    const dE = deltaE(re.color, pe.color);
    if (dE >= COLOR_DE) push(dE / 2, `${pe.color} vs ${re.color} (dE ${Math.round(dE)})`);
  }
  if (re.blur && !pe.blur) push(3, `ref blurs f${c.frame(ref, re.blur.f0)}-${c.frame(ref, re.blur.f1)}, page does not`);
  else if (pe.blur && !re.blur) push(3, `page blurs ${pe.blur.px} px, ref does not`);
  if (!parts.length) return null;
  const low = re.confidence === 'low' || pe.axis !== re.axis;
  return { kind: 'element', shot, hurt: parts.reduce((a, p) => a + p.hurt, 0), confidence: low ? 'low' : 'high', frame: landF, refFrame: refLandF,
    line: `S${shot} ${nameOf(pe)}: ${parts.map((p) => p.text).join(' | ')}` };
}

function cutDeltas(c, ref, page) {
  const out = [];
  const n = Math.min(ref.cuts.length, page.cuts.length);
  for (let i = 0; i < n; i++) {
    const gap = (page.cuts[i].t - ref.cuts[i].t) * page.fps;
    if (Math.abs(gap) < LAND_FRAMES) continue;
    out.push({ kind: 'cut', shot: i + 2, hurt: Math.abs(gap) * 3, confidence: Math.abs(gap) > 12 ? 'low' : 'high', frame: Math.round(page.cuts[i].t * page.fps),
      refFrame: Math.round(ref.cuts[i].t * page.fps),
      line: `cut ${i + 1}: page f${Math.round(page.cuts[i].t * page.fps)}, ref f${Math.round(ref.cuts[i].t * page.fps)} -> ${Math.round(Math.abs(gap))} frames ${sign(gap, 'late', 'early')}` });
  }
  if (ref.cuts.length !== page.cuts.length)
    out.push({ kind: 'cut', shot: 0, hurt: 20, confidence: 'low', frame: 0, refFrame: 0,
      line: `cuts: page has ${page.cuts.length}, ref has ${ref.cuts.length} (the page's cuts come from elements turning over, so a dissolve can hide one)` });
  return out;
}

function paletteDeltas(c, rs, ps, shot, page) {
  const out = [];
  const have = [...ps.palette.map((p) => p.hex), ...ps.text.map((t) => t.color).filter(Boolean)];
  if (!have.length) return out;
  for (const r of rs.palette.filter((p) => p.share >= 0.08).slice(0, 3)) {
    let best = null;
    for (const h of have) { const d = deltaE(r.hex, h); if (!best || d < best.d) best = { hex: h, d }; }
    if (best.d < PALETTE_DE) continue;
    out.push({ kind: 'palette', shot, hurt: best.d / 3, confidence: r.share >= 0.15 ? 'high' : 'low', frame: Math.round((ps.f0 + ps.f1) / 2), refFrame: Math.round((ps.f0 + ps.f1) / 2),
      line: `S${shot} palette: ref ${r.hex} (${Math.round(r.share * 100)}% of frame) vs nearest page colour ${best.hex} (dE ${Math.round(best.d)})` });
  }
  return out;
}

function textDeltas(c, ref, page, rs, ps, shot) {
  const out = [];
  const words = rs.text.filter((t) => norm(t.text).length >= 3).sort((a, b) => b.fontPxApprox - a.fontPxApprox);
  const mine = [...ps.text].sort((a, b) => b.fontPx - a.fontPx);
  const used = new Set();
  for (const w of words) {
    let pt = mine.find((t) => !used.has(t) && norm(t.text) === norm(w.text));
    const byText = !!pt;
    if (!pt) pt = mine.find((t) => !used.has(t));
    if (!pt) break;
    used.add(pt);
    const refPx = w.fontPxApprox * c.k, ratio = pt.fontPx / refPx;
    const parts = [];
    if (Math.abs(ratio - 1) >= TEXT_RATIO) parts.push({ hurt: Math.abs(ratio - 1) * 30, text: `${r1(pt.fontPx)} px vs ref ${r1(refPx)} px (x${ratio.toFixed(2)})` });
    const far = Math.hypot(pt.cxPx - w.cxPx * c.k, pt.cyPx - w.cyPx * c.k) / c.W;
    if (far >= 0.05) parts.push({ hurt: far * 60, text: `centre (${Math.round(pt.cxPx)}, ${Math.round(pt.cyPx)}) vs ref (${Math.round(w.cxPx * c.k)}, ${Math.round(w.cyPx * c.k)})` });
    if (!parts.length) continue;
    out.push({ kind: 'text', shot, hurt: parts.reduce((a, p) => a + p.hurt, 0), confidence: byText && Math.abs(ratio - 1) > 0.25 ? 'high' : 'low',
      frame: c.frame(page, pt.settleF), refFrame: c.frame(ref, w.f0),
      line: `S${shot} text "${pt.text.slice(0, 24)}"${byText ? '' : ` (paired with ref "${w.text}" by size)`}: ${parts.map((p) => p.text).join(' | ')}` });
  }
  return out;
}

function audioDeltas(ref, page) {
  const out = [];
  const cues = page.audio ? page.audio.hits : [];
  const refHits = ref.audio ? ref.audio.hits.filter((h) => h.strength >= 0.3) : [];
  if (!ref.audio) return out;
  const used = new Set();
  for (const cue of cues) {
    const near = refHits.filter((h) => Math.abs(h.t - cue.t) <= AUDIO_WINDOW).sort((a, b) => Math.abs(a.t - cue.t) - Math.abs(b.t - cue.t))[0];
    const at = Math.round(cue.t * page.fps);
    if (!near) { out.push({ kind: 'audio', shot: 0, hurt: 4, confidence: 'low', frame: at, refFrame: at, line: `cue ${cue.name || ''} at ${cue.t.toFixed(2)}s (f${at}): no reference hit within ${AUDIO_WINDOW * 1000} ms` }); continue; }
    used.add(near);
    const ms = (cue.t - near.t) * 1000;
    if (Math.abs(ms) >= AUDIO_MS) out.push({ kind: 'audio', shot: 0, hurt: Math.abs(ms) / 10, confidence: 'high', frame: at, refFrame: Math.round(near.t * page.fps),
      line: `cue ${cue.name || ''} at f${at}, ref hit at f${Math.round(near.t * page.fps)} -> ${Math.round(Math.abs(ms))} ms ${sign(ms, 'late', 'early')}` });
  }
  for (const h of refHits.filter((x) => x.strength >= 0.6 && !used.has(x)))
    if (!cues.some((cue) => Math.abs(cue.t - h.t) <= AUDIO_WINDOW))
      out.push({ kind: 'audio', shot: 0, hurt: 6, confidence: 'high', frame: Math.round(h.t * page.fps), refFrame: Math.round(h.t * page.fps),
        line: `ref has a hit at ${h.t.toFixed(2)}s (f${Math.round(h.t * page.fps)}, strength ${h.strength}); the page has no cue near it` });
  return out;
}

export function compareSpecs(ref, page) {
  const c = context(ref, page);
  const deltas = [...cutDeltas(c, ref, page), ...audioDeltas(ref, page)];
  const notes = [];
  const shots = Math.min(ref.shots.length, page.shots.length);
  if (ref.shots.length !== page.shots.length) notes.push(`shots: page ${page.shots.length}, reference ${ref.shots.length}; the first ${shots} pair by cut order`);
  for (let i = 0; i < shots; i++) {
    const rs = ref.shots[i], ps = page.shots[i], n = i + 1;
    const { out, lostRef, extraPage } = pairElements(c, ref, page, rs, ps);
    for (const p of out) { const d = elementDelta(c, ref, page, n, p.re, p.pe); if (d) deltas.push(d); }
    for (const re of lostRef) {
      const at = c.frame(ref, re.f1);
      deltas.push({ kind: 'missing', shot: n, hurt: 8, confidence: 'low', frame: at, refFrame: at,
        line: `S${n}: ref moves something ${Math.round(re.size[0] * c.k)}x${Math.round(re.size[1] * c.k)} px to (${Math.round(re.to[0] * c.k)}, ${Math.round(re.to[1] * c.k)}), f${c.frame(ref, re.f0)}-f${at}; no page move matches` });
    }
    if (extraPage.length - lostRef.length >= 2 && ps.elements.length > rs.elements.length + 1)
      deltas.push({ kind: 'busy', shot: n, hurt: 2 * (ps.elements.length - rs.elements.length), confidence: 'low', frame: ps.f0, refFrame: c.frame(ref, rs.f0),
        line: `S${n}: the page moves ${ps.elements.length} elements, the reference ${rs.elements.length}` });
    deltas.push(...paletteDeltas(c, rs, ps, n, page), ...textDeltas(c, ref, page, rs, ps, n));
  }
  deltas.sort((a, b) => b.hurt - a.hurt);
  deltas.forEach((d) => { d.hurt = r1(d.hurt); });
  return { deltas, notes };
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
      out.push({ code: 'no-settle', summary: `S${s.index} ${nameOf(e)} is still moving at ${speed.toFixed(1)} px/f when the shot ends`, at: atFrame(page, e.f1),
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

function twoAtSpectacle(page) {
  if (page.spectacle == null) return [];
  const lo = page.spectacle - 0.1, hi = page.spectacle + 0.3, W = page.media.width;
  const movers = page.shots.flatMap((s) => s.elements).filter((e) => {
    const travel = Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1]);
    const big = travel >= 0.03 * W || Math.abs(e.scale[1] - e.scale[0]) >= 0.15 || Math.abs(e.opacity[1] - e.opacity[0]) >= 0.5;
    return big && e.f0 / page.fps <= hi && e.f1 / page.fps >= lo;
  });
  if (movers.length < 2) return [];
  return [{ code: 'two-at-spectacle', summary: `${movers.length} things move at the spectacle (${page.spectacle}s): ${movers.slice(0, 4).map(nameOf).join(', ')}`,
    at: atFrame(page, Math.round(page.spectacle * page.fps)), fix: 'let one thing move at the spectacle and hold the rest still for 0.4s around it.' }];
}

function usedColours(page) {
  const seen = new Map();
  const note = (hex, who) => { if (hex && !seen.has(hex)) seen.set(hex, who); };
  for (const s of page.shots) {
    for (const e of s.elements) { note(e.color, `S${s.index} ${nameOf(e)}`); note(e.textColor, `S${s.index} ${nameOf(e)}`); }
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
  return `${d.line} [confirm by eye${where}]`;
}

export function deltasMarkdown({ pageName, refName, result, checks, page }) {
  const L = [`# Measured deltas: ${pageName}${refName ? ` vs ${refName}` : ''}`, ''];
  L.push('Every number below was measured with code: the page from its DOM (exact), the reference from its pixels. They are settled facts; do not re-measure them by eye.');
  L.push('Judge taste, composition, hierarchy and brand. Look only at lines marked "confirm by eye".', '');
  if (result) {
    L.push(`## Page against reference (${result.deltas.length} delta(s), worst first; frames at the page's ${page.fps} fps)`, '');
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
