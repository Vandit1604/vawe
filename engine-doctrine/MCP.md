---
when: driving this engine from a fresh session over MCP rather than from the shell
answers: "one-time setup · registering the server · the tools it exposes"
group: process
---

# Making a video from a fresh Claude session

Vawe runs as an MCP server. Your Claude writes the scene JSON; the server expands blocks, runs the
gates, and renders. Drafts are free and watermarked. Export is the paid step.

---

## One-time setup

```bash
cd /Users/vandit/Developer/code/shortwave
make build         # bin/vawe (Go + chromedp + ffmpeg)
make media X=watermark     # assets/watermark/draft.png
node mcp/smoke.mjs # renders a real 2s scene, draft + export. Must print "smoke passed".
```

`ffmpeg` and `ffprobe` must be on PATH.

## Registering it

Already done for this repo, at project scope (`.mcp.json`). **The first time you run `claude` here it
will ask you to approve the server. Say yes.** Check with:

```bash
claude mcp list          # expect:  vawe: node …/mcp/server.mjs - ✔ Connected
```

To use it from any directory instead:

```bash
claude mcp add vawe --scope user -- node /Users/vandit/Developer/code/shortwave/mcp/server.mjs
```

---

## The prompt to paste into a fresh session

> You have a `vawe` MCP server that renders videos.
>
> 1. Call `vawe_guide` first, once. It returns a short reference: the scene shape, the traps, and the
>    effect vocabulary. Everything you write must come from it. Do not invent names. Only call it
>    again with `detail: "full"` if you need a prop the short page does not list.
> 2. Gather assets. `vawe_reflect(url)` reads a brand's real colours and fonts. `vawe_logo(slug)`
>    fetches a company mark. `vawe_photo(query)` gets an openly-licensed photo. `vawe_upload` takes
>    your own file. Each returns an `src` (or a palette) to use.
> 3. Browse `vawe_capabilities` for a block you can drop in, and `vawe_examples` for a scene to learn
>    structure from. Then write the scene JSON yourself and call `vawe_draft`. You get back a watermarked video
>    and every gate verdict.
> 4. **Read the gate output and fix what it says.** Call `vawe_draft` again with the same `video_id`
>    to revise. Note that `vawe_draft` returns immediately and renders in the background: poll
>    `vawe_status(video_id)` until it says drafted. Drafts are free, so iterate until it is actually
>    good. Three or four passes is normal; one is usually not enough.
> 5. When it is right, call `vawe_export` with the `video_id` for the clean file.
>
> I want: **<describe the video: what it is for, how long, landscape or portrait, what it must say>**

Fill in the last line and let it work.

---

## What good iteration looks like

The point of free drafts is that the first render is never the final one. The reference film in this
repo took about ten passes, and each fixed something real: an effect that was invisible at its default
strength, a two-second dead frame at the end, a count on screen that had gone stale.

So expect your Claude to draft, look at the gate report, and draft again. If it exports on the first
try it probably has not looked at anything.

## Bringing your own assets

`vawe_upload` takes a base64 file and returns a `src` for a layer. Images and fonts, 12MB cap, type
sniffed from the bytes rather than the name. This is how a launch video carries the customer's logo
and screenshots, which is most of what makes it theirs.

## Reading the gate report

`vawe_draft` returns four verdicts. Only the first can stop a render.

| Gate | Meaning |
|---|---|
| **validate** | Schema and hard rules. **Blocks the render.** Fix and resubmit. |
| **audit** | Contrast, overlap, safe zone, text too small. Advisory but almost always worth fixing: it catches text nobody can read. |
| **slop** | The anti-generic detector: overused fonts, purple gradients, everything centred. Advisory taste opinion. |
| **ledger** | Does this design repeat one already shipped? Advisory. |

Advisory means the video still rendered. It does not mean ignore it.

## Mistakes a fresh model makes on the first try

These are the ones seen most often. Every one of them is caught by a gate, but knowing them saves a
round trip.

- **Em-dashes in on-screen text.** Hard fail, always. Use a comma, a period, or `·`.
- **Forgetting `"module": "scene"`.** Every scene starts with it.
- **`dy` / `dx` without `anchor`.** Silently ignored. Three lines all land on top of each other.
- **A text layer with `w` but no `align`.** It left-aligns inside its box and reads off-centre.
- **Claiming a number the video does not show.** If the copy says "26 effects", 26 effects had better
  appear, and the number had better still be true.
- **Using an effect that cannot be seen at the size it renders.** A displacement wash on a smooth
  photo is invisible; a glow look on dark content has nothing to glow. If it does not read, pick
  another one.

## Timing

Renders are real work: roughly 30 frames a second of finished video, each captured in headless Chrome
at 2x supersample. A 15-second landscape scene takes a couple of minutes on a laptop. The tool call
blocks while it runs, so expect the session to sit there.

## Where the files land

Under `.vawe-data/` (gitignored): `scenes/`, `drafts/`, `exports/`, `records/`. `vawe_draft` returns a
`file://` URL unless `VAWE_PUBLIC_BASE` is set to a delivery host.

## Config

| env | default | |
|---|---|---|
| `VAWE_DATA` | `.vawe-data/` | where records and renders live |
| `VAWE_OWNER` | `anon` | owner tag on videos from this connection |
| `VAWE_PUBLIC_BASE` | unset | URL prefix for delivery; unset returns `file://` |
| `VAWE_BILLING` | `off` | `on` requires payment before export |
| `VAWE_CHECKOUT_URL` | unset | required when billing is on |

Billing is **off** by default, so `vawe_export` works immediately while you are testing.

## If it does not work

| Symptom | Cause |
|---|---|
| `⏸ Pending approval` | Run `claude` in the repo and approve the server. |
| `watermark sheet missing` | `make media X=watermark` |
| `render failed` with no detail | `make build`, then `node mcp/smoke.mjs` to see the real error |
| guide comes back ~5KB | Correct. That is the short reference. `detail: "full"` gives the 46KB one. |
| guide comes back empty | `engine-doctrine/SCENE-QUICK.md` is missing |
| tool call hangs | It is rendering. See Timing above. |

## Why the guide is short

`vawe_guide` returns about 5KB by default, not the 46KB schema. A model that spends its context
reading every prop has less left for the thing it was asked to make, and the first draft does not need
the schema: it needs the shape, the traps that render wrong without erroring, and which effects
actually read on screen. That is [`SCENE-QUICK.md`](SCENE-QUICK.md). `detail: "full"` is there for the
second question, not the first.

More detail on the architecture and what stays server-side: [`../mcp/README.md`](../mcp/README.md).
