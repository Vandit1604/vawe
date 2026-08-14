// scripts/lib/text.mjs — what a layer's copy READS AS, which is not what it is authored as.
//
// The RULE lives in core/on-screen-text.js, because core/validate.mjs and core/captions.js need it too
// and they ship to the browser, so they cannot import out of scripts/. This file is the tooling front
// door onto that one rule; read the reasoning there.
//
// This existed as EIGHT copies with THREE answers, and the two gates that had no copy were both
// matchers:
//
//   inspect.mjs      compared a needle against the raw string, so `"Nothing came near the edge."`
//                    never matched `"Nothing came near the <b>edge.</b>"`. Every beat of every film
//                    with emphasis failed, and `make intent` GENERATES those needles from the
//                    storyboard's plain prose, so the two halves of one feature disagreed and the
//                    author was pushed toward deleting the emphasis to get a green gate (#313).
//   critique.mjs     its false-claim regex wants digits then whitespace, and `<b>245</b> effects` has
//                    a `<` after the digits. A film that emphasised its own number walked past the
//                    check that exists to catch an unbacked number, silently.
//
// A copy in each gate is how the two that lacked one went unnoticed: nothing looked missing, because
// there was nothing central to be missing from. It is also how the same `<style>`-is-not-glyphs bug
// (#214/#216/#217) reached a fifth consumer — `designspec-check` was reading a captured component's
// CSS as the film's copy and running the jargon rules over it.
export { onScreenText, glyphText } from '../../core/on-screen-text.js';
import { onScreenText } from '../../core/on-screen-text.js';

// A layer's on-screen words. `count` layers carry `text` too, and a null type is a text layer.
export const layerText = (l) => (l && (l.type === 'text' || l.type === 'count' || l.type == null) ? onScreenText(l.text) : '');

// For a message or a label: the readable copy, cut to length. Truncating the RAW string can cut a tag
// in half and print `"Nothing came near the <b>ed"`, which is noise in the one place a person is
// reading the output.
export const snippet = (s, n = 24) => {
  const t = onScreenText(s);
  return t.length > n ? `${t.slice(0, n)}…` : t;
};
