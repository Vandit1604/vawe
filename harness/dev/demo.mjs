#!/usr/bin/env node
// harness/dev/demo.mjs: scaffold a SPECIMEN scene, so that the default shape of a demo is a SHOT.
//
//   node harness/dev/demo.mjs --q "what this shows" [--name <slug>] [--fx <key>] [--subject <path>]
//   make demo Q="what this shows" [NAME=<slug>] [FX=<key>] [SUBJECT=<path>]
//
// WHY IT EXISTS. 27 of the 35 `formats/scene/_*.json` scratch scenes are contact-sheet shaped: four or
// more sibling layers of one type stepping across x or y. All 35 paint exactly ONE `bg` window, and one
// of the 35 has a cut and one has a camera, against 23% · 40% · 33% of the 120 shipped films. The
// scratch scenes are the worst-looking work in the repo and they are the ones we show people.
//
// A DESIGN SYSTEM WAS NOT THE MISSING PIECE, and the measurement is flat about it: all 35 of those
// scenes already declare a theme, and a theme already carries palette, gradient, type, motion, bg and
// vars. They shared a design system and still looked like a debug harness. What they had no share of
// was an ARCHETYPE: a demo's job is "prove the mechanism works", the fastest proof is nine specimens
// side by side, and nothing in the taste ladder fires for a throwaway.
//
// THE SUBJECT IS A PICTURE, AND THAT IS THE LOAD-BEARING PART. An effect acts on a SUBJECT, and most
// of the arsenal needs something with real detail to act on: `thermalBlur` remaps a luminance falloff,
// `edgeDetect` needs edges, a halftone needs midtones. A line of type on a near-white field gives none
// of them anything, so the first version of this scaffold made every filter read as a murky blob and
// the fault looked like the filter's. It was the subject's. So the picture carries the effect, the
// line of type CAPTIONS it, and the slug names the registry key.
//
// The doctrine, and when to reach for `make catalog` instead: docs/CRAFT/SPECIMEN.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// A demo is an authored scene, so it carries transitions[] only; the migration's converter runs here.
import { migrateOne } from '../author/migrate-junctions.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SERIES. A specimen is a SERIES ENTRY, never a one-off, so nothing below is per-demo: change the
// constant and every demo written after it moves together. The moment one demo picks its own ground or
// parks its caption somewhere else, two demos cut together jump, and the series is gone.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
const SERIES = {
  theme: 'default',
  aspect: '16:9',

  // ONE GROUND, every specimen, chosen by rendering candidates and looking at them.
  // NO RULING. A ruled grid or a rod field reads as a design tool's canvas, which is the debug-harness
  // signal this whole scaffold exists to remove, and `blobs` (the first pick here) has one. These two
  // are plain radial glows: they carry the frame without drawing anything on it.
  // DARK, so the specimen's own dark ground bleeds into the world instead of sitting on it as a slab.
  // Two windows, unbound, so core/junctions.js binds window 0 to the cut and window 1 to the end: the
  // register of the world turns once, on the one joint the film has.
  ground: ['aurora', 'mesh'],

  runtime: 9.0,
  cut: 4.4,
  cutStyle: 'zoom',

  // THE SUBJECT SLOT: pictorial, full bleed, and it carries the effect.
  // The house specimen is a CC0 plaster cast (assets/brands/looks/photos/credits.json): high detail,
  // a full tonal ramp from specular white to black, no brand and no licence to argue about, which is
  // exactly what a filter needs to have something to act on. `--subject` swaps in a capture or an
  // image of your own; the box does not move, because the box is the series.
  // It bleeds off the top, the bottom and the right edge, so the frame has no dead quarter and the
  // picture is plainly the subject rather than an illustration parked beside a headline.
  subject: 'assets/brands/looks/photos/michelangelo-david-sculpture-head-2.webp',
  subjectBox: { x: 806, y: -108, w: 1284, h: 1284 },
  // The picture bleeds off three edges; the fourth needs feathering or it reads as a pasted slab. This
  // is a CSS mask on the layer, so it works whatever the subject is: a photo on black, a capture on
  // white, a shader field. Without it the house cast's true black met the theme's dark navy at a hard
  // vertical seam, and one visible rectangle edge is the whole harness look coming back.
  subjectMask: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 9%, #000 22%)',

  // THE CAPTION, not the subject. It names what you are looking at, in the left third, at a size that
  // reads as a caption beside a picture rather than as a hero line.
  caption: { x: 116, y: 404, w: 640, size: 82, weight: 800, align: 'left' },
  maxCaptionChars: 48,

  // ONE LABEL TREATMENT: a slug naming the mechanism and its registry key, a footer naming the file.
  // Same corner, same size, same weight in every demo. This is most of what makes a row of specimens
  // read as one series, and it doubles as the thing that tells a viewer what they are looking at.
  slug: { x: 122, y: 176, w: 1000, size: 34, weight: 600, font: 'mono' },
  footer: { x: 122, y: 890, w: 1200, size: 30, weight: 500, font: 'mono' },

  camera: { from: 1, to: 1.11 },
};

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : argv[i + 1]; };
const has = (n) => argv.includes('--' + n);
const die = (msg) => { console.error(msg); process.exit(2); };

