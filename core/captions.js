// core/captions.js — caption STYLE kit (wave 1). PURE in t: capWords() turns one caption line
// into absolute per-word windows; CAP_STYLES map per-word progress u∈[0,1] → a style object,
// the same contract as core/type.js PRESETS (and `highlight` literally reuses that preset).
// Degradation is built in: a line with no `words` array gets deterministic per-word windows
// distributed proportionally to word length (longer words hold longer, like speech), so every
// style still reads as intentional karaoke on plain `make captions` output.
import { clamp01 } from './motion.js';
import { PRESETS } from './type.js';
import { onScreenText } from './on-screen-text.js';

// capWords(cap) → [{ w, t0, t1 }] with ABSOLUTE windows covering [cap.t0, cap.t1].
// Author-supplied cap.words ([{t0,t1}], aligned to the markup-stripped word list) wins;
// otherwise distribute (t1 - t0 - TAIL) ∝ word length. Deterministic either way.
const TAIL = 0.12; // the last word finishes its fill before the 0.14s line fade-out starts
export function capWords(cap) {
  // WORDS, so onScreenText: a `<br>` separates two of them and a `<b>` around part of one does not.
  // The author's optional `cap.words` array is aligned to THIS list, so the rule has to be the shared
  // one or a hand-timed line silently falls back to the estimator.
  const words = onScreenText(cap.text).split(/\s+/).filter(Boolean);
  if (Array.isArray(cap.words) && cap.words.length === words.length)
    return words.map((w, i) => ({ w, t0: cap.words[i].t0, t1: cap.words[i].t1 }));
  const span = Math.max(0.1, (cap.t1 - cap.t0) - TAIL);
  const total = words.reduce((n, w) => n + w.length + 1, 0);
  let t = cap.t0;
  return words.map((w) => {
    const d = span * ((w.length + 1) / total);
    const win = { w, t0: +t.toFixed(3), t1: +(t + d).toFixed(3) };
    t += d;
    return win;
  });
}

// wordU(t, win): karaoke progress of one word at absolute time t.
export const wordU = (t, win) => clamp01((t - win.t0) / Math.max(0.001, win.t1 - win.t0));

// lineU(t, wins): whole-line progress for clipWipe — each word contributes its CHARACTER share
// scaled by its own progress, so the wipe front tracks the spoken word, not wall-clock time.
export function lineU(t, wins) {
  const total = wins.reduce((n, w) => n + w.w.length + 1, 0);
  let acc = 0;
  for (const win of wins) acc += ((win.w.length + 1) / total) * wordU(t, win);
  return clamp01(acc);
}

