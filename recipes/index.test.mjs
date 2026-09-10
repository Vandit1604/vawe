import assert from 'node:assert/strict';
import { RECIPES, checkRecipe, pickRecipe } from './index.mjs';

assert.ok(RECIPES['flow-seam'].sources.length >= 1);
assert.throws(() => checkRecipe('x', { kind: 'seam', blurb: 'a recipe invented from nothing at all', sources: [], slots: {} }), /no sources/);
assert.throws(() => pickRecipe('nope'), /Known: flow-seam/);
console.log('ok - recipes: every recipe names a source, an unknown name is refused');
