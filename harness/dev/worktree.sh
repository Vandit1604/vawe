#!/usr/bin/env bash
# harness/dev/worktree.sh: make a git worktree usable by an agent, in about a second.
#
#   harness/dev/worktree.sh add <name>     → .claude/worktrees/<name>, ready to run gates
#   harness/dev/worktree.sh rm  <name>
#
# WHY THIS EXISTS. `git worktree add` checks out tracked files only. This repo keeps 444M of
# node_modules, an 11M bin/, and 108 of its 149 scenes out of git, so a bare worktree cannot run a
# single gate, and fails QUIETLY: `layer-props` walks 41 scenes instead of 149 and prints a green tick.
# Measured: the worktree itself takes 0.70s and 127M. The naive fix, two npm installs, takes minutes and
# is why people abandon worktrees (towardsdatascience.com/ai-agents-need-their-own-desk...).
#
# WHAT IS SHARED AND WHAT IS COPIED, because the distinction is the whole design:
#   node_modules  SYMLINK, read-only in practice. pnpm's own guidance warns against a shared store for
#                 mutually untrusted agents, and the corruption case is CONCURRENT INSTALLS, so no
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
# COPIED, because they get edited, AND DRIVEN FROM .worktreeinclude, not from a second list.
#
# This loop used to be its own hand-written list: assets/fonts/local, films/scene/*.json, and each
# brand's components/scenes/photos. `.worktreeinclude` meanwhile asked for `assets/fonts/*.woff2`,
# `assets/brands/**` and `assets/cutouts/**` as well, with a comment on each explaining which silent
# failure it prevents. The script did not implement its own manifest, so every worktree made here was
# missing the vendored webfonts and every brand IMAGE. Measured: `snap-scenes` in a fresh worktree gave
# 16 identical · 61 changed · 29 errored against main's 106 identical, every one of those from a
# fallback font or an image that was never there, and none of them a real defect.
#
# That is engine-doctrine/MISTAKES.md #450 in another costume: a hand-kept scope drifting from the vocabulary it
# claims to cover. A manifest with two implementations has no implementation.
INCLUDE="$ROOT/.worktreeinclude"
if [ -f "$INCLUDE" ]; then
  while IFS= read -r pat; do
    case "$pat" in ''|'#'*) continue ;; esac
    # `git ls-files` will not list these (that is why they are here), so the patterns are expanded by
    # the shell against the real tree and copied path by path, preserving the directory shape.
    for src in $(cd "$ROOT" && eval ls -d $pat 2>/dev/null); do
      [ -e "$ROOT/$src" ] || continue
      mkdir -p "$WT/$(dirname "$src")"
      cp -a "$ROOT/$src" "$WT/$(dirname "$src")/" 2>/dev/null || true
    done
  done < "$INCLUDE"
else
  echo "✗ .worktreeinclude is missing: a worktree built without it cannot render. Aborting." >&2
  exit 1
fi

# Prove it is usable rather than assuming. A worktree that cannot see the library is worse than none,
# because every gate in it reports a confident green.
#
# Checked PER MANIFEST PATTERN, not per hand-picked item. The old check counted scenes only, so the
# missing webfonts and brand images it was also supposed to carry sailed past a green tick for months.
# Counting whatever `.worktreeinclude` asks for means a line added there is verified the day it is
# added, and this check cannot fall behind the manifest the way the copy loop did.
fail=0
while IFS= read -r pat; do
  case "$pat" in ''|'#'*) continue ;; esac
  c_main=$(cd "$ROOT" && eval ls -d $pat 2>/dev/null | wc -l | tr -d ' ')
  c_wt=$(cd "$WT" && eval ls -d $pat 2>/dev/null | wc -l | tr -d ' ')
  printf '  %-34s %s of %s\n' "$pat" "$c_wt" "$c_main"
  [ "$c_wt" = "$c_main" ] || { echo "✗ $pat, $c_wt of $c_main arrived. A worktree missing this renders a substitute and every gate in it reports a confident green." >&2; fail=1; }
done < "$INCLUDE"
echo "✓ $WT  (branch wt-$name)   node_modules: shared   bin/vawe: shared"
[ "$fail" = 0 ] || { echo "✗ refusing to hand over an incomplete worktree." >&2; exit 1; }
