// Which ease for which job, with its time and what to avoid: every number read from core/motion. The /easing page
// (scripts/site/easing.mjs), the craft doc (taste/craft/motion-craft.md, written by harness/dev/taste-build.mjs) and the
// named-eases advice in bin/vawe dev all read this one table.
import { easeFn, UI, BANDS } from './presets.js';
import LIMITS from './taste-limits.js';

const DENSE = 4000;
export const FPS = 30;
export const sec = (n) => `${+n.toFixed(2)}`;
export const span = (lo, hi) => `${sec(lo)} to ${sec(hi)} s`;
export const firstFrame = (name, d) => Math.round(easeFn(name)(1 / FPS / d) * 100);
export const timeTo = (name, level) => {
  const f = easeFn(name);
  for (let i = 0; i <= DENSE; i++) if (f(i / DENSE) >= level) return i / DENSE;
  return 1;
};
export const lateStart = (name) => Math.round(timeTo(name, 0.05) * 100);
export const EXIT = LIMITS['exits-shorter'];
export const EXIT_EXAMPLE = { entranceS: 0.5, exitMs: Math.round(EXIT.preset_leave_share * 0.5 * 1000) };
export const EXIT_FALLBACK = BANDS.professional.map((s) => EXIT.preset_leave_share * s);
export const GAP = LIMITS.stagger;
const POP = easeFn('pop');
export const popPeakAt = (() => {
  let best = 0, at = 0;
  for (let i = 0; i <= DENSE; i++) if (POP(i / DENSE) > best) { best = POP(i / DENSE); at = i / DENSE; }
  return at;
})();
export const popSettleFrames = (d) => +((1 - popPeakAt) * d * FPS).toFixed(1);

export const JOBS = [
  { id: 'title', job: 'Title or text entrance', ease: 'land', time: span(...BANDS.gravity), avoid: 'pop or any overshoot on text: held text that overshoots reads as shaking.' },
  { id: 'panel', job: 'UI panel or card in', ease: 'land', time: span(UI.panel.fadeMs / 1000, BANDS.professional[1]), avoid: `scale or overshoot on a panel. A copied product panel only fades in ${UI.panel.fadeMs} ms with a ${UI.panel.rise} rise.` },
  { id: 'value', job: 'Value change (number swap)', ease: 'swap', time: `${sec(UI.roll.outMs / 1000)} s out, ${sec(UI.roll.inMs / 1000)} s in`, avoid: 'a spring on a number: it shows a figure that is not true. Roll each digit in its own slot; never half of two readings.' },
  { id: 'stagger', job: 'List stagger', ease: 'land-soft', also: ['nudge'], time: `${span(...BANDS.energy)} a row, ${GAP.gap_min_s * 1000} to ${GAP.gap_max_s * 1000} ms apart, the run within ${GAP.total_max_s} s`, avoid: 'land on every row: a hard first frame on each reads as flicker. Overshoot on more than every third row.' },
  { id: 'pop', job: 'Small pop or notification', ease: 'pop', time: `${span(...BANDS.gravity)} for a corner notification that slides in over more than 20 px`, avoid: `text blocks and more than one moving item. A pop under 0.35 s leaves ${popSettleFrames(0.35)} frames of settle at ${FPS} fps. A small item that moves 3 to 20 px (a bubble, a chip, a tip) takes the send spring instead: k ${UI.send.k}, d ${UI.send.d}.` },
  { id: 'exit', job: 'Exit', ease: 'launch', also: ['leave'], time: `${EXIT.exit_share_min} to ${EXIT.exit_share_max} of the entrance (${sec(EXIT_EXAMPLE.exitMs / 1000)} s after a ${sec(EXIT_EXAMPLE.entranceS)} s one); ${span(...EXIT_FALLBACK)} when the entrance length is unknown`, avoid: `an exit on the entrance's own ease: it arrives while leaving. Use leave only for a settle or a hand-off the page names.` },
  { id: 'camera-short', job: 'Camera move under 2 s', ease: 'land', time: span(BANDS.gravity[0], BANDS.cinematic[1]), avoid: `settle or glide: they reach 5% of the travel only after ${lateStart('settle')}% and ${lateStart('glide')}% of the time, so a 1.6 s pull-back looks dead for its first ${sec(timeTo('settle', 0.05) * 1.6)} s.` },
  { id: 'camera-long', job: 'Camera move of 2 s or more', ease: 'glide', also: ['settle'], time: `${sec(BANDS.cinematic[1])} s or more`, avoid: 'land: it stops dead on arrival. Glide for a push or a drift; settle for a pull of 2 s or more that starts and ends at rest. A camera move under 2 s takes land.' },
  { id: 'scan', job: 'Scan or wipe travel', ease: 'settle', time: span(BANDS.gravity[0], 1), avoid: 'swap: its steep middle turns the travelling line into a blur. Keep swap for the value the line flips.' },
  { id: 'hold', job: 'Hold drift', ease: 'glide', time: 'the length of the hold, 2 s or more', avoid: 'a copied product surface: it holds still and stays alive through what the product does (a caret, a timer, a hover).' },
];


export const easeRef = (slug) => `EASE.${slug.replace(/-(\w)/g, (_, c) => c.toUpperCase())}`;

/** One job row as a fix line: "<job>: <eases>, <time>". An error on an unknown job id. */
export function jobLine(id) {
  const j = JOBS.find((x) => x.id === id);
  if (!j) throw new Error(`ease-jobs: no job "${id}"`);
  return `${j.job}: ${[j.ease, ...(j.also ?? [])].map(easeRef).join(' or ')}, ${j.time}`;
}
