// Advice when a brief's Shots table copies a RECIPES.md chain: more than ECHO_SHARE of the chain's moves,
// in the chain's order. Pure: text in, advice lines out. The read of RECIPES.md is recipeEchoLines.
import fs from 'node:fs';

const ECHO_SHARE = 0.7;
const PLUMBING = new Set(['exit-fast', 'drift-hold']);
const RECIPES_FILE = new URL('../../prompts/moves/RECIPES.md', import.meta.url);

/** { number: [move slug, ...] } from the chain tables of RECIPES.md, in table order. */
export function recipeMoves(recipes) {
  const chains = {};
  for (const m of recipes.matchAll(/^## (\d+)\. [^\n]*\n([\s\S]*?)(?=^Why it works|^## |^# |(?![\s\S]))/gm)) {
    chains[m[1]] = [...m[2].matchAll(/\]\(([a-z0-9-]+)\.md\)/g)].map((x) => x[1]);
  }
  return chains;
}

const cellsOf = (line) => line.split('|').slice(1, -1).map((c) => c.trim());

/** The text of the move in and move out cells of each Shots row, lowercased, words joined by hyphens. */
export function shotMoveCells(brief) {
  const section = brief.match(/^### Shots[^\n]*\n([\s\S]*?)(?=^#{1,3} |(?![\s\S]))/m)?.[1];
  if (!section) return [];
  const rows = section.split('\n').filter((l) => l.trim().startsWith('|'));
  const head = cellsOf(rows[0] ?? '').map((c) => c.toLowerCase());
  const cols = [head.indexOf('move in'), head.indexOf('move out')].filter((i) => i >= 0);
  return rows.slice(2).map((r) => {
    const cells = cellsOf(r);
    return cols.map((i) => cells[i] ?? '').join(' ').toLowerCase().replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[\s_]+/g, '-');
  });
}

function briefSequence(cells, slugs) {
  const seq = [];
  for (const cell of cells) {
    const found = slugs.filter((s) => cell.includes(s)).sort((a, b) => cell.indexOf(a) - cell.indexOf(b));
    seq.push(...found);
  }
  return seq;
}

function matchedMoves(chain, seq) {
  const L = Array.from({ length: chain.length + 1 }, () => new Array(seq.length + 1).fill(0));
  for (let i = chain.length - 1; i >= 0; i--) {
    for (let j = seq.length - 1; j >= 0; j--) {
      L[i][j] = chain[i] === seq[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const out = [];
  for (let i = 0, j = 0; i < chain.length && j < seq.length;) {
    if (chain[i] === seq[j]) { out.push(chain[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return out;
}

/** One advice line for the recipe the Shots table follows almost 1:1, else []. */
export function recipeEcho(brief, recipes) {
  const chains = recipeMoves(recipes);
  const slugs = [...new Set(Object.values(chains).flat())];
  const seq = briefSequence(shotMoveCells(brief), slugs);
  let best = null;
  for (const [n, chain] of Object.entries(chains)) {
    if (!chain.length) continue;
    const matched = matchedMoves(chain, seq);
    const share = matched.length / chain.length;
    if (share > ECHO_SHARE && (!best || share > best.share)) best = { n, share, matched };
  }
  if (!best) return [];
  const own = best.matched.filter((m) => !PLUMBING.has(m));
  const pool = own.length ? own : best.matched;
  return [`the beats follow recipe ${best.n} almost 1:1; turn the ${pool[Math.floor(pool.length / 2)]} beat into the film's own moment`];
}

/** recipeEcho against the repo's RECIPES.md; nothing when there is no brief. */
export function recipeEchoLines(brief) {
  return brief == null ? [] : recipeEcho(brief, fs.readFileSync(RECIPES_FILE, 'utf8'));
}
