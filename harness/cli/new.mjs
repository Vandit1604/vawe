// `vawe new <name>`: writes films/<name>/page.html (a valid starter), films/<name>/directions.html
// (three key frames side by side) and films/<name>/brief.md. brief.md takes the template's question
// bank with every default filled in and marked unanswered, then the measured-brief sections in the order of
// prompts/ANATOMY.md (harness/lib/measured-brief.mjs), a Directions section (three slots from three families,
// a picked line) after Task, and the template's own tagged sections: a section named like a skeleton section
// puts its text above that one's fields (so a table ends its section), the others follow as headings.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { UsageError } from './parse.mjs';
import { pickTemplate, readRouting, ROUTING, pickRecipe, readRecipes, RECIPES } from './route.mjs';
import { tasteLines } from '../lib/taste-steps.mjs';
import { ASPECTS } from '../../core/layout/aspects.js';
import { FAMILIES, FIELDS, brandAdvice } from '../lib/directions.mjs';
import { adviceBlock } from '../lib/advice.mjs';
import { measuredSections, DEFAULT_LENGTH, GUESS, DETAIL_KEYS, answeredDetails, unansweredDetails, questionCalls } from '../lib/measured-brief.mjs';

const STARTER_TEMPLATE = `<!doctype html>
<html data-aspect="{{aspect}}">
<head>
<meta charset="utf-8">
<meta name="duration" content="{{length}}">
<meta name="aspect" content="{{aspect}}">
<meta name="message" content="one thing to remember">
<title>{{title}}</title>
<!-- budget (taste/build/DIGEST.md); change any line on purpose:
  colours: 2 and one accent on one thing: --bg, --ink, --accent
  typefaces: 1, {{family}} (assets/{{font}}), the starter's pick; bundle the face the direction needs
  signature move: one, named here, used once
  thread: the one object, type line, colour or rhythm that carries through (rule thread)
  sound cues: quiet ticks at default gains, at most one soft swell (rule sound-swell)
  world turns: a new element, cut or ground every 1 to 2 s (rule world-turns) -->
<style>
  @font-face { font-family: "{{family}}"; src: url("assets/{{font}}") format("woff2"); font-weight: 100 900; }
  :root { --bg: #f4f1ea; --ink: #14161a; --accent: #2b5cff; --beat-1: 0s; --beat-2: {{beat2}}s; }
  html, body { margin: 0; height: 100%; background: var(--bg); overflow: hidden; }
  .world { position: absolute; inset: 0; box-sizing: border-box; display: grid; align-content: end; gap: calc(var(--vh) * 0.03);
           padding: 0 calc(var(--vw) * 0.07) calc(var(--vh) * 0.12); font-family: "{{family}}", sans-serif; }
  .w1 { background: var(--bg); color: var(--ink); }
  .w2 { background: var(--ink); color: var(--bg); }
  h1 { margin: 0; font-size: calc(var(--vh) * 0.14); font-weight: 700; line-height: 1; }
  .line { margin: 0; font-size: calc(var(--vh) * 0.09); }
  .facts { margin: 0; padding: 0; list-style: none; font-size: calc(var(--vh) * 0.09); font-weight: 600; line-height: 1.15; }
  .facts em { font-style: normal; color: var(--accent); }
  [data-aspect="9:16"] h1 { font-size: calc(var(--vw) * 0.13); }
</style>
<script type="module">
// core/motion/README.md: enter, leave, stagger and layer carry the house motion; change the options, keep the calls
import { layer, leave, stagger, EASE } from '../../core/motion/presets.js';
const root = document.documentElement;
const beat = (n) => parseFloat(getComputedStyle(root).getPropertyValue('--beat-' + n));
const end = parseFloat(document.querySelector('meta[name="duration"]').content);
const $ = (s) => document.querySelector(s);

layer($('h1'), $('.line'), { at: beat(1), band: 'professional' });
leave($('.line'), { end: beat(2) - 0.06 });
leave($('h1'), { end: beat(2) });

const turn = $('.w2');
turn.animate([{ clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0)' }], { delay: (beat(2) - 0.06) * 1000, duration: 300, easing: EASE.land, fill: 'both' });
stagger(document.querySelectorAll('.facts li'), { at: beat(2), band: 'energy', from: '0.6em 0' });

$('.w1').animate([{ scale: 1 }, { scale: 1.05 }], { duration: beat(2) * 1000, easing: EASE.glide, fill: 'both' });
turn.animate([{ scale: 1 }, { scale: 1.04 }], { delay: beat(2) * 1000, duration: (end - beat(2)) * 1000, easing: EASE.glide, fill: 'both' });
</script>
</head>
<body>
<main class="world w1">
  <h1>{{title}}</h1>
  <p class="line">one line that backs it up</p>
</main>
<section class="world w2">
  <ul class="facts"><li>first fact</li><li>second fact</li><li>the <em>one</em> that matters</li></ul>
</section>
</body>
</html>
`;

