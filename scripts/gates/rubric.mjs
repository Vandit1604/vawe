// scripts/gates/rubric.mjs: the criteria a vision judge is scored against.
//
// Two rubrics, deliberately different.
//
// `craftRubric` grades ONE film against a house style: all 7 dimensions, including brand and asset
// fidelity, because conformity to a named brand is the point when there is a brand to conform to.
//
// `abRubric` grades one film AGAINST ANOTHER, and drops dimensions 4 and 5 unless a brand is named.
// Those two score conformity to a house style; run unchanged across a campaign of fifteen films they
// reward sameness, and the library gets more similar while every individual verdict says "better".
// That is the failure `similarity.mjs` exists to catch, so the A/B loop must not manufacture it.
import fs from 'node:fs';
import path from 'node:path';

export function houseStyleFor(brand) {
  const p = brand && path.join('assets', 'brands', brand, 'house-style.md');
  return p && fs.existsSync(p) ? fs.readFileSync(p, 'utf8')
    : `(no house-style for "${brand || '?'}", judge on the craft rubric + general brand-fidelity only)`;
}

const DIMENSIONS = [
  '**Readability**: text legible at size, contrast sufficient (no muddy/low-contrast copy).',
  '**Hierarchy**: ONE clear focal point; the eye knows where to land first.',
  '**Composition**: centered/aligned/on-thirds ON PURPOSE. Off-center-by-accident, mis-anchored\n   annotations (an underline not under its word), floating elements = FAIL. (This is the argus-pass class.)',
  '**Brand fidelity**, matches the house style: dominance, ONLY brand colours, the real face, the\n   SIGNATURE DETAILS present, the NEVERs absent.',
  '**Asset fidelity**: real captured assets (logos/mascots/UI), never a recreated-from-memory lookalike.',
  '**Produced-not-generated**: crafted density; not a word-on-empty-space slide.',
  '**Value**: this frame teaches/proves/delights something no other frame does.',
];

const numbered = (list) => list.map((d, i) => `${i + 1}. ${d}`).join('\n');

export function craftRubric({ name, frames, landscape, brand, dir = '/tmp/judge' }) {
  return `# Judge sheet, ${name} (${frames} key frames, ${landscape ? 'landscape' : 'portrait'})

READ \`${dir}/sheet.png\` and score EACH labeled frame against the rubric below. Be adversarial:
your job is to catch what the static gates can't SEE. Do NOT rationalize a flaw you notice, flag it.

## The brand's house style (the scoring key)
${houseStyleFor(brand)}

## Craft rubric: score each frame 1-5 per dimension, name the issue + the fix
${numbered(DIMENSIONS)}

## Return this verdict (structured)
- **Per frame:** \`beat N, <worst dimension>: <the issue> → <the fix>\` (only frames with a real problem).
- **Worst frame overall** + why.
- **Verdict:** \`PASS\` only if every frame clears every dimension. Otherwise \`FIX\` + the prioritized list.
Rule: if your eye catches it, it's a FIX. "Renders fine" is not PASS.
`;
}

export function abRubric({ rows, landscape, brand, dir, judge }) {
  // 1,2,3,6,7 plus the show-don't-tell question. 4/5 only when a brand is named to conform to.
  const dims = brand ? DIMENSIONS : DIMENSIONS.filter((_, i) => i !== 3 && i !== 4);
  return `# Blind comparison, ${rows} paired beats (${landscape ? 'landscape' : 'portrait'})

You are judge ${judge ?? 'N'} of three, working independently. Two cuts of the same film are laid side by
side: **LEFT** and **RIGHT**. You are not told which is which, who made either, or which came first.
Nothing about the order implies anything. Judge only what is in the frames.

## What to open
- \`${dir}/sheet.png\`: every paired beat, LEFT beside RIGHT, in order.
- \`${dir}/beat-NN.png\`: the SAME pair at full render resolution. **Open at least one of these.** A call
  about readability made from the contact sheet alone is a guess; the sheet is for structure and pace.

Where one side reads \`(no beat)\`, that cut has no beat at that index. A differing beat count is itself a
signal about pace, not an error to correct for.

## Dimensions
${numbered(dims)}
${dims.length + 1}. **Does the graphic encode the claim**, is there a picture doing work the words cannot, or
   is the frame type with decoration around it?

## The one field that matters most
\`graphicEarnsIt.whatItEncodes\`: **in your own words, what does the picture MEAN?** What quantity,
proportion, change, or real thing is it showing? You have not been told what it was supposed to show.
If you cannot say, write \`"nothing: it is decoration"\`. That answer is a legitimate and useful verdict.

## Return EXACTLY this JSON, and nothing else
Write it to \`${dir}/verdicts/${judge ?? 'N'}.json\`. Every field names a POSITION (LEFT/RIGHT), never a file.

\`\`\`json
{
  "judge": "${judge ?? 'N'}",
  "perBeat": [{"beat": 1, "winner": "LEFT|RIGHT|TIE", "dimension": "…", "why": "one sentence"}],
  "graphicEarnsIt": {"side": "LEFT|RIGHT|NEITHER", "whatItEncodes": "…"},
  "overall": {"winner": "LEFT|RIGHT|TIE", "margin": "clear|narrow", "why": "…"},
  "worstFrame": {"side": "LEFT|RIGHT", "beat": 3, "flaw": "…"},
  "wouldShip": {"LEFT": "yes|no", "RIGHT": "yes|no"}
}
\`\`\`

\`wouldShip\` is independent of \`overall\`. One cut can win and both can still be \`no\`; say so when true.
A \`TIE\` is a real answer. Do not break one to look decisive.
`;
}
