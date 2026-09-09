// harness/author/critics.mjs: THE CRITIC PANEL, as an invokable, recorded step.
//
// docs/CRAFT/SUBAGENTS.md defines six standing critics (beat · bg-motion · reveal · fidelity · copy ·
// seam), each with one job, one input path, one verdict shape, and says to run them in parallel and
// record what they find. That doc was an argument nobody could invoke: launching the panel meant
// re-deriving six prompts by hand from a table, and "record it" meant a bare instruction with nowhere
// to write to. This is the tool half: it prints the six prompts, concrete for THIS scene, for the main
// thread to copy into six parallel Agent calls, and it writes the receipt SUBAGENTS.md asks for once
// the main thread reports back what each critic found.
//
// This file does NOT launch agents. Launching is the harness's job (Agent tool calls in one message);
// this only composes what to hand each one and records what came back. Pure fs + JSON, no side effects
// on import.
//
//   node harness/author/critics.mjs formats/scene/x.json                 # emit the six critic prompts
//   node harness/author/critics.mjs formats/scene/x.json --deciders      # emit the decider roster, in order
//   node harness/author/critics.mjs formats/scene/x.json --record p.json # write the panel receipt
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeReceipt } from '../lib/receipt.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The roster, kept in lockstep with docs/CRAFT/SUBAGENTS.md's table. `ab` is listed there as built-then-
// cut (nothing runs today), so it is not in this roster. Each `input` is a function of the scene's
// paths, matching the table's "input it is handed" column exactly.
export const ROSTER = [
  {
    name: 'beat',
    job: 'does each beat read at a glance',
    input: (name, vs) => `/tmp/beats/${name}.png` + (vs ? ` (produced with VS=${vs}, source-section shot beside each beat)` : ''),
    produce: (D, vs) => `make beats D=${D}${vs ? ` VS=${vs}` : ''}`,
    verdict: '{ findings: [ { beat, reads: "yes"|"no", flaw, fix } ] }',
  },
  {
    name: 'bg-motion',
    job: 'speed, scale and direction of anything that moves continuously',
    input: () => 'a 4+ frame strip, reference and render at matched timestamps (pull frames with `make frame D=<file> N=<n>`)',
    produce: (D) => `make frame D=${D} N=<n>  (repeat for 4+ timestamps; pair with the reference at the same n)`,
    verdict: '{ findings: [ { axis: "speed"|"scale"|"direction", ours, reference, delta, fix } ] }',
  },
  {
    name: 'reveal',
    job: 'how each beat enters and exits, never the settled frame',
    input: (name) => `/tmp/reveal/${name}.png`,
    produce: (D) => `make reveal D=${D}`,
    verdict: '{ findings: [ { beat, enter, exit, paired: "yes"|"no", flaw, fix } ] }',
  },
  {
    name: 'fidelity',
    job: 'recreations only: how close each beat is to its source',
    input: (name) => `/tmp/beats/${name}.png (render frames) beside the source section shots`,
    produce: (D, vs) => `make beats D=${D}${vs ? ` VS=${vs}` : ' VS=<brand>'}`,
    verdict: '{ findings: [ { beat, score: 0-10, gaps: [ "..." ] } ] }',
    skipUnless: (scene) => !!scene.recreation || !!scene.vs || !!scene._recreation,
  },
  {
    name: 'copy',
    job: 'on-screen writing only, admission test failed (sees only what the author already wrote, see SUBAGENTS.md)',
    input: (name, vs, D) => `the strings pulled from ${D}, in beat order (below)`,
    produce: () => null,
    verdict: '{ findings: [ { beat, line, tell, rewrite } ] }',
  },
  {
    name: 'seam',
    job: 'flash or collision at transitions',
    input: (name) => `/tmp/seams/${name}.png`,
    produce: (D, vs, name) => `make seam-check D=${D}  (requires out/${name}.mp4, render first)`,
    verdict: '{ findings: [ { seam, flash: "yes"|"no", evidence, fix } ] }',
  },
];

function flatLayers(ls) {
  return (ls || []).flatMap((L) => [L, ...flatLayers(L.layers), ...flatLayers(L.children)]);
}

