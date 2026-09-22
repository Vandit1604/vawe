#!/bin/sh
# harness/dev/render-lock.sh <key> <command...>: refuse a SECOND render racing the same output.
#
# THE ACTUAL CAUSE, not a symptom. Two `./bin/vawe` runs to the same out/<name>.mp4 raced: both
# processes' encode+mux pipelines wrote the same path, and the result was a 0.87s file for a 17.5s
# film that still exited 0. render-verify.mjs (quality/gates/render-verify.mjs) catches the DAMAGE
# after the fact; this stops the race from happening at all, which is cheaper and more honest than
# detecting a corrupt file once it already exists. `mkdir` is the lock primitive because it is
# atomic on every filesystem this engine runs on, unlike a check-then-write on a plain file.
set -eu
FILM="$1"
KEY="$(printf '%s' "$1" | tr -c 'A-Za-z0-9._-' '_')"
shift

# FAIL LOUD ON A STALE FILM, before the render even starts. `films/scene/*.json` and its siblings are
# gitignored, so a linked worktree only ever gets them by copy (harness/dev/sync-worktree.mjs), and
# nothing re-copies them when the main checkout moves on. A stale copy renders clean and looks
# identical to a correct one; this is the one place every render already passes through, so it is the
# one place that can catch it. `.git` is a FILE in a linked worktree and a DIRECTORY in the main
# checkout, which is the cheap test that skips this (git worktree list + node) entirely on main.
case "$FILM" in
  *.json)
    if [ -f .git ]; then
      SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
      node "$SCRIPT_DIR/sync-worktree.mjs" "$(pwd)" --verify "$FILM" || exit 1
    fi
    ;;
esac
LOCKDIR=".vawe-data/locks/render-$KEY.lock"
mkdir -p "$(dirname "$LOCKDIR")"
if ! mkdir "$LOCKDIR" 2>/dev/null; then
  echo "render-lock: another render for '$KEY' looks to be in flight (stale? rm -rf $LOCKDIR)" >&2
  exit 1
fi
trap 'rmdir "$LOCKDIR" 2>/dev/null || true' EXIT INT TERM
"$@"
