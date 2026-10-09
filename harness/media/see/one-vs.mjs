// `vawe see --vs`: the measures of two films side by side, a delta per measure, and one advice line per delta that names the page literal to change.
// Pure: two measure objects (a is yours, b is the reference) in, rows out.

const round = (n, d = 2) => +n.toFixed(d);
const med = (xs) => { const s = xs.filter((v) => v != null && Number.isFinite(v)).sort((p, q) => p - q); return s.length ? s[s.length >> 1] : null; };
const share = (n, d) => (d ? round(n / d) : 0);
const ratio = (a, b) => (a && b ? a / b : null);
const differs = (a, b, tol = 0.3) => a != null && b != null && (Math.abs(a - b) > tol * Math.max(Math.abs(a), Math.abs(b), 1e-6));

const moves = (m) => m.shots.flatMap((s) => s.moves).filter((x) => x.start != null && x.settle != null && x.confidence !== 'low');
const flashPeak = (m) => m.look.flashes.reduce((best, f) => (!best || f.peakLuma - f.baseLuma > best.peakLuma - best.baseLuma ? f : best), null);
const moveSeconds = (m) => med(moves(m).map((x) => x.settle - x.start));
const overshootShare = (m) => share(moves(m).filter((x) => (x.overshootPct ?? 0) >= 2).length, moves(m).filter((x) => x.overshootPct != null).length);
const cameraShare = (m) => share(m.shots.filter((s) => s.camera.words !== 'static').length, m.shots.length);
const hardShare = (m) => share(m.structure.cuts.filter((c) => c.type === 'cut' || c.type === 'match').length, m.structure.cuts.length);
const lengthOf = (m) => med(m.structure.shots.map((s) => s.length));
const worldWord = (m) => (m.source.kind === 'page' ? 'world' : 'shot');

/** A delta row; `advice` is a string or null. */
const row = (section, measure, a, b, advice) => ({ section, measure, a, b, advice: advice ?? null });

function structureRows(a, b) {
  const la = lengthOf(a), lb = lengthOf(b);
  const cutsA = a.structure.cuts.length, cutsB = b.structure.cuts.length;
  const fa = flashPeak(a), fb = flashPeak(b);
  return [
    row('STRUCTURE', 'shots', a.structure.shots.length, b.structure.shots.length, differs(a.structure.shots.length, b.structure.shots.length, 0.4) ? `${a.structure.shots.length < b.structure.shots.length ? 'split' : 'merge'} ${worldWord(a)}s: the reference has ${b.structure.shots.length}; add or remove \`data-world\` elements and their start times in the page` : null),
    row('STRUCTURE', 'median shot length s', la, lb, differs(la, lb, 0.25) ? `${la > lb ? 'shorten' : 'lengthen'} the median ${worldWord(a)} from ${la} s to ${lb} s: move each \`data-world\` start (its keyframe delay or the second in \`window.seek\`) by ${round(Math.abs(la - lb))} s` : null),
    row('STRUCTURE', 'shortest shot s', a.structure.rhythm.min, b.structure.rhythm.min, differs(a.structure.rhythm.min, b.structure.rhythm.min, 0.5) ? `the ${a.structure.rhythm.min > b.structure.rhythm.min ? 'reference has a cut as short as' : 'reference has no cut under'} ${b.structure.rhythm.min} s: set one ${worldWord(a)}'s length to that` : null),
    row('STRUCTURE', 'longest shot s', a.structure.rhythm.max, b.structure.rhythm.max, differs(a.structure.rhythm.max, b.structure.rhythm.max, 0.4) ? `hold the longest ${worldWord(a)} for ${b.structure.rhythm.max} s (now ${a.structure.rhythm.max} s)` : null),
    row('STRUCTURE', 'cuts per 10 s', round((cutsA * 10) / a.media.duration, 1), round((cutsB * 10) / b.media.duration, 1), null),
    row('STRUCTURE', 'share of hard cuts', hardShare(a), hardShare(b), differs(hardShare(a), hardShare(b), 0.3) ? `${hardShare(a) < hardShare(b) ? 'replace transitions with hard cuts: set the cross-fade or slide duration of the world change to 0' : 'soften cuts: give the incoming world an opacity or transform entrance of 4 to 8 frames'}` : null),
    row('STRUCTURE', 'flashes', a.look.flashes.length, b.look.flashes.length, a.look.flashes.length === b.look.flashes.length ? null : `${a.look.flashes.length < b.look.flashes.length ? 'add' : 'remove'} flashes: a full-frame white layer whose opacity keyframes rise and fall over ${fb ? fb.frames : 2} frames`),
    row('STRUCTURE', 'biggest flash frames, peak luma', fa ? `${fa.frames} f, ${fa.peakLuma}` : '-', fb ? `${fb.frames} f, ${fb.peakLuma}` : '-', fa && fb && (differs(fa.frames, fb.frames, 0.4) || differs(fa.peakLuma, fb.peakLuma, 0.15)) ? `set the flash layer's keyframe length to ${fb.frames} f (${fb.seconds} s) and its peak opacity so the mean luma reaches ${fb.peakLuma} (now ${fa.peakLuma})` : null),
  ];
}

