// Prompt text the fresh judge gets besides the rubric: the pixel size of every image it sees, the text sizes
// the draft measured, and the yes or no anchor question per key frame. Pure; harness/media/judge-fresh.mjs feeds it.

const MAX_CAPS = 8;

/** Lines that state each image's size and how the taste card's percent rules map onto it. `images` are { label, w, h, tile }. */
export function sizeLines(images) {
  if (!images.length) return [];
  const each = images.map((i) => (i.tile
    ? `- ${i.label} is ${i.w}x${i.h} px and each tile is ${i.tile} px wide: too small to measure type or fine detail on. Use it to read the order and the motion only.`
    : `- ${i.label} is ${i.w}x${i.h} px: 1% of its height is ${(i.h / 100).toFixed(1)} px, so a 6% cap height is ${(i.h * 0.06).toFixed(0)} px tall here.`));
  return ['Image sizes. The taste card states every size as a percent of the frame height. Convert with the height of the image you look at, never with a 1080 px figure from memory, and measure type only on a key frame:', ...each];
}

/** The measured text sizes, smallest first, as facts the judge must use instead of estimating type from pixels. `caps` are { text, cap (percent of frame height), t }. */
export function capLines(caps) {
  if (!caps?.length) return [];
  const worst = [...caps].sort((a, b) => a.cap - b.cap).slice(0, MAX_CAPS);
  return ['Measured text sizes (exact, read from the page; cap height as a percent of the frame height, which is what the taste card rule 9 asks for at 6% or more). Use these numbers; do not estimate type size from pixels:',
    ...worst.map((c) => `- "${c.text.slice(0, 40)}" at ${c.t.toFixed(1)} s: cap height ${c.cap.toFixed(1)}%`)];
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
