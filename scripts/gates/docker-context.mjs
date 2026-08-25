// WHAT IS LEFT OF THIS GATE, AND WHY IT NO LONGER OWNS A MATCHER.
//
// It was written for a denylist .dockerignore, where a new directory joined the build context the day
// it was created — invisible in `git status`, unmentioned in any COPY, and shipped to the daemon every
// build (67M of assets/baked, 5M of assets/gen). .dockerignore is an ALLOWLIST now: `**` first, then
// the paths the two Dockerfiles COPY. A directory nobody names is simply not in the context, so that
// whole failure has no subject any more, and the reverse drift — a COPY whose path the ignore file
// forgot — is `make docker-check` (scripts/site/docker-context-check.mjs), which reads the COPY lines.
//
// The SIZE budget still has a subject: an allowed directory can grow (site/ is most of the context
// today). But the walker this file used to carry re-implemented Docker's glob, and under an allowlist
// that copy went WRONG: it skips descending into an ignored directory, so `**` + `!assets/icons`
// reported an `assets` of zero and undercounted the real context by 10MB. Docker descends into an
// ignored directory when an exception could match inside it. Chasing BuildKit's matcher for a number
// `docker build` computes for free is exactly the "a wrong gate is worse than no gate" trade CLAUDE.md
// names, so the matcher is gone and the question is put to the authority instead.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Generous enough that ordinary growth does not trip it, tight enough that a whole asset directory
// slipping in does. The context was 15.8M when this was written and 49M when it moved to an allowlist.
// MiB, matching `du`'s own unit — see the reading of `du -sk` below.
const BUDGET_MB = 60;

// A throwaway image that copies the context and measures it. `-f -` reads the Dockerfile from stdin,
// so nothing is written into the repo and .dockerignore applies exactly as it would on a real build.
const DF = 'FROM alpine\nCOPY . /ctx\nRUN du -sk /ctx | cut -f1 && du -sk /ctx/* | sort -rn | head -8\n';

// BuildKit writes the step output to stderr even on a clean build, so both streams are read.
const r = spawnSync('docker', ['build', '--no-cache', '--progress=plain', '-f', '-', repoRoot],
  { input: DF, encoding: 'utf8' });
const out = String(r.stdout || '') + String(r.stderr || '');
if (r.error?.code === 'ENOENT' || /Cannot connect to the Docker daemon/i.test(out)) {
  // "Skipped" exited 0, and 0 from a budget gate reads as "within budget" to every caller. The docker
  // daemon is a fact about this machine; the size of the context is a fact about the repo, and the
  // first has never been evidence for the second. Exit 2 (could not measure), which no caller can
  // mistake for a pass and which is not the same claim as exit 1 (over budget).
  console.error('✗ docker is not available here, so the build context was NOT measured.');
  console.error('  This says nothing about whether the context fits its budget. Start the daemon, or');
  console.error('  run this where docker is available, and ask again.');
  process.exit(2);
}

const lines = out.split('\n').map((l) => l.replace(/^#\d+\s+[\d.]+\s+/, '').trim()).filter(Boolean);
const totalKb = Number(lines.find((l) => /^\d+$/.test(l)));
if (!Number.isFinite(totalKb)) {
  console.error('✗ could not read the context size out of the docker build. Raw output:');
  console.error(out.split('\n').slice(-30).join('\n'));
  process.exit(1);
}
// `du -sk` counts 1024-BYTE BLOCKS. Dividing by 1000 gave a figure that was neither MB nor MiB and
// was then compared against a budget written in MiB (the 15.8M and 49M in the comment above are du's
// own M, which is MiB) — so the number on screen ran ~2.4% high against its own yardstick.
const mib = totalKb / 1024;
console.log(`docker build context: ${mib.toFixed(1)}MiB (budget ${BUDGET_MB}MiB)`);
for (const l of lines.filter((l) => /^\d+\s+\/ctx\/./.test(l)))
  console.log(`   ${(Number(l.split(/\s+/)[0]) / 1024).toFixed(1).padStart(7)}MiB  ${l.split(/\s+/)[1].replace('/ctx/', '')}`);

if (mib > BUDGET_MB) {
  console.error(`\n✗ build context is ${mib.toFixed(1)}MiB, over the ${BUDGET_MB}MiB budget.`);
  console.error('  .dockerignore is an ALLOWLIST: something listed there has grown. Find it above, and');
  console.error('  either narrow its `!` line to the files a COPY actually needs, or raise the budget');
  console.error('  deliberately in this file.');
  process.exit(1);
}
console.log('✓ within budget');
