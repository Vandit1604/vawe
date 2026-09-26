// WHAT IS LEFT OF THIS GATE, AND WHY IT NO LONGER OWNS A MATCHER.
//
// It was written for a denylist .dockerignore, where a new directory joined the build context the day
// it was created, invisible in `git status`, unmentioned in any COPY, and shipped to the daemon every
// build (67M of assets/baked, 5M of assets/gen). .dockerignore is an ALLOWLIST now: `**` first, then
// the paths the two Dockerfiles COPY. A directory nobody names is simply not in the context, so that
// whole failure has no subject any more, and the reverse drift, a COPY whose path the ignore file
// forgot, is `make check GATE=docker-check` (quality/gates/docker-context-check.mjs), which reads the COPY lines.
//
// The SIZE budget still has a subject: an allowed directory can grow (site/ is most of the context
// today). But the walker this file used to carry re-implemented Docker's glob, and under an allowlist
// that copy went WRONG: it skips descending into an ignored directory, so `**` + `!assets/icons`
// reported an `assets` of zero and undercounted the real context by 10MB. Docker descends into an
// ignored directory when an exception could match inside it. Chasing BuildKit's matcher for a number
// `docker build` computes for free is exactly the "a wrong gate is worse than no gate" trade CLAUDE.md
// names, so the matcher is gone and the question is put to the authority instead.
//
// WHERE THIS RUNS. It is measured for real on every push to main: .github/workflows/gates.yml runs it
// on ubuntu-latest, where Docker is always present. It also stays in .githooks/pre-push, where Docker
// is present on some machines and not others; on a machine with no daemon it now says so and exits 0
// (see below) rather than blocking a push it structurally cannot prove. That is not a softened gate,
// it is the same split gates.yml already draws for doc-refs and coverage: a check stays local-only when
// a clone cannot see what it needs, and this one is the mirror case, a check that stays in BOTH places
// because CI can always see what it needs and a laptop only sometimes can.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const f = gateFindings();

// Generous enough that ordinary growth does not trip it, tight enough that a whole asset directory
// slipping in does. The context was 15.8M when this was written and 49M when it moved to an allowlist.
// MiB, matching `du`'s own unit: see the reading of `du -sk` below.
const BUDGET_MB = 60;

// A throwaway image that copies the context and measures it. `-f -` reads the Dockerfile from stdin,
// so nothing is written into the repo and .dockerignore applies exactly as it would on a real build.
const DF = 'FROM alpine\nCOPY . /ctx\nRUN du -sk /ctx | cut -f1 && du -sk /ctx/* | sort -rn | head -8\n';

// BuildKit writes the step output to stderr even on a clean build, so both streams are read.
const r = spawnSync('docker', ['build', '--no-cache', '--progress=plain', '-f', '-', repoRoot],
  { input: DF, encoding: 'utf8' });
const out = String(r.stdout || '') + String(r.stderr || '');
if (r.error?.code === 'ENOENT' || /Cannot connect to the Docker daemon/i.test(out)) {
  // Exit 2 read as "could not measure" to a human, but pre-push is a make list that only checks exit
  // codes: a nonzero here blocked every push from a laptop with no Docker daemon, on a gate that can
  // never pass there, which is exactly the shape that trains people onto --no-verify for everything.
  // The real measurement now happens in CI (.github/workflows/gates.yml, ubuntu-latest, Docker present),
  // so a machine without Docker owes no local proof; it owes an honest "not measured here" and exit 0,
  // never a silent pass dressed as one. Where Docker IS available (this machine, or CI), it measures and
  // fails over budget exactly as before.
  f.note('docker-unavailable', 'docker is not available here, so the build context was NOT measured. '
    + 'This says nothing about whether the context fits its budget; CI measures it on every push.',
    { fix: 'measured in CI (gates.yml); run this by hand where docker is available to check locally' });
  f.emit();
  process.exit(0);
}

const lines = out.split('\n').map((l) => l.replace(/^#\d+\s+[\d.]+\s+/, '').trim()).filter(Boolean);
const totalKb = Number(lines.find((l) => /^\d+$/.test(l)));
if (!Number.isFinite(totalKb)) {
  f.fail('unreadable-output', 'could not read the context size out of the docker build');
  console.error(out.split('\n').slice(-30).join('\n'));
  f.emit();
  process.exit(1);
}
// `du -sk` counts 1024-BYTE BLOCKS. Dividing by 1000 gave a figure that was neither MB nor MiB and
// was then compared against a budget written in MiB (the 15.8M and 49M in the comment above are du's
// own M, which is MiB), so the number on screen ran ~2.4% high against its own yardstick.
const mib = totalKb / 1024;
console.log(`docker build context: ${mib.toFixed(1)}MiB (budget ${BUDGET_MB}MiB)`);
for (const l of lines.filter((l) => /^\d+\s+\/ctx\/./.test(l)))
  console.log(`   ${(Number(l.split(/\s+/)[0]) / 1024).toFixed(1).padStart(7)}MiB  ${l.split(/\s+/)[1].replace('/ctx/', '')}`);

if (mib > BUDGET_MB) {
  f.fail('over-budget', `build context is ${mib.toFixed(1)}MiB, over the ${BUDGET_MB}MiB budget`, {
    fix: '.dockerignore is an ALLOWLIST: something listed there has grown. Find it above, and either '
      + 'narrow its `!` line to the files a COPY actually needs, or raise the budget deliberately in this file',
  });
  f.emit();
  process.exit(1);
}
console.log('✓ within budget');
f.emit();
process.exit(0);
