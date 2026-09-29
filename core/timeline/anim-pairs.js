// Pure functions over document.getAnimations(). quality/gates/anim-traps.mjs re-serializes each one with
// .toString() to run it inside the page, so every function is self-contained: no outer bindings.
// Self-contained on purpose (the skip-list is a literal inside the function, not a module const):
// quality/gates/anim-traps.mjs re-serializes this function's own source with `.toString()` to run it
// inside an isolated trap-checker page, and a reference to an outer binding would not survive that.
export function animatedProps(a) {
  const skip = new Set(['offset', 'computedOffset', 'easing', 'composite']);
  const props = new Set();
  for (const kf of (a.effect.getKeyframes ? a.effect.getKeyframes() : []))
    for (const k of Object.keys(kf)) if (!skip.has(k)) props.add(k);
  return props;
}

// reachesBack(t): does this fill claim a value for time BEFORE its own delay? Only 'both'/'backwards'
// do; 'forwards' (and 'none') apply nothing before their own start, so two 'forwards' animations
// stacked in TIME ORDER never collide merely because both hold forever afterward: WAAPI composites
// later-registered animations on top, so a correctly time-ordered forwards chain (row 1 registered,
// then row 2, then row 3) renders exactly as authored at every instant, one takes over exactly where
// the one before it left off. The real hazard is narrower: a fill that reaches BACKWARD past its own
// start and covers time another animation on the same property already owns.
// a plain function declaration, not an arrow const: quality/gates/anim-traps.mjs re-serializes this
// with `.toString()` (see the note on animatedProps above), and only a named function's own source
// carries its name along with it when bundled that way.
export function reachesBack(t) { return t.fill === 'both' || t.fill === 'backwards'; }

// fillCollisionPairs(): every pair of animations, on the same element, sharing a property, where ONE
// of them reaches backward (fill both/backwards) into time the OTHER one's own window already owns,
// so an author's fill:none/auto default is never PROMOTED to both on an animation already fighting a
// sibling for the same property. ONE definition of "these two collide", shared by seekAll's own
// default-fill upgrade below and quality/gates/anim-traps.mjs's fill-collision trap, so the engine's
// behaviour and the gate that reports it can never disagree about which pairs count.
export function fillCollisionPairs() {
  const byElement = new Map();
  for (const a of document.getAnimations()) {
    if (!a.effect || !a.effect.target) continue;
    (byElement.get(a.effect.target) || byElement.set(a.effect.target, []).get(a.effect.target)).push(a);
  }
  const pairs = [];
  for (const anims of byElement.values()) {
    if (anims.length < 2) continue;
    for (let i = 0; i < anims.length; i++) for (let j = i + 1; j < anims.length; j++) {
      const [A, B] = [anims[i], anims[j]];
      const shared = [...animatedProps(A)].filter((p) => animatedProps(B).has(p));
      if (!shared.length) continue;
      const tA = A.effect.getComputedTiming(), tB = B.effect.getComputedTiming();
      if (tA.fill === 'none' || tB.fill === 'none') continue;
      const backwardHitsOther = (back, other) => reachesBack(back) && other.delay < back.delay;
      if (backwardHitsOther(tA, tB) || backwardHitsOther(tB, tA)) pairs.push({ a: A, b: B, props: shared });
    }
  }
  return pairs;
}

// activeOverlapPairs(): every pair of animations, on the same element, sharing a property (both
// composite:'replace', the WAAPI default), whose ACTIVE windows (delay..delay+duration*iterations,
// fill ignored) genuinely overlap. WAAPI composites later-registered animations on top of earlier ones
// FOR THE WHOLE OVERLAP, regardless of either one's fill: a per-letter animation registered after a
// timing-sheet row on the same element/property wins for as long as both are playing, so the earlier
// row's motion is invisible there even though it is still "running". fillCollisionPairs (above) catches
// a narrower case, one side reaching BACKWARD past its own start; this one needs no backward reach at
// all, only two active spans that share real time. ONE definition, so anim-traps.mjs's gate can never
// disagree with what actually composites on screen.
export function activeOverlapPairs() {
  const byElement = new Map();
  for (const a of document.getAnimations()) {
    if (!a.effect || !a.effect.target) continue;
    (byElement.get(a.effect.target) || byElement.set(a.effect.target, []).get(a.effect.target)).push(a);
  }
  const pairs = [];
  for (const anims of byElement.values()) {
    if (anims.length < 2) continue;
    for (let i = 0; i < anims.length; i++) for (let j = i + 1; j < anims.length; j++) {
      const [A, B] = [anims[i], anims[j]];
      if ((A.effect.composite || 'replace') !== 'replace' || (B.effect.composite || 'replace') !== 'replace') continue;
      const shared = [...animatedProps(A)].filter((p) => animatedProps(B).has(p));
      if (!shared.length) continue;
      const tA = A.effect.getComputedTiming(), tB = B.effect.getComputedTiming();
      const activeSpan = (t) => [t.delay || 0, (t.delay || 0) + (t.duration || 0) * (t.iterations === Infinity ? 1 : (t.iterations || 1))];
      const [aStart, aEnd] = activeSpan(tA), [bStart, bEnd] = activeSpan(tB);
      const overlapMs = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
      if (overlapMs > 1) pairs.push({ a: A, b: B, props: shared, overlapMs });
    }
  }
  return pairs;
}
