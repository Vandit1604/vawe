// core/captions.js, caption STYLE kit (wave 1). PURE in t: capWords() turns one caption line
// into absolute per-word windows; CAP_STYLES map per-word progress u∈[0,1] → a style object,
// the same contract as core/type.js PRESETS (and `highlight` literally reuses that preset).
// Degradation is built in: a line with no `words` array gets deterministic per-word windows
// distributed proportionally to word length (longer words hold longer, like speech), so every
// style still reads as intentional karaoke on plain `make captions` output.
import { clamp01 } from '../motion/motion.js';
import { PRESETS, wght } from './type.js';
import { onScreenText } from './on-screen-text.js';
import { withBlurb, blurbsOf, defineRegistry } from '../registry/registry.js';

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

// lineU(t, wins): whole-line progress for clipWipe. Each word contributes its CHARACTER share
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
// CONTRAST DOCTRINE (this repo has shipped sub-4.5:1 dimming before, never again):
//  * inactive ink is a color-mix toward the theme bg, NEVER an opacity drop over unknown video;
//  * styled captions sit on a 78% var(--bg) scrim plate (scene.html CSS), so contrast is computed
//    against a KNOWN backdrop. The 76% / 42% / 28% mixes below are chosen by WCAG arithmetic at
//    the worst-case theme, with headroom; the audit's contrast pass is the enforcement.
// The wght(n) two-channel helper moved to core/type.js, where the axis is also a headline
// preset (`weight`). One fact, one owner: a font axis is a TYPE fact, and captions borrow it.

