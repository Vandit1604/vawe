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
// 0.66, this library measures 0.02 (engine-doctrine/RESEARCH). Films read as slideshows because a beat's move
// ENDS rather than sustains. A beat with real duration, a real subject, and no `move:`/`motion:` field
// is exactly that hole, and it is checkable from the storyboard alone, before a single layer exists.
//
// THE FIX IS OVERLAP, NEVER AMBIENT MOTION. A still hold is fixed by something arriving or changing
// during it (a second element, content inside the held layer, the next reveal starting early), never
// by idling the held layer itself (`hold:`, `breathe`, `drift`, an arc) and never by a camera move.
// This hook only names the gap; `make arsenal Q=` finds the actual device.
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
// GROUPS/usedNames/pasteLine/tokenGroupsOf/bestWindowMatch: the SAME corpus and the SAME windowed
// match `make stage`'s adoption block uses (harness/author/discovery.mjs, quality/gates/stage.mjs), so
// a beat nudged here and a film audited there never disagree about what counts as a match.
import { GROUPS, usedNames, pasteLine, ambiguousNames, tokenGroupsOf, bestWindowMatch } from '../author/discovery.mjs';
import { coverageIn, CONFIDENT } from '../author/arsenal.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// Only used to dedupe: whatever shape/curve would be the obvious ambient pick for a still beat is
// kept out of the corpus-wide push too, so that push never quietly re-offers the same idle motion
// under a different name. The fix for a still hold is overlap, never this; nothing below prints it.
function bestShape() {
  if (CURVE_NAMES.length) return { name: CURVE_NAMES.includes('arc') ? 'arc' : CURVE_NAMES[0], path: true };
  const names = Object.keys(SHAPES);
  return { name: names.includes('pan') ? 'pan' : names[0], path: false };
}

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

// A CORPUS-WIDE PUSH, not just the sustained-motion one above: `move:`/`recipe:` are two of 62 kinds,
// and an author who never suspects a capability exists cannot search for it (`make arsenal` is
// on-demand; this fires at the one moment a gap is provably visible, the beat's own prose already
// describing it). Built once per save, not per beat: the corpus and its idf weighting are a property
// of the whole engine, never of one beat.
// Camera is excluded outright: the owner rule for this hook is nudge, never prescribe a camera move,
// so the corpus-wide push must never surface one, no matter how well a beat's prose matches it.
let CORPUS = null;
function corpus() {
  if (!CORPUS) {
    const all = GROUPS.filter(([group]) => group !== 'camera').flatMap(([, entries]) => entries());
    CORPUS = { all, coverage: coverageIn(all), ambiguous: ambiguousNames(all) };
  }
  return CORPUS;
}

/** capabilityCandidates(sb, sbSrc, skip) -> up to 2 {beat, name, kind, blurb, line}, one per beat, the
 * single best-matching capability this film has not already reached for anywhere (dedicated field or a
 * real `use:` line), confident past arsenal's own CONFIDENT on that beat's own prose. `skip` is the set
 * of `kind:name` keys another nudge in this same save already covers, so nothing is said twice. */
function capabilityCandidates(sb, sbSrc, skip) {
  const { all, coverage, ambiguous } = corpus();
  const isUsed = usedNames(sbSrc, sb.beats);
  const remaining = all.filter((e) => !isUsed(e) && !skip.has(`${e.kind}:${e.name}`));
  const perBeat = sb.beats.map((b) => {
    const tokenGroups = tokenGroupsOf(b);
    if (!tokenGroups.length) return null;
    // A beat carrying only a couple of common words ("nothing to hold onto") is not a real
    // subject, it is the ABSENCE of one; at that size ordinary words collide with unrelated
    // blurbs (measured: "hold"+"onto" clears CONFIDENT against a camera move and a cursor
    // layer alike). Below this floor there is no real subject to match against, so stay silent.
    if (tokenGroups.reduce((n, g) => n + g.length, 0) < 4) return null;
    let best = null;
    for (const e of remaining) {
      const m = bestWindowMatch(e, tokenGroups, coverage);
      if (m.s > 0 && m.c >= CONFIDENT && (!best || m.c > best.m.c)) best = { e, m };
    }
    return best && { beat: b, entry: best.e, line: pasteLine(best.e, ambiguous), c: best.m.c };
  }).filter(Boolean);
  // One capability said once: two beats independently matching the same effect keep only the
  // stronger beat, the same "never twice" rule `skip` enforces against the OTHER nudge above.
  const seen = new Set();
  const deduped = perBeat.sort((a, b) => b.c - a.c).filter((c) => {
    const key = `${c.entry.kind}:${c.entry.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.slice(0, 2);
}

/** alreadyNudgedKeys(found, seams) -> the `kind:name` keys the move-shape and seam-recipe nudges above
 * already cover, so the corpus-wide push never repeats either as a "new" find. */
function alreadyNudgedKeys(found, seams) {
  const keys = new Set();
  if (found.length) {
    const shape = bestShape();
    keys.add(`${shape.path ? 'path curve' : 'move shape'}:${shape.name}`);
  }
  const seamEntry = Object.entries(RECIPES).find(([, r]) => r.kind === 'seam');
  if (seams.length && seamEntry) keys.add(`recipe:${seamEntry[0]}`);
  return keys;
}

/** capabilityLines(capFound) -> the print lines for the corpus-wide push, one block per beat. */
function capabilityLines(capFound) {
  const lines = [];
  for (const { beat, entry, line } of capFound) {
    lines.push(`  "${beat.name}" reads like it wants ${entry.kind} \`${entry.name}\`, which this film has`);
    lines.push(`  not reached for yet. Add: \`${line}\`.`);
    if (entry.blurb) lines.push(`  ${entry.blurb}`);
  }
  return lines;
}

function say(rel, file) {
  const raw = fs.readFileSync(file, 'utf8');
  const sb = parseStoryboard(raw);
  if (!sb.beats.length) return [];
  const found = candidates(sb);
  const seams = seamCandidates(sb);
  const capFound = capabilityCandidates(sb, raw, alreadyNudgedKeys(found, seams));
  if (!found.length && !seams.length && !capFound.length) return [];

  const lines = [];
  if (found.length) {
    for (const { b, dur } of found) {
      lines.push(`  "${b.name}" (${dur.toFixed(1)}s) lands and then nothing changes.`);
      lines.push(`  Name what arrives during the hold: a second element, content inside the`);
      lines.push(`  card, or start the next reveal before this one lands. Ambient motion does`);
      lines.push(`  not count.`);
    }
    lines.push(`  \`make arsenal Q="staggered entrance"\` finds the overlap devices that fit,`);
    lines.push(`  never a camera move and never ambient motion.`);
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
  lines.push(...capabilityLines(capFound));
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
