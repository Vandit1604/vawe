// Prompt text the fresh judge gets besides the rubric: the pixel size of every image it sees, the text sizes
// the draft measured, and the yes or no anchor question per key frame. Pure; harness/media/judge-fresh.mjs feeds it.

import LIMITS from '../../taste/build/limits.json' with { type: 'json' };
import { HOLD_RULE } from './read-hold.mjs';
import { DIALS } from './judge-bar.mjs';

// The card the fresh judge reads, built from taste/rules by harness/dev/taste-build.mjs.
export const TASTE_CARD_REL = 'taste/build/CARD.md';

const MAX_CAPS = 8;

/** Lines that state each image's size and how the taste card's percent rules map onto it. `images` are { label, w, h, tile }. */
export function sizeLines(images) {
  if (!images.length) return [];
  const each = images.map((i) => (i.tile
    ? `- ${i.label} is ${i.w}x${i.h} px and each tile is ${i.tile} px wide: too small to measure type or fine detail on. Use it to read the order and the motion only.`
    : `- ${i.label} is ${i.w}x${i.h} px: 1% of its height is ${(i.h / 100).toFixed(1)} px, so a 6% cap height is ${(i.h * 0.06).toFixed(0)} px tall here.`));
  return ['Image sizes. The taste card states every size as a percent of the frame height. Convert with the height of the image you look at, never with a 1080 px figure from memory, and measure type only on a key frame:', ...each];
}

/** The measured text sizes, smallest first, as facts the judge must use instead of estimating type from pixels. `caps` are { text, cap (percent of frame height), t, ui? }. `floors` are the film's { copy, ui } percents (its DESIGN.md declarations, else the house 6 and 3). */
export function capLines(caps, floors = { copy: 6, ui: 3 }) {
  if (!caps?.length) return [];
  const worst = [...caps].sort((a, b) => a.cap - b.cap).slice(0, MAX_CAPS);
  return [`Measured text sizes (exact, read from the page; cap height as a percent of the frame height; the floor for read text is ${floors.copy}%, for UI that is the subject (data-ui) ${floors.ui}%). Use these numbers; do not estimate type size from pixels:`,
    ...worst.map((c) => `- "${c.text.slice(0, 40)}" at ${c.t.toFixed(1)} s: cap height ${c.cap.toFixed(1)}%${c.ui ? ' (UI that is the subject)' : ''}`)];
}

const r1 = (x) => +x.toFixed(2);

/** The hold a line needs, in the draft check's own numbers (read-hold.mjs), so the judge cannot ask for a hold the check rejects or accepts less. Pure. */
export function holdLines(rule = HOLD_RULE, sheetFps = LIMITS['world-turns'].sheet_fps) {
  return [`Read holds (taste rule readable-hold; the draft check measures these exact numbers). A line the viewer reads holds fully legible for at least ${rule.floor} s (${Math.ceil(rule.floor * sheetFps)} tiles on the ${sheetFps} fps sheet). Text under ${rule.proseWords} words needs max(${rule.floor} s, words / ${rule.shortWps}); prose of ${rule.proseWords} or more words needs words x ${rule.perWord} s. Rows that appear together need the longest row plus ${r1(rule.perExtraRow)} s per extra row, at most ${rule.ceiling} s. Count tiles against these numbers. Never ask for a hold longer than they give, never ask for a shorter one, and never ask to slow the move.`];
}

/** The anchor the key frames are compared with: { kind: 'reference', frames } (images of the reference at the key times), { kind: 'brief' } or { kind: 'none' }. */
export function anchorLines(anchor, keys) {
  const where = anchor.kind === 'reference'
    ? `the reference film, shown as the anchor frames listed above (one per key frame, at the same second)`
    : anchor.kind === 'brief' ? `the look the brief names: its LOOK section or the reference it names (Read the brief)` : `the best frame of this film itself, since there is no reference and no brief`;
  return [
    `Anchor question. The anchor is ${where}.`,
    'For each key frame (key 1, key 2 and so on, in the order listed), open it at full size and answer one yes or no question: "is this frame at least as beautiful and polished as the anchor, at full size?"',
    'Answer NO when it is not. A NO needs the exact fix: the element, the property and the new value. A YES needs no fix.',
    `Add one more key to the JSON object: "anchor":[${keys.slice(0, 2).map((k, i) => `{"frame":"key ${i + 1}","at":${k.t},"yes":true,"fix":null}`).join(',')}${keys.length > 2 ? ',...' : ''}], one entry for each of the ${keys.length} key frames.`,
  ];
}

/** The anchor result for the report: one { frame, at, yes, fix } per key frame, a missing answer counting as NO. Pure. */
export function anchorResult(raw, keys) {
  return keys.map((k, i) => {
    const label = `key ${i + 1}`;
    const given = (Array.isArray(raw) ? raw : []).find((a) => a && String(a.frame).toLowerCase().replace(/\s+/g, ' ').trim() === label);
    if (!given) return { frame: label, at: k.t, yes: false, fix: 'the judge gave no answer for this frame' };
    const yes = given.yes === true || /^yes$/i.test(String(given.yes));
    return { frame: label, at: k.t, yes, fix: yes ? null : given.fix || 'no fix given' };
  });
}

const DIAL_HELP = {
  text: 'faces, scale contrast, hierarchy, how words arrive and leave',
  colour: 'palette, light, contrast, how the colour changes',
  motion: 'the type and the speed of the moves: curves, overlap, the pace of the cuts',
  craft: 'how rich and finished each frame is: layers and depth, a living ground, light and texture, how many ideas per second; a plain frame with one element on a flat ground loses',
};

/** The prompt lines for the comparison. `refs` are { id, title, studio, file }: the sheet of each reference film. */
export function barLines(refs) {
  const ids = refs.map((r) => r.id);
  return [
    `Side by side. ${refs.length === 1 ? 'A reference film' : `${refs.length} reference films`} by top studios, each a sheet laid out like the sheet of this film. Open ${refs.length === 1 ? 'it' : 'every one'} before you answer:`,
    ...refs.map((r) => `- REF ${r.id} (${r.title}${r.studio ? `, ${r.studio}` : ''}): ${r.file}`),
    'For each reference and each dial, say which film is better: OURS or that REF. Judge what the sheets show, not the budget. Do not favour OURS. Each answer names the visible difference in one sentence.',
    ...DIALS.map((d) => `- ${d}: ${DIAL_HELP[d]}`),
    `Add one more key to the JSON object: "bar":[{"ref":"${ids[0]}","dial":"text","winner":"ours or ${ids[0]}","why":"one sentence"},...], ${refs.length * DIALS.length} entries, one for each reference and dial.`,
  ];
}