export const CAP_STYLES = {
  // marker band draws behind the active word; earlier words keep their full band (a read trail).
  // 28% accent: even a near-white accent over the dark plate leaves white text at >= 4.9:1.
  highlight: withBlurb('marker highlight sweep', (u) => PRESETS.highlight(u, { color: 'color-mix(in srgb, var(--accent) 28%, transparent)' })),

  // pill fill sweeps left -> right. 42% accent into var(--bg) keeps the bg dominant, so the
  // theme's own text/bg pair (contract-guaranteed) degrades by well under half.
  pillKaraoke: withBlurb('a pill fill sweeps left to right through the line, the accent mixed 42% into the bg so the bg stays dominant', (u) => {
    const fill = 'color-mix(in srgb, var(--accent) 42%, var(--bg))';
    return {
      backgroundImage: `linear-gradient(${fill}, ${fill})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '0 0',
      backgroundSize: `${(clamp01(u) * 100).toFixed(1)}% 100%`,
    };
  }),

  // active word: full ink, weight 800, a small pure sine bump (rises and settles, symmetric in u).
  // inactive: the mix, never opacity, so it stays legible over the plate. A SPOKEN word is not an
  // upcoming one and this style used to render them identically, which is a karaoke with no memory:
  // it holds its weight at 700 and only dims to 88%, so the line reads as read-behind, live, ahead.
  weightShift: withBlurb('the spoken word RAMPS along the font\'s own wght axis to 800 with a small rise-and-settle bump, the rest hold 600 at a 76% text-mix', (u, active) => active
    ? { ...wght(700 + 100 * Math.sin(Math.PI * clamp01(u))), color: 'var(--text)',
        transform: `scale(${(1 + 0.06 * Math.sin(Math.PI * clamp01(u))).toFixed(3)})` }
    : clamp01(u) > 0
      ? { ...wght(700), color: 'color-mix(in srgb, var(--text) 88%, var(--bg))', transform: 'scale(1)' }
      : { ...wght(600), color: 'color-mix(in srgb, var(--text) 76%, var(--bg))', transform: 'scale(1)' }),

  // clipWipe is LINE-level: applied to the accent overlay copy, driven by lineU(t, wins).
  clipWipe: withBlurb('LINE-level: an accent copy of the line is revealed left to right, the wipe front tracking the spoken word rather than wall-clock time', (p) => ({ clipPath: `inset(0 ${((1 - clamp01(p)) * 100).toFixed(2)}% 0 0)` })),

  // ---- wave 2. Each one occupies a register wave 1 left empty: LIGHT (neonEdge), IMPACT
  // (kineticSlam), a RULE beneath the ink (underlineDraw), DEPTH (readerFocus). None of them touches
  // the ink of the spoken or current word, so the contrast floor of every one is the plate's own
  // text/bg pair; only the upcoming state dims, and it dims by the same colour mix as weightShift.
  // THE BAND: every wave-2 value is bounded to stay inside the `styled` skin's 14px pad
  // (core/safe.js CAPTION_SKINS), so captionBand() still describes the strip these styles paint.

  // light, not ink: the accent lives entirely in a halo. The current word blooms (pure sine, so it
  // rises and settles), a spoken word keeps a quieter settled halo as its read trail, an upcoming
  // word has none. MAX_HALO is half the plate pad, so even the bloom's outer edge stays on the plate.
  neonEdge: withBlurb('the accent lives only in a halo: the spoken word blooms and settles, earlier words keep a quieter glow, upcoming words hold a 76% text-mix with no light at all', (u, active) => {
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
  }),

  // impact: the word lands oversize and settles, tracking collapsing with it. Cubic, so nearly all of
  // the travel is spent in the first third of the word's window and the rest of it holds still.
  // 1.22 is the ceiling: at the skin's 64px that grows the half-height by 7px, inside the 14px pad.
  // It settles to 1.04, NOT to 1: a cubic that lands on the resting size makes the current word and
  // an already-spoken one identical for four fifths of the window, so a still of the line shows two
  // states where there are three. The last 4% is what stays behind to say "here".
  kineticSlam: withBlurb('the word lands at 1.22 with its tracking open and settles cubically to 1, so the travel is all in the first third of its window and the rest holds still', (u, active) => {
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
  }),

  // a rule under the ink, drawn left to right as the word is spoken and LEFT there. The quiet
  // sibling of `highlight`: the same read trail, at a quarter of the visual weight, and it never
  // sits between the glyphs and the plate so it cannot cost the text any contrast at all.
  // Painted at the bottom of the inline box with no padding, so the line box height is untouched.
  underlineDraw: withBlurb('a 4px accent rule draws under each word as it is spoken and stays, the quiet sibling of highlight: it sits below the ink, so it costs the text no contrast', (u, active) => {
    const p = clamp01(u);
    const rule = active ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 60%, var(--bg))';
    return {
      color: p > 0 ? 'var(--text)' : 'color-mix(in srgb, var(--text) 76%, var(--bg))',
      backgroundImage: `linear-gradient(${rule}, ${rule})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '0 100%',
      backgroundSize: `${(p * 100).toFixed(1)}% 4px`,
    };
  }),

  // depth: a teleprompter. Three ink levels and three scales, monotone in the order the words are
  // spoken, so the eye is told where it is without any colour changing hue. Every scale is <= 1, so
  // this style can never grow the band. The spoken mix is 88%, a step above the 76% upcoming one:
  // both are legible on the plate, and the ORDER of the two is what carries the state.
  // ── wave 4: four mechanisms the market ships that this engine had only as TEXT presets ──────────
  // Each one exists in core/type.js and NONE of the four could be called from here, which is worth
  // recording because a survey of this file reported the opposite. `chroma` names literal rgba, so it
  // fails the theme-token rule. `flip` dims by opacity. `wave` LOOPS, so u=0 and u=1 return the same
  // declaration and it has two states where a caption needs three. `decode` returns an inert
  // `__decode` marker and does its work by side effect on a call path captions never used. So these
  // are caption-native rewrites, not wrappers, and each one satisfies the doctrine rather than being
  // exempted from it.

  // The word hinges up from edge-on. An upcoming word is at -90deg, which is INVISIBLE without being
  // dim: it occupies its slot, it costs no contrast, and it is not a faint version of itself. Same
  // argument typeOn makes for visibility:hidden, made with a rotation instead.
  flipUp: withBlurb('the word hinges up from edge-on · an upcoming word sits at -90deg, which is invisible without being dim, so it costs the text no contrast at all', (u, active) => {
    const p = clamp01(u);
    const deg = -90 * (1 - p) ** 2;
    return {
      color: active ? 'var(--text)' : p > 0 ? 'var(--text)' : 'color-mix(in srgb, var(--text) 76%, var(--bg))',
      transform: `perspective(900px) rotateX(${deg.toFixed(1)}deg)`,
    };
  }),

  // TWO GHOSTS CONVERGING, and deliberately not three. The reference mechanism is an RGB split, and
  // red/green/blue are literals: on a themed film they are three colours the brand never chose, and
  // the theme-token rule would have to be waived to write them. A split reads as a split because the
  // copies are OFFSET and converge, not because of which hues they are, so this offsets the accent
  // one way and a muted ink the other and lands them together. Offsets stay under 6px so both ghosts
  // sit inside the plate's 14px pad, the bound neonEdge is held to for the same reason.
  ghostSplit: withBlurb('two offset ghosts converge as the word is spoken, the accent one way and a muted ink the other · a split reads as a split from the OFFSET, not from being red and blue, so it stays on the theme', (u, active) => {
    const p = clamp01(u);
    const d = 5.5 * (1 - p) ** 2;
    return {
      color: active || p > 0 ? 'var(--text)' : 'color-mix(in srgb, var(--text) 76%, var(--bg))',
      textShadow: d > 0.05
        ? `${d.toFixed(2)}px 0 0 var(--accent), ${(-d).toFixed(2)}px 0 0 color-mix(in srgb, var(--text) 55%, var(--bg))`
        : 'none',
    };
  }),

  // One crest per word, ridden as the word is spoken. `wave` in core/type.js is a LOOP with no end,
  // which is why it cannot be a caption: a caption word has a window, and a loop inside a window
  // stops wherever the window stops. A half-sine peaks in the middle of the window and returns, so
  // the motion is bounded by the word rather than cut off by it. The three ink levels carry the
  // read/unread state, because the crest alone returns to zero and would say nothing at u=1.
  waveRide: withBlurb('one crest per word, ridden as it is spoken · a half-sine is bounded by the word window, where a looping wave would simply be cut off by it', (u, active) => {
    const p = clamp01(u);
    return {
      color: active ? 'var(--text)'
        : p > 0 ? 'color-mix(in srgb, var(--text) 88%, var(--bg))'
        : 'color-mix(in srgb, var(--text) 76%, var(--bg))',
      transform: `translateY(${(-14 * Math.sin(Math.PI * p)).toFixed(2)}px)`,
    };
  }),

  // The letters settle out of noise. This is the ONE style that cannot work by returning a value:
  // the scramble rewrites textContent, and the contract is `Object.assign(el.style, …)`. So it gets
  // the same carve-out clipWipe has in formats/scene/scene.js, which calls core/type.js decodeText
  // (pure in u and the unit index, with the final string cached on the element). What this function
  // returns is only the read/unread ink, which is the half a style object CAN say.
  scramble: withBlurb('the letters settle out of noise, left to right · the only style that rewrites the text rather than its style, so it carries the same carve-out clipWipe does', (u, active) => ({
    color: active ? 'var(--accent)'
      : clamp01(u) > 0 ? 'var(--text)'
      : 'color-mix(in srgb, var(--text) 76%, var(--bg))',
  })),

  // ONE WORD ON SCREEN, replaced whole at the next onset. `mode:'one'` above, so this function only
  // ever paints the word being spoken and there is no upcoming or spoken state to dim: the read/
  // unread distinction is carried by PRESENCE, which is why this needs no colour mix at all.
  // The word lands at 1.14 and settles cubically, so nearly all the travel is in the first third.
  // 1.14, not kineticSlam's 1.22: this word is alone on the line and has the whole band to itself,
  // so the overshoot that reads as impact beside its neighbours reads as a wobble on its own.
  wordFlash: withBlurb('ONE word on screen, swapped whole at the next onset, landing at 1.14 and settling cubically · the default of short-form video, and it needs no dimming because the unread words are absent, not faint', (u) => {
    const back = (1 - clamp01(u)) ** 3;
    return { color: 'var(--text)', transform: `scale(${(1 + 0.14 * back).toFixed(3)})` };
  }),

  // The same one-word swap, arriving from below instead of from scale. Pairs with a film that is
  // already moving vertically, where a scale pop would be a second unrelated motion.
  // `translateY` only: a transform cannot move its neighbours, and in `mode:'one'` it has none.
  wordSlide: withBlurb('the same one-word swap arriving from 26px below instead of from scale · for a film already moving vertically, where a second unrelated motion would fight it', (u) => {
    const back = (1 - clamp01(u)) ** 3;
    return { color: 'var(--text)', transform: `translateY(${(back * 26).toFixed(1)}px)` };
  }),

  // A TYPEWRITER, per character (`unit:'char'` above). A character that has not arrived is
  // `visibility:hidden`, NOT dimmed: it occupies its space so the line never reflows mid-word, and
  // it is absent rather than faint, so the contrast doctrine has no subject to be violated on.
  // The caret is an INSET box-shadow, not a border: a border would widen the character and re-lay
  // the line on every frame, which is the same layout trap kineticSlam's comment records for
  // letter-spacing. It also gives this style its third distinct state honestly, rather than by
  // exemption: hidden, then typing with the caret, then typed.
  typeOn: withBlurb('a typewriter, per CHARACTER: an unarrived letter holds its space at visibility:hidden so the line never reflows, and the current one carries an inset accent caret', (u, active) => ({
    color: 'var(--text)',
    visibility: clamp01(u) > 0 ? 'visible' : 'hidden',
    boxShadow: active ? 'inset -2px 0 0 0 var(--accent)' : 'none',
  })),

  readerFocus: withBlurb('a teleprompter: three ink levels and three scales, upcoming at 76% and 0.90, spoken at 88% and 0.96, the current word full ink at 1', (u, active) => active
    ? { color: 'var(--text)', transform: 'scale(1)' }
    : clamp01(u) > 0
      ? { color: 'color-mix(in srgb, var(--text) 88%, var(--bg))', transform: 'scale(0.96)' }
      : { color: 'color-mix(in srgb, var(--text) 76%, var(--bg))', transform: 'scale(0.90)' }),

  // ── wave 5: three registers the market ships and this engine had no way to say ────────────────
  // Chosen against the 15 above by REGISTER, not by name: a style earns a slot only if an author
  // would reach for it INSTEAD of one we ship. The surface the accent is painted ON (glyph, not
  // plate), the FOCUS channel, and a per-CHARACTER cascade that is not a typewriter. Everything
  // else on the reference list turned out to be one of ours under a different name, or a look the
  // contrast doctrine or the 14px plate pad cannot hold, see the rejected list in the report.

  // KARAOKE THE WAY KARAOKE ACTUALLY LOOKS: the fill runs through the GLYPHS, not behind them.
  // `highlight` and `pillKaraoke` both paint a shape under the ink; nothing here recoloured the ink
  // itself, which is the one form every viewer already recognises. background-clip:text with a
  // transparent color, so the gradient IS the letters.
  // The body of the word is never the accent: the filled part is full `--text` and the unfilled part
  // the same 76% mix every other style dims to, so this style's contrast is the plate's own text/bg
  // pair. The accent is a 7%-wide sliver at the fill FRONT, which is where the eye already is and
  // small enough that no theme's accent has to carry a contrast claim.
  inkFill: withBlurb('the karaoke fill runs through the GLYPHS rather than behind them, full ink trailing a narrow accent front · the word body is never the accent, so its contrast is that of the plate itself', (u) => {
    const p = clamp01(u) * 100;
    const front = Math.max(0, p - 7);
    const ink = 'var(--text)';
    const dim = 'color-mix(in srgb, var(--text) 76%, var(--bg))';
    return {
      color: 'transparent',
      backgroundImage: `linear-gradient(90deg, ${ink} 0 ${front.toFixed(1)}%, var(--accent) ${front.toFixed(1)}% ${p.toFixed(1)}%, ${dim} ${p.toFixed(1)}% 100%)`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      backgroundPosition: '0 0',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
    };
  }),

  // A RACK FOCUS. The engine had no style that used the focus channel at all: every one of the 15
  // says its state with ink, light, size, position or presence. An upcoming word is OUT OF FOCUS
  // rather than faint, which is the same argument flipUp and typeOn make with rotation and with
  // visibility. The state is carried by something that is not contrast.
  // Blur is bounded at 2.8px so the spread stays well inside the plate's 14px pad, and it is not a
  // contrast dodge: the ink still dims by the same colour mix, the blur is the second channel on top.
  focusPull: withBlurb('a rack focus: an upcoming word sits 2.8px out of focus and resolves sharp as it is spoken, a spoken one settling back to a soft 1px · the one style that says its state with focus rather than with ink, light or size', (u, active) => {
    const p = clamp01(u);
    const blur = active ? 2.8 * (1 - p) ** 2 : p > 0 ? 1 : 2.8;
    return {
      color: active ? 'var(--text)'
        : p > 0 ? 'color-mix(in srgb, var(--text) 88%, var(--bg))'
        : 'color-mix(in srgb, var(--text) 76%, var(--bg))',
      filter: `blur(${blur.toFixed(2)}px)`,
    };
  }),

  // The letters of the WHOLE LINE rise into place, one per character, in the order they are spoken
  // (`unit:'char'` below). The second char-level style, and deliberately not a second typewriter:
  // `typeOn` cuts each letter on hard from hidden, so the line assembles out of nothing; here the
  // whole line is present from the first frame and each letter travels the last 12px into its slot.
  // 12px, not wordSlide's 26: that style owns the plate alone in `mode:'one'`, this one is inside a
  // full line and the travel has to stay within the plate's 14px pad.
  // `translateY` only, for the reason kineticSlam records about tracking: a transform cannot move
  // its neighbours, so a per-character offset can never re-wrap the line mid-word.
  letterRise: withBlurb('the letters of the whole line rise the last 12px into their slots as they are spoken, one per CHARACTER · not a second typewriter: the line is present from the first frame, where typeOn assembles it out of nothing', (u, active) => {
    const p = clamp01(u);
    return {
      color: active ? 'var(--text)'
        : p > 0 ? 'var(--text)'
        : 'color-mix(in srgb, var(--text) 76%, var(--bg))',
      transform: `translateY(${(12 * (1 - p) ** 3).toFixed(2)}px)`,
    };
  }),

  // THE AXIS AS THE MOTION, not as a state. `weightShift` uses weight to say WHICH word is being
  // spoken and swings 200 units to say it; this rides the whole axis, 250 to 900 and back, so the
  // line has a crest of weight travelling through it. That is the one thing a static font cannot
  // fake at all, and the closest thing this engine has to what current practice calls kinetic
  // typography: a continuously interpolated outline rather than a slide or a fade.
  // The read state is carried by INK, deliberately, because the crest returns to where it started
  // and would say nothing at u=1. The same argument waveRide makes about its half-sine.
  // A caveat an author should know before choosing it: weight is a LAYOUT property whichever channel
  // writes it, so the words after the current one shift as the crest passes. On a centred caption
  // plate that reads as the line breathing. It is the cost of the register, not a bug, and it is why
  // this is one style rather than a modifier available to all eighteen.
  weightWave: withBlurb('a crest of WEIGHT travels the line, each word riding the font\'s wght axis from 500 to 900 and back · the one register a static font cannot fake, and the line breathes as the crest passes', (u, active) => {
    const p = clamp01(u);
    return {
      // The crest FLOOR is the spoken weight, not the upcoming one. Riding 250 to 900 looked better
      // in the abstract and was wrong on the frame: sin() returns to 0 at both ends of a word window,
      // so the word being spoken went LIGHTER than the words already read for a frame either side of
      // every onset, and the line's read order inverted at exactly the moment it should be clearest.
      // 500 to 900 keeps active >= spoken > upcoming at every u and still swings 400 units.
      ...wght(active ? 500 + 400 * Math.sin(Math.PI * p) : p > 0 ? 500 : 250),
      color: active ? 'var(--text)'
        : p > 0 ? 'color-mix(in srgb, var(--text) 88%, var(--bg))'
        : 'color-mix(in srgb, var(--text) 76%, var(--bg))',
    };
  }),
};


