// scripts/site/vocab-catalog.mjs: regenerate engine-doctrine/CRAFT/VOCABULARY.md from core/vocab.js.
//
//   node scripts/site/vocab-catalog.mjs            write the doc
//   node scripts/site/vocab-catalog.mjs --check    fail if the doc is stale (make vocab-check)
//
// Same contract as scripts/site/effects-catalog.mjs: the NAMES and the VALUES come from the registry,
// so the doc cannot claim a word the engine does not resolve or hide one it does. Only the one-line
// "when" is written here, because that is judgement and not derivable, and a word with no line
// FAILS the generator rather than rendering a blank, for the reason effects-catalog gives at its own
// gaps check: a catalogue that silently renders a dash is how 379 of 476 rows came to be blank.
//
// The doc carries its own frontmatter, emitted below, because quality/gates/doc-map.mjs holds the
// frontmatter for exactly two generated docs and says to keep it at two.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEEL, DURATION, CAMERA_WORDS } from '../../core/registry/vocab.js';
import { EASINGS } from '../../core/motion/motion.js';
import { CAMERA_MOVE_NAMES } from '../../core/camera-moves/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK = process.argv.includes('--check');

// When to reach for the word. Not what curve it is, the curve is in the value column.
const WHEN = {
  snappy: 'the house default for a decisive reveal. Arrives and stops, no wobble.',
  smooth: 'the layer is travelling THROUGH the frame rather than arriving in it.',
  soft: 'type, and anything that must stay readable the instant it lands.',
  sharp: 'a reveal that should read as a cut rather than a move.',
  gentle: 'idle drift, a held backdrop, anything the eye is not meant to follow.',
  heavy: 'something large. The long ramp at both ends is what reads as mass.',
  pop: 'a small element announcing itself: a chip, a badge, a tick.',
  bouncy: 'playful and loud. Wrong for a headline, right for a mascot.',
  elastic: 'the loudest curve here. Once per film, on the beat that can carry it.',
  stiff: 'spring feel with the overshoot damped out. Premium, not toy.',
  mechanical: 'a machine: a ticker, a conveyor, a progress bar that must not ease.',

  instant: 'a state change, not a move. Under the threshold where the eye reads travel.',
  fast: 'quick, but still legibly a move.',
  medium: 'the engine\'s own default entrance. Reach past it on purpose, not by omission.',
  slow: 'the eye follows the whole path. For a subject, not for furniture.',
  luxurious: 'a held gesture. One per film.',

  'push in': 'the frame stays alive under a held beat.',
  'slow push-in': 'the same shot, spelled the way a director says it.',
  'pull back': 'a detail turns out to be part of something larger.',
  'zoom out': 'the same shot, spelled the way a director says it.',
  dive: 'go INTO a point: a screen, a card, a marker on a map.',
  follow: 'content grows downward (a terminal, a feed) and the camera tracks it.',
  sweep: 'plain lateral travel. Reads as tracking, never as a lurch.',
  tour: 'fly station to station across a canvas bigger than the frame. The camera IS the cut.',
  circle: 'a gentle 3D swing around the frame.',
  'pan stations': 'the same travel, spelled the way a board describes it.',
  'ui focus zoom': 'go into one control of a captured interface, not the whole screen.',
  'punch in': 'a hard, short push on a beat. The camera reacting, not travelling.',
  shake: 'an impact. One hit, on the frame that takes it, never as texture.',
  'drift hold': 'a held shot that must stay alive. The smallest move the eye still reads.',
};

