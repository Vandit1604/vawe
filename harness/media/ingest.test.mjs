// harness/media/ingest.test.mjs: house-rule self-check, no framework.
//   node harness/media/ingest.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseSilenceOutput } from './ingest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'harness/media/ingest.mjs');

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

// (a) the silence parser, on ffmpeg's own silencedetect stderr shape, no ffmpeg spawned.
{
  const stderr = [
    '[silencedetect @ 0x0] silence_start: 0.5',
    '[silencedetect @ 0x0] silence_end: 2.25 | silence_duration: 1.75',
    'some unrelated ffmpeg line',
    '[silencedetect @ 0x0] silence_start: 4',
    '[silencedetect @ 0x0] silence_end: 4.6 | silence_duration: 0.6',
  ].join('\n');
  const spans = parseSilenceOutput(stderr);
  assert(spans.length === 2, `expected 2 silence spans, got ${spans.length}`);
  assert(spans[0].start === 0.5 && spans[0].end === 2.25 && spans[0].duration === 1.75,
    `first span wrong: ${JSON.stringify(spans[0])}`);
  assert(spans[1].start === 4 && spans[1].end === 4.6 && spans[1].duration === 0.6,
    `second span wrong: ${JSON.stringify(spans[1])}`);
}
{
  // A silence_start with no matching end (file ends mid-silence, or a stray log line) contributes
  // nothing rather than a half-formed span.
  const spans = parseSilenceOutput('[silencedetect @ 0x0] silence_start: 1.0\n');
  assert(spans.length === 0, `an unterminated silence_start must not become a span, got ${spans.length}`);
}
console.log('✓ ingest.test.mjs: parseSilenceOutput');

// (b) the cut-list shape, end to end on a real synthetic clip: two colours joined at a hard cut, with
// a tone on the first half only (so a real "has audio" answer is exercised, not assumed true).
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-test-'));
const half1 = path.join(tmp, 'half1.mp4');
const half2 = path.join(tmp, 'half2.mp4');
const src = path.join(tmp, 'src.mp4');
const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
ff(['-f', 'lavfi', '-i', 'color=c=red:size=320x180:duration=2:rate=25',
  '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
  '-c:v', 'libx264', '-c:a', 'aac', '-shortest', half1]);
ff(['-f', 'lavfi', '-i', 'color=c=blue:size=320x180:duration=2:rate=25',
  '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '2',
  '-c:v', 'libx264', '-c:a', 'aac', '-shortest', half2]);
const concatList = path.join(tmp, 'list.txt');
fs.writeFileSync(concatList, `file '${half1}'\nfile '${half2}'\n`);
ff(['-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', src]);

const outDir = path.join(tmp, 'out');
const stdout = execFileSync('node', [SCRIPT, src, 'fixture', '--out-dir', outDir], { cwd: ROOT, encoding: 'utf8' });
assert(/has audio/.test(stdout), `probe line must report audio on a clip whose first half has a tone: ${stdout}`);

const cuts = JSON.parse(fs.readFileSync(path.join(outDir, 'fixture.cuts.json'), 'utf8'));
assert(Array.isArray(cuts), 'the cuts file must be a bare array, the shape cuts[] sugar consumes');
assert(cuts.length >= 1, `expected at least one shot, got ${cuts.length}`);
for (const c of cuts) {
  assert(typeof c.src === 'string' && c.src.length > 0, `entry missing src: ${JSON.stringify(c)}`);
  assert(typeof c.in === 'number' && typeof c.out === 'number' && c.out > c.in,
    `entry must carry a real [in, out) window: ${JSON.stringify(c)}`);
  assert(typeof c.audio === 'boolean', `entry missing boolean audio: ${JSON.stringify(c)}`);
}
assert(cuts[0].in === 0, `the first entry must start at 0, got ${cuts[0].in}`);
assert(Math.abs(cuts[cuts.length - 1].out - 4) < 0.1,
  `the last entry must end at the clip's own duration (~4s), got ${cuts[cuts.length - 1].out}`);
assert(fs.existsSync(path.join(outDir, 'fixture.contact-sheet.png')), 'the contact sheet must be written');

console.log('✓ ingest.test.mjs: cut-list shape, end to end');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('ingest.test.mjs: ok');
