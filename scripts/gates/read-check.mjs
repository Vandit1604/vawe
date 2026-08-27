// scripts/gates/read-check.mjs: CAN A VIEWER READ IT, IN THE SECONDS IT IS THERE?
//
// Every other gate that touches on-screen words grades the WORDS. `copy-check` asks whether a line is
// well written and flags one over 14 words as too long "to read in a beat", but it never looks at the
// beat. `validate` refuses an em-dash. `beat-check` refuses an empty frame. So a nine-word headline
// alive for 0.6s walks the whole ladder clean, and the only thing that ever noticed was an eye.
// This gate joins the copy to the clock: for every line of prose, how long is it STILL, and is that
// long enough to read it.
//
//   node scripts/gates/read-check.mjs <scene.json> [--strict]
//
// ── THE CONSTANTS, EVERY ONE WITH ITS SOURCE AND ITS 30fps CONVERSION ──────────────────────────────
// We render at 30fps. Subtitling publishes its numbers in 24fps frames, so each one is converted here
// and the conversion is stated. A rule under 33ms is below our resolution and is not a rule here.
//
//   HOLD_PER_WORD  0.6s per word. "Read it twice" at a slow reader's 200 wpm:
//                  (words / 200) * 60 * 2 = words * 0.6. A six-word hook holds 3.6s, 108 frames.
//                  https://www.ssw.com.au/rules/post-production-do-you-give-enough-time-to-read-texts-in-your-videos
//   CPS_WALL       20 characters per second, Netflix's English adult ceiling. Reported beside every
//                  hold so the author sees which of the two bit. Professional subtitling authors to
//                  12-15 cps and treats 20 as the wall, so this gate never asks for 20; it names it.
//                  https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements
//   MIN_LIFE       20 frames at 24fps = 0.8333s = 25 frames at 30fps. Netflix's floor on one event.
//                  https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines
//   MAX_HOLD       5s. THE TWO SOURCES DISAGREE: Netflix caps an event at 7s, the BBC's band is 2-5s
//                  (both via https://www.samtext.com/services/translation-agency/audiovisual-text/subtitling-guidelines/).
//                  We take the BBC number, and not by averaging. Netflix's 7s is sized for a feature; a
//                  30-second film that parks one card for 7s has spent a quarter of itself on one line.
//   GAP_JOIN       Netflix joins two text events with EXACTLY 2 frames. 2 frames at 24fps is 0.0833s,
//   GAP_MIN        which is 2.5 frames at 30fps, so the honest conversion is 3 frames = 0.1s. Anything
//                  longer than that and shorter than half a second (15 frames at 30fps) reads as a
//                  flicker and must be closed to the join or opened to the half second. Same Netflix
//                  timing page. This is the flash-frame class made exact, and it is checkable from the
//                  JSON alone with no render.
//   CUT_SNAP       0.5s. Text that would start within half a second after a cut starts ON the cut
//                  frame instead. Same Netflix timing page.
//
// ── WHAT COUNTS AS PROSE, WHICH IS THE WHOLE DESIGN ────────────────────────────────────────────────
// NOT ALL TEXT IS READ. A number counting up, a chart axis label, a caption under a mark, a chip, a
// watermark: these are LOOKED AT. A gate that treats every string as a sentence fires on hundreds of
// layers and gets waived by everybody, which is worse than no gate. So the hold rules see only PROSE:
//
//   a `text` layer (or a typeless one, which is a text layer)  ·  4 or more words  ·  size >= 28
//
//   count      excluded outright. A counter's job is the arc of the number, not the reading of it, and
//              its final value is on screen for a beat after it lands.
//   1-3 words  excluded. "1,200 teams", "Ship it", a chip, an eyebrow, an axis tick: apprehended at a
//              glance, not read left to right. word*0.6 would demand 1.8s of a two-word label.
//   size < 28  excluded. A caption, a credit, a legend, a footnote. Small type is reference material
//              the eye returns to, not a line the film asks you to read on the way past.
//   html       excluded. Its words are markup, and nothing here can tell a heading from a tooltip.
//
// The FLASH rules (min life, gap, cut snap) are wider on purpose: they see every text or count layer
// with any words at all, because a label that blinks for four frames is a defect whatever it says.
//
// `line-length` STAYS IN copy-check. Netflix caps a line at 42 characters; copy-check already fails a
// headline over 14 words for the same defect with a stricter number. Two gates naming one flaw is the
// drift this repo keeps paying for, so this one does not restate it.
//
// ── THE HOLD IS THE STILL PART ─────────────────────────────────────────────────────────────────────
// The read-twice clock starts when the last character SETTLES, not when the entrance begins: movement
// belongs to the entrance and the exit, and words are not readable while they assemble. That split is
// an INFERENCE, not a published rule, and it is flagged as one in the research. `settleWindow` in
// core/safe.js already owns "when is this layer at rest" for the audit, so this gate asks it rather
// than deriving a second answer. The engine-corrected duration comes from sceneTiming, because
// scene.js REWRITES a non-last-beat layer's window and a gate reading the raw field sees a film that
// does not exist.
//
// ── FOUR EXEMPTIONS, EVERY ONE PUT THERE BY A REAL FALSE POSITIVE ─────────────────────────────────
// Each of these was firing on the library before it was written, and each was checked by eye first.
//
//   a gap holding a CUT is not a flicker, it is the transition. brew-launch leaves a 9-frame hole at
//   13.95s across its `punch` at 14.1s, which is Netflix's own neighbouring rule (end before the cut,
//   resume on it) producing a hole exactly the width of the cut window. 47 findings, gone.
//
//   a word swapping IN A FIXED BOX is one element, not N events. Same size, same x/y, taking over
//   within half a second: the eye tracks the slot and reads the word once. _catalog-2 cycles a colour
//   through twenty 0.48s layers on one mark. CLAUDE.md's launch rule 5 asks for this idiom by name.
//   25 findings, gone.
//
//   lag after a cut is measured from the END of the cut window, not from the cut frame. Nothing is
//   read while the transition plays. Measured from the frame, motion-reel's eyebrow arriving three
//   frames after its cut was called "lagging its own transition". 40 findings, gone.
//
//   `text-overstays` needs `hold > need` as well as `hold > MAX_HOLD`, or the two published rules
//   contradict each other past 8 words: a 9-word line needs 5.4s to be read twice and breaks the 5s
//   ceiling the moment it gets it. That contradiction is Netflix's 42-character cap arriving as a word
//   count. The answer is to cut the line, so the gate only fires on time the reading did not ask for.
//
// ── TIER: REPORTS. What would have to be true to promote it ────────────────────────────────────────
// Nothing here blocks. Measured over the 135 gate-visible scenes this checkout holds, on the day it
// was written:
//
//   unreadable-hold   271 findings   83 scenes   61%
//   flicker-gap       115 findings   45 scenes   33%
//   text-overstays     39 findings   16 scenes   12%
//   text-flashes       28 findings   11 scenes    8%
//   text-off-the-cut    9 findings    7 scenes    5%
//   clean 41 · no prose to grade 46
//
// Four of the five fit. `unreadable-hold` does not, and the shape of the miss is worth stating rather
// than hiding: the median failing line holds 0.58 of what read-twice asks. The library is not wild, it
// is authored to read the words ONCE. So the rule is not measuring the wrong thing; it is asking for
// an ambition this library has never had, and CLAUDE.md measures what happens when a rule like that
// gets teeth (116 of 141, and reflex waivers). Promote to BLOCKS when fewer than a fifth of the
// gate-visible scenes carry an `unreadable-hold` finding, the same written condition, not a wish,
// that the storyboard step uses. Until then `TASTE=1` gives it teeth for one run.
import fs from 'node:fs';
import { onScreenText } from '../lib/text.mjs';
import { sceneTiming, num, spanOf } from './scene-timing.mjs';
import { settleWindow } from '../../core/safe.js';
import { BASE_ENTER, BASE_EXIT } from '../../core/clips.js';

