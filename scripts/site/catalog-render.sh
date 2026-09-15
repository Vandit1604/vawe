#!/bin/sh
# Render only the block-catalogue pages whose JSON changed since their mp4: the renderer's
# frame-dedup makes re-renders of UNCHANGED pages pixel-different (worker-order picks a different
# representative frame per static group), which churns every cropped clip in git.
set -e
for f in films/scene/_catalog-*.json; do
  m="out/_catalog-$(basename "$f" .json | sed 's/_catalog-//').mp4"
  if [ ! -f "$m" ] || [ "$f" -nt "$m" ]; then
    ./bin/vawe "$f" --draft
  else
    echo "  · $m up to date"
  fi
done
echo "→ out/_catalog-*.mp4 (one page per file)"
