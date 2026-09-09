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
// TWO SHAPES, PICKED BY DURATION, NOT BY THE AUTHOR REMEMBERING. Below `CONTINUOUS_ACTION_MAX_S`
// (type-spines.mjs, 15s, measured off the library and matching storyboard-check.mjs's own SPINE_MAX_S)
// this file emits a CONTINUOUS ACTION: one object, one hand-keyed track, zero transitions, its state
// change IS the film's structure (skills/vawe-continuous-action/SKILL.md). At or past that length it
// emits the BEAT ROTATION described below, because a 15s+ film genuinely has room for chapters and a
// single prop stretched that far is the "rectangle that resizes four times" the skill warns against.
// `formats/scene/post-determinism.json` (43s) is a real beat-spine film; this scaffold's long-form
// output is built to the same shape, not a stand-in for it.
//
// THE BEAT ROTATION (dur >= CONTINUOUS_ACTION_MAX_S), what it writes and why each piece is there:
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
// THE CONTINUOUS ACTION (dur < CONTINUOUS_ACTION_MAX_S): one object (`id:"spine"`) present for the
// whole film, carrying a hand-keyed `motion` track welded from two of `track.mjs`'s MEASURED shapes
// (`pan` then `blast`, off higgsfield-recreation/brew-launch-act1) plus a `vars` morph, so it changes
// SHAPE as well as position. A hook line types in and clears before it is born; a payoff line holds at
// the end. Zero `transitions`, waived with a real `_why` (continuous-action doctrine, not "grandfathered").
//
// It also writes `<out-basename>.storyboard.md`, the sidecar storyboard-check and craft-checklist read.
// Beat rotation: one `## Beat N: Title (start s-end s)` section per beat carrying the fields
// storyboard-check requires (type/onscreen/why/becomes/blueprint). Continuous action: one section per
// STATE the object passes through, plus `object`/`object_t0`/`object_states`/`object_last` in the
// frontmatter (the shape storyboard-check's SPINE_MAX_S branch asks for). Copy fields the author must
// actually write use the `<fill: ...>` convention storyboard-check already recognises as "still a
// skeleton", so the sidecar is reported as structurally complete rather than as a fabricated proposal.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docRegistry, computeFeatures, storyboardPathFor } from '../../quality/gates/craft-checklist.mjs';
import { loadScene } from '../../core/engine/expand.js';
import { nearestExemplars, exemplarSignature } from '../lib/exemplars.mjs';
import { TYPE_SPINES, typeNames, CONTINUOUS_ACTION_MAX_S } from './type-spines.mjs';
import { computedLook } from '../../core/registry/theme-contract.js';
// MEASURED motion, not invented: `SHAPES` is `track.mjs`'s own normalised keys off higgsfield-recreation
// and brew-launch-act1 (its header), the two films this repo's continuous-action doctrine argues from.
// A continuous-action scaffold welds two of them onto one object's track (a compose phase, then a
// resolve), the same move higgsfield's own button track makes, instead of inventing new numbers.
import { SHAPES } from './track.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CANVAS_W = 1920;

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] != null ? process.argv[i + 1] : dflt;
}

const out = arg('out', null);
if (!out) { console.error('usage: node scripts/author/scaffold.mjs --out formats/scene/<name>.json [--dur 13] [--theme default] [--beats 5] [--type launch|explainer|talking-head|sting|demo|recreation]'); process.exit(2); }
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

// THEME LOOK (W8, core/registry/theme-contract.js): the brand's own fixed backdrop/cuts/scale/layout, read
// straight off the theme file so a scaffold for THIS brand doesn't re-decide them the way the type
// spine decides them for a whole TYPE. Optional: a theme with no `look` changes nothing below, same as
// before this existed. `theme` here is always a name (scaffold never takes an inline theme object).
let look = null, themeObj = null;
try {
  const themePath = path.resolve(ROOT, 'themes', `${theme}.json`);
  if (fs.existsSync(themePath)) { themeObj = JSON.parse(fs.readFileSync(themePath, 'utf8')); look = themeObj.look || null; }
} catch { /* an unreadable theme file is core/validate/validate.mjs's job to report, not scaffold's */ }
// The house default (core/registry/theme-contract.js computedLook): the same `scale`/`layout.margin`/
// `cuts` this scaffold used to hardcode as its own last-resort literal, now sourced from the one place
// that owns them, so this file cannot drift from it the way the two independent copies of `bgBlock`
// once did (scripts/lib/theme-bg.mjs's own header). `look` above stays the AUTHORED-only object: the
// priority below is still authored `theme.look` > the `--type` spine > this house default, unchanged.
const houseDefault = computedLook(themeObj || {});

