// scripts/lib/stagekit.test.mjs: the kit-identity check actually catches drift.
//   node scripts/lib/stagekit.test.mjs
import assert from 'node:assert/strict';
import { buildKit, kitCheck, extractKitBlock } from './stagekit.mjs';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/motion/motion.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const theme = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes/vawe.json'), 'utf8'));
const { block } = buildKit(theme, resolveLook, isLightBg);

// two byte-identical fragments: clean
{
  const frags = [{ path: 'a.html', src: `${block}\n<div>a</div>` }, { path: 'b.html', src: `${block}\n<div>b</div>` }];
  const { ok, findings } = kitCheck(block, frags);
  assert.equal(ok, true, 'two identical kit blocks should pass');
  assert.equal(findings.length, 0);
}

// one fragment with a hand-edited kit block: drift, named
{
  const drifted = block.replace('border-radius:16px', 'border-radius:99px');
  const frags = [{ path: 'a.html', src: block }, { path: 'b.html', src: drifted }];
  const { ok, findings } = kitCheck(block, frags);
  assert.equal(ok, false, 'a hand-edited kit block must fail');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].code, 'kit-drift');
  assert.match(findings[0].message, /b\.html/);
}

// a fragment with no kit block at all: named, not silently skipped
{
  const frags = [{ path: 'a.html', src: block }, { path: 'c.html', src: '<div>no kit here</div>' }];
  const { ok, findings } = kitCheck(block, frags);
  assert.equal(ok, false);
  assert.equal(findings[0].code, 'kit-missing');
}

assert.ok(extractKitBlock(block), 'extractKitBlock must find the block it just built');
assert.equal(extractKitBlock('<div>nothing</div>'), null);

console.log('✓ stagekit.test.mjs: kit-identity check passes identical blocks, catches drift, catches a missing block');
