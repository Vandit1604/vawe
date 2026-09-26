---
when: changing the studio UI, adding a panel, or working out where its code lives
answers: "what studio/ is: the author-facing local preview server and its shell, split into a server, a page assembler and real css/js files"
group: engine
---

# studio/

The live scrubbable preview for one scene: a static server, a plan/make/look/ship/sound shell, and a
timeline, so a film can be inspected before it is ever rendered.

```
make studio D=films/scene/<file>.json [PORT=8799]
```

Open the printed URL, leave it running (Ctrl-C to stop). See `AGENTS.md` for the authoring
stages; studio's `plan` state serves stage 2, plan, and its `sound` state serves stage 6, direct.

## The five states

One scene, one playhead, five things you might be doing with them (`studio.js:setState`, key `1`-`5`):

| key | state | what it shows |
|---|---|---|
| 1 | plan | the storyboard's beats as real rendered frames, for sign-off before anything is built |
| 2 | make | the scrubbable preview + timeline: drag a keyframe, pick a backdrop, edit motion by eye |
| 3 | look | contact sheets: beats, key frames, seams |
| 4 | ship | the beat-check gate's findings and the `make ship` command |
| 5 | sound | every cue the render will mix, in time order, each with a play button and a picker |

`sound` reads `window.__engine.meta.sfx`, the SAME list `films/scene/scene.js`'s `buildSfx()` hands
the render (cuts, seams, stings, the keystroke train, `audio.tactile`'s derived cues, and any
hand-placed `audio.cues[]`), so it can never claim a different mix than the one that ships. What
each row means (`cueWhy` in `studio.js`) is reconstructed from the timeline model this pane already
holds (layers, including group children, transitions, camera, typing) and can only mislabel a row,
never change what plays. Clicking a row's time seeks the playhead and switches to `make`, so the
frame a sound lands on is on screen while you audition it. Choosing an alternative (one of the 28
cues `make audio` bakes) writes an `audio.cues[]` entry through `/api/apply`, same as every other
write in this file, so undo still works; a cue whose `.wav` is not baked says so in the row with the
`make audio` command that fixes it, rather than failing silently.

## Layout

```
studio/
  server.mjs      the http server: routes, the gate run behind the timeline, the write side
  page.mjs        assembles the shell from ui/shell.html + injects the per-scene dynamic bits
  ui/
    shell.html    the markup: top bar, icon sidebar, property panel, preview + transport, timeline
    studio.css    all of it, dark only, tokens measured off the reference
    studio.js     the browser code: scrubbing, the timeline model, the write-back to the JSON
```

## The look, and where it came from

The layout follows a reference video editor 1:1 in structure (top bar with the stage chip where an
Export button sits, an icon sidebar for plan, make, look and ship, a property panel of label-left rows
on inset fields, the preview on a raised panel with the transport centred under it, a timeline of
coloured clip pills). Its artwork, avatars, logo, collaborator cursor and browser chrome were not
copied. The colour tokens in `studio.css` were sampled from the reference pixels, not guessed.

There is no light theme. It was removed with its toggle, its `THEME` variable and its stored choice.

Built by ECC's generator/evaluator loop. ui-skills consulted: `interface-design` (used: elevation
steps, inset fields darker than their panel, low-alpha hairlines, one accent) and `baseline-ui`
(principles only: tabular numerals, aria-label on icon buttons, one accent per view). Its stack
(Tailwind, motion/react, Base UI) was refused: the studio is plain CSS and JS.

`studio.css` and `studio.js` are plain static files, served by the same repo static handler every
other dev tool uses (`harness/lib/render-harness.mjs`); `server.mjs` only special-cases them to keep
the `Cache-Control: no-store` the shell has always needed, since they are edited while being looked at.

## Extending it

A new left-rail panel or a timeline feature touches `ui/shell.html` (markup) and `ui/studio.js`
(behaviour) without touching `server.mjs`, unless it needs a new server endpoint. Those live in
`studioRoutes` in `server.mjs`, one `if (url === ...)` block per route.

`studio/` is dev tooling only: it does not touch the renderer or the determinism contract, and it is
not shipped in either Docker image (`.dockerignore` never included `harness/dev`, its previous home,
and does not need to include `studio/` either).
