// `vawe new <name>`: writes films/<name>/page.html (a valid starter), films/<name>/directions.html
// (three key frames side by side) and films/<name>/brief.md. brief.md takes the template's question
// bank with every default filled in and marked unanswered, a Directions section (three slots from three
// families, a picked line), then the template's tagged sections as headings.
import fs from 'node:fs';
import path from 'node:path';
import { UsageError } from './parse.mjs';
import { ASPECTS } from '../../core/layout/aspects.js';
import { FAMILIES, FIELDS } from '../lib/directions.mjs';

const STARTER_TEMPLATE = `<!doctype html>
<html data-aspect="{{aspect}}">
<head>
<meta charset="utf-8">
<meta name="duration" content="{{length}}">
<meta name="aspect" content="{{aspect}}">
<meta name="message" content="one thing to remember">
<title>{{title}}</title>
<style>
  :root { --bg: #f4f1ea; --ink: #14161a; --accent: #2b5cff; --enter: 0.5s; --exit: 0.3s; }
  html, body { margin: 0; height: 100%; background: var(--bg); overflow: hidden; }
  body { box-sizing: border-box; display: grid; align-items: start; align-content: end; padding: 0 calc(var(--vw) * 0.07) calc(var(--vh) * 0.12); }
  h1 { margin: 0; color: var(--ink); font: 700 calc(var(--vh) * 0.11)/1 system-ui, sans-serif;
       animation-name: land, leave; animation-duration: var(--enter), var(--exit);
       animation-delay: 0.4s, {{exit}}s; animation-timing-function: cubic-bezier(0.1, 0.8, 0.2, 1), ease-in;
       animation-fill-mode: both; }
  /* arrive fast, land soft; the exit is shorter than the entrance */
  @keyframes land { from { transform: translateY(12%); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes leave { to { opacity: 0; transform: translateY(-6%); } }
  [data-aspect="9:16"] h1 { font-size: calc(var(--vw) * 0.13); }
</style>
</head>
<body>
<h1>{{title}}</h1>
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

export const STARTER = starterPage({});

export function starterPage({ length = 4, aspect = '16:9', title = 'Say the one thing' }) {
  return STARTER_TEMPLATE.replaceAll('{{length}}', String(length)).replaceAll('{{aspect}}', aspect)
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
  return `# ${name}: brief\n\nTemplate: ${templateRel}. Shape: prompts/ANATOMY.md. Replace each ${UNANSWERED} with the answer, or keep the default.\n\n## Inputs\n\n${inputs}\n\n${directionsText(name)}\n\n${rest}\n\n## First draft\n\nMoves to copy: prompts/moves/README.md. Sound: one soft cue per beat, felt not noticed (skills/vawe-page/SKILL.md).\n\nbin/vawe dev films/${name}/page.html\n`;
}

function readAnswers({ length, aspect, title }) {
  if (length !== undefined && !(length > 0)) throw new UsageError(`--length must be a number of seconds above 0, got ${length}`);
  if (aspect !== undefined && !ASPECTS[aspect] && !/^\d+:\d+$/.test(aspect)) throw new UsageError(`--aspect "${aspect}" must be one of ${Object.keys(ASPECTS).join(' ')} or a W:H ratio`);
  return { length, aspect, title };
}

export function newFilm(name, { from, root, length, aspect, title }) {
  const page = readAnswers({ length, aspect, title });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new UsageError(`film name "${name}" must be lowercase letters, digits and dashes`);
  const dir = path.join(root, 'films', name);
  if (fs.existsSync(path.join(dir, 'page.html'))) throw new UsageError(`${path.relative(root, dir)}/page.html already exists`);
  const template = from ? path.resolve(from) : path.join(root, 'prompts', 'brand-launch-from-url.md');
  const markdown = fs.readFileSync(template, 'utf8');
  const questions = parseQuestions(markdown);
  fs.mkdirSync(dir, { recursive: true });
  const given = Object.fromEntries(Object.entries(page).filter(([, v]) => v !== undefined));
  fs.writeFileSync(path.join(dir, 'page.html'), starterPage(given));
  fs.writeFileSync(path.join(dir, 'directions.html'), directionsPage(given));
  const answers = {};
  if (length !== undefined) answers.length = `${length} s`;
  if (aspect !== undefined) answers.aspect = aspect;
  if (title !== undefined) answers.title = title;
  fs.writeFileSync(path.join(dir, 'brief.md'), briefText(name, path.relative(root, template), questions, parseSections(markdown), answers));
  console.log(formatQuestions(questions));
  console.log(`directions: films/${name}/directions.html holds one starter still per family (type, object, graphic); fill the three slots in brief.md, then pick one`);
  return `films/${name}/page.html`;
}