// ── STYLE SHAPE: the two things a style cannot say by returning a style object ────────────────────
// Every style above is a function of (u, active) applied to one word span, and that contract can
// express any TREATMENT. It cannot express a different set of units or a different set of words on
// screen, because both are decided before the function is ever called. Two mechanisms the whole
// short-form industry ships needed exactly that, and are why this map exists:
//
//   mode: 'one'   render ONLY the word being spoken, replaced whole at the next word's onset. The
//                 other words are not dimmed, they are ABSENT. This is the single most-used caption
//                 style in short-form video and the engine had no way to say it.
//   unit: 'char'  split the line into characters rather than words, each with its own window.
//
// A style with no entry here is `{unit:'word', mode:'line'}`, which is what all eight of the
// originals are, so nothing about them changes. This is a SEPARATE map rather than a richer value
// in CAP_STYLES on purpose: `CAP_STYLES[name](u, active)` stays callable, so every assertion in
// lib-test that walks the registry keeps working unchanged.
export const CAP_STYLE_SHAPE = {
  wordFlash: { mode: 'one' },
  wordSlide: { mode: 'one' },
  typeOn: { unit: 'char' },
  letterRise: { unit: 'char' },
};
export const capShape = (name) => CAP_STYLE_SHAPE[name] || { unit: 'word', mode: 'line' };

