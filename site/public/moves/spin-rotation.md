# Spin rotation

**Use when** a loading screen hands over to the loaded one and the spinner is on screen: the spinner
keeps turning, the arc's leading edge sweeps round like a radar hand and uncovers the next screen
behind it, and the camera rolls with the turn and comes back to level as the new screen settles. One angle
runs the move: the spinner, the reveal and the roll all read from it. Clip: [spin-rotation.mp4](spin-rotation.mp4).
Demo: [demo/spin-rotation.html](demo/spin-rotation.html). Not [spin-transition](spin-transition.md), which
rolls the whole frame 90 degrees across a cut and needs no spinner.

```js
import { easeFn } from '../../core/motion/presets.js';
const land = easeFn('land');
const OMEGA = 330, T0 = 0.5, T_C = 1.7, D2 = 0.8;                  // deg/s, sweep starts, brake starts, brake length
const ROLL = { at: 0.9, dur: 1.5, deg: 7 };                        // one roll out and back to level, the way the spinner turns
const smooth = (k) => k * k * (3 - 2 * k);
const head = (t) => (t < T_C ? OMEGA * t : OMEGA * T_C + (OMEGA * D2 / 4.8) * land(clamp((t - T_C) / D2)));   // land starts at 4.8 x its average: 330
const roll = (t) => ROLL.deg * Math.sin(Math.PI * smooth(clamp((t - ROLL.at) / ROLL.dur)));   // 0 at both ends, zero speed at both
const own = (t) => head(t) - roll(t);                              // screen angle of the arc = own + roll, so it never jumps
// world.style.transform = `rotate(${roll(t)}deg)`; ring.style.transform = `rotate(${own(t)}deg)`
// B's plane is clipped to the wedge from own(T0) to own(t): polygon(centre, points on a circle of radius 3 W)
```

Sound: none; the turn is the cue, and the settled screen takes its own entrance sound.

The angle that matters is the arc's angle on screen. It is `own + roll`, and the roll starts and ends at zero
speed, so the sum has the same speed before and after the roll begins (330 degrees a second); then
`EASE.land` brakes it from that same speed (its first frame moves at 4.8 times its average, so the
brake covers `OMEGA * D2 / 4.8` = 55 degrees). The wedge starts at the arc's leading edge at `T0` and
needs 360 degrees, so it closes while the spinner is still at full speed, 1.1 s later; the braking
turn is only the ring settling, never a slow reveal. The ring then flies to the header and becomes its
mark: one shared element, no fade.

Roll 5 to 8 degrees, clockwise with the spinner, then back to level; a screen that holds at 14 degrees
reads as a mistake. Give the new screen a light ground and a light card, so the wedge edge against the
dark loader is clear, and keep the middle of the card free for the ring until it flies to the mark: the ring
then closes to a full circle. Both planes are larger than the frame (`inset: -50%`), so the roll never shows a corner. A
sweep needs motion blur or the hard edge strobes at 5.5 degrees a frame: stack 8 copies of the world at
shutter times, as in [spin-transition](spin-transition.md), and show one copy when nothing moves.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
