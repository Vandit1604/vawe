#!/usr/bin/env node
// harness/author/mine.mjs · MINE beat blueprints out of the studied reference corpus (grammar/*.json).
//
// WHY. The another engine shot-template library (22 templates) was distilled from 178 real ads, not
// invented. vawe's 19 hand-invented blueprints (blueprints/index.mjs) went the other way, and 12 of
// them have never been used once: an author reaching for a shape the invented set does not have falls
// back to raw layers (engine-doctrine/CRAFT/BLUEPRINTS.md tells that story). This is the distillation step: read
// every studied grammar, find the shots that repeat a nameable DEVICE, and print a receipt naming
// exactly which grammar + shot backs each candidate shape, so a new blueprint is traceable to a real
// film rather than to a guess.
//
// WHAT THIS DOES NOT DO. It does not write JavaScript. A beat factory is choreography (blueprints/beats-mined.mjs
// is hand-authored, like every other beats-*.mjs file), and no tool here can responsibly emit that from
// a keyword match. What a tool CAN do honestly is CLUSTERING: score every studied shot against a fixed
// dictionary of named shapes and print which shots support which shape, so a human distilling a
// blueprint has the evidence in front of them instead of a memory of one video. That receipt is
// grammar/_mined-shapes.json, and the "sources:" line atop every factory in beats-mined.mjs is read
// straight off it.
//
// Usage: node harness/author/mine.mjs [--json]   ·   make mine
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GDIR = path.join(ROOT, 'grammar');
const OUT = path.join(GDIR, '_mined-shapes.json');

// The shape dictionary. Each shape names the blueprint it feeds (blueprints/beats-mined.mjs), the
// keywords that identify it in a shot's onScreen/moves/trigger prose (all measured, never guessed:
// every keyword below was copied out of a grammar file this repo already committed), and the storyboard
// ROLE it is used for (engine-doctrine/CRAFT/AUTHORING-WALKTHROUGH.md's role vocabulary).
// Each keyword list is kept NON-REDUNDANT on purpose: 'blur' and 'blurred' would both match the same
// occurrence of "motion-blurred" and double-count it, which silently outweighs a more specific rival
// shape (rebuilt#4 mismatched to blurResolveHook instead of wordWipe on exactly this bug, caught by
// running the tool over the real corpus before trusting its output). One root per concept.
const SHAPES = [
  { shape: 'blurResolveHook', role: 'Hook',
    keywords: ['blur', 'resolve', 'smear', 'out of focus'] },
  { shape: 'dialogueAccumulate', role: 'Hook',
    keywords: ['accumulate', 'held frame', 'serif italic', 'bloom'] },
  { shape: 'containerFill', role: 'Key_Feature',
    keywords: ['container', 'braces', 'holds while', 'recolour'] },
  { shape: 'cardFan', role: 'Key_Feature',
    keywords: ['fan', 'perspective', 'tilts back'] },
  { shape: 'listBuildRows', role: 'Key_Feature',
    keywords: ['row is added', 'list builds', 'list begins', 'list completes'] },
  { shape: 'chipConverge', role: 'Proof',
    keywords: ['scatter', 'converge', 'status chips', 'resolve onto'] },
  { shape: 'cellMosaic', role: 'Build',
    keywords: ['grid', 'cell boundaries', 'travels as one object', 'dotted rules'] },
  { shape: 'wordWipe', role: 'Key_Feature',
    keywords: ['blows through', 'crosses the whole', 'scale contrast', 'far larger than the canvas'] },
  { shape: 'wordmarkAssemble', role: 'CTA_Brand_Outro',
    keywords: ['tumbling', 'different depths', 'scattered positions', 'scrambl'] },
  { shape: 'viewportTrio', role: 'Payoff',
    keywords: ['viewports', 'multi-viewport'] },
];

function loadGrammars() {
  const files = fs.readdirSync(GDIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(GDIR, f), 'utf8')));
}

function scoreShot(text, keywords) {
  const t = text.toLowerCase();
  return keywords.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0);
}

function mine() {
  const grammars = loadGrammars();
  const matches = {}; // shape → [{source, shot, role, snippet}]
  for (const s of SHAPES) matches[s.shape] = [];

  for (const g of grammars) {
    for (const shot of g.shots || []) {
      if (!shot.onScreen) continue; // unfilled/scratch shot, nothing to cluster on
      const text = [shot.onScreen, shot.moves, shot.trigger].filter(Boolean).join(' . ');
      let best = null, bestScore = 0;
      for (const s of SHAPES) {
        const score = scoreShot(text, s.keywords);
        if (score > bestScore) { bestScore = score; best = s; }
      }
      if (best) matches[best.shape].push({
        source: g.name, shot: shot.i, role: best.role,
        snippet: shot.onScreen.length > 100 ? `${shot.onScreen.slice(0, 97)}...` : shot.onScreen,
      });
    }
  }

  const report = {
    _: 'Shot clusters found by harness/author/mine.mjs over grammar/*.json. A shape with sources is a '
      + 'real, traceable candidate for a beats-mined.mjs factory, never an invented one. Regenerate with `make mine`.',
    grammarsRead: grammars.map((g) => g.name),
    shapes: SHAPES.map((s) => ({ shape: s.shape, role: s.role, sources: matches[s.shape] })),
  };
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 1)}\n`);
  return report;
}

const report = mine();
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report));
} else {
  console.log(`\n  MINE · read ${report.grammarsRead.length} studied grammar(s) → ${OUT}\n`);
  for (const s of report.shapes) {
    console.log(`  ${s.shape.padEnd(20)} role: ${s.role.padEnd(16)} ${s.sources.length} matched shot(s)`);
    for (const m of s.sources.slice(0, 4)) console.log(`      ${m.source}#${m.shot}: ${m.snippet}`);
    if (s.sources.length > 4) console.log(`      ...and ${s.sources.length - 4} more`);
  }
  const empty = report.shapes.filter((s) => !s.sources.length).map((s) => s.shape);
  if (empty.length) console.log(`\n  ~ no matched shot for: ${empty.join(', ')} (keyword set may need widening)`);
  console.log(`\n  A shape here backs one \`spine\` recipe (recipes/README.md). Do not add a shape with`);
  console.log(`  zero sources: a recipe with no matched shot is an invention wearing this tool's name.\n`);
}