function motionRows(a, b) {
  const ma = moveSeconds(a), mb = moveSeconds(b);
  const sa = med(moves(a).map((x) => x.peakHeightsPerS)), sb = med(moves(b).map((x) => x.peakHeightsPerS));
  const oa = overshootShare(a), ob = overshootShare(b);
  const ea = a.shots.flatMap((s) => s.energy?.mean ?? []), eb = b.shots.flatMap((s) => s.energy?.mean ?? []);
  return [
    row('MOTION', 'tracked moves', moves(a).length, moves(b).length, null),
    row('MOTION', 'median move length s', ma, mb, differs(ma, mb, 0.3) ? `${ma > mb ? 'shorten' : 'lengthen'} the arrivals from ${ma} s to ${mb} s: change the duration of each \`transition\` or \`animation\`` : null),
    row('MOTION', 'median peak speed frame heights/s', sa, sb, differs(sa, sb, 0.3) ? `${sa < sb ? 'speed up' : 'slow down'} the moves: the travel distance or the duration in the move's keyframes, until the peak reads ${sb} frame heights/s` : null),
    row('MOTION', 'share of moves that overshoot', oa, ob, differs(oa, ob, 0.4) ? `${oa < ob ? 'add overshoot' : 'remove overshoot'}: ${oa < ob ? 'use a back ease such as cubic-bezier(0.34, 1.56, 0.64, 1) or a spring on the arrivals' : 'use an ease-out without a back term'}; the reference overshoots ${Math.round(ob * 100)}% of moves` : null),
    row('MOTION', 'share of shots with a camera move', cameraShare(a), cameraShare(b), differs(cameraShare(a), cameraShare(b), 0.4) ? `${cameraShare(a) < cameraShare(b) ? 'add' : 'remove'} camera moves: animate one wrapper element's \`transform: scale() translate()\` over the world` : null),
    row('MOTION', 'mean frame energy', round(med(ea) ?? 0, 2), round(med(eb) ?? 0, 2), differs(med(ea), med(eb), 0.4) ? `${(med(ea) ?? 0) < (med(eb) ?? 0) ? 'more' : 'less'} of the picture should change per frame: ${(med(ea) ?? 0) < (med(eb) ?? 0) ? 'add moving layers or lengthen the moves' : 'hold more'}` : null),
  ];
}

const bloomPx = (m) => m.look.film.bloom?.px ?? null;
const fringe = (m) => (m.look.film.chroma ? Math.hypot(m.look.film.chroma.dx, m.look.film.chroma.dy) : null);
const textureOf = (m) => (m.look.film.texture && m.look.film.texture.kind !== 'none' ? m.look.film.texture : null);
const texText = (t) => (t ? `${t.kind} ${t.kind === 'grid' ? `${round(t.periodX)}x${round(t.periodY)}` : round(t.period)} px${t.striped ? ' RGB' : ''}` : 'none');
const grainOf = (m) => med(m.look.perShot.map((l) => l.grain?.sigma));
const focusOf = (m) => med(m.look.perShot.map((l) => l.sharp?.ratio));

const bloomSigmaOf = (m) => m.look.film.bloom?.sigma ?? '?';

function bloomRow(a, b) {
  const [pa, pb] = [bloomPx(a), bloomPx(b)];
  const wider = pa != null && pb != null && differs(pa, pb, 0.35) ? `${pb > pa ? 'widen' : 'narrow'} the glow: the glow layer's \`filter: blur()\` or the \`text-shadow\` radius from about ${bloomSigmaOf(a)} px to about ${bloomSigmaOf(b)} px` : null;
  const add = pb != null && pa == null ? `add a glow: a blurred copy of the bright layer, \`filter: blur(${bloomSigmaOf(b)}px)\`` : null;
  return row('LOOK', 'bloom 90 to 10% px', pa, pb, wider ?? add);
}

