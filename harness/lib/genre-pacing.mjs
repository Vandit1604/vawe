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

// DEFAULT: the gate's behaviour before this file existed, kept for any film classifyType() cannot
// place (most of the corpus: no storyboard signal here recognizes it) and for talking-head, which has
// no MOTION-CRAFT.md row of its own.
export const DEFAULT_MAX_S = 3.0;

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