const q = (flag('q', '') || '').trim();
if (!q) {
  die(`usage: node harness/dev/demo.mjs --q "what this shows" [--name <slug>] [--fx <key>] [--subject <path>]

  --q        the caption: one line of real copy naming what the viewer is looking at.
             At most ${SERIES.maxCaptionChars} characters, because the caption size is fixed for the series.
  --name     the file slug (default: derived from --q) → formats/scene/_demo-<slug>.json
  --fx       an arsenal filter key, applied to the PICTURE. \`make arsenal Q="…"\` finds one.
  --subject  the picture the effect acts on (default: the house plaster cast). A capture, an
             image, anything with real detail. The box it fills is a series constant.

  doctrine: docs/CRAFT/SPECIMEN.md   ·   nine variants of one effect is \`make catalog\``);
}
if (q.includes('\u2014')) die('✗ --q contains an em dash. The validator rejects them in on-screen text.');
if (q.length > SERIES.maxCaptionChars) {
  die(`✗ --q is ${q.length} characters and the series caption size is fixed at ${SERIES.caption.size}px, `
    + `which fits about ${SERIES.maxCaptionChars}.\n  Shorten the line. Auto-fitting it would make this `
    + `demo's type a different size from every other demo's, and that is the series gone.`);
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const slug = slugify(flag('name', '') || q.split(/\s+/).slice(0, 4).join(' ')) || 'specimen';
const fx = flag('fx', null);

// Fail at the entry point, not at boot with a missing-asset finding three steps later.
const subjectSrc = flag('subject', SERIES.subject);
if (!fs.existsSync(path.resolve(repoRoot, subjectSrc.replace(/^\//, '')))) {
  die(`✗ no such subject: ${subjectSrc}\n  A specimen needs a picture to act on. Point --subject at a `
    + `capture or an image, or leave it out for the house plaster cast.`);
}

// ONE MOTION PERSONALITY, read from the theme rather than re-invented per demo. A theme states its own
// easing and stagger (`themes/*.json` → `motion`), and a scaffold that hard-codes its own would make
// every specimen move in a way the theme never asked for.
const theme = JSON.parse(fs.readFileSync(path.join(repoRoot, 'themes', `${SERIES.theme}.json`), 'utf8'));
const EASE = theme.motion?.easing || 'easeOutCubic';
const STAGGER = theme.motion?.stagger ?? 0.045;

const D = SERIES.runtime;
const C = SERIES.cut;
const r3 = (v) => +Number(v).toFixed(3);

// THE SUBJECT'S TRACK, hand-placed rather than named. Its shape is brew's four-key punctuation from
// harness/author/track.mjs: arrive over-size, settle, hold with a drift so the beat is not a still,
// then leave THROUGH the frame instead of dimming in place. It spans the WHOLE film and changes state
// across the cut, so the same object stands on both sides of the joint.
// Every key states every property it animates: core/sequence.js reads an omitted `scale` as 1 and an
// omitted `x` as 0, never as "hold the last one".
const subjectTrack = [
  { t: 0, x: 74, scale: 1.16, opacity: 0, ease: EASE },
  { t: 0.52, x: 0, scale: 1, opacity: 1, ease: EASE },
  { t: r3(C - 1.72), x: -14, scale: 1.02, opacity: 1, ease: 'easeInOutSine' },
  { t: r3(C - 0.06), x: -22, scale: 1.03, opacity: 1, ease: 'easeInOutSine' },
  { t: C, x: -186, scale: 1.22, opacity: 1, ease: EASE },
  { t: r3(D - 0.94), x: -214, scale: 1.25, opacity: 1, ease: 'linear' },
  { t: r3(D - 0.31), x: -248, scale: 1.31, opacity: 1, ease: 'easeInCubic' },
  { t: D, x: -330, scale: 1.44, opacity: 0, ease: 'easeInCubic' },
];
// The type is LATE onto the subject's idea rather than doing something of its own: same curve, offset
// by the theme's own stagger.
const rider = (from, dur, at = 0) => ([
  { t: r3(at), y: from, opacity: 0 },
  { t: r3(at + dur * 0.6), y: -2, opacity: 1, ease: EASE },
  { t: r3(at + dur), y: 0, opacity: 1, ease: EASE },
]);

const text = (spec, extra) => ({ type: 'text', ...spec, anim: 'none', exitDur: 0, ...extra });

const subject = {
  type: 'image',
  src: subjectSrc.startsWith('/') ? subjectSrc : `/${subjectSrc}`,
  ...SERIES.subjectBox,
  mask: SERIES.subjectMask,
  start: 0,
  duration: D,
  anim: 'none',
  exitDur: 0,
  motion: subjectTrack,
};
if (fx) subject.filter = fx;

const scene = {
  module: 'scene',
  theme: SERIES.theme,
  aspect: SERIES.aspect,
  duration: D,
  // Every waiver here is a property of the ARCHETYPE, not of this film, which is why the scaffold
  // writes them rather than leaving each author to discover the same findings.
  authoring: {
    allow: ['no-storyboard', 'no-preflight', 'slow-pace', 'text-overstays'],
    _why: {
      'no-storyboard': 'the archetype IS the plan. A specimen shows one mechanism for nine seconds and '
        + 'has no beats to storyboard: docs/CRAFT/SPECIMEN.md carries the decisions once, for the series.',
      'no-preflight': 'the nine decisions are made in the scaffold, once, for every specimen. Making '
        + 'them again per demo is how each demo ends up looking like a different film.',
      'slow-pace': 'a specimen is held on purpose. The pace floor grades films that must carry a story '
        + 'across their runtime; this one has one thing in it and you are meant to look at it.',
      'text-overstays': 'the line is a caption on a picture, not prose. It is read in under two seconds '
        + 'and it stays because the thing it names is still on screen.',
    },
  },
  audio: {
    silent: true,
    _why: 'a specimen is looked at, not listened to: nothing here is paced to a track, and a bed would '
      + 'only be there to fill nine seconds. Give it sound the moment the demo becomes a film.',
  },
  bg: SERIES.ground.map((preset) => ({ preset })),
  camera: [
    { t: 0, s: SERIES.camera.from },
    { t: D, s: SERIES.camera.to, ease: 'easeInOutCubic' },
  ],
  cuts: [
    { t: C, style: SERIES.cutStyle, dur: 0.4 },
  ],
  layers: [
    subject,
    text(SERIES.slug, {
      text: fx ? `filter · ${fx}` : `specimen · ${slug}`,
      start: 0,
      duration: D,
      motion: rider(22, 0.7, STAGGER * 4),
    }),
    text(SERIES.caption, {
      text: q,
      start: r3(STAGGER * 6),
      duration: r3(D - STAGGER * 6),
      motion: rider(30, 0.8, STAGGER * 8),
    }),
    text(SERIES.footer, {
      text: `_demo-${slug} · vawe`,
      start: r3(C + 0.12),
      duration: r3(D - C - 0.12),
      motion: rider(26, 0.62),
    }),
  ],
};

const rel = `formats/scene/_demo-${slug}.json`;
fs.writeFileSync(path.join(repoRoot, rel), JSON.stringify(migrateOne(scene).next, null, 1) + '\n');

// The path goes to stdout alone, so `make demo` can hand it straight to `make dev`.
console.error(`✓ ${rel}  ${D}s · one picture full bleed, one cut, one camera move, two grounds, a keyed track`);
console.error(`  The picture carries the effect and the line captions it. Swap the picture with --subject.`);
console.error(`  Nine variants of one effect is \`make catalog\`, never this. docs/CRAFT/SPECIMEN.md`);
if (has('print-path')) console.log(rel);
