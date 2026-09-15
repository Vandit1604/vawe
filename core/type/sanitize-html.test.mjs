// core/type/sanitize-html.test.mjs: pins the fix for a solid-black `<img>` inside an `html` layer.
// Bug: ESCAPING_URL stripped the `src` attribute off ANY absolute path ("/…"), including one under a
// root the render server itself serves (assets/, core/, themes/, formats/, .vawe-data/scenes|uploads).
// That left `<img src="/assets/x.jpg">` as a bare `<img>` with no src, painting nothing over whatever
// sat behind it: a solid black frame in the real render, while `harness/author/preview-fragment.mjs`
// (which never runs this sanitiser) showed the image fine. Fixed by exempting served-root absolute
// paths from the strip; a real escape (another absolute path, `//host/…`, `scheme:…`) still goes.
//   node core/type/sanitize-html.test.mjs
import assert from 'node:assert/strict';
import { sanitizeHtml } from './sanitize-html.js';

// The exact case from formats/scene/vawe-flow-2.timeline.html: a served asset path must survive.
assert.match(
  sanitizeHtml('<img src="/assets/vawe-flow-2/frame-06s.jpg" width="800" height="450">'),
  /src="\/assets\/vawe-flow-2\/frame-06s\.jpg"/,
  'an <img> src under a served root (assets/) must not be stripped'
);

for (const root of ['core/', 'themes/', 'formats/', 'assets/', '.vawe-data/scenes/', '.vawe-data/uploads/']) {
  const html = `<img src="/${root}x.jpg">`;
  assert.match(sanitizeHtml(html), /src="/, `served root "${root}" survives`);
}

// A real escape, outside every served root, is still refused: this is the vulnerability the file
// exists to close (engine-doctrine/MISTAKES.md, an <iframe src="/docs/…"> reading a private server file).
assert.doesNotMatch(
  sanitizeHtml('<img src="/docs/private.png">'),
  /src=/,
  'an absolute path OUTSIDE the served roots must still be stripped'
);
assert.doesNotMatch(sanitizeHtml('<iframe src="/engine-doctrine/MISTAKES.md"></iframe>'), /engine-doctrine\/MISTAKES/,
  'an embedding tag pointed at an unserved path is still refused (EMBED, unchanged)');

// Network escapes (protocol-relative and scheme URLs) still break determinism and must still go.
assert.doesNotMatch(sanitizeHtml('<img src="//evil.example/x.png">'), /src=/, 'protocol-relative src is stripped');
assert.doesNotMatch(sanitizeHtml('<img src="https://evil.example/x.png">'), /src=/, 'scheme src is stripped');

// Relative asset paths were never touched by ESCAPING_URL and must stay that way.
assert.match(sanitizeHtml('<img src="local.jpg">'), /src="local\.jpg"/, 'a relative src is untouched');

console.log('sanitize-html.test.mjs: all assertions passed');