// ---------- styles: (u, active) → style object. Every prop is written EVERY frame by the caller
// (authoritative writes, the same rule as the motion-blur filter recompose in scene.html), so a
// cold seek renders byte-identical to a warm one. ----------
// CONTRAST DOCTRINE (this repo has shipped sub-4.5:1 dimming before — never again):
//  * inactive ink is a color-mix toward the theme bg, NEVER an opacity drop over unknown video;
//  * styled captions sit on a 78% var(--bg) scrim plate (scene.html CSS), so contrast is computed
//    against a KNOWN backdrop. The 76% / 42% / 28% mixes below are chosen by WCAG arithmetic at
//    the worst-case theme, with headroom; the audit's contrast pass is the enforcement.
export const CAP_STYLES = {
  // marker band draws behind the active word; earlier words keep their full band (a read trail).
  // 28% accent: even a near-white accent over the dark plate leaves white text at >= 4.9:1.
  highlight: (u) => PRESETS.highlight(u, { color: 'color-mix(in srgb, var(--accent) 28%, transparent)' }),

  // pill fill sweeps left -> right. 42% accent into var(--bg) keeps the bg dominant, so the
  // theme's own text/bg pair (contract-guaranteed) degrades by well under half.
  pillKaraoke: (u) => {
    const fill = 'color-mix(in srgb, var(--accent) 42%, var(--bg))';
    return {
      backgroundImage: `linear-gradient(${fill}, ${fill})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '0 0',
      backgroundSize: `${(clamp01(u) * 100).toFixed(1)}% 100%`,
    };
  },

  // active word: full ink, weight 800, a small pure sine bump (rises and settles, symmetric in u).
  // inactive: the mix, never opacity, so it stays legible over the plate. A SPOKEN word is not an
  // upcoming one and this style used to render them identically, which is a karaoke with no memory:
  // it holds its weight at 700 and only dims to 88%, so the line reads as read-behind, live, ahead.
  weightShift: (u, active) => active
    ? { fontWeight: '800', color: 'var(--text)',
        transform: `scale(${(1 + 0.06 * Math.sin(Math.PI * clamp01(u))).toFixed(3)})` }
    : clamp01(u) > 0
      ? { fontWeight: '700', color: 'color-mix(in srgb, var(--text) 88%, var(--bg))', transform: 'scale(1)' }
      : { fontWeight: '600', color: 'color-mix(in srgb, var(--text) 76%, var(--bg))', transform: 'scale(1)' },

  // clipWipe is LINE-level: applied to the accent overlay copy, driven by lineU(t, wins).
  clipWipe: (p) => ({ clipPath: `inset(0 ${((1 - clamp01(p)) * 100).toFixed(2)}% 0 0)` }),

  // ---- wave 2. Each one occupies a register wave 1 left empty: LIGHT (neonEdge), IMPACT
  // (kineticSlam), a RULE beneath the ink (underlineDraw), DEPTH (readerFocus). None of them touches
  // the ink of the spoken or current word, so the contrast floor of every one is the plate's own
  // text/bg pair; only the upcoming state dims, and it dims by the same colour mix as weightShift.
  // THE BAND: every wave-2 value is bounded to stay inside the `styled` skin's 14px pad
  // (core/safe.js CAPTION_SKINS), so captionBand() still describes the strip these styles paint.

  // light, not ink: the accent lives entirely in a halo. The current word blooms (pure sine, so it
  // rises and settles), a spoken word keeps a quieter settled halo as its read trail, an upcoming
  // word has none. MAX_HALO is half the plate pad, so even the bloom's outer edge stays on the plate.
  neonEdge: (u, active) => {
    const p = clamp01(u);
    const lit = active ? 0.55 + 0.45 * Math.sin(Math.PI * p) : 0.45 * p;
    const r = 14 * lit;
    return {
      color: p > 0 ? 'var(--text)' : 'color-mix(in srgb, var(--text) 76%, var(--bg))',
      textShadow: lit > 0
        ? `0 0 ${(r * 0.5).toFixed(1)}px color-mix(in srgb, var(--accent) 85%, transparent), `
          + `0 0 ${r.toFixed(1)}px color-mix(in srgb, var(--accent) 55%, transparent)`
        : 'none',
    };
  },

  // impact: the word lands oversize and settles, tracking collapsing with it. Cubic, so nearly all of
  // the travel is spent in the first third of the word's window and the rest of it holds still.
  // 1.22 is the ceiling: at the skin's 64px that grows the half-height by 7px, inside the 14px pad.
  // It settles to 1.04, NOT to 1: a cubic that lands on the resting size makes the current word and
  // an already-spoken one identical for four fifths of the window, so a still of the line shows two
  // states where there are three. The last 4% is what stays behind to say "here".
  kineticSlam: (u, active) => {
    const p = clamp01(u);
    const back = (1 - p) ** 3;
    // NO keyed letter-spacing here, and that is not an omission. Tracking is a LAYOUT property: a
    // value rewritten every frame re-lays the line every frame, so the words after the current one
    // slide and a two-line caption can re-wrap mid-word. `transform` is the only size channel that
    // cannot move its neighbours. The .ku margin in scene.css buys back the settled 4%.
    return active
      ? { color: 'var(--text)', transform: `scale(${(1.04 + 0.18 * back).toFixed(3)})` }
      : { color: p > 0 ? 'var(--text)' : 'color-mix(in srgb, var(--text) 76%, var(--bg))',
          transform: 'scale(1)' };
  },

  // a rule under the ink, drawn left to right as the word is spoken and LEFT there. The quiet
  // sibling of `highlight`: the same read trail, at a quarter of the visual weight, and it never
  // sits between the glyphs and the plate so it cannot cost the text any contrast at all.
  // Painted at the bottom of the inline box with no padding, so the line box height is untouched.
  underlineDraw: (u, active) => {
    const p = clamp01(u);
    const rule = active ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 60%, var(--bg))';
    return {
      color: p > 0 ? 'var(--text)' : 'color-mix(in srgb, var(--text) 76%, var(--bg))',
      backgroundImage: `linear-gradient(${rule}, ${rule})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '0 100%',
      backgroundSize: `${(p * 100).toFixed(1)}% 4px`,
    };
  },

  // depth: a teleprompter. Three ink levels and three scales, monotone in the order the words are
  // spoken, so the eye is told where it is without any colour changing hue. Every scale is <= 1, so
  // this style can never grow the band. The spoken mix is 88%, a step above the 76% upcoming one:
  // both are legible on the plate, and the ORDER of the two is what carries the state.
  readerFocus: (u, active) => active
    ? { color: 'var(--text)', transform: 'scale(1)' }
    : clamp01(u) > 0
      ? { color: 'color-mix(in srgb, var(--text) 88%, var(--bg))', transform: 'scale(0.96)' }
      : { color: 'color-mix(in srgb, var(--text) 76%, var(--bg))', transform: 'scale(0.90)' },
};

export const CAP_STYLE_NAMES = Object.keys(CAP_STYLES);

// CAPTION_BLURBS — one line per style, next to the styles themselves (the `blurb` pattern of
// blocks/catalog.mjs). Consumed by the generated docs table and by any catalog/MCP surface; a key with
// no style, or a style with no key, is a bug the effects catalog reports.
// Each blurb carries the style's own contrast fact, because that is the half an author cannot see in a
// still: every styled line sits on the 78% var(--bg) scrim plate and dims by colour mix, never opacity.
export const CAPTION_BLURBS = {
  highlight: 'marker highlight sweep',
  pillKaraoke: 'a pill fill sweeps left to right through the line, the accent mixed 42% into the bg so the bg stays dominant',
  weightShift: 'the spoken word goes full ink at weight 800 with a small rise-and-settle bump, the rest hold weight 600 at a 76% text-mix',
  clipWipe: 'LINE-level: an accent copy of the line is revealed left to right, the wipe front tracking the spoken word rather than wall-clock time',
  neonEdge: 'the accent lives only in a halo: the spoken word blooms and settles, earlier words keep a quieter glow, upcoming words hold a 76% text-mix with no light at all',
  kineticSlam: 'the word lands at 1.22 with its tracking open and settles cubically to 1, so the travel is all in the first third of its window and the rest holds still',
  underlineDraw: 'a 4px accent rule draws under each word as it is spoken and stays, the quiet sibling of highlight: it sits below the ink, so it costs the text no contrast',
  readerFocus: 'a teleprompter: three ink levels and three scales, upcoming at 76% and 0.90, spoken at 88% and 0.96, the current word full ink at 1',
};
