// tests/media/ocr-never-silent.test.mjs: OCR that reads nothing from a video with content is an error
// naming the causes, and a missing tesseract is an error, never an empty result. Needs ffmpeg.
//   node --test tests/media/ocr-never-silent.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertWordsRead } from '../../harness/lib/ref-measure/words.mjs';
import { sampleText } from '../../harness/media/see/text-timeline.mjs';

const word = { text: 'hi', conf: 90, cx: 1, cy: 1, w: 1, h: 1 };

test('0 words across samples that show content throws with the causes', () => {
  const samples = [{ t: 0, words: [], content: true }, { t: 0.5, words: [], content: true }];
  assert.throws(() => assertWordsRead(samples, 2), /OCR read 0 words in 2 sample\(s\).*tesseract.*sample rate.*--no-ocr/s);
});

test('one word, blank samples, or samples with no content flag do not throw', () => {
  assert.doesNotThrow(() => assertWordsRead([{ t: 0, words: [word], content: true }], 2));
  assert.doesNotThrow(() => assertWordsRead([{ t: 0, words: [], content: false }], 2));
  assert.doesNotThrow(() => assertWordsRead([{ t: 0, words: [] }], 2));
});

test('sampleText throws when tesseract is not on PATH', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-never-silent-'));
  const savedPath = process.env.PATH;
  try {
    const video = path.join(dir, 'bars.mp4');
    const mk = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=10:duration=1', '-pix_fmt', 'yuv420p', video]);
    assert.equal(mk.status, 0, String(mk.stderr));
    const ffmpegDir = path.dirname(spawnSync('which', ['ffmpeg'], { encoding: 'utf8' }).stdout.trim());
    const bin = path.join(dir, 'bin');
    fs.mkdirSync(bin);
    for (const tool of ['ffmpeg', 'ffprobe']) fs.symlinkSync(path.join(ffmpegDir, tool), path.join(bin, tool));
    process.env.PATH = bin;
    await assert.rejects(sampleText(video, path.join(dir, 'work'), { sampleFps: 2 }), /tesseract is not installed/);
  } finally {
    process.env.PATH = savedPath;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
