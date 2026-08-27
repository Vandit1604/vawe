// formats/scene/props.js. The layer props the SCENE ORCHESTRATOR itself reads: the timing it writes
// onto every element, the declared relationships it resolves before any DOM exists (start chains,
// `becomes`, anchors), the GSAP hooks it wires, and the sound it derives from the film's own copy.
//
// A file of its own, and this is the one place in the declaration system where the statement is not
// three lines from the read. formats/scene/scene.js imports by ABSOLUTE specifier (`/core/boot.js`),
// which is what the browser needs and what makes the module unloadable in node, so a gate could not
// read a `PROPS` living inside it. Everything else declares in place; this is the exception, it is next
// door, and scene.js points here from each of the four places it reads a layer.
export const PROPS = {
  // the clip timing every layer element carries (setLayerTiming → core/clips.js)
  start: {}, duration: {}, track: {}, anim: {}, out: {}, enterDur: {}, exitDur: {},
  split: {}, cut: {}, acrossBeats: {},
  // the element itself: box, class, text alignment, the look, and the audit's visibility opt-in
  type: {}, id: {}, x: {}, y: {}, w: {}, h: {}, align: {}, filter: {}, size: {}, critical: {},
  // declared relationships, resolved to numbers before any frame exists
  motion: {},
  becomes: {}, becomesDur: { when: 'becomes' }, becomesEase: { when: 'becomes' },
  anchor: {}, at: { when: 'anchor' }, dx: { when: 'anchor' }, dy: { when: 'anchor' },
  // split treatments the orchestrator applies at build (the per-frame half is core/tracks/)
  ransom: {}, ransomSeed: { when: 'ransom' }, circle: {}, text: {},
  // the GSAP hooks (applyGsapHooks): each is its own opt-in surface
  morph: {}, fx: {}, fxOut: {}, motionPath: {}, physics: {}, parts: {}, splitText: {},
  // sound derived from the film itself (buildSfx): a keystroke train exists only where text types
  typing: {}, keyClicks: { when: 'typing' }, keyCue: { when: 'typing' }, keyGain: { when: 'typing' },
};
