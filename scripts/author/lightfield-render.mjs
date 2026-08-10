// scripts/author/lightfield-render.mjs — take a screenshot that is the same picture every time.
//
// `page.screenshot()` right after `load` is a lie waiting to happen. A lightfield is dozens of blended,
// masked elements, and the compositor is free to hand back a frame before they have all rastered: the
// PNG is valid, the right size, and almost black. `tide` spent a day looking broken when only its
// portrait was, and every fidelity number measured off such a shot is measuring the browser's timing
// rather than the generator.
//
// The fix is not "wait longer", which only moves the odds. It is to shoot until two CONSECUTIVE frames
// are byte-identical: the picture has stopped changing, so nothing is still arriving. The same argument
// as the deferred-decode finding in docs/MISTAKES.md #267, where waiting longer turned "always wrong"
// into "sometimes wrong" and settled nothing.
//
// A lightfield with motion never settles, because `--t` drives it. The caller pins the clock (the shot
// page writes a fixed `--t`), so "settled" here means rastered, not motionless.

const FRAME = 90;   // ms between attempts. Two rAFs plus raster, with room to spare.
const TRIES = 12;   // ~1.1s worst case. Past this something is genuinely wrong and silence would hide it.

/**
 * stableShot(page, clip) -> Buffer
 * Screenshots `clip` repeatedly until two in a row match, and throws if that never happens.
 */
// Puppeteer returns a Uint8Array on current versions and a Buffer on older ones, and only one of those
// has .equals(). Compare through Buffer.from, which accepts either and copies nothing meaningful here.
const sameBytes = (a, b) => Buffer.from(a).equals(Buffer.from(b));

export async function stableShot(page, clip) {
  // Two rAFs first: the first schedules the commit, the second runs after it. This is the cheap part
  // and it is right most of the time; the loop below is what makes it reliable.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  let prev = await page.screenshot({ clip });
  for (let i = 0; i < TRIES; i++) {
    await new Promise((r) => setTimeout(r, FRAME));
    const next = await page.screenshot({ clip });
    if (sameBytes(next, prev)) return Buffer.from(next);
    prev = next;
  }
  // Loud, because the alternative is a fidelity number nobody can trust. A caller that genuinely wants
  // a moving subject should pin its clock instead of catching this.
  throw new Error(`lightfield-render: the frame never settled after ${TRIES} attempts `
    + `(${(TRIES * FRAME) / 1000}s). Two consecutive screenshots were still different, so something is `
    + `animating or still rastering. If the fragment has motion, pin its clock before shooting it.`);
}
