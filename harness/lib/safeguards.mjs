// harness/lib/safeguards.mjs: the shared mechanism behind "safeguards should be documented but the
// harness should understand things and tweak" (.claude/plans/adaptive-safeguards.plan.md).
//
// A guard keeps its measurement and its documented intent; only the VERDICT changes. Before a finding
// fails a film, this registry asks whether the film's own context already explains it, and if so
// clamps, tolerates, reclassifies or skips it instead of failing, always naming what it did and why in
// one printable line. A code with no entry here passes through unchanged: this file only ever SOFTENS
// a verdict an entry explicitly owns, never invents a new failure.
//
// docs/SAFEGUARDS.md is the index (code, file:line, intent, doc, adaptive behaviour). This file is the
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
