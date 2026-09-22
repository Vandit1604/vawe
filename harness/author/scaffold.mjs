// harness/author/scaffold.mjs: THE DEFAULT START. Blank JSON is the #1 authoring failure this repo
// names (AGENTS.md): an agent opens an empty scene, writes `anim:"fade"` on every layer, and every
// gate lets it through. Blueprints (`{type:"beat"}`, directed-motion factories composed straight into
// a film) are retired (recipes/README.md), so this no longer WRITES the film's layers. It writes the
// two things a plan needs before any layer exists: a `<out-basename>.storyboard.md` sidecar carrying
// the beat table the planning gates ask for, and a scene shell (`module`/`theme`/`aspect`/`duration`/
// `energy`, a declared-placeholder `bg` and a single `_scaffold`-tagged layer, never real content) at
// the exact shape an approved plan has before `make assemble` fills it in for real (AGENTS.md stage
// 2/5). The film's own PROMPT, what it says and shows, is written first with `make ideate`
// (skills/vawe:ideate), never guessed here.
//
//   node harness/author/scaffold.mjs --out films/scene/<name>.json [--dur 13] [--theme default] [--beats 5]
//   make scaffold OUT=films/scene/<name>.json DUR=13 THEME=default BEATS=5
//
// TWO STORYBOARD SHAPES, PICKED BY DURATION, NOT BY THE AUTHOR REMEMBERING. Below
// `CONTINUOUS_ACTION_MAX_S` (type-spines.mjs, 15s, measured off the library and matching
// storyboard-check.mjs's own SPINE_MAX_S) the sidecar is a CONTINUOUS ACTION plan: one object, its
// states over time, no beat boundaries (skills/vawe-continuous-action/SKILL.md). At or past that
// length it is a BEAT ROTATION plan: one `## Beat N` section per beat, with placeholder `<fill: ...>`
// markers for the copy and the motion, still unassigned. `--type` (launch/explainer/talking-head/
// sting/demo/recreation) names a role sequence from type-spines.mjs (open/build/payoff/close) instead
// of the generic rotation, since the two kinds of film are not planned the same way.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docRegistry, computeFeatures, storyboardPathFor } from '../../quality/gates/craft-checklist.mjs';
import { loadScene } from '../../core/engine/expand.js';
import { nearestExemplars, exemplarSignature } from '../lib/exemplars.mjs';
import { TYPE_SPINES, typeNames, CONTINUOUS_ACTION_MAX_S } from './type-spines.mjs';
import { darkVocabularySummary } from '../../quality/gates/coverage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] != null ? process.argv[i + 1] : dflt;
}

const out = arg('out', null);
if (!out) { console.error('usage: node harness/author/scaffold.mjs --out films/scene/<name>.json [--dur 13] [--theme default] [--beats 5] [--type launch|explainer|talking-head|sting|demo|recreation]'); process.exit(2); }
const dur = Number(arg('dur', 13));
const theme = arg('theme', 'default');
const beatsWanted = arg('beats', null) != null ? Number(arg('beats')) : null;
const typeArg = arg('type', null);
if (typeArg && !TYPE_SPINES[typeArg]) {
  console.error(`scaffold.mjs: unknown --type "${typeArg}". Known: ${typeNames().join(', ')}`);
  process.exit(2);
}
const spine = typeArg ? TYPE_SPINES[typeArg] : null;
// A type spine that explicitly declares `continuousObject: null` (talking-head, recreation) is saying
// its content is not held by a single transforming prop, whatever the duration: forcing one in anyway
// is exactly the "rectangle that resizes four times" skills/vawe-continuous-action/SKILL.md warns
// against. Every other type (or no `--type` at all, the generic default) still switches on duration.
const optsOutOfContinuousAction = !!spine && Object.prototype.hasOwnProperty.call(spine, 'continuousObject') && spine.continuousObject === null;
const CONTINUOUS_ACTION = dur < CONTINUOUS_ACTION_MAX_S && !optsOutOfContinuousAction;

// COMPOSE FROM THE NEAREST PROVEN FILM, not a generic default. `--like "<brief>"` (or, absent that,
// the output name itself) ranks the goldSet and the winner is NAMED, in the console and the
// storyboard, so the author studies the film before writing a line, rather than guessing alone.
const likeText = arg('like', null) || path.basename(out || '', '.json').replace(/[-_]/g, ' ');
const exemplar = nearestExemplars(likeText, 1)[0] || null;
const sig = exemplar && exemplar.score > 0 ? exemplarSignature(exemplar.file) : null;

