// `vawe new <name>`: writes films/<name>/page.html (a valid starter), films/<name>/directions.html
// (three key frames side by side) and films/<name>/brief.md. brief.md takes the template's question
// bank with every default filled in and marked unanswered, a Directions section (three directions,
// two reference stills, a budget), then the template's tagged sections as headings.
import fs from 'node:fs';
import path from 'node:path';
import { UsageError } from './parse.mjs';
import { pickTemplate, readRouting, ROUTING } from './route.mjs';
import { tasteLines } from '../lib/taste-steps.mjs';
import { ASPECTS } from '../../core/layout/aspects.js';

const STARTER_TEMPLATE = `<!doctype html>
<html data-aspect="{{aspect}}">
<head>
<meta charset="utf-8">
<meta name="duration" content="{{length}}">
<meta name="aspect" content="{{aspect}}">
<meta name="message" content="one thing to remember">
<title>{{title}}</title>
<!-- budget (engine-doctrine/TASTE-CARD.md); change any line on purpose:
  colours: 2 and one accent on one thing: --bg, --ink, --accent
  typefaces: 1, {{family}} (assets/{{font}}), the starter's pick; bundle the face the direction needs
  signature move: one, named here, used once
  thread: the one object, type line, colour or rhythm that carries through (rule 3)
  sound cues: quiet ticks at default gains, at most one soft swell (rule 13)
  world turns: a new element, cut or ground every 1 to 2 s (rule 2) -->
<style>
  @font-face { font-family: "{{family}}"; src: url("assets/{{font}}") format("woff2"); font-weight: 100 900; }
  :root { --bg: #f4f1ea; --ink: #14161a; --accent: #2b5cff; --beat-1: 0s; --beat-2: {{exit}}s; --enter: 0.6s; --exit: 0.35s; }
  html, body { margin: 0; height: 100%; background: var(--bg); overflow: hidden; }
  body { box-sizing: border-box; display: grid; align-items: start; align-content: end; padding: 0 calc(var(--vw) * 0.07) calc(var(--vh) * 0.12); }
  h1 { margin: 0; color: var(--ink); font: 700 calc(var(--vh) * 0.11)/1 "{{family}}", sans-serif;
       animation-name: land, leave; animation-duration: var(--enter), var(--exit);
       animation-delay: var(--beat-1), var(--beat-2); animation-timing-function: var(--ease-land), var(--ease-leave);
       animation-fill-mode: both; }
  @keyframes land { from { transform: translateY(12%); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes leave { to { opacity: 0; transform: translateY(-6%); } }
  [data-aspect="9:16"] h1 { font-size: calc(var(--vw) * 0.13); }
</style>
<script type="module">
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const root = document.documentElement.style;
root.setProperty('--ease-land', curveToLinear(CURVES.expoOut));
root.setProperty('--ease-leave', curveToLinear('easeInCubic'));
</script>
</head>
<body>
<h1>{{title}}</h1>
</body>
</html>
`;

// Three key frames side by side, one per direction, before any motion. The agent fills each column with
// the still that defines its direction, looks at all three at once, and picks one.
const DIRECTIONS_TEMPLATE = `<!doctype html>
<html data-aspect="16:9">
<head>
<meta charset="utf-8">
<meta name="duration" content="1">
<title>{{title}}: three directions</title>
<style>
  :root { --paper: #e9e6df; --ink: #14161a; }
  html, body { margin: 0; height: 100%; background: var(--paper); overflow: hidden; }
  body { box-sizing: border-box; display: grid; align-items: start; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2vw;
         padding: 8vh 4vw; align-content: center; font: 400 2.4vh/1.4 system-ui, sans-serif; color: var(--ink); }
  figure { margin: 0; display: grid; grid-template-rows: auto 1fr; align-content: start; gap: 2vh; min-width: 0; }
  .frame { aspect-ratio: {{ratio}}; position: relative; overflow: hidden; container-type: inline-size; }
  figcaption b { display: block; }
  .a .frame { background: #f4f1ea; color: #14161a; }
  .b .frame { background: #14161a; color: #f4f1ea; }
  .c .frame { background: #2b5cff; color: #ffffff; }
  .frame h1 { position: absolute; left: 6%; bottom: 8%; margin: 0; font: 700 18cqw/1 system-ui, sans-serif; }
</style>
</head>
<body>
<figure class="a"><div class="frame"><h1>A</h1></div><figcaption><b>Direction A</b>one sentence; palette; type; the one move</figcaption></figure>
<figure class="b"><div class="frame"><h1>B</h1></div><figcaption><b>Direction B</b>one sentence; palette; type; the one move</figcaption></figure>
<figure class="c"><div class="frame"><h1>C</h1></div><figcaption><b>Direction C</b>one sentence; palette; type; the one move</figcaption></figure>
</body>
</html>
`;

