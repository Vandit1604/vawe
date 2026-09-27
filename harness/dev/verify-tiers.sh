# harness/dev/verify-tiers.sh: the gate tiers, sourced (not executed) by BOTH .githooks/pre-push and
# `make verify-batch`, so "the full tier" has exactly one definition. Before this, VAWE_FULL=1 took
# ~40 minutes running INSIDE pre-push, and GitHub drops an idle SSH connection well before that: the
# hook still exits 0 (the push itself already landed the first time it managed to complete a round
# trip; a later retry is what actually stalls) so nothing lands and nothing says why. `make
# verify-batch` runs this same tier with no SSH connection depending on it staying open, and stamps the
# commit it verified; pre-push then only has to trust that stamp instead of re-running 40 minutes of
# gates under the same time pressure that broke the last four attempts.
FAST="schema-check doc-refs skill-reach word-action discovery generated-check no-emdash mistakes-check rung provenance skill-check rule-length"
FULL="craft-coverage coverage arsenal-check scenes-json docker-check prop-probe seo-surface sfx-check glyphs-audit sim-audit docker-context judge-census inert-check"

# run_full_tier: make test + bench-fast, audit-test, then every FAST+FULL gate. Returns non-zero on
# the first failure. This is exactly what pre-push's VAWE_FULL=1 branch ran inline before this file
# existed; e2e is NOT in here because pre-push already runs it separately, scoped to the pushed range
# (quality/gates/e2e-check.mjs), so it stays out of this shared function to keep that scoping intact.
# `make verify-batch` runs e2e itself, unscoped, alongside this.
run_full_tier() {
  make test bench-fast || return 1
  make dev-tool X=audit-test || return 1
  for g in $FAST $FULL; do
    make check GATE="$g" || return 1
  done
}

# stamp_message_for <sha>: empty if <sha> carries no verify-batch stamp, else the line pre-push prints.
# Its own function, not inlined in pre-push, so tests/dev/verify-stamp.test.mjs can exercise the
# decision directly without running push-guard, site-build-check or an actual push.
stamp_message_for() {
  stamp=".vawe-data/verified/$1"
  [ -f "$stamp" ] && echo "verified by make verify-batch at $(cat "$stamp")"
}
