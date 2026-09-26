// This rule lives in core/on-screen-text.js (core/validate.mjs and core/captions.js need it too and ship to the browser); this file is the tooling front door onto it.
// It existed as eight copies with three answers: inspect.mjs compared a needle against the raw string so emphasis broke every match (#313), and critique.mjs's false-claim regex missed a number followed by `<b>` (the same <style>-is-not-glyphs bug, #214/#216/#217, that also reached designspec-check).
export { onScreenText, glyphText } from '../../core/type/on-screen-text.js';
import { onScreenText } from '../../core/type/on-screen-text.js';

// A layer's on-screen words. `count` layers carry `text` too, and a null type is a text layer.
export const layerText = (l) => (l && (l.type === 'text' || l.type === 'count' || l.type == null) ? onScreenText(l.text) : '');

// Truncating the RAW string can cut a tag in half and print `"Nothing came near the <b>ed"`, which is noise in the one place a person is reading the output.
export const snippet = (s, n = 24) => {
  const t = onScreenText(s);
  return t.length > n ? `${t.slice(0, n)}…` : t;
};
