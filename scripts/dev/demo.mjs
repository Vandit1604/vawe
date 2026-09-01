#!/usr/bin/env node
// scripts/dev/demo.mjs: scaffold a SPECIMEN scene, so that the default shape of a demo is a SHOT.
//
//   node scripts/dev/demo.mjs --q "what this shows" [--name <slug>] [--fx <filter key>]
//   make demo Q="what this shows" [NAME=<slug>] [FX=<key>]     ← writes it, then runs the dev loop
//
// WHY IT EXISTS. 27 of the 35 `formats/scene/_*.json` scratch scenes are contact-sheet shaped: four or
// more sibling layers of one type stepping across x or y. All 35 paint exactly ONE `bg` window, and
// one of the 35 has a cut and one has a camera, against 23% · 40% · 33% of the 120 shipped films. The
// scratch scenes are the worst-looking work in the repo and they are the ones we end up showing people.
//
// A DESIGN SYSTEM WAS NOT THE MISSING PIECE, and the measurement is flat about it: all 35 of those
// scenes already declare a theme, and a theme already carries palette, gradient, type, motion, bg and
// vars. They shared a design system and still looked like a debug harness. What they had no share of
// was an ARCHETYPE: a demo's job is "prove the mechanism works", the fastest proof is nine specimens
// side by side, and nothing in the taste ladder fires for a throwaway. So the archetype ships with the
// file, and the design system's real job here is the second one: making a ROW of demos read as a
// series rather than as N unrelated experiments.
//
// The doctrine, and when to reach for `make catalog` instead: docs/CRAFT/SPECIMEN.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SERIES. A specimen is a SERIES ENTRY, never a one-off, so nothing below is per-demo: change the
// constant and every demo written after it moves together. Nothing in this file lets a caller override
// one of these, and that is the point. The moment one demo picks its own ground or parks its label
// somewhere else, two demos cut together jump, and the series is gone.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
const SERIES = {
  theme: 'default',
  aspect: '16:9',

  // ONE GROUND, every specimen, chosen by looking at rendered frames rather than by reading preset
  // names, and chosen because it is GOOD, never because it makes an effect legible. A ground picked to
  // reveal the specimen is how the scratch library ended up multi-coloured and busy. If a specimen
  // needs contrast to read, it gets it from scale and from the empty half of the frame.
  // Two windows, listed in order with no from/to, so core/junctions.js binds window 0 to the cut and
  // window 1 to the end: the register of the world turns once, on the one joint the film has.
  ground: ['soft', 'blobs'],

  // ONE RUNTIME and ONE CUT, in the same place every time, so two demos cut together share a rhythm.
  runtime: 9.0,
  cut: 4.4,
  cutStyle: 'zoom',

  // ONE TYPE SCALE, ONE SUBJECT SIZE. The subject does not resize itself to fit a longer line: the
  // line gets shorter. That is why `--q` is length-capped below rather than auto-fitted.
  subject: { x: 116, y: 352, w: 1700, size: 152, weight: 800, align: 'left' },
  maxSubjectChars: 48,

  // ONE LABEL TREATMENT. The slug names the mechanism and its registry key; the footer names the file.
  // Same corner, same size, same weight, in every demo. This is most of what makes a row of specimens
  // read as one series, and it doubles as the thing that tells a viewer what they are looking at.
  slug: { x: 122, y: 176, w: 1000, size: 34, weight: 600, font: 'mono' },
  footer: { x: 122, y: 890, w: 1200, size: 30, weight: 500, font: 'mono' },

  // ONE CAMERA MOVE: a slow push across the whole runtime, so the frame is never parked.
  camera: { from: 1, to: 1.11 },
};

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : argv[i + 1]; };
const has = (n) => argv.includes('--' + n);
const die = (msg) => { console.error(msg); process.exit(2); };

