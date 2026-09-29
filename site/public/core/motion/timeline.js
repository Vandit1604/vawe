// core/motion/timeline.js: relative-timing sugar over the platform's own Web Animations API, for
// first-party code that builds a hand-authored sequence (a `composition` in core/compositions/*.js,
// or any other trusted engine JS) without pulling in GSAP for it. It computes DELAYS only; every call
// it makes is a plain `element.animate()`, so `seekAll(t)` (core/timeline/clips.js) already drives it
// deterministically, the same clock `document.getAnimations()` sweeps for CSS animation and transition.
//
// `at` is the one thing this file is FOR: GSAP's position-parameter vocabulary, small enough to keep.
//   - a number: an ABSOLUTE time, seconds from this timeline's own start
//   - "<": start together WITH the previous call (same start time)
//   - ">": start right after the previous call ENDS
//   - "+=0.2" / "-=0.2": that many seconds after/before the current cursor (where the NEXT call would
//     land with no `at` at all, i.e. right after the previously added call ends)
//   - a label name registered with `.label()`: that label's own time
// With no `at`, a call is sequential: it starts at the cursor, exactly like "+=0".
function builder() {
  let cursor = 0;      // where the next untimed call lands: end of the last call added
  let prevStart = 0;   // the last call's own start, for "<"
  const labels = new Map();
  const anims = [];

  function resolveAt(at) {
    if (at == null) return cursor;
    if (typeof at === 'number') return at;
    if (at === '<') return prevStart;
    if (at === '>') return cursor;
    const rel = /^([+-]=)(\d+(?:\.\d+)?)$/.exec(at);
    if (rel) return cursor + (rel[1] === '+=' ? 1 : -1) * Number(rel[2]);
    if (labels.has(at)) return labels.get(at);
    throw new Error(`timeline: unknown position "${at}", want a number, "<", ">", "+=n"/"-=n", or a label name`);
  }

  return {
    // .to(el, keyframes, {duration, easing, at, fill}) → the Animation, already playing (and already
    // seekable). `fill` defaults to 'both' so the settled end state holds, the same default seekAll(t)
    // applies to any animation this engine did not build with an explicit fill.
    to(el, keyframes, { duration = 0.5, easing = 'ease', at, fill = 'both' } = {}) {
      const start = resolveAt(at);
      const a = el.animate(keyframes, { duration: duration * 1000, easing, fill,
        delay: Math.max(0, start * 1000) });
      anims.push(a);
      prevStart = start;
      cursor = Math.max(cursor, start + duration);
      return a;
    },
    // .label(name, at) → records a time under `name`, for a later `.to(..., {at: name})`. `at` takes
    // the same vocabulary as `.to`'s, so a label can itself sit "<" or "+=0.3" off what came before.
    label(name, at) {
      labels.set(name, resolveAt(at));
      return this;
    },
    // .stagger(els, keyframes, opts, each) → one `.to` per element, each starting `each` seconds after
    // the last, all otherwise sharing `opts`. The whole group still starts at `opts.at` (or the cursor).
    stagger(els, keyframes, opts = {}, each = 0.05) {
      const base = resolveAt(opts.at);
      els.forEach((el, i) => this.to(el, keyframes, { ...opts, at: base + i * each }));
      return this;
    },
    get animations() { return anims.slice(); },
    get duration() { return cursor; },
  };
}

// BOX_KEYS: the engine's OWN box vocabulary, x/y/w/h, exactly as a layer names its own box in scene
// JSON and as harness/author/preview-fragment.mjs's getFragBoxes reads a rendered box back. A row's
// `from`/`to` can use these instead of raw CSS, so an authored row and a captured box compare on the
// same field names rather than one side speaking `x` and the other `left`.
const BOX_KEYS = ['x', 'y', 'w', 'h'];

