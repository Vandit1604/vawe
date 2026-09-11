// harness/lib/design-spec.test.mjs: the film design sidecar reads, merges over the kit's own values,
// and can name the nearest declared token to a stray number or colour.
//   node harness/lib/design-spec.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readDesignSpec, legalSet, nearestToken, parseYamlLite } from './design-spec.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-spec-test-'));
const filmPath = path.join(dir, 'demo.json');
fs.writeFileSync(filmPath, '{}');

const FIXTURE = `---
palette:
  ink: "#0A0A0A"
  accent: "#4F46E5"
type:
  command:
    family: Anybody
    size: 40
    weight: 600
radius:
  panel: 24
shadow:
  glass: "0 8px 30px rgba(0,0,0,0.12)"
space:
  gutter: 64
surfaces:
  - glass
  - flat
---

This film's design. Add a value here, never inline.
`;
fs.writeFileSync(path.join(dir, 'demo.design.md'), FIXTURE);

// parseYamlLite: nested maps and a flat list, numbers parsed as numbers, quotes stripped
{
  const raw = parseYamlLite('a:\n  b: 1\n  c: "x"\nd:\n  - one\n  - two\n');
  assert.deepEqual(raw, { a: { b: 1, c: 'x' }, d: ['one', 'two'] });
}

// readDesignSpec: null when no sidecar exists next to the film
assert.equal(readDesignSpec(path.join(dir, 'nope.json')), null);

// readDesignSpec: the fixture, merged into the declared shape, colours lowercased
const spec = readDesignSpec(filmPath);
assert.ok(spec);
assert.equal(spec.source, path.join(dir, 'demo.design.md'));
assert.deepEqual(spec.tokens.palette, { ink: '#0a0a0a', accent: '#4f46e5' });
assert.equal(spec.tokens.type.command.size, 40);
assert.equal(spec.tokens.radius.panel, 24);
assert.deepEqual(spec.tokens.surfaces, ['glass', 'flat']);

// legalSet: no spec -> exactly the kit's own values, as Sets
{
  const kit = { fontSize: [16, 40], fontFamily: ['Anybody'], fontWeight: [400], radius: [16], shadow: ['0 1px 2px #000'], color: ['#FFFFFF'] };
  const base = legalSet(null, kit);
  assert.deepEqual([...base.fontSize], [16, 40]);
  assert.deepEqual([...base.color], ['#ffffff']);
}

// legalSet: with a spec, the film's declared tokens join the kit's own values
{
  const kit = { fontSize: [16], fontFamily: [], fontWeight: [], radius: [16], shadow: [], color: [] };
  const merged = legalSet(spec, kit);
  assert.ok(merged.fontSize.has(16) && merged.fontSize.has(40));
  assert.ok(merged.radius.has(16) && merged.radius.has(24));
  assert.ok(merged.color.has('#0a0a0a') && merged.color.has('#4f46e5'));
  assert.ok(merged.shadow.has('0 8px 30px rgba(0,0,0,0.12)'));
}

// nearestToken: a size close to a declared type role
{
  const near = nearestToken('fontSize', 42, spec);
  assert.equal(near.name, '--kit-type-command-size');
  assert.equal(near.value, 40);
  assert.equal(near.delta, 2);
}

// nearestToken: a colour close to a declared palette entry
{
  const near = nearestToken('color', '#0a0a0b', spec);
  assert.equal(near.name, '--kit-color-ink');
  assert.ok(near.delta < 2);
}

// nearestToken: null with no spec, and null for a kind the film declared nothing under
assert.equal(nearestToken('fontSize', 42, null), null);
assert.equal(nearestToken('fontWeight', 600, readDesignSpec(path.join(dir, 'nope.json'))), null);

fs.rmSync(dir, { recursive: true, force: true });
console.log('✓ design-spec.test.mjs: merge, legalSet, nearestToken (size + colour), null with no file');
