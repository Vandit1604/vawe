#!/usr/bin/env bash
# prompt-eval.sh: ablate ONE section of AGENTS.md and measure what the JSON does differently.
#
# WHY. This repo runs ~70 gates over the engine and none over the 44KB file that drives every
# authoring decision. Sections get moved out of AGENTS.md and nobody can say what that cost. This is
# the smallest thing that can say. It is NOT an ablation harness: it runs ONE section, ONE arm each
# way, and n=1 is n=1. Read docs/RESEARCH/PROMPT-EVAL.md before you quote any number it prints.
#
#   scripts/dev/prompt-eval.sh "## THE BACKGROUND MUST MOVE, AND YOU MUST WATCH IT MOVE" out/prompt-eval
#
# Arg 1 is the EXACT `## ` heading line to remove for the ablated arm. Arg 2 is where the two scene
# JSONs land. Run it from a WORKTREE: it edits AGENTS.md in place and restores it, and a second agent
# reading that file while it is cut in half would be reading a lie.
set -euo pipefail

HEADING="${1:?pass the exact '## ' heading to ablate}"
OUT="${2:-out/prompt-eval}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCENE="$ROOT/formats/scene/_demo-heatread.json"
cd "$ROOT"
mkdir -p "$OUT"

grep -qxF "$HEADING" AGENTS.md || { echo "no such heading in AGENTS.md: $HEADING" >&2; exit 1; }
restore() { git checkout -- AGENTS.md 2>/dev/null || true; }
trap restore EXIT

# The task, identical in both arms. It names the scaffold explicitly so the two runs start from the
# same bytes: the archetype is a constant, and everything the agent ADDS to it is the measurement.
read -r -d '' TASK <<'TASKEOF' || true
Scaffold a specimen demo scene in this repo, then extend it.

1. Run exactly: node scripts/dev/demo.mjs --print-path --q "how a thermal blur reads heat off a
   product shot" --name heatread --fx thermalBlur
2. Edit ONLY the JSON file it wrote. Extend it so the film runs about 14 seconds and covers three
   moments: the subject plain, the effect arriving, the effect at full strength.
3. Do NOT render. Do NOT run make. Do NOT edit any other file. Do NOT create any other file.
4. Run: node quality/gates/author-check.mjs <the file> and fix whatever it blocks on.

Stop when author-check no longer blocks. Report the file path and nothing else.
TASKEOF

for ARM in with without; do
  restore
  if [ "$ARM" = without ]; then
    awk -v h="$HEADING" '$0==h{skip=1;next} skip && /^## /{skip=0} !skip' AGENTS.md > "$OUT/CLAUDE.ablated.md"
    cp "$OUT/CLAUDE.ablated.md" AGENTS.md
  fi
  rm -f "$SCENE"
  echo "== arm: $ARM ($(wc -c < AGENTS.md) bytes of AGENTS.md)"
  printf '%s\n' "$TASK" | claude -p --dangerously-skip-permissions > "$OUT/$ARM.log" 2>&1 || true
  cp "$SCENE" "$OUT/$ARM.json" 2>/dev/null || echo "arm $ARM wrote no scene" >&2
  rm -f "$SCENE"
done
restore

node scripts/dev/library-stats.mjs --files "$OUT/with.json" "$OUT/without.json"
