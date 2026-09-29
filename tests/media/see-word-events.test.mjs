// tests/media/see-word-events.test.mjs: house-rule self-check, no framework.
//   node tests/media/see-word-events.test.mjs
//
// Proves harness/media/see.mjs's compareWordEvents(): pairs reference and film word tracks by text (in
// temporal order for a repeated word), then reports, in plain numbers, an entrance that changed from
// scattered-in to appears-in-place, an exit that changed from moves-away to fades-in-place, a travelling
// highlight the film never reproduces, and a spinning region the film is missing. Pure and framework-
// free: no ffmpeg, no OCR, no browser.
import { compareWordEvents } from '../../harness/media/see.mjs';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }
function findDiff(diffs, re) { return diffs.find((d) => re.test(d)); }

const box = (cx, cy, h = 0.1, w = 0.2) => ({ cxFrac: cx, cyFrac: cy, hFrac: h, wFrac: w });
function word(text, { tIn, tSettled, tOut, movedIn, enterDir = null, movedOut, colors = [] }) {
  return { text, tIn, tSettled, tOut, movedIn, enterDir, movedOut, sizeIn: 0.1, sizeSettled: 0.1, colors };
}

// ── an identical track compared against itself reports nothing ─────────────────────────────────────
{
  const track = { words: [word('unforgettable', { tIn: 8.75, tSettled: 9.2, tOut: 11.8, movedIn: true, enterDir: 'the right', movedOut: true })], regions: [] };
  const r = compareWordEvents(track, track);
  assert(r.ok === true, `expected a self-compare to report no differences, got ${JSON.stringify(r.diffs)}`);
}

// ── scatter-in vs appears-in-place, scatter-out vs fades-in-place: the two entrance/exit kinds ──────
{
  const ref = { words: [word('unforgettable', { tIn: 8.75, tSettled: 9.2, tOut: 11.8, movedIn: true, enterDir: 'the right', movedOut: true })], regions: [] };
  const film = { words: [word('unforgettable', { tIn: 9.4, tSettled: 9.4, tOut: 11.9, movedIn: false, movedOut: false })], regions: [] };
  const r = compareWordEvents(ref, film);
  assert(r.ok === false, 'expected an entrance-kind mismatch to report a difference');
  const enterDiff = findDiff(r.diffs, /unforgettable.*enters from the right.*appears in place/);
  assert(enterDiff, `expected an "enters from ... appears in place" diff, got ${JSON.stringify(r.diffs)}`);
  const exitDiff = findDiff(r.diffs, /unforgettable.*exit.*moves away.*fades in place/);
  assert(exitDiff, `expected a "moves away ... fades in place" exit diff, got ${JSON.stringify(r.diffs)}`);
  console.log(`✓ see-word-events.test.mjs: entrance diff -> "${enterDiff}"`);
  console.log(`✓ see-word-events.test.mjs: exit diff -> "${exitDiff}"`);
}

// ── a missing word is reported, not silently dropped ────────────────────────────────────────────────
{
  const ref = { words: [word('star', { tIn: 1.0, tSettled: 1.0, tOut: 2.0, movedIn: false, movedOut: false })], regions: [] };
  const film = { words: [], regions: [] };
  const r = compareWordEvents(ref, film);
  assert(findDiff(r.diffs, /'star'.*present in the reference.*missing from yours/), `expected a missing-word diff, got ${JSON.stringify(r.diffs)}`);
}

// ── travelling highlight: reference visits two words in sequence, film's colour never changes ──────
{
  const ref = {
    words: [
      word('Good', { tIn: 7.73, tSettled: 7.9, tOut: 12.0, movedIn: false, movedOut: false, colors: [{ t: 7.9, name: 'blue' }, { t: 8.1, name: 'white' }] }),
      word('unforgettable', { tIn: 9.5, tSettled: 9.7, tOut: 12.0, movedIn: false, movedOut: false, colors: [{ t: 9.9, name: 'white' }, { t: 10.2, name: 'blue' }, { t: 10.5, name: 'white' }] }),
    ],
    regions: [],
  };
  const film = {
    words: [
      word('Good', { tIn: 7.73, tSettled: 7.9, tOut: 12.0, movedIn: false, movedOut: false, colors: [{ t: 7.9, name: 'blue' }, { t: 12.0, name: 'blue' }] }),
      word('unforgettable', { tIn: 9.5, tSettled: 9.7, tOut: 12.0, movedIn: false, movedOut: false, colors: [{ t: 9.9, name: 'white' }, { t: 12.0, name: 'white' }] }),
    ],
    regions: [],
  };
  const r = compareWordEvents(ref, film);
  const diff = findDiff(r.diffs, /highlight: reference colour moves word to word.*yours never changes/);
  assert(diff, `expected a travelling-highlight diff, got ${JSON.stringify(r.diffs)}`);
  console.log(`✓ see-word-events.test.mjs: highlight diff -> "${diff}"`);
}

// ── missing star: reference has a spinning region, film has none ───────────────────────────────────
{
  const ref = { words: [], regions: [{ tIn: 7.6, tOut: 8.0, halfTurn: 0.3 }] };
  const film = { words: [], regions: [] };
  const r = compareWordEvents(ref, film);
  const diff = findDiff(r.diffs, /star: reference shows a spinning region.*half-turn 0\.30s.*yours has none/);
  assert(diff, `expected a missing-star diff, got ${JSON.stringify(r.diffs)}`);
  console.log(`✓ see-word-events.test.mjs: missing-star diff -> "${diff}"`);
}

// ── a star present on both sides, but spinning at a different rate ──────────────────────────────────
{
  const ref = { words: [], regions: [{ tIn: 7.6, tOut: 8.0, halfTurn: 0.3 }] };
  const film = { words: [], regions: [{ tIn: 7.6, tOut: 8.0, halfTurn: 0.15 }] };
  const r = compareWordEvents(ref, film);
  const diff = findDiff(r.diffs, /star: reference half-turn 0\.30s, yours 0\.15s/);
  assert(diff, `expected a spin-rate diff, got ${JSON.stringify(r.diffs)}`);
}

console.log('see-word-events.test.mjs: ok');
