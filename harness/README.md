---
when: you need to know which script does a job, or you are adding, changing or deleting a tool under harness/
answers: "what each harness/ folder and script is for, and which scripts have no verb (run them with node)"
group: engine
---

# harness/

Every script here is reached from `bin/vawe` (verbs in `cli/verbs.mjs`), a git hook, a test or the
list below. A script none of those reaches is dead: delete it.

| Folder | Holds |
|---|---|
| `cli/` | the `vawe` verb table, argument parser and `new` starter |
| `media/` | the renderer (`render-page.mjs`, `page-audio.mjs`), the views (`see.mjs`, `see/`, `see-views.mjs`), the reference measures (`ref-spec.mjs`, `render-spec.mjs`) |
| `lib/` | shared helpers: the gate table (`check-gate.mjs`), the render harness, run logs, judge codes |
| `dev/` | git hooks' helpers (`no-emdash.mjs`, `push-guard.mjs`), `e2e.mjs`, `bench.mjs`, worktree tools, `AGENT-TASK.md` |
| `live/` | Claude Code hooks: `stage-say.mjs` (next command), `code-quality.mjs`, `no-emdash-live.mjs`, `no-blanket-git.mjs` |

## Tools with no verb

Run with `node <path>`; the file header holds the usage. A film rarely needs them.

- `harness/media/tts.mjs` a voiceover file from text
- `harness/media/music.mjs` a music bed by genre
- `harness/media/kie.mjs` a generated image or video
- `harness/media/cutout.mjs` a cutout with the background removed
- `harness/media/ref.mjs` fetch a reference film into `refs/`
- `harness/media/match.mjs` score a render against its reference beat by beat
- `scripts/brand/kit.mjs`, `scripts/brand/palette.mjs`, `scripts/brand/photos.mjs` a brand kit from a site
- `generators/fonts/glyphs.mjs` a glyph table for a font; `generators/media/fonts.mjs` the free fonts
