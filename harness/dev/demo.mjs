#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateOne } from '../author/migrate-junctions.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const SERIES = {
  theme: 'default',
  aspect: '16:9',

  ground: ['aurora', 'mesh'],

  runtime: 9.0,
  cut: 4.4,
  cutStyle: 'zoom',

  subject: 'assets/brands/looks/photos/michelangelo-david-sculpture-head-2.webp',
  subjectBox: { x: 806, y: -108, w: 1284, h: 1284 },
  subjectMask: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 9%, #000 22%)',

  caption: { x: 116, y: 404, w: 640, size: 82, weight: 800, align: 'left' },
  maxCaptionChars: 48,

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
  --name     the file slug (default: derived from --q) → films/scene/_demo-<slug>.json
  --fx       an arsenal filter key, applied to the PICTURE. \`make arsenal Q="…"\` finds one.
  --subject  the picture the effect acts on (default: the house plaster cast). A capture, an
             image, anything with real detail. The box it fills is a series constant.

  doctrine: engine-doctrine/CRAFT/SPECIMEN.md   ·   nine variants of one effect is \`make catalog\``);
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

const subjectSrc = flag('subject', SERIES.subject);
if (!fs.existsSync(path.resolve(repoRoot, subjectSrc.replace(/^\//, '')))) {
  die(`✗ no such subject: ${subjectSrc}\n  A specimen needs a picture to act on. Point --subject at a `
    + `capture or an image, or leave it out for the house plaster cast.`);
}

const theme = JSON.parse(fs.readFileSync(path.join(repoRoot, 'themes', `${SERIES.theme}.json`), 'utf8'));
const EASE = theme.motion?.easing || 'easeOutCubic';
const STAGGER = theme.motion?.stagger ?? 0.045;

const D = SERIES.runtime;
const C = SERIES.cut;
const r3 = (v) => +Number(v).toFixed(3);

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
  authoring: {
    allow: ['no-storyboard', 'no-preflight', 'slow-pace', 'text-overstays'],
    _why: {
      'no-storyboard': 'the archetype IS the plan. A specimen shows one mechanism for nine seconds and '
        + 'has no beats to storyboard: engine-doctrine/CRAFT/SPECIMEN.md carries the decisions once, for the series.',
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

const rel = `films/scene/_demo-${slug}.json`;
fs.writeFileSync(path.join(repoRoot, rel), JSON.stringify(migrateOne(scene).next, null, 1) + '\n');

console.error(`✓ ${rel}  ${D}s · one picture full bleed, one cut, one camera move, two grounds, a keyed track`);
console.error(`  The picture carries the effect and the line captions it. Swap the picture with --subject.`);
console.error(`  Nine variants of one effect is \`make catalog\`, never this. engine-doctrine/CRAFT/SPECIMEN.md`);
if (has('print-path')) console.log(rel);
