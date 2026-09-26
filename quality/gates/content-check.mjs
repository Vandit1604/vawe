#!/usr/bin/env node
// quality/gates/content-check.mjs: is a film's CONTENT as rich as the reference it studied, per ACT?
//
//   make content-check D=films/scene/<film>.json REF=<ref>
//   node quality/gates/content-check.mjs <film.json> --ref <ref> [--pairs 1:1,2:2] [--strict]
//
// WHY PER ACT, NEVER A GLOBAL BAR. Measured with harness/media/content.mjs (engine-doctrine/CRAFT plan,
// content-richness): madera's editor and taglines are QUIET (colourfulness "not") and its cards/results
// acts are DENSE. A film that is quiet where the reference is quiet and dense where it is dense is
// doing the right thing even if its numbers never match a single fixed threshold; a film that is quiet
// everywhere is not, even if it beats a global average. So every comparison here is THIS film's act
// against THE REFERENCE'S OWN shot at the same position, never a number pulled from another film.
//
// WHERE THE ACTS COME FROM. A storyboard's beats (`## Beat N: … (Xs-Ys)`) if `<film>.storyboard.md`
// exists; otherwise the film's OWN joints, read off `recipes[]` in the scene JSON (each carries `at`,
// the seam time) so an act boundary is never invented. Neither existing is a hard refusal: guessing
// equal-length acts would compare against nothing real (the same reasoning study.mjs's own "no silent
// fallback" already applies to shot detection).
//
// REPORT-ONLY BY DEFAULT. "The owner rejects gates that hold work back" (AGENTS.md, `[ref: make check GATE=rung]`).
// This always exits 0 unless STRICT=1: it names a gap, it never blocks a render.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureSpan, bandOf } from '../../harness/media/content.mjs';
import { parseStoryboard } from '../../harness/author/storyboard-parse.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ── pure parts, self-tested from quality/gates/lib-test.mjs on synthetic numbers ────────────────────

/** parsePairs("1:1,2:2,3:4") -> [[1,1],[2,2],[3,4]] (1-based, film:ref). Malformed entries are dropped,
 * never guessed into a pairing nobody wrote. */
export function parsePairs(spec) {
  if (!spec) return null;
  return String(spec).split(',').map((s) => s.trim()).filter(Boolean)
    .map((s) => /^(\d+)\s*:\s*(\d+)$/.exec(s))
    .filter(Boolean).map((m) => [Number(m[1]), Number(m[2])]);
}

/** pairActs(filmCount, refCount, pairs?) -> [[filmIdx, refIdx], …] (1-based). An explicit `pairs` wins;
 * otherwise acts pair BY ORDER, stopping at whichever list is shorter: never inventing a pairing for
 * the acts that run past the shorter side. */
export function pairActs(filmCount, refCount, pairs = null) {
  if (pairs && pairs.length) return pairs;
  const n = Math.min(filmCount, refCount);
  return Array.from({ length: n }, (_, i) => [i + 1, i + 1]);
}

/** verdictOf(ours, ref) -> 'quiet ok' | 'over' | 'under' | 'ok'. `ref`/`ours` are content.mjs readings
 * ({ colorfulness, band, fill, detail, photo }). A reference act is QUIET when its own colourfulness
 * band is 'not' (content.mjs's own lowest band, and the plan's own word for madera's editor/taglines).
 * `under`: ours sits below 60% of the reference on fill, detail OR photo, the plan's own measured gap
 * shape (cards act: fill x2-4, detail x2.5, photo x4-5 low). `over`: the reference is quiet and ours is
 * not, i.e. busy where the reference deliberately holds back. */
export function verdictOf(ours, ref) {
  const refQuiet = ref.band === 'not';
  const oursQuiet = ours.band === 'not';
  if (refQuiet) return oursQuiet ? 'quiet ok' : 'over';
  const low = (a, b) => b > 0 && a < 0.6 * b;
  if (low(ours.fill, ref.fill) || low(ours.detail, ref.detail) || low(ours.photo, ref.photo)) return 'under';
  return 'ok';
}

