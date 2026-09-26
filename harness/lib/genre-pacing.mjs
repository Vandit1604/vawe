import { readReferenceBars, MIN_REFERENCES } from './reference-bars.mjs';

export const CEILING_S = 10;

export const GENRE_PACING = {
  launch: { maxS: 7, doc: 'Launch film (30-60s): 4-7s' },
  walkthrough: { maxS: 8, doc: 'Product walkthrough: 5-8s' },
  shorts: { maxS: 4, doc: 'Shorts (games/facts): 2-4s' },
};
export const GENRE_PACING_SOURCE = 'engine-doctrine/MOTION-CRAFT.md "Genre pacing tables": this '
  + 'repo\'s own craft doctrine, no external citation claimed';

const TYPE_GENRE = {
  launch: 'launch',
  demo: 'walkthrough',
  explainer: 'shorts',
  sting: 'launch',
};

const RECREATION_MAX_S = CEILING_S;

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
