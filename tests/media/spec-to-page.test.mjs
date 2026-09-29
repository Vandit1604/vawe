// tests/media/spec-to-page.test.mjs: house-rule self-check, no framework.
//   node tests/media/spec-to-page.test.mjs
//
// spec-to-page is pure, so the checked-in worked example (tests/fixtures/recreation-worked) is its own
// oracle: the spec.json there must still produce the page.html, GUIDE.md and TEXT.md beside it, and every
// numeric literal in the page data must carry its `measured` or `default` tag.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { specToFiles } from '../../harness/media/spec-to-page.mjs';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/recreation-worked');
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const assert = (cond, msg) => { if (!cond) throw new Error(`FAIL: ${msg}`); };

const spec = JSON.parse(read('spec.json'));
const files = specToFiles(spec, { name: 'recreation-worked', refBase: 'reference.mp4', fonts: ['Geist', 'PlusJakartaSans', 'Manrope', 'HankenGrotesk', 'ModernEra-Bold', 'Anybody', 'Archivo', 'BricolageGrotesque', 'Inter'] });
for (const f of ['page.html', 'GUIDE.md', 'TEXT.md']) assert(files[f] === read(f), `${f} drifted from the worked example: regenerate tests/fixtures/recreation-worked`);

const data = files['page.html'].split('\n').filter((l) => /^ {6}\{ text: /.test(l));
assert(data.length > 0, 'the worked page has word rows');
for (const line of data) {
  const bare = line.replace(/\/\*[^*]*\*\//g, '').replace(/'[^']*'/g, '');
  const numbers = bare.match(/-?\d+\.?\d*/g) || [];
  const tags = line.match(/\/\* (measured|default)[^*]*\*\//g) || [];
  assert(tags.length >= numbers.length, `a literal has no measured/default tag: ${line.slice(0, 120)}`);
}
console.log('ok - spec-to-page reproduces the worked example and tags every literal');
