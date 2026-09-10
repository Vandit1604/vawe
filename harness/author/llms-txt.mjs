// harness/author/llms-txt.mjs: GENERATE formats/llms.txt, a portable vocabulary primer for any agent
// (this one or a fresh one with no repo access) that has to write a vawe scene JSON from scratch.
// Modeled on another engine's own llms.txt: About -> a runnable skeleton -> one rule + one snippet per
// capability, escalating -> the hard rules -> the command loop.
//
//   node harness/author/llms-txt.mjs   ·   make llms-txt (wired by the caller)
//
// WHY GENERATED, NOT HAND-WRITTEN. Every vocabulary here already lives in a `defineRegistry` (the layer
// types in core/layers/index.js, the 693 effects behind `catalogued()`), and every entry there already
// carries a blurb refused at load if it is missing or if it only restates the name (core/registry.js,
// `checkBlurb`). A hand-typed primer is a FOURTH copy of a fact three other things already hold and
// would drift the moment a layer type or a family was added, exactly the failure AGENTS.md names as the
// one this repo pays for most (a search that goes stale silently). This script reads the same live
// registries `make arsenal`/`make effects` read, so the primer cannot say a count that is wrong.
//
// What is curated, and what is not: the layer-type WHEN-TO-USE clauses in WHEN below are hand-written
// (a blurb says what a thing IS, not when to reach for it over its neighbours), but the vocabulary itself
// -- which layer types exist, how many, their blurbs, the family list and its counts -- is pulled live.
// A layer type with no WHEN entry still prints (name + blurb), it just does not get the extra clause,
// so a newly added type cannot make this generator throw.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogued } from '../../core/registry/registry.js';
import { LAYER_REGISTRY } from '../../core/layers/index.js';
import { collect } from './arsenal.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const OUT = path.join(ROOT, 'formats/llms.txt');

// Curated direction, one clause per layer type: why reach for THIS one over its neighbours. The blurb
// (pulled live below) says what it does; this says when to pick it. Optional by design -- see the file
// header for why a missing entry cannot break the build.
const WHEN = {
  text: 'the default for any on-screen word or line; reach for it before any other layer for copy.',
  count: 'a claim IS a number; use this instead of typing the number into a `text` layer.',
  image: 'a real picture exists (a photo, a capture, a screenshot); prefer it over `html` or a drawn icon.',
  video: 'real footage exists and the beat needs it to move; still deterministic, never "played".',
  group: 'two or more layers must move and stay aligned together (a card + its label + its chip).',
  rect: 'a plain box, panel, divider or accent bar with no text of its own.',
  glow: 'a light source or a soft halo is the point of the layer, not a decoration on top of one.',
  beam: 'light travelling a border or sweeping a box; the traced-outline look no CSS animation can seek.',
  svg: 'a vector mark (a logo, an icon path) that should draw itself on or morph, not just fade in.',
  cursor: 'the beat IS a product demo; this is the one primitive built to drive a click-through.',
  clip: 'footage came in as a frame sequence (PNG/WebP), not a video file, and must stay seek-exact.',
  html: 'the surface does not exist yet and CSS genuinely expresses it faster than composing primitives; see docs/CRAFT/HTML-FRAGMENTS.md before hand-writing one.',
  component: 'a real product surface was captured (`make capture`); always prefer this over `html` when the surface actually exists.',
  board: 'the beat is "here is our roadmap/backlog" from pure data, no captured asset needed.',
  doc: 'the beat is "here is a file/diff/README" from pure data, no captured asset needed.',
  shader: 'the whole frame is a generative backdrop; it cannot sample what is beneath it.',
  lottie: 'a Bodymovin/After Effects export already exists; it is seeked, never autoplayed.',
  paint: 'a generative field is needed AND it must be resampled as a texture by another layer.',
  raymarch: 'one hero 3D shot justifies the most expensive primitive in the engine; never for a whole film.',
  three: 'a real geometry (a font extrusion, a device body, a captured UI plane) is needed, not just a field.',
  globe: 'a dotted-planet-with-routes beat; reach for `three:"globe"` only when a real sun vector matters.',
  particles: 'a burst, flash or drift of many identical small marks (confetti/sparks/dust), deterministic.',
  composition: 'the beat needs bespoke first-party choreography that `parts` and recipes cannot express.',
  adjust: 'grade everything BENEATH one point in the stack (blur/darken/desaturate a whole background).',
};

const oneLine = (s) => String(s || '').split(/\n/)[0].replace(/\s+/g, ' ').trim();
const firstSentence = (s) => {
  const m = oneLine(s).match(/^(.*?[.;])\s/);
  return (m ? m[1] : oneLine(s)).replace(/[.;]$/, '');
};

function layerSection() {
  const layerReg = LAYER_REGISTRY;
  const lines = layerReg.names.map((name) => {
    const blurb = oneLine(layerReg.blurbs[name]);
    const when = WHEN[name] ? ` WHEN: ${WHEN[name]}` : '';
    return `- \`${name}\`: ${blurb}${when}`;
  });
  return { count: layerReg.names.length, lines };
}

