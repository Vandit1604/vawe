// harness/lib/contract.test.mjs: the per-beat continuous-object contract chains, and a broken handoff
// is refused with BOTH values named.
//   node harness/lib/contract.test.mjs
import assert from 'node:assert/strict';
import { parseEdge, chainErrors, edges, parseMotionEntry, parseMotion, motionErrors, parseMoveEntry, parseMoveEntries, moveErrors, moveKeys, SPEED_BAND, isCausedTrigger, STAGE_S, parseUseLine, resolveUse, useErrors, useWarnings, resolvedUses, useSlotPath, cameraStillHeldWarnings, normalCameraEvidence, isRestCameraPose, parseFragmentSpec } from './contract.mjs';

// parseFragmentSpec: "none" (the one spelling for "this beat has no fragment file") short-circuits
// to path:null, none:true, regardless of a trailing reason after a comma.
assert.deepEqual(parseFragmentSpec('none'), { path: null, edge: null, none: true });
assert.deepEqual(parseFragmentSpec('none, an image + text layer pair'), { path: null, edge: null, none: true });
assert.deepEqual(parseFragmentSpec(null), { path: null, edge: null, none: false });

// a plain file, a file with a placement clause, and a file with a trailing "(note)": all resolve to
// the same path with the note or clause stripped, one place, not re-derived by each caller.
assert.deepEqual(parseFragmentSpec('_together.card.html'), { path: '_together.card.html', edge: null, none: false });
assert.equal(parseFragmentSpec('_together.card.html (shared across two beats)').path, '_together.card.html');
{
  const withPlacement = parseFragmentSpec('_together.card.html @ center@900x520');
  assert.equal(withPlacement.path, '_together.card.html');
  assert.equal(withPlacement.edge.placement, 'center');
}

// parseEdge: the happy path, quotes stripped (storyboard-parse.mjs's fieldIn does not strip them).
// rot/opacity default to 0/1 (no pose stated = no pose change), same "no opinion" convention as before.
assert.deepEqual(parseEdge('"bottom-left@120x40"'), { placement: 'bottom-left', w: 120, h: 40, rot: 0, opacity: 1 });
assert.equal(parseEdge(null), null);
assert.equal(parseEdge('<fill: <placement>@<w>x<h>>'), null, 'an unfilled scaffold marker is "no opinion", not a value');

// an unknown placement is refused with a near-word hint, never silently coerced
{
  const bad = parseEdge('bottom-lft@10x10');
  assert.ok(bad.error, 'a typo\'d placement must carry an error');
  assert.match(bad.error, /bottom-left/, 'the near-miss suggestion should name the real word');
}

// a malformed edge string is refused, not parsed into garbage numbers
assert.ok(parseEdge('nonsense').error);

// a film naming no continuous object at all: nothing to check, no false positive
assert.deepEqual(chainErrors([{ name: 'A' }, { name: 'B' }]), []);

// a clean chain: no errors
{
  const beats = [
    { name: 'A', object_in: 'top-left@10x10', object_out: 'bottom-left@10x10' },
    { name: 'B', object_in: 'bottom-left@10x10', object_out: 'bottom-right@10x10' },
  ];
  assert.deepEqual(chainErrors(beats), []);
  assert.equal(edges(beats).length, 2);
}

// A BROKEN HANDOFF IS REFUSED WITH BOTH VALUES NAMED. This is the contract's whole job: three scene
// agents each writing a beautiful, independently-correct fragment is still a slideshow if the object
// they hand off does not land in the same place, and the fix has to be actionable from the error alone.
{
  const beats = [
    { name: 'A', object_in: 'top-left@10x10', object_out: 'bottom-left@10x10' },
    { name: 'B', object_in: 'bottom-right@10x10', object_out: 'top-left@10x10' },
  ];
  const errs = chainErrors(beats);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /beat 1 \(A\)/);
  assert.match(errs[0], /beat 2 \(B\)/);
  assert.match(errs[0], /bottom-left@10x10/, 'beat A\'s object_out must be named');
  assert.match(errs[0], /bottom-right@10x10/, 'beat B\'s object_in must be named');
  assert.equal(edges(beats).length, 0, 'a broken chain yields no edges to build a track from');
}

