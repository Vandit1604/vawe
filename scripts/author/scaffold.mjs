// scripts/author/scaffold.mjs: THE DEFAULT START. Blank JSON is the #1 authoring failure this repo
// names (AGENTS.md, docs/CRAFT/BLUEPRINTS.md): an agent opens an empty scene, writes `anim:"fade"` on
// every layer, and every gate lets it through. This writes the OPPOSITE default: a scene composed
// entirely from beat blueprints ({type:"beat"}), directed by construction, plus a storyboard sidecar
// that answers the questions the planning gates ask. The author's only job is to replace the
// `REPLACE:`-marked copy; the structure, the motion, the transitions, the backdrop and the sound are
// already there and already pass the floors.
//
//   node scripts/author/scaffold.mjs --out formats/scene/<name>.json [--dur 13] [--theme default] [--beats 5]
//   make scaffold OUT=formats/scene/<name>.json DUR=13 THEME=default BEATS=5
//
// What it writes, and why each piece is there:
//   - a scene with `module:"scene"` + the theme + `duration` + `energy:"brand"` (a real speed curve,
//     never left to default) and a sequence of `{type:"beat"}` layers with no gaps between them.
//   - the open (`kineticHook`) and close (`ctaEnd`) are fixed; the middle rotates through blueprints
//     that need no captured asset (statReveal, cardCascade, wordBlast, chipGrid), so no two adjacent
//     beats move alike, and the payoff (the beat right before ctaEnd) is a statReveal.
//   - one `transitions[]` entry per boundary (mostly `fade`, one `cinematicZoom` into the payoff), so
//     `no-transition` never fires and the cuts read as edited, not as a slideshow's flat concatenation.
//   - a `bg[]` with two moving-preset windows (`soft` then `accent`), so the backdrop turns and
//     `no-bg-motion` never fires.
//   - `audio: { auto: true }` (picks a real bed + derives sfx cues from cuts/stings), never silently mute.
//   - a `no-continuous-object` waiver with a real `_why`: a rotation of independent beats has no single
//     object crossing every cut by construction (screenDive/logoLockup would give it one; the default
//     rotation deliberately doesn't reach for external assets), so the film is held by a NON-OBJECT
//     device instead (a motif + a bookend, docs/CRAFT/FILM-STRUCTURE.md), and that is what the waiver
//     and the storyboard's `threads:` both say.
//
// It also writes `<out-basename>.storyboard.md`, the sidecar storyboard-check and craft-checklist read,
// with real frontmatter (threads/spectacle/not/etc, per docs/CRAFT/STORYBOARD-TEMPLATE.md) and one
// `## Beat N: Title (start s-end s)` section per beat carrying the fields storyboard-check requires
// (type/onscreen/why/becomes/blueprint). Copy fields the author must actually write use the
// `<fill: ...>` convention storyboard-check already recognises as "still a skeleton", so the sidecar is
// reported as structurally complete rather than as a fabricated proposal.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docRegistry, computeFeatures, storyboardPathFor } from '../gates/craft-checklist.mjs';
import { nearestExemplars, exemplarSignature } from '../lib/exemplars.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] != null ? process.argv[i + 1] : dflt;
}

const out = arg('out', null);
if (!out) { console.error('usage: node scripts/author/scaffold.mjs --out formats/scene/<name>.json [--dur 13] [--theme default] [--beats 5]'); process.exit(2); }
const dur = Number(arg('dur', 13));
const theme = arg('theme', 'default');
const beatsWanted = arg('beats', null) != null ? Number(arg('beats')) : null;