// cssPropsOf(props): translate x/y into one `transform: translate()` and w/h into width/height,
// leaving every other property (opacity, background, ...) exactly as authored. x and y are read
// together (a row that moves only one axis still states both, 0 for the axis it holds).
function cssPropsOf(props) {
  const out = {};
  if (props.x != null || props.y != null) out.transform = `translate(${props.x ?? 0}px, ${props.y ?? 0}px)`;
  if (props.w != null) out.width = `${props.w}px`;
  if (props.h != null) out.height = `${props.h}px`;
  for (const k of Object.keys(props)) if (!BOX_KEYS.includes(k)) out[k] = props[k];
  return out;
}

// rowKeyframes(row): a row's `from`/`to` (each optional, box-or-CSS props) into the two-keyframe list
// `.to()` takes. Missing halves default to {}, i.e. "whatever the element already has stays".
function rowKeyframes(row) {
  return [cssPropsOf(row.from || {}), cssPropsOf(row.to || {})];
}

// runRows(rows): one row per authored event, `{el, at, dur, from, to, ease, stagger}`. `el` is a CSS
// selector resolved against `root` (default `document`; a literal Element is accepted too, for a comp
// that already holds a reference and would rather not round-trip through a selector). Scoping to
// `root` matters the moment two comps each carry their own `.dot`: an unscoped `document.querySelectorAll`
// would drive BOTH from either one's sheet. Rows share ONE builder, in authored order, so a row's `at`
// can chain off the row before it exactly like `.to()`'s own calls do.
function runRows(rows, root) {
  const tl = builder();
  for (const row of rows) {
    const els = typeof row.el === 'string' ? [...root.querySelectorAll(row.el)] : [row.el];
    const keyframes = rowKeyframes(row);
    // `fill` defaults to 'forwards' HERE, not `.to()`'s own 'both': a sheet is rows chained in TIME
    // ORDER on purpose, and 'both' reaches backward past a row's own start, retroactively covering
    // whatever row came before it on a shared property (core/timeline/clips.js's fillCollisionPairs,
    // the fill-collision trap). 'forwards' holds after, same as every other row, and never claims time
    // before its own delay, so a correctly time-ordered sheet composites exactly as authored at every
    // instant with no collision. Pass `fill:"both"` explicitly on a row that really wants the backward
    // reach (nothing precedes it on that property).
    const opts = { duration: row.dur ?? 0.5, easing: row.ease ?? 'ease', at: row.at, fill: row.fill ?? 'forwards' };
    if (row.stagger) tl.stagger(els, keyframes, opts, row.stagger);
    else for (const el of els) tl.to(el, keyframes, opts);
  }
  return tl;
}

// timeline(rows?, root?) → the imperative builder (no argument, the shape above), or, given an ARRAY
// of plain rows, builds and runs every one of them (selectors scoped to `root`, default `document`)
// and returns the same builder. Two calling conventions for one mechanism, not two: both end in the
// same `.to()` and the same `element.animate()`.
export function timeline(rows, root = typeof document !== 'undefined' ? document : undefined) {
  return Array.isArray(rows) ? runRows(rows, root) : builder();
}

// timelineFromScript(root, id='timing') → reads `<script type="application/json" id="timing">` inside
// `root` (a fragment's own DOM, already built) as a rows array and runs it, with every row's selector
// scoped to that same `root`. This is the editable-sheet half of the mechanism: an agent changes ONE
// row's `at`/`dur`/`to` in that JSON block to move one event, without touching the JS that reads it.
// Returns null (does nothing) when the block is absent, never throws for a comp with no such block.
export function timelineFromScript(root, id = 'timing') {
  const el = root.querySelector(`script#${id}[type="application/json"]`);
  if (!el) return null;
  const parsed = JSON.parse(el.textContent);
  return timeline(Array.isArray(parsed) ? parsed : parsed.rows, root);
}

if (typeof window !== 'undefined') Object.assign(window.vawe || (window.vawe = {}), { timeline, timelineFromScript });
