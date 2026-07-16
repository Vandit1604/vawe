# The marketing site + live editor. Build context is the REPO ROOT, not site/: the site vendors the
# render engine (core/, themes/, formats/scene/scene.html, fonts) into its public/ at build time via
# scripts/site-engine.mjs, so the editor can run the real renderFrame(n) in the browser.
#
#   docker build -t vawe-site .
#   docker run -p 3000:3000 vawe-site
FROM node:22-alpine AS builder
WORKDIR /repo

# --- engine sources the site vendors (see scripts/site-engine.mjs COPY list) ---
COPY scripts ./scripts
COPY core ./core
COPY themes ./themes
COPY formats/scene/scene.html formats/scene/schema.json ./formats/scene/
COPY engine/assets/icons ./engine/assets/icons
COPY engine/assets/vendor ./engine/assets/vendor

# Font binaries are deliberately NOT committed (redistribution), so a clean checkout has none — and
# boot() blocks on document.fonts for every registered face, so the editor would hang without them.
# fonts.mjs uses only node builtins, hence no install needed here.
RUN node scripts/fonts.mjs

# --- the site ---
COPY site/package.json site/package-lock.json ./site/
WORKDIR /repo/site
RUN npm ci

COPY site/ ./
# `prebuild` runs ../scripts/site-engine.mjs → vendors the engine into public/
RUN npm run build

# --- runtime: standalone server only, no dev deps ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# standalone traces the server; public/ and .next/static are NOT included by it — copy explicitly.
COPY --from=builder --chown=nextjs:nodejs /repo/site/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/site/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/site/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
