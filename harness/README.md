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
| `media/` | the renderer (`render-page.mjs`, `page-audio.mjs`), the views (`see.mjs`, `see/`, `see-views.mjs`), `still.mjs` (one full-size PNG of a page or mp4), `storyboard.mjs` (one self-contained HTML board of a page or draft: a card per world, the handoffs, a rhythm strip; its data is `lib/storyboard.mjs`, its page `lib/storyboard-html.mjs`), the reference measures (`ref-spec.mjs`, `render-spec.mjs`) |
| `lib/` | shared helpers: the gate table (`check-gate.mjs`), the render harness, run logs, judge codes |
| `dev/` | git hooks' helpers (`no-emdash.mjs`, `push-guard.mjs`), `e2e.mjs`, `bench.mjs`, worktree tools |
| `live/` | Claude Code hooks: `stage-say.mjs` (next command), `verb-hint.mjs` (names the verb for a hand-made screenshot, link check or contact sheet), `code-quality.mjs`, `no-emdash-live.mjs`, `no-blanket-git.mjs`, `log-read.mjs` (see Hooks below) |

## Hooks

The files in `live/` are Claude Code hooks. This repo does not track a `.claude/settings.json`, so each
user registers them. `log-read.mjs` is a PostToolUse hook: it logs every image the agent Reads under
`out/` to the film's `out/<film>.runs.jsonl`, so `vawe runs` can say which images were looked at.
Register it in your own settings with matcher `Read` and command `node harness/live/log-read.mjs` (run
from the repo root).
`verb-hint.mjs` is a PreToolUse hook (matcher `Bash`, command `node harness/live/verb-hint.mjs`): when a command does by hand what a verb does (a puppeteer or headless Chrome screenshot, a curl status loop, a sleep loop on a render, an ffmpeg contact sheet or frame grab) it adds one line naming the verb. It never blocks and names each verb once per 30 minutes.

## Tools with no verb

Run with `node <path>`; the file header holds the usage. A film rarely needs them.

- `harness/media/tts.mjs` a voiceover file from text
- `harness/media/music.mjs` a music track by genre (only for a user-requested track)
- `harness/media/kie.mjs` a generated image or video
- `harness/media/cutout.mjs` a cutout with the background removed
- `harness/media/ref.mjs` fetch a reference film into `refs/`
- `harness/dev/palette.mjs` the script behind `vawe palette`: a brand seed and how to compose a palette around it
- `harness/dev/bench-capture.mjs` where capture time goes, per render variant
- `harness/dev/check-sweep.mjs` which draft checks fire over many pages, waivers ignored (the false-flag baseline)
- `scripts/brand/kit.mjs`, `scripts/brand/palette.mjs`, `scripts/brand/photos.mjs` a brand kit from a site
- `generators/fonts/glyphs.mjs` a glyph table for a font; `generators/media/fonts.mjs` the free fonts