// COMPOSE FROM THE NEAREST PROVEN FILM, not a generic default. A blank draft regresses to the mean;
// so does a scaffold whose backdrop is one fixed pair of windows. `--like "<brief>"` (or, absent that,
// the output name itself) ranks the goldSet and the winner drives the backdrop rhythm below. The
// exemplar is NAMED, in the console and the storyboard, so the author studies the film, not only the rules.
const likeText = arg('like', null) || path.basename(out || '', '.json').replace(/[-_]/g, ' ');
const exemplar = nearestExemplars(likeText, 1)[0] || null;
const sig = exemplar && exemplar.score > 0 ? exemplarSignature(exemplar.file) : null;

// The same floor as direction-floor.mjs `sparse-beats`: a boundary roughly every 3.5s past 8s.
const needed = dur >= 8 ? Math.ceil(dur / 3.5) : 2;
const total = Math.max(beatsWanted || 0, needed, 2);

// The middle rotation: directed blueprints that need no captured asset (no `image`/`src` to invent),
// so the scaffold never ships a layer pointing at a file that does not exist. `statReveal` is held out
// of the rotation and reserved for the payoff slot; screenDive/logoLockup belong once the author has a
// real asset, swap one into the rotation then.
const MIDDLE = ['cardCascade', 'wordBlast', 'chipGrid'];

// Build the beat sequence: kineticHook opens, ctaEnd closes, the payoff (last middle slot, index
// `payoffIdx`) is always statReveal so `spectacle:` in the storyboard has somewhere real to point.
const names = ['kineticHook'];
const midCount = total - 2;
const payoffIdx = midCount > 0 ? midCount : -1; // index within `names` once kineticHook (index 0) is prepended
for (let i = 0; i < midCount; i++) {
  if (i === midCount - 1) { names.push('statReveal'); continue; }
  // rotate, never repeating the previous name
  let pick = MIDDLE[i % MIDDLE.length];
  if (pick === names[names.length - 1]) pick = MIDDLE[(i + 1) % MIDDLE.length];
  names.push(pick);
}
names.push('ctaEnd');

// Tile the duration with no gaps or overlaps.
const share = dur / names.length;
const spans = names.map((name, i) => {
  const start = +(i * share).toFixed(2);
  const end = i === names.length - 1 ? dur : +((i + 1) * share).toFixed(2);
  return { name, start, dur: +(end - start).toFixed(2), end };
});

// ---- props per blueprint: placeholder copy, clearly marked, real motion-relevant fields -------------
const CARDS = [
  { name: 'REPLACE: feature one', desc: 'REPLACE: what it does', detail: 'REPLACE: proof' },
  { name: 'REPLACE: feature two', desc: 'REPLACE: what it does', detail: 'REPLACE: proof' },
  { name: 'REPLACE: feature three', desc: 'REPLACE: what it does', detail: 'REPLACE: proof' },
];
const CHIPS = ['REPLACE: source A', 'REPLACE: source B', 'REPLACE: source C', 'REPLACE: source D'];

function propsFor(name, span, isPayoff) {
  switch (name) {
    case 'kineticHook':
      return { eyebrow: 'REPLACE: the open-loop question', to: 94, unit: '%', sub: 'REPLACE: the second cue, revealed later' };
    case 'statReveal':
      return { to: 3, prefix: '', unit: 'x', label: isPayoff ? 'REPLACE: the shocker payoff line' : 'REPLACE: a mid-film stat' };
    case 'cardCascade':
      return { title: 'REPLACE: feature grid title', cards: CARDS };
    case 'wordBlast':
      return { text: 'REPLACE' };
    case 'chipGrid':
      return { title: 'REPLACE: named things title', chips: CHIPS, footer: 'REPLACE: accent footer line' };
    case 'ctaEnd':
      return { command: 'REPLACE install command', sub: 'REPLACE: one-line sub', url: 'REPLACE.dev' };
    default:
      return {};
  }
}

const layers = spans.map((s, i) => ({
  type: 'beat',
  beat: s.name,
  start: s.start,
  dur: s.dur,
  ...propsFor(s.name, s, i === payoffIdx),
}));