// The DECIDER roster, kept in lockstep with docs/CRAFT/SUBAGENTS.md's second table and with AGENTS.md.
// A decider WRITES into the film, which is a larger permission than a critic's, so each one carries the
// field it owns and nothing else: two deciders that share a field fight over it, and a decision that
// turns out wrong has to be untangled instead of reverted. Order is a dependency chain, not a
// preference. The one link worth stating twice: motion comes BEFORE transitions, because the
// content-aware cut reads the velocity at a joint as its strongest signal, so a cut chosen against a
// still frame is choosing blind.
export const DECIDERS = [
  {
    name: 'storyboard',
    scope: 'the storyboard file, and nothing in the scene JSON',
    job: 'decide the film as a whole: the beats, the through-line, the motion plan and the cut plan',
    why: 'it is the lock artefact. Every role below transcribes it, so a gap here becomes an invention further down',
  },
  {
    name: 'subject',
    scope: "each beat's subject slot",
    job: 'decide what each beat SHOWS, and capture or name the real asset that shows it',
    why: '36% of films carry no pictorial layer at all, and what a beat shows is the one thing the engine must never choose alone (docs/MISTAKES.md #159)',
  },
  {
    name: 'scene',
    scope: 'exactly one fragment file, named in your brief',
    job: 'write the markup for one beat, and put addressable handles where the motion plan says something must move',
    why: 'HTML renders instantly, so you iterate against your own work with no render. That is the loop, not a critique',
    perScene: true,
  },
  {
    name: 'motion',
    scope: 'motion[] and idle, on layers the storyboard says move',
    job: 'key the motion the storyboard planned, and prove it moved by MEASURING across frames',
    why: 'nothing moves that nobody asked to move, so every keyed track is a decision somebody made',
    extra: [
      'You cannot watch the film. A description of the motion written from the JSON is a restatement of what you just wrote, so it proves nothing.',
      'Measure instead: sample the element across frames and report the numbers. A claimed wind-up that measures 3% variance where 24% was claimed is absent, whatever the JSON says.',
      'You carry a budget. The register split (docs/CRAFT/MOTION-REGISTERS.md) licenses sustained motion for kinetic work, and that licence is the door effect soup comes through. One named peak, and every other moving thing able to say what it is for.',
      'THE FILM MAY NOT STOP, and this is measured, not judged. `make motion-floor D=<file>` reports content motion per half second against the film\'s reference when it declares one. A window with nothing arriving in it is a hole the viewer feels, and the commonest cause is every reveal in a beat firing at once and landing inside its first second.',
      'THE FIX FOR A HOLE IS OVERLAP, NEVER AMBIENCE. Do not reach for `idle`, `breathe` or `drift` to raise a number: motion-floor counts only change concentrated in a small region, so ambient motion cannot satisfy it, and it was TESTED that way (idle on every layer of a real film changed the finding by nothing at all). Start the next reveal before the last one lands instead.',
      'AND NEVER ONE THING AT A TIME. Measured on a real launch film: at 9.5s its card is scaling AND its rows are arriving, and at 0.4s its word is travelling WHILE it types. Every moment carries an object in transit and content appearing inside it. A beat that scales an object in silence, or reveals text on a frozen frame, is doing half of what the frame can do.',
    ],
  },
  {
    name: 'transition',
    scope: 'transitions[] only',
    job: 'name the relationship across each join, then choose the transition that serves it',
    why: 'the engine narrows the cut by structure, but the rhetorical relationship between two beats is not in the data',
    extra: [
      'Read the RENDERED joins, not the JSON. That is the same admission test the critics are held to: what did you see that the author did not.',
      'Most joins are invisible. Earn two or three accents by meaning and make the outro the simplest one.',
    ],
  },
  {
    name: 'sound',
    scope: 'the audio block only',
    job: 'choose the bed, and place any cue the automatic punctuation cannot derive',
    why: 'cue punctuation is automatic now; choosing a bed is a register decision and the engine stays silent when it has no input',
  },
];