// Three key frames side by side, one per family, before any motion. Each column is a small working
// still the agent rewrites into its own direction; the judge reads them left to right as A, B, C.
const DIRECTIONS_TEMPLATE = `<!doctype html>
<html data-aspect="16:9">
<head>
<meta charset="utf-8">
<meta name="duration" content="1">
<title>{{title}}: three directions</title>
<style>
  :root { --sheet: #e4e1da; --label: #14161a; }
  html, body { margin: 0; height: 100%; background: var(--sheet); overflow: hidden; }
  body { box-sizing: border-box; display: grid; align-items: start; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2vw;
         padding: 7vh 3vw; align-content: center; font: 400 1.9vh/1.35 ui-monospace, Menlo, monospace; color: var(--label); }
  figure { margin: 0; display: grid; grid-template-rows: auto 1fr; align-content: start; gap: 1.6vh; min-width: 0; }
  .frame { aspect-ratio: {{ratio}}; position: relative; overflow: hidden; container-type: inline-size; }
  figcaption b { display: block; font-size: 1.15em; }

  /* A, type-led: the words are the picture */
  .a .frame { background: #efe9dc; color: #16151a; }
  .a h1 { position: absolute; left: 7%; bottom: 9%; margin: 0; max-width: 88%;
          font: 900 13cqw/0.88 "Iowan Old Style", "Palatino", Georgia, serif; letter-spacing: -0.03em; }
  .a h1 em { color: #d8432b; font-style: italic; }

  /* B, object-led: one real thing, lit from one side */
  .b .frame { background: #25211d; }
  .b .card { position: absolute; left: 30%; top: 16%; width: 46%; height: 64%; background: #f3efe6; border-radius: 1cqw;
             transform: rotate(-7deg); box-shadow: -3cqw 4cqw 6cqw rgb(0 0 0 / 0.55); }
  .b .card::before { content: ""; position: absolute; left: 9%; top: 8%; width: 36%; height: 8%; background: #2f7d5b; }
  .b .card p { position: absolute; left: 9%; right: 9%; bottom: 8%; margin: 0; color: #25211d; font: 600 6.5cqw/1.05 ui-monospace, Menlo, monospace; }

  /* C, graphic-led: colour fields in a rhythm */
  .c .frame { background: #f2c14e; }
  .c .bars { position: absolute; inset: 0; display: grid; grid-template-columns: 5fr 1fr 8fr 1fr 3fr; gap: 7%; padding: 0 0 0 6%; }
  .c .bars i { background: #2336c8; }
  .c .bars i:nth-child(2n) { background: #16151a; }
  .c h1 { position: absolute; right: 6%; top: 8%; margin: 0; color: #16151a; background: #f2c14e; padding: 0 2cqw;
          font: 800 8cqw/1 "Avenir Next Condensed", "Arial Narrow", sans-serif; text-transform: uppercase; }
</style>
</head>
<body>
<figure class="a"><div class="frame"><h1>{{title}} <em>now.</em></h1></div>
  <figcaption><b>A, type-led</b>serif set huge, one word in vermilion; move: the words fold in line by line</figcaption></figure>
<figure class="b"><div class="frame"><div class="card"><p>{{title}}</p></div></div>
  <figcaption><b>B, object-led</b>the real thing on a dark table (swap in a capture); move: it slides in and turns flat</figcaption></figure>
<figure class="c"><div class="frame"><div class="bars"><i></i><i></i><i></i><i></i><i></i></div><h1>{{title}}</h1></div>
  <figcaption><b>C, graphic-led</b>ultramarine and black bars on yellow; move: the bars wipe across on the beat</figcaption></figure>
</body>
</html>
`;

