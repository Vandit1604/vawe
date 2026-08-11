// scripts/lib/text.mjs — what a layer's copy READS AS, which is not what it is authored as.
//
// A text layer's `text` is HTML. `docs/PRIMITIVES.md` documents `<b>` and `<em>`, CLAUDE.md names them
// under Hard rules, and every shipped film uses them to carry the accent word. So the authored string
// and the string on screen are different, and a gate that matches, counts or measures the authored one
// is measuring markup.
//
// This existed already, five times, as five local copies of the same regex, and the two places that
// did NOT have a copy were both matchers:
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
// So it is one definition now, and callers import it. A copy in each gate is how the two that lacked
// one went unnoticed: nothing looked missing, because there was nothing central to be missing from.
export const plain = (s) => String(s ?? '').replace(/<[^>]*>/g, '');

// A layer's on-screen words. `count` layers carry `text` too, and a null type is a text layer.
export const layerText = (l) => (l && (l.type === 'text' || l.type === 'count' || l.type == null) ? plain(l.text) : '');

// For a message or a label: the readable copy, cut to length. Truncating the RAW string can cut a tag
// in half and print `"Nothing came near the <b>ed"`, which is noise in the one place a person is
// reading the output.
export const snippet = (s, n = 24) => {
  const t = plain(s).trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};
