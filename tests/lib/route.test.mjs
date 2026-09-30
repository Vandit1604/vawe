import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickTemplate, readRouting, pickRecipe, readRecipes } from '../../harness/cli/route.mjs';
import { starterPage, starterFace } from '../../harness/cli/new.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const table = readRouting(root);

test('a sting or a short film never takes the brand launch template', () => {
  assert.equal(pickTemplate({ request: 'a 5 s sting for acme.com' }, table).template, 'prompts/beat-sheet.md');
  assert.equal(pickTemplate({ request: 'launch video for https://acme.com', length: 6 }, table).template, 'prompts/beat-sheet.md');
  assert.equal(pickTemplate({ name: 'acme-bumper' }, table).template, 'prompts/beat-sheet.md');
});

test('request words and length pick the other rows from ROUTING.md', () => {
  assert.equal(pickTemplate({ request: 'launch video for https://acme.com' }, table).template, 'prompts/brand-launch-from-url.md');
  assert.equal(pickTemplate({ request: 'explain how tides work' }, table).template, 'prompts/story-explainer.md');
  assert.equal(pickTemplate({ length: 90 }, table).template, 'prompts/directors-brief-long-form.md');
});

test('a 20 to 30 s request names its RECIPES.md chain; other lengths name none', () => {
  const recipes = readRecipes(root);
  const chain = (request, length = 22) => pickRecipe({ request, length }, recipes)?.heading.split(',')[0] ?? null;
  assert.equal(chain('an AI demo of our ledger assistant'), '10. AI product demo');
  assert.equal(chain('a feature tour of the editor'), '11. Feature tour');
  assert.equal(chain('a proof film with customer results'), '12. Proof film');
  assert.equal(chain('a kinetic type manifesto'), '13. Kinetic type manifesto');
  assert.equal(chain('a brand reveal for onsen'), '14. Brand reveal');
  assert.equal(chain('launch video for https://acme.com'), '9. Problem to fix launch');
  assert.equal(chain('an AI demo', 8), null);
  assert.equal(chain('an AI demo', 45), null);
  assert.equal(chain('a nice film'), null);
});

test('a product demo, feature tour or proof film takes the brand launch template', () => {
  for (const request of ['an AI demo of our ledger assistant', 'a feature tour of the editor', 'a proof film for acme']) {
    assert.equal(pickTemplate({ request, length: 22 }, table).type, 'brand launch', request);
  }
});

test('an unknown request takes the motion-graphic row and says so', () => {
  const r = pickTemplate({ name: 'zz-demo' }, table);
  assert.equal(r.template, 'prompts/beat-sheet.md');
  assert.equal(r.known, false);
});

test('the starter uses exact curves, a bundled face and beat properties', () => {
  const page = starterPage({ face: starterFace('zz-demo') });
  assert.doesNotMatch(page, /cubic-bezier|system-ui/);
  assert.match(page, /curveToLinear/);
  assert.match(page, /@font-face \{ font-family: "[^"]+"; src: url\("assets\/[A-Za-z]+\.woff2"\)/);
  assert.match(page, /--beat-1: 0s; --beat-2:/);
});
