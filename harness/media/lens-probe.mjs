// Reads what each lens of the page shows at a few seconds: lens.measure(t) after the page has painted that second. Returns [] for a page with no lens.
const GRID = 12;

/** The seconds to read: an even grid over the film. Pure. */
export const lensTimes = (dur, grid = GRID) => Array.from({ length: grid }, (_, i) => +((dur * (i + 0.5)) / grid).toFixed(3));

/** `seek(ms)` must paint (seekAll). */
export async function sampleLens(page, dur, seek) {
  if (!(await page.evaluate(() => Boolean(globalThis.__vaweLenses?.length)))) return [];
  const samples = [];
  for (const t of lensTimes(dur)) {
    await seek(t * 1000);
    samples.push(...(await page.evaluate((at) => globalThis.__vaweLenses.map((l) => l.measure(at)), t)));
  }
  return samples;
}