export function buildRoster(scenePath) {
  const abs = path.resolve(repoRoot, scenePath);
  const scene = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const name = path.basename(scenePath, '.json');
  const D = path.relative(repoRoot, abs);
  const dir = path.dirname(D);
  const storyboard = `${dir}/${name}.storyboard.md`;
  const flat = flatLayers(scene.layers);
  const fragments = flat
    .filter((L) => L.type === 'html' && typeof L.src === 'string')
    .map((L) => L.src);
  // A BEAT and a FRAGMENT are different counts and conflating them told every decider brief that a
  // 5-beat film with no html had "0 beat(s)". A beat is a unit of story; a fragment is one hand-written
  // surface, and one fragment can serve several beats (the same rendered card, shown once then five
  // times). Read the beat count from what actually marks a beat, in order of directness.
  const beatBlocks = flat.filter((L) => L.type === 'beat').length;
  const beats = beatBlocks
    || ((scene.transitions || []).length ? scene.transitions.length + 1 : 0)
    || (scene.layers || []).length;
  const ctx = {
    scene: D,
    name,
    storyboard,
    hasStoryboard: fs.existsSync(path.resolve(repoRoot, storyboard)),
    fragments,
    beats,
    transitions: (scene.transitions || []).length,
    hasAudio: !!scene.audio,
    theme: scene.theme || '(none)',
    aspect: scene.aspect || '16:9',
    duration: scene.duration,
  };
  const roster = DECIDERS.map((d) => {
    const lines = [
      `You are the "${d.name}" decider for ${ctx.scene}.`,
      `You WRITE: ${d.scope}. You touch nothing else, and you do not edit another role's field.`,
      `Your job: ${d.job}.`,
      `You exist because ${d.why}.`,
      '',
      `The film: ${ctx.beats} beat(s), ${ctx.fragments.length} html fragment(s), ${ctx.duration}s, ${ctx.aspect}, theme ${ctx.theme}, ${ctx.transitions} authored transition(s).`,
      ctx.fragments.length && ctx.fragments.length !== ctx.beats
        ? `Those two counts differ on purpose: ${ctx.fragments.length} hand-written surface(s) serve ${ctx.beats} beat(s). A fragment reused across beats is the continuity plan working, not a gap.`
        : null,
      ctx.hasStoryboard
        ? `Read the storyboard first: ${ctx.storyboard}. It is the source; you transcribe it, you do not re-decide it.`
        : `There is NO storyboard at ${ctx.storyboard}. Nothing below you can start until the storyboard decider writes one.`,
    ];
    if (d.perScene && ctx.fragments.length) {
      lines.push('', 'Launch ONE of these per fragment, each owning exactly one file:');
      for (const f of ctx.fragments) lines.push(`  · ${f}`);
    }
    if (d.extra) { lines.push(''); for (const e of d.extra) lines.push(e); }
    lines.push(
      '',
      'Standing rules: no em-dashes anywhere. Stage explicit paths. Do not block on a background render.',
      'Do not delegate to sub-agents. Report what you wrote and what you deliberately left alone.',
    );
    return { name: d.name, scope: d.scope, prompt: lines.filter((l) => l !== null).join('\n') };
  });
  return { ...ctx, roster };
}

// Every on-screen string in beat order, for the `copy` critic. "Beat order" here means layer order in
// the JSON, the only order the tool can see without rendering.
function copyLines(scene) {
  const out = [];
  for (const L of flatLayers(scene.layers)) {
    if (typeof L.text === 'string' && L.text.trim()) out.push({ layer: L.id || L.type, text: L.text });
  }
  return out;
}

export function buildPanel(scenePath, vs) {
  const abs = path.resolve(repoRoot, scenePath);
  const scene = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const name = path.basename(scenePath, '.json');
  const D = path.relative(repoRoot, abs);
  const mp4 = `out/${name}.mp4`;
  const lines = copyLines(scene);

  const critics = ROSTER.filter((c) => !c.skipUnless || c.skipUnless(scene)).map((c) => {
    const inputDesc = c.input(name, vs, D);
    const produce = c.produce(D, vs, name);
    let prompt = `You are the "${c.name}" critic. Your ONLY job: ${c.job}.\n`
      + `Read exactly this input, nothing else: ${inputDesc}.\n`;
    if (produce) prompt += `If it does not exist yet, produce it first: ${produce}\n`;
    if (c.name === 'copy') {
      prompt += `The strings (${lines.length}):\n` + lines.map((l, i) => `  ${i + 1}. [${l.layer}] ${l.text}`).join('\n') + '\n';
    }
    prompt += `Return ONLY this JSON shape, no prose: ${c.verdict}\n`
      + `Do not fix anything. Do not edit the scene. Report only.`;
    return { name: c.name, job: c.job, input: inputDesc, produce, verdict: c.verdict, prompt };
  });

  return { scene: D, name, mp4, critics };
}

