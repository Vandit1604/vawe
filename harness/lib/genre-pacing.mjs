// harness/lib/genre-pacing.mjs: one owner for "how long can a beat hold one state", per film type.
//
// engine-doctrine/MOTION-CRAFT.md already names this per genre ("Genre pacing tables", beat length in
// seconds). quality/gates/storyboard-check.mjs used to carry a second, different number instead: a flat
// ~1.5s, justified only by "the reference film never holds a single state longer than about 1.5
// seconds" for ONE film, applied to every film of every type. A product walkthrough is allowed a 5-8s
// beat by the doctrine table and was warned at 1.5s by the gate. This file is the single
// machine-readable copy of that table: mirror the numbers here if MOTION-CRAFT.md's table ever moves,
// do not add a third copy anywhere else.
//
// GENRE, not scaffold TYPE. No storyboard records its scaffold type (launch/explainer/demo/sting/
// talking-head/recreation, harness/author/type-spines.mjs) after scaffold runs, so this gate has no
// `type:` field to read. `classifyType()` below derives it from content already on the page instead:
// the `framework:` line, a `refs/*.mp4` capture path (a recreation always names the clip it measured),
// or the filename, in that priority order. A storyboard none of these signals name gets DEFAULT_MAX_S,
// the gate's old flat number, unchanged: this file only ever WIDENS the check for a film it can
// positively place, never narrows it for one it cannot.
import { readReferenceBars, MIN_REFERENCES } from './reference-bars.mjs';

// No genre band comes close to this. Product walkthrough, the loosest named band, tops out at 8s; a
// 12s single-change beat is still called a defect regardless of genre, so the absolute ceiling sits a
// full margin above 8 and short of 12.
export const CEILING_S = 10;

// engine-doctrine/MOTION-CRAFT.md "Genre pacing tables".
export const GENRE_PACING = {
  launch: { maxS: 7, doc: 'Launch film (30-60s): 4-7s' },
  walkthrough: { maxS: 8, doc: 'Product walkthrough: 5-8s' },
  shorts: { maxS: 4, doc: 'Shorts (games/facts): 2-4s' },
};

// scaffold TYPE -> genre bucket.
//   demo is a screen-recorded UI mechanism (harness/author/type-spines.mjs recordedPan/verdictProof),
//   the exact shape MOTION-CRAFT.md calls "product walkthrough".
//   explainer explains a topic/article/data with invented visuals (engine-doctrine/CRAFT/ROUTING.md),
//   the "games/facts" shorts row.
//   sting is one beat, 4-8s, kinetic register: nearer the launch band's cadence than the other two.
// talking-head has no row of its own in MOTION-CRAFT.md and falls through to DEFAULT_MAX_S below.
const TYPE_GENRE = {
  launch: 'launch',
  demo: 'walkthrough',
  explainer: 'shorts',
  sting: 'launch',
};

// recreation is deliberately NOT in TYPE_GENRE: harness/author/type-spines.mjs says a recreation
// "inherits whatever register the studied source film is in", so it commits to no genre band of its
// own. It still answers to the absolute ceiling, nothing else.
const RECREATION_MAX_S = CEILING_S;

// DEFAULT: the held-state cap for any film classifyType() cannot place (most of the corpus: no
// storyboard signal here recognizes it) and for talking-head, which has no MOTION-CRAFT.md row of its
// own. It used to be a flat 3.0s, the doubled residue of "the reference film never holds a single
// state longer than about 1.5 seconds" for ONE film. The plan was for it to cite a measured EXTERNAL
// reference instead (harness/lib/reference-bars.mjs, refs/*/study.json's `longestHoldS`), and it still
// will, once the bank has enough of them: MEASURED, with the two references studied so far, changing
// only which delta metric read them swung this constant between 2.6s and 3.6s off the SAME two clips,
// a 38% swing with zero new data. That is not a bar, it is noise wearing a bar's clothes, which is
// exactly what `readReferenceBars`'s `ready` flag (MIN_REFERENCES, reference-bars.mjs) exists to
// refuse: below it, this file REPORTS what the bank measured without ENFORCING it.
//
// refs/ is gitignored, so on CI and a fresh clone the bank is empty; that and "the bank exists but is
// still thin" both land on the SAME fallback, the old number, STATED as uncalibrated rather than
// silently reused (harness/lib/reference-bars.mjs's own contract: a bank that isn't ready must never
// read as a confident measurement, whether it is empty or merely small).
const UNCALIBRATED_MAX_S = 3.0;
const bank = readReferenceBars();
export const DEFAULT_MAX_S = (bank.ready && bank.longestHoldS != null)
  ? Math.round(bank.longestHoldS * 10) / 10
  : UNCALIBRATED_MAX_S;
// Printed wherever DEFAULT_MAX_S is quoted (storyboard-check.mjs), so a thin bank never reads as more
// authoritative than it is, and so the evidence it DOES carry is visible even while it isn't deciding.
export const DEFAULT_MAX_S_SOURCE = (bank.ready && bank.longestHoldS != null)
  ? `measured longest hold across ${bank.n} external references (${bank.names.join(', ')})`
  : (bank.n > 0
      ? `uncalibrated: the bank holds ${bank.n} of the ${MIN_REFERENCES} external references it needs `
        + `to set this bar (${bank.names.join(', ')}); what it has measured so far, longest hold `
        + `${bank.longestHoldS != null ? `${bank.longestHoldS}s` : 'unmeasured'}, is reported, not enforced`
      : `uncalibrated: ${bank.reason || 'no external reference on disk'}`);

/** thresholdFor(type) -> the held-state cap in seconds for a classified film type. */
export function thresholdFor(type) {
  if (type === 'recreation') return RECREATION_MAX_S;
  const genre = type && TYPE_GENRE[type];
  const band = genre && GENRE_PACING[genre];
  return band ? Math.min(band.maxS, CEILING_S) : DEFAULT_MAX_S;
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
