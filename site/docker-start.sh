#!/bin/sh
# The container runs only the marketing site. /docs is served by the separate docs app, which the
# site proxies to at DOCS_ORIGIN (site/lib/docs-origin.mjs).
set -e

PORT="${PORT:-3000}"

exec env PORT="$PORT" HOSTNAME=0.0.0.0 node site/server.js
