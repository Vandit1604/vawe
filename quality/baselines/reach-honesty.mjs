// reach-honesty.mjs: keeps quality/baselines/reach.json truthful against `make check GATE=coverage`'s real output.
//
//   node quality/baselines/reach-honesty.mjs
//
// reach.json (subtraction.plan.md Phase 1) hand-classifies every schema prop `make check GATE=coverage` flags as
// unused into unreachable / unwanted / unsure, each with real evidence. That table rots the moment a
// scene starts (or stops) using a prop, or a new prop joins the schema unused: reach.json would then be
// silently short of, or stale about, the very list it claims to cover. This is NOT a gate (nothing here
// blocks a render or a commit) and it never runs on its own; run it by hand after touching schema.json
// or the scene library, the same way `make check GATE=coverage` itself is a WARN-tier report, not a build failure.
//
// Deliberately small: one diff, two directions. `missing` is the dangerous one (an unused prop with no
// verdict at all); `stale` just means reach.json is a step ahead (fine, but worth knowing before editing
// it further).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const coverageOut = execFileSync('node', ['quality/gates/coverage.mjs', '--json'], { cwd: repoRoot, encoding: 'utf8' });
const findings = JSON.parse(coverageOut);
const propsFinding = findings.find((f) => f.code === 'unexercised-prop');
const liveUnused = propsFinding
  ? propsFinding.summary.split('\n')[1].trim().split(', ').filter(Boolean)
  : [];

const reach = JSON.parse(fs.readFileSync(path.join(repoRoot, 'quality/baselines/reach.json'), 'utf8'));
const known = new Set(reach.props.map((r) => r.path));

const missing = liveUnused.filter((p) => !known.has(p));   // unused today, no verdict on file
const stale = [...known].filter((p) => !liveUnused.includes(p));  // verdict on file, no longer unused (or renamed)

console.log(`coverage reports ${liveUnused.length} unused prop(s); reach.json carries ${known.size} verdict(s).`);
if (missing.length) console.log(`MISSING a verdict: ${missing.join(', ')}`);
if (stale.length) console.log(`STALE (no longer unused, or renamed): ${stale.join(', ')}`);
if (!missing.length && !stale.length) console.log('reach.json exactly covers the live unused-prop list.');

process.exit(missing.length ? 1 : 0);