// THE CONTINUOUS OBJECT, emitted by default. One accent element that spans EVERY cut, so the film reads
// as one piece and not a stack of independent beats. This is the single thing that most separates a
// directed film from a slideshow, and it is the one the old scaffold waived instead of writing. Replace
// it with your own motif (a mark that travels, a UI object that persists and changes, a rule under the
// operative word), but do NOT delete it: a film with nothing continuous is a slideshow, and
// `no-continuous-object` will say so. It travels on a hand-keyed track, so it also seeds authored motion.
layers.push({
  type: 'rect',
  w: 140, h: 6, radius: 3,
  x: 160, y: 900,
  fill: 'var(--accent)',
  start: 0,
  duration: dur,
  // sceneUnits (set above) wraps every beat and truncates any layer to the ONE beat its start falls in.
  // A continuous object must opt OUT of that: acrossBeats attaches it flat to the camera so it keeps its
  // full duration and crosses every cut. Without this, the "spans every cut" motif vanishes after beat 0.
  acrossBeats: true,
  motion: [
    { t: 0, x: 160 },
    { t: +(dur / 2).toFixed(2), x: 900, ease: 'easeInOutSine' },
    { t: dur, x: 160, ease: 'easeInOutSine' },
  ],
});

// ---- transitions: one per boundary, mostly fade, one accent into the payoff --------------------------
const transitions = [];
for (let i = 1; i < spans.length; i++) {
  const at = spans[i].start;
  const accent = i === payoffIdx; // the boundary INTO the payoff beat
  transitions.push(accent
    ? { at, fx: 'cinematicZoom', dur: 0.6 }
    : { at, fx: 'fade', dur: 0.5 });
}

// ---- bg: the backdrop turns, and the exemplar sets HOW MUCH ---------------------------------------
// CLAUDE.md's strongest single lever: 82% of the library paints one window for the whole runtime;
// brew inverts the world on four of its five cuts. When an exemplar is in hand, mirror its backdrop
// RHYTHM: one junction-bound window per beat (no from/to, so the cuts already written own the numbers,
// core/junctions.js), cycling the exemplar's own presets so each cut turns the world the way that film
// does. With no exemplar matched, fall back to the two-window default rather than invent a rhythm.
let bg;
if (sig && sig.bgPresets.length) {
  bg = spans.map((_, i) => ({ preset: sig.bgPresets[i % sig.bgPresets.length] }));
} else {
  const bgSplit = +(dur * 0.6).toFixed(2);
  bg = [
    { from: 0, to: bgSplit, preset: 'soft' },
    { from: bgSplit, to: dur, preset: 'accent' },
  ];
}

const scene = {
  module: 'scene',
  theme,
  duration: dur,
  energy: 'brand',
  // Each beat is a whole-frame composition, so the `fade` boundaries below must cross-fade the beats
  // as UNITS. Without this the renderer throws ("nothing underneath, the frame would go empty"): a
  // fade cut needs something to reveal, and flat-attached beats have nothing. produce.js auto-sets this
  // for `cuts[]` films but not for the `transitions[]` this scaffold writes, so it is set here.
  sceneUnits: true,
  ...(sig ? { note: `REPLACE: what this film says. Composed to the shape of ${exemplar.file} (${exemplar.register || exemplar.teaches}), study it.` } : {}),
  audio: { auto: true },
  bg,
  transitions,
  layers,
};

// ---- storyboard sidecar --------------------------------------------------------------------------
const sbPath = storyboardPathFor(out);

