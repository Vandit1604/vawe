// core/fx/word-slot.js — ONE WORD IN THE SENTENCE SWAPS, AND NOTHING AFTER IT MOVES.
//
//   "modifiers": [{ "wordSlot": { "words": ["docs", "dashboards", "release notes"] } }]
//   on a layer whose text carries the placeholder:  "text": "Ship {} in seconds"
//
// CLAUDE.md has carried this as a standing launch rule — "a changing word belongs in a fixed box…and
// the chip is the natural place for the brand colour" — with no primitive that could express it. The
// nearest thing, `slotSwap`, is beat-grain: three whole rows turning over. This is one word inside a
// line of type, which is a different size of idea and a different failure when it is done by hand.
//
// THE ENGINEERING IS THE SIZING, and it is not measured. Every candidate is placed in the SAME grid
// cell (`grid-area: 1 / 1`) of an `inline-grid`, so the column is auto-sized to the widest of them by
// the layout engine itself. Nothing reads `offsetWidth`, nothing consults a font metric, nothing runs
// at render time: the box is as wide as the longest word from the first frame, so the words after the
// slot sit still for the whole film however many times it turns over. A JS measurement would have been
// a layout read inside a pure renderFrame(n), and it would have had to happen after fonts loaded —
// which is exactly the class of bug this engine keeps logging. The browser already knows the answer.
//
// The inactive candidates are hidden with OPACITY, never `display` and never `visibility: collapse`: a
// grid item still sizes its track at opacity 0, and any of the other three would let the box shrink to
// whichever word happens to be showing, which is the whole defect.
//
// PURITY. build() restructures the DOM once; frame() writes opacity and a translate onto the spans this
// modifier created, never onto the layer element, so the composition-order contract in core/fx/index.js
// holds (transform/opacity/filter on the LAYER belong to the cross-cutting tracks). Every value is a
// function of `t` alone, so a cold render and a warm one agree.

import { clamp01, easeOutCubic } from '../motion.js';

export const WORD_SLOT_KEYS = ['words', 'every', 'swap', 'at', 'chip', 'loop', 'delay', 'rise'];

const MARK = 'data-word-slot';

function resolve(spec) {
  const s = Array.isArray(spec) ? { words: spec } : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`wordSlot: expected a list of words or an object like `
      + `{ "words": ["docs", "dashboards"] } — got ${JSON.stringify(spec)}. Keys: ${WORD_SLOT_KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!WORD_SLOT_KEYS.includes(k))
      throw new Error(`wordSlot: unknown key "${k}" — known: ${WORD_SLOT_KEYS.join(', ')}.`);
  const words = s.words;
  // ONE candidate is a sentence with a fixed word in it, which needs no slot and no modifier. Silently
  // rendering it would look like a swap that never came round.
  if (!Array.isArray(words) || words.length < 2 || words.some((w) => typeof w !== 'string' || !w.trim()))
    throw new Error(`wordSlot: "words" is two or more non-empty strings, the candidates the slot turns `
      + `through — got ${JSON.stringify(words)}. One word is not a swap.`);
  const every = s.every == null ? 1.1 : s.every;
  const swap = s.swap == null ? 0.26 : s.swap;
  const delay = s.delay == null ? 0 : s.delay;
  const rise = s.rise == null ? 0.42 : s.rise;   // a share of the slot's own line height, so it scales
  for (const [k, v, min] of [['every', every, 0], ['swap', swap, 0], ['delay', delay, -1]]) {
    if (!Number.isFinite(v) || v <= min)
      throw new Error(`wordSlot: "${k}" must be ${min < 0 ? 'zero or more' : 'a positive number of'} seconds; got ${JSON.stringify(v)}`);
  }
  // A transition longer than the hold means no word is ever fully settled — the line never reads.
  if (swap > every)
    throw new Error(`wordSlot: "swap" (${swap}s) is longer than "every" (${every}s), so a word starts `
      + `leaving before it has arrived and none of them is ever legible. Shorten the swap.`);
  if (!Number.isFinite(rise) || rise < 0)
    throw new Error(`wordSlot: "rise" is the travel as a share of the slot's line height; got ${JSON.stringify(rise)}`);
  const at = s.at == null ? '{}' : s.at;
  if (typeof at !== 'string' || !at)
    throw new Error(`wordSlot: "at" is the placeholder to replace in the layer's own text; got ${JSON.stringify(at)}`);
  return { words, every, swap, at, chip: s.chip ?? false, loop: !!s.loop, delay, rise };
}

// The first text node under `el` containing `at`. Walked rather than regexed over innerHTML, because
// the layer's text may carry <b>/<em> shells and rewriting the whole string would rebuild them.
function findMark(el, at) {
  const walk = (node) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3 && n.nodeValue.includes(at)) return n;
      if (n.nodeType === 1) { const hit = walk(n); if (hit) return hit; }
    }
    return null;
  };
  return walk(el);
}