export const FPS = 30;
export const HOLD_PER_WORD = 0.6;
export const CPS_WALL = 20;
export const MIN_LIFE = 25 / FPS;        // 0.8333s
export const MAX_HOLD = 5;
export const GAP_JOIN = 3 / FPS;         // 0.1s
export const GAP_MIN = 15 / FPS;         // 0.5s
export const CUT_SNAP = 0.5;
export const PROSE_WORDS = 4;
export const PROSE_SIZE = 28;

const f = (s) => `${s.toFixed(2)}s (${Math.round(s * FPS)}f)`;
const clip = (s, n = 40) => (s.length > n ? `${s.slice(0, n)}…` : s);
const wordsOf = (s) => s.trim().split(/\s+/).filter(Boolean);

/**
 * readFindings(scene) → [{ code, at, msg }] sorted by time then code. Pure: same JSON in, same list out.
 * Exported so lib-test can drive it without a file.
 */
export function readFindings(scene) {
  const T = sceneTiming(scene);
  const events = [];

  // Walk the tree once. A child's `start` is on the same clock as its parent's, and the parent's
  // engine-corrected window is the outer bound, so a child is clipped to it rather than trusted alone.
  const walk = (list, bound, path) => {
    for (const [i, L] of (Array.isArray(list) ? list : []).entries()) {
      if (!L || typeof L !== 'object') continue;
      const id = path ? `${path}.${i}` : `${i}`;
      const [a0, b0] = spanOf(L);
      const outer = bound ?? [a0, T.unitEnd(L) ?? b0];
      const a = Math.max(a0, outer[0]), b = Math.min(b0, outer[1]);
      const txt = (L.type === 'text' || L.type === 'count' || L.type == null) ? onScreenText(L.text).trim() : '';
      if (txt && b > a) events.push({ L, id, txt, a, b, words: wordsOf(txt), size: num(L.size, 96) });
      if (Array.isArray(L.children)) walk(L.children, [a, b], id);
    }
  };
  walk(T.layers, null, '');

  // A WORD SWAPPING IN A FIXED BOX IS ONE ELEMENT, NOT N EVENTS. CLAUDE.md's launch rule 5 asks for
  // exactly this idiom, and _catalog-2 runs it hardest: twenty layers, same string, same x/y, 0.48s
  // each, cycling a colour. The eye tracks the SLOT and reads the word once; Netflix's floor is about
  // one subtitle replacing another over moving picture, which is a different thing. So a short event is
  // exempt when another text event stands on its mark and takes over within half a second.
  const inASlot = (e) => events.some((o) => o !== e && o.size === e.size
    && num(o.L.x, null) === num(e.L.x, null) && num(o.L.y, null) === num(e.L.y, null)
    && num(o.L.x, null) !== null && Math.abs(o.a - e.b) < GAP_MIN);

  const isProse = (e) => (e.L.type === 'text' || e.L.type == null)
    && e.words.length >= PROSE_WORDS && e.size >= PROSE_SIZE;

  const out = [];
  const say = (code, at, msg) => out.push({ code, at, msg });

  for (const e of events) {
    const label = `layer #${e.id} "${clip(e.txt)}"`;
    const life = e.b - e.a;

    // ── the flash floor: every text event, prose or label ──
    if (life < MIN_LIFE && !inASlot(e)) {
      say('text-flashes', e.a, `${label} lives ${f(life)} from ${e.a.toFixed(2)}s. The floor on one text `
        + `event is ${f(MIN_LIFE)} (Netflix: 20 frames at 24fps). Below it the words register as a blink, `
        + `not as a line. Give it "duration": ${(e.a + MIN_LIFE > T.duration ? MIN_LIFE : Math.max(MIN_LIFE, life)).toFixed(2)} or longer, or drop the layer.`);
    }

    if (!isProse(e)) continue;

    // ── the read-twice hold, measured on the STILL part only ──
    // settleWindow owns the SHAPE of the rule (split enters instantly, a moving `out` eats the tail,
    // ARRIVED_PAD). What it does not own is the DEFAULT ramp for a scene read off disk: its 0.45/0.4
    // are audit.mjs's fallbacks for an unset DOM attribute, and scene.js:485 always sets that attribute
    // to BASE_ENTER/BASE_EXIT. Supplying the engine's own numbers keeps one copy of the logic and
    // stops this gate quoting a ramp the render never spends. A theme's `durationScale` can stretch
    // both, and this gate does not read the theme; that only ever makes the hold look LONGER than it
    // is, so it can delete a finding and never invent one.
    const cut = e.L.cut ? { enterDur: 0, exitDur: 0 } : {};   // the cut IS the entrance (scene.js:485,489)
    const w = settleWindow({
      enterDur: BASE_ENTER, exitDur: BASE_EXIT, ...e.L, ...cut,
      start: e.a, duration: e.b - e.a,
    });
    const hold = w ? Math.min(w.t1, e.b) - w.t0 : 0;
    const need = e.words.length * HOLD_PER_WORD;
    const cps = hold > 0 ? e.txt.replace(/\s+/g, ' ').length / hold : Infinity;
    const fit = Math.max(1, Math.floor(hold / HOLD_PER_WORD));
    if (hold < need) {
      say('unreadable-hold', e.a, `${label} is ${e.words.length} words and holds STILL for ${f(hold)}. `
        + `Reading it twice at 200 wpm needs ${f(need)} (words x 0.6s). It reads at `
        + `${cps === Infinity ? 'infinite' : cps.toFixed(0)} characters per second against a ${CPS_WALL} cps wall. `
        + `Add ${f(need - hold)} to its "duration", or cut it to ${fit} word${fit === 1 ? '' : 's'}.`);
    } else if (hold > MAX_HOLD && hold > need) {
      // `hold > need` as well, or the two published rules contradict each other: a 9-word line NEEDS
      // 5.4s to be read twice and is over the 5s ceiling the moment it gets it. That contradiction is
      // real and it is Netflix's 42-character cap arriving as a word count, past 8 words a line cannot
      // satisfy both, and the answer is to cut the line, not to argue with the clock. So this fires
      // only on time the reading did not ask for.
      say('text-overstays', e.a, `${label} holds still for ${f(hold)}. The ceiling on one text event is `
        + `${MAX_HOLD}s (BBC subtitling; Netflix says 7s and we take the tighter one, because 7s of one `
        + `card is a quarter of a 30-second film). Cut the "duration" to about ${f(Math.max(need, MAX_HOLD))}, `
        + `or give the beat a second thing to look at.`);
    }
  }

  // ── the gap rule, measured on the TEXT TRACK as a whole ──
  // Netflix's rule is about consecutive events, which for us means a hole where NO words are on screen.
  // Merging first is what keeps this from firing on every staggered line inside one beat.
  const spans = events.map((e) => [e.a, e.b]).sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const [a, b] of spans) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b); else merged.push([a, b]);
  }
  for (let i = 1; i < merged.length; i++) {
    const gap = merged[i][0] - merged[i - 1][1];
    // A GAP THAT HOLDS A CUT IS NOT A FLICKER, IT IS THE TRANSITION. Netflix's own neighbouring rule
    // says text ends before a cut and resumes on it, which produces a hole exactly the width of the cut
    // window. brew-launch's 9-frame hole at 13.95s straddles its `punch` at 14.1s and is correct craft;
    // reporting it would teach the author to distrust the rule on the three real holes in the same film.
    const spansACut = T.cutTimes.some((c) => c >= merged[i - 1][1] && c <= merged[i][0]);
    if (!spansACut && gap > GAP_JOIN && gap < GAP_MIN) {
      say('flicker-gap', merged[i - 1][1], `the frame carries no words for ${f(gap)}, from `
        + `${merged[i - 1][1].toFixed(2)}s to ${merged[i][0].toFixed(2)}s. A gap in that band reads as a `
        + `flicker: too long to be a join, too short to be a pause. Close it to ${f(GAP_JOIN)} or open it `
        + `to ${f(GAP_MIN)} (Netflix: exactly 2 frames, or at least half a second).`);
    }
  }

  // ── text that lands just after a cut instead of on it ──
  // ONCE PER CUT, on the EARLIEST line after it. A cascade is not a lag: tpot-launch stacks six labels
  // at 0.35s to 0.49s past one cut, which is a deliberate stagger, and firing per layer turned one
  // opinion about one beat into six findings that read as six defects. The question is only whether the
  // beat's FIRST words are late.
  for (const c of T.cutTimes) {
    const first = events.filter((e) => e.a > c).sort((x, y) => x.a - y.a || (x.id < y.id ? -1 : 1))[0];
    if (!first) continue;
    // MEASURE THE LAG FROM THE END OF THE CUT, NOT FROM THE CUT FRAME. A cut here is not an instant:
    // it carries its own window (0.4s by default) and nothing is being read while it plays. Measured
    // from the frame, motion-reel's eyebrow arriving 3 frames after its cut was reported as "lagging
    // its own transition", which no viewer could perceive and every author would waive. Measured from
    // the end of the window the rule says something real: the transition has finished, the frame has
    // settled, and the beat still has no words in it.
    const settled = c + T.cutDurAt(c);
    const lag = first.a - settled;
    if (lag > GAP_JOIN && first.a - c <= CUT_SNAP + T.cutDurAt(c)) {
      say('text-off-the-cut', first.a, `the first words after the cut at ${c.toFixed(2)}s are layer `
        + `#${first.id} "${clip(first.txt)}", arriving ${f(lag)} after the ${f(T.cutDurAt(c))} cut window has `
        + `closed. The transition is over and the beat still has no words in it. Text due inside half a `
        + `second of a cut belongs ON the cut frame. `
        + `Set "start": ${c.toFixed(2)}.`);
    }
  }

  // deterministic: time, then code, then message.
  return out.sort((x, y) => x.at - y.at || (x.code < y.code ? -1 : x.code > y.code ? 1 : 0)
    || (x.msg < y.msg ? -1 : x.msg > y.msg ? 1 : 0));
}