// ── the motion plan: parseMotionEntry / parseMotion / motionErrors, now aliases of the unified parser ──
{
  const e = parseMotionEntry('[data-part="headline"]@slide-left:energy');
  assert.deepEqual(e, { scope: 'part', selector: '[data-part="headline"]', kind: 'slide-left', inBand: 'energy', outBand: 'energy' }, 'one band fills both in and out');
}
{
  const e = parseMotionEntry('.card@popIn:energy/cinematic');
  assert.deepEqual(e, { scope: 'part', selector: '.card', kind: 'popIn', inBand: 'energy', outBand: 'cinematic' }, 'two bands: in then out');
}
{
  // an unknown part kind is refused with a near-word hint, exactly as an unknown placement is above
  const bad = parseMotionEntry('.card@slide-lft:energy');
  assert.ok(bad.error, 'a typo\'d part kind must carry an error');
  assert.match(bad.error, /slide-left/, 'the near-miss suggestion should name the real word');
}
{
  const bad = parseMotionEntry('.card@popIn:blazing');
  assert.ok(bad.error, 'an unknown speed band is refused');
}
assert.deepEqual(parseMotion(null), [], 'unset motion is no opinion, same convention as object_in/out');
assert.deepEqual(parseMotion('none'), [], '`none` is an explicit no-motion beat');
{
  const es = parseMotion('.a@fadeUp:energy; .b@popIn:gravity/cinematic');
  assert.equal(es.length, 2, '`;`-separated entries for more than one moving element in a beat');
  assert.equal(es[0].selector, '.a');
  assert.equal(es[1].outBand, 'cinematic');
}
{
  const beats = [{ name: 'A', motion: '.a@fadeUp:energy' }, { name: 'B', motion: '.b@nope:energy' }];
  const errs = motionErrors(beats);
  assert.equal(errs.length, 1, 'only the beat with a broken entry is reported');
  assert.match(errs[0], /beat 2 \(B\)/);
}
// every named band resolves to a real duration, so assemble.mjs never keys a `parts` entry with `undefined`
for (const band of Object.keys(SPEED_BAND)) assert.ok(SPEED_BAND[band] > 0, `${band} must be a positive duration`);

// ── the unified move grammar: scope read from the entry, not the field ─────────────────────────────
{
  // LAYER scope: bare "<shape>:<band>", the old (and only) `move:` shape
  const e = parseMoveEntry('pan:cinematic');
  assert.deepEqual(e, { scope: 'layer', shape: 'pan', band: 'cinematic' });
}
{
  // PART scope: identical grammar to a `motion:` entry, just written under `move:`
  const e = parseMoveEntry('[data-part="card"]@riseIn:energy');
  assert.deepEqual(e, { scope: 'part', selector: '[data-part="card"]', kind: 'riseIn', inBand: 'energy', outBand: 'energy' });
}
{
  const e = parseMoveEntry('[data-part="card"]@riseIn:energy/gravity');
  assert.deepEqual(e, { scope: 'part', selector: '[data-part="card"]', kind: 'riseIn', inBand: 'energy', outBand: 'gravity' });
}
{
  // HOLD scope: sets the beat's layer idle, the field `rest:` could only narrate
  const e = parseMoveEntry('hold:breathe');
  assert.deepEqual(e, { scope: 'hold', name: 'breathe' });
}
{
  const bad = parseMoveEntry('hold:shimmy');
  assert.ok(bad.error, 'an unknown idle name is refused, not silently coerced to none');
}
{
  const bad = parseMoveEntry('pan:blazing');
  assert.ok(bad.error, 'a known shape with an unknown band is refused');
}
{
  const bad = parseMoveEntry('spinny:cinematic');
  assert.ok(bad.error, 'an unknown shape is refused with a near-word hint attempt, not defaulted');
}
assert.deepEqual(parseMoveEntries(null), [], 'unset move is no opinion');
assert.deepEqual(parseMoveEntries('none'), [], '`none` is an explicit no-move beat');
{
  // a beat can mix scopes on one `move:` line: one layer track and two part entrances
  const es = parseMoveEntries('pan:cinematic; .a@fadeUp:energy; hold:drift');
  assert.equal(es.length, 3);
  assert.deepEqual(es.map((e) => e.scope), ['layer', 'part', 'hold']);
}
{
  const beats = [{ name: 'A', move: 'pan:cinematic' }, { name: 'B', move: 'nope:cinematic' }];
  const errs = moveErrors(beats);
  assert.equal(errs.length, 1, 'only the beat with a broken entry is reported');
  assert.match(errs[0], /beat 2 \(B\)/);
}
{
  // moveKeys still takes a bare {shape,band}, so a LAYER-scope entry from either parser feeds it unchanged
  const keys = moveKeys({ shape: 'drift', band: 'professional' }, 3);
  assert.ok(Array.isArray(keys) && keys.length > 1, 'moveKeys builds a real multi-key track');
}

