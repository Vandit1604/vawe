#!/bin/sh
# scripts/dev/render-lock.sh <key> <command...>: refuse a SECOND render racing the same output.
#
# THE ACTUAL CAUSE, not a symptom. Two `./bin/vawe` runs to the same out/<name>.mp4 raced: both
# processes' encode+mux pipelines wrote the same path, and the result was a 0.87s file for a 17.5s
# film that still exited 0. render-verify.mjs (quality/gates/render-verify.mjs) catches the DAMAGE
# after the fact; this stops the race from happening at all, which is cheaper and more honest than
# detecting a corrupt file once it already exists. `mkdir` is the lock primitive because it is
# atomic on every filesystem this engine runs on, unlike a check-then-write on a plain file.
set -eu
KEY="$(printf '%s' "$1" | tr -c 'A-Za-z0-9._-' '_')"
shift
LOCKDIR=".vawe-data/locks/render-$KEY.lock"
mkdir -p "$(dirname "$LOCKDIR")"
if ! mkdir "$LOCKDIR" 2>/dev/null; then
  echo "render-lock: another render for '$KEY' looks to be in flight (stale? rm -rf $LOCKDIR)" >&2
  exit 1
fi
trap 'rmdir "$LOCKDIR" 2>/dev/null || true' EXIT INT TERM
"$@"