// capUnitWins(cap, unit): the windows the renderer styles, one per unit.
// 'char' subdivides each WORD window across that word's characters, which keeps speech pacing: a
// long word still holds longer, and its letters land inside its own window rather than at a flat
// rate across the line. The order matches core/type.js splitText('char') exactly, which emits one
// unit per non-space character, word by word, so the two lists align index for index.
export function capUnitWins(cap, unit = 'word') {
  const wins = capWords(cap);
  if (unit !== 'char') return wins;
  const out = [];
  for (const w of wins) {
    const chars = [...w.w];
    const step = (w.t1 - w.t0) / Math.max(1, chars.length);
    chars.forEach((c, i) => out.push({
      w: c, t0: +(w.t0 + i * step).toFixed(3), t1: +(w.t0 + (i + 1) * step).toFixed(3),
    }));
  }
  return out;
}

// CAPTION_BLURBS: derived from the styles, which each carry their own blurb (core/registry.js).
// Consumed by the generated docs table and by any catalog/MCP surface. There is no second list to keep
// in step: a style with no blurb throws here, naming itself.
// Each blurb carries the style's own contrast fact, because that is the half an author cannot see in a
// still: every styled line sits on the 78% var(--bg) scrim plate and dims by colour mix, never opacity.
export const CAPTION_BLURBS = blurbsOf('caption style', CAP_STYLES);

