# harness/dev/verify-tiers.sh: the gate tiers, sourced (not executed) by BOTH .githooks/pre-push and
# `make verify-batch`, so "the full tier" has exactly one definition. `make verify-batch` runs the full
# tier with no SSH connection depending on it staying open, and stamps the commit it verified; pre-push
# then only has to trust that stamp.
FAST="doc-refs skill-reach no-emdash mistakes-check provenance rule-length"
FULL="seo-surface"

# run_full_tier: make test + bench-fast, then every FAST+FULL gate. Returns non-zero on the first failure.
# e2e is NOT in here: `make verify-batch` runs it itself, next to this.
run_full_tier() {
  make test bench-fast || return 1
  for g in $FAST $FULL; do
    make check GATE="$g" || return 1
  done
}

# stamp_message_for <sha>: empty if <sha> carries no verify-batch stamp, else the line pre-push prints.
# Its own function, not inlined in pre-push, so tests/dev/verify-stamp.test.mjs can exercise the
# decision directly without running push-guard, site-build-check or an actual push.
stamp_message_for() {
  stamp=".vawe-data/verified/$1"
  [ -f "$stamp" ] && echo "verified by make dev-tool X=verify-batch at $(cat "$stamp")"
}
