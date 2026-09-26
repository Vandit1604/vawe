#!/usr/bin/env bash
# Custom merge driver for a generated file (git config merge.vawe-generated.driver).
# Generated files conflict on every merge that touches two branches' generators, costing a full
# regen cycle each time, when the real content is a deterministic function of source files neither
# side is fighting over. So this driver keeps OUR side untouched (%A already holds it; doing nothing
# to that file is the "keep ours" resolution) and records the path so the post-merge hook can run
# `make regen` once, after the merge, instead of a person resolving each generated file by hand.
set -euo pipefail
path="$4"  # %P: the path git attaches this driver to, from .gitattributes
git_dir="$(git rev-parse --git-dir)"
echo "$path" >> "$git_dir/vawe-regen-pending"
exit 0
