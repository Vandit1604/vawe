#!/bin/sh
# Both Next apps in one container: the docs (fumadocs, Next 16) on 3001, and the marketing site
# (Next 15) on $PORT. The site serves /docs by rewriting to the docs app, so the two must be up
# together or /docs 500s — which is exactly the failure this script exists to prevent.
#
# They are separate apps because their framework versions are pinned apart; they are one container
# because one deploy is one thing to keep alive.
set -e

PORT="${PORT:-3000}"

echo "→ docs  on 127.0.0.1:3001"
PORT=3001 HOSTNAME=127.0.0.1 node docs/server.js &
DOCS_PID=$!

# If docs dies, take the container down rather than serve a site whose Docs tab 500s.
watch_docs() {
  wait "$DOCS_PID"
  echo "✗ docs exited — stopping the container so the platform restarts it"
  kill -TERM 1 2>/dev/null || true
}
watch_docs &

echo "→ site  on 0.0.0.0:${PORT}  (/docs proxies to 3001)"
exec env PORT="$PORT" HOSTNAME=0.0.0.0 node site/server.js