const FAMILIES = [
  ['Feel', 'ease', 'Any `ease` / `easing` / `settleEase` the ENGINE drives: a `motion` key, a `count`, '
    + 'a camera leg, `varsEase`. Not `parts[].ease` or `morph.ease`. Those go to GSAP and take GSAP names.',
    Object.entries(FEEL).map(([w, t]) => [w, `\`"${t}"\``])],
  ['Duration', 'enterDur · exitDur · duration · transition.dur', 'The layer timing slots. A junction '
    + '(`cuts[].dur`, `seams[].dur`, `stings[].dur`) still takes a number: the schema range-checks those, '
    + 'and a word would slip past the range unread.',
    Object.entries(DURATION).map(([w, s]) => [w, `\`${s}\`s`])],
  ['Camera', 'cameraMove.move', 'The shot, described. `{ "cameraMove": { "move": "pull back", "dur": 3 } }`. '
    + 'The move\'s own params are unchanged and still come from `core/camera-moves.js`.',
    Object.entries(CAMERA_WORDS).map(([w, t]) => [w, `\`"${t}"\``])],
];

// Anti-drift, the two ways it can rot: a word aliasing something the engine no longer has, and a word
// with no line. Both fail here rather than printing a broken doc.
const bad = [
  ...Object.entries(FEEL).filter(([, t]) => !(t in EASINGS)).map(([w, t]) => `feel "${w}" → no such easing "${t}"`),
  ...Object.entries(CAMERA_WORDS).filter(([, t]) => !CAMERA_MOVE_NAMES.includes(t)).map(([w, t]) => `camera "${w}" → no such move "${t}"`),
  ...FAMILIES.flatMap(([, , , rows]) => rows.filter(([w]) => !WHEN[w]).map(([w]) => `no "when" line for "${w}"`)),
];
if (bad.length) {
  console.error('✗ vocab-catalog: the registry and this generator disagree:');
  for (const b of bad) console.error(`    ${b}`);
  process.exit(1);
}

const out = [];
out.push('---');
out.push('when: "you know the FEELING you want and not the engine name for it"');
out.push('answers: "the plain words the engine resolves in a real slot: feel to an easing, duration to seconds, a shot description to a camera move"');
out.push('group: crosscutting');
out.push('---');
out.push('');
out.push('# VOCABULARY: plain words the engine accepts');
out.push('');
out.push('> GENERATED by `scripts/site/vocab-catalog.mjs` (`make vocab`) from `core/registry/vocab.js`. Do not edit.');
out.push('');
out.push('Every word below is accepted **in the slot the concrete value is accepted**, so reaching for the');
out.push('right curve costs the same keystrokes as reaching for the wrong one. That is the whole point: a');
out.push('word list you have to look up is a document, and a document only works on the author who already');
out.push('stopped to read it.');
out.push('');
out.push('A word is an ALIAS, never a new capability. The right column is what the engine actually runs, and');
out.push('naming it directly still works and still renders identically. An **unknown word throws**, with the');
out.push('near misses named. It is never quietly swapped for a default.');
out.push('');
let total = 0;
for (const [title, slot, intro, rows] of FAMILIES) {
  total += rows.length;
  out.push(`## ${title}  \`[${slot}]\``);
  out.push('');
  out.push(intro);
  out.push('');
  out.push('| word | resolves to | when |');
  out.push('|---|---|---|');
  for (const [w, v] of rows) out.push(`| \`${w}\` | ${v} | ${WHEN[w]} |`);
  out.push('');
}
out.push('---');
out.push(`_${total} words across ${FAMILIES.length} families. Regenerate: \`make vocab\`. The full engine`);
out.push('vocabularies these alias: `engine-doctrine/EFFECTS.md` (`make effects`)._');

const md = out.join('\n') + '\n';
const dest = path.join(root, 'engine-doctrine/CRAFT/VOCABULARY.md');
if (CHECK) {
  const cur = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
  if (cur.trim() !== md.trim()) { console.error('✗ engine-doctrine/CRAFT/VOCABULARY.md is stale, run `make vocab`.'); process.exit(1); }
  console.log('✓ engine-doctrine/CRAFT/VOCABULARY.md is in sync with core/vocab.js'); process.exit(0);
}
fs.writeFileSync(dest, md);
console.log(`✓ wrote engine-doctrine/CRAFT/VOCABULARY.md: ${total} words across ${FAMILIES.length} families`);
