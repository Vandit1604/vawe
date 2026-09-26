---
when: "scoring or finishing a review round on a film"
answers: "how to read a film's prior findings before scoring, log a new round, and sign it off with a receipt"
group: skill
---

# The review log and the round receipt

## The review log: read it before you score, write it after

Every round already writes one line to `out/<film>.runs.jsonl` (`harness/lib/runlog.mjs`), the film's
own append-only history. `quality/gates/judge.mjs` logs `{ cmd: 'judge', judge: { verdict, file } }`
automatically on every `make judge`; nothing else in this repo owns a second log for the same fact, so
extend that one instead of starting a new file.

**Before scoring a round**, read the film's own history first, so a pass does not re-discover and
re-report a finding an earlier pass already named:

```js
import { readRuns } from './harness/lib/runlog.mjs';
const priorFindings = readRuns(film).filter((r) => r.judge).flatMap((r) => r.judge.findings || []);
```

**After scoring a round**, append the verdict AND the top findings (the issues named for anything
scoring 3 or below), not just the verdict:

```js
import { appendRun } from './harness/lib/runlog.mjs';
appendRun(film, { cmd: 'judge', judge: { verdict: 'FIX', file: sheet,
  findings: ['weak hook on beat 2, restates the headline', 'seam flash at 3.2s'] } });
```

A finding already logged and still unresolved is worth re-stating as still open; the point is not
repeating it as if it were new, so the stopping rule can tell a genuinely quiet round from one that
just forgot what the last round found.

## Sign the round off

A receipt makes "somebody looked" checkable, and hashes the scene so editing it silently withdraws its
own sign-off:

```js
import { writeReceipt } from './harness/lib/receipt.mjs';
writeReceipt('review', 'films/scene/<film>.json', { round: 3, lowest: 4, stopped: 'done' });
```

`make dev-tool X=beats` and `make dev-tool X=reveal` already write theirs, and `beat-check` fails `beats-unseen` when the
scene has moved on since anyone read a sheet. Use the same stage mechanism rather than a second one.
