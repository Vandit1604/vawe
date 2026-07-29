// gate-mutation.mjs — who checks the checkers?
//
//   node scripts/gates/gate-mutation.mjs        run every case
//   make gate-test
//
// A gate that cannot fail is worse than no gate: it reports green forever and everyone believes it.
// That is not hypothetical here — the image legibility floor guarded on `b.height > 1`, so the ONE
// case it existed to catch (an image occupying no space) was the one case it skipped (MISTAKES #26).
// Nothing noticed, because a gate being quiet looks exactly like a gate being satisfied.
//
// So each case feeds a gate a fixture built to trip it and asserts the gate SPEAKS. The mirror cases
// matter just as much: a fixture that must PASS, so a gate cannot buy its sensitivity by crying wolf
// (the layout audit briefly called every cross-dissolve a collision, #25).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sourceHash } from '../sim/provenance.mjs';
import { SCENE_DIR } from './paths.mjs';
import { sceneDims } from '../../core/safe.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIX = path.join(repoRoot, 'verify/fixtures');
fs.mkdirSync(FIX, { recursive: true });

const scene = (layers, extra = {}) => JSON.stringify({
  module: 'scene', aspect: '16:9', theme: 'tpot', duration: 2, audio: { silent: true },
  bg: [{ preset: 'plain', from: 0, to: 2 }], layers, ...extra,
}, null, 1);

// the canvas every fixture scene renders at, so a size case reads "canvas-sized" / "a fraction of the
// canvas" rather than a bare pixel count that goes stale the day the base aspect changes.
const [CANVAS_W, CANVAS_H] = sceneDims({ aspect: '16:9' });

const TXT = (o = {}) => ({ type: 'text', text: 'Gate mutation fixture', x: 200, y: 400, w: 1100, align: 'left', size: 90, weight: 600, start: 0, duration: 2, ...o });

/** A minimal STORYBOARD.md. Each knob turns off exactly ONE thing the gate is meant to notice, so a
 *  case cannot pass on the strength of some other tell firing in its place. */
const SB = ({ object = true, beatObject = true, duration = '5s', becomes = true,
  presetBecomes = false, held = false, stubWhy = false, endsOnClaim = false,
  t1 = '0s-1.6s', t2 = '1.6s-5s' } = {}) => [
  '---',
  'message: "The record pill turns a voice note into a structured note."',
  'audience: "People who take notes on a phone."',
  'arc: "one continuous action: the record pill is pressed and becomes a finished note"',
  ...(object ? ['object: "the record pill"', 'object_t0: "a dark pill on the note list"',
    'object_states: "pressed, swollen, flattened into a row"', 'object_last: "a note card, mid-unfold"'] : []),
  'format: 1920x1080',
  `duration: ${duration}`,
  '---',
  '',
  `## Beat 1: Record${t1 ? ` (${t1})` : ''}`,
  '- type: product_surface',
  ...(beatObject ? ['- object: the pill is pressed and swells, a waveform running inside it'] : []),
  ...(becomes ? [presetBecomes ? '- becomes: it fades out, then slides up and scales'
    : '- becomes: the dark pill becomes a swollen recording capsule'] : []),
  '- onscreen: "Recording"',
  '- mechanism: vars morph on the pill width, cursor press',
  ...(stubWhy ? ['- why: hook'] : ['- why: show the act, not a claim about the act']),
  '',
  `## Beat 2: Structure${t2 ? ` (${t2})` : ''}`,
  '- type: payoff_withheld',
  ...(beatObject ? ['- object: the pill flattens into a row, then unfolds into a note card'] : []),
  // two named changes by default, so the long second beat is a build and not a hold
  // endsOnClaim: a final becomes that names no change at all, while `onscreen:` still puts copy up —
  // the closing sentence is the whole last act. Worded clear of animation vocabulary so this knob
  // trips ends-on-a-claim and nothing else.
  ...(becomes ? [endsOnClaim ? '- becomes: the note card, holding still under the headline'
    : held ? '- becomes: the capsule becomes a note card'
      : '- becomes: the capsule becomes a flat row, then unfolds into a note card'] : []),
  '- onscreen: "Weekly sync"',
  '- mechanism: match cut, height track on the card, typed bullets',
  '- why: the recording becomes the thing you keep',
  '',
].join('\n');

/** A `.intent.json` sidecar, the shape `make intent` writes. plan-vs-render reads exactly two fields off
 *  each beat — the `span` and the `becomes:` — so those are what the cases vary; the rest is carried so a
 *  fixture stays a plausible sidecar rather than a stub shaped to one gate. */
const B = (name, span, becomes) => ({
  at: span ? +((span[0] + span[1]) / 2).toFixed(2) : 0, ...(span ? { span } : {}), name,
  mustShow: [], mustAnimate: true, artifact: 'the beat earns its frame',
  ...(becomes ? { becomes } : {}),
});
const PLAN = (beats) => JSON.stringify({ spine: { object: 'the record pill' }, beats }, null, 1);

// A layer whose CONTENT moves every frame (`var(--t)` in the html), which is what tells plan-vs-render a
// stretch with no events is still not a still frame. Used to hold `beat-holds-still` quiet in the fixture
// that is about the AUTHORED hold, so the two tells cannot stand in for each other.
const MOVER = (o = {}) => ({ type: 'html', w: 800, x: 200, y: 700, start: 0, duration: 2,
  html: '<div style="width:100%;height:200px;background:#c2f23b;opacity:calc(0.4 + var(--t) * 0.6)"></div>', ...o });

/** A graphic big enough to BE the subject of a beat: `visual-vocabulary` only counts a pictorial layer
 *  once it covers a real share of the canvas, so the box is sized off the canvas rather than in bare
 *  pixels and stays a carrier whatever the base aspect becomes. */
const GFX = (o = {}) => ({ type: 'image', src: '/assets/icons/ui/search.svg',
  x: 300, y: 260, w: Math.round(CANVAS_W * 0.42), h: Math.round(CANVAS_H * 0.42), start: 0, duration: 2, ...o });

/** The clean film both plan-vs-render mirrors are cut from: two beats around a cut on the boundary, every
 *  planned junction carrying an arrival, no stretch long enough to read as a hold. */
const PVR_CLEAN = scene([TXT({ text: 'First', start: 0.2, duration: 1.4 }),
                         TXT({ text: 'Middle', start: 1.5, duration: 1.3 }),
                         TXT({ text: 'Second', start: 3.2, duration: 2.4 })],
  { duration: 6, bg: [{ preset: 'gradient', from: 0, to: 6 }], cuts: [{ t: 3, style: 'punch', dur: 0.4 }] });

