// node harness/dev/list-assets.mjs fonts|sounds: the one-line-each listings behind `vawe fonts` and `vawe sounds`.
import fs from 'node:fs';
import { fontLines, soundLines } from '../lib/asset-lists.mjs';
import { CUES, DEFAULT_GAIN_DB, renderCue, wavDuration } from '../../core/audio/kit.mjs';

const [what] = process.argv.slice(2);
if (what === 'fonts') {
  const lock = JSON.parse(fs.readFileSync(new URL('../media/fonts.lock.json', import.meta.url), 'utf8'));
  console.log(fontLines(lock.faces).join('\n'));
} else if (what === 'sounds') {
  console.log(soundLines(CUES, DEFAULT_GAIN_DB, (spec) => wavDuration(renderCue(spec))).join('\n'));
} else {
  console.error('usage: list-assets.mjs fonts|sounds');
  process.exit(2);
}
