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
/** How to change an optical effect: the lens option when the page films its screen with the lens, else the way to start. Optical effects are never faked in CSS. */
const lens = (a, option, detail) => (a.source.lens ? `${option} ${detail} (core/surfaces/lens.js)` : `film the screen with the lens (prompts/moves/lens.md), then ${option} ${detail}`);
const worldWord = (m) => (m.source.kind === 'page' ? 'world' : 'shot');

const tidy = (v) => (typeof v === 'number' ? round(v, 3) : v);
const row = (section, measure, a, b, advice) => ({ section, measure, a: tidy(a), b: tidy(b), advice: advice ?? null });

const flashCountAdvice = (a, b) => {
  const d = b.look.flashes.length - a.look.flashes.length;
  if (d === 0) return null;
  return `${d > 0 ? 'add' : 'remove'} ${Math.abs(d)} flash${Math.abs(d) === 1 ? '' : 'es'}: yours ${a.look.flashes.length}, the reference ${b.look.flashes.length}; a flash is a full-frame white layer whose opacity rises and falls in a few frames (the reference's biggest runs ${flashPeak(b)?.frames ?? '?'} f)`;
};

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
    row('STRUCTURE', 'flashes', a.look.flashes.length, b.look.flashes.length, flashCountAdvice(a, b)),
    row('STRUCTURE', 'biggest flash frames, peak luma', fa ? `${fa.frames} f, ${fa.peakLuma}` : '-', fb ? `${fb.frames} f, ${fb.peakLuma}` : '-', fa && fb && a.look.flashes.length === b.look.flashes.length && (differs(fa.frames, fb.frames, 0.4) || differs(fa.peakLuma, fb.peakLuma, 0.15)) ? `set the flash layer's keyframe length to ${fb.frames} f (${fb.seconds} s) and its peak opacity so the mean luma reaches ${fb.peakLuma} (now ${fa.peakLuma})` : null),
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
  const wider = pa != null && pb != null && differs(pa, pb, 0.35) ? lens(a, `${pb > pa ? 'raise' : 'lower'}`, `bloom.radius until the glow measures ${pb} px (90 to 10%, gaussian sigma about ${bloomSigmaOf(b)} px; yours ${pa} px)`) : null;
  const add = pb != null && pa == null ? lens(a, 'turn on', `bloom {strength, radius} until the glow measures ${pb} px (sigma about ${bloomSigmaOf(b)} px)`) : null;
  return row('LOOK', 'bloom 90 to 10% px', pa, pb, wider ?? add);
}

function fringeRow(a, b) {
  const [fa, fb] = [fringe(a), fringe(b)];
  const [sa, sb] = [a.look.film.chroma?.share ?? 0, b.look.film.chroma?.share ?? 0];
  const split = (fb != null && (fa == null || differs(fa, fb, 0.5))) || sb >= sa + 20 ? lens(a, 'set', `aberration.amount so that ${sb}% of edges show a fringe of 1 px or more (yours ${sa}%; median offset ${round(fb ?? 0, 1)} px against ${round(fa ?? 0, 1)} px)`) : null;
  return row('LOOK', 'colour fringe: median px, share of edges at 1 px or more', `${round(fa ?? 0, 1)} px, ${sa}%`, `${round(fb ?? 0, 1)} px, ${sb}%`, split);
}

function textureRow(a, b) {
  const [ta, tb] = [textureOf(a), textureOf(b)];
  const period = tb ? (tb.period == null ? `${round(tb.periodX)} x ${round(tb.periodY)}` : round(tb.period)) : null;
  const differ = tb && ta && (ta.kind !== tb.kind || Math.abs((ta.period ?? 0) - (tb.period ?? 0)) > 0.5);
  const advice = (tb && (!ta || differ)) ? lens(a, 'set', `grid {layout: '${tb.striped ? 'stripe' : tb.kind === 'grid' ? 'dot' : 'stripe'}', cell: ${period}} (the reference's pattern, ${texText(tb)})`) : ta && !tb ? lens(a, 'set', 'grid.amount to 0') : null;
  return row('LOOK', 'screen texture', texText(ta), texText(tb), advice);
}

function lightRows(a, b) {
  const [la, lb] = [a.look.film.luma.median, b.look.film.luma.median];
  const [ca, cb] = [a.look.film.clip, b.look.film.clip];
  return [
    row('LOOK', 'mean luma median', la, lb, differs(la, lb, 0.3) ? `${la < lb ? 'raise' : 'lower'} the mean luma toward ${lb}: the ground colours of the worlds, or ${lens(a, 'set', 'exposure')}` : null),
    row('LOOK', 'clipped share median, peak %', `${ca.median}, ${ca.peak}`, `${cb.median}, ${cb.peak}`, cb.median > 2 * ca.median + 0.5 || cb.peak > 2 * ca.peak + 1 ? lens(a, 'raise', 'exposure (and bloom.strength) until the clipped share reaches the reference') : null),
  ];
}

function surfaceRows(a, b) {
  const [ga, gb] = [grainOf(a), grainOf(b)], [xa, xb] = [focusOf(a), focusOf(b)];
  const glowA = a.look.film.glow?.name ?? 'none', glowB = b.look.film.glow?.name ?? 'none';
  return [
    row('LOOK', 'glow colour', glowA, glowB, b.look.film.glow && glowA !== glowB ? lens(a, 'set', `palette {stops} so the bright end tints ${glowB}`) : null),
    row('LOOK', 'grain sigma (levels)', ga, gb, gb != null && (ga == null || differs(ga, gb, 0.5)) ? lens(a, (ga ?? 0) < gb ? 'raise' : 'lower', `grain until the flat-tile noise reads ${gb} levels (yours ${ga ?? 0})`) : null),
    row('LOOK', 'focus ratio (sharp over soft)', xa, xb, xa != null && xb != null && differs(xa, xb, 0.5) ? lens(a, xa < xb ? 'raise' : 'lower', `dof {blur, focus} until the sharp-over-soft ratio reads ${xb} (yours ${xa})`) : null),
  ];
}

