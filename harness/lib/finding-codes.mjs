import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROOTS = ['quality/gates', 'harness/author'];

const PATTERNS = [
  /\b(?:fail|warn|say|err|note)\(\s*'([a-z][a-z0-9-]{2,})'/g,  // the shared gate convention (read-check.mjs names its own helper `say`, storyboard-check.mjs names its own `err`)
  /[✗~⚠]\s*\\?\[([a-z][a-z0-9-]{2,})\\?\]/g,              // the printed form
  /\bsev\s*:\s*'([a-z][a-z0-9-]{2,})'/g,                  // designspec-check's finding objects
  /\ballow(?:ed)?\.has\('([a-z][a-z0-9-]{2,})'\)/g,       // a gate reading its own waiver
  /\braise\(\s*'([a-z][a-z0-9-]{2,})'/g,                  // a gate helper that adapts through safeguards.mjs, then fails or warns
];

const SET_DECLS = [['quality/audit.mjs', /^const (?:HARD|SOFT)\s*=\s*new Set\(\[([^\]]*)\]/gm]];

/** codesEmitted() -> Map<code, Set<file>>, computed from the gate sources on every call. */
export function codesEmitted() {
  const hits = new Map();
  const add = (code, file) => {
    if (!hits.has(code)) hits.set(code, new Set());
    hits.get(code).add(file);
  };
  for (const root of ROOTS) {
    const dir = path.join(repoRoot, root);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!/\.(mjs|js)$/.test(f)) continue;
      const rel = `${root}/${f}`;
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const re of PATTERNS) for (const m of src.matchAll(re)) add(m[1], rel);
    }
  }
  for (const [rel, re] of SET_DECLS) {
    const p = path.join(repoRoot, rel);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(re)) for (const q of m[1].matchAll(/'([a-z][a-z0-9-]{2,})'/g)) add(q[1], rel);
  }
  return hits;
}
