import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { filmOfCall, imagesIn, reasonOf, causeOf, verbEvent, footerLine, verbRanSince, noteVerb, readNotes, UNFILED } from '../../harness/lib/verb-log.mjs';
import { refCard, flashShots } from '../../harness/lib/ref-card.mjs';

test('filmOfCall names the film from the page or mp4, a new film from its name, else _unfiled', () => {
  assert.equal(filmOfCall('dev', ['films/hud/page.html']), 'hud');
  assert.equal(filmOfCall('strip', ['out/hud-draft.mp4']), 'hud');
  assert.equal(filmOfCall('new', ['hud']), 'hud');
  assert.equal(filmOfCall('strip', ['mnowak']), UNFILED);
  assert.equal(filmOfCall('doctor', []), UNFILED);
});

test('imagesIn lists each image path a verb printed once, absolute or relative', () => {
  const text = 'look: /a/out/x-draft.png (frames)\n  1  1.2 s  /r/frames/m/key-1.png\nout/strip/hud/grid-01.png and /a/out/x-draft.png\nnot an image: notes.png.txt';
  assert.deepEqual(imagesIn(text), ['/a/out/x-draft.png', '/r/frames/m/key-1.png', 'out/strip/hud/grid-01.png']);
});

test('reasonOf keeps the last stderr line, or says exit code or signal', () => {
  assert.equal(reasonOf({ code: 1, stderr: 'a\n  at x (y)\nTimeoutError: Navigation timeout\n' }), 'exit 1: TimeoutError: Navigation timeout');
  assert.equal(reasonOf({ code: 1, signal: 'SIGKILL', stderr: '' }), 'killed by SIGKILL');
  assert.equal(reasonOf({ code: 137 }), 'exit 137');
});

test('causeOf groups the known failures and keeps unknown ones apart without their numbers', () => {
  assert.equal(causeOf('exit 1: TimeoutError: Navigation timeout of 30000 ms'), 'render slot or navigation timeout');
  assert.equal(causeOf('exit 1: detached Frame'), 'browser lost');
  assert.equal(causeOf('killed by SIGKILL'), 'killed');
  assert.equal(causeOf('exit 1: slice 3 failed'), 'slice # failed');
});

test('verbEvent records the call; a failure keeps its reason, a success has none; footerLine ends both', () => {
  const ok = verbEvent({ verb: 'dev', args: ['p'], stage: 'draft', startMs: 0, endMs: 28900, exitCode: 0, slotWaitS: 1.234, images: ['a.png'] });
  assert.deepEqual([ok.cmd, ok.verb, ok.stage, ok.durationS, ok.exitCode, ok.error, ok.slotWaitS], ['verb', 'dev', 'draft', 28.9, 0, null, 1.2]);
  assert.equal(verbEvent({ verb: 'dev', args: [], startMs: 0, endMs: 1000, exitCode: 1, reason: 'exit 1: x' }).error, 'exit 1: x');
  assert.equal(footerLine({ verb: 'dev', code: 0, seconds: 28.94 }), 'vawe: dev ok in 28.9s');
  assert.equal(footerLine({ verb: 'ship', code: 1, reason: 'exit 1: no slot', seconds: 3 }), 'vawe: ship FAILED (exit 1: no slot) in 3.0s');
});

test('verbRanSince needs a successful call after the time', () => {
  const records = [{ cmd: 'verb', verb: 'critique', exitCode: 1, start: '2026-10-09T10:00:00Z' }, { cmd: 'verb', verb: 'critique', exitCode: 0, start: '2026-10-09T11:00:00Z' }];
  assert.equal(verbRanSince(records, 'critique', Date.parse('2026-10-09T10:30:00Z')), true);
  assert.equal(verbRanSince(records, 'critique', Date.parse('2026-10-09T11:30:00Z')), false);
  assert.equal(verbRanSince(records, 'ship', 0), false);
});

test('a child script hands slotWaitS to the verb through the notes file', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-notes-')), 'n.jsonl');
  noteVerb({ slotWaitS: 4 }, {});
  assert.deepEqual(readNotes(file), {});
  noteVerb({ slotWaitS: 4 }, { VAWE_VERB_NOTES: file });
  assert.deepEqual(readNotes(file), { slotWaitS: 4 });
});

const SPEC = {
  duration: 5.5, cuts: [1, 2], colour: { shareDark: 0.683, shareLight: 0.078 },
  shots: [
    { index: 1, t0: 0, t1: 0.5, palette: [{ hex: '#111111', share: 0.9 }], camera: { big: true, zoomTotal: 0.9, peakPanPxPerFrame: 200 } },
    { index: 2, t0: 0.5, t1: 0.6, palette: [{ hex: '#fdeee6', share: 0.8 }, { hex: '#e0d1cc', share: 0.1 }], camera: { big: false, zoomTotal: 1 } },
    { index: 3, t0: 0.6, t1: 2, palette: [{ hex: '#000000', share: 0.8 }], camera: { big: false, zoomTotal: 1 } },
  ],
};

test('refCard: shots, flashes, luma bands, camera and a palette per shot, in under 25 lines', () => {
  assert.deepEqual(flashShots(SPEC.shots).map((s) => s.index), [2]);
  const card = refCard(SPEC, 'demo', '/refs/spec/demo');
  assert.ok(card.length < 25);
  const text = card.join('\n');
  assert.match(text, /card demo: 5\.50 s, 3 shots, 2 cuts/);
  assert.match(text, /shot lengths \(s\): 0\.50 0\.10 1\.40; median 0\.50, shortest 0\.10, longest 1\.40/);
  assert.match(text, /flashes \(light shots up to 0\.3 s\): 1, at 0\.50 s for 0\.10 s/);
  assert.match(text, /luma: 68% of pixels below L 20, 24% between, 8% above L 85/);
  assert.match(text, /camera: 1 of 3 shots move it a lot \(shots 1\)/);
  assert.match(text, /1: #111111 90%/);
  assert.match(text, /\/refs\/spec\/demo\/SPEC\.md/);
});
