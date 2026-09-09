// scripts/author/route.mjs: DELIVERABLE-AWARE ROUTING. A request maps to one of a few vawe
// deliverables (docs/CRAFT/routes/*.md) before any brief-collection or authoring starts. Adapted from
// another engine' route model (~/.claude/skills/another engine/SKILL.md § 2): a small priority table picks
// the deliverable, then only that deliverable's route file is read, never the whole doctrine at once.
//
//   node scripts/author/route.mjs "<what the user asked, plain english>"
//   make route Q="market our launch from hinge.co"
//
// Deterministic keyword/priority match, same table as docs/CRAFT/ROUTING.md. Never an LLM call: a
// route decision has to be reproducible from the same words every time, and this is a lookup, not a
// judgement call worth spending a model on.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Priority order matches docs/CRAFT/ROUTING.md's table exactly. First matching row wins; keep the two
// in sync by hand, `route.test.mjs` is the check that they still agree with real requests.
const ROUTES = [
  {
    name: 'recreation',
    type: 'recreation',
    file: 'docs/CRAFT/routes/recreation.md',
    keywords: ['recreate', 'recreation', 'match this site', 'look like this video', 'reference film', 'exact look', 'clone this ad', 'this ad'],
    intake: [
      'The reference: exact URL or file. `make study` for a film, `make sections` for a site.',
      'What to match: grammar (cuts/palette/motion) vs content (never copy competitor copy verbatim).',
      'Honesty check: name up front which parts cannot be matched exactly.',
    ],
  },
  {
    name: 'launch-video',
    type: 'launch',
    file: 'docs/CRAFT/routes/launch-video.md',
    keywords: ['launch video', 'launch film', 'promo', 'market our', 'market this', 'showcase our', 'product video', 'site tour', '.com', '.co', '.ai', '.app', '.xyz', '.dev', '.io', 'our site', 'our product'],
    intake: [
      'Which URL, and every page? Crawl routes, view modes and empty states, not just the homepage.',
      'Style anchor: which pages to feature, if the site is large.',
      'Payoff, audience, destination (aspect ratio).',
      'Spectacle + Not: the one loud beat, and what this film explicitly will not do.',
    ],
  },
  {
    name: 'explainer',
    type: 'explainer',
    file: 'docs/CRAFT/routes/explainer.md',
    keywords: ['explain', 'explainer', 'how does', 'how rag works', 'how it works', 'teach', 'topic', 'article about', 'data about'],
    intake: [
      'Data: where the facts come from (URL, file, or pasted numbers).',
      'Payoff: the single shocker fact, ordered last.',
      'Feeling: one style reference, since there is no site to anchor taste.',
      'Audience: who watches.',
    ],
  },
  {
    name: 'motion-graphic',
    type: 'sting',
    file: 'docs/CRAFT/routes/motion-graphic.md',
    keywords: ['sting', 'logo reveal', 'stat hit', 'title card that moves', 'lower-third', 'second logo', 'second sting', 'quick loop', '6 second', '6-second', '5 second', 'under 10s', 'under 10 seconds'],
    intake: [
      'The one move: what single motion carries the whole unit?',
      'Loop or one-shot?',
      'Brand marks: logo, colour, the exact word or number.',
      'Destination (aspect ratio).',
    ],
  },
  {
    name: 'demo',
    type: 'demo',
    file: 'docs/CRAFT/routes/demo.md',
    keywords: ['demo', 'specimen', 'prove this effect', 'prove this blueprint', 'test render', 'quick test', 'show me this effect'],
    intake: [
      'The one mechanism: name exactly what is being proven.',
      'The subject must be a picture, not a blank rectangle.',
      'FX: which effect/blueprint key, if already known (`make arsenal Q="…"`).',
    ],
  },
];

const FALLBACK = {
  name: 'general (no row matched)',
  file: null,
  intake: [
    'None of the five deliverables matched. Fall back to the full planning chain: read AGENTS.md and',
    'start at docs/CRAFT/AUTHORING-WALKTHROUGH.md.',
  ],
};

/** Score a route against the request: count of its keywords present, case-insensitive substring match. */
function score(request, route) {
  const r = request.toLowerCase();
  return route.keywords.reduce((n, kw) => n + (r.includes(kw.toLowerCase()) ? 1 : 0), 0);
}

export function route(request) {
  let best = null;
  let bestScore = 0;
  for (const r of ROUTES) {
    const s = score(request, r);
    if (s > bestScore) { best = r; bestScore = s; }
  }
  return best || FALLBACK;
}

function readSection(file, heading) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const start = text.indexOf(`## ${heading}`);
  if (start < 0) return null;
  const rest = text.slice(start);
  const end = rest.indexOf('\n## ', 1);
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}

function main() {
  const request = process.argv.slice(2).join(' ').trim();
  if (!request) {
    console.error('usage: node scripts/author/route.mjs "<what the user asked, plain english>"');
    process.exit(2);
  }
  const matched = route(request);
  console.log(`Deliverable: ${matched.name}`);
  console.log(`Route file: ${matched.file || '(none, see fallback)'}`);
  console.log('');
  console.log('Intake questions:');
  for (const q of matched.intake) console.log(`  - ${q}`);
  if (matched.file) {
    const blueprint = readSection(matched.file, 'Blueprint family + docs');
    if (blueprint) { console.log(''); console.log(blueprint); }
  }
  // The playbook for this deliverable: one skill per video TYPE (AGENTS.md W10), each carrying its
  // own beat spine + worked example. `make scaffold` composes from that spine, not the generic rotation.
  if (matched.type) {
    console.log('');
    console.log(`Type skill: skills/vawe-type-${matched.type}/SKILL.md`);
    console.log(`make scaffold OUT=formats/scene/<name>.json TYPE=${matched.type}`);
  }
}

// Only run as a CLI when invoked directly; route.test.mjs imports `route()` without triggering this.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
