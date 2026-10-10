// Advice that names a trick teaches the trick. These lines must stay out of the advice the harness prints and the rules authors read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stillText } from '../../harness/lib/still-limit.mjs';
import { spectacleWeak } from '../../harness/lib/bar-lint.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const BANNED = [/slow drift on the ground/i, /end on a slow (push|drift)/i, /move <meta name="spectacle">/i, /or aria-hidden="true"/, /grain is the cheapest fix/i, /small move on a part or the ground/i];

test('the printed advice does not name a trick', () => {
  const lines = [
    stillText({ a: 1, b: 2, len: 1, camera: true }),
    spectacleWeak([{ label: 'badge', speed: 5, at: 4.8 }], 12, [0, 20])[0].fix,
  ];
  for (const line of lines) for (const re of BANNED) assert.doesNotMatch(line, re);
});

test('the rule files and the digest do not prescribe a drift or a moved meta', () => {
  for (const p of ['taste/rules/moving-tail.md', 'taste/rules/live-hold.md', 'taste/rules/gradient-grain.md', 'taste/build/DIGEST.md', 'harness/lib/still-limit.mjs', 'harness/lib/acceptance.mjs', 'harness/lib/bar-lint.mjs']) {
    for (const re of BANNED) assert.doesNotMatch(read(p), re, `${p} matches ${re}`);
  }
});
