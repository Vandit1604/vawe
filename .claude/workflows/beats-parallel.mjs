export const meta = {
  name: 'beats-parallel',
  description: 'Author a launch video by fanning out one sub-agent per storyboard beat, then merging into one scene JSON',
  whenToUse: 'A large video whose beats are independent enough to author in parallel (another engine Step 5, adapted). Pass the LOCKED storyboard as args.',
  phases: [
    { title: 'Author', detail: 'one agent per beat authors its layer fragment' },
    { title: 'Assemble', detail: 'merge fragments into one scene JSON' },
  ],
};

// args = {
//   theme: "themes/<brand>.json name",  brand: "<brand>",  canvasW, canvasH, duration,
//   beats: [ { title, type, blueprint, onscreen: [..], mechanism, why, start, dur } ]
// }
// Each beat is authored in isolation against the shared spec, exactly like another engine hands each frame to
// one worker. The workflow has no filesystem — it RETURNS the assembled scene object; the main loop writes
// it to formats/scene/<topic>.json, runs `make expand`, then the Step 6 gates.

const a = args || {};
const beats = Array.isArray(a.beats) ? a.beats : [];
if (!beats.length) log('no beats in args — pass the locked storyboard as args.beats[]; returning an empty scene.');

const LAYER_SCHEMA = {
  type: 'object',
  required: ['layers'],
  properties: {
    layers: {
      type: 'array',
      description: 'scene layer objects for THIS beat, with absolute start times',
      items: { type: 'object' },
    },
  },
};

const SPEC = `You author ONE beat of a vawe launch video as scene-layer JSON (module "scene").
Shared spec — obey it exactly:
- theme: ${a.theme || 'default'} (semantic vars: var(--text), var(--accent), var(--dim); never hardcode brand hex)
- canvas: ${a.canvasW || 1920}x${a.canvasH || 1080}
Rules: compose from a {type:"beat"} blueprint when one fits (kineticHook/statReveal/cardCascade/chipGrid/
terminalReveal/screenDive/logoReveal/logoLockup/verdictProof/ctaEnd), else layers (text/count/image/svg/
beam/paint/rect/group). Reach for the arsenal (border-beam, aurora/meteor paint, svg draw/morph, cameraMove,
kinetic split+preset). NO em-dashes in on-screen text. Weight cue reveals into the back ~50% of the beat.
Return ONLY the layer objects for this beat (a {type:"beat"} counts as one), each with an absolute "start"
in seconds within the beat's window.`;

phase('Author');
const fragments = beats.length ? await pipeline(
  beats,
  (b, _orig, i) => agent(
    `${SPEC}\n\nBEAT ${i + 1} — ${b.title}\ntype: ${b.type}\nblueprint: ${b.blueprint || '(choose)'}\n` +
    `onscreen cues (in order): ${JSON.stringify(b.onscreen || [])}\nmechanism: ${b.mechanism || ''}\n` +
    `why: ${b.why || ''}\nwindow: start=${b.start ?? 0}s dur=${b.dur ?? 5}s\n\n` +
    `Author this beat's layers, placed within its window, transcribing the cues. Return {layers:[...]}.`,
    { label: `beat:${i + 1}`, phase: 'Author', schema: LAYER_SCHEMA },
  ).then((r) => ({ i, layers: (r && r.layers) || [] })),
) : [];

phase('Assemble');
const merged = fragments.filter(Boolean).sort((x, y) => x.i - y.i).flatMap((f) => f.layers);
const duration = a.duration || beats.reduce((m, b) => Math.max(m, (b.start ?? 0) + (b.dur ?? 5)), 0) + 0.4;
log(`assembled ${merged.length} layers from ${fragments.filter(Boolean).length}/${beats.length} beats`);
return { module: 'scene', theme: a.theme || 'default', duration: +duration.toFixed(2), layers: merged };
