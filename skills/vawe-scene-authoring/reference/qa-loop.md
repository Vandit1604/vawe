---
when: "about to declare a scene done"
answers: "the exact QA commands to run, and what each one checks"
group: skill
---

# QA loop, run before declaring a scene done

| command | checks |
|---|---|
| `make probe M=<fmt>` | render-order **purity** (must pass, protects sharded rendering) |
| `make audit [M=<fmt>]` | **overlap / overflow / safe-zone / tight-spacing** on `[data-layer=critical]`; overlays → `/tmp/audit/<fmt>.png` |
| `make look D=<file>` / `make frame D=<file> N=<n>` | storyboard / one frame to eyeball |
| `make verify` | render integrity (dims/fps/codec/audio) + safe-zone + contact sheets |
| `make review` | fast snapshot: lib-test + audit + a master overlay sheet (`/tmp/review.png`) |

**Always eyeball frames** (storyboard or `/tmp/review.png`), don't claim "looks good" unrendered.
If the audit flags overlap/overflow, fix with the spacing tokens and re-run. Mark new key text
`data-layer="critical"` so the audit can see it.

See `engine-doctrine/CODEMAPS/ARCHITECTURE.md` for the full system map.