// COMPOSE FROM THE NEAREST PROVEN FILM, not a generic default. A blank draft regresses to the mean;
// so does a scaffold whose backdrop is one fixed pair of windows. `--like "<brief>"` (or, absent that,
// the output name itself) ranks the goldSet and the winner drives the backdrop rhythm below. The
// exemplar is NAMED, in the console and the storyboard, so the author studies the film, not only the rules.
const likeText = arg('like', null) || path.basename(out || '', '.json').replace(/[-_]/g, ' ');
const exemplar = nearestExemplars(likeText, 1)[0] || null;
const sig = exemplar && exemplar.score > 0 ? exemplarSignature(exemplar.file) : null;

// The flat presets are honest, but a whole film on one is a report-tier finding (beat-check static-bg)
// promoted to a HARD_CODE in author-check. Both branches below pick from a type/exemplar/theme preset
// LIST, so prefer the first entry that actually moves rather than trusting list[0] blindly.
const STATIC_PRESETS = new Set(['plain', 'accentPlain', 'paper', 'dark', 'deep', 'black']);
const firstMoving = (list) => (Array.isArray(list) && list.length ? (list.find((p) => !STATIC_PRESETS.has(p)) ?? list[0]) : null);

// ---- write + report, shared by both branches ---------------------------------------------------------
function writeScaffold(scene, storyboard, logLines) {
  const sbPath = storyboardPathFor(out);
  fs.mkdirSync(path.dirname(path.resolve(ROOT, out)), { recursive: true });
  fs.writeFileSync(path.resolve(ROOT, out), JSON.stringify(scene, null, 1) + '\n');
  fs.writeFileSync(path.resolve(ROOT, sbPath), storyboard);
  for (const l of logLines) console.error(l);
  console.error(`  storyboard: ${sbPath}`);
  console.error(`  Replace every REPLACE:/<fill: ...> marker, then \`make dev D=${out}\`.`);
  if (process.argv.includes('--print-path')) process.stdout.write(out + '\n');
}

// Which CRAFT docs will craft-checklist ask about? Shared by both branches: it runs `loadScene` first
// (core/engine/expand.js), so it sees beats EXPANDED, never the bare `{type:"beat"}` this scaffold
// writes to disk (beat mode), and the continuous-action mode's plain layers need no expansion at all.
function craftLinesFor(scene) {
  const expandedForFeatures = loadScene(JSON.parse(JSON.stringify(scene)));
  const features = computeFeatures(expandedForFeatures);
  const relevantDocs = docRegistry().filter((d) => features[d.appliesWhen] === true);
  return relevantDocs.length
    ? relevantDocs.map((d) => `    ${d.slug}: "REPLACE: ${d.confirm.replace(/"/g, "'")}"`).join('\n')
    : '    (none relevant yet)';
}

