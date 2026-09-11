// harness/lib/stagekit.test.mjs: the kit-identity check actually catches drift.
//   node harness/lib/stagekit.test.mjs
import assert from 'node:assert/strict';
import { buildKit, kitCheck, extractKitBlock, MIN_VIDEO_TEXT_PX } from './stagekit.mjs';
import { resolveLook } from '../../core/registry/theme-contract.js';
import { isLightBg } from '../../core/color/engine.js';
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
  // Read the actual computed radius back out of the golden block rather than hardcoding a px value:
  // buildKit derives `.kit-card`'s radius from the theme's own accent cut (see stagekit.mjs), so the
  // literal number here would go stale the moment that derivation changes, same trap as the block itself.
  const [, mdRadius] = /\.kit-card\{[^}]*border-radius:(\d+)px/.exec(block) || [];
  assert.ok(mdRadius, 'golden block must declare .kit-card border-radius');
  const drifted = block.replace(`border-radius:${mdRadius}px`, 'border-radius:99px');
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

// every text role the kit writes is readable in a moving frame: a theme whose caption scale sits under the
// floor (vawe's is 24) still gets a kit that passes make screen's smallest-text check
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const vawe = JSON.parse(fs.readFileSync(path.join(root, 'themes/vawe.json'), 'utf8'));
  const { css } = buildKit(vawe, resolveLook, isLightBg);
  for (const role of ['kit-caption', 'kit-eyebrow']) {
    const px = +(new RegExp(`\\.${role}\\{font:\\d+ (\\d+)px`).exec(css) || [])[1];
    assert.ok(px >= MIN_VIDEO_TEXT_PX, `.${role} is ${px}px, under the ${MIN_VIDEO_TEXT_PX}px floor`);
  }
}

// radius is a variable as well as a class, so a fragment rule's var(--kit-radius-md) resolves
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const { css } = buildKit(JSON.parse(fs.readFileSync(path.join(root, 'themes/vawe.json'), 'utf8')), resolveLook, isLightBg);
  for (const k of ['sm', 'md', 'lg']) assert.match(css, new RegExp(`--kit-radius-${k}:\\d+px`), `kit is missing --kit-radius-${k}`);
}

