// The signature of a film (core/motion/signature.js): the six dials with their ranges, the Signature block of
// brief.md, and what `bin/vawe dev` says about a page's chosen dials. Ranges are read from the rule that owns each
// dial (`dial:` in taste/rules/<id>.md, built into taste/build/rules.json); nothing here repeats a range.
import RULES from '../../taste/build/rules.json' with { type: 'json' };
import { DIALS } from '../../core/motion/signature.js';

const MEANING = {
  band: 'speed band family: energy, professional, gravity or cinematic',
  ease: 'the main EASE name',
  stagger: 'gap between siblings, in ms',
  seam: 'transition family',
  palette: 'colour family',
  thread: 'the material carried through: object, type line, colour or rhythm',
};

const firstSentence = (text) => text.split(/\. /)[0].replace(/\.$/, '');

/** [{ dial, meaning, rule, file, range }] in dial order: the range is the first sentence of the owning rule's `range`. */
export function dialRanges(rules = RULES) {
  return DIALS.map((dial) => {
    const [rule, r] = Object.entries(rules).find(([, v]) => v.dial === dial);
    return { dial, meaning: MEANING[dial], rule, file: r.file, range: firstSentence(r.range) };
  });
}

/** The `## Signature` section of brief.md: each dial with its range and an empty `chosen:` line. */
export function signatureSection(ranges = dialRanges()) {
  const dials = ranges.map((d) => `- ${d.dial} (${d.meaning}): ${d.range} (${d.file})\n  chosen:`).join('\n');
  return `## Signature

Six dials, chosen before the first still. Write each value after \`chosen:\`, then copy them into
\`<meta name="signature" content="band=...; ease=...; stagger=...; seam=...; palette=...; thread=...">\` in page.html:
the presets (enter, leave, stagger, layer) use band, ease and stagger as their defaults, and \`bin/vawe dev\` reads all six.

${dials}`;
}

/** One advice line per unchosen dial. Pure. */
export function unchosenAdvice(chosen, ranges = dialRanges()) {
  return ranges.filter((d) => !chosen[d.dial]).map((d) => `signature dial "${d.dial}" is unchosen; choose from ${d.range} (${d.file})`);
}

const MEASURED = ['band', 'ease', 'stagger'];
const UNIT = { stagger: ' ms' };

/** The one dev line: each dial, what the page declared and, for band, ease and stagger, what its moves measured. Pure. */
export function signatureLine(chosen, measured) {
  const parts = DIALS.map((d) => {
    const declared = `${d} ${chosen[d] ?? 'unchosen'}`;
    if (!MEASURED.includes(d)) return declared;
    const m = measured[d];
    return `${declared} (measured ${m == null ? 'none' : `${m}${UNIT[d] ?? ''}`})`;
  });
  return `signature: ${parts.join(' · ')}`;
}
