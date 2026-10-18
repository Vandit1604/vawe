// The one place that fetches the free faces: `vawe new` and `vawe moves` call it when a face they need is missing from the gitignored assets/fonts.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const FACE = /assets\/fonts\/([\w.-]+\.woff2)/g;

/** The font file names that the given source texts reference under assets/fonts. */
export const fontFilesIn = (...texts) => [...new Set(texts.flatMap((t) => [...t.matchAll(FACE)].map((m) => m[1])))];

/** Runs generators/media/fonts.mjs when any of `files` is missing; true when it ran. */
export function ensureFonts(root, files, { run = (cmd, args, opts) => spawnSync(cmd, args, opts) } = {}) {
  if (files.every((f) => fs.existsSync(path.join(root, 'assets', 'fonts', f)))) return false;
  run(process.execPath, [path.join(root, 'generators', 'media', 'fonts.mjs')], { cwd: root, stdio: 'inherit' });
  return true;
}
