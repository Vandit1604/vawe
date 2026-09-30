import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL(`../../engine-doctrine/${f}`, import.meta.url), 'utf8');
const card = read('TASTE-CARD.md');
const digest = read('TASTE-CARD-DIGEST.md');

const numbers = (text, re) => [...text.matchAll(re)].map((m) => Number(m[1]));

test('the digest has one line for each rule of the card, in order', () => {
  const inCard = numbers(card, /^\| (\d+) \|/gm);
  const inDigest = numbers(digest, /^(\d+)\. /gm);
  assert.ok(inCard.length >= 15);
  assert.deepEqual(inDigest, inCard);
});

test('the digest stays under 2.5 KB', () => {
  assert.ok(Buffer.byteLength(digest) < 2500);
});