// ── the pose: rot/op on top of placement@wxh ───────────────────────────────────────────────────────
{
  const e = parseEdge('center@40x26/rot:15/op:0.4');
  assert.deepEqual(e, { placement: 'center', w: 40, h: 26, rot: 15, opacity: 0.4 }, 'pose fields parse alongside size');
}
{
  // = works the same as :, and the order (op before rot) does not matter
  const e = parseEdge('center@40x26/op=0.4/rot=15');
  assert.deepEqual(e, { placement: 'center', w: 40, h: 26, rot: 15, opacity: 0.4 });
}
{
  const bad = parseEdge('center@40x26/spin:15');
  assert.ok(bad.error, 'an unknown pose field is refused, not silently dropped');
}
// a pose mismatch at a handoff is a chain break exactly like a placement or size mismatch already is
{
  const beats = [
    { name: 'A', object_in: 'center@40x26', object_out: 'center@40x26/rot:15' },
    { name: 'B', object_in: 'center@40x26', object_out: 'center@40x26' }, // should have been rot:15
  ];
  const errs = chainErrors(beats);
  assert.equal(errs.length, 1, 'a beat ending rotated must hand off to a beat starting rotated the same amount');
  assert.match(errs[0], /rot:15/);
}
// the edges a pose-using chain actually produces, for assemble.mjs to build a size/rot/opacity track from
{
  const beats = [
    { name: 'A', start: 0, end: 1, object_in: 'center@40x26', object_out: 'center@40x40/rot:15/op:0.5' },
    { name: 'B', start: 1, end: 2, object_in: 'center@40x40/rot:15/op:0.5', object_out: 'center@40x40/rot:15/op:0.5' },
  ];
  const [e1] = edges(beats);
  assert.equal(e1.out.w, 40); assert.equal(e1.out.h, 40); assert.equal(e1.out.rot, 15); assert.equal(e1.out.opacity, 0.5);
}

// ── the staging: isCausedTrigger, shared verbatim with storyboard-check.mjs ────────────────────────
assert.equal(isCausedTrigger(null), false, 'no trigger stated: no opinion, same convention as object_in/motion');
assert.equal(isCausedTrigger('none'), false, 'an explicit empty marker is not a cause');
assert.equal(isCausedTrigger('then the card lifts'), false, 'a sequence word ("then") says WHEN, not WHY: not a cause');
assert.equal(isCausedTrigger('3.2s'), false, 'a bare timestamp is a sequence marker, not a cause');
assert.equal(isCausedTrigger('the cursor clicks Send'), true, 'a real act on screen is a cause');
assert.ok(STAGE_S > 0 && STAGE_S < 0.2, 'the causal stagger is a small, evidence-based offset (higgsfield: ~30-150ms), never a whole beat');

console.log('✓ contract.test.mjs: parseEdge (pose included), a clean chain, a broken handoff (named, both sides), the motion plan, and staging all behave');

