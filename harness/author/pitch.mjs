// harness/author/pitch.mjs: THE PITCH ROUND, before the storyboard converges.
//
//   node harness/author/pitch.mjs <name>                                   # print the protocol
//   node harness/author/pitch.mjs <name> --chose "<angle>" [--left "<median>"]  # record the decision
//
// WHY. docs/CRAFT/PITCH.md is the doctrine: an unformed brief has nothing to converge on, so five
// concepts get sampled wide (one per path) under an anti-median gate before any storyboard question
// gets asked. This script is a HARNESS, not the agent doing that sampling: it cannot estimate a
// concept's probability of being the median, that is judgement, not arithmetic. What it CAN do is put
// the protocol's shape in front of the agent every time (so the four questions and the five paths are
// never re-derived from memory), and make the outcome auditable the same way every other stage-gate in
// this repo is: a receipt, hashed against the subject, that goes stale the moment the subject changes.
// See harness/lib/receipt.mjs and quality/gates/preflight.mjs for the pattern this mirrors.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeReceipt, readReceipt, receiptPath } from '../lib/receipt.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STAGE = 'pitch';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] != null ? process.argv[i + 1] : null;
}

// Guarded so importing this module never parses argv, writes a receipt, or exits, matching the guarded
// main() in llms-txt/route/sweep-static. The CLI body runs only when this file is the entry point.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

function main() {
const name = process.argv[2];
if (!name || name.startsWith('--')) {
  console.error('usage: node harness/author/pitch.mjs <name-or-scene.json> [--chose "<angle>"] [--left "<median>"]');
  process.exit(2);
}

// Resolve what the pitch is ABOUT. A scene JSON, its storyboard sidecar, or (most often, since this
// runs before either exists) a bare name with nothing on disk yet. In that last case there is still a
// protocol to print, just nothing yet to hash for a receipt.
function resolveSubject(n) {
  const candidates = n.endsWith('.json') || n.endsWith('.md')
    ? [n]
    : [`formats/scene/${n}.json`, `formats/scene/${n}.storyboard.md`];
  for (const rel of candidates) {
    const abs = path.resolve(ROOT, rel);
    if (fs.existsSync(abs)) return { rel, abs };
  }
  return { rel: candidates[0], abs: path.resolve(ROOT, candidates[0]) };
}

const subject = resolveSubject(name);
const subjectExists = fs.existsSync(subject.abs);
const chose = arg('chose');
const left = arg('left');

// ---- record mode: --chose was given -----------------------------------------------------------
if (chose) {
  if (!subjectExists) {
    console.error(`✗ cannot record: no file at ${subject.rel} yet. Write the scene or storyboard first,`);
    console.error(`  or point at one directly: node harness/author/pitch.mjs formats/scene/<name>.json --chose "..."`);
    process.exit(2);
  }
  const rec = writeReceipt(STAGE, subject.abs, {
    subject: path.relative(ROOT, subject.abs),
    chose,
    left: left || null,
  });
  if (!rec) { console.error('✗ could not write the pitch receipt.'); process.exit(1); }
  console.log(`✓ pitch recorded: ${path.relative(ROOT, receiptPath(STAGE, subject.abs))}`);
  console.log(`  chose: ${chose}`);
  if (left) console.log(`  left behind: ${left}`);
  console.log(`\n  Paste into the storyboard frontmatter:`);
  console.log(`    angle: "${chose.replace(/"/g, "'")}"`);
  process.exit(0);
}

// ---- protocol mode: print the four questions, the five paths, the gate, the format --------------
const r = subjectExists ? readReceipt(STAGE, subject.abs) : { exists: false, stale: false };
console.log(`\n  PITCH · ${subject.rel}${subjectExists ? '' : ' (not written yet)'}`);
if (r.exists) {
  console.log(r.stale
    ? `  ⚠ a pitch was recorded but the subject has changed since. Re-run the round.`
    : `  ✓ already recorded: "${r.receipt.chose}"`);
}

console.log(`
  Answer these about THIS brief before naming a single concept. Never shown to the user; they are
  the sampling constraint that keeps five concepts from collapsing into five phrasings of one idea.

    1. What does the subject look like, in its own visual world (not the category's default treatment)?
    2. What does the target emotion look like as a FRAME (longing = empty space, urgency = compression,
       awe = one element too large), not as a mood-board word?
    3. What does the playback surface demand (a feed fights for the first second; a lobby screen is
       ambient and has minutes)?
    4. What does every other video on this subject already look like? That answer is the anti-pattern,
       and it is now off the table for path 4 below.

  Sample exactly ONE concept from each path:

    1. the subject's own world       (a real captured surface, a count-up, a real product screen)
    2. the emotion, staged as a frame
    3. the audience, met or deliberately broken
    4. the anti-pattern from question 4, inverted
    5. an unusual format (a letter, a countdown, a recipe, a front page, a map)

  THE ANTI-MEDIAN GATE. Estimate, per concept, the probability a model handed this brief with no
  further guidance would produce it first. At least TWO of the five must sit below 0.10. If all five
  clear 0.10, every pitch is the median: regenerate, pushing harder on paths 4 and 5. Never show these
  numbers to the user.

  THE SILHOUETTE CHECK. Sketch each concept's major elements as rough bounding boxes. Two concepts
  with the same silhouette are one concept: cut one, replace it, before presenting.

  PRESENT each concept in exactly three lines: the concept (one sentence) · its visual world (the one
  or two vawe capabilities it rides, in plain words) · its opening hook. All five before any
  recommendation. Then recommend ONE with a reason. Mixing is a first-class answer; silence accepts
  the recommendation. ONE round.

  Record the outcome:
    node harness/author/pitch.mjs ${name} --chose "<the one-line chosen angle>" [--left "<the median left behind>"]

  read: docs/CRAFT/PITCH.md
`);
}
