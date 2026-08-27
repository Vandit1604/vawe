// blueprints/beats-punct.mjs: the PUNCTUATION register. A beat here is not a scene, it is a single
// stressed syllable: one word or one mark, on screen for about a second, sized to fill the frame.
//
// Lifted off `brew-launch-act1`, which spends four of its beats this way ("Today." · "Meet" · the logo ·
// "Faster"). The film reads as one spoken sentence because the mark is timed like the words around it,
// not because anything is carried across the cuts.
import { INK } from './kit.mjs';

// wordBlast: the four-key SCALE PUNCTUATION. It arrives already too big and falls into its reading, holds
// with a creep, then leaves by growing THROUGH the frame. `anim:"none"` is the whole point: the engine's
// entrance presets would cross-fade this, and a fade is how a slide starts. This does not start, it lands.
//
// The four keys, and why each exists:
//   1. arrive   oversized and invisible. Scale carries the entrance, so opacity only has to stop the
//               oversized first frame from being seen; it is done by the time the word is readable.
//   2. settle   scale 1 at 0.42s. easeOutCubic into it, so the deceleration is the impact.
//   3. drift    1.04, linear, over the last ~0.3s. A held word that is PERFECTLY still for a second reads
//               as a freeze frame, i.e. as a rendering fault. The creep is too small to look at and it is
//               the only thing keeping the frame alive. It is the key that gets dropped; do not drop it.
//   4. exit     grows past the camera on easeInCubic, accelerating away. Paired with `exitDur: 0` because
//               a layer that fades AND grows just looks like it failed to leave.
// motionBlur streaks the two fast ends and is crisp across the hold, which is what makes the arrival read
// as speed rather than as a jump cut.
//
// TEXT OR IMAGE. A mark passed as `src` gets the same track as a word, one notch gentler (1.4 → 1.7, and
// brew measures the same softening), because a wordmark is wide and 1.9x throws it off both edges. That is
// how the logo reads as the next WORD of the sentence instead of as a badge, and it is the launch rule
// about giving a mark prominence, written as motion instead of as a size.
export function wordBlast({ text, src, x = 160, y = 380, w, h, size = 380, weight = 600, color = INK,
  align = 'center', font, arrive, exit, settle = 1, drift, settleAt = 0.42, driftFor = 0.3,
  motionBlur = true, start = 0, dur = 1.5 } = {}) {
  const isMark = src != null;
  if (!isMark && text == null) throw new Error('wordBlast: pass `text` (a word) or `src` (a mark). It punctuates one of the two.');
  // a wide mark cannot take the word's amplitude; keep the two sets of numbers named, not branched inline
  const A = arrive != null ? arrive : (isMark ? 1.4 : 1.5);
  const Z = exit != null ? exit : (isMark ? 1.7 : 1.9);
  const D = drift != null ? drift : settle + (isMark ? 0.03 : 0.04);
  // the drift has to start after the settle lands and end where the exit begins; on a very short beat it
  // collapses to a hair rather than inverting the track
  const driftAt = +Math.min(Math.max(settleAt + 0.08, dur - driftFor), dur - 0.05).toFixed(3);
  const motion = [
    { t: 0, scale: A, opacity: 0, ease: 'easeOutCubic' },
    { t: Math.min(settleAt, driftAt - 0.02), scale: settle, opacity: 1, ease: 'easeOutCubic' },
    { t: driftAt, scale: D, ease: 'linear' },
    { t: dur, scale: Z, opacity: 0, ease: 'easeInCubic' },
  ];
  const base = { x, y, start, duration: dur, anim: 'none', exitDur: 0, motion, motionBlur };
  if (isMark) return [{ type: 'image', src, ...(w != null ? { w } : {}), ...(h != null ? { h } : {}), ...base }];
  return [{ type: 'text', text, w: w != null ? w : 1600, align, size, weight, color,
    ...(font ? { font } : {}), ...base }];
}
