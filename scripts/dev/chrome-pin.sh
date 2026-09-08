#!/bin/sh
# scripts/dev/chrome-pin.sh <target-name>: resolve, pin, and RECORD the Chrome build a render uses.
#
# WHY THIS EXISTS. renderFrame(n) is pure in n and probe-purity.mjs proves it adversarially
# (docs/CRAFT/ENGINE-CHANGES.md), and an outside survey named that the best-evidenced determinism
# story of any HTML-to-video tool it looked at. That claim is only as strong as the browser doing the
# rendering: internal/scene/scene.go:229 reads CHROME_BIN straight from the environment with no
# version check at all. Two machines, or the same machine after an unattended Chrome auto-update,
# can render the same JSON to two different snapshots with nothing on record to blame it on.
#
# THE DECISION: pin AND record, not refuse-on-unknown. A hard refusal on any version drift is the
# wrong default for a solo/small-team repo where Chrome auto-updates outside anyone's control; it
# would turn "Chrome updated itself" into "the renderer stopped working" with no render produced
# either way. Recording is strictly cheaper and strictly more useful: every render's actual Chrome
# version lands in out/chrome-versions.log, so a snapshot mismatch is attributed to a version instead
# of investigated as a phantom bug. CHROME_STRICT=1 upgrades the pin mismatch to a hard refusal for
# whoever DOES want that (CI, a release cut).
set -eu
TARGET="${1:-render}"
PIN_FILE=".chrome-version"
LOG_FILE="out/chrome-versions.log"
mkdir -p out

if [ -z "${CHROME_BIN:-}" ]; then
  for c in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    google-chrome-stable google-chrome chromium-browser chromium; do
    if [ -x "$c" ] 2>/dev/null || command -v "$c" >/dev/null 2>&1; then
      CHROME_BIN="$c"
      break
    fi
  done
fi

if [ -z "${CHROME_BIN:-}" ]; then
  # No Chrome found by this script's search. Say nothing more: chromedp will do its own PATH lookup
  # and its own refusal, with a real error, if it can't find one either.
  exit 0
fi

VERSION="$("$CHROME_BIN" --version 2>/dev/null || echo unknown)"
MAJOR="$(echo "$VERSION" | grep -oE '[0-9]+' | head -1 || true)"

printf '%s  %-10s  %-40s  %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TARGET" "$VERSION" "$CHROME_BIN" >> "$LOG_FILE"

if [ -f "$PIN_FILE" ]; then
  PINNED="$(tr -d '[:space:]' < "$PIN_FILE")"
  if [ -n "$PINNED" ] && [ -n "$MAJOR" ] && [ "$MAJOR" != "$PINNED" ]; then
    MSG="chrome-pin: running Chrome major $MAJOR ($VERSION), pinned to $PINNED in $PIN_FILE"
    if [ "${CHROME_STRICT:-0}" = "1" ]; then
      echo "$MSG - refusing (CHROME_STRICT=1)" >&2
      exit 1
    fi
    echo "$MSG - continuing, recorded in $LOG_FILE (CHROME_STRICT=1 refuses instead)" >&2
  fi
else
  echo "$MAJOR" > "$PIN_FILE"
  echo "chrome-pin: no $PIN_FILE yet; pinning to the Chrome on this machine ($VERSION)" >&2
fi

export CHROME_BIN
