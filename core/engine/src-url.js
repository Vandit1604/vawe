// core/src-url.js: the ONE resolver from a scene's `src` to the URL the page fetches.
//
// The page that loads a scene lives at /formats/scene/, so a bare "assets/x.png" resolved by the browser
// lands at /formats/scene/assets/x.png and 404s, while "/assets/x.png" is served. That rule had been
// written twice (html fragments in preload.js, video in layers/video.js) and never for images, which is
// how a still that existed on disk was reported as "never loaded ... outside the roots the render server
// allows", both halves false (docs/MISTAKES.md #569). A fact with two owners drifts; this is the owner.
//
// A leaf module on purpose: boot.js, preload.js and a layer all import it, and a layer importing
// preload.js would be a cycle.
//
// Anything carrying a URI scheme (http:, https:, data:, blob:, file:) is not a repo path and passes
// through untouched: the first cut tested only for http(s) and would have rewritten a `data:` image
// handed to the canvasFx bake into "/data:...", a URL that loads nothing. Protocol-relative "//cdn/x"
// and root paths "/x" pass through; "./x" is cleaned; everything else is repo-relative.
export const srcUrl = (src) =>
  (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('/') ? src : '/' + src.replace(/^\.\//, ''));
