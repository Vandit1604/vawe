import { spawnSync } from 'node:child_process';

/** { I, TP }: integrated LUFS and true peak dBFS of a file's audio, as the ebur128 filter reports them. Throws when ffmpeg fails or the file has no audio. */
export function measureFile(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg failed (${r.status}): ${(r.stderr || r.error?.message || '').split('\n').slice(-12).join('\n')}`);
  const summary = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  const I = summary.match(/I:\s+(-?[\d.]+) LUFS/), TP = summary.match(/Peak:\s+(-?[\d.]+) dBFS/);
  if (!I || !TP) throw new Error(`no loudness in the ffmpeg output for ${file}: the file has no audio stream`);
  return { I: parseFloat(I[1]), TP: parseFloat(TP[1]) };
}
