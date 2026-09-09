// scripts/lib/finding-codes.mjs: which finding codes do the gates actually EMIT?
//
// One derived fact, one owner. Two consumers needed this and neither could answer it:
//
//   • quality/gates/doc-map.mjs routes a finding to the doc that settles it, and has to refuse a doc
//     that claims a code nothing emits, or the pointer rots silently the day a gate is deleted.
//   • quality/gates/waiver-drift.mjs reports DEAD WAIVERS off a HAND-KEPT `RETIRED` map, and its own
//     comment names the failure that costs: "when a gate is deleted its codes have to be named here,
//     or the census keeps counting ghosts". That list is a second owner of this fact.
//
// So it is COMPUTED from the gate sources rather than maintained. A code that stops being emitted
// stops appearing here on the next run, with nobody remembering to write it down.
//
// PRECISION OVER RECALL, deliberately. An over-broad scan is worse than a narrow one here, because
// every false code becomes an "unrouted finding" a person is asked to explain. The first draft matched
// any `kind: '...'` and returned 135 codes, of which `circle`, `sphere`, `stripes`, `sting`, `cut` and
// `seam` are background fx and transition names, not findings. Those patterns are gone. What is left
// is four shapes that only ever carry a finding code:
//
//   fail('code', …) / warn('code', …)   the convention 10 gates share
//   ✗ [code] / ~ [code]                 the printed form author-check itself parses
//   sev: 'code'                         designspec-check's finding objects
//   allow.has('code')                   a gate checking its own waiver, which names a real code
//
// Plus quality/audit.mjs's HARD set, read by name: audit builds findings as `{kind}` objects, so it has
// no textual marker of its own and would otherwise be invisible to all four.
//
// The consequence of a miss is bounded ON PURPOSE, and doc-map is written to match: a code this misses
// is merely unrouted, while a doc claiming a code that is not here FAILS. Recall gaps cost a missing
// pointer; precision gaps would cost a broken build.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROOTS = ['scripts/gates', 'scripts/author', 'verify'];

const PATTERNS = [
  /\b(?:fail|warn)\(\s*'([a-z][a-z0-9-]{2,})'/g,          // the shared gate convention
  /[✗~⚠]\s*\\?\[([a-z][a-z0-9-]{2,})\\?\]/g,              // the printed form
  /\bsev\s*:\s*'([a-z][a-z0-9-]{2,})'/g,                  // designspec-check's finding objects
  /\ballow(?:ed)?\.has\('([a-z][a-z0-9-]{2,})'\)/g,       // a gate reading its own waiver
];

// quality/audit.mjs composes findings as `{ kind: 'overlap', … }`, so no marker above sees it. Its
// severity sets ARE the list, so read those rather than inventing a fifth pattern that would have to
// tell a finding kind from a paint kind.
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
