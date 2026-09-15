// ffprobe helper for the verify harness.
import { spawnSync } from 'node:child_process';

export function ffprobe(video) {
  const v = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries',
    'stream=width,height,r_frame_rate,codec_name,nb_read_frames', '-count_frames', '-of', 'json', video]);
  const f = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', video]);
  const a = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_name', '-of', 'json', video]);
  const vs = JSON.parse(v.stdout || '{}').streams?.[0] || {};
  const dur = Number(JSON.parse(f.stdout || '{}').format?.duration || 0);
  const ac = JSON.parse(a.stdout || '{}').streams?.[0]?.codec_name || null;
  const [n, d] = (vs.r_frame_rate || '30/1').split('/').map(Number);
  return { w: vs.width, h: vs.height, fps: d ? n / d : n, codec: vs.codec_name, frames: Number(vs.nb_read_frames || 0), duration: dur, audioCodec: ac };
}
