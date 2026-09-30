// `vawe new <name>`: writes films/<name>/page.html (a valid starter) and films/<name>/brief.md.
// brief.md takes the template's question bank with every default filled in and marked unanswered,
// then the template's tagged sections (direction, structure, build, gotchas, start) as headings.
import fs from 'node:fs';
import path from 'node:path';
import { UsageError } from './parse.mjs';
import { ASPECTS } from '../../core/layout/aspects.js';

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
  body { box-sizing: border-box; display: grid; align-content: end; padding: 0 calc(var(--vw) * 0.07) calc(var(--vh) * 0.12); }
  h1 { margin: 0; color: var(--ink); font: 700 calc(var(--vh) * 0.11)/1 system-ui, sans-serif;
       animation-name: land, leave; animation-duration: var(--enter), var(--exit);
       animation-delay: 0.4s, {{exit}}s; animation-timing-function: cubic-bezier(0.1, 0.8, 0.2, 1), ease-in;
       animation-fill-mode: both; }
  /* arrive fast, land soft; the exit is shorter than the entrance */
  @keyframes land { from { transform: translateY(12%); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes leave { from { opacity: 1; } to { opacity: 0; transform: translateY(-6%); } }
  [data-aspect="9:16"] h1 { font-size: calc(var(--vw) * 0.13); }
</style>
</head>
<body>
<h1>{{title}}</h1>
</body>
</html>
`;

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
  return `# ${name}: brief\n\nTemplate: ${templateRel}. Shape: prompts/ANATOMY.md. Replace each ${UNANSWERED} with the answer, or keep the default.\n\n## Inputs\n\n${inputs}\n\n${rest}\n\n## First draft\n\nbin/vawe dev films/${name}/page.html\n`;
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
  fs.writeFileSync(path.join(dir, 'page.html'), starterPage(Object.fromEntries(Object.entries(page).filter(([, v]) => v !== undefined))));
  const answers = {};
  if (length !== undefined) answers.length = `${length} s`;
  if (aspect !== undefined) answers.aspect = aspect;
  if (title !== undefined) answers.title = title;
  fs.writeFileSync(path.join(dir, 'brief.md'), briefText(name, path.relative(root, template), questions, parseSections(markdown), answers));
  console.log(formatQuestions(questions));
  return `films/${name}/page.html`;
}
