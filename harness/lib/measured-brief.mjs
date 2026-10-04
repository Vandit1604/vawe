// The measured-brief skeleton `vawe new` writes into brief.md (prompts/ANATOMY.md): Task, Look, Spec,
// Acceptance, Gates, Pitfalls, Deliver, and Keep and swap for a reference film. A field the request does not
// answer holds a stated guess that ends in GUESS. Pure: no I/O.

export const GUESS = '(guess: change me)';
export const DEFAULT_LENGTH = 4;
export const DEFAULT_TITLE = 'Say the one thing';

// The details a good brief needs, most film-changing first. `vawe new` asks the unanswered ones,
// the vawe-brief skill asks them of a person, ANATOMY.md names them: this list is the only copy.
// A `required` detail stops `vawe new` until answered (or --defaults). `seen` is the request wording
// that counts as an answer; when unsure a detail is unanswered.
export const DETAILS = [
  { key: 'subject', header: 'Subject', required: true, question: 'What is the product or subject, and who is it for?',
    why: 'every shot, word and colour follows from the real thing; a thin subject gives a generic film',
    example: 'Argus, a log search tool for on-call engineers at small SaaS teams',
    seen: /https?:\/\/|\bwww\.|\bfor\b.{0,60}\b(teams?|engineers?|developers?|designers?|users?|customers?|founders?|marketers?)\b|\b(that|which) (helps?|lets?|turns?|makes?)\b/ },
  { key: 'message', header: 'Message', required: true, question: 'What is the one message, and what is the one big moment?',
    why: 'the film is built to land one thing, and the quiet before the big moment is timed from it',
    example: 'message: find the bug in seconds; big moment: the one red line in 10 million logs lights up',
    seen: /\b(message|tagline|big moment|spectacle|hook)\b|"[^"]{6,}"/ },
  { key: 'show', header: 'Show', required: true, question: 'What must the viewer see working: the product UI, a number or a process?',
    why: 'a film that shows the product working beats a slogan on a plain ground',
    example: 'the search box, a result list filling in, and the count "10M lines in 0.3 s"',
    seen: /\b(shows?|showing|ui|dashboard|screens?|captures?|numbers?|metrics?|workflow|steps?)\b/ },
  { key: 'look', header: 'Look', required: true, question: 'What is the look: a reference film, site or brand, or colours, typeface, light or dark?',
    why: 'the look is the largest score lever; with no anchor every film drifts to the same default',
    example: 'dark ground, one signal-red accent, a monospace face, like linear.app',
    seen: /#[0-9a-f]{3,6}\b|\b(dark|light) (mode|ground|theme)\b|\b(palette|colou?rs?|typeface|fonts?|serif|sans|style|reference)\b/ },
  { key: 'format', header: 'Format', question: 'How long, and which aspect?',
    why: 'length sets the beat count and aspect sets the layout; both change every frame',
    example: '20 s, 16:9',
    seen: /\b\d+(\.\d+)?\s*(s|sec|secs|seconds?)\b|\b\d+:\d+\b|\b(vertical|square|landscape)\b/ },
  { key: 'family', header: 'Family', question: 'Which family fits: type-led, object-led, colour-led or graphic-led?',
    why: 'it picks which of the three directions leads; skip it if unsure',
    example: 'object-led',
    seen: /\b(type|object|colou?r|graphic)-led\b|\b(kinetic type|typographic)\b/ },
  { key: 'assets', header: 'Assets', question: 'Which real assets exist: captures, logo, photos? Or should the film invent them?',
    why: 'real captures beat invented UI, and a missing logo changes the ending',
    example: 'logo.svg and three screen recordings; invent nothing else',
    seen: /\b(captures?|logo|photos?|footage|screenshots?|invent)\b/ },
  { key: 'ending', header: 'Ending', question: 'How does it end: the brand, a call to action, a URL?',
    why: 'the last second is what the viewer keeps',
    example: 'the Argus wordmark, then "argus.dev"',
    seen: /\b(cta|call to action|url|ending|sign-?off|ends? (on|with))\b/ },
];

const asOptions = (pairs) => pairs.map(([label, description]) => ({ label, description }));

const FIXED_OPTIONS = {
  look: asOptions([['Light and calm', 'a light ground, soft ink, one cobalt accent'], ['Dark and precise', 'a dark ground, sharp type, one signal accent'],
    ['Match a reference', 'I give a film, site or brand to copy'], ['Use brand colours', "the brand's own palette and typeface"]]),
  format: asOptions([['24 s launch 16:9 (Recommended)', 'room for four beats and a real moment'], ['6 s sting 16:9', 'one idea and an ending'],
    ['15 s vertical 9:16', 'for a phone feed'], ['30 s explainer 16:9', 'a process told step by step']]),
  family: asOptions([['Type-led', 'the words are the picture'], ['Object-led', 'one real thing, lit and moving'],
    ['Colour-led', 'fields of colour in a rhythm'], ['Graphic-led', 'shapes and diagrams carry it']]),
  assets: asOptions([['Invent everything (Recommended)', 'the film draws its own UI and shapes'], ['I have screen captures', 'real recordings go in the film'],
    ['Logo only', 'a logo file, nothing else']]),
  ending: asOptions([['Brand lockup', 'the logo and name hold at the end'], ['Call to action', 'one line that asks for the next step'],
    ['Website URL', 'the address stays on screen']]),
};

const PRODUCT_NAME = /\bfor\s+([A-Z][\w.-]*)/;

// Choices for an AskUserQuestion call. Open answers (subject, message, show) take guesses from the
// request when it names the product; the person can always pick "Other" and type.
export function optionsFor(detail, request = '') {
  if (FIXED_OPTIONS[detail.key]) return FIXED_OPTIONS[detail.key];
  const name = request.match(PRODUCT_NAME)?.[1];
  if (detail.key === 'subject') {
    return asOptions([
      [name ? `${name} for developers (Recommended)` : 'A developer tool (Recommended)', 'engineers are the viewers'],
      [name ? `${name} for teams` : 'A team product', 'managers and teams are the viewers'],
      [name ? `${name} for consumers` : 'A consumer app', 'everyday people are the viewers'],
    ]);
  }
  if (detail.key === 'message') {
    const who = name ?? 'It';
    return asOptions([[`${who} saves you time (Recommended)`, 'the big moment is the time saved, shown as a number'],
      [`${who} is simple`, 'the big moment is one clear action'], [`${who} is trusted`, 'the big moment is proof, such as a count']]);
  }
  return asOptions([['The product UI working (Recommended)', 'the real screen does the task'], ['One proof number', 'a single big figure counts up'],
    ['A before and after', 'the old way, then the new way']]);
}

const MAX_QUESTIONS_PER_CALL = 4;

/** The open details as AskUserQuestion calls of at most 4 questions each, required details first. */
export function questionCalls(open, request) {
  const ordered = [...open.filter((d) => d.required), ...open.filter((d) => !d.required)];
  const questions = ordered.map((d) => ({ question: d.question, header: d.header, multiSelect: false, options: optionsFor(d, request) }));
  const calls = [];
  for (let i = 0; i < questions.length; i += MAX_QUESTIONS_PER_CALL) calls.push({ questions: questions.slice(i, i + MAX_QUESTIONS_PER_CALL) });
  return calls;
}

export const DETAIL_KEYS = DETAILS.map((d) => d.key);

/** The keys that the request wording or the given values already answer. */
export function answeredDetails({ request = '', given = {}, length, aspect }) {
  const answered = new Set(Object.keys(given));
  for (const d of DETAILS) if (d.seen.test(request)) answered.add(d.key);
  if (length !== undefined || aspect !== undefined) answered.add('format');
  return answered;
}

export const unansweredDetails = (answered) => DETAILS.filter((d) => !answered.has(d.key));

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

const IN_WHAT = 'named in what';
const SECONDS = /(\d+(?:\.\d+)?)\s*s\b/;

function taskLines({ request, title, length, details, answered }, guess) {
  const spectacle = details.message?.match(SECONDS)?.[1];
  const extra = ['show', 'family', 'assets', 'ending'].filter((k) => answered.has(k)).map((k) => `- ${k}: ${details[k] ?? IN_WHAT}`);
  return [
    `- what: ${details.subject ?? request ?? guess('what', `a ${length} s film titled "${title}"`)}`,
    `- for: ${answered.has('subject') ? IN_WHAT : guess('for', 'people who see it once, muted, in a feed')}`,
    `- message: ${details.message ?? (answered.has('message') ? IN_WHAT : guess('message', title))}`,
    `- spectacle: ${spectacle ? `${spectacle} s` : guess('spectacle', `${secs(length * 0.6)} s`)}`,
    ...extra,
  ].join('\n');
}

/** The starter's grey stand-ins: no house palette, and dev names the palette dial unchosen until the page picks one. */
export const PLACEHOLDER = { ground: '#8c8c8c', ink: '#1c1c1c' };

function lookLines({ face, details, answered }, guess) {
  return [
    ...(answered.has('look') ? [`- look: ${details.look ?? IN_WHAT}`] : []),
    `- ground: ${guess('ground', `${PLACEHOLDER.ground}, the starter's grey placeholder: choose from the palette dial`)}`,
    `- ink: ${guess('ink', `${PLACEHOLDER.ink}, the starter's placeholder`)}`,
    `- accent: ${guess('accent', 'none yet: at most one, on one thing')}`,
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
      [[`${cell(title)} ${GUESS}`, 's1', '0', '0.6', '10', '7', '60', '700', PLACEHOLDER.ink]]),
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

const PITFALLS = `Taste pitfalls: taste/build/DIGEST.md (\`bin/vawe dev\` prints them).`;

const deliverText = (name) => `- out/${name}.mp4 from \`bin/vawe ship\`.
- This brief, with Spec edited to what you built and the Acceptance table filled with the number you
  measured next to each target.
- The judge report path for the final.`;

/**
 * The skeleton's sections as text, and the names of the fields that hold a guess.
 * `swap` is present only for a reference film.
 */
export function measuredSections({ name, request, title = DEFAULT_TITLE, length = DEFAULT_LENGTH, face, reference = false, details = {}, answered = new Set() }) {
  const guesses = [];
  const guess = (key, value) => { guesses.push(key); return `${value} ${GUESS}`; };
  const input = { request, title, length, face, details, answered };
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