// PLACEHOLDER-SURFACE THRESHOLDS. Recalibrated against two real measurements (harness/media/content.mjs
// measureSpan, over each act's own bounds) on the flood-by-dominant-ground-colour fill (the fix for the
// "border ring is not always ground" defect: a subject running off the frame edge, madera's own hero
// crop, no longer floods away as background), not guessed:
//   out/vawe-flow.mp4's editor act, 0-4.6s (a real captured window, NOT a mock): fill 0.49, band
//     'slightly', photo 0.02, detail 2.4: real UI chrome fills half the frame, but a code editor's own
//     content is legitimately quiet and low-detail.
//   madera's shot 9, 10.37-11.08s, the "results" act (a real dense photo/UI act, its window running off
//     every edge): fill 0.68 (was 0.43 under the old border-blind fill), band 'slightly', photo 0.23,
//     detail 14.1: high fill AND high photo/detail.
// Both are real material and neither may trip placeholder-surface. Both also band 'slightly', so
// requiring band === 'not' already clears both on its own; FILL_MIN/PHOTO_MAX/DETAIL_MAX are set so a
// GENUINELY flat, colourless mock (band 'not') still needs to ALSO be large, photo-free and low-detail
// to trip it: FILL_MIN sits well under either real example's fill (0.49, 0.68), and PHOTO_MAX/DETAIL_MAX
// sit below both real examples' photo/detail (0.02-0.23, 2.4-14.1) so a mock has to read flatter than
// either to trip it.
export const PLACEHOLDER = { FILL_MIN: 0.3, PHOTO_MAX: 0.03, DETAIL_MAX: 3 };

/** isPlaceholderSurface(content) -> true for a large, flat, photo-free, low-detail act: a grey mock
 * standing in for real material, per the calibration above. */
export function isPlaceholderSurface(c) {
  return c.fill >= PLACEHOLDER.FILL_MIN && c.band === 'not' && c.photo < PLACEHOLDER.PHOTO_MAX && c.detail < PLACEHOLDER.DETAIL_MAX;
}

// ── acts: storyboard beats first, the film's own recipe joints otherwise, never invented ────────────

function actsFromStoryboard(src) {
  return parseStoryboard(src).beats
    .filter((b) => typeof b.start === 'number' && typeof b.end === 'number' && b.end > b.start)
    .map((b) => ({ start: b.start, end: b.end, label: b.name }));
}

