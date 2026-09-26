---
when: "about to declare a scene done"
answers: "the exact QA commands to run, and what each one checks"
group: skill
---

# QA loop, run before declaring a scene done

| command | checks |
|---|---|
| `make check GATE=probe M=<fmt>` | render-order **purity** (must pass, protects sharded rendering) |
| `make check GATE=audit [M=<fmt>]` | **overlap / overflow / safe-zone / tight-spacing** on `[data-layer=critical]`; overlays → `/tmp/audit/<fmt>.png` |
| `make look D=<file>` / `make frame D=<file> N=<n>` | storyboard / one frame to eyeball |
| `make check GATE=render-verify` | render integrity (dims/fps/codec/audio) + safe-zone + contact sheets |
| `make gen X=review` | fast snapshot: lib-test + audit + a master overlay sheet (`/tmp/review.png`) |

**Always eyeball frames** (storyboard or `/tmp/review.png`), don't claim "looks good" unrendered.
If the audit flags overlap/overflow, fix with the spacing tokens and re-run. Mark new key text
`data-layer="critical"` so the audit can see it.

See `engine-doctrine/CODEMAPS/ARCHITECTURE.md` for the full system map.