// The registry, and with it the catalogue section that used to be hand-listed in
// scripts/site/effects-catalog.mjs, with its usage snippet keyed by a slug of the section TITLE over in
// scripts/site/effects-json.mjs. It also gives the two hand-rolled refusals below one owner: formats/
// scene/scene.js and scripts/media/vo-captions.mjs each wrote out `unknown style, known: <join>` over
// this same list, so a caption style could be rejected in two different sentences, and neither of them
// could say that the name the author typed is really a kinetic preset or a look.
//
// THE INTRO SAID `captions:{ style:"<name>" }`, WHICH THE ENGINE HAS NEVER ACCEPTED. `captionStyle` is
// a top-level string and `captions` is an array of {t0,t1,text}; schema-drift checks `captionStyle`
// against these names. The usage snippet was corrected once already (docs/MISTAKES.md, the note in
// effects-json.mjs) and the prose above it was left saying the wrong thing, because prose about code
// goes stale in silence. Moving it to the definition site is what stops that happening twice.
export const CAP_STYLE_REGISTRY = defineRegistry('caption style', CAP_STYLES, { slot: 'captionStyle', blurbs: CAPTION_BLURBS,
  catalog: {
    title: 'Caption styles',
    tag: 'captions',
    intro: '`captionStyle:"<name>"` alongside a `captions:[{t0,t1,text}]` array. How burnt-in captions present. Sound and captions: `docs/CRAFT/SOUND.md`.',
    usage: (n, { j }) => j({
      captionStyle: n,
      captions: [{ t0: 0.3, t1: 4.6, text: 'Ship the payoff last', pin: 'center', size: 96 }],
    }),
    // CAPTIONS PLAY HERE, and the reason they once did not is a claim this file contradicts in its own
    // opening: a line with NO `words` array gets deterministic per-word windows distributed by word
    // length, so every style still reads as intentional karaoke with no audio at all. The caption sits
    // at the CENTRE rather than in the bottom band, the only honest way to make it the subject of a
    // 640x360 swatch, and itself a demonstration of the placement grammar of docs/MISTAKES.md #422.
    preview: (n, { base, OVER }) => base({
      captionStyle: n,
      captions: [{ t0: 0.3, t1: 5.4, text: 'Ship the payoff last', pin: 'center', size: 96 }],
      layers: [{ ...OVER, text: n, size: 44, y: 940, start: 0, duration: 6 }],
    }),
  },
});

export const CAP_STYLE_NAMES = CAP_STYLE_REGISTRY.names;