function familySection() {
  // catalogued() already excludes nothing; drop "Layer types" here, it is section 3's own table above.
  const fams = catalogued().filter((r) => r.catalog.title !== 'Layer types');
  const lines = fams.map((r) => `- **${r.catalog.title}** (${r.names.length}, \`${r.catalog.tag}\`): ${firstSentence(r.catalog.intro)}.`);
  return { count: fams.length, lines };
}

export async function buildLlmsTxt() {
  // collect() walks every core/*, core/fx/* and core/layers/* module and imports it, which is also
  // the only thing that populates the registry list catalogued() reads. Call it first, or a family
  // whose module nothing here imports directly would silently be missing from the family section.
  const rows = await collect();
  const total = rows.length;
  const layers = layerSection();
  const families = familySection();

  return `# vawe: one JSON scene -> one deterministic video

## About vawe

vawe turns one self-describing JSON scene into a deterministic 30fps mp4. Every video is one JSON
file: \`"module": "scene"\` at the top, then a theme, a duration, a moving background, and a list of
layers. The renderer calls \`renderFrame(n)\` for every frame; nothing runs live, nothing drifts, the
same JSON always produces the same pixels. There are five canvases (16:9, 9:16, 1:1, 4:5, 4:3); an
aspect not named here still renders, sized to fit the long edge at 1920.

There is exactly one module. There are no templates: you compose a film from a vocabulary of layer
types plus effects that apply to them (motion, colour, transitions, sound), the same way you compose a
sentence from words, not from a form.

## Project structure: the minimal runnable scene

Every scene needs \`module\`, \`theme\`, \`duration\`, a \`bg\` (the backdrop MUST be declared, and should
move across the runtime, not sit static), and \`layers\` (at least one). This is the smallest real one:

\`\`\`json
{
  "module": "scene",
  "theme": "default",
  "duration": 6,
  "bg": [
    { "from": 0, "to": 3, "preset": "soft" },
    { "from": 3, "to": 6, "preset": "accent" }
  ],
  "layers": [
    {
      "type": "text",
      "text": "One data point beats a slide of ten",
      "x": 100, "y": 420, "w": 880, "size": 84, "weight": 800,
      "split": "word", "preset": "up",
      "start": 0.2, "duration": 2.4
    }
  ]
}
\`\`\`

## The vocabulary: layer types

Every layer's \`type\` is one of these ${layers.count} (pulled live from the layer registry, so this list
cannot go stale). Everything else in the vocabulary below is a dial ON one of these.

${layers.lines.join('\n')}

Full props per type: \`formats/scene/schema.json\`. What each type is FOR, in prose: \`docs/PRIMITIVES.md\`.

## The vocabulary: effect families

Do not try to memorise all ${total} named things the engine can do; reach for them by family, then
search within the family. Each of these ${families.count} families is a dial you put ON a layer, a cut,
the camera, or the scene:

${families.lines.join('\n')}

**Discovery, not memorisation:** \`make arsenal Q="a page scrolling under a static tilt"\` searches all
${total} named things (layer types, every family above, recipes, blocks, sound cues) by plain-English
description and returns the exact key to write. \`make schema AT="layers[].motion[]"\` answers the other
half: what fields are legal to write at one JSON path, read live off \`formats/scene/schema.json\`.

## The hard rules

- No em-dash (U+2014) in any on-screen text; the validator rejects it. Use a comma, a period, or middle dot.
- First-frame hook: 12 words or fewer, the strong word first, at most one emoji.
- \`bg\` is required, and it should MOVE. A static field is a decision you must be able to defend, never a default.
- Author the motion, do not name it: a hand-keyed \`motion\` track on the layer that carries the film's
  one loud beat reads as directed; a preset reads as decorated. Reserve presets for everything else.
- Hold the film across its cuts with a real device: a continuous object (one layer that survives a cut
  and changes across it) or a declared alternative (a motif, a match cut, a sound bridge) named in a
  waiver's \`_why\`. A film with neither is a slideshow, not a film.
- Show, do not only tell: a beat that makes a claim should be asked what it could SHOW (a real captured
  UI, a counted number, a real chart) before it is set only in type.

## The loop

\`\`\`
make pitch                          # ask the four questions: subject, data, payoff, audience/feeling
make scaffold OUT=formats/scene/x.json  # a directed skeleton (beats + continuous object), never a blank file
make dev D=formats/scene/x.json     # THE iteration loop: build, draft-render, look. No gates.
make ship D=formats/scene/x.json    # the real ladder: author-check -> render -> audit -> seams
make judge D=formats/scene/x.json   # the one step that SEES: composition and fidelity, post-render
\`\`\`

## Discovery

- \`make arsenal Q="<what you mean, in plain english>"\` searches all ${total} named things at once and
  prints the JSON key that means it.
- \`make schema AT="<json path>"\` answers what is legal to write at that path, with every field's type.
- \`make list\` shows the scene module's schema and a sample scene end to end.
`;
}

async function main() {
  const text = await buildLlmsTxt();
  fs.writeFileSync(OUT, text);
  console.error(`✓ llms-txt: wrote ${path.relative(ROOT, OUT)} (${text.split('\n').length} lines)`);
}

// Run only when invoked directly (`node harness/author/llms-txt.mjs`), never on import, so the test
// self-check can import buildLlmsTxt/OUT without writing a file as a side effect of loading the module.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
