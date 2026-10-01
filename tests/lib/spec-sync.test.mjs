import test from 'node:test';
import assert from 'node:assert/strict';
import { syncSpec } from '../../harness/lib/spec-sync.mjs';
import { parseBriefTables } from '../../harness/lib/brief-tables.mjs';

const brief = `# film: brief

### Words
| text | shot | appear s | settle s | cap % | x % | y % | weight | colour |
|---|---|---|---|---|---|---|---|---|
| Ship it | S1 | 1.0 s | 1.5 s | 8 | 10 | 40 | 700 | ink |
| Done | S2 | 3 | 3.5* | 7 | 10 | 40 | 700 | ink |
| Ghost | S2 | 4 | 4.5 | 7 | 10 | 40 | 700 | ink |

### Objects
| id | selector | shot | in s | settle s | out s |
|---|---|---|---|---|---|
| mark | .mark | S1 | 0.3 | 0.9 | 2 |

## Acceptance
| metric | target |
`;

const measured = {
  words: [{ text: 'Ship it', appear: 1.25, settle: 1.5 }, { text: 'Done', appear: 3, settle: 3.5 }],
  objects: [{ id: 'mark', in: 0.3, settle: 0.77, out: null }],
};

test('spec-sync writes the measured times, keeps text, shot and targets, and marks each changed cell', () => {
  const { text, changes, missing } = syncSpec(brief, measured);
  const t = parseBriefTables(text);
  assert.deepEqual(t.words.map((w) => [w.text, w.shot, w.appear, w.settle, w.cap, w.x, w.y]), [['Ship it', 'S1', 1.25, 1.5, 8, 10, 40], ['Done', 'S2', 3, 3.5, 7, 10, 40], ['Ghost', 'S2', 4, 4.5, 7, 10, 40]]);
  assert.deepEqual(t.objects.map((o) => [o.in, o.settle, o.out]), [[0.3, 0.77, 2]]);
  assert.match(text, /\| Ship it \| S1 \| 1\.25 s\* \| 1\.5 s \| 8 \|/);
  assert.match(text, /\| Done \| S2 \| 3 \| 3\.5 \| 7 \|/);
  assert.deepEqual(changes, ['Words "Ship it" appear: 1.0 s -> 1.25 s', 'Objects "mark" settle: 0.9 -> 0.77']);
  assert.deepEqual(missing, ['Words "Ghost"']);
});

test('spec-sync is stable: a second run with the same measure changes nothing and clears old marks', () => {
  const once = syncSpec(brief, measured).text;
  const twice = syncSpec(once, measured);
  assert.deepEqual(twice.changes, []);
  assert.doesNotMatch(twice.text, /\*/);
});
