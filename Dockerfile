# The marketing site + live editor. Build context is the REPO ROOT, not site/: the site vendors the
# render engine (core/, themes/, formats/scene/scene.html, fonts) into its public/ at build time via
# scripts/site/site-engine.mjs, so the editor can run the real renderFrame(n) in the browser.
#
#   docker build -t vawe-site .
#   docker run -p 3000:3000 vawe-site
FROM node:22-alpine AS builder
WORKDIR /repo

# --- engine sources the site vendors (see scripts/site/site-engine.mjs COPY list) ---
COPY scripts ./scripts
COPY core ./core
COPY themes ./themes
COPY formats/scene/scene.html formats/scene/schema.json ./formats/scene/
COPY assets/icons ./assets/icons
COPY assets/vendor ./assets/vendor

# Font binaries are deliberately NOT committed (redistribution), so a clean checkout has none — and
# boot() blocks on document.fonts for every registered face, so the editor would hang without them.
# fonts.mjs uses only node builtins, hence no install needed here.
RUN node scripts/media/fonts.mjs

# --- the site ---
COPY site/package.json site/package-lock.json ./site/
WORKDIR /repo/site
RUN npm ci

COPY site/ ./
# `prebuild` runs ../scripts/site/site-engine.mjs → vendors the engine into public/
RUN npm run build

# --- the docs app (fumadocs, Next 16) ---
# It ships in the SAME image and runs alongside the site, which serves it at /docs by rewriting to
# it. A second container would work too, but this is one deploy and one thing to keep alive: with
# nothing listening on 3001, /docs 500s, and a docs link that dies whenever a separate service is
# down is not worth the extra moving part for a project this size.
WORKDIR /repo/docs-site
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
COPY --from=builder --chown=nextjs:nodejs /repo/site/.next/standalone ./site
COPY --from=builder --chown=nextjs:nodejs /repo/site/.next/static ./site/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/site/public ./site/public

COPY --from=builder --chown=nextjs:nodejs /repo/docs-site/.next/standalone ./docs
COPY --from=builder --chown=nextjs:nodejs /repo/docs-site/.next/static ./docs/.next/static
# fumadocs resolves content at runtime from .source
COPY --from=builder --chown=nextjs:nodejs /repo/docs-site/.source ./docs/.source

# Start docs on 3001, then the site on $PORT. The site proxies /docs to it, so if docs is not up
# the docs link 500s — start it first and let the site be the process that keeps the container
# alive, so a docs crash surfaces as a restart rather than a silently broken tab.
COPY --chown=nextjs:nodejs docker-start.sh ./
RUN chmod +x docker-start.sh

USER nextjs
EXPOSE 3000
ENV DOCS_ORIGIN=http://127.0.0.1:3001
CMD ["./docker-start.sh"]