// ── use: the general door, against a small SYNTHETIC corpus (not the live 790-entry arsenal, so this
// stays fast and never breaks when a real registry entry is renamed or added) ────────────────────────
const USE_CORPUS = [
  { name: 'plain', kind: 'background preset', slot: 'bg[].preset', blurb: 'flat field', aka: [] },
  { name: 'weight', kind: 'kinetic preset', slot: 'preset', blurb: 'glyphs thicken into place', aka: [] },
  { name: 'bloom', kind: 'glow preset', slot: 'preset', blurb: 'a soft halo', aka: [] },
  { name: 'bloom', kind: 'filter', slot: 'filter', blurb: 'an over-bright wash', aka: [] },
  { name: 'braam', kind: 'sfx cue', slot: 'audio.cues[].name', blurb: 'a cinematic hit', aka: ['weight'] },
  { name: 'push in', kind: 'camera word', slot: 'cameraMove.move', blurb: 'the camera moves closer', aka: [] },
  { name: 'colonnade', kind: 'generator', slot: 'generator', blurb: 'wide panels split by hairlines', aka: [] },
  { name: 'alongPath', kind: 'modifier', slot: 'modifiers[]', blurb: 'rides a path', aka: [] },
];

// resolves exact
assert.deepEqual(resolveUse(parseUseLine('plain'), USE_CORPUS).entry.name, 'plain');
// resolves by aka (a "weight" cue exists as an aka of "braam", read alongside the real "weight" name)
{
  const r = resolveUse(parseUseLine('weight'), USE_CORPUS);
  assert.ok(r.ambiguous, 'a bare name matching one entry\'s NAME and another entry\'s AKA is ambiguous, not silently resolved to either');
  assert.deepEqual(new Set(r.ambiguous), new Set(['kinetic preset:weight', 'sfx cue:braam']));
}
// resolves kind-prefixed, disambiguating a name that collides on its own
{
  const r = resolveUse(parseUseLine('glow preset:bloom'), USE_CORPUS);
  assert.equal(r.entry.kind, 'glow preset');
}
// on=<id> and key=value params parse off the line, numeric values coerced
{
  const p = parseUseLine('alongPath on=headline axis=x amount=0.5');
  assert.equal(p.name, 'alongPath'); assert.equal(p.on, 'headline');
  assert.deepEqual(p.params, { axis: 'x', amount: 0.5 });
}
// ambiguous: bare "bloom" exists in two kinds here, refused rather than guessed
assert.ok(resolveUse(parseUseLine('bloom'), USE_CORPUS).ambiguous, 'a name in more than one kind is ambiguous');
// dedicated-field refusal: a camera word already has camera:
{
  const r = resolveUse(parseUseLine('push in'), USE_CORPUS);
  assert.equal(r.refusedField, 'camera:');
}
// internal refusal: a generator is never authored from a storyboard
{
  const r = resolveUse(parseUseLine('colonnade'), USE_CORPUS);
  assert.match(r.refusedInternal, /lightfield generator/);
}
// prose: not decisive, reported as a warning naming ready `use: kind:name` lines, never silently dropped
{
  const beats = [{ name: 'A', uses: ['a soft halo around the title'] }];
  const warns = useWarnings(beats, USE_CORPUS);
  assert.equal(warns.length, 1);
  assert.match(warns[0], /reads as free prose/);
  assert.match(warns[0], /use: glow preset:bloom/, 'the warning offers a ready-to-paste use: line');
}
// useErrors: ambiguous, refused (dedicated + internal) and unknown all surface as errors
{
  const beats = [{ name: 'A', uses: ['bloom', 'push in', 'colonnade', 'not-a-real-name-at-all'] }];
  const errs = useErrors(beats, USE_CORPUS);
  assert.equal(errs.length, 4);
  assert.match(errs[0], /names more than one kind/);
  assert.match(errs[1], /already has a dedicated field/);
  assert.match(errs[2], /not authored from a storyboard/);
  assert.match(errs[3], /is not a known name/);
}
// resolvedUses: only the clean resolutions come back, carrying on=/params through
{
  const beats = [{ name: 'A', uses: ['glow preset:bloom on=card', 'push in', 'colonnade'] }];
  const uses = resolvedUses(beats[0], USE_CORPUS);
  assert.equal(uses.length, 1, 'the refused (dedicated/internal) lines are excluded, not half-applied');
  assert.equal(uses[0].entry.name, 'bloom'); assert.equal(uses[0].on, 'card');
}
// useSlotPath: the slot writer's own JSON skeleton, reused from arsenal's pasteOf
assert.deepEqual(useSlotPath({ name: 'plain', slot: 'bg[].preset' }), { bg: [{ preset: 'plain' }] });
assert.deepEqual(useSlotPath({ name: 'alongPath', slot: 'modifiers[]' }), { modifiers: [{ alongPath: {} }] });
assert.equal(useSlotPath({ name: 'file', slot: 'svgIcon()' }), null, 'a slot that is prose, not a path, has no writable skeleton');

