#!/usr/bin/env node
// harness/live/beat-surfacer.mjs - PUSH the one rich capability a just-saved beat did not reach for.
//
// WHY. `make arsenal Q=` answers on demand, and on-demand discovery only fires for an author who
// already suspects the capability exists. The registry holds 815 entries across 61 kinds; `make
// coverage` counts 91 schema props no scene has ever set. This hook is the fix at the moment it is
// still cheap to act on: the beat table decides how many fragments exist and what moves BEFORE any
// JSON is written (AGENTS.md, deciders: storyboard 1, scene 3, motion 4), so the storyboard save is
// the earliest point a gap is even visible.
//
// WHY THIS ONE SIGNAL. The owner's measured complaint: reference films hold a local-motion median of
// 0.66, this library measures 0.02 (docs/RESEARCH). Films read as slideshows because a beat's move
// ENDS rather than sustains. A beat with real duration, a real subject, and no `move:`/`motion:` field
// is exactly that hole, and it is checkable from the storyboard alone, before a single layer exists.
//
// DEGRADES GRACEFULLY. If `core/motion/path-curves.js` registers no curve (checked
// live below, never hand-listed): a separate agent is adding one. Until it lands this names the
// richest shape actually in SHAPES today (`pan`); the day a `*path*` shape appears, this starts naming
// it instead, with no edit here.
//
// THE CONTRACT, same as craft-live.mjs and stage-say.mjs: silent on a fine beat, never blocks (exit 2
// only carries a message), and speaks about what THIS save wrote, never a generic tip.
import fs from 'node:fs';
import path from 'node:path';
import { parseStoryboard, timeline } from '../author/storyboard-parse.mjs';
import { SHAPES } from '../../core/motion/shapes.js';
import { CURVE_NAMES } from '../../core/motion/path-curves.js';
import { SPEED_BAND } from '../lib/contract.mjs';
import { RECIPES } from '../../recipes/index.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// The one shape worth reaching for when nothing moves after the entrance: a `*path*` shape flies the
// layer instead of parking it, and is named the instant one is registered; `pan` is the next-richest
// shape SHAPES carries today (a multi-key travel, not a fade).
// A path curve wins outright when one is registered: it defaults its duration to the layer's own span,
// so it is sustained motion by construction, while a SHAPES track ends when its keys run out. `arc` is
// the plainest of the four and the safest thing to put in front of an author who asked for nothing.
function bestShape() {
  if (CURVE_NAMES.length) return { name: CURVE_NAMES.includes('arc') ? 'arc' : CURVE_NAMES[0], path: true };
  const names = Object.keys(SHAPES);
  return { name: names.includes('pan') ? 'pan' : names[0], path: false };
}

const bandFor = (weight) => (weight === 'peak' ? 'cinematic' : weight === 'quiet' ? 'energy' : 'professional');

/** Beats worth a nudge: real duration, a real subject, and no move/motion field already spoken for. */
function candidates(sb) {
  const { beats } = timeline(sb);
  return beats
    .filter((b) => !b.move && !b.motion)
    .filter((b) => b.object || b.picture || b.blueprint)
    .map((b) => ({ b, dur: (b.end ?? 0) - (b.start ?? 0) }))
    .filter((c) => c.dur >= 2.2)
    .sort((x, y) => y.dur - x.dur)
    .slice(0, 2);
}

// A beat's `mechanism:`/`becomes:` describing a boundary with NO CUT is exactly a recipe seam's job
// (recipes/README.md, `kind: "seam"`), and an author has no reason to know one exists unless it is
// named here, the same PUSH this file already does for a still beat. Presence only, never a match on
// which recipe fits best: one seam recipe exists today, so naming the first IS naming the only one.
const BOUNDARY_RE = /\b(exits?|leaves?|arrives?|no cut|crossfades?)\b/i;

/** Beats describing a cut-free boundary with no `recipe:` already named. */
function seamCandidates(sb) {
  return sb.beats.filter((b) => !b.recipe && (BOUNDARY_RE.test(b.mechanism || '') || BOUNDARY_RE.test(b.becomes || '')));
}

function say(rel, file) {
  const raw = fs.readFileSync(file, 'utf8');
  const sb = parseStoryboard(raw);
  if (!sb.beats.length) return [];
  const found = candidates(sb);
  const seams = seamCandidates(sb);
  if (!found.length && !seams.length) return [];

  const film = rel.replace(/\.storyboard\.md$/, '.json');
  const lines = [];
  if (found.length) {
    const { name: shape, path: usesPath } = bestShape();
    for (const { b, dur } of found) {
      const raw = b.object || b.picture || b.blueprint;
      const subject = raw.length > 60 ? `${raw.slice(0, 57)}...` : raw;
      const band = bandFor(b.weight);
      lines.push(`  "${b.name}" (${dur.toFixed(1)}s) holds "${subject}" and names no \`move:\` or \`motion:\` -`);
      lines.push(`  it lands its entrance and then sits still for the rest of the beat. Add this line to`);
      lines.push(`  the beat: \`move: ${shape}:${band}\`.${usesPath
        ? ' It flies the layer along a path for the whole beat, sustained motion by construction.'
        : ` core/motion/path-curves.js registers no curve; \`${shape}\` is the richest sustained track`
          + ` core/motion/shapes.js carries today.`}`);
    }
    lines.push(`  \`move:\` reads any of four scopes off its own shape: \`<curve>:<band>\` flies the whole`);
    lines.push(`  layer along a path, \`<shape>:<band>\` keys a layer track, \`<selector>@<kind>:<band>\` staggers`);
    lines.push(`  parts inside one fragment, \`hold:<idle>\` breathes or drifts a still object. Or pick one by`);
    lines.push(`  eye in \`make studio D=${film}\`, which writes the key for you as you drag.`);
  }
  const seam = Object.entries(RECIPES).find(([, r]) => r.kind === 'seam');
  if (seams.length && seam) {
    const [name, r] = seam;
    const src = r.sources[0];
    for (const b of seams) {
      const said = b.mechanism || b.becomes;
      lines.push(`  "${b.name}": "${said}" describes a boundary with no cut and names no \`recipe:\` -`);
      lines.push(`  recipes/README.md already measures this move off a real film. Add: \`recipe: ${name}`);
      lines.push(`  out=<fill: outgoing layer id> in=<fill: incoming layer id> axis=x\`.`);
      lines.push(`  ${r.blurb} (${src.ref}@${src.t}s).`);
    }
  }
  return lines;
}

let raw = '';
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let file;
  try { file = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch { process.exit(0); }
  if (!file) process.exit(0);
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..')) process.exit(0);
  if (!rel.startsWith('formats/scene/') || !rel.endsWith('.storyboard.md')) process.exit(0);
  if (path.basename(rel).startsWith('_')) process.exit(0);   // scratch fixture, never a film
  if (!fs.existsSync(file)) process.exit(0);

  let out;
  try { out = say(rel, file); } catch { process.exit(0); }   // mid-edit or unparsable, not a finding
  if (!out.length) process.exit(0);

  console.error(`${path.basename(rel)}\n${out.join('\n')}\n`
    + `  Nothing here blocks. \`make arsenal Q="sustained motion"\` finds the rest by hand.`);
  process.exit(2);
});