function colourRows(a, b) {
  const [ca, cb] = [a.look.colour, b.look.colour];
  const darker = Math.abs(ca.shareDark - cb.shareDark) > 0.15;
  return [
    row('LOOK', 'chroma median', ca.chromaMedian, cb.chromaMedian, differs(ca.chromaMedian, cb.chromaMedian, 0.4) ? `${ca.chromaMedian < cb.chromaMedian ? 'saturate' : 'desaturate'} the palette custom properties on \`:root\` toward chroma ${cb.chromaMedian}, or ${lens(a, 'set', 'palette.amount')}` : null),
    row('LOOK', 'share dark, light', `${ca.shareDark}, ${ca.shareLight}`, `${cb.shareDark}, ${cb.shareLight}`, darker ? `${ca.shareDark < cb.shareDark ? 'darken' : 'lighten'} the grounds: the reference is ${Math.round(cb.shareDark * 100)}% dark pixels, yours ${Math.round(ca.shareDark * 100)}%` : null),
  ];
}

const lookRows = (a, b) => [...lightRows(a, b), bloomRow(a, b), fringeRow(a, b), textureRow(a, b), ...surfaceRows(a, b), ...colourRows(a, b)];

const lowOcr = (m) => m.type.confidence === 'low';

function typeRows(a, b) {
  const ca = med(a.type.words.map((w) => w.capHeightPct)), cb = med(b.type.words.map((w) => w.capHeightPct));
  const ha = med(a.type.words.map((w) => w.hold)), hb = med(b.type.words.map((w) => w.hold));
  const trusted = !lowOcr(a) && !lowOcr(b);
  const tag = (m, n) => (lowOcr(m) ? `${n} (low confidence)` : n);
  return [
    row('TYPE', 'words read', tag(a, a.type.words.length), tag(b, b.type.words.length), null),
    row('TYPE', 'median text box height % of frame', ca, cb, trusted && differs(ca, cb, 0.35) ? `${ca < cb ? 'enlarge' : 'reduce'} the type: \`font-size\` from about ${med(a.type.words.map((w) => w.fontPx))} px to about ${med(b.type.words.map((w) => w.fontPx))} px` : null),
    row('TYPE', 'median word hold s', ha, hb, trusted && differs(ha, hb, 0.35) ? `${ha < hb ? 'hold' : 'clear'} each word ${ha < hb ? 'longer' : 'sooner'}: set its on-screen time to ${hb} s (now ${ha} s)` : null),
  ];
}

const leadOf = (m) => med(m.sound.hits.map((h) => h.leadMs));
const onsetRate = (m) => round(m.sound.hits.length / m.media.duration, 2);
const lufsOf = (m) => (m.sound.hasAudio || m.sound.page?.mix ? (m.sound.mp4?.lufs ?? m.sound.page?.mix?.lufs ?? null) : null);
const heard = (m) => lufsOf(m) != null;
const orNone = (m, v) => (heard(m) ? v : 'no audio');

function soundRows(a, b) {
  const both = heard(a) && heard(b);
  const [la, lb] = [lufsOf(a), lufsOf(b)];
  const [ra, rb] = [onsetRate(a), onsetRate(b)];
  const [da, db] = [leadOf(a), leadOf(b)];
  const louder = both && Math.abs(la - lb) > 2 ? `${la < lb ? 'raise' : 'lower'} the mix by ${round(Math.abs(la - lb), 1)} dB: the \`data-gain\` of the loudest \`<audio>\` tag, or the bed` : null;
  const tempo = both && a.sound.bpm && b.sound.bpm && differs(a.sound.bpm, b.sound.bpm, 0.15) ? `retime the cues to ${b.sound.bpm} BPM: the \`data-at\` of the repeating cue` : null;
  const lead = both && da != null && db != null && Math.abs(da - db) > 40 ? `move each cue to ${db} ms before its cut: the cue's \`data-at\`` : null;
  return [
    row('SOUND', 'integrated loudness LUFS', orNone(a, la), orNone(b, lb), louder),
    row('SOUND', 'tempo BPM', orNone(a, a.sound.bpm), orNone(b, b.sound.bpm), tempo),
    row('SOUND', 'onsets per second', orNone(a, ra), orNone(b, rb), both && differs(ra, rb, 0.4) ? `${ra < rb ? 'add' : 'remove'} cues: one \`<audio data-synth data-at>\` per event` : null),
    row('SOUND', 'median sound lead to the nearest cut ms', orNone(a, da), orNone(b, db), lead),
  ];
}

/** All delta rows of a (yours) against b (the reference): [{ section, measure, a, b, delta, advice }]. */
export function compareSides(a, b) {
  const delta = (x, y) => (typeof x === 'number' && typeof y === 'number' ? round(x - y) : null);
  return [...structureRows(a, b), ...motionRows(a, b), ...lookRows(a, b), ...typeRows(a, b), ...soundRows(a, b)].map((r) => ({ ...r, delta: delta(r.a, r.b) }));
}

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