function actsFromRecipes(sceneFile) {
  const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
  const at = [...new Set((scene.recipes || []).map((r) => r.at).filter((t) => typeof t === 'number'))].sort((a, b) => a - b);
  if (!at.length || !(scene.duration > 0)) return null;
  const bounds = [0, ...at, scene.duration];
  return bounds.slice(0, -1).map((t0, i) => ({ start: t0, end: bounds[i + 1], label: `joint ${i + 1}` }))
    .filter((a) => a.end > a.start);
}

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────────
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const argv = process.argv.slice(2);
  const flag = (n, envKey) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : (envKey ? process.env[envKey] : undefined); };
  const die = (msg) => { console.error(`✗ ${msg}`); process.exit(2); };

  const filmArg = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--ref' && argv[argv.indexOf(a) - 1] !== '--pairs') || process.env.D;
  if (!filmArg) die('usage: make content-check D=films/scene/<film>.json REF=<ref>');
  const refName = flag('--ref', 'REF');
  if (!refName) die('REF=<name> is required: which grammar/<name>.json to compare against.');
  const strict = argv.includes('--strict') || process.env.STRICT === '1';
  const pairsSpec = flag('--pairs', 'PAIRS');

  const filmPath = path.resolve(ROOT, filmArg);
  const slug = path.basename(filmPath).replace(/\.json$/, '');
  const mp4 = path.join(ROOT, 'out', `${slug}.mp4`);
  if (!fs.existsSync(mp4)) die(`no render at out/${slug}.mp4 yet. Render it first: make ship D=${filmArg}`);

  const grammarFile = path.join(ROOT, 'grammar', `${refName}.json`);
  if (!fs.existsSync(grammarFile)) die(`no grammar/${refName}.json. Study the reference first: make study VIDEO=<clip> NAME=${refName}`);
  const refGrammar = JSON.parse(fs.readFileSync(grammarFile, 'utf8'));
  const refShots = (refGrammar.shots || []).map((s) => ({ start: s.t0, end: s.t0 + s.len, content: s.content, label: `shot ${s.i}` }));
  const missingRefContent = refShots.filter((s) => !s.content);
  if (missingRefContent.length)
    die(`grammar/${refName}.json has no content on ${missingRefContent.length} shot(s). Re-run `
      + `\`node harness/media/study.mjs <clip> ${refName} --content-only\` first.`);

  const sbPath = [filmPath.replace(/\.json$/, '.storyboard.md'), path.join(ROOT, 'films/scene', `${slug}.storyboard.md`)]
    .find((f) => fs.existsSync(f));
  let acts = sbPath ? actsFromStoryboard(fs.readFileSync(sbPath, 'utf8')) : null;
  let actsSource = sbPath ? `storyboard beats (${sbPath.replace(ROOT + '/', '')})` : null;
  if (!acts && fs.existsSync(filmPath)) { acts = actsFromRecipes(filmPath); actsSource = acts ? 'the film\'s own recipes[] joints' : null; }
  if (!acts || !acts.length)
    die(`no acts found: neither a storyboard (${slug}.storyboard.md) nor recipes[] joints in ${filmArg}. `
      + 'Nothing to measure against the reference act by act.');

  const pairs = pairActs(acts.length, refShots.length, parsePairs(pairsSpec));

  console.log(`\n  CONTENT-CHECK · ${slug} vs ${refName}\n`);
  console.log(`  acts: ${acts.length} (${actsSource}) · reference shots: ${refShots.length} · pairing: `
    + (pairsSpec ? `PAIRS=${pairsSpec}` : `by order (${pairs.length} pair(s))`));
  console.log('');

  const gf = gateFindings();
  let anyUnder = false, anyPlaceholder = false;
  for (const [fi, ri] of pairs) {
    const act = acts[fi - 1], ref = refShots[ri - 1];
    if (!act || !ref) continue;
    const ours = measureSpan(mp4, act.start, act.end);
    const verdict = verdictOf(ours, ref.content);
    const placeholder = isPlaceholderSurface(ours);
    if (verdict === 'under') anyUnder = true;
    if (placeholder) anyPlaceholder = true;

    console.log(`  act ${fi} (${act.label}, ${act.start.toFixed(1)}-${act.end.toFixed(1)}s) vs ${ref.label} (${ref.start.toFixed(1)}-${ref.end.toFixed(1)}s)`);
    console.log(`    fill    ours ${ours.fill.toFixed(2)}  ref ${ref.content.fill.toFixed(2)}`);
    console.log(`    detail  ours ${ours.detail.toFixed(1)}  ref ${ref.content.detail.toFixed(1)}`);
    console.log(`    photo   ours ${ours.photo.toFixed(2)}  ref ${ref.content.photo.toFixed(2)}`);
    console.log(`    colour  ours ${ours.band} (${ours.colorfulness})  ref ${ref.content.band} (${ref.content.colorfulness})`);
    console.log(`    verdict: ${verdict}${placeholder ? ' · placeholder-surface' : ''}`);
    console.log('');

    if (verdict === 'under')
      gf.warn('content-under', `act ${fi} (${act.label}) is under the reference: fill ${ours.fill}/${ref.content.fill}, `
        + `detail ${ours.detail}/${ref.content.detail}, photo ${ours.photo}/${ref.content.photo}`, { at: `act ${fi}` });
    if (placeholder)
      gf.warn('placeholder-surface', `act ${fi} (${act.label}) reads as a flat mock: fill ${ours.fill} (>= `
        + `${PLACEHOLDER.FILL_MIN}), band ${ours.band}, photo ${ours.photo} (< ${PLACEHOLDER.PHOTO_MAX}), `
        + `detail ${ours.detail} (< ${PLACEHOLDER.DETAIL_MAX}). Design the screen: make screen `
        + '(engine-doctrine/CRAFT/SCREENS.md) or capture a real one: make capture / make sections.', { at: `act ${fi}` });
  }
  gf.emit();
  process.exit(strict && (anyUnder || anyPlaceholder) ? 1 : 0);
}
