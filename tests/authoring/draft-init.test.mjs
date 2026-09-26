// node --test tests/authoring/draft-init.test.mjs
//
// ensureDraftScene alone, no render: a fresh name gets a schema-valid scene with a real title, an
// existing scene is left untouched, and a brief's SUBJECT line beats the filename as the title source.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import assert from 'node:assert';
import { ensureDraftScene } from '../../harness/author/draft-init.mjs';
import { validateData } from '../../core/validate/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REL = 'tests/fixtures/draft-init'; // filePaths() (quality/gates/stage.mjs) resolves a relative
// D= against ROOT, the same shape every real caller (Makefile, harness) passes; an absolute path here
// would double up with ROOT inside path.join and silently miss the sibling .brief.md.
const DIR = path.join(ROOT, REL);
fs.mkdirSync(DIR, { recursive: true });

const written = [];
function track(relName) { written.push(path.join(DIR, relName)); return `${REL}/${relName}`; }
after(() => { for (const f of written) { try { fs.unlinkSync(f); } catch { /* already gone */ } } });

test('a fresh name gets a minimal, schema-valid scene', () => {
  const rel = track('brand-new-film.json');
  const scene = path.join(DIR, 'brand-new-film.json');
  fs.rmSync(scene, { force: true });
  const r = ensureDraftScene(rel);
  assert.equal(r.created, true);
  const data = JSON.parse(fs.readFileSync(scene, 'utf8'));
  assert.equal(data.module, 'scene');
  assert.ok(Array.isArray(data.bg) && data.bg.length > 0, 'bg is required');
  assert.ok(Array.isArray(data.layers) && data.layers.length > 0, 'layers is required');
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'films/scene/schema.json'), 'utf8'));
  assert.deepEqual(validateData(schema, data), []);
  assert.equal(data.layers[0].text, 'Brand new film', 'no brief: title comes from the file name');
});

test('a scene that already exists is left alone', () => {
  const rel = track('already-there.json');
  const scene = path.join(DIR, 'already-there.json');
  fs.writeFileSync(scene, JSON.stringify({ module: 'scene', bg: [{ preset: 'plain' }], layers: [] }));
  const before = fs.readFileSync(scene, 'utf8');
  const r = ensureDraftScene(rel);
  assert.equal(r.created, false);
  assert.equal(fs.readFileSync(scene, 'utf8'), before);
});

test('a brief\'s SUBJECT line wins over the file name', () => {
  const rel = track('briefed-film.json');
  track('briefed-film.brief.md');
  const scene = path.join(DIR, 'briefed-film.json');
  const brief = path.join(DIR, 'briefed-film.brief.md');
  fs.rmSync(scene, { force: true });
  fs.writeFileSync(brief, '# Brief: briefed-film\n\nSUBJECT: a password manager for teams\nDATA: none\n');
  const r = ensureDraftScene(rel);
  assert.equal(r.title, 'A password manager for teams');
  assert.equal(JSON.parse(fs.readFileSync(scene, 'utf8')).layers[0].text, 'A password manager for teams');
});
