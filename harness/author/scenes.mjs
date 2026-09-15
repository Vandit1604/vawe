// scenes.mjs: `make scenes D=<film>`: THE FAN-OUT. PRINTS one agent brief per scene: the kit block,
// that scene's contract, its exact copy, the anti-slop rules, and the one verify command. It launches
// NOTHING: engine-doctrine/CRAFT/SUBAGENT-BUDGET.md is the reason (fewer, larger agents; a fan-out's cost is a
// deliberate human choice, never a default). The owner reads the briefs and decides whether to spend
// the tokens a real fan-out costs.
//
// Refuses to print anything if the storyboard's continuous-object contract does not chain
// (harness/lib/contract.mjs), because a broken contract handed to three parallel agents is three
// disagreeing instructions, not three that will assemble into one film.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storyboardPathFor } from '../../quality/gates/craft-checklist.mjs';
import { parseStoryboard, timeline } from './storyboard-parse.mjs';
import { chainErrors, parseMotion, motionErrors, parseEdge } from '../lib/contract.mjs';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/color/engine.js';
import { buildKit } from '../lib/stagekit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const film = process.argv[2];
if (!film || !fs.existsSync(film)) { console.error('usage: node harness/author/scenes.mjs <film.json>'); process.exit(1); }

const scene = JSON.parse(fs.readFileSync(film, 'utf8'));
const sbPath = storyboardPathFor(film);
if (!fs.existsSync(sbPath)) { console.error(`scenes: no storyboard at ${sbPath} (run \`make scaffold\` first, fill it, then \`make contract D=${film}\`)`); process.exit(1); }
const sb = parseStoryboard(fs.readFileSync(sbPath, 'utf8'));
const { beats } = timeline(sb);

const errs = chainErrors(beats);
if (errs.length) {
  console.error(`scenes: the continuous-object contract does not chain. Fix the storyboard first (\`make contract D=${film}\`):`);
  for (const e of errs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
const mErrs = motionErrors(beats);
if (mErrs.length) {
  console.error(`scenes: the motion plan does not parse. Fix the storyboard first (\`make contract D=${film}\`):`);
  for (const e of mErrs) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const themeName = typeof scene.theme === 'string' ? scene.theme : (scene.theme && scene.theme.name) || 'default';
const themeFile = typeof scene.theme === 'object' ? null : path.join(ROOT, 'themes', `${themeName}.json`);
const theme = themeFile ? JSON.parse(fs.readFileSync(themeFile, 'utf8')) : scene.theme;
const { block: kitBlock } = buildKit(theme, resolveLook, isLightBg);
const kitPath = film.replace(/\.json$/, '') + '.kit.css';
const base = path.basename(film, '.json');
const dir = path.dirname(film);

const ANTI_SLOP = [
  'No centered text as the default layout; no Inter/Space Grotesk; no blue/purple gradient hero; no equal card grid.',
  'One art direction, named in your own head before you write a div. Reflect the theme, do not invent a fresh one.',
  'CSS only for what CSS already does. No CSS animation/transition/opacity/filter (the engine owns the clock).',
  'The kit block below is BYTE-IDENTICAL across every scene in this film. Paste it, do not edit it.',
];

console.log(`scenes · ${beats.length} scene(s) for ${film}\n`);
console.log('These briefs are for a real per-scene agent (Agent tool, one per scene, launched in parallel).');
console.log('Nothing is launched by this command. engine-doctrine/CRAFT/SUBAGENT-BUDGET.md before you spend the tokens.\n');

beats.forEach((b, i) => {
  const n = i + 1;
  const fragPath = path.join(dir, `${base}.scene${n}.html`);
  console.log('═'.repeat(78));
  console.log(`SCENE ${n}/${beats.length}: ${b.name}  (${b.start}s–${b.end}s)`);
  console.log('═'.repeat(78));
  console.log(`Write: ${path.relative(ROOT, fragPath)}`);
  console.log(`Kit:   paste ${path.relative(ROOT, kitPath)}'s block verbatim at the top (regenerate: node harness/author/stagekit.mjs ${film})`);
  console.log(`Copy (exact words, do not paraphrase): ${b.onscreen.length ? b.onscreen.map((l) => JSON.stringify(l)).join(' / ') : '(none stated: REPLACE the storyboard\'s onscreen: line first)'}`);
  if (b.object_in || b.object_out) {
    // WHAT THE OBJECT DOES, not only that it exists. `make assemble` draws the object itself; what the
    // fragment author needs is what NOT to draw there (its own copy of the object) and what its pose is
    // doing across the beat, because a size/rotation/opacity change is exactly the kind of thing an
    // agent invents its own version of if nobody tells it one is already coming.
    const edgeIn = parseEdge(b.object_in), edgeOut = parseEdge(b.object_out);
    console.log(`Continuous object arrives at: ${b.object_in || '(unset)'}   leaves at: ${b.object_out || '(unset)'}`);
    if (edgeIn && edgeOut && !edgeIn.error && !edgeOut.error) {
      const does = [];
      if (edgeIn.w !== edgeOut.w || edgeIn.h !== edgeOut.h) does.push(`resizes ${edgeIn.w}x${edgeIn.h} → ${edgeOut.w}x${edgeOut.h}`);
      if (edgeIn.rot !== edgeOut.rot) does.push(`rotates ${edgeIn.rot}deg → ${edgeOut.rot}deg`);
      if (edgeIn.opacity !== edgeOut.opacity) does.push(`fades ${edgeIn.opacity} → ${edgeOut.opacity} opacity`);
      if (edgeIn.placement !== edgeOut.placement) does.push(`travels ${edgeIn.placement} → ${edgeOut.placement}`);
      console.log(`  It ${does.length ? does.join(', while it ') : 'holds still'} across this beat. Do not draw your own copy of it; leave it room.`);
    }
    console.log(`  (the object itself is drawn by \`make assemble\`, not by this fragment: the fragment is everything ELSE in the beat)`);
  }
  // THE MOTION PLAN, read BEFORE the markup is written, not discovered after: `make assemble` wires
  // each entry's <selector> into a `parts[].select`, so an element the fragment never gives that
  // selector to (a class, or a `data-part` attribute) is a plan the assembled film cannot reach.
  const motion = parseMotion(b.motion);
  if (motion.length) {
    console.log('MUST BE ADDRESSABLE (give each of these elements the exact selector below, e.g. a `data-part` attribute or a class):');
    for (const m of motion) console.log(`  - ${m.selector}  →  ${m.kind} (${m.inBand}${m.outBand !== m.inBand ? ' in / ' + m.outBand + ' out' : ''})`);
    console.log('  (the entrance/exit itself is keyed by `make assemble`, not by CSS in this fragment: see AGENTS.md, no CSS animation/transition here)');
  }
  console.log('Anti-slop:');
  for (const r of ANTI_SLOP) console.log(`  - ${r}`);
  console.log(`Verify: make preview HTML=${path.relative(ROOT, fragPath)} THEME=${themeName}`);
  console.log('');
});

console.log('Kit block to hand every agent:\n');
console.log(kitBlock);
console.log(`\nWhen every fragment is written: node harness/author/stagekit.mjs ${film} --check   (byte-identity)`);
console.log(`Then: make assemble D=${film}`);
