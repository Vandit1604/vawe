// quality/gates/rubric.mjs: the criteria a vision judge is scored against.
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
  // DIMENSION 6 USED TO READ "crafted density; not a word-on-empty-space slide", which instructs the
  // judge to score density UP. That is length bias written into the rubric: a judge already leans that
  // way by default, scoring the longer, busier answer higher whether or not it is better. And CLAUDE.md
  // spends a whole section arguing the opposite case (active versus passive whitespace, "IS THE EMPTY
  // PART OF THE FRAME DOING A JOB?"), noting that no gate sees it. The rubric saw it and scored against
  // it. Asked as a question about whether the emptiness is WORKING, both a dense frame and a spare one
  // can pass, and neither passes by being what it is.
  '**Produced-not-generated**: every element in the frame is doing a job, and so is the empty part.\n   A dense frame where two elements repeat the same point FAILS. A spare frame whose emptiness\n   isolates the subject PASSES. Ask what the space is doing, never how much of it there is.',
  '**Value**: this frame teaches/proves/delights something no other frame does.',
  // Every dimension above grades ONE frame. A ground flip only exists BETWEEN two frames: a beat that
  // whites out then blacks out reads fine on each still in isolation, which is exactly why nothing
  // caught it before quality/gates/ground-arc.mjs measured it pre-render. That gate answers "is this
  // flip DECLARED" against the scene's own schedule; it cannot answer whether the CUT ITSELF reads as
  // a jarring flash across the sheet, which needs an eye on the sequence. Ask it here instead.
  '**Ground continuity**: where the background changes light/dark between adjacent frames, is it a\n'
  + '   planned beat change carried across the join (a crossfade, a colour that follows the content), or\n'
  + '   does it flash cold from one still to the next with nothing bridging it? A carried change PASSES\n'
  + '   even when it happens more than once; an unbridged flash FAILS regardless of how brief it is.',
];

const numbered = (list) => list.map((d, i) => `${i + 1}. ${d}`).join('\n');

// The eye is not the first check to look at these pixels. quality/audit.mjs and sweep-static.mjs
// already measured 18 kinds of defect against this SAME render before this rubric was written; a
// finding here is a FACT about the frames, not a lead to re-verify by squinting. Grouped by severity so
// a HARD (ship-blocking) finding cannot hide among warnings, and a waived one still shows, the same
// "still printed, tagged, and counted separately" rule audit.mjs itself holds for a waiver.
function measuredSection(findings) {
  if (!findings.length) {
    return `## Measured findings (quality/audit.mjs + sweep-static.mjs)\nNone. Both scripts ran against this render and found nothing to report.\n`;
  }
  const line = (r) => `- \`${r.code}\` [${r.severity === 'error' ? 'HARD' : r.severity.toUpperCase()}]` +
    `${r.waived ? ' (waived)' : ''}: ${r.summary}`;
  return `## Measured findings (quality/audit.mjs + sweep-static.mjs)
These were measured on the rendered pixels, not guessed. Treat each as true unless the frame you are
looking at plainly disagrees; a waived one is a known, deliberate exception, not a bug to re-report.

${findings.map(line).join('\n')}
`;
}

export function craftRubric({ name, frames, landscape, brand, dir = '/tmp/judge', findings = [] }) {
  return `# Judge sheet, ${name} (${frames} key frames, ${landscape ? 'landscape' : 'portrait'})

READ \`${dir}/sheet.png\` and score EACH labeled frame against the rubric below. Be adversarial:
your job is to catch what the static gates can't SEE. Do NOT rationalize a flaw you notice, flag it.

## The brand's house style (the scoring key)
${houseStyleFor(brand)}

${measuredSection(findings)}
## Craft rubric: score each frame 1-5 per dimension, name the issue + the fix
${numbered(DIMENSIONS)}

## Return this verdict (structured)
- **Per frame:** \`beat N, <worst dimension>: <the issue> → <the fix>\` (only frames with a real problem).
- **Worst frame overall** + why.
- **Verdict:** \`PASS\` only if every frame clears every dimension. Otherwise \`FIX\` + the prioritized list.
Rule: if your eye catches it, it's a FIX. "Renders fine" is not PASS.

## You may say you cannot tell, and you must when it is true
A still cannot carry every dimension. Speed, direction, easing and whether a background is alive are
properties of MOTION, and a sheet of key frames is not motion: a background was once judged "matched"
on one still and was, running, 2.5x too fast with folds half the size. If a dimension asks something
these frames cannot answer, write \`CANNOT TELL\` for it and name the evidence that would settle it
(a 4-frame strip across the beat, the seam frames, the rendered mp4), instead of guessing.

\`CANNOT TELL\` is a real answer and costs you nothing. A guess dressed as a finding costs the author a
render, and it arrives in the same shape as a true one, so nobody downstream can tell them apart. If
every dimension a frame CAN answer is clear and the rest are \`CANNOT TELL\`, the frame is not a FIX.
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

// Guarded the same way motion-floor.mjs's self-test is: importing this module for its exports must
// never run a CLI-only check.
if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes('--self-test')) {
  // The real defect this guards: ground-arc.mjs measures a flip between frames, which no per-frame
  // dimension above can see. Adding the dimension without checking it landed would ship a rubric that
  // still cannot ask the question.
  if (!DIMENSIONS.some((d) => /Ground continuity/.test(d))) {
    console.error('rubric must carry a Ground continuity dimension'); process.exit(1);
  }
  const sheet = craftRubric({ name: 'x.mp4', frames: 3, landscape: true, dir: '/tmp/judge' });
  if (!/Ground continuity/.test(sheet)) { console.error('craftRubric output must include Ground continuity'); process.exit(1); }

  // abRubric drops indices 3/4 (brand/asset fidelity) unless a brand is named. Appending the new
  // dimension at the END must not shift those indices: this is the case that would silently break if
  // a future edit inserted the new dimension in the middle instead of appending it.
  const noBrand = abRubric({ rows: 2, landscape: true, dir: '/tmp/judge' });
  if (/Brand fidelity/.test(noBrand) || /Asset fidelity/.test(noBrand)) {
    console.error('abRubric with no brand must still drop Brand/Asset fidelity'); process.exit(1);
  }
  if (!/Ground continuity/.test(noBrand)) { console.error('abRubric must keep Ground continuity even with no brand'); process.exit(1); }

  console.log('  ✓ rubric self-test: Ground continuity is present in both craftRubric and abRubric,');
  console.log('    and appending it did not shift the brand/asset-fidelity exclusion in abRubric');
  process.exit(0);
}
