// tests/authoring/storyboard-parse-table.test.mjs: a storyboard written as a beat TABLE
// (`| beat | start | end | ... |`) instead of `## Beat N:` headings used to parse to ZERO beats
// (`blocksOf` only ever split on headings), which silently sent every consumer of
// `harness/author/storyboard-parse.mjs` (match.mjs among them) down its no-storyboard path.
// Run: node tests/authoring/storyboard-parse-table.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStoryboard } from '../../harness/author/storyboard-parse.mjs';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = fs.readFileSync(path.join(ROOT, 'tests/fixtures/films/table.storyboard.md'), 'utf8');

const sb = parseStoryboard(src);
assert(sb.beats.length === 2, `expected 2 table beats, got ${sb.beats.length}`);
assert(sb.beats[0].name === 'Opening' && sb.beats[0].start === 0 && sb.beats[0].end === 3,
  `beat 1 must read its name/start/end off the table row: ${JSON.stringify(sb.beats[0])}`);
assert(sb.beats[1].name === 'Payoff' && sb.beats[1].start === 3 && sb.beats[1].end === 6,
  `beat 2 must read its name/start/end off the table row: ${JSON.stringify(sb.beats[1])}`);
assert(sb.beats[0].onscreen[0] === 'Hello', `a recognised column (onscreen) must reach the beat: ${JSON.stringify(sb.beats[0].onscreen)}`);

// A storyboard with `## Beat N:` headings must keep using them, table or no table elsewhere in the file.
const headingSrc = '## Beat 1: Hook (0.0s-2.0s)\n- onscreen: "Hi"\n';
const headingSb = parseStoryboard(headingSrc);
assert(headingSb.beats.length === 1 && headingSb.beats[0].start === 0 && headingSb.beats[0].end === 2,
  `heading storyboards must still parse the old way: ${JSON.stringify(headingSb.beats)}`);

// No headings and no beat table: zero beats, same as before this change (never invented).
assert(parseStoryboard('just some prose, no beats here').beats.length === 0,
  'a storyboard with neither shape must still parse to zero beats');

console.log('storyboard-parse-table.test.mjs: ok');
