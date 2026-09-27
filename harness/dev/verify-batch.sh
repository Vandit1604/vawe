#!/bin/sh
# The full push tier as its own step: an SSH push holding a ~40 min pre-push open was dropped by GitHub
# before it finished. On success it stamps .vawe-data/verified/<sha>; a plain `git push` then runs only
# the fast tier.
set -e
. harness/dev/verify-tiers.sh
run_full_tier
make e2e
sha=$(git rev-parse HEAD)
mkdir -p .vawe-data/verified
date -u +%Y-%m-%dT%H:%M:%S.000Z > ".vawe-data/verified/$sha"
echo "✓ verified $sha: make test, audit-test, e2e, and every FAST+FULL gate passed. Now: git push"
