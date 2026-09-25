// node --test quality/gates/choreo.test.mjs
//
// camera-coverage-floor: recipes/expand.mjs appends recipe camera legs to hand cameraMove legs rather
// than chaining them, so a film can bake a `camera[]` array whose legs cover only its opening seconds
// while cameraAt holds the last pose for the rest (the vawe-flow-2 regression: 4.2s of legs over 13.3s).
// Nothing warned. This asserts choreo.mjs now names the held span, and stays quiet when coverage is
// fine or the film never asked for camera travel at all (v1's own vawe-flow.json, checked separately).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const layer = (id, start) => ({ id, type: 'rect', track: 3, x: 0, y: 0, w: 200, h: 100, start, duration: 3 });

function runChoreo(scene) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'choreo-test-'));
  const film = path.join(dir, 'v.json');
  fs.writeFileSync(film, JSON.stringify(scene));
  const r = spawnSync(process.execPath, [path.join(here, '../../quality/gates/choreo.mjs'), film, '--json'], { encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  // this sandbox sometimes swaps a child's stdout/stderr; read whichever stream actually got the
  // JSON rather than assume stdout, and ignore anything after the JSON object's own closing brace.
  const text = [r.stdout, r.stderr].find((s) => s && s.includes('"slug"')) || r.stdout;
  return JSON.parse(text.slice(0, text.lastIndexOf('}') + 1));
}

test('a camera that only travels early in a long film is named, with its held span', () => {
  // one leg, 0s-4s (4s of travel over a 13s film, well under the 40% floor / 6s minimum).
  const scene = {
    module: 'scene', theme: 'default', aspect: '16:9', duration: 13,
    camera: [{ t: 0, x: 0, y: 0, s: 1 }, { t: 4, x: 0, y: 0, s: 1.3 }],
    layers: [layer('a', 0), layer('b', 4), layer('c', 8)],
  };
  const out = runChoreo(scene);
  assert.ok(out.cameraCoverageFloor, 'a camera held still for most of a long film is flagged');
  assert.match(out.cameraCoverageFloor, /camera-coverage-floor/);
  assert.match(out.cameraCoverageFloor, /camera holds still 4s-13s/, 'the uncovered span is named in seconds');
});

test('a camera that travels across most of the film is quiet', () => {
  const scene = {
    module: 'scene', theme: 'default', aspect: '16:9', duration: 13,
    camera: [{ t: 0, x: 0, y: 0, s: 1 }, { t: 12, x: 0, y: 0, s: 1.3 }],
    layers: [layer('a', 0), layer('b', 4), layer('c', 8)],
  };
  const out = runChoreo(scene);
  assert.equal(out.cameraCoverageFloor, null, 'coverage above the floor gets no finding');
});

test('a film with no camera array at all is quiet, even when long', () => {
  const scene = {
    module: 'scene', theme: 'default', aspect: '16:9', duration: 13,
    layers: [layer('a', 0), layer('b', 4), layer('c', 8)],
  };
  const out = runChoreo(scene);
  assert.equal(out.cameraCoverageFloor, null, 'no declared camera means no opinion, never a false floor trip');
});

test('a short film under the 6s minimum is quiet regardless of coverage', () => {
  const scene = {
    module: 'scene', theme: 'default', aspect: '16:9', duration: 5,
    camera: [{ t: 0, x: 0, y: 0, s: 1 }, { t: 1, x: 0, y: 0, s: 1.3 }],
    layers: [layer('a', 0), layer('b', 2)],
  };
  const out = runChoreo(scene);
  assert.equal(out.cameraCoverageFloor, null, 'a film this short is not held to the floor');
});

test('a multi-leg camera spanning most of a longer film does not false-fire', () => {
  // Shape of the vawe-flow-2 regression this gate was written for, reproduced as a fixture instead of
  // reading the real film: several legs, each covering a real span, together holding still for well
  // under 40% of the runtime.
  const scene = {
    module: 'scene', theme: 'default', aspect: '16:9', duration: 20,
    camera: [
      { t: 0, x: 0, y: 0, s: 1 }, { t: 5, x: 40, y: 0, s: 1.1 },
      { t: 10, x: 40, y: -20, s: 1.2 }, { t: 19, x: 0, y: 0, s: 1 },
    ],
    layers: [layer('a', 0), layer('b', 5), layer('c', 10), layer('d', 15)],
  };
  const out = runChoreo(scene);
  assert.equal(out.cameraCoverageFloor, null, 'a multi-leg camera covering most of the film stays quiet');
});
