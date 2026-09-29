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
| `make look D=<file>` / `make dev-tool X=frame D=<file> N=<n>` | storyboard / one frame to eyeball |
| `make check GATE=render-verify` | render integrity (dims/fps/codec/audio) + safe-zone + contact sheets |
| `make gen X=review` | fast snapshot: lib-test + audit + a master overlay sheet (`/tmp/review.png`) |
| `make media X=filmstrip VIDEO=<file>.mp4 FPS=4` | a still every 0.25s, tiled into one sheet (`FPS=2` for one every 0.5s) |
| `make study REF=<fragment.html> PROBE=1 AT=<s> SEL=<css>` | box, opacity, transform, filter and every active animation's progress for one selector at one instant |
| `make study REF=<fragment.html> LOOK=<s,s,...> [COMPARE=<ref.mp4>]` | stills at named times, before you touch motion; paired against the reference at the same times when given |
| `make study REF=<fragment.html> LAYOUT=<s,s,...>` | clipped/overflowing text, text overlapping text, off-frame elements, stacked opaque shots |

**Always eyeball frames** (storyboard or `/tmp/review.png`), don't claim "looks good" unrendered.
If the audit flags overlap/overflow, fix with the spacing tokens and re-run. Mark new key text
`data-layer="critical"` so the audit can see it.

A long QA job (a full render, a judge pass) needs the foreground or the tool's own background
handoff: each Bash call is a fresh shell, so a plain `cmd &` in one call has no `wait` a later call
can see.

See `engine-doctrine/CODEMAPS/ARCHITECTURE.md` for the full system map.