if (CONTINUOUS_ACTION) {
  // ==================================================================================================
  // CONTINUOUS ACTION: one object, one track, no transitions (skills/vawe-continuous-action/SKILL.md).
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
  const margin = look?.layout?.margin ?? houseDefault.layout.margin ?? 120;
  const objW = 320, objH = 108;
  const objX = Math.round((CANVAS_W - objW) / 2);
  const objY = 486;

  // The track: `pan` carries the object through its compose phase, `blast` punctuates its resolve into
  // the last state. Welded onto ONE track (`track.mjs`'s own "weld a rider" move, applied to state
  // instead of to a second layer), so the object never needs a cut to change.
  const panDur = +(p2 - p1).toFixed(2);
  const blastDur = +(dur - p2).toFixed(2);
  const panTo = -160;
  const panKeys = SHAPES.pan({ dur: panDur, to: panTo, axis: 'x' });
  // Fold the birth pose (scale/opacity) into pan's own first key, one key at t:0 rather than two, and
  // carry `x` through every blast key: an omitted property RESETS rather than holds (validate.mjs), and
  // the object must not snap back to x:0 while it morphs.
  panKeys[0] = { ...panKeys[0], scale: 0.7, opacity: 0 };
  const blastKeys = SHAPES.blast({ dur: blastDur, peak: 1.22, out: 1.35 })
    .slice(1) // its own t:0 key restates pan's last key; drop the duplicate
    .map((k) => ({ ...k, t: +(k.t + panDur).toFixed(3), x: panTo }));
  const track = [...panKeys, ...blastKeys];

  const heroSize = look?.scale?.hook || 96;
  const hookDur = +(p1 - 0.11).toFixed(2);
  const hook = {
    id: 'hook', type: 'text', text: 'REPLACE: the open-loop question, <=12 words',
    start: 0.11, duration: hookDur,
    x: margin, y: 459, w: CANVAS_W - margin * 2, align: 'left', size: heroSize, weight: 700,
    typing: 33, caret: true, exitDur: 0.2,
    // A tiny keyed rise, not decoration for its own sake: it is what lets a single-object film still
    // clear direction-floor's feature-poverty count (a typed line alone is not read as kinetic type).
    motion: [{ t: 0, y: 6 }, { t: Math.min(0.4, hookDur), y: 0, ease: 'easeOutSine' }],
  };

  const spineLayer = {
    id: 'spine', type: 'html', start: p1, duration: +(dur - p1).toFixed(2),
    x: objX, y: objY, w: objW,
    vars: { '--p': [0, 1] }, varsDelay: panDur, varsDur: Math.min(0.4, blastDur),
    motion: track,
    html: `<div style="width:${objW}px;height:${objH}px;display:flex;align-items:center;justify-content:center">`
      + `<div style="width:calc(${objW}px - var(--p,0) * ${Math.round(objW * 0.55)}px);`
      + `height:calc(${objH}px - var(--p,0) * ${Math.round(objH * 0.4)}px);`
      + `border-radius:calc(18px + var(--p,0) * 200px);background:var(--accent);`
      + `display:flex;align-items:center;justify-content:center">`
      + `<span style="opacity:calc(1 - var(--p,0));color:#fff;font-weight:700;font-size:26px;white-space:nowrap">REPLACE: label</span></div></div>`,
  };

  const payoffDur = Math.min(1.2, +(dur * 0.22).toFixed(2));
  const payoff = {
    id: 'payoff', type: 'text', text: 'REPLACE: the payoff line, or leave it withheld mid-action',
    start: +(dur - payoffDur).toFixed(2), duration: payoffDur,
    x: margin, y: 700, w: CANVAS_W - margin * 2, align: 'center', size: look?.scale?.headline || 64, weight: 400,
    anim: 'fade', enterDur: 0.3,
  };

  const bgPreset = firstMoving(look?.backdrop) || firstMoving(sig?.bgPresets) || firstMoving(spine?.bgPresets) || 'soft';
  const bg = [{ preset: bgPreset, from: 0, to: dur }];

  const scene = {
    module: 'scene',
    theme,
    aspect: '16:9',
    duration: dur,
    energy: 'brand',
    authoring: {
      allow: ['no-transition'],
      _why: { 'no-transition': 'continuous action (skills/vawe-continuous-action/SKILL.md): one object ("spine") crosses the whole film with a hand-keyed track and no beat boundary to cut at. A seam here would break the spine it exists to keep, not earn one.' },
    },
    ...(sig ? { note: `REPLACE: what this film says. Composed to the shape of ${exemplar.file} (${exemplar.register || exemplar.teaches}), study it.` } : {}),
    audio: { auto: true },
    // A slow push, not a static frame behind the object: the FRAME is moving too, one more directed
    // technique a single-object film would otherwise leave unused (direction-floor's feature-poverty).
    cameraMove: { move: 'slowPush' },
    bg,
    layers: [hook, spineLayer, payoff],
  };

  const craftLines = craftLinesFor(scene);

  // Three STATE sections, not four cards: t0 (offscreen/idle) -> composed (the pan phase) -> resolved
  // (the blast/morph). Each must carry `object:`/`becomes:` (storyboard-check's SPINE_MAX_S branch).
  const states = [co.t0, ...co.states, co.last];
  const bounds = [0, p1, p2, dur];
  const stateSection = (label, i) => {
    const isFirst = i === 0, isLast = i === states.length - 1;
    return [
      `## Beat ${i + 1}: ${isFirst ? 'Name' : isLast ? 'Resolve' : 'Compose'} (${bounds[i]}s-${bounds[i + 1]}s)`,
      `- type: ${isFirst ? 'hook' : isLast ? 'payoff_withheld' : 'product_surface'}`,
      `- object: ${label}`,
      `- onscreen: "<fill: the on-screen copy for this beat>"`,
      `- mechanism: hand-keyed motion track (pan then blast, track.mjs), no cut`,
      `- becomes: <fill: the ${i === 0 ? 'bare stage' : 'previous state'} becomes "${label}">`,
      `- why: ${isFirst ? 'open loop, pose the question the last frame answers' : isLast ? 'the press has a consequence, and the consequence is the last thing you see' : 'show the object doing the thing, not a claim about it'}`,
      `- duration: ${(bounds[i + 1] - bounds[i]).toFixed(2)}s`,
      '',
    ].join('\n');
  };

  const storyboard = `---
message: "<fill: the one sentence this video communicates>"
audience: "<fill: who it is for>"
arc: "one continuous action: ${co.object} ${states[states.length - 2] || 'changes'} and becomes ${co.last}"
threads: "a transforming object (below) + a bookend (the hook's open loop, answered or withheld by the payoff)"
object: "${co.object}"
object_t0: "${co.t0}"
object_states: "${co.states.join('; ')}"
object_last: "${co.last}"
format: 1920x1080
theme: "themes/${theme}.json"
duration: ${dur}s
spectacle: "beat ${states.length} (resolve) · the object's morph into its last state · the film's one loud moment"
not: "<fill: the defaults this film refuses, e.g. no centered slide deck, no gradient hero, no Inter>"
craft:
${craftLines}
---

<!-- Generated by \`make scaffold\` (CONTINUOUS ACTION, ${dur}s < ${CONTINUOUS_ACTION_MAX_S}s: skills/vawe-continuous-action/SKILL.md).${sig ? ` Composed to the shape of formats/scene/${exemplar.file} (${exemplar.register || exemplar.teaches}): study it before you replace the copy.` : ''} Replace every \`REPLACE:\`/\`<fill: ...>\` marker, then
     \`make storyboard-check SB=${path.relative(ROOT, storyboardPathFor(out))}\` and \`make author-check D=${path.relative(ROOT, out)}\`. -->

${states.map(stateSection).join('\n')}`;

  writeScaffold(scene, storyboard, [
    `✓ scaffold: CONTINUOUS ACTION, one object ("${co.object}") across ${dur}s -> ${out}`,
    `  ${dur}s < CONTINUOUS_ACTION_MAX_S (${CONTINUOUS_ACTION_MAX_S}s): skills/vawe-continuous-action/SKILL.md, not the beat rotation.`,
    ...(look ? [`  theme "${theme}" carries a look: bg/scale above are the brand's own, not guessed.`] : []),
    ...(typeArg ? [`  TYPE=${typeArg} spine: skills/vawe-type-${typeArg}/SKILL.md carries this type's rules and worked example.`] : []),
    ...(sig ? [`  composed to the shape of ${exemplar.file} (${exemplar.register || exemplar.teaches}): study formats/scene/${exemplar.file}.`] : []),
  ]);
} else {
  // ==================================================================================================
  // BEAT ROTATION: dur >= CONTINUOUS_ACTION_MAX_S, a film with real room for chapters.
  // ==================================================================================================

  // The same floor as direction-floor.mjs `sparse-beats`: a boundary roughly every 3.5s past 8s.
  const needed = dur >= 8 ? Math.ceil(dur / 3.5) : 2;
  const total = Math.max(beatsWanted || 0, needed, 2);

  // The middle rotation: directed blueprints that need no captured asset (no `image`/`src` to invent),
  // so the scaffold never ships a layer pointing at a file that does not exist. `statReveal` is held out
  // of the rotation and reserved for the payoff slot; screenDive/logoLockup belong once the author has a
  // real asset, swap one into the rotation then.
  const MIDDLE = ['cardCascade', 'wordBlast', 'chipGrid'];

  // `--type` composes from the fixed spine in type-spines.mjs instead of the generic rotation: a launch
  // film is built differently from an explainer, and a rotation cannot tell the two apart. The spine's
  // beat COUNT wins over `--beats`/the sparse-beats floor, because the spine already IS a considered
  // beat count for that type; `--dur` still only changes how long each beat gets.
  let names, payoffIdx;
  if (spine) {
    names = spine.beats.slice();
    // the payoff is the beat right before the close, same convention as the generic rotation.
    payoffIdx = names.length >= 2 ? names.length - 2 : -1;
  } else {
    // Build the beat sequence: kineticHook opens, ctaEnd closes, the payoff (last middle slot, index
    // `payoffIdx`) is always statReveal so `spectacle:` in the storyboard has somewhere real to point.
    names = ['kineticHook'];
    const midCount = total - 2;
    payoffIdx = midCount > 0 ? midCount : -1; // index within `names` once kineticHook (index 0) is prepended
    for (let i = 0; i < midCount; i++) {
      if (i === midCount - 1) { names.push('statReveal'); continue; }
      // rotate, never repeating the previous name
      let pick = MIDDLE[i % MIDDLE.length];
      if (pick === names[names.length - 1]) pick = MIDDLE[(i + 1) % MIDDLE.length];
      names.push(pick);
    }
    names.push('ctaEnd');
  }

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

  // look.scale.body / look.scale.caption -> the rest of the beat library's own heroSize/bodySize/
  // captionSize kwargs (blueprints/beats.mjs, beats-punct.mjs, beats-mined.mjs), the same shape of
  // change as look.scale.hook/.headline above (docs/CRAFT/THEME-LOOK.md "Left undone" note, W8's
  // second half). Each factory keeps its own hardcoded default when the theme carries no scale.
  const bodyKw = (key) => (look?.scale?.body ? { [key]: look.scale.body } : {});
  const captionKw = (key) => (look?.scale?.caption ? { [key]: look.scale.caption } : {});

  function propsFor(name, span, isPayoff) {
    switch (name) {
      case 'kineticHook':
        // look.scale.hook -> kineticHook's own heroSize (blueprints/beats.mjs), so the theme's hook
        // scale is real without every existing kineticHook call needing to change.
        return { eyebrow: 'REPLACE: the open-loop question', to: 94, unit: '%', sub: 'REPLACE: the second cue, revealed later',
          ...(look?.scale?.hook ? { heroSize: look.scale.hook } : {}), ...captionKw('captionSize') };
      case 'statReveal':
        // look.scale.headline -> statReveal's heroSize: the payoff's hero count reads as the film's
        // headline moment, so it takes the headline step of the scale, not the hook step.
        return { to: 3, prefix: '', unit: 'x', label: isPayoff ? 'REPLACE: the shocker payoff line' : 'REPLACE: a mid-film stat',
          ...(look?.scale?.headline ? { heroSize: look.scale.headline } : {}), ...captionKw('captionSize') };
      case 'cardCascade':
        return { title: 'REPLACE: feature grid title', cards: CARDS, ...bodyKw('heroSize') };
      case 'wordBlast':
        return { text: 'REPLACE', ...bodyKw('bodySize') };
      case 'chipGrid':
        return { title: 'REPLACE: named things title', chips: CHIPS, footer: 'REPLACE: accent footer line',
          ...bodyKw('bodySize'), ...captionKw('captionSize') };
      case 'ctaEnd':
        return { command: 'REPLACE install command', sub: 'REPLACE: one-line sub', url: 'REPLACE.dev' };
      // The type spines below reach for beats the generic rotation avoids because they need a real
      // asset. `--type` accepts that: it names the field the author must fill (`image`/`mark`), same
      // REPLACE convention as CARDS/CHIPS above, never a path to a file that happens to exist.
      case 'screenDive':
        return { title: 'REPLACE: what this screen does', image: 'REPLACE: assets/brands/<name>/stills/<shot>.png', ...captionKw('captionSize') };
      case 'logoLockup':
        return { mark: 'REPLACE: assets/brands/<name>/mark.svg', wordmark: 'REPLACE: assets/brands/<name>/wordmark.svg', headline: 'REPLACE: brand line',
          ...bodyKw('bodySize'), ...captionKw('captionSize') };
      case 'logoReveal':
        return { mark: 'REPLACE: <svg d path>', viewBox: '0 0 100 100', wordmark: 'REPLACE: brand name',
          ...bodyKw('bodySize'), ...captionKw('captionSize') };
      case 'verdictProof':
        return { command: 'REPLACE: the command', note: 'REPLACE: what it proves', verdict: 'REPLACE', tone: 'ok',
          ...bodyKw('bodySize'), ...captionKw('captionSize') };
      case 'recordedPan':
        // No text of its own (a bare surface + caller-supplied riders), so no scale.body/.caption kwarg:
        // there is nothing here for a theme's type scale to reach (docs/CRAFT/THEME-LOOK.md).
        return { image: 'REPLACE: assets/brands/<name>/stills/<shot>.png' };
      case 'terminalReveal':
        return { title: 'REPLACE: what this shows', command: 'REPLACE: the command', output: ['REPLACE: output line'],
          ...bodyKw('bodySize'), ...captionKw('captionSize') };
      case 'containerFill':
        return { items: CHIPS, ...bodyKw('itemSize') };
      case 'listBuildRows':
        return { items: ['REPLACE: row one', 'REPLACE: row two', 'REPLACE: row three'], ...bodyKw('size') };
      case 'blurResolveHook':
        return { text: 'REPLACE: the hook line' };
      default:
        return {};
    }
  }

  // look.layout -> x/w on every beat whose blueprint accepts a generic x/w (all of them except the three
  // that name their own mark*/word* slots instead: logoLockup, ctaEnd, logoReveal). `margin` is the
  // shared left/right inset at the scaffold's fixed 1920px 16:9 width; `anchor` is published on the
  // theme for a hand-authored fragment or a future consumer to read, not yet turned into an `align` here.
  const LAYOUT_OPT_OUT = new Set(['logoLockup', 'ctaEnd', 'logoReveal']);
  function layoutFor(name) {
    if (!look?.layout || LAYOUT_OPT_OUT.has(name)) return {};
    const margin = look.layout.margin ?? houseDefault.layout.margin;
    return { x: margin, w: CANVAS_W - margin * 2 };
  }

  const layers = spans.map((s, i) => ({
    type: 'beat',
    beat: s.name,
    start: s.start,
    dur: s.dur,
    ...layoutFor(s.name),
    ...propsFor(s.name, s, i === payoffIdx),
  }));

  // Nothing arrives on frame one. A layer whose entrance starts at t=0 is already fully on screen at the
  // first rendered frame, so there is no arrival to see, it reads as a jump-cut rather than an entrance.
  // Push the hook beat's start by 0.2s and shrink it by the same amount so it still ends exactly where the
  // next beat begins (the tiling above has no gaps or overlaps, and this must not reopen one). 0.2s sits
  // inside docs/RULES/first-arrival.md's own 0.1-0.3s window, so the two are already reconciled: this is
  // the delay that doc asks for, not a second number competing with it.
  //
  // THE HOOK-REGISTER BEATS ARE THE EXCEPTION, not an oversight. kineticHook/blurResolveHook/wordWipe/
  // dialogueAccumulate each already put something on screen at their OWN start:0 (a ramp: a fade,
  // blur-resolve, or in-motion sweep), because they are built to open a film with no prior beat to have
  // registered first. Pushing THEIR start by another 0.2s does not add a ramp, it inserts a true empty
  // hold in front of a beat that was already correct, which is the exact failure first-arrival.md warns
  // against, just introduced by this scaffold instead of by hand. So the offset applies to every OTHER
  // beat that lands first, and skips these four.
  const HOOK_BEATS = new Set(['kineticHook', 'blurResolveHook', 'wordWipe', 'dialogueAccumulate']);
  const FIRST_ARRIVAL_OFFSET = 0.2;
  if (layers[0] && !HOOK_BEATS.has(layers[0].beat) && layers[0].dur > FIRST_ARRIVAL_OFFSET) {
    layers[0].start = +(layers[0].start + FIRST_ARRIVAL_OFFSET).toFixed(2);
    layers[0].dur = +(layers[0].dur - FIRST_ARRIVAL_OFFSET).toFixed(2);
  }

  // THE CONTINUOUS OBJECT, emitted by default. One accent element that spans EVERY cut, so the film reads
  // as one piece and not a stack of independent beats. This is the single thing that most separates a
  // directed film from a slideshow, and it is the one the old scaffold waived instead of writing. Replace
  // it with your own motif (a mark that travels, a UI object that persists and changes, a rule under the
  // operative word), but do NOT delete it: a film with nothing continuous is a slideshow, and
  // `no-continuous-object` will say so. It travels on a hand-keyed track, so it also seeds authored motion.
  //
  // y:1010, NOT the text band. It used to sit at y:900, close enough to the sub/label lines several
  // blueprints place around y:700-900 (kineticHook's `sub`, statReveal's `label`, chipGrid's `footer`)
  // that it read as an underline under whichever one landed nearby, an accident of two unrelated
  // elements sharing a row rather than an authored choice. 1010 sits in the lower safe margin
  // (`MARGIN` in core/layout/safe.js, 0.06 of 1080 = 65px, so the safe edge is 1015) below every
  // blueprint's default text band, so it reads as its own accent rather than punctuation for a line
  // above it.
  layers.push({
    type: 'rect',
    w: 140, h: 6, radius: 3,
    x: 160, y: 1010,
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
  // theme.look.cuts wins over the TYPE spine, which wins over the generic default: the brand's own cut
  // family is a fixed fact about the brand, the type spine only a fact about the kind of film.
  const cutFamily = look?.cuts ? look.cuts : spine ? spine.cutFamily : houseDefault.cuts;
  const transitions = [];
  for (let i = 1; i < spans.length; i++) {
    const at = spans[i].start;
    const accent = i === payoffIdx; // the boundary INTO the payoff beat
    transitions.push({ at, fx: accent ? cutFamily.accent : cutFamily.default, dur: accent ? 0.6 : 0.5 });
  }

  // ---- bg: the backdrop turns, and the theme (or the exemplar, or the type spine) sets HOW MUCH -------
  // CLAUDE.md's strongest single lever: 82% of the library paints one window for the whole runtime;
  // brew inverts the world on four of its five cuts. theme.look.backdrop wins first: it is the brand's
  // own fixed rotation (W8), a fact about THIS theme rather than a guess at what one exemplar or one
  // type generally does. Falling short of that, an exemplar in hand mirrors its backdrop RHYTHM: one
  // junction-bound window per beat (no from/to, so the cuts already written own the numbers,
  // core/timeline/junctions.js), cycling the exemplar's own presets so each cut turns the world the way that film
  // does. A named `--type` cycles its own preset list the same way, since the type IS the taste anchor
  // when no exemplar was asked for. With none of the three, fall back to the two-window default.
  let bg;
  if (look?.backdrop && look.backdrop.length) {
    bg = spans.map((_, i) => ({ preset: look.backdrop[i % look.backdrop.length] }));
  } else if (sig && sig.bgPresets.length) {
    bg = spans.map((_, i) => ({ preset: sig.bgPresets[i % sig.bgPresets.length] }));
  } else if (spine) {
    bg = spans.map((_, i) => ({ preset: spine.bgPresets[i % spine.bgPresets.length] }));
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
    // Stated, never defaulted: a scene with no `aspect` renders 9:16 in silence (core/engine/boot.js), and the
    // storyboard this scaffold writes says 1920x1080. The two must agree (MISTAKES #569).
    aspect: '16:9',
    duration: dur,
    energy: 'brand',
    // A type spine may carry a reasoned waiver for a floor its own pace legitimately crosses (the
    // explainer's held band vs sparse-beats). Written by the spine, once, so the decision travels with
    // every scaffold of that type instead of being rediscovered after a render.
    ...(spine && spine.waive ? { authoring: { allow: Object.keys(spine.waive), _why: spine.waive } } : {}),
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
      // THE PER-SCENE CONTRACT: only meaningful if a per-scene fan-out is actually happening (`make
      // scenes`), so left as an unfilled marker rather than a guessed value. scripts/lib/contract.mjs
      // chainErrors refuses to run `make scenes`/`make assemble` until every beat's object_in matches the
      // beat before it's object_out. Delete both lines if this film carries no continuous object.
      `- object_in: "<fill: <placement>@<w>x<h>, e.g. bottom-left@120x40, must equal the beat before's object_out>"`,
      `- object_out: "<fill: <placement>@<w>x<h>, what this beat hands to the next one>"`,
      // THE MOTION PLAN (scripts/lib/contract.mjs parseMotion): what ELSE moves in this beat, beyond the
      // one continuous object above. Same convention as object_in/out: an unfilled marker, never a
      // guessed value, and delete the line entirely if nothing but the continuous object moves here.
      `- motion: "<fill: <selector>@<kind>:<band>, e.g. [data-part=\\"headline\\"]@slide-left:energy>"`,
      `- why: ${why}`,
      `- duration: ${s.dur}s`,
      '',
    ].join('\n');
  }

  const craftLines = craftLinesFor(scene);
  const specIdx = payoffIdx >= 0 ? payoffIdx : 0; // no dedicated payoff slot on a 2-beat film: spectacle is the hook's count-up

  const storyboard = `---
message: "<fill: the one sentence this video communicates>"
audience: "<fill: who it is for>"
arc: "hook -> build -> proof -> payoff -> CTA"
format: 1920x1080
theme: "themes/${theme}.json"
duration: ${dur}s
threads: "a CONTINUOUS OBJECT (the accent element the scaffold emits, spanning every cut on a hand-keyed track, sitting at y:1010 in the lower safe margin so it never underlines a beat's own text, REPLACE it with your real motif but keep something continuous) + a bookend (the hook's open loop, answered by the payoff)"
spectacle: "beat ${specIdx + 1} (${names[specIdx]}) · the hero count-up · the number carries the film's one loud moment"
not: "<fill: the defaults this film refuses, e.g. no centered slide deck, no gradient hero, no Inter>"
craft:
${craftLines}
---

<!-- Generated by \`make scaffold\` (BEAT ROTATION, ${dur}s >= ${CONTINUOUS_ACTION_MAX_S}s).${sig ? ` Composed to the shape of formats/scene/${exemplar.file} (${exemplar.register || exemplar.teaches}): study it before you replace the copy.` : ''} Replace every \`REPLACE:\`/\`<fill: ...>\` marker, then
     \`make storyboard-check SB=${path.relative(ROOT, storyboardPathFor(out))}\` and \`make author-check D=${path.relative(ROOT, out)}\`. -->

${spans.map(beatSection).join('\n')}`;

  writeScaffold(scene, storyboard, [
    `✓ scaffold: ${names.length} beats (${names.join(' -> ')}) across ${dur}s -> ${out}`,
    ...(look ? [`  theme "${theme}" carries a look: bg/cuts/scale/layout above are the brand's own, not guessed.`] : []),
    ...(typeArg ? [`  TYPE=${typeArg} spine: skills/vawe-type-${typeArg}/SKILL.md carries this type's rules and worked example.`] : []),
    ...(sig ? [`  composed to the shape of ${exemplar.file} (${exemplar.register || exemplar.teaches}): ${bg.length} bg windows turn the world. STUDY formats/scene/${exemplar.file}.`]
      : (!spine ? [`  no exemplar matched "${likeText.trim()}"; used the two-window default. Pass --like "<brief>" to compose from the nearest proven film.`] : [])),
  ]);
}
