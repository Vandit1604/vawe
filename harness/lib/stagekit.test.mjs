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

// REGRESSION: no design.md (spec undefined, or spec null) leaves the kit byte-identical to before
// design.md existed. This is the one guarantee the whole mechanism rests on.
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const vawe = JSON.parse(fs.readFileSync(path.join(root, 'themes/vawe.json'), 'utf8'));
  const noArg = buildKit(vawe, resolveLook, isLightBg);
  const nullSpec = buildKit(vawe, resolveLook, isLightBg, null);
  assert.equal(noArg.css, nullSpec.css, 'a bare buildKit call and an explicit null spec must match byte for byte');
  assert.equal(noArg.block, nullSpec.block);
  assert.deepEqual(noArg.warnings, []);
}

// a design.md that declares a NEW token gets a --kit-<group>-<name> custom property and, for a type
// role, a .kit-<role> class; a design.md that SHADOWS an existing kit value with a different number
// gets one warn line naming the drift.
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const vawe = JSON.parse(fs.readFileSync(path.join(root, 'themes/vawe.json'), 'utf8'));
  const base = buildKit(vawe, resolveLook, isLightBg);
  const [, mdRadius] = /--kit-radius-md:(\d+)px/.exec(base.css) || [];
  const spec = { tokens: {
    palette: { branch: '#4f46e5' },
    type: { command: { family: 'Anybody', size: 40, weight: 600 } },
    radius: { panel: 24, md: Number(mdRadius) + 5 },
    shadow: { glass: '0 8px 30px rgba(0,0,0,0.12)' },
    space: {},
  } };
  const withSpec = buildKit(vawe, resolveLook, isLightBg, spec);
  assert.match(withSpec.css, /--kit-color-branch:#4f46e5;/);
  assert.match(withSpec.css, /--kit-type-command-size:40px;/);
  assert.match(withSpec.css, /\.kit-command\{font:var\(--kit-type-command-weight, 600\) var\(--kit-type-command-size, 40px\) var\(--kit-type-command-family, Anybody\);color:var\(--text\);margin:0\}/);
  assert.match(withSpec.css, /--kit-radius-panel:24px;/);
  assert.match(withSpec.css, /--kit-shadow-glass:0 8px 30px rgba\(0,0,0,0\.12\);/);
  assert.equal(withSpec.warnings.length, 1, 'radius.md shadows the kit\'s own value and must warn exactly once');
  assert.match(withSpec.warnings[0], /radius\.md/);
}