function beatSection(s, i) {
  const isPayoff = i === payoffIdx;
  const isFirst = i === 0, isLast = i === spans.length - 1;
  const why = isFirst ? 'open loop, pose the question the payoff answers'
    : isLast ? 'one clear next step, remove the risk'
    : isPayoff ? 'land the payoff, answer the open loop from beat 1 (the bookend)'
    : 'REPLACE: what the viewer learns or feels here, and why it belongs at this point';
  const becomes = isFirst ? 'the bare stage becomes a question'
    : isLast ? 'the payoff becomes an address the viewer can type'
    : isPayoff ? 'the build becomes the answer'
    : 'REPLACE: the X becomes the Y';
  return [
    `## Beat ${i + 1}: ${s.name} (${s.start}s-${s.end}s)`,
    `- type: ${isFirst ? 'hook' : isLast ? 'cta' : isPayoff ? 'benefit_highlight' : 'build'}`,
    `- blueprint: ${s.name}`,
    `- onscreen: "<fill: the on-screen copy for this beat>"`,
    `- mechanism: ${s.name} (make blueprints)`,
    `- becomes: ${becomes}`,
    `- why: ${why}`,
    `- duration: ${s.dur}s`,
    '',
  ].join('\n');
}

// Which CRAFT docs will craft-checklist ask about? Compute the same features it computes and answer
// every relevant one with a REPLACE stub, so the scaffold starts craft-checklist-clean too.
const features = computeFeatures(scene);
const relevantDocs = docRegistry().filter((d) => features[d.appliesWhen] === true);
const specIdx = payoffIdx >= 0 ? payoffIdx : 0; // no dedicated payoff slot on a 2-beat film: spectacle is the hook's count-up
const craftLines = relevantDocs.length
  ? relevantDocs.map((d) => `    ${d.slug}: "REPLACE: ${d.confirm.replace(/"/g, "'")}"`).join('\n')
  : '    (none relevant yet)';

const storyboard = `---
message: "<fill: the one sentence this video communicates>"
audience: "<fill: who it is for>"
arc: "hook -> build -> proof -> payoff -> CTA"
format: 1920x1080
theme: "themes/${theme}.json"
duration: ${dur}s
threads: "a CONTINUOUS OBJECT (the accent element the scaffold emits, spanning every cut on a hand-keyed track, REPLACE it with your real motif but keep something continuous) + a bookend (the hook's open loop, answered by the payoff)"
spectacle: "beat ${specIdx + 1} (${names[specIdx]}) · the hero count-up · the number carries the film's one loud moment"
not: "<fill: the defaults this film refuses, e.g. no centered slide deck, no gradient hero, no Inter>"
craft:
${craftLines}
---

<!-- Generated by \`make scaffold\`.${sig ? ` Composed to the shape of formats/scene/${exemplar.file} (${exemplar.register || exemplar.teaches}): study it before you replace the copy.` : ''} Replace every \`REPLACE:\`/\`<fill: ...>\` marker, then
     \`make storyboard-check SB=${path.relative(ROOT, sbPath)}\` and \`make author-check D=${path.relative(ROOT, out)}\`. -->

${spans.map(beatSection).join('\n')}`;

// ---- write --------------------------------------------------------------------------------------
fs.mkdirSync(path.dirname(path.resolve(ROOT, out)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, out), JSON.stringify(scene, null, 1) + '\n');
fs.writeFileSync(path.resolve(ROOT, sbPath), storyboard);

// The path goes to stdout ALONE (matching scripts/dev/demo.mjs), so `make scaffold` can hand it
// straight to `make dev`/`make ship`; everything else is a note and goes to stderr.
console.error(`✓ scaffold: ${names.length} beats (${names.join(' -> ')}) across ${dur}s -> ${out}`);
if (sig) console.error(`  composed to the shape of ${exemplar.file} (${exemplar.register || exemplar.teaches}): ${bg.length} bg windows turn the world. STUDY formats/scene/${exemplar.file}.`);
else console.error(`  no exemplar matched "${likeText.trim()}"; used the two-window default. Pass --like "<brief>" to compose from the nearest proven film.`);
console.error(`  storyboard: ${sbPath}`);
console.error(`  Replace every REPLACE:/<fill: ...> marker, then \`make dev D=${out}\`.`);
if (process.argv.includes('--print-path')) process.stdout.write(out + '\n');
