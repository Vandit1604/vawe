# Underline road

**Use when** a line must become a route: one blue stroke draws along real streets from a start dot to a destination pin, and the result card shows the time. The stroke is one path with one dash offset, so its head never jumps at a corner. Clip: [underline-road.mp4](underline-road.mp4) (5 s). Demo: [demo/underline-road.html](demo/underline-road.html).

```js
const pts = [[VX[1], HY[3]], [VX[1], HY[2]], [VX[3], HY[2]], [VX[3], HY[1]], [VX[4], HY[1]]];   // street centres: start, three turns, destination
const R = 38;                                                       // corners are quadratic curves, radius 38 units
const total = line.getTotalLength();
vawe.onFrame((t) => {
  const s = total * inOut(clamp((t - 1.0) / 1.9));                  // 1.9 s, ease in and out
  [casing, line].forEach((p) => { p.style.strokeDasharray = `${total} ${total}`; p.style.strokeDashoffset = total - s; });
});
```

Sound: none; the pin landing is the one point a cue could use.

## How it looks and moves

- The clip copies a maps app in its light style: pale land, grey building footprints, white minor streets with a grey casing, yellow main streets, a green park, a blue river, and a street name on every street, in grey with a white halo.
- The route is the app blue (#4285f4) with a darker casing, 11 units wide, rounded at the turns. It runs on street centres, never across a block.
- Order: the directions card (start and destination) fades in at 0.25 s, the start dot shows at 0.7 s with a slow pulse, the route draws from 1.0 s to 2.9 s, the pin drops 30 units and fades in over 0.25 s, then the time card fades in at 3.2 s.
- The map does not pan or cut: the route preview fits the whole route on one screen, as the real app does. No spring or overshoot: the app draws the line and drops the pin on plain curves.
- The map is our own invented city (Cedar, Pine, Mill, Elm). Names and numbers are made up.
- The card text is 3.4 to 4.4 percent of the frame height, so it reads at once.