// ---- CLI --------------------------------------------------------------------------------------------
function main() {
  const file = process.argv.find((a) => a.endsWith('.json') && !a.includes('--record'));
  const recordIdx = process.argv.indexOf('--record');
  const recordFile = recordIdx >= 0 ? process.argv[recordIdx + 1] : null;
  if (!file) {
    console.error('usage: node harness/author/critics.mjs <scene.json> [--record <panels.json>]');
    process.exit(2);
  }
  const abs = path.resolve(repoRoot, file);
  if (!fs.existsSync(abs)) { console.error(`✗ no such scene: ${file}`); process.exit(2); }

  const vsIdx = process.argv.indexOf('--vs');
  const vs = vsIdx >= 0 ? process.argv[vsIdx + 1] : undefined;

  if (process.argv.includes('--deciders')) {
    const r = buildRoster(file);
    console.log(`\n  DECIDER ROSTER · ${r.scene}\n`);
    console.log('  Deciders WRITE into the film; critics only report. Run these IN ORDER, not in parallel:');
    console.log('  each one reads what the one above it decided. The scene deciders are the exception,');
    console.log('  one per fragment, and those do run in parallel.\n');
    console.log('  Motion comes BEFORE transitions: the content-aware cut reads velocity at the joint,');
    console.log('  so a cut chosen before the motion exists is choosing against a still frame.\n');
    if (!r.hasStoryboard) console.log(`  ! no storyboard at ${r.storyboard}. Step 1 is not optional.\n`);
    r.roster.forEach((d, i) => {
      console.log(`  ── ${i + 1}. ${d.name} ${'─'.repeat(Math.max(1, 56 - d.name.length))}`);
      console.log(d.prompt.split('\n').map((l) => '  ' + l).join('\n'));
      console.log('');
    });
    console.log('  Then the critic panel, in ONE parallel message:');
    console.log(`    node harness/author/critics.mjs ${file}\n`);
    return;
  }

  if (!recordFile) {
    const panel = buildPanel(file, vs);
    console.log(`\n  CRITIC PANEL · ${panel.scene}\n`);
    console.log(`  Launch these ${panel.critics.length} in ONE message, several Agent calls, so they run in parallel.`);
    console.log(`  Critics report, the main thread fixes. A critic is evidence, never a ruling.\n`);
    for (const c of panel.critics) {
      console.log(`  ── ${c.name} ${'─'.repeat(Math.max(1, 60 - c.name.length))}`);
      console.log(c.prompt.split('\n').map((l) => '  ' + l).join('\n'));
      console.log('');
    }
    console.log(`  When all six report, collect their verdicts into one JSON file`);
    console.log(`  ({ "<critic>": <verdict> } per name) and record it:`);
    console.log(`    node harness/author/critics.mjs ${file} --record <panels.json>\n`);
    return;
  }

  const recAbs = path.resolve(repoRoot, recordFile);
  if (!fs.existsSync(recAbs)) { console.error(`✗ no such panels file: ${recordFile}`); process.exit(2); }
  let panels;
  try { panels = JSON.parse(fs.readFileSync(recAbs, 'utf8')); }
  catch (e) { console.error(`✗ ${recordFile} is not valid JSON: ${e.message}`); process.exit(2); }

  const names = ROSTER.map((c) => c.name);
  let passCount = 0;
  const critics = {};
  for (const n of names) {
    const v = panels[n];
    if (!v) continue; // critic wasn't run this panel (e.g. skipped, or fidelity on a non-recreation)
    const findings = Array.isArray(v.findings) ? v.findings : [];
    const pass = v.pass !== undefined ? !!v.pass : findings.length === 0;
    if (pass) passCount++;
    critics[n] = { pass, findings };
  }
  const ran = Object.keys(critics).length;

  const rec = writeReceipt('panels', abs, { critics, ranAt: new Date().toISOString() });
  if (!rec) { console.error(`✗ could not write the panel receipt (is ${file} readable?)`); process.exit(1); }
  console.log(`  ✓ ${passCount} of ${ran} critics pass · quality/baselines/approved/panels/${path.basename(file, '.json')}.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