export function build(kit, el, L, spec) {
  const { words, at, chip } = resolve(spec);
  // `split` wraps every word of the layer in its own `.ku` unit and animates them independently, so a
  // slot built inside one would be driven by two clocks writing the same transform. Refused rather than
  // rendered, because the result is a word that stutters for reasons nothing on screen explains.
  if (L.split)
    throw new Error(`wordSlot: this layer also sets \`split: "${L.split}"\`, and the kinetic units would `
      + `animate the slot's own spans as well. Drop \`split\` — the slot brings its own motion — or put `
      + `the swapping word in a layer of its own.`);
  const node = findMark(el, at);
  if (!node)
    throw new Error(`wordSlot: the layer's text does not contain the placeholder "${at}", so there is `
      + `nowhere to put the slot. Write it into the text — "Ship ${at} in seconds" — or set \`at\` to `
      + `the marker you used.`);
  const [before, ...rest] = node.nodeValue.split(at);
  const slot = document.createElement('span');
  slot.setAttribute(MARK, '1');
  slot.style.display = 'inline-grid';
  // Baseline, so the slot sits on the sentence's own line rather than being centred against it.
  slot.style.verticalAlign = 'baseline';
  if (chip) {
    // The chip is where the brand colour belongs (CLAUDE.md launch rule 5). `--on-accent` is the
    // guaranteed ink for that fill, so the pair is readable in every theme without grading a hex.
    slot.style.background = typeof chip === 'string' ? chip : 'var(--accent)';
    slot.style.color = typeof chip === 'string' ? 'var(--on-accent)' : 'var(--on-accent)';
    slot.style.padding = '0.06em 0.28em';
    slot.style.borderRadius = '0.14em';
    // The chip is the one place the box may CLIP: a word travelling out of a coloured plate reads as
    // the plate refilling. Without the chip there is no edge, so clipping would only cut descenders.
    slot.style.overflow = 'hidden';
  }
  for (const w of words) {
    const s = document.createElement('span');
    s.textContent = w;
    // Every candidate in the SAME cell: the column is auto-sized to the widest of them, by layout, once.
    s.style.gridArea = '1 / 1';
    s.style.justifySelf = 'center';
    s.style.whiteSpace = 'pre';
    slot.appendChild(s);
  }
  node.nodeValue = before;
  node.parentNode.insertBefore(slot, node.nextSibling);
  if (rest.length) node.parentNode.insertBefore(document.createTextNode(rest.join(at)), slot.nextSibling);
}

export function frame(kit, el, L, t, scene, spec) {
  const { words, every, swap, at, loop, delay, rise } = resolve(spec);
  const slot = el.querySelector(`[${MARK}]`);
  if (!slot) return;                       // build refused nothing, so this can only be a re-entrancy no-op
  const n = words.length;
  const lt = t - (L.start ?? 0) - delay;
  // Before the first swap the slot holds word 0, and after the last it holds the last one — a slot that
  // ran out of words and blanked would read as a layer that broke.
  const step = lt <= 0 ? 0 : Math.floor(lt / every);
  const idx = loop ? ((step % n) + n) % n : Math.min(step, n - 1);
  const prev = loop ? ((idx - 1) % n + n) % n : Math.max(0, idx - 1);
  // The swap window opens at each step boundary. The first word has nothing behind it to leave, and a
  // non-looping slot that has run past its last word is standing still, so both are pinned settled.
  const settled = step === 0 || (!loop && step > n - 1);
  const p = settled ? 1 : clamp01((lt - step * every) / swap);
  const e = easeOutCubic(p);
  for (let i = 0; i < n; i++) {
    const s = slot.children[i];
    let o;
    if (i === idx) { o = p; s.style.transform = `translateY(${((1 - e) * rise * 100).toFixed(2)}%)`; }
    else if (i === prev && p < 1) { o = 1 - p; s.style.transform = `translateY(${(-e * rise * 100).toFixed(2)}%)`; }
    else { o = 0; s.style.transform = 'none'; }
    s.style.opacity = o.toFixed(4);
    // THE GATES READ THE DOM, and every candidate is in it so the box can be sized to the widest. Say
    // which ones are not on screen THIS frame, or the audit grades the film against a concatenation of
    // all of them ("docsdashboardschangelogs") and manufactures a contrast finding whose only fix is to
    // make the film worse. Written per frame rather than once at build, because which word is showing is
    // a function of `t` — so whatever frame a gate samples, it reads exactly the word a viewer sees.
    if (o > 0.05) s.removeAttribute('data-ink'); else s.setAttribute('data-ink', 'off');
  }
}
