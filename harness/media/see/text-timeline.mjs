// Every line of on-screen text, sampled every 1/sampleFps s, merged into runs of identical reads:
// the whole-film word inventory a rebuild checks itself against, so no brief word is missed.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ffmpegOrDie } from '../../lib/scratch.mjs';

/** -> [{ t0, t1, text }] in seconds; lines inside one sample are joined with " / ". */
export function textTimeline(video, workDir, sampleFps = 4) {
  // Leptonica rewrites /tmp paths and then finds no file; hand tesseract the real path.
  fs.mkdirSync(workDir, { recursive: true });
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(workDir), 'text-'));
  try {
    ffmpegOrDie(['-v', 'error', '-y', '-i', video, '-vf', `fps=${sampleFps},scale=1280:-2`, path.join(dir, 'f_%05d.png')], null, 'text frames');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
    const runs = [];
    files.forEach((f, i) => {
      const r = spawnSync('tesseract', [path.join(dir, f), 'stdout', '--psm', '11'], { encoding: 'utf8' });
      const text = (r.stdout || '').split('\n').map((s) => s.trim()).filter((s) => s.length > 1).join(' / ');
      const t = i / sampleFps;
      const last = runs[runs.length - 1];
      if (last && last.text === text) last.t1 = t;
      else runs.push({ t0: t, t1: t, text });
    });
    return runs;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