// ── THE CAMERA HOLDS ITS END POSE: cameraStillHeldWarnings, isRestCameraPose, normalCameraEvidence ────

// isRestCameraPose: identity is rest; a real push is not.
assert.equal(isRestCameraPose({ s: 1, x: 0, y: 0, rx: 0, ry: 0, roll: 0 }), true);
assert.equal(isRestCameraPose({ s: 1.6, x: 0, y: 0, rx: 0, ry: 0, roll: 0 }), false);
assert.equal(isRestCameraPose(null), true, 'no pose at all is "no opinion", never a false hold');

// normalCameraEvidence: each of the four signals fires on its own, and a decisive close/tight shot
// or an unresolved beat fires none of them.
assert.match(normalCameraEvidence({ name: 'A', shot: 'wide' }), /shot: "wide"/);
assert.equal(normalCameraEvidence({ name: 'A', shot: 'close up' }), null);
assert.match(normalCameraEvidence({ name: 'A', object_in: 'center@1920x1080' }), /object_in/);
assert.equal(normalCameraEvidence({ name: 'A', object_in: 'top-left@120x40' }), null, 'a small corner object is not a full frame');
assert.match(normalCameraEvidence({ name: 'A', eye: 'the whole frame -> a slow push -> the logo' }), /eye:/);
assert.match(normalCameraEvidence({ name: 'A', picture: 'the app fills the frame' }), /full composition/);
assert.equal(normalCameraEvidence({ name: 'A', camera: 'slowPush', picture: 'the app fills the frame' }),
  null, 'a beat that already names its own camera does not fall back to prose');

// cameraStillHeldWarnings: a push, then a wide beat with no return, warns; the same pair with a return
// beat IN BETWEEN does not (the hold is fixed before the wide beat is judged); a push then a CLOSE beat
// (not a normal-camera shot) does not warn either, even though the camera is still just as pushed in.
// The push beat's own shot is never graded against its own not-yet-applied end pose (engine-doctrine/MOTION-CRAFT.md).
{
  const pushed = { name: 'push', camera: 'diveIn tx=960 ty=540 to=1.6' };
  const wide = { name: 'wide', shot: 'wide' };
  const returns = { name: 'return', camera: 'slowPush to=1' };
  const close = { name: 'close', shot: 'close up' };

  const warnsNoReturn = cameraStillHeldWarnings([pushed, wide]);
  assert.equal(warnsNoReturn.length, 1);
  assert.match(warnsNoReturn[0], /camera-still-held: beat 2 \(wide\)/);
  assert.match(warnsNoReturn[0], /shot: "wide"/);
  assert.match(warnsNoReturn[0], /beat 1's `camera: diveIn/);
  assert.match(warnsNoReturn[0], /add a return: camera: slowPush to=1/);

  assert.deepEqual(cameraStillHeldWarnings([pushed, returns, wide]), [],
    'a return beat in between fixes the hold before the wide beat is judged');

  assert.deepEqual(cameraStillHeldWarnings([pushed, close]), [],
    'a close shot is not the normal camera, so an inherited push is not a defect here');

  assert.deepEqual(cameraStillHeldWarnings([{ name: 'wide-only', shot: 'wide' }]), [],
    'a lone wide beat with no earlier push at all has nothing held against it');
}

console.log('✓ contract.test.mjs: use: resolves exact/aka/kind-prefixed names, refuses ambiguous/dedicated/internal ones, warns free prose with ready lines, and its slot skeleton reuses pasteOf; cameraStillHeldWarnings flags an unreturned push into a later normal-camera beat and clears on a return or a non-normal shot; parseFragmentSpec reads "none" as no-fragment and strips a trailing (note) from a path');