export function directionsPage({ aspect = '16:9', title = 'Say the one thing' }) {
  return DIRECTIONS_TEMPLATE.replaceAll('{{ratio}}', aspect.replace(':', ' / '))
    .replaceAll('{{title}}', title.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
}

function directionsText(name) {
  return `## Directions

Before the film, three directions that differ, each in five lines: one sentence; the key frame (what is
on screen at the one big moment); the palette; the type; the one move. Two reference stills (a path or
a URL), one sentence each on why it is good. Budget, change it if the film needs more:
2 colours, 1 typeface, 1 signature move, 1 sound.

Put the three key frames as stills in films/${name}/directions.html (one column each), then look at
them together (one still, about 1 s): bin/vawe compare --page films/${name}/directions.html --at 0 --out out/${name}-directions.png

Pick one, then write the film.

- A: [one sentence] / key frame: / palette: / type: / move:
- B: [one sentence] / key frame: / palette: / type: / move:
- C: [one sentence] / key frame: / palette: / type: / move:
- reference 1: [path or URL]: [why it is good]
- reference 2: [path or URL]: [why it is good]
- budget: 2 colours, 1 typeface, 1 signature move, 1 sound
- picked: `;
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

export function starterPage({ length = 4, aspect = '16:9', title = 'Say the one thing', face = starterFace() }) {
  return STARTER_TEMPLATE.replaceAll('{{length}}', String(length)).replaceAll('{{aspect}}', aspect)
    .replaceAll('{{font}}', face.font).replaceAll('{{family}}', face.family)
    .replaceAll('{{exit}}', String(Math.max(0.5, +(length - 0.6).toFixed(2)))).replaceAll('{{title}}', title.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
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

export function formatQuestions(questions) {
  if (!questions.length) return 'the template has no question bank; write the promise, the moments and the platform';
  const lines = ['questions, in the order they change the film; a skipped one takes its default:'];
  questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.key}: ${q.question}`, `   default: ${q.default}`, `   why: ${q.why}`);
  });
  return lines.join('\n');
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

function briefText(name, templateRel, questions, sections, answers) {
  const lines = inputLines(questions, answers);
  const inputs = questions.length || lines.length
    ? lines.join('\n')
    : '- the template has no question bank: write the promise, the moments and the platform';
  const rest = sections.length
    ? sections.map((s) => `## ${s.name[0].toUpperCase()}${s.name.slice(1)}\n\n${s.body.replaceAll('<name>', name)}`).join('\n\n')
    : `## Direction\n\nThe template is written as prompts, not tagged sections: read ${templateRel}.`;
  return `# ${name}: brief\n\nTemplate: ${templateRel}. Shape: prompts/ANATOMY.md. Replace each ${UNANSWERED} with the answer, or keep the default.\n\n## Inputs\n\n${inputs}\n\n${directionsText(name)}\n\n${rest}\n\n## First draft\n\nMoves to copy: prompts/moves/README.md. Sound: quiet ticks at default gains, at most one soft swell (taste card rule 13).\n\nbin/vawe dev films/${name}/page.html\n`;
}

function readAnswers({ length, aspect, title }) {
  if (length !== undefined && !(length > 0)) throw new UsageError(`--length must be a number of seconds above 0, got ${length}`);
  if (aspect !== undefined && !ASPECTS[aspect] && !/^\d+:\d+$/.test(aspect)) throw new UsageError(`--aspect "${aspect}" must be one of ${Object.keys(ASPECTS).join(' ')} or a W:H ratio`);
  return { length, aspect, title };
}

function chooseTemplate(root, { from, request, name, title, length }) {
  if (from) return { template: path.resolve(from), route: null };
  const route = pickTemplate({ request, name, title, length }, readRouting(root));
  return { template: path.join(root, route.template), route };
}

// The starter's face goes into the film's own assets folder: a film carries its files.
function copyFace(root, dir, face) {
  const src = path.join(root, 'assets', 'fonts', face.font);
  if (!fs.existsSync(src)) throw new UsageError(`${path.relative(root, src)} is missing; fetch the bundled faces: node generators/media/fonts.mjs`);
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.copyFileSync(src, path.join(dir, 'assets', face.font));
}

export function newFilmLines(name, { page, route }) {
  const lines = [`wrote ${page}, films/${name}/brief.md and films/${name}/directions.html`];
  if (route) {
    lines.push(`template: ${route.template} (${route.type}: ${route.why})`);
    lines.push(`another film type: delete films/${name}, then bin/vawe new ${name} --from prompts/<template>.md (rows in ${ROUTING}) or --request "<the ask>" --length <s>`);
  }
  return [...lines, '', ...tasteLines('concept'), '', `next: fill brief.md, then bin/vawe dev ${page}`];
}

/** Writes the film folder; returns { page, route } (route is null when --from chose the template). */
export function newFilm(name, { from, root, length, aspect, title, request }) {
  const page = readAnswers({ length, aspect, title });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new UsageError(`film name "${name}" must be lowercase letters, digits and dashes`);
  const dir = path.join(root, 'films', name);
  if (fs.existsSync(path.join(dir, 'page.html'))) throw new UsageError(`${path.relative(root, dir)}/page.html already exists`);
  const { template, route } = chooseTemplate(root, { from, request, name, title, length });
  const markdown = fs.readFileSync(template, 'utf8');
  const questions = parseQuestions(markdown);
  const face = starterFace(name);
  copyFace(root, dir, face);
  const given = Object.fromEntries(Object.entries(page).filter(([, v]) => v !== undefined));
  fs.writeFileSync(path.join(dir, 'page.html'), starterPage({ ...given, face }));
  fs.writeFileSync(path.join(dir, 'directions.html'), directionsPage(given));
  const answers = {};
  if (request !== undefined) answers.request = request;
  if (length !== undefined) answers.length = `${length} s`;
  if (aspect !== undefined) answers.aspect = aspect;
  if (title !== undefined) answers.title = title;
  fs.writeFileSync(path.join(dir, 'brief.md'), briefText(name, path.relative(root, template), questions, parseSections(markdown), answers));
  console.log(formatQuestions(questions));
  return { page: `films/${name}/page.html`, route };
}
