// A page whose load event never comes: name what it was waiting for instead of a bare navigation timeout.

const BLOCKED_PROBE_MS = 3000;

/** Track the page's console errors and the requests that have not finished. Call before page.goto. */
export function watchLoad(page) {
  const pending = new Map();
  const errors = [];
  const done = (r) => pending.delete(r);
  page.on('request', (r) => pending.set(r, Date.now()));
  page.on('requestfinished', done);
  page.on('requestfailed', done);
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e.message).split('\n')[0]));
  return { pending, errors };
}

/** True when the page's main thread answers a trivial evaluate within the probe time. Pure of side effects on the page. */
async function threadResponds(page) {
  let timer;
  const stuck = new Promise((resolve) => { timer = setTimeout(() => resolve(false), BLOCKED_PROBE_MS); });
  try { return await Promise.race([page.evaluate(() => true).then(() => true, () => true), stuck]); } finally { clearTimeout(timer); }
}

/** Why the load stalled: lines for the console errors, the unfinished requests and a blocked main thread. Empty when nothing explains it. */
export async function loadStallLines(page, watch, pagePath) {
  const lines = [];
  if (!(await threadResponds(page))) lines.push(`${pagePath}: the page's main thread is blocked (a script loop or a very heavy first paint), so the load event cannot fire`);
  const now = Date.now();
  for (const [r, since] of watch.pending) lines.push(`${pagePath}: still loading after ${Math.round((now - since) / 1000)} s: ${r.resourceType()} ${r.url()}`);
  for (const e of watch.errors.slice(-5)) lines.push(`${pagePath}: console error: ${e}`);
  return lines;
}
