# The marketing site + live editor. Build context is the REPO ROOT, not site/: the site vendors the
# render engine (core/, themes/, films/scene/scene.html, fonts) into its public/ at build time via
# scripts/site/site-engine.mjs, so the editor can run the real renderFrame(n) in the browser.
#
#   docker build -t vawe-site .
#   docker run -p 3000:3000 vawe-site
FROM node:22-alpine AS builder
WORKDIR /src

# --- engine sources the site vendors (see scripts/site/site-engine.mjs COPY list) ---
# The workdir above is /src, not /repo, on purpose. The deploy host held a BuildKit cache entry for
# the `WORKDIR /repo` layer whose backing overlay directory had been pruned away, so committing ANY
# child layer onto it failed with "failed to stat active key during commit" and a snapshot ID that
# was byte-identical on every build, even under --no-cache. Re-keying the children (reordering these
# COPYs) did nothing because the broken parent was still reached; renaming the workdir is what
# re-keys the parent. `docker builder prune -af` on the host is the actual cure.
COPY themes ./themes
COPY core ./core
# blocks/ AND assets/geo/, because scripts/site/site-engine.mjs vendors both into site/public and
# REFUSES the build without them ("missing blocks"). This is the failure that took three days of live
# 404s to notice: the site image copied core/ and not blocks/, so /blocklib/index.mjs was never there,
# every block family vanished from /playground, and the page still answered 200. blocks/geo.mjs also
# reads ../assets/geo at module scope, so the maps take the whole registry down without it.
COPY blocks ./blocks
COPY assets/geo ./assets/geo
# The whole scene directory, not just the page: scene.html loads scene.js and scene.css, and shipping
# only the page put a dead engine in production behind a 200.
COPY films/scene ./films/scene
COPY assets/icons ./assets/icons
COPY assets/vendor ./assets/vendor
COPY scripts ./scripts
# generators/ bakes the standing assets (fonts here); the RUN below needs it in the image
COPY generators ./generators
# Only the marks the playable scenes reference survive .dockerignore's negations here (144K of
# brands' 59M); site-engine.mjs ships exactly those and fails the build if one is missing.
COPY assets/brands ./assets/brands
# plinth is outside assets/brands and one published scene reaches for its hero figure.
COPY assets/plinth ./assets/plinth

# Font binaries are deliberately NOT committed (redistribution), so a clean checkout has none — and
# boot() blocks on document.fonts for every registered face, so the editor would hang without them.
# fonts.mjs uses only node builtins, hence no install needed here.
RUN node generators/media/fonts.mjs

# --- the site ---
COPY site/package.json site/package-lock.json ./site/
WORKDIR /src/site
RUN npm ci

COPY site/ ./
# `prebuild` runs ../scripts/site/site-engine.mjs → vendors the engine into public/
# BUILD TO `.next`, DO NOT RENAME AFTERWARDS. `site/package.json`'s build script pins
# NEXT_DIST_DIR=.next-build so a running `next dev` and a `next build` do not fight over `.next`
# locally. Nothing runs `next dev` in this image, so the pin has no job here and two attempts to
# accommodate it both shipped broken.
#
# The first attempt left the COPYs naming `.next` while the build wrote `.next-build`: six production
# deploys failed on `failed to calculate checksum of ref ... not found`, on a layer BuildKit had also
# printed as CACHED, which reads exactly like a poisoned cache and is really a path never written.
#
# The second renamed the directory after the build. That deployed GREEN and served every stylesheet as
# a 404, because `next build --output standalone` BAKES the dist dir into its own server:
# `.next-build/standalone/server.js` carries `distDir: "./.next-build"` and the standalone tree nests a
# second `.next-build/` inside itself. Renaming the outer directory moves nothing the server looks for.
#
# So run the prebuild explicitly and then a plain `next build`, which takes the `.next` default from
# next.config.mjs. `npm run build` would re-apply the pin. The guard is what stops a third attempt:
# it names the cause instead of letting the failure arrive as a 404 on a page that returned 200.
RUN npm run prebuild && npx next build
RUN test -d .next/static && test -d .next/standalone || { echo "✗ the site build wrote no .next/static or .next/standalone. Something re-applied NEXT_DIST_DIR; the runner COPYs below name .next."; exit 1; }

# --- the docs app (fumadocs, Next 16) ---
# It ships in the SAME image and runs alongside the site, which serves it at /docs by rewriting to
# it. A second container would work too, but this is one deploy and one thing to keep alive: with
# nothing listening on 3001, /docs 500s, and a docs link that dies whenever a separate service is
# down is not worth the extra moving part for a project this size.
WORKDIR /src/docs-site
COPY docs-site/package.json docs-site/package-lock.json ./
# --ignore-scripts is load-bearing: this package's postinstall runs `fumadocs-mdx`, which reads
# source.config.ts and content/. Neither is in this layer, and neither may be — copying them here
# to satisfy the postinstall would make every prose edit bust the dependency cache. So install the
# deps only, and generate .source below, once the content is actually present.
RUN npm ci --ignore-scripts
COPY docs-site/ ./
RUN npx fumadocs-mdx && npm run build

# --- runtime: standalone server only, no dev deps ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# standalone traces the server; public/ and .next/static are NOT included by it — copy explicitly.
# each app sets outputFileTracingRoot to its own dir, so its standalone root holds server.js
COPY --from=builder --chown=nextjs:nodejs /src/site/.next/standalone ./site
COPY --from=builder --chown=nextjs:nodejs /src/site/.next/static ./site/.next/static
COPY --from=builder --chown=nextjs:nodejs /src/site/public ./site/public

COPY --from=builder --chown=nextjs:nodejs /src/docs-site/.next/standalone ./docs
COPY --from=builder --chown=nextjs:nodejs /src/docs-site/.next/static ./docs/.next/static
# fumadocs resolves content at runtime from .source
COPY --from=builder --chown=nextjs:nodejs /src/docs-site/.source ./docs/.source

# Start docs on 3001, then the site on $PORT. The site proxies /docs to it, so if docs is not up
# the docs link 500s — start it first and let the site be the process that keeps the container
# alive, so a docs crash surfaces as a restart rather than a silently broken tab.
COPY --chown=nextjs:nodejs site/docker-start.sh ./
RUN chmod +x docker-start.sh

USER nextjs
EXPOSE 3000
ENV DOCS_ORIGIN=http://127.0.0.1:3001
CMD ["./docker-start.sh"]
