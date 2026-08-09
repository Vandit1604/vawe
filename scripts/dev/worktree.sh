#!/usr/bin/env bash
# scripts/dev/worktree.sh — make a git worktree usable by an agent, in about a second.
#
#   scripts/dev/worktree.sh add <name>     → .claude/worktrees/<name>, ready to run gates
#   scripts/dev/worktree.sh rm  <name>
#
# WHY THIS EXISTS. `git worktree add` checks out tracked files only. This repo keeps 444M of
# node_modules, an 11M bin/, and 108 of its 149 scenes out of git, so a bare worktree cannot run a
# single gate — and fails QUIETLY: `layer-props` walks 41 scenes instead of 149 and prints a green tick.
# Measured: the worktree itself takes 0.70s and 127M. The naive fix, two npm installs, takes minutes and
# is why people abandon worktrees (towardsdatascience.com/ai-agents-need-their-own-desk...).
#
# WHAT IS SHARED AND WHAT IS COPIED, because the distinction is the whole design:
#   node_modules  SYMLINK, read-only in practice. pnpm's own guidance warns against a shared store for
#                 mutually untrusted agents, and the corruption case is CONCURRENT INSTALLS — so no
#                 agent may run npm install in a worktree. If you need to, make a real checkout.
#   scenes        COPIED. Two agents editing one scene through a symlink is the shared-tree collision
#                 this whole mechanism exists to prevent.
#   bin/vawe      SYMLINK. Built once, read many.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cmd="${1:-}"; name="${2:-}"
[ -n "$name" ] || { echo "usage: worktree.sh add|rm <name>" >&2; exit 2; }
WT="$ROOT/.claude/worktrees/$name"

if [ "$cmd" = "rm" ]; then
  git -C "$ROOT" worktree remove --force "$WT" 2>/dev/null || true
  echo "✓ removed $name"; exit 0
fi
[ "$cmd" = "add" ] || { echo "usage: worktree.sh add|rm <name>" >&2; exit 2; }

git -C "$ROOT" worktree add -q -b "wt-$name" "$WT" HEAD
# shared, read-only
for d in node_modules site/node_modules; do
  [ -d "$ROOT/$d" ] && ln -sfn "$ROOT/$d" "$WT/$d"
done
mkdir -p "$WT/bin" && ln -sf "$ROOT/bin/vawe" "$WT/bin/vawe" 2>/dev/null || true
ln -sfn "$ROOT/.vawe-data" "$WT/.vawe-data" 2>/dev/null || true
# copied, because they get edited
mkdir -p "$WT/assets/fonts/local"
cp -a "$ROOT/assets/fonts/local/." "$WT/assets/fonts/local/" 2>/dev/null || true
cp -a "$ROOT"/formats/scene/*.json "$WT/formats/scene/" 2>/dev/null || true
for b in "$ROOT"/assets/brands/*/; do
  [ -d "$b" ] || continue
  n="$(basename "$b")"
  for sub in components scenes photos; do
    [ -d "$b$sub" ] && mkdir -p "$WT/assets/brands/$n/$sub" && cp -a "$b$sub/." "$WT/assets/brands/$n/$sub/" 2>/dev/null || true
  done
done

# Prove it is usable rather than assuming. A worktree that cannot see the library is worse than none,
# because every gate in it reports a confident green.
n_main=$(ls "$ROOT"/formats/scene/*.json 2>/dev/null | wc -l | tr -d ' ')
n_wt=$(ls "$WT"/formats/scene/*.json 2>/dev/null | wc -l | tr -d ' ')
echo "✓ $WT  (branch wt-$name)"
echo "  scenes: $n_wt of $n_main   node_modules: shared   bin/vawe: shared"
[ "$n_wt" = "$n_main" ] || { echo "✗ scene count differs — a gate here would under-report. Aborting." >&2; exit 1; }