// ---- write + report, shared by both branches ---------------------------------------------------------
function writeScaffold(scene, storyboard, logLines) {
  const sbPath = storyboardPathFor(out);
  fs.mkdirSync(path.dirname(path.resolve(ROOT, out)), { recursive: true });
  fs.writeFileSync(path.resolve(ROOT, out), JSON.stringify(scene, null, 1) + '\n');
  fs.writeFileSync(path.resolve(ROOT, sbPath), storyboard);
  for (const l of logLines) console.error(l);
  // Phase 6 of unwired.plan.md: adoption must land where an author already looks, not just in a
  // report nobody runs. `make scaffold` is the one moment every new film passes through, so it is the
  // cheapest place to say a whole registry sits unused rather than let it stay a secret until someone
  // counts by hand. Best-effort: a coverage computation should never block a scaffold from writing.
  try {
    const { total, dark, unusedProps } = darkVocabularySummary();
    console.error(`  ${dark}/${total} named engine capabilities are never used by an authored film (plus ${unusedProps} schema props): \`make coverage\` lists them.`);
  } catch { /* coverage is advisory here; never block the scaffold on it */ }
  console.error(`  storyboard: ${sbPath}`);
  console.error('  Write the film\'s prompt first: `make ideate` (skills/vawe:ideate). Then replace every');
  console.error(`  REPLACE:/<fill: ...> marker in the storyboard, run \`make storyboard-check\`, and only then \`make assemble D=${out}\`.`);
  if (process.argv.includes('--print-path')) process.stdout.write(out + '\n');
}

// Which CRAFT docs will craft-checklist ask about? Best-effort: an empty-layers shell has few
// applicable docs yet, and that is correct, not a bug, this runs before `make assemble` writes any.
function craftLinesFor(scene) {
  const expandedForFeatures = loadScene(JSON.parse(JSON.stringify(scene)));
  const features = computeFeatures(expandedForFeatures);
  const relevantDocs = docRegistry().filter((d) => features[d.appliesWhen] === true);
  return relevantDocs.length
    ? relevantDocs.map((d) => `    ${d.slug}: "REPLACE: ${d.confirm.replace(/"/g, "'")}"`).join('\n')
    : '    (none relevant yet)';
}

// The scene shell every plan gets: no real content. `make assemble` fills `layers` in once the plan
// is approved (AGENTS.md stage 5); writing anything here would be the JSON a person never signed off
// on. But `bg` and `layers` are both `required`/`minItems: 1` in films/scene/schema.json, so an empty
// shell fails `make validate` on arrival (the bug this scaffold used to ship). The fix is not to
// weaken either check, it is to write a DECLARED PLACEHOLDER for both, the same move the schema's own
// hint names for `bg` (`{ "preset": "plain" }`, a deliberately flat field) and quality/gates/audio-
// check.mjs already makes for sound (`{ "silent": true, "_why": "..." }`, a chosen absence, not an
// oversight). A placeholder `bg` alone still leaves `layers: []`, so one placeholder layer joins it:
// not content, a REPLACE-marked stand-in an author or `make studio` can tell apart from a real frame
// on sight, exactly like the `<fill: ...>` markers the storyboard already writes. `make assemble`
// (AGENTS.md stage 5, after approval) throws this array away and writes the real one. It is tagged
// `_scaffold: true` so `quality/gates/stage.mjs` (and the `harness/live/stage-gate.mjs` hook reading
// the same `layers > 0` signal) still see zero layers: neither treats it as "the film" they exist to
// keep out before sign-off, and both would misfire early if a bare length check counted it.
const PLACEHOLDER_NOTE = 'REPLACE: bg and this one layer are scaffold placeholders, not a design. '
  + 'Fill in at the design stage (AGENTS.md): stage kit -> make design-spec -> make preview.';
