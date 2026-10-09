import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fontLines, soundLines } from '../../harness/lib/asset-lists.mjs';

const faces = {
  'Fraunces.woff2': { pkg: '@fontsource-variable/fraunces', file: 'fraunces-latin-wght-normal.woff2' },
  'space-500.woff2': { pkg: '@fontsource/space-grotesk', file: 'space-grotesk-latin-500-normal.woff2' },
  'JetBrainsMono-400.woff': { pkg: '@fontsource/jetbrains-mono', file: 'jetbrains-mono-latin-400-normal.woff' },
};

test('fontLines: one line per woff2 face with its file; OG-only woff is left out', () => {
  const lines = fontLines(faces);
  assert.ok(lines.includes('Fraunces | variable 100-900 | assets/fonts/Fraunces.woff2'));
  assert.ok(lines.includes('Space Grotesk | 500 | assets/fonts/space-500.woff2'));
  assert.ok(!lines.some((l) => l.includes('JetBrainsMono-400')));
});

test('fontLines: the script its last line names exists', () => {
  const script = /node (\S+)/.exec(fontLines(faces).at(-1))[1];
  assert.ok(fs.existsSync(new URL(`../../${script}`, import.meta.url)), script);
});

test('soundLines: one line per voice with gain and length', () => {
  const lines = soundLines({ pluck: {}, swell: {} }, { pluck: -6, swell: -4 }, () => 0.5);
  assert.deepEqual(lines.slice(1), ['pluck | -6 dB | 0.50 s', 'swell | -4 dB | 0.50 s']);
});
