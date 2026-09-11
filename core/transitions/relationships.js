// core/transitions/relationships.js: THE TAXONOMY, AS DATA.
//
// docs/CRAFT/TRANSITIONS.md carries the decision theory in prose (the taxonomy table, the 9-step
// procedure); this is the same taxonomy keyed by RELATIONSHIP so a gate can compare an author's stated
// reason against real candidates instead of only printing the doc. Prose stays the owner of WHY; this
// file only makes ITS OWN NAMES checkable (a freshness test in quality/gates/lib-test.mjs asserts every
// catalog candidate below still exists in core/transitions/catalog.js).
//
// A candidate is either a real catalog transition name (`none`, `fade`, `whipPan`, ...) or one of the
// three NAMED NON-CUT DEVICES the doc's taxonomy also lists, which the catalog cannot classify because
// they are not a mechanism the engine names: a persistent layer + motion (shared-element morph), a
// motion track that continues across the cut (match-on-action), or a `cameraMove` with no cut at all
// (camera travel). DEVICES names exactly those three so the freshness test can skip them on purpose,
// not by accident.
export const DEVICES = new Set(['camera travel', 'shared-element morph', 'match-on-action']);

// RELATIONSHIPS: keyed by the RELATIONSHIP between two beats (docs/CRAFT/TRANSITIONS.md, decision
// procedure step 4). Each value: candidates (catalog names and/or DEVICES entries, in the order the doc
// itself reaches for them) and meaning (one line, the feeling this relationship signifies).
export const RELATIONSHIPS = {
  continuity: {
    candidates: ['none'],
    meaning: 'nothing: invisible, respects momentum. Two beats are one continuous thought.',
  },
  'same-object': {
    candidates: ['shared-element morph'],
    meaning: 'magic: the same identity across states, the highest-craft continuity there is.',
  },
  'same-action': {
    candidates: ['match-on-action'],
    meaning: 'seamless, energy carried through: cut on a movement so the eye rides it past the seam.',
  },
  rhyme: {
    candidates: ['none'],
    meaning: '"these two things are the same": bridge scenes by a visual or compositional rhyme.',
  },
  time: {
    candidates: ['dissolve', 'fade'],
    meaning: 'passage of time, a connection, gentleness: link two images, soften, show time passing.',
  },
  'act-break': {
    candidates: ['fade'],
    meaning: 'a beginning or an ending, an act break: open or close the film or a major section.',
  },
  contrast: {
    candidates: ['none', 'flashWhite'],
    meaning: 'shock, jolt: end on maximum tonal contrast; wake from a dream.',
  },
  'new-place-energy': {
    candidates: ['whipPan', 'wipe'],
    meaning: 'frantic energy, momentum, "meanwhile": an energetic location or time change.',
  },
  'spatial-travel': {
    candidates: ['camera travel'],
    meaning: 'one world: the beats are PLACES, not claims. The content has a spatial logic worth walking.',
  },
};

export const RELATIONSHIP_KEYS = Object.keys(RELATIONSHIPS);

/** candidatesFor(relationship) -> string[] | null. The exact list a gate or `make transitions` prints. */
export function candidatesFor(relationship) {
  return RELATIONSHIPS[relationship] ? RELATIONSHIPS[relationship].candidates : null;
}
