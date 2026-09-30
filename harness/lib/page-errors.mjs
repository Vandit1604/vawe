// A page whose script throws or whose module 404s still paints its static HTML, so the render must stop on it.

/** Collect the page's uncaught errors, unhandled rejections and failed script requests as they happen. */
export function watchPageErrors(page) {
  const events = [];
  page.on('pageerror', (e) => events.push({ message: firstLine(e.message), source: sourceOf(e.stack) }));
  page.on('requestfailed', (r) => {
    const seen = events.some((e) => e.source === r.url());
    if (r.resourceType() === 'script' && !seen) events.push({ message: `request failed (${r.failure()?.errorText || 'no reason'})`, source: r.url() });
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.request().resourceType() === 'script') events.push({ message: `HTTP ${r.status()}`, source: r.url() });
  });
  return events;
}

/** One line per event, naming the page, the failing file and the message. Pure. */
export function pageErrorLines(events, pagePath) {
  return events.map((e) => `${pagePath}: ${e.source ? `${pathOf(e.source)}: ` : ''}${e.message}`);
}

const firstLine = (s) => String(s || 'unknown error').split('\n')[0];

const sourceOf = (stack) => String(stack || '').match(/https?:\/\/[^\s)]+/)?.[0] || null;

const pathOf = (url) => url.replace(/^https?:\/\/[^/]+\//, '').replace(/:\d+:\d+$/, '');