const q = (flag('q', '') || '').trim();
if (!q) {
  die(`usage: node scripts/dev/demo.mjs --q "what this shows" [--name <slug>] [--fx <key>]

  --q     the one line of real copy this demo is about. It becomes the subject of the shot.
          At most ${SERIES.maxSubjectChars} characters: the subject size is fixed for the series.
  --name  the file slug (default: derived from --q) → formats/scene/_demo-<slug>.json
  --fx    an arsenal filter key, applied to the subject. \`make arsenal Q="…"\` finds one.

  doctrine: docs/CRAFT/SPECIMEN.md   ·   nine variants of one effect is \`make catalog\``);
}
if (q.includes('\u2014')) die('✗ --q contains an em dash. The validator rejects them in on-screen text.');
if (q.length > SERIES.maxSubjectChars) {
  die(`✗ --q is ${q.length} characters and the series subject size is fixed at ${SERIES.subject.size}px, `
    + `which fits about ${SERIES.maxSubjectChars}.\n  Shorten the line. Auto-fitting it would make this `
    + `demo's type a different size from every other demo's, and that is the series gone.`);
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const slug = slugify(flag('name', '') || q.split(/\s+/).slice(0, 4).join(' ')) || 'specimen';
const fx = flag('fx', null);

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
// scripts/author/track.mjs: arrive over-size, settle, hold with a drift so the beat is not a still,
// then leave THROUGH the frame instead of dimming in place. It spans the WHOLE film and changes state
// across the cut, so the same object stands on both sides of the joint.
// Every key states every property it animates: core/sequence.js reads an omitted `scale` as 1 and an
// omitted `y` as 0, never as "hold the last one".
const subjectTrack = [
  { t: 0, y: 34, scale: 1.34, opacity: 0, ease: EASE },
  { t: 0.47, y: 0, scale: 1, opacity: 1, ease: EASE },
  { t: r3(C - 1.72), y: 13, scale: 1.02, opacity: 1, ease: 'easeInOutSine' },
  { t: r3(C - 0.06), y: -7, scale: 1.03, opacity: 1, ease: 'easeInOutSine' },
  { t: C, y: -70, scale: 0.83, opacity: 1, ease: EASE },
  { t: r3(D - 0.94), y: -84, scale: 0.85, opacity: 1, ease: 'linear' },
  { t: r3(D - 0.31), y: -102, scale: 0.94, opacity: 1, ease: 'easeInCubic' },
  { t: D, y: -140, scale: 1.42, opacity: 0, ease: 'easeInCubic' },
];
// The labels are LATE onto the subject's idea rather than doing something of their own: same curve,
// offset by the theme's own stagger.
const label = (from, dur, at = 0) => ([
  { t: r3(at), y: from, opacity: 0 },
  { t: r3(at + dur * 0.6), y: -2, opacity: 1, ease: EASE },
  { t: r3(at + dur), y: 0, opacity: 1, ease: EASE },
]);

const text = (spec, extra) => ({ type: 'text', ...spec, anim: 'none', exitDur: 0, ...extra });

const subject = text(SERIES.subject, {
  text: q,
  start: 0,
  duration: D,
  motion: subjectTrack,
});
if (fx) subject.filter = fx;

const scene = {
  module: 'scene',
  theme: SERIES.theme,
  aspect: SERIES.aspect,
  duration: D,
  // Every waiver here is a property of the ARCHETYPE, not of this film, which is why the scaffold
  // writes them rather than leaving each author to discover the same four findings.
  authoring: {
    allow: ['no-storyboard', 'no-preflight', 'slow-pace', 'text-overstays'],
    _why: {
      'no-storyboard': 'the archetype IS the plan. A specimen shows one mechanism for nine seconds and '
        + 'has no beats to storyboard: docs/CRAFT/SPECIMEN.md carries the decisions once, for the series.',
      'no-preflight': 'the nine decisions are made in the scaffold, once, for every specimen. Making '
        + 'them again per demo is how each demo ends up looking like a different film.',
      'slow-pace': 'a specimen is held on purpose. The pace floor grades films that must carry a story '
        + 'across their runtime; this one has one thing in it and you are meant to look at it.',
      'text-overstays': 'the subject is not prose, it is the object the film is about. It is one short '
        + 'line, read in under two seconds, and it stays because leaving would end the shot.',
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
    text(SERIES.slug, {
      text: fx ? `filter · ${fx}` : `specimen · ${slug}`,
      start: 0,
      duration: D,
      motion: label(22, 0.7, STAGGER * 4),
    }),
    subject,
    text(SERIES.footer, {
      text: `_demo-${slug} · vawe`,
      start: r3(C + 0.12),
      duration: r3(D - C - 0.12),
      motion: label(26, 0.62),
    }),
  ],
};

const rel = `formats/scene/_demo-${slug}.json`;
fs.writeFileSync(path.join(repoRoot, rel), JSON.stringify(scene, null, 1) + '\n');

// The path goes to stdout alone, so `make demo` can hand it straight to `make dev`.
console.error(`✓ ${rel}  ${D}s · one subject, one cut, one camera move, two backdrops, a keyed track`);
console.error(`  Now make it about something: the subject line is the only copy, so say the true thing.`);
console.error(`  Nine variants of one effect is \`make catalog\`, never this. docs/CRAFT/SPECIMEN.md`);
if (has('print-path')) console.log(rel);
