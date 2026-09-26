// scripts/site/vocab-catalog.mjs: regenerate engine-doctrine/CRAFT/VOCABULARY.md from core/vocab.js,
// and engine-doctrine/CRAFT/PRIMITIVES-VOCABULARY.md, the word-action listing for every primitive in
// every `defineRegistry` registry (quality/gates/word-action.mjs is the ratchet that grades this; this
// is the doc a person reads instead of the JSON).
//
//   node scripts/site/vocab-catalog.mjs            write both docs
//   node scripts/site/vocab-catalog.mjs --check    fail if either doc is stale (make vocab-check)
//
// A SEPARATE FILE, NOT A FOURTH SECTION ON VOCABULARY.md. VOCABULARY.md is 3 hand-curated families and
// ~30 words, each with a written-by-a-person "when" column; the registries hold 700+ entries across 60
// families with no hand prose at all. Appending those to VOCABULARY.md would drown the curated doc in
// generated rows and change what "read VOCABULARY.md" means for the reader who wants the short list.
// One generator, two outputs, is the same shape scripts/site/effects-catalog.mjs already uses for
// engine-doctrine/EFFECTS.md and site/lib/effects.json: one source of truth, sized differently per reader.
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
import { FEEL, DURATION, CAMERA_WORDS, COMPARATIVE } from '../../core/registry/vocab.js';
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
  productive: 'a small, frequent UI-adjacent move: Carbon\'s utilitarian tier, quick enough to cost the viewer nothing.',
  medium: 'the engine\'s own default entrance. Reach past it on purpose, not by omission.',
  expressive: 'an occasional bigger moment: Carbon\'s emphasis tier, slower than `productive` so the one that matters reads as the one that matters.',
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

  faster: 'a duration is already set and it should read a touch quicker, without picking a new number by hand.',
  slower: 'a duration is already set and it should read a touch more deliberate, without picking a new number by hand.',
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
    + 'The move\'s own params are unchanged and still come from `core/camera-moves/index.js`.',
    Object.entries(CAMERA_WORDS).map(([w, t]) => [w, `\`"${t}"\``])],
  ['Comparative', 'resolveComparative(word, current) (core/registry/vocab.js)', 'A direction, not a value: '
    + '"make it faster" names what is already there, not a new number. `resolveComparative` steps the '
    + 'Duration ladder above by one word from whatever is currently set, and clamps at either end. '
    + 'Nothing in a scene or a harness tool calls this automatically yet: it resolves today only by '
    + 'calling the function directly, or by name through `make arsenal Q="snappier"`.',
    Object.entries(COMPARATIVE).map(([w, dir]) => [w, dir > 0 ? 'one step slower' : 'one step faster'])],
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
  // `low-vocab` is direction-floor's code for a film that reaches for none of these words, and
  // craft-coverage routes a code to the doc that settles it. Emitted here because a regeneration that
  // dropped it silently unrouted the code.
  out.push('codes: low-vocab');
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
out.push('**No "control" family.** Words like `subtle`, `tight`, `loose` and `aggressive` were considered');
out.push('and left out: a camera move\'s own params (`slowPush.to`, `cameraShake.amp`, `driftHold.ax/ay`, …)');
out.push('are named per move, not one shared dial an amount word could alias, and adding one would be a');
out.push('second mechanism for what each move already names for itself. `gentle` stays a Feel word only,');
out.push('it is not repeated here with a different meaning.');
out.push('');
out.push('---');
out.push(`_${total} words across ${FAMILIES.length} families. Regenerate: \`make vocab\`. The full engine`);
out.push('vocabularies these alias: `engine-doctrine/EFFECTS.md` (`make effects`)._');

const md = out.join('\n') + '\n';

// writeOrCheck: same contract for both generated docs, so a stale file fails the same way whichever
// generator produced it. Returns false on a stale --check, never exits, so both docs get checked
// (and the exit status reflects both) instead of the first stale file hiding the second.
let ok = true;
function writeOrCheck(dest, content, label) {
  if (CHECK) {
    const cur = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
    if (cur.trim() !== content.trim()) { console.error(`✗ ${dest} is stale, run \`make vocab\`.`); ok = false; }
    else console.log(`✓ ${dest} is in sync with ${label}`);
    return;
  }
  fs.writeFileSync(dest, content);
  console.log(`✓ wrote ${dest}`);
}

