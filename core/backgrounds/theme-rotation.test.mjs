// core/backgrounds/theme-rotation.test.mjs: the runnable self-check for expandThemeRotation
// (engine-doctrine/CRAFT/THEME-LOOK.md "bgDefault can now be a ROTATION"). Pure-JS.
//   node core/backgrounds/theme-rotation.test.mjs
import assert from 'node:assert/strict';
import { expandThemeRotation } from './theme-rotation.js';
import { junctionTable, marksOf } from '../timeline/junctions.js';

const table = (cuts) => junctionTable(marksOf({ cuts: cuts.map((t) => ({ t })) }));

// ---- a jointed film expands the single use:"theme" window into one per shot, cycling the rotation ----
{
  const theme = { bgDefault: [{ preset: 'paper' }, { preset: 'dark' }, { preset: 'accent' }] };
  const bg = expandThemeRotation([{ use: 'theme' }], theme, table([2, 4]), 6);
  assert.equal(bg.length, 3, 'three shots (two cuts) expand to three windows');
  assert.deepEqual(bg.map((w) => w.preset), ['paper', 'dark', 'accent'], 'cycles the rotation in order');
  for (const w of bg) assert.equal(w.use, undefined, 'expanded windows are resolved specs, not a second "use:theme" hop');
}

// ---- a jointless film stays one shot: the single window is untouched ----
{
  const theme = { bgDefault: [{ preset: 'paper' }, { preset: 'dark' }] };
  const bg = expandThemeRotation([{ use: 'theme' }], theme, table([]), 6);
  assert.deepEqual(bg, [{ use: 'theme' }], 'no joints: nowhere for a second window to live, so nothing expands');
}

// ---- a film that already authors its own bg windows is untouched, whatever the theme declares ----
{
  const theme = { bgDefault: [{ preset: 'paper' }, { preset: 'dark' }, { preset: 'accent' }] };
  const authored = [{ preset: 'soft', from: 0, to: 2 }, { preset: 'ink', from: 2, to: 6 }];
  const bg = expandThemeRotation(authored, theme, table([2, 4]), 6);
  assert.equal(bg, authored, 'an authored bg array is returned unchanged, not merged with the rotation');
}

// ---- a theme with a single-object bgDefault degrades to the old single-window behaviour ----
{
  const theme = { bgDefault: { preset: 'paper' } };
  const bg = expandThemeRotation([{ use: 'theme' }], theme, table([2, 4]), 6);
  assert.deepEqual(bg, [{ use: 'theme' }], 'a single-spec bgDefault (not an array) never expands');
}

// ---- a window that already names its own from/to opts out, even with a rotation available ----
{
  const theme = { bgDefault: [{ preset: 'paper' }, { preset: 'dark' }] };
  const bg = expandThemeRotation([{ use: 'theme', from: 0, to: 3 }], theme, table([2, 4]), 6);
  assert.equal(bg.length, 1, 'a window with an explicit edge means exactly what it said, and is left alone');
}

console.log('✓ theme-rotation.test.mjs: jointed rotation, jointless single-shot, authored-untouched, single-spec degrade all hold');
