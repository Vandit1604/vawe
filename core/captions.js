// core/captions.js — caption STYLE kit (wave 1). PURE in t: capWords() turns one caption line
// into absolute per-word windows; CAP_STYLES map per-word progress u∈[0,1] → a style object,
// the same contract as core/type.js PRESETS (and `highlight` literally reuses that preset).
// Degradation is built in: a line with no `words` array gets deterministic per-word windows
// distributed proportionally to word length (longer words hold longer, like speech), so every
// style still reads as intentional karaoke on plain `make captions` output.
import { clamp01 } from './motion.js';
import { PRESETS } from './type.js';

// capWords(cap) → [{ w, t0, t1 }] with ABSOLUTE windows covering [cap.t0, cap.t1].
// Author-supplied cap.words ([{t0,t1}], aligned to the markup-stripped word list) wins;
// otherwise distribute (t1 - t0 - TAIL) ∝ word length. Deterministic either way.
const TAIL = 0.12; // the last word finishes its fill before the 0.14s line fade-out starts
export function capWords(cap) {
  const words = String(cap.text).replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean);
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
  // inactive: weight 600 + 76% text-mix — the mix, not opacity, so it stays legible over the plate.
  weightShift: (u, active) => active
    ? { fontWeight: '800', color: 'var(--text)',
        transform: `scale(${(1 + 0.06 * Math.sin(Math.PI * clamp01(u))).toFixed(3)})` }
    : { fontWeight: '600', color: 'color-mix(in srgb, var(--text) 76%, var(--bg))', transform: 'scale(1)' },

  // clipWipe is LINE-level: applied to the accent overlay copy, driven by lineU(t, wins).
  clipWipe: (p) => ({ clipPath: `inset(0 ${((1 - clamp01(p)) * 100).toFixed(2)}% 0 0)` }),
};

export const CAP_STYLE_NAMES = Object.keys(CAP_STYLES);