// Each case: a fixture, the command, and what the gate must (or must not) say.
const CASES = [
  // ---- layout audit: must FAIL ----
  { gate: 'audit', name: 'overlap · two solid layers stacked', expect: 'fail', match: /overlap/,
    scene: scene([TXT(), TXT({ text: 'Second solid layer', x: 220, y: 420 })]) },
  { gate: 'audit', name: 'contrast · text barely off the bg', expect: 'fail', match: /contrast/,
    scene: scene([TXT({ text: 'Nearly invisible', color: '#fbfcfd' })]) },
  { gate: 'audit', name: 'safe-zone · layer off the frame edge', expect: 'fail', match: /safe/,
    scene: scene([TXT({ x: -260, y: 400 })]) },
  { gate: 'audit', name: 'tiny-text · below the legibility floor', expect: 'fail', match: /tiny-text/,
    scene: scene([TXT({ size: 9, text: 'unreadably small caption' })]) },
  // ---- layout audit: must PASS (a gate must not buy sensitivity with false positives) ----
  { gate: 'audit', name: 'clean scene stays green', expect: 'pass',
    scene: scene([TXT()]) },
  { gate: 'audit', name: 'cross-dissolve is NOT a collision (#25)', expect: 'pass',
    scene: scene([TXT({ text: 'State A', duration: 1.2, exitDur: 0.4 }),
                  TXT({ text: 'State B', start: 0.9, duration: 1.1, anim: 'fade', enterDur: 0.4 })]) },

  // The headline bar relaxes to WCAG-large ONLY on a filled chip (#44). Both halves are pinned here,
  // because a rule that was loosened for one video and never re-tested is how a guard quietly dies.
  { gate: 'audit', name: 'weak-headline · washed-out display type on the field', expect: 'fail', match: /weak-headline/,
    scene: scene([TXT({ text: 'Washed out heading', size: 110, color: '#9aa3ad' })]) },
  { gate: 'audit', name: 'headline on a filled brand chip is NOT weak (#44)', expect: 'pass',
    scene: scene([{ type: 'rect', x: 150, y: 380, w: 460, h: 160, bg: '#0093eb', radius: 26, start: 0, duration: 2 },
                  TXT({ text: 'Tech', x: 150, y: 400, w: 460, align: 'center', size: 110, color: '#ffffff' })]) },

  // The logotype exemption (WCAG 1.4.3) is contrast-ONLY and must be declared. Pinned in all three
  // directions so it cannot quietly become "any low-contrast text is fine".
  { gate: 'audit', name: 'logotype · a declared brand mark is contrast-exempt', expect: 'pass',
    scene: scene([{ type: 'group', x: 200, y: 400, layout: 'row', logotype: true, start: 0, duration: 2,
                    children: [{ type: 'text', text: 'o', size: 104, weight: 700, color: '#FBBC05' }] }]) },
  { gate: 'audit', name: 'logotype · undeclared low-contrast display text still fails', expect: 'fail', match: /contrast|weak-headline/,
    scene: scene([TXT({ text: 'o', size: 104, weight: 700, color: '#FBBC05' })]) },
  { gate: 'audit', name: 'logotype · exemption does NOT cover the tiny-text floor', expect: 'fail', match: /\[tiny-text\]/, outputOnly: true,
    scene: scene([{ type: 'group', x: 200, y: 400, layout: 'row', logotype: true, start: 0, duration: 2,
                    children: [{ type: 'text', text: 'unreadably small mark', size: 9, color: '#FBBC05' }] }]) },

  // A centring keyword must have something to centre. Pinned on BOTH axes and in both directions,
  // including the deliberate text-y carve-out, so "measure later" cannot quietly become "never".
  { gate: 'validate', name: 'layout · x:"center" with no w', expect: 'fail', match: /positions a box of width/,
    scene: scene([{ type: 'text', text: 'centred', x: 'center', y: 400, size: 90, start: 0, duration: 2 }]) },
  { gate: 'validate', name: 'layout · pin:"center" with no w', expect: 'fail', match: /positions a box of width/,
    scene: scene([{ type: 'text', text: 'pinned', pin: 'center', size: 90, start: 0, duration: 2 }]) },
  { gate: 'validate', name: 'layout · y:"center" on an image with no h', expect: 'fail', match: /positions a box of height/,
    scene: scene([{ type: 'image', src: '/assets/icons/ui/search.svg', x: 100, y: 'center', w: 80, start: 0, duration: 2 }]) },
  { gate: 'validate', name: 'layout · w + align is correct usage', expect: 'pass',
    scene: scene([{ type: 'text', text: 'fine', x: 'center', y: 400, w: 1200, align: 'center', size: 90, start: 0, duration: 2 }]) },
  { gate: 'validate', name: 'layout · text y-centring is the deliberate carve-out', expect: 'pass',
    scene: scene([{ type: 'text', text: 'fine', x: 100, y: 'center', w: 1200, size: 90, start: 0, duration: 2 }]) },

  // Overlap covers ALL text, not just >=60px "critical" text, because a headline that WRAPS lands on
  // the small caption beneath it. All four directions pinned: the two legitimate cases must PASS, or
  // the rule gets reverted the first time it cries wolf on a real design.
  { gate: 'audit', name: 'overlap · a wrapped headline lands on a small caption', expect: 'fail', match: /overlap/,
    scene: scene([{ type: 'text', text: 'A headline long enough to wrap onto a second line', x: 200, y: 400, w: 900, size: 90, weight: 600, start: 0, duration: 2 },
                   { type: 'text', text: 'formats/scene/file.json', x: 200, y: 500, w: 900, size: 24, font: 'mono', start: 0, duration: 2 }]) },
  { gate: 'audit', name: 'overlap · tight typographic stacking is NOT a collision', expect: 'pass',
    scene: scene([{ type: 'text', text: '1.2M', x: 200, y: 400, w: 600, size: 120, weight: 700, start: 0, duration: 2 },
                  { type: 'text', text: 'cups poured', x: 200, y: 508, w: 600, size: 20, font: 'mono', start: 0, duration: 2 }]) },
  { gate: 'audit', name: 'overlap · text hidden behind an opaque card is NOT a collision', expect: 'pass',
    // the card is LIGHT so the text beneath it still clears contrast against it — otherwise this
    // fixture fails on contrast and tells you nothing about occlusion (which is what it did first).
    scene: scene([{ type: 'text', text: 'behind the card', x: 300, y: 430, w: 600, size: 40, start: 0, duration: 2 },
                  { type: 'rect', x: 260, y: 380, w: 700, h: 200, bg: '#f4f7fa', radius: 12, start: 0, duration: 2 },
                  { type: 'text', text: 'on the card', x: 300, y: 440, w: 600, size: 40, start: 0, duration: 2 }]) },

  // Composition: warn-tier, so assert it SPOKE rather than that it exited non-zero.
  { gate: 'audit', name: 'top-heavy · a beat that abandons the bottom of the frame', expect: 'fail', match: /\[top-heavy\]/, outputOnly: true,
    scene: scene([{ type: 'text', text: 'All the way up here', x: 200, y: 90, w: 1200, size: 80, weight: 600, start: 0, duration: 2 },
                  { type: 'text', text: 'and nothing below', x: 200, y: 210, w: 1200, size: 30, start: 0, duration: 2 }]) },
  { gate: 'audit', name: 'a beat that uses the frame is NOT top-heavy', expect: 'pass',
    scene: scene([{ type: 'text', text: 'Upper', x: 200, y: 240, w: 1200, size: 80, weight: 600, start: 0, duration: 2 },
                  { type: 'text', text: 'Lower', x: 200, y: 760, w: 1200, size: 80, weight: 600, start: 0, duration: 2 }]) },

  // ---- validator: must FAIL on vocabulary that does not exist ----
  { gate: 'validate', name: 'unknown anim name', expect: 'fail', match: /anim|not valid/i,
    scene: scene([TXT({ anim: 'slideL' })]) },
  { gate: 'validate', name: 'unknown cut style', expect: 'fail', match: /style|not valid/i,
    scene: scene([TXT()], { cuts: [{ t: 1, style: 'teleport' }] }) },
  { gate: 'validate', name: 'valid scene passes', expect: 'pass',
    scene: scene([TXT({ anim: 'lift' })], { cuts: [{ t: 1, style: 'softwipe' }] }) },

  // A bg window's `opts` are the fx knobs of THAT preset. Liquid's knobs on a dot preset used to be
  // accepted by the schema and dropped by the engine: correct-looking JSON, unchanged render. Both
  // halves are pinned, because the fix is only worth anything if the legal spelling still renders.
  { gate: 'validate', name: 'bg opts · a knob this preset has no fx for', expect: 'fail', match: /is not a knob this background has/,
    scene: scene([TXT()], { bg: [{ preset: 'paperDots', from: 0, to: 2, opts: { scale: 1.6, speed: 0.3, edge0: 0.4 } }] }) },
  { gate: 'validate', name: 'bg opts · the preset\'s own fx knobs are legal', expect: 'pass',
    scene: scene([TXT()], { bg: [{ preset: 'liquid', from: 0, to: 2, opts: { scale: 1.6, speed: 0.3, edge0: 0.4 } }] }) },
  { gate: 'validate', name: 'bg opts · on a hand-authored html backdrop nothing reads them', expect: 'fail', match: /paints no fx/,
    scene: scene([TXT()], { bg: [{ html: '<div style="background:#fff;width:100%;height:100%"></div>', tone: 'light', from: 0, to: 2, opts: { grain: 0.2 } }] }) },

  // ---- beat-check: the only gate that reads the scene as a TIMELINE rather than a bag of layers.
  // Both tells are pinned, because they are measured off different edges of the clock (an interior
  // hole vs the closing plate) and one can rot while the other keeps firing.
  { gate: 'beatcheck', name: 'dead-air · a hole between two beats', expect: 'fail', match: /dead-air/,
    scene: scene([TXT({ duration: 0.6 }), TXT({ text: 'Second beat', start: 1.4, duration: 0.6 })]) },
  { gate: 'beatcheck', name: 'ends-on-nothing · the film closes on a bare backdrop', expect: 'fail', match: /ends-on-nothing/,
    scene: scene([TXT({ duration: 1 })]) },

  // dead-air asked "is a window open?", not "is anything in the frame?", so two layer kinds could hold a
  // hole open while rendering nothing: a BLACKOUT (a canvas-sized opaque rect, a backdrop by function)
  // and a SPECK (a dot or spinner). rec1-nogate.json shipped a black frame at 6.5s propped up by exactly
  // one of each, and the gate stayed green. All four directions are pinned: each offender on the SAME
  // hole the base case uses, so the delta is purely "does this layer close a gap", plus the two mirrors,
  // or the rule degrades into "rects never count" and "small things never count" (#25).
  { gate: 'beatcheck', name: 'dead-air · a full-canvas black scrim does not close a gap', expect: 'fail', match: /dead-air/,
    scene: scene([TXT({ duration: 0.6 }), TXT({ text: 'Second beat', start: 1.4, duration: 0.6 }),
                  { type: 'rect', x: 0, y: 0, w: CANVAS_W, h: CANVAS_H, bg: '#000000', radius: 0, start: 0.5, duration: 1 }]) },
  { gate: 'beatcheck', name: 'dead-air · a speck does not close a gap', expect: 'fail', match: /dead-air/,
    scene: scene([TXT({ duration: 0.6 }), TXT({ text: 'Second beat', start: 1.4, duration: 0.6 }),
                  { type: 'html', html: '<div style="width:100%;aspect-ratio:1;border-radius:50%;background:#c2f23b"></div>',
                    x: 900, y: 500, w: Math.round(CANVAS_W * 0.03), start: 0.5, duration: 1 }]) },
  { gate: 'beatcheck', name: 'a rect big enough to read DOES close a gap', expect: 'pass',
    scene: scene([TXT({ duration: 0.6 }), TXT({ text: 'Second beat', start: 1.4, duration: 0.6 }),
                  { type: 'rect', x: 300, y: 380, w: Math.round(CANVAS_W * 0.5), h: Math.round(CANVAS_H * 0.25),
                    bg: '#c2f23b', radius: 24, start: 0.5, duration: 1 }]) },
  // a canvas-sized rect is only a blackout when it is OPAQUE. A translucent scrim leaves the frame
  // readable through it, so it is a treatment on real content, not a substitute for it.
  { gate: 'beatcheck', name: 'a translucent full-canvas scrim is not a blackout', expect: 'pass',
    scene: scene([TXT({ duration: 0.6 }), TXT({ text: 'Second beat', start: 1.4, duration: 0.6 }),
                  { type: 'rect', x: 0, y: 0, w: CANVAS_W, h: CANVAS_H, bg: 'rgba(0,0,0,0.35)', radius: 0, start: 0.5, duration: 1 }]) },

  // A DECLARED CUT IS NOT CONTENT (MISTAKES #166). dead-air used to exempt any hole a cut/seam window
  // touched, on the reading that a transition fills its time. A transition is a TREATMENT of whatever is
  // already on screen: over an empty frame it produces an empty frame. Both sides are pinned, because the
  // two paths differ in the engine and the difference is the whole point.
  //   SINGLE ROOT (a `motion` track makes the scene choreographed, so core/produce.js withholds
  //   sceneUnits): the cut only transforms the camera root. Nothing is extended, the hole stays a hole.
  { gate: 'beatcheck', name: 'dead-air · a cut over a hole does not fill it (single-root path)', expect: 'fail', match: /dead-air/,
    scene: scene([TXT({ duration: 0.6, motion: [{ t: 0, x: 200 }, { t: 0.6, x: 240 }] }),
                  TXT({ text: 'Second beat', start: 1.4, duration: 0.6 })],
                 { cuts: [{ t: 0.8, style: 'punch', dur: 0.5 }] }) },
  //   SCENE UNITS (no motion track → produce.js injects them): scene.js runs every non-last-beat layer
  //   to `beatEnd + cutDur`, so the outgoing beat really is on screen across the window. That is coverage
  //   the raw JSON spans do not show, and the gate has to model it or it invents holes.
  { gate: 'beatcheck', name: 'scene units really do carry a layer across the cut', expect: 'pass',
    scene: scene([TXT({ duration: 0.6 }), TXT({ text: 'Second beat', start: 1.4, duration: 0.6 })],
                 { cuts: [{ t: 0.6, style: 'punch', dur: 0.8 }] }) },

  // ---- layer-props. The must-fail half is a source mutation (below); this is the must-pass half, and
  // it is the one that was missing. The gate scanned a NAMED file for the shared path, that file was
  // split, and the shared set collapsed to nothing: ~1900 live props across the repo were reported dead
  // while the renders honoured every one of them. `start`/`duration`/`motion` on a non-text type is the
  // exact shape that broke, so it is pinned on its own (#25: sensitivity bought with noise is not free).
  { gate: 'layerprops', name: 'shared-path props on a non-text layer are NOT dead', expect: 'pass',
    scene: scene([{ type: 'html', html: '<b>hi</b>', w: 300, x: 200, y: 400, start: 0, duration: 2,
                    anim: 'slide-right', out: 'slide-left', motion: [{ to: { x: 400 }, dur: 1 }] }]) },
  { gate: 'layerprops', name: 'a prop no layer type reads is still caught', expect: 'fail',
    match: /nothing reads it/, scene: scene([TXT({ notARealProp: 7 })]) },

  // ---- direction-floor · no-continuous-object. A SLIDESHOW is a film where every beat is an island:
  // nothing survives a cut, so each seam is a jump between unrelated shots instead of a state change of
  // one thing. All three directions are pinned, because the rule has two halves (survives AND changes)
  // and either half can rot on its own while the other keeps the gate looking alive.
  { gate: 'directionfloor', name: 'no-continuous-object · every beat is an island across a cut', expect: 'fail',
    match: /no-continuous-object/,   // blocking tier: must exit non-zero
    scene: scene([TXT({ text: 'First island', start: 0.3, duration: 1.9 }),
                  TXT({ text: 'Second island', start: 2.6, duration: 2.4 })],
      { duration: 5, bg: [{ preset: 'gradient', from: 0, to: 5 }], cuts: [{ t: 2.4, style: 'punch', dur: 0.2 }] }) },
  // The strong half: a persistent element that never CHANGES at the cut is a watermark, not a spine.
  // Without this case the rule quietly degrades to "put a logo on every frame".
  { gate: 'directionfloor', name: 'no-continuous-object · a static layer riding the cut is not a spine', expect: 'fail',
    match: /none of them CHANGE there/,
    scene: scene([{ type: 'rect', x: 700, y: 460, w: 520, h: 160, bg: '#c2f23b', radius: 80, start: 0.4, duration: 4.6 },
                  TXT({ text: 'Second island', start: 2.6, duration: 2.4 })],
      { duration: 5, bg: [{ preset: 'gradient', from: 0, to: 5 }], cuts: [{ t: 2.4, style: 'punch', dur: 0.2 }] }) },
  // ...and the mirror (#25): a real continuous-object film must stay green, or the tell buys its
  // sensitivity by calling every short film a slideshow, which trains everyone to ignore it (#159).
  { gate: 'directionfloor', name: 'a continuous object that transforms across the cut is NOT a slideshow', expect: 'pass',
    scene: scene([{ type: 'rect', x: 700, y: 460, w: 520, h: 160, bg: '#c2f23b', radius: 80, start: 0.4, duration: 4.6,
                    motion: [{ t: 0, x: 0, scale: 1 }, { t: 2.6, x: -420, scale: 0.4, ease: 'easeInOutCubic' }, { t: 4.6, x: -420, scale: 0.4 }],
                    vars: { '--p': [0, 1] }, varsDelay: 1.6, varsDur: 0.6 },
                  TXT({ text: 'Generating', start: 3, duration: 2, size: 64, split: 'word', preset: 'up' })],
      { duration: 5, bg: [{ preset: 'gradient', from: 0, to: 5 }], cuts: [{ t: 2.4, style: 'punch', dur: 0.2 }] }) },

  // ---- direction-floor · no-continuous-object, INFERRED half. The declared half above only wakes up
  // when the scene says `cuts`/`seams`/`transitions`; a film of cross-faded islands says none of those
  // and was invisible to it (MISTAKES #163). Boundaries are now inferred from the layer windows: a
  // moment where ≥2 content layers leave and ≥2 unrelated ones arrive. All three directions pinned,
  // because this half's whole risk is crying wolf, and a WARN-tier false positive is invisible to an
  // exit code (#25, #159) — hence `notMatch` on the mirrors.
  { gate: 'directionfloor', name: 'no-continuous-object · cross-faded islands with no declared cut', expect: 'fail',
    match: /no-continuous-object-inferred/, outputOnly: true,   // WARN tier: assert it SPOKE
    scene: scene([TXT({ text: 'First island', y: 300, start: 0.1, duration: 1.6, split: 'word', preset: 'up' }),
                  TXT({ text: 'and its caption', y: 460, size: 44, start: 0.1, duration: 1.6 }),
                  TXT({ text: 'Second island', y: 300, start: 1.9, duration: 1.6, split: 'word', preset: 'scale' }),
                  TXT({ text: 'and its caption', y: 460, size: 44, start: 1.9, duration: 1.6 }),
                  TXT({ text: 'Third island', y: 300, start: 3.7, duration: 2.0, split: 'word', preset: 'blur' }),
                  TXT({ text: 'and its caption', y: 460, size: 44, start: 3.7, duration: 2.0 })],
      { duration: 6, bg: [{ preset: 'gradient', from: 0, to: 6 }] }) },
  // The mirror: identical island structure, but a card rides every junction and MOVES through it.
  { gate: 'directionfloor', name: 'an object carried through an undeclared junction is NOT a slideshow', expect: 'pass',
    notMatch: /no-continuous-object/,
    scene: scene([{ type: 'rect', x: 700, y: 700, w: 520, h: 160, bg: '#c2f23b', radius: 80, start: 0, duration: 6,
                    motion: [{ t: 0, x: 0, scale: 1 }, { t: 1.8, x: -300, scale: 0.6, ease: 'easeInOutCubic' },
                             { t: 3.6, x: 300, scale: 1.2, ease: 'easeInOutCubic' }, { t: 6, x: 0, scale: 1 }] },
                  TXT({ text: 'First island', y: 300, start: 0.1, duration: 1.6, split: 'word', preset: 'up' }),
                  TXT({ text: 'and its caption', y: 460, size: 44, start: 0.1, duration: 1.6 }),
                  TXT({ text: 'Second island', y: 300, start: 1.9, duration: 1.6, split: 'word', preset: 'scale' }),
                  TXT({ text: 'and its caption', y: 460, size: 44, start: 1.9, duration: 1.6 }),
                  TXT({ text: 'Third island', y: 300, start: 3.7, duration: 2.0, split: 'word', preset: 'blur' }),
                  TXT({ text: 'and its caption', y: 460, size: 44, start: 3.7, duration: 2.0 })],
      { duration: 6, bg: [{ preset: 'gradient', from: 0, to: 6 }] }) },
  // The second mirror, pinning the clause that keeps the inference narrow: a junction the STANDING SET
  // outnumbers is a busy overlap, not an island break. Three elements hold the frame while one pair of
  // lines swaps for another — a persistent set, so no boundary is inferred and nothing is said.
  { gate: 'directionfloor', name: 'a standing set outnumbering the swap is not an island junction', expect: 'pass',
    notMatch: /no-continuous-object/,
    scene: scene([{ type: 'rect', x: 140, y: 700, w: 300, h: 120, bg: '#c2f23b', radius: 20, start: 0, duration: 6 },
                  { type: 'rect', x: 500, y: 700, w: 300, h: 120, bg: '#c2f23b', radius: 20, start: 0, duration: 6 },
                  { type: 'rect', x: 860, y: 700, w: 300, h: 120, bg: '#c2f23b', radius: 20, start: 0, duration: 6 },
                  TXT({ text: 'First line', y: 300, start: 0.1, duration: 1.6, split: 'word', preset: 'up' }),
                  TXT({ text: 'and its caption', y: 460, size: 44, start: 0.1, duration: 1.6 }),
                  TXT({ text: 'Second line', y: 300, start: 1.9, duration: 3.8, split: 'word', preset: 'scale' }),
                  TXT({ text: 'and its caption', y: 460, size: 44, start: 1.9, duration: 3.8 })],
      { duration: 6, bg: [{ preset: 'gradient', from: 0, to: 6 }] }) },

  // ---- storyboard-check · the object spine, enforced at PLANNING time. The scene tell can only speak
  // once the JSON exists; by then the plan is already a slideshow. Both directions pinned.
  { gate: 'storyboard', name: 'spine · a short film that names no object', expect: 'fail', ext: 'md',
    match: /NAME THE OBJECT FIRST/, scene: SB({ object: false }) },
  { gate: 'storyboard', name: 'spine · a short film whose beats never say where the object is', expect: 'fail', ext: 'md',
    match: /is missing `object:`/, scene: SB({ beatObject: false }) },
  { gate: 'storyboard', name: 'a short film with a full object spine passes', expect: 'pass', ext: 'md',
    scene: SB() },
  { gate: 'storyboard', name: 'a 45s film is not held to the spine (chapters are legitimate)', expect: 'pass', ext: 'md',
    // no ranges: this case is about the spine, and a 2-beat stub of a 45s film would otherwise trip
    // the clock rule too, which would let it "pass" for a reason it was never meant to test.
    scene: SB({ object: false, beatObject: false, duration: '45s', t1: '', t2: '' }) },

  // ---- storyboard-check · the TRANSFORMATION. `object:` says where the thing is; `becomes:` says what
  // it turned into. Our three recreations landed state-changes at half the reference film's rate, and
  // every one of them was planned by beats that named a preset and never named a change.
  { gate: 'storyboard', name: 'becomes · a short film whose beats name no transformation', expect: 'fail', ext: 'md',
    match: /is missing `becomes:`/, scene: SB({ becomes: false }) },
  { gate: 'storyboard', name: 'becomes-is-a-preset · the change written as the animation', expect: 'fail', ext: 'md',
    match: /becomes-is-a-preset —/, outputOnly: true, scene: SB({ presetBecomes: true }) },
  { gate: 'storyboard', name: 'held-state-too-long · a 3s+ beat carrying one change', expect: 'fail', ext: 'md',
    match: /held-state-too-long —/, outputOnly: true, scene: SB({ held: true }) },
  { gate: 'storyboard', name: 'stub-why · a why that restates the beat category', expect: 'fail', ext: 'md',
    match: /stub-why —/, outputOnly: true, scene: SB({ stubWhy: true }) },

  // ---- storyboard-check · ends-on-a-claim. The surviving defect behind all three recreations: the film
  // closes on a typed sentence naming a capability, and the seconds that would demonstrate it are not
  // planned. Both directions pinned; the timings are trimmed to 4.4s on both so the pair differs ONLY
  // in the final `becomes:` and neither can pass on some other tell firing in its place.
  { gate: 'storyboard', name: 'ends-on-a-claim · the last act is a sentence appearing', expect: 'fail', ext: 'md',
    match: /ends-on-a-claim/, scene: SB({ endsOnClaim: true, t2: '1.6s-4.4s', duration: '4.4s' }) },
  { gate: 'storyboard', name: 'a final beat that names a change does NOT end on a claim', expect: 'pass', ext: 'md',
    notMatch: /ends-on-a-claim/, scene: SB({ t2: '1.6s-4.4s', duration: '4.4s' }) },

  // ---- storyboard-check · the CLOCK. The beat headings have carried "(0s-1.6s)" all along and nothing
  // parsed them, so a plan could stop short of its own duration and every gate reported green. Both
  // edges are pinned separately (an interior gap vs the closing seconds), and the partial case too,
  // because a storyboard that half-declares its times must be told, not silently half-checked.
  { gate: 'storyboard', name: 'timeline-hole · a gap between two beats', expect: 'fail', ext: 'md',
    match: /timeline-hole/, scene: SB({ t2: '2.6s-5s' }) },
  { gate: 'storyboard', name: 'timeline-hole · the beats run out before the film does', expect: 'fail', ext: 'md',
    match: /of the film is unplanned/, scene: SB({ t2: '1.6s-3.2s' }) },
  { gate: 'storyboard', name: 'partial-timeline · only some beats declare a range', expect: 'fail', ext: 'md',
    match: /partial-timeline —/, outputOnly: true, scene: SB({ t2: '' }) },
  // ...and the mirror: a storyboard with NO ranges at all is the world before this rule existed, and
  // must stay silent. A gate that retro-fails every plan written before it is a gate nobody keeps.
  { gate: 'storyboard', name: 'a storyboard that declares no times at all is not judged on the clock', expect: 'pass', ext: 'md',
    notMatch: /timeline-hole|partial-timeline/, scene: SB({ t1: '', t2: '' }) },

  // ---- plan-vs-render · the only gate that reads TWO documents, so it is the only one that can catch a
  // plan and a film disagreeing. Every case below carries an `intent` sidecar beside its scene. Each
  // fixture is cut so exactly ONE tell speaks: a tell that only ever fires alongside another is a tell
  // nobody can trust on its own, and the gate's four thresholds are tunable, so every case anchors on the
  // finding CODE and never on a number the next tuning pass will move.
  //   The codes are matched BRACKETED (`[junction-is-static]`), which is not decoration. A case name is
  //   slugified into the fixture's filename, and a gate echoes the path it read, so a bare `/code/` match
  //   is satisfied by the filename alone: silence the gate entirely and every one of these still ticked.
  //   The brackets are the printed finding and nothing else can produce them.
  { gate: 'planrender', name: 'plan-overruns-render · the plan budgets time the film does not have', expect: 'fail',
    match: /\[plan-overruns-render\]/, scene: PVR_CLEAN,
    intent: PLAN([B('Record', [0, 3], 'the pill becomes a capsule'), B('Structure', [3, 6.8], 'the capsule becomes a note card')]) },
  // The junction the plan marks with a transformation, where the JSON builds no moment at all: no layer
  // arrives or leaves, no cut fires, no key lands. This is the defect the whole gate was written for.
  { gate: 'planrender', name: 'junction-is-static · a promised transformation with nothing in the render', expect: 'fail',
    match: /\[junction-is-static\]/,
    scene: scene([TXT({ text: 'First', start: 0.2, duration: 2.0 }), TXT({ text: 'Second', start: 2.2, duration: 3.6 })],
      { duration: 6, bg: [{ preset: 'gradient', from: 0, to: 6 }] }),
    intent: PLAN([B('Record', [0, 4]), B('Structure', [4, 6], 'the capsule becomes a note card')]) },
  // WARN tier, so assert it SPOKE rather than that it exited non-zero.
  { gate: 'planrender', name: 'beat-holds-still · a planned beat spent on one unchanging frame', expect: 'fail',
    match: /\[beat-holds-still\]/, outputOnly: true,
    scene: scene([TXT({ text: 'First', start: 0.2, duration: 3.4 }), TXT({ text: 'Second', start: 3.6, duration: 4.0 }),
                  TXT({ text: 'Third', start: 5.4, duration: 2.2 })],
      { duration: 8, bg: [{ preset: 'gradient', from: 0, to: 8 }] }),
    intent: PLAN([B('Record', [0, 3.6]), B('Structure', [3.6, 8], 'the capsule becomes a note card')]) },
  // The AUTHORED hold: two consecutive motion keys carrying identical values across the beat the plan says
  // is where something turns. A `MOVER` covers the same seconds, so `beat-holds-still` is held quiet and
  // this case can only pass on the tell it is named for.
  { gate: 'planrender', name: 'held-through-the-change · identical keys across the beat that should turn', expect: 'fail',
    match: /\[held-through-the-change\]/, outputOnly: true,
    scene: scene([TXT({ text: 'Pinned', start: 1.0, duration: 6.5, motion: [{ t: 0, y: -80 }, { t: 4.5, y: -80 }] }),
                  MOVER({ start: 1.0, duration: 6.5 })],
      { duration: 8, bg: [{ preset: 'gradient', from: 0, to: 8 }] }),
    intent: PLAN([B('Record', [0, 1]), B('Structure', [1, 8], 'the capsule becomes a note card')]) },
  { gate: 'planrender', name: 'unplanned-junction · the film cuts where the plan has no boundary', expect: 'fail',
    match: /\[unplanned-junction\]/, outputOnly: true,
    scene: scene([TXT({ text: 'First', start: 0.2, duration: 1.5 }), TXT({ text: 'Second', start: 2.6, duration: 1.6 }),
                  TXT({ text: 'Third', start: 3.9, duration: 2.0 })],
      { duration: 6, bg: [{ preset: 'gradient', from: 0, to: 6 }], cuts: [{ t: 2.5, style: 'punch', dur: 0.4 }] }),
    intent: PLAN([B('Record', [0, 4]), B('Structure', [4, 6], 'the capsule becomes a note card')]) },
  // An untimed plan cannot be lined up against a film, and the gate must SAY so rather than tick. Without
  // this case the gate could silently do nothing on every sidecar written from an untimed storyboard.
  { gate: 'planrender', name: 'plan-has-no-spans · a sidecar whose beats carry no times', expect: 'fail',
    match: /\[plan-has-no-spans\]/, outputOnly: true, scene: PVR_CLEAN,
    intent: PLAN([B('Record', null, 'the pill becomes a capsule'), B('Structure', null, 'a note card')]) },
  // ...and the mirror (#25): the same film with a plan that describes it. All five tells are named, so a
  // gate that starts crying wolf on a correct pairing is caught here rather than trained away by authors.
  { gate: 'planrender', name: 'a film that does what its plan said is green', expect: 'pass',
    notMatch: /\[(?:plan-overruns-render|junction-is-static|beat-holds-still|held-through-the-change|unplanned-junction|plan-has-no-spans)\]/,
    scene: PVR_CLEAN,
    intent: PLAN([B('Record', [0, 3], 'the pill becomes a capsule'), B('Structure', [3, 6], 'the capsule becomes a note card')]) },

  // ---- visual-vocabulary · does the film SHOW anything, or is every layer that carries information
  // type? The gate turns on DECORATION vs EXPLANATION, so each fixture below differs only in how much
  // of the clock a large pictorial layer is on screen for. Its two constants (the subject-size share and
  // the thin share) are tunable, so every case anchors on the printed finding CODE and never on a
  // percentage, a size or a formatted duration — and BRACKETED, because the case name is slugified into
  // the fixture's filename and the gate echoes the path it read, so a bare `/graphics-thin/` match is
  // satisfied by the filename alone with the gate completely silenced.
  { gate: 'visuals', name: 'a film where every layer carrying information is type', expect: 'fail',
    match: /\[no-visual-vocabulary\]/,
    scene: scene([TXT({ text: 'Ninety-four percent', y: 300, duration: 2 }),
                  TXT({ text: 'of them never came back', y: 460, size: 44, duration: 2 })]) },
  // A graphic on screen for one beat of four. Sized and placed identically to the mirror's; the ONLY
  // difference is how long it lives, so this case cannot pass on the size rule firing in its place.
  //   NB `text-only-beat` is waived rather than avoided: it is a strictly weaker statement than
  //   `graphics-thin` (a film whose graphic covers under a third of its windows always leaves a bare
  //   one), so the two CANNOT be separated by any fixture. The waiver is what makes exactly one tell
  //   speak here; without it this case would also be the text-only-beat case, and neither would be
  //   proven on its own.
  { gate: 'visuals', name: 'a graphic that is on screen for one beat of four', expect: 'fail',
    match: /\[graphics-thin\]/, outputOnly: true,   // WARN tier: assert it SPOKE
    scene: scene([GFX({ start: 0, duration: 2.6 }),
                  TXT({ text: 'The first beat', y: 800, start: 0, duration: 2.6 }),
                  TXT({ text: 'The second beat', y: 800, start: 3.2, duration: 2.6 }),
                  TXT({ text: 'The third beat', y: 800, start: 6.2, duration: 2.6 }),
                  TXT({ text: 'The fourth beat', y: 800, start: 9.2, duration: 2.6 })],
      { duration: 12, bg: [{ preset: 'gradient', from: 0, to: 12 }],
        authoring: { allow: ['text-only-beat'] },
        cuts: [{ t: 3, style: 'punch', dur: 0.2 }, { t: 6, style: 'punch', dur: 0.2 }, { t: 9, style: 'punch', dur: 0.2 }] }) },
  // The same film with the graphic carrying two of its three beats: past the thin share, so the only
  // thing left to say is that the closing beat is bare. This is the tell that CAN stand alone.
  { gate: 'visuals', name: 'a closing beat that holds nothing but type', expect: 'fail',
    match: /\[text-only-beat\]/, outputOnly: true,   // WARN tier: assert it SPOKE
    scene: scene([GFX({ start: 0, duration: 7.4 }),
                  TXT({ text: 'The first beat', y: 800, start: 0, duration: 3.6 }),
                  TXT({ text: 'The second beat', y: 800, start: 4.2, duration: 3.4 }),
                  TXT({ text: 'The third beat', y: 800, start: 8.2, duration: 3.6 })],
      { duration: 12, bg: [{ preset: 'gradient', from: 0, to: 12 }],
        cuts: [{ t: 4, style: 'punch', dur: 0.2 }, { t: 8, style: 'punch', dur: 0.2 }] }) },
  // ...and the mirror (#25): a film carrying a real large graphic the whole way through. All three tells
  // are named, because two of them are WARN tier and an exit code cannot see a warning — a gate that
  // starts calling a film typeset while a picture is on screen is caught here rather than trained away.
  { gate: 'visuals', name: 'a film that carries a large graphic throughout is green', expect: 'pass',
    notMatch: /\[(?:no-visual-vocabulary|graphics-thin|text-only-beat)\]/,
    scene: scene([GFX({ start: 0, duration: 12 }),
                  TXT({ text: 'The first beat', y: 800, start: 0, duration: 3.6 }),
                  TXT({ text: 'The second beat', y: 800, start: 4.2, duration: 3.4 }),
                  TXT({ text: 'The third beat', y: 800, start: 8.2, duration: 3.6 })],
      { duration: 12, bg: [{ preset: 'gradient', from: 0, to: 12 }],
        cuts: [{ t: 4, style: 'punch', dur: 0.2 }, { t: 8, style: 'punch', dur: 0.2 }] }) },
];

