// What `vawe see` looks at: a page (its draft mp4, rendered first when missing or older than the page), an mp4, or a reference id.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { refsDir } from '../../lib/refs.mjs';
import { die, probeVideo, ROOT } from './core.mjs';
import { resolveInput } from './strip.mjs';

/** The sha1 of a file's bytes. */
export const fileHash = (file) => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');

function renderDraft(page, log) {
  log(`rendering a draft of ${page} (harness/media/render-page.mjs)`);
  const res = spawnSync('node', [path.join(ROOT, 'harness/media/render-page.mjs'), page], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 1 << 26 });
  if (res.status !== 0) die(`the draft render of ${page} failed:\n${String(res.stderr || res.stdout).split('\n').slice(-8).join('\n')}`);
}

/**
 * { video, name, kind, page, hash, note, probe } of `input`: kind is `page`, `mp4` or `ref`. `draft` names the mp4 a page was rendered to (when it
 * is not out/<name>-draft.mp4). The hash covers the mp4 and, for a page, its text, so a change to either makes a new measure.
 */
export async function resolveSource(input, { draft, log = () => {} } = {}) {
  const found = await resolveInput(input);
  const page = input.endsWith('.html') ? input : null;
  let video = found.video;
  if (page && draft) {
    if (!fs.existsSync(draft)) die(`no such --draft file: ${draft}`);
    video = draft;
  } else if (page && (found.draftMissing || found.draftOld)) {
    renderDraft(page, log);
  }
  if (!fs.existsSync(video)) die(`no film to read at ${video}`);
  const isRef = !page && path.resolve(video).startsWith(path.resolve(refsDir()));
  const kind = page ? 'page' : isRef ? 'ref' : 'mp4';
  const probe = probeVideo(video);
  const stream = Number(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=duration', '-of', 'default=noprint_wrappers=1:nokey=1', video], { encoding: 'utf8' }).stdout);
  if (stream > 0) probe.dur = Math.min(probe.dur, stream);
  const hash = crypto.createHash('sha1').update(fileHash(video)).update(page ? fs.readFileSync(page) : '').digest('hex');
  return { video: path.resolve(video), name: found.name, kind, page: page ? path.resolve(page) : null, hash, probe,
    note: page ? `draft of ${page}` : isRef ? 'reference film' : 'film' };
}
