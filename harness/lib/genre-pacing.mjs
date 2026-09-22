// harness/lib/genre-pacing.mjs: what MOTION-CRAFT.md says a beat's length should be, per genre. A
// REPORTING table, not a bar: read the file's own header below for why.
//
// engine-doctrine/MOTION-CRAFT.md names this per genre ("Genre pacing tables", beat length in
// seconds). quality/gates/storyboard-check.mjs used to enforce a flat ~1.5s instead, justified only by
// "the reference film never holds a single state longer than about 1.5 seconds" for ONE film, applied
// to every film of every type. A product walkthrough is allowed a 5-8s beat by the doctrine table and
// was warned at 1.5s by the gate. Then it enforced a fallback read off the reference bank
// (harness/lib/reference-bars.mjs), then off quality/gates/read-check.mjs's subtitling MAX_HOLD. All
// three were wrong the same way: MAX_HOLD is sourced for TIME TO READ PROSE (BBC/Netflix subtitling),
// and a held beat need carry no prose at all (a static product screen, a still shot). The argument that
// disqualified the reference bank and the per-word formula (no source reaches a beat with nothing to
// read) disqualifies MAX_HOLD too, for the same reason. No perception or craft literature answers "how
// long may an arbitrary VISUAL state hold", because the answer depends on what the beat is SHOWING,
// which is a craft judgement, not a measurable constant.
//
// So there is no held-state CAP in this file, and none belongs here. What is left:
//   - GENRE_PACING below, MOTION-CRAFT.md's own table, reported honestly as this repo's internal
//     doctrine (no external citation, never claimed to have one).
//   - a beat that carries readable prose is quality/gates/read-check.mjs's job, already cited (BBC
//     subtitling 2-5s band, argued over Netflix's 7s) and unaffected by any of this.
//   - the actual judgement, "does this beat earn its seconds, none padded or starved", now lives at
//     `make plan-judge`'s `beat-pacing` finding code (harness/author/critics.mjs, harness/lib/
//     plan-judge-codes.mjs): an agent looking at the plan, because that is a craft question and an
//     agent can answer it where an exit code never could.
import { readReferenceBars, MIN_REFERENCES } from './reference-bars.mjs';

// No genre band names anything past this. Product walkthrough, the loosest band below, tops out at 8s.
// Same status as the bands themselves: MOTION-CRAFT.md's own margin, not an external citation.
export const CEILING_S = 10;

// engine-doctrine/MOTION-CRAFT.md "Genre pacing tables". House craft doctrine, not a published
// standard: no citation is claimed for these numbers, and none should be invented. Reported as what
// this repo's own doctrine says, for an author or `plan-judge` to weigh, never enforced as a bar.
export const GENRE_PACING = {
  launch: { maxS: 7, doc: 'Launch film (30-60s): 4-7s' },
  walkthrough: { maxS: 8, doc: 'Product walkthrough: 5-8s' },
  shorts: { maxS: 4, doc: 'Shorts (games/facts): 2-4s' },
};
export const GENRE_PACING_SOURCE = 'engine-doctrine/MOTION-CRAFT.md "Genre pacing tables": this '
  + 'repo\'s own craft doctrine, no external citation claimed';

// scaffold TYPE -> genre bucket.
//   demo is a screen-recorded UI mechanism (harness/author/type-spines.mjs recordedPan/verdictProof),
//   the exact shape MOTION-CRAFT.md calls "product walkthrough".
//   explainer explains a topic/article/data with invented visuals (engine-doctrine/CRAFT/ROUTING.md),
//   the "games/facts" shorts row.
//   sting is one beat, 4-8s, kinetic register: nearer the launch band's cadence than the other two.
// talking-head and anything classifyType() cannot place have no row here and get no reported band.
const TYPE_GENRE = {
  launch: 'launch',
  demo: 'walkthrough',
  explainer: 'shorts',
  sting: 'launch',
};

// recreation is deliberately NOT in TYPE_GENRE: harness/author/type-spines.mjs says a recreation
// "inherits whatever register the studied source film is in", so it commits to no genre band of its
// own. It still gets a reported band, the same absolute margin, same uncited status.
const RECREATION_MAX_S = CEILING_S;

// The reference bank (refs/*/study.json, harness/lib/reference-bars.mjs) is a real measurement of real
// external clips, and worth printing next to a beat-pacing observation as evidence an author can weigh.
// It is not a source for a threshold here: `MIN_REFERENCES` clips is a better SAMPLE of the same
// weaker evidence class a corpus always is, not a stronger one (the swing this bank produced when it
// WAS wired to a constant, 2.6s-3.6s off the same two clips with zero new data, is exactly that
// weakness showing). Measured, reported, never decided by.
export const referenceBank = readReferenceBars();
export function describeReferenceBank() {
  const bank = referenceBank;
  if (!bank.n) return `reference bank: ${bank.reason || 'no external reference on disk'} (measured evidence, not a bar)`;
  const measured = bank.longestHoldS != null ? `${bank.longestHoldS}s` : 'unmeasured';
  return `reference bank (measured evidence, not a bar): longest hold measured ${measured} `
    + `across ${bank.n}${bank.n < MIN_REFERENCES ? ` of the ${MIN_REFERENCES} references it would want for a stable read` : ''} `
    + `(${bank.names.join(', ')})`;
}

/**
 * thresholdFor(type) -> what MOTION-CRAFT.md's doctrine reports for a classified film type, in
 * seconds, or null when nothing here has a band for it (most of the corpus: `classifyType()` places
 * only launch/demo/explainer/sting/recreation). NEVER a bar to enforce, see the file header: a caller
 * may only REPORT this number next to a long beat, worded plainly as uncited house doctrine.
 */
export function thresholdFor(type) {
  if (type === 'recreation') return RECREATION_MAX_S;
  const genre = type && TYPE_GENRE[type];
  const band = genre && GENRE_PACING[genre];
  return band ? Math.min(band.maxS, CEILING_S) : null;
}

const REF_CLIP_RE = /refs\/[\w.-]+\.(mp4|mov)/i;

/**
 * classifyType(text, filename) -> a scaffold TYPE name, or null when nothing here recognizes the film.
 * Content signals first (a real fact stated by the film), the filename last (a naming convention, not
 * a guarantee): a `framework:` line starting "Recreation", or a `refs/*.mp4` capture path in the body,
 * both mean the film measured itself off a real reference clip, which only a recreation does.
 */
export function classifyType(text, filename) {
  const fw = /^framework:\s*(.+)$/mi.exec(text || '');
  if (fw && /^"?recreation/i.test(fw[1].trim())) return 'recreation';
  if (REF_CLIP_RE.test(text || '')) return 'recreation';
  const base = (filename || '').toLowerCase();
  if (base.includes('recreation')) return 'recreation';
  if (base.includes('launch')) return 'launch';
  if (base.includes('explainer')) return 'explainer';
  if (/sting|motion-graphic/.test(base)) return 'sting';
  if (base.includes('demo')) return 'demo';
  if (/talking-?head/.test(base)) return 'talking-head';
  return null;
}
