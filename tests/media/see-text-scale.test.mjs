// tests/media/see-text-scale.test.mjs: house-rule self-check, no framework.
//   node tests/media/see-text-scale.test.mjs
//
// Proves harness/media/see.mjs's textScaleCheck(): a per-window compare of the reference's OCR word box
// (height/width/centre, as a fraction of frame) against the page's own DOM text box, flagging a window
// where the two differ by more than TEXT_SCALE_TOLERANCE (20%) on any of height, width, or either centre
// axis. Different WORDS are expected (a recreation writes its own copy); only scale and placement count.
import { textScaleCheck, TEXT_SCALE_TOLERANCE } from '../../harness/media/see.mjs';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const windows = [{ t0: 0, t1: 0.5 }, { t0: 0.5, t1: 1.0 }];

// ── same scale and placement, different words: passes ──────────────────────────────────────────────
{
  const refWords = [{ text: 'Hello', tIn: 0.1, box: { hFrac: 0.3, wFrac: 0.4, cxFrac: 0.5, cyFrac: 0.5 } }];
  const filmBoxes = new Map([[0, [{ text: 'Bonjour', hFrac: 0.31, wFrac: 0.39, cxFrac: 0.49, cyFrac: 0.51 }]]]);
  const r = textScaleCheck(refWords, filmBoxes, windows);
  assert(r.ok === true, `expected a near-identical box (different word) to pass, got ${JSON.stringify(r.mismatched)}`);
}

// ── the failure this was built for: reference text 31% of frame height centred, film's is 9%, 18% lower ─
{
  const refWords = [{ text: 'MAKERS', tIn: 0.2, box: { hFrac: 0.31, wFrac: 0.5, cxFrac: 0.5, cyFrac: 0.4 } }];
  const filmBoxes = new Map([[0, [{ text: 'Makers', hFrac: 0.09, wFrac: 0.15, cxFrac: 0.5, cyFrac: 0.58 }]]]);
  const r = textScaleCheck(refWords, filmBoxes, windows);
  assert(r.ok === false, 'expected a shrunk, displaced headline to fail the text-scale check');
  assert(r.mismatched.length === 1, `expected exactly one mismatched window, got ${r.mismatched.length}`);
  const hint = r.mismatched[0].hint;
  assert(hint.includes('31%'), `expected the reference's own height percentage in the hint: ${hint}`);
  assert(hint.includes('9%'), `expected the film's own height percentage in the hint: ${hint}`);
  assert(/lower/.test(hint), `expected a vertical-position direction in the hint: ${hint}`);
  console.log(`✓ see-text-scale.test.mjs: small+displaced headline hint -> "${hint}"`);
}

// ── a window with no text on one side is skipped, not flagged as a mismatch ─────────────────────────
{
  const refWords = [{ text: 'Hello', tIn: 0.6, box: { hFrac: 0.3, wFrac: 0.4, cxFrac: 0.5, cyFrac: 0.5 } }];
  const filmBoxes = new Map([[0.5, []]]);
  const r = textScaleCheck(refWords, filmBoxes, windows);
  assert(r.rows.length === 0, `expected no comparable row when one side has no text, got ${r.rows.length}`);
  assert(r.ok === true, 'no comparable window must not fail the gate');
  console.log('✓ see-text-scale.test.mjs: a window with text on only one side is skipped, not flagged');
}

// ── a diff just under the tolerance passes, just over fails: proves the threshold, not just the sign ──
{
  const under = 1 + TEXT_SCALE_TOLERANCE - 0.01;
  const over = 1 + TEXT_SCALE_TOLERANCE + 0.01;
  const refWords = [{ text: 'Hi', tIn: 0.1, box: { hFrac: 0.2, wFrac: 0.2, cxFrac: 0.5, cyFrac: 0.5 } }];
  const passBoxes = new Map([[0, [{ text: 'Hey', hFrac: 0.2 * under, wFrac: 0.2, cxFrac: 0.5, cyFrac: 0.5 }]]]);
  const failBoxes = new Map([[0, [{ text: 'Hey', hFrac: 0.2 * over, wFrac: 0.2, cxFrac: 0.5, cyFrac: 0.5 }]]]);
  assert(textScaleCheck(refWords, passBoxes, windows).ok === true, 'expected a diff just under the tolerance to pass');
  assert(textScaleCheck(refWords, failBoxes, windows).ok === false, 'expected a diff just over the tolerance to fail');
  console.log(`✓ see-text-scale.test.mjs: the ${Math.round(TEXT_SCALE_TOLERANCE * 100)}% threshold is a real edge, not a guess`);
}

console.log('see-text-scale.test.mjs: ok');
