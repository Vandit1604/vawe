// tests/gates/no-silent-fallback-blocks.test.mjs: the runnable self-check for engine-doctrine/MISTAKES.md's
// fallback-to-default pattern, in the blocks/ component library. Lives here rather than
// inside blocks/ itself because blocks/index.mjs treats every .mjs file in that directory as a block
// family and refuses one with no CATEGORY/schema exports (quality/gates/lib-test.mjs's directory-drift
// check), which a plain test file is not.
//
// Each site below used to resolve a wrong (misspelled) name-shaped value with `MAP[name] || MAP.default`,
// so a real typo silently rendered the default instead of failing. Fixed to REFUSE an unknown name by
// throwing, naming the field, the bad value, and what is legal (core/registry/registry.js's own rule,
// applied by hand at these sites because they are not the closed-vocabulary kind that registry serves).
//
//   node tests/gates/no-silent-fallback-blocks.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const blocks = (f) => path.join(ROOT, 'blocks', f);
await import(`file://${blocks('index.mjs')}`);   // fills the block registry `pane` (below) resolves other blocks through
const { palette } = await import(`file://${blocks('codeanim.mjs')}`);
const { screenSwap } = await import(`file://${blocks('core.mjs')}`);
const { keyboard } = await import(`file://${blocks('interact.mjs')}`);
const { toneColor } = await import(`file://${blocks('kit.mjs')}`);

const throwsUnknown = (fn, label) => assert.throws(fn, /unknown/i, `${label} should refuse an unknown name, not fall back to a default`);
const screen = { block: 'callout', props: { text: 'x' } };

// `settingsRow` (blocks/app.mjs) and `diff` (blocks/dev.mjs) were cut: both were static HTML
// fragments with no mechanism, so their own name-keyed refusal went with them.
throwsUnknown(() => palette('midnite'), 'blocks/codeanim.mjs palette theme');
throwsUnknown(() => screenSwap({ screens: [screen], transition: 'wype' }), 'blocks/core.mjs screenSwap transition');
throwsUnknown(() => keyboard({ x: 0, y: 0, layout: 'qwety' }), 'blocks/interact.mjs keyboard layout');
throwsUnknown(() => toneColor('sucess'), 'blocks/kit.mjs toneColor tone');

// The legal values still work (no false refusal introduced).
assert.doesNotThrow(() => palette('midnight'));
assert.doesNotThrow(() => screenSwap({ screens: [screen], transition: 'wipe' }));
assert.doesNotThrow(() => keyboard({ x: 0, y: 0, layout: 'qwerty' }));
assert.doesNotThrow(() => toneColor('ok'));

console.log('ok - no-silent-fallback-blocks: 4 name-keyed sites refuse an unknown name instead of silently defaulting');