/** proseCount(scene) → how many lines this gate treated as prose. Reported so a silent run is not read
 *  as a clean bill: a film of chips and counters has nothing for the hold rules to grade. */
export function proseCount(scene) {
  const T = sceneTiming(scene);
  let n = 0, all = 0;
  const walk = (list) => { for (const L of Array.isArray(list) ? list : []) {
    if (!L || typeof L !== 'object') continue;
    const txt = (L.type === 'text' || L.type === 'count' || L.type == null) ? onScreenText(L.text).trim() : '';
    if (txt) { all++; if ((L.type === 'text' || L.type == null) && wordsOf(txt).length >= PROSE_WORDS && num(L.size, 96) >= PROSE_SIZE) n++; }
    if (Array.isArray(L.children)) walk(L.children);
  } };
  walk(T.layers);
  return { prose: n, text: all };
}

// ── CLI ──
if (process.argv[1] && process.argv[1].endsWith('read-check.mjs')) {
  const file = process.argv[2];
  const strict = process.argv.includes('--strict');
  if (!file || !fs.existsSync(file)) {
    console.error('usage: node scripts/gates/read-check.mjs <scene.json> [--strict]');
    process.exit(2);
  }
  const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { prose, text } = proseCount(scene);
  const findings = readFindings(scene);
  console.log(`\n  read gate · ${file}  (${text} text layer(s), ${prose} graded as prose)`);
  if (!findings.length) {
    console.log(prose
      ? `  ✓ every line holds still long enough to be read twice, and no text flickers.\n`
      : `  ○ NO PROSE in this scene: ${text} text layer(s), none of them 4+ words at 28px or more.\n`
        + `    The hold rules had nothing to grade. That is an empty subject, not a clean bill.\n`);
    process.exit(0);
  }
  console.log(`  ${findings.length} reading problem(s):`);
  for (const x of findings) console.log(`    ~ [${x.code}] ${x.msg}`);
  console.log(strict
    ? `\n  ✗ read gate (strict): the viewer cannot read what the film shows.\n`
    : `\n  a line nobody can read is a line nobody read. (Block with --strict / TASTE=1.)\n`);
  process.exit(strict ? 1 : 0);
}
