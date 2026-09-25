// tests/authoring/box-style.test.mjs: the pure computed-style mapping preview-fragment.mjs's box dump relies on.
// No browser: only the string parsing that does not need one.
//   node tests/authoring/box-style.test.mjs
import assert from 'node:assert/strict';
import { normalizeColor, shadowOrNull, firstFontFamily, cornerRadii } from '../../harness/author/box-style.mjs';

// ---- normalizeColor ---------------------------------------------------------------------------
assert.equal(normalizeColor('rgb(255, 0, 128)'), '#ff0080', 'opaque rgb() lowers to hex');
assert.equal(normalizeColor('rgba(255, 0, 128, 1)'), '#ff0080', 'alpha 1 is still opaque, reported as hex');
assert.equal(normalizeColor('rgba(10, 20, 30, 0.5)'), 'rgba(10, 20, 30, 0.5)', 'partial alpha stays rgba(), never flattened to hex');
assert.equal(normalizeColor('rgba(0, 0, 0, 0)'), null, 'fully transparent paints nothing, so it is null, not a colour');
assert.equal(normalizeColor('transparent'), null, 'the transparent keyword is also null');
assert.equal(normalizeColor(null), null, 'no computed value at all is null');

// ---- shadowOrNull -------------------------------------------------------------------------------
assert.equal(shadowOrNull('none'), null, 'computed "none" means no shadow');
assert.equal(shadowOrNull('rgba(0, 0, 0, 0.2) 0px 4px 12px'), 'rgba(0, 0, 0, 0.2) 0px 4px 12px', 'a real shadow is passed through raw');

// ---- firstFontFamily ----------------------------------------------------------------------------
assert.equal(firstFontFamily('"Inter", sans-serif'), 'Inter', 'first family, unquoted');
assert.equal(firstFontFamily('Arial, sans-serif'), 'Arial', 'already unquoted stays as-is');
assert.equal(firstFontFamily(null), null);

// ---- cornerRadii ----------------------------------------------------------------------------------
assert.deepEqual(cornerRadii('8px', '8px', '8px', '8px'), { borderRadius: 8, borderRadiusMixed: false }, 'uniform corners, no mixed flag');
assert.deepEqual(cornerRadii('8px', '8px', '4px', '8px'), { borderRadius: 8, borderRadiusMixed: true }, 'one differing corner sets the mixed flag');
assert.deepEqual(cornerRadii('0px', '0px', '0px', '0px'), { borderRadius: 0, borderRadiusMixed: false }, 'square corners report 0, not falsy-and-skipped');

console.log('box-style.test.mjs: all assertions passed');