const scene = {
  module: 'scene',
  theme,
  // Stated, never defaulted: a scene with no `aspect` renders 9:16 in silence (core/engine/boot.js), and the
  // storyboard this scaffold writes says 1920x1080. The two must agree (MISTAKES #569).
  aspect: '16:9',
  duration: dur,
  energy: 'brand',
  note: sig
    ? `${PLACEHOLDER_NOTE} Composed to the shape of ${exemplar.file} (${exemplar.register || exemplar.teaches}), study it.`
    : PLACEHOLDER_NOTE,
  // Deliberately flat, per the schema's own hint on `bg` (`films/scene/schema.json`): not a chosen
  // look, a stated absence of one.
  bg: [{ preset: 'plain' }],
  layers: [
    {
      type: 'text',
      _scaffold: true,
      text: 'REPLACE: no design yet, this is a scaffold placeholder',
      x: 100, y: 480, w: 1720, size: 40, weight: 600,
      start: 0, duration: dur,
    },
  ],
};
const craftLines = craftLinesFor(scene);

if (CONTINUOUS_ACTION) {
  // ==================================================================================================
  // CONTINUOUS ACTION PLAN: one object, its states over time, no beat boundaries
  // (skills/vawe-continuous-action/SKILL.md).
  // ==================================================================================================
  const GENERIC_OBJECT = {
    object: 'REPLACE: the one thing the viewer acts on (a button, a field, a card, a token)',
    t0: 'REPLACE: what it looks like before anything happens',
    states: ['REPLACE: what it becomes at the first turn', 'REPLACE: what it becomes at the last turn'],
    last: 'REPLACE: the payoff, or the moment just before it',
  };
  const co = (spine && spine.continuousObject) || GENERIC_OBJECT;

  // Three checkpoints, tiled with no gaps: born -> composed -> resolved. Mirrors the skill's own 3-beat
  // worked examples (Name/Compose/Generate), never a fixed number of "cards".
  const p1 = +Math.max(0.6, dur * 0.3).toFixed(2);
  const p2 = +Math.max(p1 + 0.6, dur * 0.65).toFixed(2);

  // Three STATE sections, not four cards: t0 (offscreen/idle) -> composed -> resolved. Each carries
  // `object:`/`becomes:` (storyboard-check's SPINE_MAX_S branch). `states` holds 4 WAYPOINTS (t0, the
  // two co.states, last); `bounds` holds the 3 TIME WINDOWS between them, one fewer. A section is one
  // window, labeled by the waypoint it arrives at (`states[i + 1]`), so the loop below runs over
  // `bounds`'s 3 windows, never over `states` itself: mapping over all 4 waypoints previously read
  // `bounds[3]` (undefined) for the last one, printing a "6.04s-undefineds" window with a NaN duration.
  const states = [co.t0, ...co.states, co.last];
  const bounds = [0, p1, p2, dur];
  const windows = bounds.length - 1; // 3: Name, Compose, Resolve
  const stateSection = (i) => {
    const label = states[i + 1];
    const isFirst = i === 0, isLast = i === windows - 1;
    return [
      `## Beat ${i + 1}: ${isFirst ? 'Name' : isLast ? 'Resolve' : 'Compose'} (${bounds[i]}s-${bounds[i + 1]}s)`,
      `- type: ${isFirst ? 'hook' : isLast ? 'payoff_withheld' : 'product_surface'}`,
      `- object: ${label}`,
      `- onscreen: "<fill: the on-screen copy for this beat>"`,
      `- mechanism: <fill: how this state change moves, decided at the direct stage (AGENTS.md stage 6)>`,
      `- becomes: <fill: the ${i === 0 ? 'bare stage' : 'previous state'} becomes "${label}">`,
      // CAMERA fill marker on the resolve state only, the beat the payoff lands on: same reasoning as
      // beatSection below, not a new field, just the first time scaffold asks for one.
      ...(isLast ? [`- camera: <fill: a move from \`make arsenal Q="camera moves"\`, e.g. slowPush to=1.06, or delete this line if the camera holds still here on purpose>`] : []),
      `- why: ${isFirst ? 'open loop, pose the question the last frame answers' : isLast ? 'the press has a consequence, and the consequence is the last thing you see' : 'show the object doing the thing, not a claim about it'}`,
      `- duration: ${(bounds[i + 1] - bounds[i]).toFixed(2)}s`,
      '',
    ].join('\n');
  };

  const storyboard = `---
message: "<fill: the one sentence this video communicates>"
audience: "<fill: who it is for>"
arc: "one continuous action: ${co.object} ${states[states.length - 2] || 'changes'} and becomes ${co.last}"
threads: "<fill: a transforming object (${co.object}) + whatever else holds the film across its length>"
object: "${co.object}"
object_t0: "${co.t0}"
object_states: "${co.states.join('; ')}"
object_last: "${co.last}"
format: 1920x1080
theme: "themes/${theme}.json"
duration: ${dur}s
spectacle: "<fill: the ONE loudest moment, named: which beat, which device>"
not: "<fill: the defaults this film refuses, e.g. no centered slide deck, no gradient hero, no Inter>"
craft:
${craftLines}
---

<!-- Generated by \`make scaffold\` (CONTINUOUS ACTION plan, ${dur}s < ${CONTINUOUS_ACTION_MAX_S}s: skills/vawe-continuous-action/SKILL.md).${sig ? ` Study films/scene/${exemplar.file} (${exemplar.register || exemplar.teaches}) before writing.` : ''}
     Write the film's prompt first (\`make ideate\`), then replace every \`REPLACE:\`/\`<fill: ...>\` marker,
     then \`make storyboard-check SB=${path.relative(ROOT, storyboardPathFor(out))}\`. -->

${Array.from({ length: windows }, (_, i) => stateSection(i)).join('\n')}`;

  writeScaffold(scene, storyboard, [
    `✓ scaffold: CONTINUOUS ACTION plan, one object ("${co.object}") across ${dur}s -> ${out} (no design yet, layers are a placeholder)`,
    `  ${dur}s < CONTINUOUS_ACTION_MAX_S (${CONTINUOUS_ACTION_MAX_S}s): skills/vawe-continuous-action/SKILL.md, not the beat rotation.`,
    ...(typeArg ? [`  TYPE=${typeArg} spine: skills/vawe-type-${typeArg}/SKILL.md carries this type's rules and worked example.`] : []),
    ...(sig ? [`  nearest proven film: ${exemplar.file} (${exemplar.register || exemplar.teaches}): study films/scene/${exemplar.file}.`] : []),
  ]);
} else {
  // ==================================================================================================
  // BEAT ROTATION PLAN: dur >= CONTINUOUS_ACTION_MAX_S, a film with real room for chapters.
  // ==================================================================================================

  // The same floor as direction-floor.mjs `sparse-beats`: a boundary roughly every 3.5s past 8s.
  const needed = dur >= 8 ? Math.ceil(dur / 3.5) : 2;
  const total = Math.max(beatsWanted || 0, needed, 2);

  // The middle rotation: generic ROLE labels (not a beat factory, blueprints are retired), so a
  // storyboard has one section per role even with no `--type` naming a real spine.
  const MIDDLE = ['feature_grid', 'statement', 'named_things'];

  // `--type` composes from the fixed spine in type-spines.mjs instead of the generic rotation: a launch
  // film is planned differently from an explainer, and a rotation cannot tell the two apart. The
  // spine's beat COUNT wins over `--beats`/the sparse-beats floor, because the spine already IS a
  // considered beat count for that type; `--dur` still only changes how long each beat gets.
  let names, payoffIdx;
  if (spine) {
    names = spine.beats.slice();
    // the payoff is the beat right before the close, same convention as the generic rotation.
    payoffIdx = names.length >= 2 ? names.length - 2 : -1;
  } else {
    // Build the beat sequence: a hook opens, a cta closes, the payoff (last middle slot, index
    // `payoffIdx`) is always `statement` so `spectacle:` in the storyboard has somewhere real to point.
    names = ['hook'];
    const midCount = total - 2;
    payoffIdx = midCount > 0 ? midCount : -1; // index within `names` once hook (index 0) is prepended
    for (let i = 0; i < midCount; i++) {
      if (i === midCount - 1) { names.push('statement'); continue; }
      // rotate, never repeating the previous name
      let pick = MIDDLE[i % MIDDLE.length];
      if (pick === names[names.length - 1]) pick = MIDDLE[(i + 1) % MIDDLE.length];
      names.push(pick);
    }
    names.push('cta');
  }

  // Tile the duration with no gaps or overlaps, purely to give the storyboard's sections real times.
  const share = dur / names.length;
  const spans = names.map((name, i) => {
    const start = +(i * share).toFixed(2);
    const end = i === names.length - 1 ? dur : +((i + 1) * share).toFixed(2);
    return { name, start, dur: +(end - start).toFixed(2), end };
  });

  function beatSection(s, i) {
    const isPayoff = i === payoffIdx;
    const isFirst = i === 0, isLast = i === spans.length - 1;
    // CAMERA gets a fill marker on exactly one beat: the loudest one, same beat `spectacle:` already
    // points at (payoffIdx, or beat 1 when a 2-beat film has no dedicated payoff slot). Not a new field:
    // harness/lib/contract.mjs parseCameraLine/resolvedCamera and assemble.mjs already read `camera:` on
    // any beat, this scaffold just never asked for it. One marker, in the same fill-in pass as
    // mechanism/motion, so choosing a move costs nothing beyond replacing a line already in front of the
    // author; deleting it (the same opt-out object_in/motion already use) is a real "no" for a beat that
    // means to hold still, never a silent default.
    const wantsCamera = i === (payoffIdx >= 0 ? payoffIdx : 0);
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
      `- onscreen: "<fill: the on-screen copy for this beat>"`,
      `- mechanism: <fill: how this beat moves, decided at the direct stage (AGENTS.md stage 6) or from recipes/README.md>`,
      `- becomes: ${becomes}`,
      // THE PER-SCENE CONTRACT: only meaningful if a per-scene fan-out is actually happening (`make
      // scenes`), so left as an unfilled marker rather than a guessed value. harness/lib/contract.mjs
      // chainErrors refuses to run `make scenes`/`make assemble` until every beat's object_in matches the
      // beat before it's object_out. Delete both lines if this film carries no continuous object.
      `- object_in: "<fill: <placement>@<w>x<h>, e.g. bottom-left@120x40, must equal the beat before's object_out>"`,
      `- object_out: "<fill: <placement>@<w>x<h>, what this beat hands to the next one>"`,
      // THE MOTION PLAN (harness/lib/contract.mjs parseMotion): what ELSE moves in this beat, beyond the
      // one continuous object above. Same convention as object_in/out: an unfilled marker, never a
      // guessed value, and delete the line entirely if nothing but the continuous object moves here.
      `- motion: "<fill: <selector>@<kind>:<band>, e.g. [data-part=\\"headline\\"]@slide-left:energy>"`,
      ...(wantsCamera ? [`- camera: <fill: a move from \`make arsenal Q="camera moves"\`, e.g. slowPush to=1.06, or delete this line if the camera holds still here on purpose>`] : []),
      `- why: ${why}`,
      `- duration: ${s.dur}s`,
      '',
    ].join('\n');
  }

  const specIdx = payoffIdx >= 0 ? payoffIdx : 0; // no dedicated payoff slot on a 2-beat film

  const storyboard = `---
message: "<fill: the one sentence this video communicates>"
audience: "<fill: who it is for>"
arc: "hook -> build -> proof -> payoff -> CTA"
format: 1920x1080
theme: "themes/${theme}.json"
duration: ${dur}s
threads: "<fill: what holds this film across every cut, e.g. a continuous object, a motif, a bookend>"
spectacle: "<fill: the ONE loudest moment, named: beat ${specIdx + 1} (${names[specIdx]}) or wherever it really is>"
not: "<fill: the defaults this film refuses, e.g. no centered slide deck, no gradient hero, no Inter>"
craft:
${craftLines}
---

<!-- Generated by \`make scaffold\` (BEAT ROTATION plan, ${dur}s >= ${CONTINUOUS_ACTION_MAX_S}s).${sig ? ` Study films/scene/${exemplar.file} (${exemplar.register || exemplar.teaches}) before writing.` : ''}
     Write the film's prompt first (\`make ideate\`), then replace every \`REPLACE:\`/\`<fill: ...>\` marker,
     then \`make storyboard-check SB=${path.relative(ROOT, storyboardPathFor(out))}\`. -->

${spans.map(beatSection).join('\n')}`;

  writeScaffold(scene, storyboard, [
    `✓ scaffold: ${names.length}-beat plan (${names.join(' -> ')}) across ${dur}s -> ${out} (no design yet, layers are a placeholder)`,
    ...(typeArg ? [`  TYPE=${typeArg} spine: skills/vawe-type-${typeArg}/SKILL.md carries this type's rules and worked example.`] : []),
    ...(sig ? [`  nearest proven film: ${exemplar.file} (${exemplar.register || exemplar.teaches}): study films/scene/${exemplar.file}.`]
      : (!spine ? [`  no exemplar matched "${likeText.trim()}"; pass --like "<brief>" to name the nearest proven film to study.`] : [])),
  ]);
}