export function directionsPage({ aspect = '16:9', title = 'Say the one thing' }) {
  return DIRECTIONS_TEMPLATE.replaceAll('{{ratio}}', aspect.replace(':', ' / '))
    .replaceAll('{{title}}', title.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
}

function slotText(id, family) {
  const f = FAMILIES[family];
  return [`### ${id}`, '', `- family: ${f.label} (${f.hint})`, ...FIELDS.slice(1).map((k) => `- ${k}:`)].join('\n');
}

function directionsText(name) {
  return `## Directions

Three directions from three families before any motion; the first idea is the one every agent has.
Each slot: one sentence; the key frame (what is on screen at the one big moment); the palette (hex);
the typeface; the one signature move (a verb: fold, pour, slice, stamp); the thread (the one thing that
carries through the film). No two slots share a hue family, a typeface or a move, and at most one is
carried by a circle, orb, sun, ring or glow. Budget: 2 colours, 1 typeface, 1 signature move, 1 sound.

films/${name}/directions.html holds one working still per family: rewrite each into its slot's key frame.
Score the three (about 30 s): bin/vawe judge films/${name}/directions.html --fresh --stage stills --brief films/${name}/brief.md

${slotText('A', 'type')}

${slotText('B', 'object')}

${slotText('C', 'graphic')}

- picked: [A, B or C], because [one reason]`;
}

// Variable faces fetched by generators/media/fonts.mjs, none a house default. The film name picks one,
// so eight starters do not open on one face.
export const STARTER_FACES = [
  ['Fraunces.woff2', 'Fraunces'], ['BricolageGrotesque.woff2', 'Bricolage Grotesque'],
  ['HankenGrotesk.woff2', 'Hanken Grotesk'], ['Unbounded.woff2', 'Unbounded'], ['Manrope.woff2', 'Manrope'],
];

export function starterFace(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [font, family] = STARTER_FACES[h % STARTER_FACES.length];
  return { font, family };
}

export const STARTER = starterPage({});

export function starterPage({ length = DEFAULT_LENGTH, aspect = '16:9', title = 'Say the one thing', face = starterFace() }) {
  return STARTER_TEMPLATE.replaceAll('{{length}}', String(length)).replaceAll('{{aspect}}', aspect)
    .replaceAll('{{font}}', face.font).replaceAll('{{family}}', face.family)
    .replaceAll('{{beat2}}', String(+(length * 0.5).toFixed(2))).replaceAll('{{title}}', title.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
}

export const UNANSWERED = '[unanswered: default taken]';

const QUESTION = /^\*\*(.+?)\*\*:\s+(.+?)\s+Default:\s+(.+?)\s+Why:\s+(.+)$/;

// A question bank is the template's `## Questions` list: `N. **key**: question Default: value Why: reason`,
// one item per line or wrapped onto indented lines. Returns [] when the template has no bank.
export function parseQuestions(markdown) {
  const section = markdown.split(/^## /m).find((s) => s.startsWith('Questions'));
  if (!section) return [];
  const items = [];
  for (const line of section.split('\n').slice(1)) {
    const start = line.match(/^\d+\.\s+(.*)$/);
    if (start) items.push(start[1]);
    else if (/^\s+\S/.test(line) && items.length) items[items.length - 1] += ' ' + line.trim();
  }
  return items.map((item) => {
    const m = item.match(QUESTION);
    if (!m) throw new UsageError(`question is not "**key**: question Default: value Why: reason": ${item}`);
    return { key: m[1], question: m[2], default: m[3].replace(/\.$/, ''), why: m[4] };
  });
}

// The template's tagged sections in file order (<direction> ... </direction>), the inputs tag excluded.
export function parseSections(markdown) {
  const sections = [];
  for (const m of markdown.matchAll(/^<([a-z]+)>\n([\s\S]*?)^<\/\1>/gm)) {
    if (m[1] !== 'inputs') sections.push({ name: m[1], body: m[2].trim() });
  }
  return sections;
}

// Answers given as flags go in as answered lines, never as a default with the unanswered marker.
function inputLines(questions, answers) {
  const given = { ...answers };
  if (answers.length || answers.aspect) given.platform = [answers.aspect, answers.length].filter(Boolean).join(', ');
  const lines = questions.map((q) => (given[q.key.toLowerCase()] ? `- ${q.key}: ${given[q.key.toLowerCase()]}` : `- ${q.key}: ${q.default} ${UNANSWERED}`));
  const known = new Set(questions.map((q) => q.key.toLowerCase()));
  const extra = Object.entries(answers).filter(([k]) => !known.has(k)).map(([k, v]) => `- ${k}: ${v}`);
  return [...extra, ...lines];
}

const recipeLine = (recipe) => `chain to start from: ${RECIPES}, "## ${recipe.heading}" (${recipe.why}); copy it, then change two moves`;

const SKELETON = [['task', 'Task'], ['directions'], ['look', 'Look'], ['swap', 'Keep and swap'], ['spec', 'Spec'], ['acceptance', 'Acceptance'], ['gates', 'Gates'], ['pitfalls', 'Pitfalls'], ['deliver', 'Deliver']];

const heading = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;

function briefText(name, templateRel, questions, sections, answers, measured, recipe = null) {
  const lines = inputLines(questions, answers);
  const inputs = questions.length || lines.length
    ? lines.join('\n')
    : '- the template has no question bank: write the promise, the moments and the platform';
  const own = Object.fromEntries(sections.map((s) => [s.name, s.body.replaceAll('<name>', name)]));
  const skeleton = SKELETON.filter(([key]) => key === 'directions' || measured.sections[key]).map(([key, title]) => (
    key === 'directions' ? directionsText(name) : `## ${title}\n\n${own[key] ? `${own[key]}\n\n` : ''}${measured.sections[key]}`));
  const rest = sections.filter((s) => !SKELETON.some(([key]) => key === s.name))
    .map((s) => `## ${heading(s.name)}\n\n${own[s.name]}`);
  const tail = `## First draft\n\n${recipe ? `${recipeLine(recipe)}.\n\n` : ''}Taste: taste/build/DIGEST.md (the full card is for the judge). Moves to copy: prompts/moves/README.md. Sound: quiet ticks at default gains, at most one soft swell (rule sound-swell).\n\nbin/vawe dev films/${name}/page.html\n`;
  const head = `# ${name}: brief\n\nTemplate: ${templateRel}. Shape: prompts/ANATOMY.md. Replace each ${UNANSWERED} with the answer, or keep the default. Replace each ${GUESS} with a measured value or your own choice.\n\n## Inputs\n\n${inputs}`;
  return [head, ...skeleton, ...rest, tail].join('\n\n');
}

function readAnswers({ length, aspect }) {
  if (length !== undefined && !(length > 0)) throw new UsageError(`--length must be a number of seconds above 0, got ${length}`);
  if (aspect !== undefined && !ASPECTS[aspect] && !/^\d+:\d+$/.test(aspect)) throw new UsageError(`--aspect "${aspect}" must be one of ${Object.keys(ASPECTS).join(' ')} or a W:H ratio`);
}

const DETAIL_LINE = /^\s*(?:[-*]\s+|\d+\.\s+)?([a-z]+)\s*:\s*(.+?)\s*$/;

function checkKey(key, where) {
  if (!DETAIL_KEYS.includes(key)) throw new UsageError(`${where}: "${key}" is not a detail; valid: ${DETAIL_KEYS.join(' ')}`);
}

/** The details from an --answers file (markdown or `key: value` lines) and repeated --detail key=value. */
export function readDetails({ answers, detail = [] }) {
  const details = {};
  if (answers) {
    for (const line of fs.readFileSync(answers, 'utf8').split('\n')) {
      const m = line.match(DETAIL_LINE);
      if (m && DETAIL_KEYS.includes(m[1])) details[m[1]] = m[2];
    }
  }
  for (const item of [detail].flat()) {
    const [key, ...value] = item.split('=');
    checkKey(key, '--detail');
    if (!value.length || !value.join('=').trim()) throw new UsageError(`--detail needs key=value, got "${item}"`);
    details[key] = value.join('=').trim();
  }
  return details;
}

// A length in seconds and an aspect written in the format answer, else in the request; flags win over both.
function formatFrom(text = '') {
  const s = text.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds?)\b/);
  const a = text.match(/\b(\d+:\d+)\b/);
  return { length: s ? Number(s[1]) : undefined, aspect: a && (ASPECTS[a[1]] || /^\d+:\d+$/.test(a[1])) ? a[1] : undefined };
}

function askedFormat(details, request) {
  const [format, ask] = [formatFrom(details.format), formatFrom(request)];
  return { length: format.length ?? ask.length, aspect: format.aspect ?? ask.aspect };
}

const answerCommand = (name, request, from) => `bin/vawe new ${name} --request ${JSON.stringify(request ?? '<the ask>')}${from ? ` --from ${from}` : ''}`;

/** The open details as AskUserQuestion calls; writes nothing. */
export function questionsJson(name, { request, from, details = {}, length, aspect }) {
  const format = askedFormat(details, request);
  const answered = answeredDetails({ request, given: details, length: length ?? format.length, aspect: aspect ?? format.aspect });
  return { calls: questionCalls(unansweredDetails(answered), request), answer_with: `${answerCommand(name, request, from)} --answers <file>` };
}

export function askLines(name, request, from, open) {
  const lines = ['agents: run with --questions-json and ask with AskUserQuestion', '', `vawe new: ${open.length} details needed before a good brief`, '',
    'Nothing is written yet. Answer these, most film-changing first. Skip an optional one to take a guess.', ''];
  open.forEach((d, i) => {
    lines.push(`${i + 1}. ${d.key}${d.required ? '' : ' (optional)'}: ${d.question}`, `   why: ${d.why}`, `   example: ${d.example}`);
  });
  const base = answerCommand(name, request, from);
  lines.push('', 'Put the answers in a file, one `key: value` line each, then run:', `  ${base} --answers <file>`,
    'or give each one on the command line:', `  ${base} --detail ${open[0].key}="..." --detail ${open[1]?.key ?? open[0].key}="..."`,
    'For an unattended run that guesses instead, add --defaults.');
  return lines;
}

function chooseTemplate(root, { from, request, name, title, length }) {
  if (from) return { template: path.resolve(from), route: null };
  const route = pickTemplate({ request, name, title, length }, readRouting(root));
  const recipe = pickRecipe({ request, name, title, length }, readRecipes(root));
  return { template: path.join(root, route.template), route: recipe ? { ...route, recipe } : route };
}

// The starter's face goes into the film's own assets folder: a film carries its files.
function copyFace(root, dir, face) {
  const src = path.join(root, 'assets', 'fonts', face.font);
  if (!fs.existsSync(src)) spawnSync(process.execPath, [path.join(root, 'generators', 'media', 'fonts.mjs')], { cwd: root, stdio: 'inherit' });
  if (!fs.existsSync(src)) throw new UsageError(`${path.relative(root, src)} is missing and the fetch failed; run: node generators/media/fonts.mjs`);
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.copyFileSync(src, path.join(dir, 'assets', face.font));
}

export function newFilmLines(name, { page, route, title, guesses = [], asked, request, from, defaulted = [] }) {
  if (asked) return askLines(name, request, from, asked);
  const lines = [`wrote ${page}, films/${name}/brief.md and films/${name}/directions.html`];
  if (defaulted.length) lines.push(`--defaults: details guessed, not asked: ${defaulted.join(', ')}`);
  if (guesses.length) lines.push(`guessed, each marked "${GUESS}" in brief.md: ${guesses.join(', ')}`);
  if (route) {
    lines.push(`template: ${route.template} (${route.type}: ${route.why})`);
    if (route.recipe) lines.push(recipeLine(route.recipe));
    lines.push(`another film type: delete films/${name}, then bin/vawe new ${name} --from prompts/<template>.md (rows in ${ROUTING}) or --request "<the ask>" --length <s>`);
  }
  const advice = [
    `directions: films/${name}/directions.html holds one starter still per family (type, object, graphic); fill the three slots in brief.md, then pick one`,
    ...brandAdvice(`${name} ${title ?? ''}`),
  ];
  return [...lines, '', 'rules for authors: taste/build/DIGEST.md; the judge scores taste/build/CARD.md; every rule is in taste/README.md', '', ...tasteLines('concept'), '',
    ...adviceBlock(advice, '(advice only: the film was written)'), '', `next: fill brief.md, then bin/vawe dev ${page}`];
}

/**
 * Writes the film folder; returns { page, route, template, length, answered } (route is null when --from chose the template).
 * When a required detail is unanswered and `defaults` is off it writes nothing and returns { asked }.
 */
export function newFilm(name, { from, root, length, aspect, title, request, details = {}, defaults = false }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new UsageError(`film name "${name}" must be lowercase letters, digits and dashes`);
  const dir = path.join(root, 'films', name);
  if (fs.existsSync(path.join(dir, 'page.html'))) throw new UsageError(`${path.relative(root, dir)}/page.html already exists`);
  const format = askedFormat(details, request);
  length ??= format.length;
  aspect ??= format.aspect;
  readAnswers({ length, aspect, title });
  const answered = answeredDetails({ request, given: details, length, aspect });
  const open = unansweredDetails(answered);
  if (!defaults && open.some((d) => d.required)) return { asked: open, request, from };
  const { template, route } = chooseTemplate(root, { from, request, name, title, length });
  const markdown = fs.readFileSync(template, 'utf8');
  const questions = parseQuestions(markdown);
  length ??= formatFrom(questions.find((q) => /^length$/i.test(q.key))?.default).length;
  const face = starterFace(name);
  copyFace(root, dir, face);
  const given = Object.fromEntries(Object.entries({ length, aspect, title }).filter(([, v]) => v !== undefined));
  fs.writeFileSync(path.join(dir, 'page.html'), starterPage({ ...given, face }));
  fs.writeFileSync(path.join(dir, 'directions.html'), directionsPage(given));
  const answers = {};
  if (request !== undefined) answers.request = request;
  if (length !== undefined) answers.length = `${length} s`;
  if (aspect !== undefined) answers.aspect = aspect;
  if (title !== undefined) answers.title = title;
  const sections = parseSections(markdown);
  const measured = measuredSections({ name, request, title, length, face, reference: sections.some((s) => s.name === 'swap'), details, answered });
  fs.writeFileSync(path.join(dir, 'brief.md'), briefText(name, path.relative(root, template), questions, sections, answers, measured, route?.recipe));
  return { page: `films/${name}/page.html`, route, title, guesses: measured.guesses, defaulted: defaults ? open.map((d) => d.key) : [], template: path.relative(root, template), length, answered: [...answered] };
}