function fringeRow(a, b) {
  const [fa, fb] = [fringe(a), fringe(b)];
  const split = fb != null && (fa == null || differs(fa, fb, 0.5)) ? `split red and blue copies of the layer by ${round(fb, 1)} px: \`translateX(${round(fb / 2, 1)}px)\` and \`translateX(${round(-fb / 2, 1)}px)\` with \`mix-blend-mode: screen\`` : null;
  return row('LOOK', 'colour fringe px (blue minus red)', fa == null ? null : round(fa, 1), fb == null ? null : round(fb, 1), split);
}

function textureRow(a, b) {
  const [ta, tb] = [textureOf(a), textureOf(b)];
  const period = tb ? (tb.period == null ? `${round(tb.periodX)} x ${round(tb.periodY)}` : round(tb.period)) : null;
  const differ = tb && ta && (ta.kind !== tb.kind || Math.abs((ta.period ?? 0) - (tb.period ?? 0)) > 0.5);
  const advice = (tb && (!ta || differ)) ? `set the overlay's \`repeating-linear-gradient\` period to ${period} px${tb.striped ? ' with red, green and blue stripes' : ''}` : ta && !tb ? 'remove the screen texture overlay' : null;
  return row('LOOK', 'screen texture', texText(ta), texText(tb), advice);
}

function lightRows(a, b) {
  const [la, lb] = [a.look.film.luma.median, b.look.film.luma.median];
  const [ca, cb] = [a.look.film.clip, b.look.film.clip];
  return [
    row('LOOK', 'mean luma median', la, lb, differs(la, lb, 0.3) ? `${la < lb ? 'lighten' : 'darken'} the grounds: change the \`background\` of the worlds toward luma ${lb}` : null),
    row('LOOK', 'clipped share median, peak %', `${ca.median}, ${ca.peak}`, `${cb.median}, ${cb.peak}`, cb.median > 2 * ca.median + 0.5 || cb.peak > 2 * ca.peak + 1 ? 'push the brights to full white: set the highlight text or shape colour to #fff' : null),
  ];
}

function surfaceRows(a, b) {
  const [ga, gb] = [grainOf(a), grainOf(b)], [xa, xb] = [focusOf(a), focusOf(b)];
  const glowA = a.look.film.glow?.name ?? 'none', glowB = b.look.film.glow?.name ?? 'none';
  return [
    row('LOOK', 'glow colour', glowA, glowB, b.look.film.glow && glowA !== glowB ? `tint the glow ${glowB}: the colour of the blurred glow layer` : null),
    row('LOOK', 'grain sigma (levels)', ga, gb, gb != null && (ga == null || differs(ga, gb, 0.5)) ? `${(ga ?? 0) < gb ? 'raise' : 'lower'} the grain overlay opacity (the noise layer's \`opacity\`) until the flat-tile noise reads ${gb} levels` : null),
    row('LOOK', 'focus ratio (sharp over soft)', xa, xb, xa != null && xb != null && differs(xa, xb, 0.5) ? (xa < xb ? 'add depth of field: blur the background layer (`filter: blur()`) and keep the subject sharp' : 'even the focus: remove the blur on the background layer') : null),
  ];
}

function colourRows(a, b) {
  const [ca, cb] = [a.look.colour, b.look.colour];
  const darker = Math.abs(ca.shareDark - cb.shareDark) > 0.15;
  return [
    row('LOOK', 'chroma median', ca.chromaMedian, cb.chromaMedian, differs(ca.chromaMedian, cb.chromaMedian, 0.4) ? `${ca.chromaMedian < cb.chromaMedian ? 'saturate' : 'desaturate'} the palette custom properties on \`:root\` toward chroma ${cb.chromaMedian}` : null),
    row('LOOK', 'share dark, light', `${ca.shareDark}, ${ca.shareLight}`, `${cb.shareDark}, ${cb.shareLight}`, darker ? `${ca.shareDark < cb.shareDark ? 'darken' : 'lighten'} the grounds: the reference is ${Math.round(cb.shareDark * 100)}% dark pixels, yours ${Math.round(ca.shareDark * 100)}%` : null),
  ];
}

const lookRows = (a, b) => [...lightRows(a, b), bloomRow(a, b), fringeRow(a, b), textureRow(a, b), ...surfaceRows(a, b), ...colourRows(a, b)];