writeOrCheck(path.join(root, 'engine-doctrine/CRAFT/VOCABULARY.md'), md, 'core/registry/vocab.js');

// ---- PRIMITIVES-VOCABULARY.md: every entry of every defineRegistry registry, its `aka` words and its
// `blurb` action, grouped by registry. The doc quality/gates/word-action.mjs's ratchet is checking
// against, and the thing a fill agent reads to see which registry to work and what "done" looks like.
const { registries } = await import(path.join(root, 'core/registry/registry.js'));
const coreFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) walk(p);
    else if ((e.name.endsWith('.js') || e.name.endsWith('.mjs')) && !/\.test\.m?js$/.test(e.name)) coreFiles.push(p);
  }
}('core'));
for (const file of coreFiles) { try { await import(path.join(root, file)); } catch { /* browser-only, same exclusion arsenal-check.mjs makes */ } }

const REGS = registries().slice().sort((a, z) => a.kind.localeCompare(z.kind));
const hasWords = (reg, name) => Array.isArray(reg.aka && reg.aka[name]) && reg.aka[name].length >= 2;
const hasAction = (reg, name) => {
  const b = (reg.blurbs && reg.blurbs[name]) || '';
  return /\d/.test(b) || b.trim().split(/\s+/).filter(Boolean).length >= 10;
};

const pout = [];
pout.push('---');
pout.push('when: "you want to see every primitive the engine has, the plain words that find it, and the sentence that says what it does"');
pout.push('answers: "the full word-action listing every defineRegistry registry carries, grouped by registry, graded the same way make check GATE=word-action grades it"');
pout.push('group: reference');
pout.push('---');
pout.push('');
pout.push('# PRIMITIVES VOCABULARY: every registry entry, its words, its action');
pout.push('');
pout.push('> GENERATED by `scripts/site/vocab-catalog.mjs` (`make vocab`) from `registries()` in `core/registry/registry.js`. Do not edit.');
pout.push('');
pout.push('Every row is one primitive from one `defineRegistry` call. **words** are its `aka` (never printed');
pout.push('elsewhere, folded into search only); **action** is its `blurb`. A row with either column blank');
pout.push('fails `make check GATE=word-action`: `words` needs 2+ phrases, `action` needs a stated number or a full');
pout.push('sentence naming the mechanism. See `quality/gates/word-action.mjs` for the exact contract.');
pout.push('');
let ptotal = 0, pmeeting = 0;
for (const reg of REGS) {
  const names = Object.keys(reg.entries);
  ptotal += names.length;
  pout.push(`## ${reg.kind}  \`[${reg.slot}]\``);
  pout.push('');
  pout.push('| name | words | action |');
  pout.push('|---|---|---|');
  for (const name of names.slice().sort()) {
    const words = (reg.aka && reg.aka[name] || []).join(', ');
    const action = (reg.blurbs && reg.blurbs[name]) || '';
    if (hasWords(reg, name) && hasAction(reg, name)) pmeeting++;
    pout.push(`| \`${name}\` | ${words || '_missing_'} | ${action || '_missing_'} |`);
  }
  pout.push('');
}
pout.push('---');
pout.push(`_${ptotal} primitives across ${REGS.length} registries, ${pmeeting} meeting the word-action contract today.`);
pout.push('Regenerate: `make vocab`. Ratchet: `make check GATE=word-action`._');

writeOrCheck(path.join(root, 'engine-doctrine/CRAFT/PRIMITIVES-VOCABULARY.md'), `${pout.join('\n')}\n`, 'registries()');

if (CHECK) process.exit(ok ? 0 : 1);
console.log(`✓ ${total} words across ${FAMILIES.length} families, ${ptotal} primitives across ${REGS.length} registries`);
