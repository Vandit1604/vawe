#!/usr/bin/env bash
# harness/dev/test-merge-driver.sh: proof that merge=vawe-generated stops two branches conflicting on
# a generated file and that post-merge regen fires. Builds a throwaway repo (never the real one, so it
# needs no full `make regen`); VAWE_REGEN_CMD lets post-merge run a marker command instead.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT

git -C "$T" init -q -b main
cp "$ROOT/harness/dev/merge-generated.sh" "$T/"
mkdir -p "$T/.githooks"
cp "$ROOT/.githooks/post-merge" "$T/.githooks/"
echo "generated.txt merge=vawe-generated" > "$T/.gitattributes"
echo "base" > "$T/generated.txt"
git -C "$T" add -A && git -C "$T" -c commit.gpgsign=false commit -q -m base
git -C "$T" config core.hooksPath .githooks
git -C "$T" config merge.vawe-generated.driver './merge-generated.sh %O %A %B %P'

git -C "$T" checkout -q -b branch-a
echo "branch-a output" > "$T/generated.txt"
git -C "$T" commit -qam branch-a

git -C "$T" checkout -q main -b branch-b
echo "branch-b output" > "$T/generated.txt"
git -C "$T" commit -qam branch-b

MARKER="$T/regen-ran"
if VAWE_REGEN_CMD="touch '$MARKER'" git -C "$T" merge -q --no-edit branch-a; then
  echo "PASS: merge of two branches both touching generated.txt did not conflict"
else
  echo "FAIL: merge conflicted"; exit 1
fi

[ -f "$MARKER" ] && echo "PASS: post-merge ran the regen command" \
  || { echo "FAIL: post-merge did not run"; exit 1; }

[ "$(cat "$T/generated.txt")" = "branch-b output" ] && echo "PASS: kept ours (branch-b, the checkout doing the merge)" \
  || { echo "FAIL: file was not kept as ours"; exit 1; }
