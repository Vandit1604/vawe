// `vawe new <name>`: writes films/<name>/page.html (a valid starter) and films/<name>/brief.md.
import fs from 'node:fs';
import path from 'node:path';
import { UsageError } from './parse.mjs';

const STARTER = `<!doctype html>
<html data-aspect="16:9">
<head>
<meta charset="utf-8">
<meta name="duration" content="4">
<meta name="message" content="one thing to remember">
<style>
  :root { --bg: #f4f1ea; --ink: #14161a; --accent: #2b5cff; --enter: 0.5s; --exit: 0.3s; }
  html, body { margin: 0; height: 100%; background: var(--bg); overflow: hidden; }
  body { box-sizing: border-box; display: grid; align-content: end; padding: 0 calc(var(--vw) * 0.07) calc(var(--vh) * 0.12); }
  h1 { margin: 0; color: var(--ink); font: 700 calc(var(--vh) * 0.11)/1 system-ui, sans-serif;
       animation-name: land, leave; animation-duration: var(--enter), var(--exit);
       animation-delay: 0.4s, 3.4s; animation-timing-function: cubic-bezier(0.1, 0.8, 0.2, 1), ease-in;
       animation-fill-mode: both; }
  /* arrive fast, land soft; the exit is shorter than the entrance */
  @keyframes land { from { transform: translateY(12%); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes leave { from { opacity: 1; } to { opacity: 0; transform: translateY(-6%); } }
  [data-aspect="9:16"] h1 { font-size: calc(var(--vw) * 0.13); }
</style>
</head>
<body>
<h1>Say the one thing</h1>
</body>
</html>
`;

function inputsSection(templatePath) {
  const section = fs.readFileSync(templatePath, 'utf8').split(/^## /m).find((s) => s.startsWith('Inputs'));
  return section ? section.split('\n').slice(1).join('\n').trim() : '(the template has no inputs section: write the promise, the moments and the platform)';
}

export function newFilm(name, { from, root }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new UsageError(`film name "${name}" must be lowercase letters, digits and dashes`);
  const dir = path.join(root, 'films', name);
  if (fs.existsSync(path.join(dir, 'page.html'))) throw new UsageError(`${path.relative(root, dir)}/page.html already exists`);
  const template = from ? path.resolve(from) : path.join(root, 'prompts', 'brand-launch-from-url.md');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'page.html'), STARTER);
  fs.writeFileSync(path.join(dir, 'brief.md'), `# ${name}: brief\n\nTemplate: ${path.relative(root, template)}\n\n## Inputs\n\n${inputsSection(template)}\n`);
  return `films/${name}/page.html`;
}
