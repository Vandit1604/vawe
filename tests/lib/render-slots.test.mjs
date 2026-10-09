import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { takeRenderSlot, slotsInUse, slotCount, DEFAULT_SLOTS } from '../../harness/lib/render-slots.mjs';

const tmpEnv = (slots) => ({ VAWE_RENDER_SLOT_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-slots-')), VAWE_RENDER_SLOTS: String(slots) });

test('the slot count is 2 unless VAWE_RENDER_SLOTS sets it', () => {
  assert.equal(slotCount({}), DEFAULT_SLOTS);
  assert.equal(DEFAULT_SLOTS, 2);
  assert.equal(slotCount({ VAWE_RENDER_SLOTS: '3' }), 3);
  assert.equal(slotCount({ VAWE_RENDER_SLOTS: 'x' }), 2);
});

test('a third render waits for one of two slots, prints one line, and gets it on release', async () => {
  const env = tmpEnv(2);
  try {
    const lines = [];
    const log = (l) => lines.push(l);
    const a = await takeRenderSlot({ kind: 'final', who: 'brindle' }, { env, log });
    const b = await takeRenderSlot({ kind: 'draft', who: 'billhook' }, { env, log });
    assert.equal(b.others, 1);
    assert.deepEqual(lines, []);
    let third = null;
    const waiting = takeRenderSlot({ kind: 'clip', who: 'grain-field' }, { env, log }).then((s) => { third = s; });
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(third, null, 'the third render must wait');
    assert.equal(lines.length, 1);
    assert.match(lines[0], /^waiting for a render slot \(2 in use: brindle \(final, pid \d+, running \d+s\), billhook \(draft, pid \d+, running \d+s\)\)$/);
    a.release();
    await waiting;
    assert.equal(slotsInUse(env.VAWE_RENDER_SLOT_DIR).length, 2);
    b.release();
    third.release();
    assert.equal(slotsInUse(env.VAWE_RENDER_SLOT_DIR).length, 0);
  } finally { fs.rmSync(env.VAWE_RENDER_SLOT_DIR, { recursive: true, force: true }); }
});

test('a slot held by a dead process is taken back', async () => {
  const env = tmpEnv(1);
  try {
    const dead = 2 ** 22 + 12345;
    fs.writeFileSync(path.join(env.VAWE_RENDER_SLOT_DIR, 'slot-0.json'), JSON.stringify({ pid: dead, start: 'then', kind: 'final', who: 'gone' }));
    const lines = [];
    const s = await takeRenderSlot({ kind: 'draft', who: 'next' }, { env, log: (l) => lines.push(l) });
    assert.deepEqual(lines, []);
    assert.equal(JSON.parse(fs.readFileSync(path.join(env.VAWE_RENDER_SLOT_DIR, 'slot-0.json'), 'utf8')).pid, process.pid);
    s.release();
  } finally { fs.rmSync(env.VAWE_RENDER_SLOT_DIR, { recursive: true, force: true }); }
});

test('a slot file of a live holder names pid, film, verb and age in the wait line; a dead holder is freed with no wait', async () => {
  const env = tmpEnv(1);
  try {
    const old = new Date(Date.now() - 375_000).toISOString();
    const file = path.join(env.VAWE_RENDER_SLOT_DIR, 'slot-0.json');
    fs.writeFileSync(file, JSON.stringify({ pid: process.pid, start: old, kind: 'draft', who: 'tracking-hud' }));
    const lines = [];
    const waiting = takeRenderSlot({ kind: 'draft', who: 'next' }, { env, log: (l) => lines.push(l) });
    await new Promise((r) => setTimeout(r, 300));
    assert.match(lines[0], new RegExp(`^waiting for a render slot \\(1 in use: tracking-hud \\(draft, pid ${process.pid}, running 37\\ds\\)\\)$`));
    fs.writeFileSync(file, JSON.stringify({ pid: 2 ** 22 + 999, start: old, kind: 'draft', who: 'tracking-hud' }));
    const s = await waiting;
    assert.equal(lines.length, 1);
    s.release();
  } finally { fs.rmSync(env.VAWE_RENDER_SLOT_DIR, { recursive: true, force: true }); }
});
