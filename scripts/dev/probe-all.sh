#!/bin/sh
# Assert renderFrame(n) is PURE in n (byte-identical regardless of render order), for every format.
# `make probe M=<fmt>` checks one format directly; this is what runs when M is omitted.
set -e
for d in formats/*/scene.html; do
  f=$(basename "$(dirname "$d")")
  node scripts/gates/probe-purity.mjs "$f"
done
