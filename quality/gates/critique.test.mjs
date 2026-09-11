// node --test quality/gates/critique.test.mjs
//
// fake-typing / typing-camera-still: the owner's complaint was "typing zoom in and caret don't work
// properly" on a real film that faked typing with html `parts` word-fades and a static `|` glyph, while
// the camera pushed with hand-guessed tx/ty that never tracked the line. This asserts critique.mjs now
// names both the fake reveal and the still camera, and stays quiet on a scene that does it for real
// (a `text` layer with `typing` + `caret`, and a camera that pushes in during the typing window).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

function runCritique(scene) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'critique-test-'));
  const film = path.join(dir, 'v.json');
  fs.writeFileSync(film, JSON.stringify(scene));
  const r = spawnSync(process.execPath, [path.join(here, 'critique.mjs'), film, '--json'], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  const text = [r.stdout, r.stderr].find((s) => s && s.trim().startsWith('[')) || r.stdout;
  return { status: r.status, findings: JSON.parse(text), raw: r.stdout + r.stderr };
}

const BASE = { module: 'scene', theme: 'default', aspect: '16:9', duration: 6 };

test('fake-typing: an html parts word-fade on a "prompt-word" selector is named', () => {
  const scene = { ...BASE, layers: [{
    id: 'terminal', type: 'html', start: 0, duration: 4, html: '<p>make a film</p>',
    parts: [{ select: '[data-part="prompt-word"]', anim: 'fadeUp', each: 0.35, stagger: 0.3 }],
  }] };
  const { findings } = runCritique(scene);
  assert.ok(findings.some((f) => f.code === 'fake-typing'), `expected fake-typing; got ${JSON.stringify(findings)}`);
});

test('fake-typing: a literal caret glyph next to typed text is named', () => {
  const scene = { ...BASE, layers: [{
    id: 'prompt', type: 'html', start: 0, duration: 4,
    html: '<p class="type">make a film|</p>',
  }] };
  const { findings } = runCritique(scene);
  assert.ok(findings.some((f) => f.code === 'fake-typing'), `expected fake-typing; got ${JSON.stringify(findings)}`);
});

test('fake-typing: an unrelated html fragment with a pipe in ordinary copy stays quiet', () => {
  const scene = { ...BASE, layers: [{
    id: 'panel', type: 'html', start: 0, duration: 4,
    html: '<p>A | B choice</p>',
  }] };
  const { findings } = runCritique(scene);
  assert.ok(!findings.some((f) => f.code === 'fake-typing'), `did not expect fake-typing; got ${JSON.stringify(findings)}`);
});

test('fake-typing: a real typing text layer stays quiet', () => {
  const scene = { ...BASE, layers: [
    { id: 'line', type: 'text', x: 200, y: 400, size: 60, start: 0, duration: 3, typing: 20, caret: true, text: 'make a film' },
  ] };
  const { findings } = runCritique(scene);
  assert.ok(!findings.some((f) => f.code === 'fake-typing'), `did not expect fake-typing; got ${JSON.stringify(findings)}`);
});

test('typing-camera-still: a typed line with a camera that never pushes or pans is named', () => {
  const scene = { ...BASE,
    camera: [{ t: 0, x: 0, y: 0, s: 1 }],
    layers: [{ id: 'line', type: 'text', x: 200, y: 400, size: 60, start: 1, duration: 4, typing: 12, caret: true, text: 'x'.repeat(12) }],
  };
  const { findings } = runCritique(scene);
  assert.ok(findings.some((f) => f.code === 'typing-camera-still'), `expected typing-camera-still; got ${JSON.stringify(findings)}`);
});

test('typing-camera-still: a camera pushed in during the typing window stays quiet', () => {
  const scene = { ...BASE,
    camera: [{ t: 0, x: 0, y: 0, s: 1 }, { t: 1, x: -50, y: -30, s: 1.4 }],
    layers: [{ id: 'line', type: 'text', x: 200, y: 400, size: 60, start: 1, duration: 4, typing: 12, caret: true, text: 'x'.repeat(12) }],
  };
  const { findings } = runCritique(scene);
  assert.ok(!findings.some((f) => f.code === 'typing-camera-still'), `did not expect typing-camera-still; got ${JSON.stringify(findings)}`);
});

test('typing-camera-still: no camera at all stays quiet (nothing to compare against)', () => {
  const scene = { ...BASE,
    layers: [{ id: 'line', type: 'text', x: 200, y: 400, size: 60, start: 1, duration: 4, typing: 12, caret: true, text: 'x'.repeat(12) }],
  };
  const { findings } = runCritique(scene);
  assert.ok(!findings.some((f) => f.code === 'typing-camera-still'), `did not expect typing-camera-still; got ${JSON.stringify(findings)}`);
});

// copied-plane: two top-level layers sharing one tilted plane by hand-copying rotX/rotY keys instead
// of nesting under the `group` that carries the tilt (docs/CRAFT/KEYED-MOTION.md 5b).
test('copied-plane: two top-level layers hand-copy the same rotX/rotY keys', () => {
  const scene = { ...BASE, layers: [
    { id: 'card', type: 'html', start: 0, duration: 4, html: '<p>card</p>',
      motion: [{ t: 0, rotX: 0, rotY: 0 }, { t: 2, rotX: 20, rotY: -12 }] },
    { id: 'label', type: 'text', text: 'x', start: 0, duration: 4,
      motion: [{ t: 0, rotX: 0, rotY: 0 }, { t: 2, rotX: 20, rotY: -12 }] },
  ] };
  const { findings } = runCritique(scene);
  assert.ok(findings.some((f) => f.code === 'copied-plane'), `expected copied-plane; got ${JSON.stringify(findings)}`);
});

test('copied-plane: the same tilt nested as group children stays quiet', () => {
  const scene = { ...BASE, layers: [
    { id: 'plane', type: 'group', start: 0, duration: 4, layout: 'free',
      motion: [{ t: 0, rotX: 0, rotY: 0 }, { t: 2, rotX: 20, rotY: -12 }],
      children: [
        { id: 'card', type: 'html', start: 0, duration: 4, html: '<p>card</p>' },
        { id: 'label', type: 'text', text: 'x', start: 0, duration: 4 },
      ] },
  ] };
  const { findings } = runCritique(scene);
  assert.ok(!findings.some((f) => f.code === 'copied-plane'), `did not expect copied-plane; got ${JSON.stringify(findings)}`);
});

test('copied-plane: a lone tilted layer with no partner stays quiet', () => {
  const scene = { ...BASE, layers: [
    { id: 'card', type: 'html', start: 0, duration: 4, html: '<p>card</p>',
      motion: [{ t: 0, rotX: 0, rotY: 0 }, { t: 2, rotX: 20, rotY: -12 }] },
  ] };
  const { findings } = runCritique(scene);
  assert.ok(!findings.some((f) => f.code === 'copied-plane'), `did not expect copied-plane; got ${JSON.stringify(findings)}`);
});

test('copied-plane: a pivot pushed far outside its own box is named', () => {
  const scene = { ...BASE, layers: [
    { id: 'label', type: 'text', text: 'x', start: 0, duration: 4,
      motion: [{ t: 0, rotX: 0, rotY: 0, ox: 132.3, oy: -273.66 }, { t: 2, rotX: 20, rotY: -12, ox: 132.3, oy: -273.66 }] },
  ] };
  const { findings } = runCritique(scene);
  assert.ok(findings.some((f) => f.code === 'copied-plane'), `expected copied-plane; got ${JSON.stringify(findings)}`);
});