const run = (cmd, args) => {
  try { return { code: 0, out: execFileSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` }; }
};

const GATE_CMD = {
  audit: (f) => ['node', ['verify/audit.mjs', f]],
  validate: (f) => ['node', ['core/validate.mjs', f]],
  beatcheck: (f) => ['node', ['scripts/gates/beat-check.mjs', f]],
  layerprops: (f) => ['node', ['scripts/gates/layer-props.mjs', f]],
  directionfloor: (f) => ['node', ['scripts/gates/direction-floor.mjs', f]],
  storyboard: (f) => ['node', ['scripts/gates/storyboard-check.mjs', f]],
  visuals: (f) => ['node', ['scripts/gates/visual-vocabulary.mjs', f]],
  // the one gate that reads a second document: the scene and the plan it claims to deliver.
  planrender: (f, intent) => ['node', ['scripts/gates/plan-vs-render.mjs', f, '--intent', intent]],
};

let pass = 0; const broken = [];
console.log('── gate mutation: does each gate actually fire?\n');
for (const c of CASES) {
  // `ext` lets a case feed a gate something that is not a scene (storyboard-check eats markdown).
  // NB the fixture is named after the case, and every gate prints the path it read, so a case whose name
  // contains its own finding code can be satisfied by the FILENAME. Anchor `match` on the printed shape
  // of the finding (`[tiny-text]`, `stub-why —`), never on the bare code, or the case proves nothing.
  const f = path.join(FIX, `mut-${c.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${c.ext || 'json'}`);
  fs.writeFileSync(f, c.scene);
  const rel = path.relative(repoRoot, f);
  // `intent` is the second document a case may need (plan-vs-render reads a plan alongside the scene). It
  // is handed over with --intent rather than left to the gate's `.json` → `.intent.json` guess, so the
  // pair lives in the fixture dir like every other case.
  const ip = c.intent ? f.replace(/\.json$/, '.intent.json') : null;
  if (ip) fs.writeFileSync(ip, c.intent);
  const [cmd, args] = GATE_CMD[c.gate](rel, ip && path.relative(repoRoot, ip));
  const r = run(cmd, args);
  const failed = r.code !== 0;
  let ok, why;
  if (c.expect === 'fail') {
    // outputOnly: the rule is WARN-tier, so it reports without exiting non-zero. Assert it SPOKE.
    ok = (c.outputOnly ? true : failed) && (!c.match || c.match.test(r.out));
    why = !failed && !c.outputOnly ? 'gate stayed SILENT on a fixture built to break it' : 'gate failed but for the wrong reason';
  } else {
    // notMatch: the must-pass mirror of a WARN-tier rule. Exit code alone cannot see a warning, so a
    // clean exit would "pass" even while the gate cried wolf in its output. Name the tell that must
    // NOT appear and the false positive is caught.
    ok = !failed && (!c.notMatch || !c.notMatch.test(r.out));
    why = failed ? 'gate FIRED on a fixture that is correct (false positive)' : 'gate WARNED on a fixture that is correct (false positive)';
  }
  console.log(`   ${ok ? '✓' : '✗'} ${c.gate.padEnd(9)} ${c.expect === 'fail' ? 'must-fail' : 'must-pass'}  ${c.name}`);
  if (ok) pass++; else broken.push({ ...c, why, out: r.out.split('\n').filter(Boolean).slice(-4).join(' | ').slice(0, 220) });
  fs.unlinkSync(f);
  if (ip) fs.unlinkSync(ip);
}

/** A minimal, CURRENT bake of `sim` under assets/baked/<name>/ — the fixture the sim cases mutate. */
function fakeBake(name, sim) {
  const dir = path.join(repoRoot, 'assets/baked', name);
  fs.mkdirSync(dir, { recursive: true });
  const prov = sourceHash(path.join(repoRoot, sim));
  const frames = ['f0001.png', 'f0002.png'];
  for (const f of frames) fs.writeFileSync(path.join(dir, f), '');
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(
    { fps: 30, w: 4, h: 4, count: 2, frames: frames.map((f) => `/assets/baked/${name}/${f}`) }, null, 2));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(
    { sim, seed: 1, fps: 30, count: 2, w: 4, h: 4, sourceHash: prov.hash, sources: prov.files }, null, 2));
}

// ---- mutate the SOURCE, not a fixture: some gates can only be tested by breaking the thing they guard.
const srcCases = [
  { name: 'font-audit · @font-face removed', file: 'core/tokens.css',
    mutate: (s) => s.split('\n').filter((l) => !l.includes("font-family: 'Manrope'")).join('\n'),
    cmd: ['node', ['scripts/gates/font-audit.mjs', 'scene', 'formats/scene/tpot-launch.json']], match: /FALLBACK|not rendering/ },
  { name: 'clipped-text · riseClip mask too short for descenders', file: 'core/type.js',
    mutate: (s) => s.replace("        w.style.paddingBottom = '0.3em'; w.style.marginBottom = '-0.3em';\n", ''),
    cmd: ['node', ['verify/audit.mjs', 'formats/scene/tpot-launch.json']], match: /clipped-text/ },
  { name: 'snap · opacity easing reverted to linear', file: 'core/clips.js',
    mutate: (s) => s.replace('  easeOutCubic(clamp01(enterT)) * (exitT > 0 ? 1 - easeOutCubic(clamp01(exitT)) : 1);',
                             '  clamp01(enterT) * (exitT > 0 ? 1 - clamp01(exitT) : 1);'),
    cmd: ['node', ['scripts/gates/scene-snap.mjs', 'scene']], match: /opacity: /, outputOnly: true },
  // The snap signature was DOM-only and recorded no clip-path, so a wipe / iris / clock reveal was
  // invisible to it: `wipe-right` pointed the wrong way for months and snap said "identical" every run.
  // showcase-count opens on a rect wiped rightward, so flipping the registry entry must now be seen.
  { name: 'snap · a wipe reveals in the WRONG direction', file: 'core/clips.js',
    mutate: (s) => s.replace("'wipe-right': (t) => wipe(t, 'left')", "'wipe-right': (t) => wipe(t, 'right')"),
    cmd: ['node', ['scripts/gates/snap-scenes.mjs', 'showcase-count']], match: /clip-path/ },
  // The other half of the same blindness: the background is painted into <canvas>, which no DOM
  // signature can see, so any change of bg preset, colour, speed or direction diffed as nothing.
  // formats/scene/sample.json runs the `aurora` preset; brightening it must now register.
  { name: 'snap · the background preset changed and the canvas moved', file: 'core/backgrounds.js',
    mutate: (s) => s.replace("{ type: 'aurora', intensity: 0.46,", "{ type: 'aurora', intensity: 0.9,"),
    cmd: ['node', ['scripts/gates/scene-snap.mjs', 'scene']], match: /__bg\.canvas/, outputOnly: true },
  { name: 'clipped-component · captured root margin re-offsets the content', file: 'core/layers/component.js',
    mutate: (s) => s.replace("  if (rootEl) rootEl.style.margin = '0';", ''),
    cmd: ['node', ['verify/audit.mjs', 'formats/scene/tpot-launch.json']], match: /clipped-component/ },
  // Factories were extracted from blocks/index.mjs into family siblings; re-anchored on the sibling that
  // now holds each one (loadingBar→dev.mjs, browserFrame + the swatch fill→ui.mjs).
  { name: 'blocks-audit · a factory ships an invented statistic', file: 'blocks/dev.mjs',
    mutate: (s) => s.replace("export function loadingBar({", "export function loadingBar({ note = 'Ready in 1.2s',"),
    cmd: ['node', ['scripts/gates/blocks-audit.mjs']], match: /claim-default|baked-claim/ },
  { name: 'blocks-audit · unreadable text on a hardcoded fill', file: 'blocks/ui.mjs',
    mutate: (s) => s.replace("bg: '#3A3A38', radius: 8", "bg: '#F6A417', radius: 8"),
    cmd: ['node', ['scripts/gates/blocks-audit.mjs']], match: /contrast/ },
  { name: 'blocks-audit · a factory defaults to a real brand', file: 'blocks/ui.mjs',
    mutate: (s) => s.replace("url = 'example.com'", "url = 'stripe.com'"),
    cmd: ['node', ['scripts/gates/blocks-audit.mjs']], match: /brand-default/ },
  { name: 'validate · an unknown prop on a layer, silently ignored by the engine', file: 'formats/scene/sample.json',
    // NB: the injected prop must be a name NO layer accepts. `fill` was used here until it became a real
    // svg-layer prop (docs/MISTAKES.md #143) — pick a prop that can never be legitimised.
    mutate: (s) => s.replace('"layers": [', '"layers": [\n    { "type": "rect", "x": 0, "y": 0, "w": 10, "h": 10, "start": 0, "duration": 1, "notARealProp": "#000" },'),
    cmd: ['node', ['core/validate.mjs', 'formats/scene/sample.json']], match: /unknown prop "notARealProp"/ },
  { name: 'three · a scene reaching for wall-clock or unseeded randomness', file: 'core/three-fx.js',
    mutate: (s) => s.replace('const ease = (p)', 'const jitter = Math.random();\nconst ease = (p)'),
    cmd: ['node', ['scripts/gates/lib-test.mjs']], match: /no wall-clock or unseeded randomness/ },
  { name: 'raymarch · a scene whose distance field ignores time', file: 'core/raymarch-fx.js',
    mutate: (s) => s.replace('float w = sin(p.x * 2.2 + u_time * 0.9) * 0.13 + sin(p.z * 1.7 - u_time * 0.7) * 0.11;',
                             'float w = sin(p.x * 2.2) * 0.13 + sin(p.z * 1.7) * 0.11;'),
    cmd: ['node', ['scripts/gates/lib-test.mjs']], match: /distance field that depends on time/ },
  { name: 'docs-drift · a shipped effect listed as missing', file: 'docs/ROADMAP.md',
    mutate: (s) => s.replace('- Still absent: **Glitch RGB captions', '- Still absent: `zoomBlur`, **Glitch RGB captions'),
    cmd: ['node', ['scripts/gates/docs-drift.mjs']], match: /DOCS DRIFT/ },
  { name: 'canvas-purity · a paint layer that does not clear off-window', file: 'core/layers/paint.js',
    // Anchored on the clearRect call, not the whole line: the line also carries the resample tick
    // now, and pinning the exact text made the fixture go stale the moment the branch grew. A stale
    // fixture SKIPS, which reads as "fine" in the summary while proving nothing.
    mutate: (s) => s.replace("const [w0, h0] = el.__paintWH; ctx.clearRect(0, 0, w0, h0);", ""),
    cmd: ['node', ['scripts/gates/canvas-purity.mjs', 'scene', 'formats/scene/paint-demo.json']], match: /CANVAS PURITY FAILED/ },
  // The fixture layer sets `pulseAmp`, which ONLY core/layers/glow.js reads, and the mutation deletes
  // that read. So the case turns on the mutation: it used to pin a prop (`r`) that no build of the
  // engine reads, which made it pass whether or not the mutation applied, and a case that cannot
  // distinguish the two states proves nothing. Deleting a real read is the defect being simulated.
  { name: 'layer-props · a prop the engine never reads', file: 'core/layers/glow.js',
    mutate: (s) => s.replace('L.pulseAmp', 'undefined'),
    cmd: ['node', ['scripts/gates/layer-props.mjs', 'formats/scene/_lp-fixture.json']], match: /`pulseAmp` is set and nothing reads it/,
    before: () => fs.writeFileSync(path.join(repoRoot, 'formats/scene/_lp-fixture.json'), JSON.stringify({
      module: 'scene', aspect: '16:9', theme: 'tpot', duration: 2, audio: { silent: true },
      bg: [{ preset: 'plain', from: 0, to: 2 }],
      layers: [{ type: 'glow', x: 200, y: 200, w: 400, h: 400, pulse: 2, pulseAmp: 0.4, start: 0, duration: 2 }] })),
    after: () => fs.rmSync(path.join(repoRoot, 'formats/scene/_lp-fixture.json'), { force: true }) },
  // ...and the other direction: layer-props must NOTICE when its own shared-path scan goes blind.
  // Renaming every `L.` read in the format's driver is what a file split did in effect, and the gate
  // answered by calling ~1900 live props dead instead of saying it could no longer see. It must now
  // report itself broken rather than blame the scenes.
  { name: 'layer-props · the shared-path scan goes blind', file: `${SCENE_DIR}/scene.js`,
    mutate: (s) => s.replace(/\bL\./g, 'Q.'),
    cmd: ['node', ['scripts/gates/layer-props.mjs', `${SCENE_DIR}/higgsfield-recreation.json`]], match: /layer-props is blind/ },
  { name: 'dead-branch · a ternary whose arms are identical', file: 'core/layers/rect.js',
    mutate: (s) => s.replace('export function build', 'const DEAD = 1 === 1 ? 2 : 2;\nexport function build'),
    cmd: ['node', ['scripts/gates/dead-branch.mjs']], match: /both arms are/ },
  // The dataflow half (MISTAKES #81 left it open, #91 closed it). Three shapes, three fixtures: a gate
  // that catches one of its three stated rules and reports green for the other two is the same failure
  // as no gate at all, so each rule is pinned on its own.
  { name: 'dead-branch · a value computed and never read', file: 'core/layers/rect.js',
    mutate: (s) => s.replace('export function build', 'const DISCARDED = Math.max(1, 2);\nexport function build'),
    cmd: ['node', ['scripts/gates/dead-branch.mjs']], match: /computed and never read/ },
  { name: 'dead-branch · a prop accepted and never read', file: 'core/layers/rect.js',
    mutate: (s) => s.replace('export function build', 'function probeUnusedProp({ neverRead }) { return 1; }\nexport function build'),
    cmd: ['node', ['scripts/gates/dead-branch.mjs']], match: /prop accepted and never read/ },
  { name: 'dead-branch · a condition decided at author time', file: 'core/layers/rect.js',
    // via a const-bound literal, not a bare `if (1 === 1)`: the one-hop lookup is the part of the rule
    // that could rot silently, since a bare tautology would also be caught by cruder text matching.
    mutate: (s) => s.replace('export function build', 'const PROBE_K = 2;\nif (PROBE_K === 3) { }\nexport function build'),
    cmd: ['node', ['scripts/gates/dead-branch.mjs']], match: /condition cannot vary/ },

  // Conformance's distinctness check was self-fulfilling for four years of vocabulary (MISTAKES #74).
  // All three of its guards are pinned: the defect itself, and both halves of the proof that the
  // signature can still see it. A distinctness check nobody can make fail is not a passing check.
  { name: 'conformance · two anim values that render identically', file: 'core/clips.js',
    mutate: (s) => s.replace("wipe(t, 'up')", "wipe(t, 'left')"),
    cmd: ['node', ['scripts/gates/conformance.mjs', 'enums']], match: /render identically to another value/ },
  { name: 'conformance · the signature goes back to revealing identity', file: 'scripts/gates/conformance.mjs',
    mutate: (s) => s.replace("['anim', 'out']", '[]'),
    cmd: ['node', ['scripts/gates/conformance.mjs', 'enums']], match: /falsifiability/ },
  { name: 'conformance · blindSig drifts from the frameSig it mirrors', file: 'scripts/gates/conformance.mjs',
    mutate: (s) => s.replace('2166136261, html', '2166136262, html'),
    cmd: ['node', ['scripts/gates/conformance.mjs', 'enums']], match: /disagrees with frameSig/ },
  // A baked 3D typeface goes stale SILENTLY: swap the woff2 and the old outlines keep rendering
  // flawless letters in the previous font. Anchored on the `"sourceSha256":"` key rather than on any
  // hash digits, so re-baking the artifact (which changes every digit) cannot make this fixture stale.
  { name: 'glyphs-audit · a 3D typeface stale against its woff2', file: 'assets/fonts/3d/Anybody.typeface.json',
    mutate: (s) => s.replace('"sourceSha256":"', '"sourceSha256":"0'),
    cmd: ['node', ['scripts/gates/glyphs-audit.mjs']], match: /STALE/ },
  // ---- Tier B: the offline sim bake. Three defects, three fixtures. A sequence on disk carries no
  // evidence of its own reproducibility, so all three of these ship SILENTLY: the video renders, the
  // frames play, and what plays is not what the sim says.
  { name: 'sim-audit · a sim reaching for unseeded randomness', file: 'sims/ember-burst.mjs',
    // anchored on the `step` signature: the smallest text that must exist for a sim to BE a sim, so
    // the fixture cannot go stale against tuning inside the sim's body (MISTAKES #89).
    mutate: (s) => s.replace('export function step(ctx, i) {', 'export function step(ctx, i) {\n  const drift = Math.random();'),
    cmd: ['node', ['scripts/gates/sim-audit.mjs']], match: /unseeded/ },
  { name: 'sim-audit · a bake left behind by an edited sim', file: 'sims/ember-burst.mjs',
    // any change to the source is the defect; the bake keeps playing the PREVIOUS version of the
    // effect and nothing downstream can tell. The fixture bake is synthesised so this case does not
    // depend on assets/baked/ being populated on the machine running the harness.
    mutate: (s) => s.replace('const GRAVITY = 0.42;', 'const GRAVITY = 0.61;'),
    cmd: ['node', ['scripts/gates/sim-audit.mjs']], match: /has changed since this was baked/,
    before: () => fakeBake('_mut-stale', 'sims/ember-burst.mjs'),
    after: () => fs.rmSync(path.join(repoRoot, 'assets/baked/_mut-stale'), { recursive: true, force: true }) },
  { name: 'sim-audit · a frame sequence with a hole in it', file: 'assets/baked/_mut-seq/manifest.json',
    // `clip` indexes by array position, so a missing PNG does not throw: it holds the previous frame.
    mutate: (s) => s.replace('f0002.png', 'f0009.png'),
    cmd: ['node', ['scripts/gates/sim-audit.mjs']], match: /expected "f0002.png"|missing on disk/,
    before: () => fakeBake('_mut-seq', 'sims/ember-burst.mjs'),
    after: () => fs.rmSync(path.join(repoRoot, 'assets/baked/_mut-seq'), { recursive: true, force: true }) },

  { name: 'schema-drift · anim enum drifted', file: 'formats/scene/schema.json',
    mutate: (s) => s.replace('"lift",', '"liftt",'),
    cmd: ['node', ['scripts/gates/schema-drift.mjs']], match: /DRIFT/ },
  // the drift check covered ONE enum of eight; adding an ambient fx made the schema reject a valid
  // value and nothing said so. A second enum is pinned so the generalisation cannot quietly regress.
  { name: 'schema-drift · a NON-anim enum drifted', file: 'formats/scene/schema.json',
    mutate: (s) => s.replace('"kaleidoscope",', '"kaleidoscop",'),
    cmd: ['node', ['scripts/gates/schema-drift.mjs']], match: /DRIFT/ },
  // The backdrop is a REQUIRED authoring choice now that the baseline no longer injects one. Without this
  // fixture the rule is the only thing standing between an author and a scene that renders on flat nothing,
  // and nothing proves it still fires. Anchored on the top-level key (a layer `bg` is a colour string, so
  // the array match cannot catch one by accident).
  { name: 'validate · a scene that declares no background at all', file: 'formats/scene/sample.json',
    mutate: (s) => s.replace(/,\s*"bg": \[[^\]]*\]/, ''),
    cmd: ['node', ['core/validate.mjs', 'formats/scene/sample.json']], match: /bg is required/ },
  // A hand-authored backdrop that animates in a browser and renders a dead still is the exact failure
  // the message exists to prevent; if the check stops firing, nothing else in the pipeline notices.
  // `untype` (reverse typing) used to be checked only for WIRING — that the engine reads the prop the
  // schema advertises. That proved the props were not no-ops and nothing more: the count itself, the
  // part that can actually be wrong, was untestable while it lived inside frame() (which needs a DOM).
  // It is now the exported pure typedLen(), so this case drops the delete term and demands lib-test
  // notice the line never shrinks.
  // A cut on the single-root path may only move the frame, never hide it: exit runs to completion before
  // enter starts, so one root fading itself out empties the whole picture (MISTAKES #166). Anchored on
  // the identifiers, not on the channel list, so adding a channel does not go stale.
  { name: 'cuts · solo mode stops pinning the visibility channels open', file: 'core/cuts.js',
    mutate: (s) => s.replace('  for (const k of HIDE_CHANNELS) s[k] = IDENT[k];\n', ''),
    cmd: ['node', ['scripts/gates/lib-test.mjs']], match: /solo .* never hides the frame/ },

  { name: 'text · untype reverses the typing', file: 'core/layers/text.js',
    mutate: (s) => s.replace('  if (untype != null && lt >= untype) n = Math.min(n, visLen) - Math.floor((lt - untype) * (untypeRate ?? cps));\n', ''),
    cmd: ['node', ['scripts/gates/lib-test.mjs']], match: /untype: deletes back to 0/ },

  // The two silent-wrongness fixes of this pass. Both are invisible to any gate that counts names, so
  // the contract lives in lib-test as a pure assertion and these prove lib-test can see it break.
  { name: 'wipe-right · reveal direction flipped back to right-to-left', file: 'core/clips.js',
    mutate: (s) => s.replace("'wipe-right': (t) => wipe(t, 'left')", "'wipe-right': (t) => wipe(t, 'right')"),
    cmd: ['node', ['scripts/gates/lib-test.mjs']], match: /wipe-right grows rightward/ },
  { name: 'bg opts · pass-through removed, so a declared knob is silently dropped', file: 'core/backgrounds.js',
    mutate: (s) => s.replace("    for (const [k, v] of Object.entries(over)) if (!(k in META) && (FX_PARAMS[fx.type] || []).includes(k)) fx[k] = v;\n", ''),
    cmd: ['node', ['scripts/gates/lib-test.mjs']], match: /bg opts reach the fx/ },
  // Proves the accepted-key list is DERIVED, not hand-copied: rename the property `liquid` reads and the
  // vocabulary must follow it. A hand-kept list would still advertise `scale` and this would stay green.
  { name: 'bg opts · the accepted keys track the fx implementation', file: 'core/backgrounds.js',
    // Anchored on the property NAME alone, not on the default beside it: pinning the literal made this
    // fixture go stale the moment `liquid`'s speed was retuned, and a stale fixture is an unproven gate.
    mutate: (s) => s.replace(', sc = o.scale ??', ', sc = o.scaleX ??'),
    cmd: ['node', ['scripts/gates/lib-test.mjs']], match: /bg opts vocabulary is derived from the fx implementation/ },

  { name: 'validate · a hand-authored bg animated with CSS (which never runs)', file: 'formats/scene/example-html-bg.json',
    mutate: (s) => s.replace('<style>.fan{', '<style>.x{animation:spin 2s linear infinite}.fan{'),
    cmd: ['node', ['core/validate.mjs', 'formats/scene/example-html-bg.json']], match: /DEAD STILL/ },
  { name: 'validate · a hand-authored bg that never says whether it is light or dark', file: 'formats/scene/example-html-bg.json',
    mutate: (s) => s.replace('"tone": "light",', ''),
    cmd: ['node', ['core/validate.mjs', 'formats/scene/example-html-bg.json']], match: /declares no `tone`/ },
];
console.log('');
for (const c of srcCases) {
  const p = path.join(repoRoot, c.file);
  if (c.before) c.before();
  const orig = fs.readFileSync(p, 'utf8');
  const mutated = c.mutate(orig);
  // A stale fixture is a FAILURE, not a skip. This is the gate that proves every other gate can
  // fire; when its fixture stops matching (because the code it patches moved), the gate it vouches
  // for silently becomes unproven while the run still exits 0. That is precisely the "reports green
  // forever" failure this whole harness exists to prevent, reproduced inside the harness itself.
  if (mutated === orig) {
    console.log(`   ✗ ${'source'.padEnd(9)} must-fail  ${c.name}`);
    broken.push({ name: c.name, why: 'FIXTURE IS STALE — the mutation no longer applies, so this gate is UNPROVEN. Re-anchor it on text that still exists in ' + c.file, out: '' });
    continue;
  }
  fs.writeFileSync(p, mutated);
  const r = run(c.cmd[0], c.cmd[1]);
  fs.writeFileSync(p, orig); // always restore, even if the gate throws
  if (c.after) c.after();
  // snap reports rather than fails (an intended change is still a change), so some cases
  // assert on OUTPUT alone — a gate can speak without exiting non-zero.
  const ok = (c.outputOnly ? true : r.code !== 0) && c.match.test(r.out);
  console.log(`   ${ok ? '✓' : '✗'} ${'source'.padEnd(9)} must-fail  ${c.name}`);
  if (ok) pass++; else broken.push({ name: c.name, why: r.code === 0 ? 'gate stayed SILENT after its guard was removed' : 'fired for the wrong reason', out: r.out.split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 220) });
}

const total = CASES.length + srcCases.length;
console.log('\n' + '='.repeat(72));
if (!broken.length) { console.log(`✓ gate mutation OK — ${pass}/${total} gates proven able to fire (and to stay quiet when correct)`); process.exit(0); }
console.log(`GATE MUTATION FAILURES (${broken.length}/${total})\n`);
for (const b of broken) console.log(`  ✗ ${b.name}\n      ${b.why}\n      ${b.out}\n`);
console.log('A gate that cannot fail reports green forever and everyone believes it (MISTAKES #26).');
process.exit(1);
