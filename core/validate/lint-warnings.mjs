// lintData(data) → warnings[]: authoring smells the schema can't express. Non-failing (CLI prints ⚠;
// boot never calls this). Each rule below maps to a real bug that shipped this session and slipped
// every existing gate. Pure. Scene layers only.
import { isObj } from './util.mjs';
import { onScreenText, glyphText } from '../type/on-screen-text.js';
import { mergePan } from '../timeline/pan-resolve.mjs';
import { motionAt } from '../timeline/sequence.js';

// The label the window, count and collision rules report a layer with. Three of the rules below share
// it, so it is declared once here rather than inside each.
const layerName = (L, i) => `layer[${i}] (${L.type || 'text'}${typeof L.text === 'string' ? ` "${onScreenText(L.text).slice(0, 24)}"` : ''})`;

function becomesHandoverWarns(data) {
  const warns = [];
  // `becomes` overwrites the incoming layer's opening keys: during the handover the layer is not itself
  // yet, so `resolveBecomes` replaces everything it declared inside the window with the computed
  // open/settle pair. That is right, and it is DATA THE AUTHOR WROTE BEING DISCARDED, which has to be
  // said out loud rather than inferred from a source comment nobody reads while authoring.
  for (const [i, A] of (data.layers || []).entries()) {
    if (!isObj(A) || typeof A.becomes !== 'string') continue;
    const B = (data.layers || []).find((x) => isObj(x) && x.id === A.becomes);
    if (!isObj(B) || !Array.isArray(B.motion)) continue;
    const dur = Math.max(0.05, typeof A.becomesDur === 'number' ? A.becomesDur : 0.42);
    const lost = B.motion.filter((k) => isObj(k) && (typeof k.t === 'number' ? k.t : 0) <= dur + 1e-6);
    if (lost.length) {
      warns.push(`layers[${i}]${A.id ? ` #${A.id}` : ''}: becomes "${B.id}", and the handover takes ${dur}s, so ${lost.length} of "${B.id}"'s own motion key(s) at t≤${dur} (${lost.map((k) => `t=${k.t ?? 0}`).join(', ')}) are DROPPED and replaced by the computed match. Move them past ${dur}s, or shorten \`becomesDur\`.`);
    }
  }
  return warns;
}

// A key states what changes and says nothing about the rest, and `motionAt`/`cameraAt` read that
// silence as IDENTITY, not as "unchanged" (core/timeline/sequence.js). That contract is deliberate and scenes
// depend on it. A layer whose only `opacity` key sits at the end fades over the last segment precisely
// because the keys before it read as opacity 1. But it means a track that declares a property, moves it
// somewhere, and then stops mentioning it SNAPS it home, and nothing about the JSON looks wrong.
//
// So it is warned about rather than changed. Changing the reader was tried and measured: per-property
// interpolation altered 19 scenes and made one film's button invisible throughout (#195). Splitting the
// semantics so camera and layer tracks behave differently would be a worse trap than either. One
// contract, stated out loud when it is about to bite. Only when the reset actually MOVES something.
// A property dropped while it already sat at identity changes nothing and is not worth a word.
const RESET_IDENT = { x: 0, y: 0, scale: 1, rot: 0, opacity: 1, blur: 0, s: 1, rx: 0, ry: 0, p: 1600 };
function resetScan(keys, props, label, warns) {
  if (!Array.isArray(keys) || keys.length < 2) return;
  for (const pr of props) {
    const first = keys.findIndex((k) => isObj(k) && k[pr] != null);
    if (first < 0) continue;
    for (let i = first + 1; i < keys.length; i++) {
      if (!isObj(keys[i]) || keys[i][pr] != null) continue;
      const prior = keys.slice(0, i).reverse().find((k) => isObj(k) && k[pr] != null);
      if (prior && Math.abs(prior[pr] - RESET_IDENT[pr]) > 1e-9) {
        warns.push(`${label}: \`${pr}\` is ${prior[pr]} at t=${prior.t}, and the key at t=${keys[i].t} does not mention it. A key that omits a property RESETS it to ${RESET_IDENT[pr]}, it does not hold it. Restate \`${pr}\` on that key (and every later one) unless you mean it to snap back.`);
      }
      break;
    }
  }
}

function walkResetTracks(ls, warns) {
  (ls || []).forEach((L, i) => {
    if (!isObj(L)) return;
    resetScan(L.motion, ['x', 'y', 'scale', 'rot', 'opacity', 'blur'], `layers[${i}]${L.id ? ` #${L.id}` : ''}`, warns);
    if (Array.isArray(L.children)) walkResetTracks(L.children, warns);
  });
}

function omittedKeyResetWarns(data) {
  const warns = [];
  const cam = Array.isArray(data.camera) ? data.camera : Array.isArray(data.cam) ? data.cam : null;
  if (cam) resetScan(cam, ['s', 'x', 'y', 'rx', 'ry', 'p'], 'camera', warns);
  walkResetTracks(data.layers, warns);
  return warns;
}

function inertPropWarns(data) {
  const warns = [];
  // A prop that is read only INSIDE a conditional on another prop does nothing when that other prop is
  // absent, and does it silently, which is the failure class this repo hates most. Three of them live
  // in the anchor/align code, and CLAUDE.md already describes two as things that "render silently"
  // rather than fixing them (engine-doctrine/MISTAKES.md #199). `at` is skipped for blocks, where it is an
  // unrelated block param (`tapRipple` uses `at: 2.1` as a time), the prop is overloaded, and a check
  // that did not know that would have fired on innocent scenes.
  for (const [i, L] of (data.layers || []).entries()) {
    if (!isObj(L)) continue;
    const label = `layers[${i}]${L.id ? ` #${L.id}` : ''}`;
    // `elevation` writes an inset 1px ring as part of its depth stack, so `border` is DROPPED beside it
    // (core/layers/util.js). That is the right pixel answer. Two rings on one edge read as a mistake,
    // but it is a prop the author wrote being discarded without a word, and on a DARK surface the ring
    // it substitutes is rgba(255,255,255,0.06), which is not the visible 1px line the author asked for.
    // Said out loud rather than changed: 132 layers across this library already set both, and honouring
    // the border would restyle every one of them.
    if (L.border && L.elevation) {
      warns.push(`${label}: sets both \`border\` and \`elevation\`, and elevation wins. The border is DROPPED and replaced by elevation's inset ring (${L.on === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}). On a dark surface that ring is nearly invisible. Drop one: \`elevation\` for depth, or \`border\` + \`glow\` for a lit edge.`);
    }
    if (typeof L.at === 'string' && !L.anchor && L.type !== 'block') {
      warns.push(`${label}: \`at: "${L.at}"\` positions a layer against its \`anchor\`, and there is no \`anchor\`, so it is IGNORED and the layer sits at its own x/y. Add \`anchor: "<id>"\`, or drop \`at\`.`);
    }
    if (typeof L.at === 'string' && L.anchor && L.at.endsWith('center') && L.w == null) {
      warns.push(`${label}: \`at: "${L.at}"\` centres this layer on its anchor by subtracting half its OWN width, and it has no \`w\`, so it silently falls back to a plain left offset. Give it \`w\`.`);
    }
    if ((L.align === 'center' || L.align === 'right') && L.w == null && L.type !== 'block') {
      warns.push(`${label}: \`align: "${L.align}"\` aligns text inside the layer's box, and without \`w\` that box shrink-wraps the text, so the alignment does nothing. Give it \`w\`, or drop \`align\`.`);
    }
  }
  return warns;
}

// A GROUP CHILD'S WINDOW IS ITS GROUP'S WINDOW. `addGroupChild` computes it as
// `(rootL.start ?? 0) + delay` and `(rootL.duration ?? 0) - delay`, both read off the GROUP, so a
// child's own `start` and `duration` are never looked at. 30 starts and 14 durations across 9 films are
// written today and every one of them renders as the parent's window.
//
// Warned rather than honoured, and warned rather than refused. Honouring an absolute start would let a
// child outlive the group that contains it, which ends containment in the one dimension it still held,
// and `delay` already expresses the offset, so a second spelling would be the fork this codebase logs
// as the source of most of its drift. Refusing would break nine shipped films at boot over a prop that
// has never done anything, and a debt is not an emergency.
//
// Same shape and the same reasoning as the `border`/`elevation` pair in inertPropWarns: said out loud,
// on every run, rather than changed underneath the layers that already rely on the current answer.
//
// RECURSIVE, unlike its neighbours. inertPropWarns walks `data.layers` and stops, which is right for a
// rule about a top-level layer's own props; this one is about the CONTAINMENT relationship, and that
// relationship exists at every depth. A one-level walk would have reported 28 of the 30.
function childWindowWarns(data) {
  const warns = [];
  const walkChildren = (ls, path) => {
    for (const [i, L] of (ls || []).entries()) {
      if (!isObj(L)) continue;
      const label = `${path}[${i}]${L.id ? ` #${L.id}` : ''}`;
      for (const [ci, C] of (L.children || []).entries()) {
        if (!isObj(C)) continue;
        const wrote = [C.start != null && '`start`', C.duration != null && '`duration`'].filter(Boolean);
        if (wrote.length) warns.push(`${label}.children[${ci}]${C.id ? ` #${C.id}` : ''}: sets ${wrote.join(' and ')}, `
          + `and a group child's window IS its group's window, so ${wrote.length > 1 ? 'both are' : 'it is'} read off the `
          + `group and the child's ${wrote.length > 1 ? 'are' : 'is'} DISCARDED. Use \`delay\` (seconds into the group's `
          + `window) for the child's own timing, and put the window on the group.`);
      }
      walkChildren(L.children, `${label}.children`);
      walkChildren(L.layers, `${label}.layers`);
    }
  };
  walkChildren(data.layers, 'layers');
  return warns;
}

// `panWith` copies a track as DELTAS, so the x/y an author writes is where the layer STARTS and the
// pan carries it somewhere else. That total is computable and appears nowhere: not in the layer, not
// in the source, not in any error. Two separate bugs came from guessing it, the button snapping
// 194px backwards (#194) and, in the very next edit, three dots parked 274px off the end of the word
// they belong to. Both times the file read as intended. So the arithmetic is simply printed.
// Only when the shift is big enough to matter: a pan that moves a layer a few px needs no announcing.
const PAN_REST_MIN = 24;
function panRestWarning(L, src, label) {
  let track;
  try { track = mergePan(L, src); } catch { return null; }
  const end = Math.max(...track.map((k) => (typeof k.t === 'number' ? k.t : 0)));
  const at = motionAt(track, end);
  const dx = Math.round(at.dx || 0), dy = Math.round(at.dy || 0);
  if (Math.hypot(dx, dy) < PAN_REST_MIN) return null;
  const bx = typeof L.x === 'number' ? L.x : null, by = typeof L.y === 'number' ? L.y : null;
  return `${label}: pans with "${L.panWith}", so its x/y is where it STARTS`
    + `${bx != null ? ` (${bx}${by != null ? `, ${by}` : ''})` : ''}. It comes to rest ${dx ? `${dx > 0 ? '+' : ''}${dx}px across` : ''}`
    + `${dx && dy ? ' and ' : ''}${dy ? `${dy > 0 ? '+' : ''}${dy}px down` : ''}`
    + `${bx != null ? `, at (${bx + dx}${by != null ? `, ${by + dy}` : ''})` : ''}. Place it by where it STARTS, not where you want it to land.`;
}

function panWithRestWarns(data) {
  const warns = [];
  for (const [i, L] of (data.layers || []).entries()) {
    if (!isObj(L) || typeof L.panWith !== 'string') continue;
    const src = (data.layers || []).find((x) => isObj(x) && x.id === L.panWith);
    if (!isObj(src) || typeof src.panWith === 'string' || !Array.isArray(src.motion) || !src.motion.length) continue;
    const msg = panRestWarning(L, src, `layers[${i}]${L.id ? ` #${L.id}` : ''}`);
    if (msg) warns.push(msg);
  }
  return warns;
}

function missingWindowWarns(data) {
  const warns = [];
  const layers = Array.isArray(data?.layers) ? data.layers : [];
  // (1) MISSING WINDOW: a layer with no `duration` renders for the ENTIRE video (engine default). Almost
  //     always a slip (the "+" gutter that leaked for 53s). Full-bleed backdrops opt out with track:0.
  layers.forEach((L, i) => {
    if (!isObj(L)) return;
    if (L.duration == null && L.track !== 0) warns.push(`${layerName(L, i)} has no "duration". Renders for the whole video. Add start+duration (or track:0 for an intentional backdrop).`);
  });
  return warns;
}

function countWindowWarns(data) {
  const warns = [];
  const layers = Array.isArray(data?.layers) ? data.layers : [];
  // (2b) countStart is LOCAL to the layer's own `start` (count.js: interpolate(t - start, [cs, cs+cd])),
  //      NOT an absolute scene time. Setting it to the wall-clock second the count should fire is the
  //      classic footgun: the animation window falls outside the layer's visible span, so the number
  //      freezes on its `from` value and the render is silently wrong (engine-doctrine/MISTAKES.md #147). If
  //      countStart alone already meets/exceeds the layer's duration, the count can never animate.
  layers.forEach((L, i) => {
    if (!isObj(L) || L.type !== 'count') return;
    const dur = L.duration ?? 2, cs = L.countStart ?? 0, cd = L.countDur ?? 1.2;
    if (cs >= dur) warns.push(`${layerName(L, i)} has countStart ${cs} ≥ its duration ${dur}. countStart is LOCAL to the layer's start (t - start), not an absolute scene time. The count never animates and freezes at "from". Use a small local offset (e.g. countStart 0.2) and set the layer's own start to when it appears.`);
    else if (cs + cd > dur + 0.05) warns.push(`${layerName(L, i)} count window (countStart ${cs} + countDur ${cd} = ${(cs + cd).toFixed(1)}) runs past its duration ${dur}. The count-up gets cut off before it lands. Shorten countDur or lengthen duration.`);
  });
  return warns;
}

// MEASURE THE GLYPHS, NOT THE BOX THE AUTHOR ASKED FOR. On a rect, an image, an html layer or a
// group, `w`/`h` size the element and the declared box IS what gets painted. On a TEXT layer they do
// not: `w` is a WRAPPING width (`pin` centres a box, so a placed line has to declare one), `align`
// decides where inside it the glyphs sit, and `h` is absent so the old estimate assumed one line.
// So a 1200px-wide layer reading "Hi" was compared as a 1200px-wide object and collided with a
// neighbour it comes nowhere near, while a layer whose copy wraps to four lines was compared as one.
// Both are findings about the JSON, not about the film (engine-doctrine/MISTAKES.md #214 and its recurrences).
//
// This file is pure and browser-safe, so there is no font to measure with. Estimate the run from the
// STRING instead: a heavy sans averages roughly half an em per glyph, and 0.55 is deliberately on the
// generous side because over-estimating the ink keeps real collisions reported. Markup contributes no
// width, so it is stripped first.
//
// WIDTH ONLY. The obvious next step is to divide the run by `w` and give a wrapped line a taller box,
// and it was written, measured and removed: at 0.55 em a short word in a narrow column reads as
// wrapping when it does not, and the guessed second line reached down into the caption beneath it.
// That added 11 collision warnings across the library, every one of them a heading that fits on its
// line. A gate that manufactures a defect is worse than one that misses it (engine-doctrine/MISTAKES.md #211,
// and the retired typing rule), so the height stays the old single-line estimate: it under-states, and
// under-stating can only drop a finding, never invent one.
const ADVANCE = 0.55;                                  // average glyph advance, in em
const LINE_HEIGHT = 1.04;                              // .hs-text in films/scene/scene.css
const TEXT_IS_NOT_ITS_BOX = new Set(['text', 'count']);
function inkBox(L) {
  const size = L.size ?? 40;
  // GLYPHS, not words: this multiplies a character count by an average advance to guess how wide the
  // ink runs, so it must count what the DOM counts. onScreenText yields a space for a `<br>`, which
  // is right for reading and wrong here. It padded every emphasised line by a character per tag.
  const copy = typeof L.text === 'string' ? glyphText(L.text).trim()
    : L.value != null ? String(L.value) : null;
  if (!copy) return null;                              // nothing readable to measure: fall back to `w`
  const run = copy.length * size * ADVANCE;
  const lineW = Math.min(L.w, run);
  const x0 = L.align === 'center' ? L.x + (L.w - lineW) / 2
    : L.align === 'right' ? L.x + L.w - lineW
    : L.x;
  return { x0, x1: x0 + lineW };
}

function collisionBox(L) {
  if (typeof L.start === 'string' || L.x == null || L.y == null || L.w == null) return null;
  const ink = TEXT_IS_NOT_ITS_BOX.has(L.type || 'text') ? inkBox(L) : null;
  // 1.04 is the engine's own line-height for .hs-text (films/scene/scene.css). The estimate used to
  // be 1.3, which is nobody's number: it gave every headline a box a quarter taller than the line the
  // renderer draws, and that phantom band under a title is what "collided" with the caption below it.
  const h = L.h != null ? L.h : (L.size ?? 40) * LINE_HEIGHT;
  const s = L.start ?? 0;
  return { x0: ink ? ink.x0 : L.x, y0: L.y, x1: ink ? ink.x1 : L.x + L.w, y1: L.y + h, s, e: s + (L.duration ?? 2) };
}

function collisionPairWarning(A, B) {
  if (A.L.group || B.L.group || (A.L.anchor && A.L.anchor === B.L.id) || (B.L.anchor && B.L.anchor === A.L.id)) return null;
  const t0 = Math.max(A.b.s, B.b.s), t1 = Math.min(A.b.e, B.b.e);
  if (t1 - t0 <= 0.3) return null; // time windows barely/never overlap
  const ix = Math.min(A.b.x1, B.b.x1) - Math.max(A.b.x0, B.b.x0);
  const iy = Math.min(A.b.y1, B.b.y1) - Math.max(A.b.y0, B.b.y0);
  if (ix <= 0 || iy <= 0) return null; // boxes disjoint in space
  const frac = (ix * iy) / Math.min((A.b.x1 - A.b.x0) * (A.b.y1 - A.b.y0), (B.b.x1 - B.b.x0) * (B.b.y1 - B.b.y0));
  // full containment (chip inside a card) is intentional; flag the PARTIAL-overlap band only.
  if (frac < 0.3 || frac > 0.95) return null;
  return `${layerName(A.L, A.i)} and ${layerName(B.L, B.i)} overlap ~${Math.round(frac * 100)}% in space and ${(t1 - t0).toFixed(1)}s in time (t=${t0.toFixed(1)}-${t1.toFixed(1)}). A scene may be colliding with the next.`;
}

function sceneCollisionWarns(data) {
  const warns = [];
  const layers = Array.isArray(data?.layers) ? data.layers : [];
  // (3) SCENE COLLISION: two CONTENT layers overlapping in BOTH space and time, not in a
  //     containment/group/anchor relationship = one scene bleeding into the next (the Preferences↔agents
  //     overlap). Pure geometry; needs an explicit w to bound a box (numeric starts only).
  const CONTENT = new Set(['text', 'count', 'doc', 'image', 'group', 'board', 'html']);
  const cand = layers.map((L, i) => ({ L, i, b: isObj(L) && CONTENT.has(L.type || 'text') ? collisionBox(L) : null })).filter((o) => o.b);
  for (let a = 0; a < cand.length; a++) {
    for (let b = a + 1; b < cand.length; b++) {
      const msg = collisionPairWarning(cand[a], cand[b]);
      if (msg) warns.push(msg);
    }
  }
  return warns;
}

// A scene that states neither `aspect` nor `orientation` renders 9:16. core/engine/boot.js resolves the canvas
// as ?aspect= > data.aspect > orientation, and the orientation fallback is portrait; nothing said so. A
// 16:9 film authored that way spent an hour being debugged as "the panel vanishes when its track starts"
// before ffprobe showed a 1080px-wide canvas (engine-doctrine/MISTAKES.md #569). A default that changes the whole
// composition must not be silent. A warning, not an error: 10 library scenes rely on the default today.
function noAspectWarns(data) {
  if (!isObj(data) || data.aspect || data.orientation || data.orient) return [];
  return ['no "aspect" stated, so this renders 9:16 (portrait) by default. State the canvas: "aspect": "16:9" | "9:16" | "1:1" | "4:5" | "4:3".'];
}

// A kinetic split group's whole arrival must read as ONE beat: engine-doctrine/RULES caps the last unit's delay
// at 0.5s, past that it reads as a typewriter, not a reveal. core/tracks/units.js scales the default for
// an UNAUTHORED stagger, but a number or object the author actually wrote is a decision, so this warns
// instead of overriding it. Unit count is estimated the same way splitText (core/type/type.js) counts them:
// words by default, chars for 'char'/ransom/circle, lines for 'line'.
const STAGGER_BUDGET = 0.5;
function unitCount(L, mode) {
  return mode === 'char'
    ? glyphText(L.text).replace(/\s+/g, '').length
    : mode === 'line'
      ? glyphText(L.text).split('\n').length
      : onScreenText(L.text).split(/\s+/).filter(Boolean).length;
}

function staggerTotalWarning(L, i, n) {
  let step = null, label = null;
  if (typeof L.stagger === 'number') { step = L.stagger; label = `stagger ${step}`; }
  else if (isObj(L.stagger) && typeof L.stagger.amount === 'number') {
    if (L.stagger.amount > STAGGER_BUDGET) return `${layerName(L, i)} split into ${n} units with stagger.amount ${L.stagger.amount}s, over the ${STAGGER_BUDGET}s cap for one arrival. Past that the group reads as a typewriter, not a beat. Lower amount, or split fewer units (word instead of char).`;
    return null;
  } else if (isObj(L.stagger) && typeof L.stagger.each === 'number') { step = L.stagger.each; label = `stagger.each ${step}`; }
  if (step == null) return null;
  const total = step * (n - 1);
  if (total <= STAGGER_BUDGET) return null;
  return `${layerName(L, i)} split into ${n} units at ${label}, so the last unit arrives ${total.toFixed(2)}s after the first, over the ${STAGGER_BUDGET}s cap for one arrival. Past that the group reads as a typewriter, not a beat. Lower the stagger, or use "stagger": { "amount": ${STAGGER_BUDGET} } to cap the total directly.`;
}

function staggerTotalWarns(data) {
  const warns = [];
  const layers = Array.isArray(data?.layers) ? data.layers : [];
  layers.forEach((L, i) => {
    if (!isObj(L) || (!L.split && !L.ransom && !L.circle) || L.circle || L.fx || typeof L.text !== 'string') return;
    const mode = L.split || ((L.ransom || L.circle) ? 'char' : 'word');
    const n = unitCount(L, mode);
    if (n < 2) return;
    const msg = staggerTotalWarning(L, i, n);
    if (msg) warns.push(msg);
  });
  return warns;
}

export function lintData(data) {
  return [
    ...becomesHandoverWarns(data),
    ...omittedKeyResetWarns(data),
    ...inertPropWarns(data),
    ...childWindowWarns(data),
    ...panWithRestWarns(data),
    ...missingWindowWarns(data),
    // (2) TYPING + MARKUP: RETIRED, and the retirement is the point. This rule warned that `typing`
    //     reveals characters literally so `<b>`/`<em>` show as visible tags. That was true when it was
    //     written and stopped being true on 2026-07-24, when core/layers/text.js gained an HTML-safe
    //     typing path (`revealHtml`): the VISIBLE characters are counted and revealed while the tags stay
    //     intact, so an accent word types in ITS OWN COLOUR. The rule outlived the bug by a fortnight and
    //     went on telling authors to strip markup the engine handles correctly, a gate that manufactures
    //     a defect, which is worse than one that misses it, because the author pays by making the film
    //     plainer. engine-doctrine/MISTAKES.md #85.
    //     Nothing replaces it: `stripLen`/`revealHtml` are exercised by `make lib-test`, and lint-test
    //     now pins that typed markup is SILENT so this cannot be reintroduced by reflex.
    ...countWindowWarns(data),
    ...sceneCollisionWarns(data),
    ...noAspectWarns(data),
    ...staggerTotalWarns(data),
  ];
}