function typeRows(a, b) {
  const ca = med(a.type.words.map((w) => w.capHeightPct)), cb = med(b.type.words.map((w) => w.capHeightPct));
  const ha = med(a.type.words.map((w) => w.hold)), hb = med(b.type.words.map((w) => w.hold));
  return [
    row('TYPE', 'words read', a.type.words.length, b.type.words.length, null),
    row('TYPE', 'median text box height % of frame', ca, cb, differs(ca, cb, 0.35) ? `${ca < cb ? 'enlarge' : 'reduce'} the type: \`font-size\` from about ${med(a.type.words.map((w) => w.fontPx))} px to about ${med(b.type.words.map((w) => w.fontPx))} px` : null),
    row('TYPE', 'median word hold s', ha, hb, differs(ha, hb, 0.35) ? `${ha < hb ? 'hold' : 'clear'} each word ${ha < hb ? 'longer' : 'sooner'}: set its on-screen time to ${hb} s (now ${ha} s)` : null),
  ];
}

const leadOf = (m) => med(m.sound.hits.map((h) => h.leadMs));
const onsetRate = (m) => round(m.sound.hits.length / m.media.duration, 2);
const lufsOf = (m) => m.sound.mp4?.lufs ?? m.sound.page?.mix?.lufs ?? null;

function soundRows(a, b) {
  const [la, lb] = [lufsOf(a), lufsOf(b)];
  const [ra, rb] = [onsetRate(a), onsetRate(b)];
  const [da, db] = [leadOf(a), leadOf(b)];
  const louder = la != null && lb != null && Math.abs(la - lb) > 2 ? `${la < lb ? 'raise' : 'lower'} the mix by ${round(Math.abs(la - lb), 1)} dB: the \`data-gain\` of the loudest \`<audio>\` tag, or the bed` : null;
  const tempo = a.sound.bpm && b.sound.bpm && differs(a.sound.bpm, b.sound.bpm, 0.15) ? `retime the cues to ${b.sound.bpm} BPM: the \`data-at\` of the repeating cue` : null;
  const lead = da != null && db != null && Math.abs(da - db) > 40 ? `move each cue to ${db} ms before its cut: the cue's \`data-at\`` : null;
  return [
    row('SOUND', 'integrated loudness LUFS', la, lb, louder),
    row('SOUND', 'tempo BPM', a.sound.bpm, b.sound.bpm, tempo),
    row('SOUND', 'onsets per second', ra, rb, differs(ra, rb, 0.4) ? `${ra < rb ? 'add' : 'remove'} cues: one \`<audio data-synth data-at>\` per event` : null),
    row('SOUND', 'median sound lead to the nearest cut ms', da, db, lead),
  ];
}

/** All delta rows of a (yours) against b (the reference): [{ section, measure, a, b, delta, advice }]. */
export function compareSides(a, b) {
  const delta = (x, y) => (typeof x === 'number' && typeof y === 'number' ? round(x - y) : null);
  return [...structureRows(a, b), ...motionRows(a, b), ...lookRows(a, b), ...typeRows(a, b), ...soundRows(a, b)].map((r) => ({ ...r, delta: delta(r.a, r.b) }));
}

/** The vs section as lines: one table of deltas, then the advice lines. Pure. */
export function vsLines(rows, names) {
  const cell = (v) => (v == null ? '-' : String(v));
  const w = [Math.max(7, ...rows.map((r) => r.measure.length)), Math.max(names[0].length, ...rows.map((r) => cell(r.a).length)), Math.max(names[1].length, ...rows.map((r) => cell(r.b).length))];
  const line = (r) => `| ${r[0].padEnd(w[0])} | ${r[1].padEnd(w[1])} | ${r[2].padEnd(w[2])} | ${r[3]} |`;
  const L = [line(['measure', names[0], names[1], 'delta']), `|${w.map((x) => '-'.repeat(x + 2)).join('|')}|-------|`];
  let section = '';
  for (const r of rows) {
    if (r.section !== section) { section = r.section; L.push(line([`**${section}**`, '', '', ''])); }
    L.push(line([r.measure, cell(r.a), cell(r.b), r.delta == null ? '' : (r.delta > 0 ? '+' : '') + r.delta]));
  }
  const advice = rows.filter((r) => r.advice);
  L.push('', `Advice (a is yours, b is the reference; ${advice.length} delta${advice.length === 1 ? '' : 's'} worth acting on):`);
  for (const r of advice) L.push(`- ${r.measure}: ${r.advice}`);
  if (!advice.length) L.push('- no measured gap: look at the paired images.');
  return L;
}
