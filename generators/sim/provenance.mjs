// generators/sim/provenance.mjs: what produced a bake, as a hash.
//
// Kept apart from run.mjs deliberately: the baker needs puppeteer, and the GATE that checks bakes
// does not. A gate that has to boot a browser to answer "is this stale?" is a gate people stop
// running.
//
// A bake records the hash of its whole SOURCE GRAPH, not of the entry file. Hashing the entry alone
// would let an edit to sims/lib/rng.mjs change every sequence in the repo while every meta.json still
// claimed to be current, silent staleness, the shape this repo keeps writing gates against
// (MISTAKES #96).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const IMPORT_RE = /(?:^|\n)\s*import[^'"]*['"](\.[^'"]+)['"]/g;

/** Every local module reachable from `entry`, repo-relative and sorted. Entry included. */
export function sourceGraph(entry) {
  const seen = new Set();
  const walk = (abs) => {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    if (seen.has(rel) || !fs.existsSync(abs)) return;
    seen.add(rel);
    for (const m of fs.readFileSync(abs, 'utf8').matchAll(IMPORT_RE)) walk(path.resolve(path.dirname(abs), m[1]));
  };
  walk(path.resolve(entry));
  return [...seen].sort();
}

/** SHA-256 over the whole source graph → {hash, files}. Order-stable, comparable across machines. */
export function sourceHash(entry) {
  const h = crypto.createHash('sha256');
  const files = {};
  for (const rel of sourceGraph(entry)) {
    const one = crypto.createHash('sha256').update(fs.readFileSync(path.join(repoRoot, rel))).digest('hex');
    files[rel] = one;
    h.update(rel).update('\0').update(one).update('\0');
  }
  return { hash: h.digest('hex'), files };
}
