// harness/lib/safeguards.mjs: the shared mechanism behind "safeguards should be documented but the
// harness should understand things and tweak" (.claude/plans/adaptive-safeguards.plan.md).
//
// A guard keeps its measurement and its documented intent; only the VERDICT changes. Before a finding
// fails a film, this registry asks whether the film's own context already explains it, and if so
// clamps, tolerates, reclassifies or skips it instead of failing, always naming what it did and why in
// one printable line. A code with no entry here passes through unchanged: this file only ever SOFTENS
// a verdict an entry explicitly owns, never invents a new failure.
//
// engine-doctrine/SAFEGUARDS.md is the index (code, file:line, intent, doc, adaptive behaviour). This file is the
// mechanism; the doc is the map.

// Registry, keyed by finding `kind` (the same string every gate already reports under). Each entry:
//   intent: one line, copied from the guard's own comment: what the guard is FOR.
//   doc: the doc that owns that intent.
//   applies(finding, ctx): does this finding carry the facts this entry needs to judge it?
//   adapt(finding, ctx): called only when applies() is true; returns the verdict.
const REGISTRY = {
  overflow: {
    intent: 'text clipped (scrollW/H > clientW/H) is a HARD fail: content the viewer cannot read.',
    doc: 'quality/audit.mjs',
    applies: (f) => typeof f.pct === 'number',
    adapt: (f) => {
      if (f.pct < 0.01) {
        return { verdict: 'tolerate', value: f.pct,
          line: `adapted overflow: kept as a warning, ${(f.pct * 100).toFixed(1)}% of the box (under the 1% rounding floor)` };
      }
      return { verdict: 'hard' };
    },
  },
  'clipped-text': {
    intent: 'a text mask shorter/narrower than its glyphs cuts descenders or edges: a HARD fail.',
    doc: 'quality/audit.mjs',
    applies: (f) => typeof f.ellipsis === 'boolean',
    adapt: (f) => {
      if (f.ellipsis) {
        return { verdict: 'reclassify', value: 'designed-truncation',
          line: 'adapted clipped-text: text-overflow is ellipsis with overflow hidden, this is designed truncation, not clipped glyphs' };
      }
      return { verdict: 'hard' };
    },
  },
  'small-text': {
    intent: 'a kit must never write a text role below the smallest size a moving 1920-wide frame can be read at.',
    doc: 'harness/lib/stagekit.mjs',
    applies: (f) => typeof f.wrapped === 'boolean',
    adapt: (f) => {
      if (f.wrapped) {
        return { verdict: 'skip', value: f.px,
          line: `adapted small-text: ${f.px}px text inside a screenshot/mock-UI wrapper skipped (the floor is the captured surface's own type, not the kit's)` };
      }
      return { verdict: 'hard' };
    },
  },
  'plain-slideshow': {
    intent: 'a film this long needs a minimum count of beats/effects/expressive families, or it reads as an unforced default.',
    doc: 'engine-doctrine/CRAFT/DIRECTION.md',
    applies: (f, ctx) => !!(ctx && Array.isArray(ctx.not)),
    adapt: (f, ctx) => {
      if (ctx.not.some((n) => /slideshow|plain|static/i.test(n))) {
        return { verdict: 'skip', value: 'waived-by-not',
          line: 'adapted plain-slideshow: skipped, the storyboard\'s NOT line names this on purpose' };
      }
      return { verdict: 'hard' };
    },
  },
  'feature-poverty': {
    intent: 'a film this long needs a minimum count of beats/effects/expressive families, or it reads as an unforced default.',
    doc: 'engine-doctrine/CRAFT/DIRECTION.md',
    applies: (f, ctx) => typeof (ctx && ctx.durationSec) === 'number',
    adapt: (f, ctx) => {
      const SHORT_FILM_FLOOR_SEC = 12;
      if (ctx.durationSec < SHORT_FILM_FLOOR_SEC) {
        return { verdict: 'skip', value: ctx.durationSec,
          line: `adapted feature-poverty: skipped, ${ctx.durationSec}s is below the ${SHORT_FILM_FLOOR_SEC}s short-film floor` };
      }
      return { verdict: 'hard' };
    },
  },
  'ends-on-nothing': {
    intent: 'the final tail of the film must hold a content layer, not a bare backdrop.',
    doc: 'engine-doctrine/CRAFT/DIRECTION.md',
    applies: (f) => typeof f.tailLayerKind === 'string',
    adapt: (f) => {
      if (/brand|mark|logo/i.test(f.tailLayerKind)) {
        return { verdict: 'reclassify', value: 'content',
          line: `adapted ends-on-nothing: the tail's ${f.tailLayerKind} layer counts as content` };
      }
      return { verdict: 'hard' };
    },
  },
  'archetype-repeat': {
    intent: 'two beats running with the same composition archetype back to back read as one flat cut.',
    doc: 'engine-doctrine/CRAFT/LAYOUT.md',
    applies: (f, ctx) => !!(ctx && Array.isArray(ctx.not)),
    adapt: (f, ctx) => {
      if (ctx.not.some((n) => /archetype|repeat/i.test(n))) {
        return { verdict: 'skip', value: 'waived-by-not',
          line: 'adapted archetype-repeat: skipped, the storyboard\'s NOT line names the repeat on purpose' };
      }
      return { verdict: 'hard' };
    },
  },
  'seam-split': {
    intent: 'a hard background swap disguised inside a soft layer dissolve, measured in the margin strip outside every authored layer box.',
    doc: 'engine-doctrine/CRAFT/TRANSITIONS.md#seam-forensics-split-seam',
    applies: (f, ctx) => Array.isArray(ctx && ctx.layers) && f.fieldBox,
    adapt: (f, ctx) => {
      const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      if (ctx.layers.some((l) => l.box && overlaps(l.box, f.fieldBox))) {
        return { verdict: 'reclassify', value: 'real-content-in-margin',
          line: 'adapted seam-split: reclassified, a real content layer occupies the margin strip this check reads as the field' };
      }
      return { verdict: 'hard' };
    },
  },
  'plan-overruns-render': {
    intent: 'the plan\'s beat spans must describe the film that actually rendered.',
    doc: 'engine-doctrine/CRAFT/AUTHORING-WALKTHROUGH.md',
    applies: (f, ctx) => typeof f.driftFrames === 'number' && typeof (ctx && ctx.fps) === 'number',
    adapt: (f) => {
      if (Math.abs(f.driftFrames) <= 1) {
        return { verdict: 'tolerate', value: f.driftFrames,
          line: `adapted plan-overruns-render: kept as a warning, ${f.driftFrames} frame(s) drift is within the one-frame floor` };
      }
      return { verdict: 'hard' };
    },
  },
};

// adaptFinding(finding, ctx) -> finding, unchanged for a code with no entry or one that does not
// apply, or the same finding carrying `.adapted = { verdict, value, line }` when a registry entry
// judged it. ctx = { scene, storyboard beats, layer, element facts } as the film supplies them; entries
// read only the ctx keys they need.
export function adaptFinding(finding, ctx = {}) {
  const entry = REGISTRY[finding.kind];
  if (!entry || !entry.applies(finding, ctx)) return finding;
  const verdict = entry.adapt(finding, ctx);
  if (!verdict || verdict.verdict === 'hard') return finding;
  return { ...finding, adapted: verdict };
}

export { REGISTRY };
