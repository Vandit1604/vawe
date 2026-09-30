// The measured-brief skeleton `vawe new` writes into brief.md (prompts/ANATOMY.md): Task, Look, Spec,
// Acceptance, Gates, Pitfalls, Deliver, and Keep and swap for a reference film. A field the request does not
// answer holds a stated guess that ends in GUESS. Pure: no I/O.

export const GUESS = '(guess: change me)';
export const DEFAULT_LENGTH = 4;
export const DEFAULT_TITLE = 'Say the one thing';

export const ACCEPTANCE = [
  ['frozen runs of 3+ frames inside a shot', '0'],
  ['jerky steps', 'under 5'],
  ['jumps not at a declared cut', '0'],
  ['still windows over 0.5 s outside a declared hold', '0'],
  ['near-identical tail tiles', '4 or fewer'],
  ['text cap height', '6% or more'],
  ['text contrast', '4.5:1 or more'],
  ['text collisions', '0'],
  ['read hold per line', 'max(1.2 s, words/3 s) or more'],
  ['exits shorter than entrances', 'all'],
  ['word appear time vs spec', 'within 0.05 s'],
  ['word cap height and position vs spec', 'within 1% of frame'],
  ['cuts vs spec', 'within 1 frame'],
  ['loudness', '-24 to -16 LUFS'],
  ['peak', '-10 dBFS or lower'],
  ['judge: each storyboard frame as beautiful as the anchor, full size', 'YES'],
];

const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const cell = (text) => String(text).replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const secs = (n) => +n.toFixed(2);

function taskLines({ request, title, length }, guess) {
  return [
    `- what: ${request ?? guess('what', `a ${length} s film titled "${title}"`)}`,
    `- for: ${guess('for', 'people who see it once, muted, in a feed')}`,
    `- message: ${guess('message', title)}`,
    `- spectacle: ${guess('spectacle', `${secs(length * 0.6)} s`)}`,
  ].join('\n');
}

function lookLines({ face }, guess) {
  return [
    `- ground: ${guess('ground', '#f4f1ea')}`,
    `- ink: ${guess('ink', '#14161a')}`,
    `- accent: ${guess('accent', '#2b5cff')}`,
    `- typeface: ${guess('typeface', `${face.family}, weight 700`)}`,
    `- cap height: ${guess('cap height', '10% of frame height for the headline, never under 6%')}`,
    `- surface: ${guess('surface', 'flat fill, 1 px edge rgba(20,22,26,0.12), no shadow')}`,
  ].join('\n');
}

function specText({ title, length }) {
  const cut = secs(length * 0.5);
  return [
    '### Shots',
    table(['id', 'start s', 'end s', 'the viewer notices', 'move in', 'move out', 'camera'],
      [[`s1 ${GUESS}`, '0', cut, cell(title), 'layer in', 'leave 0.22 s', 'static']]),
    '### Words',
    table(['text', 'shot', 'appear s', 'settle s', 'cap %', 'x %', 'y %', 'weight', 'colour'],
      [[`${cell(title)} ${GUESS}`, 's1', '0', '0.6', '10', '7', '60', '700', '#14161a']]),
    '### Objects',
    table(['id', 'selector', 'shot', 'in s', 'settle s', 'out s'], [[`o1 ${GUESS}`, 'h1', 's1', '0', '0.6', String(cut)]]),
  ].join('\n\n');
}

const swapText = () => `${table(['item', 'keep or swap', 'what replaces it'], [
  ['light map', `KEEP ${GUESS}`, 'nothing'],
  ['strings', 'SWAP', 'our own copy'],
  ['captures', 'SWAP', 'our own captures'],
])}\n\nMark every line of the reference's SPEC.md KEEP or SWAP. An unmarked line is a bug.`;

const gatesText = (name) => `Do the gates in order. A failed gate sends you back to the one before it.

1. Stills: three directions in directions.html, then the five frames that define the look.
   \`bin/vawe judge films/${name}/directions.html --fresh --stage stills --brief films/${name}/brief.md\`
   Each frame must be as beautiful as the anchor at full size.
2. Component labs: the 4 to 6 hardest pieces (a light, a material, a type move, a real UI), each alone
   on its own page films/${name}/labs/<piece>.html at 3 sizes (\`bin/vawe dev <lab> --aspect 16:9\`, then
   \`1:1\`, then \`9:16\`). Fix a piece in its lab before it goes in the film.
3. Draft loop: \`bin/vawe dev films/${name}/page.html\`, fix, repeat until every Acceptance row is green.
   Then \`bin/vawe critique films/${name}/page.html\` in a session that did not write the page.
4. Final: \`bin/vawe ship films/${name}/page.html\`, then \`bin/vawe ship --status films/${name}/page.html --wait\`.`;

const PITFALLS = `Read the lines \`bin/vawe dev\` prints; they come from engine-doctrine/TASTE-CARD-DIGEST.md. Also:

- Attractors: the hero comes from the picked direction, never from the card's Attractors list.
- Template devices: light beam, lens streak, sheen band, accent bar, rule line. One per film.
- One move per beat at one speed reads as a template: overlap a slower second move.
- A small tagline (under 6% cap height) fails the Acceptance table and the judge.
- A crossfade between two busy frames goes muddy. Cut, or wipe on the motion.
- A dead tail: something visible moves in the last second.
- The judge varies by about 1 point per axis. After 3 rounds that flip one note, keep the value you
  measured and go on.`;

const deliverText = (name) => `- out/${name}.mp4 from \`bin/vawe ship\`.
- This brief, with Spec edited to what you built and the Acceptance table filled with the number you
  measured next to each target.
- The judge report path for the final.`;

/**
 * The skeleton's sections as text, and the names of the fields that hold a guess.
 * `swap` is present only for a reference film.
 */
export function measuredSections({ name, request, title = DEFAULT_TITLE, length = DEFAULT_LENGTH, face, reference = false }) {
  const guesses = [];
  const guess = (key, value) => { guesses.push(key); return `${value} ${GUESS}`; };
  const input = { request, title, length, face };
  const sections = {
    task: taskLines(input, guess),
    look: lookLines(input, guess),
    spec: specText(input),
    acceptance: table(['metric', 'target'], ACCEPTANCE),
    gates: gatesText(name),
    pitfalls: PITFALLS,
    deliver: deliverText(name),
  };
  guesses.push('shots', 'words', 'objects');
  if (reference) {
    sections.swap = swapText();
    guesses.push('keep and swap');
  }
  return { sections, guesses };
}
