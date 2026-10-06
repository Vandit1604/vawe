import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVerified, filmType, pickRefs, refsDir, listLines } from '../../harness/lib/refs.mjs';

const VERIFIED = `
**A. Product and UI films (best fit for HTML/CSS/WebGL)**

1. **Introducing Linear Agent** | Linear (in-house) | 2026 (20260324) | 55 s | product launch | https://www.youtube.com/watch?v=mRql2VJ99gM | 24k views | local: \`/private/tmp/x/mRql2VJ99gM.mp4\` | Recognition: none.
   - A description line.
5. **Arc 1.0 | Everything or nothing** | The Browser Company | 2023 | 34 s | product launch | https://x | local: \`.../n5Vwrj1gEWs.mp4\`
9. **Dia Browser** | The Browser Company | 2025 | 78 s | live action | https://x | local: \`.../YVOw0TAO9ok.mp4\`

**B. Brand, ident and conference openers (type, shape, texture)**

11. **Vercel Ship 2024** | Vercel; identity by basement.studio | 2024 | 36 s | ident | https://x | local: \`.../PHvw0IP7dEU.mp4\`

**Verified but weak fit or out of scope (downloaded, not in the main list)**
- Stripe Sessions 2024, 109 s, https://www.youtube.com/watch?v=KH0_HM6e66w, \`.../KH0_HM6e66w.mp4\`: event recap.
- Node Fest 2018, 118 s, https://x , local \`rs-uCBlLaAg.mp4\`: cinematic CG.

### Inferences
- text
`;

test('parseVerified reads id, title, studio, length, type and scope', () => {
  const films = parseVerified(VERIFIED);
  assert.deepEqual(films.map((f) => f.id), ['mRql2VJ99gM', 'n5Vwrj1gEWs', 'YVOw0TAO9ok', 'PHvw0IP7dEU', 'KH0_HM6e66w', 'rs-uCBlLaAg']);
  assert.deepEqual(films[0], { id: 'mRql2VJ99gM', title: 'Introducing Linear Agent', studio: 'Linear', type: 'product', seconds: 55, inScope: true, why: null });
  assert.equal(films[1].title, 'Arc 1.0 | Everything or nothing');
  assert.equal(films[3].studio, 'Vercel');
  assert.equal(films[3].type, 'brand');
});

test('live action, 3D CG, and the weak-fit list are out of scope with no type', () => {
  const films = Object.fromEntries(parseVerified(VERIFIED).map((f) => [f.id, f]));
  assert.deepEqual([films.YVOw0TAO9ok.inScope, films.YVOw0TAO9ok.type, films.YVOw0TAO9ok.why], [false, null, 'live action']);
  assert.equal(films['KH0_HM6e66w'].inScope, false);
  assert.equal(films['rs-uCBlLaAg'].seconds, 118);
});

test('filmType reads the template line, else routes the request', () => {
  assert.equal(filmType('# x: brief\n\nTemplate: prompts/brand-launch-from-url.md. Shape: a.'), 'product');
  assert.equal(filmType('Template: prompts/beat-sheet.md. Shape: a.'), 'brand');
  assert.equal(filmType('Template: prompts/reference-rebuild.md. Shape: a.'), null);
  const route = (request, length) => (request.includes('launch') && length === 18 ? 'prompts/brand-launch-from-url.md' : null);
  assert.equal(filmType('## Inputs\n\n- request: an 18 s launch film\n- length: 18 s', route), 'product');
  assert.equal(filmType('no template and no request'), null);
});

const registry = [
  { id: 'b', type: 'product', seconds: 30, inScope: true, sheet: 's/b.png' },
  { id: 'a', type: 'product', seconds: 30, inScope: true, sheet: 's/a.png' },
  { id: 'c', type: 'product', seconds: 55, inScope: true, sheet: 's/c.png' },
  { id: 'd', type: 'product', seconds: 18, inScope: false, sheet: 's/d.png' },
  { id: 'e', type: 'brand', seconds: 18, inScope: true, sheet: 's/e.png' },
  { id: 'f', type: 'product', seconds: 18, inScope: true, sheet: null },
];

test('pickRefs takes the two closest lengths of the type, ties by id, and skips out of scope and sheetless films', () => {
  assert.deepEqual(pickRefs(registry, { type: 'product', seconds: 25 }).map((r) => r.id), ['a', 'b']);
  assert.deepEqual(pickRefs(registry, { type: 'product', seconds: 60 }).map((r) => r.id), ['c', 'a']);
  assert.deepEqual(pickRefs(registry, { type: 'brand', seconds: 60 }).map((r) => r.id), ['e']);
  assert.deepEqual(pickRefs(registry, { type: 'product', seconds: 25 }), pickRefs([...registry].reverse(), { type: 'product', seconds: 25 }));
});

test('refsDir prefers VAWE_REFS_DIR', () => {
  assert.equal(refsDir({ VAWE_REFS_DIR: '/r' }, '/h'), '/r');
  assert.equal(refsDir({}, '/h'), '/h/.vawe/refs');
});

test('listLines gives one aligned line per film', () => {
  const lines = listLines([{ id: 'a', type: 'product', seconds: 30.4, inScope: true, studio: 'Linear', title: 'T' }, { id: 'bb', type: null, seconds: 9, inScope: false, why: '3D CG', studio: null, title: 'U' }]);
  assert.equal(lines.length, 2);
  assert.match(lines[1], /^bb {2}out \(3D CG\) {2}9 s +- +U$/);
});
