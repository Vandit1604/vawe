# The marketing site + live editor. Build context is the REPO ROOT, not site/: the site vendors the
# render engine (core/, themes/, formats/scene/scene.html, fonts) into its public/ at build time via
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
# The whole scene directory, not just the page: scene.html loads scene.js and scene.css, and shipping
# only the page put a dead engine in production behind a 200.
COPY formats/scene ./formats/scene
COPY assets/icons ./assets/icons
COPY assets/vendor ./assets/vendor
COPY scripts ./scripts
# Only the marks the playable scenes reference survive .dockerignore's negations here (144K of
# brands' 59M); site-engine.mjs ships exactly those and fails the build if one is missing.
COPY assets/brands ./assets/brands
# plinth is outside assets/brands and one published scene reaches for its hero figure.
COPY assets/plinth ./assets/plinth

# Font binaries are deliberately NOT committed (redistribution), so a clean checkout has none — and
# boot() blocks on document.fonts for every registered face, so the editor would hang without them.
# fonts.mjs uses only node builtins, hence no install needed here.
RUN node scripts/media/fonts.mjs

# --- the site ---
COPY site/package.json site/package-lock.json ./site/
WORKDIR /src/site
RUN npm ci

COPY site/ ./
# `prebuild` runs ../scripts/site/site-engine.mjs → vendors the engine into public/
RUN npm run build

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
# WORKDIR IS /srv, NOT /app, AND THE NAME IS LOAD-BEARING. Same failure as the builder's /src above,
# one stage down: the deploy host held a BuildKit ref for the first `COPY --from=builder` whose
# backing overlay had been pruned, so the layer reported CACHED and then died on
# `failed to calculate checksum of ref`. Six deploys failed on it, and Coolify's `force=true` did
# not clear it: force re-runs the build, it does not drop BuildKit's ref cache. Renaming the WORKDIR
# re-keys this stage's parent, which is the one thing that reliably moves past a poisoned ref from
# inside the repo. `docker builder prune -af` on the host is still the actual cure.
FROM node:22-alpine AS runner
WORKDIR /srv
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
COPY --chown=nextjs:nodejs docker-start.sh ./
RUN chmod +x docker-start.sh

USER nextjs
EXPOSE 3000
ENV DOCS_ORIGIN=http://127.0.0.1:3001
CMD ["./docker-start.sh"]
