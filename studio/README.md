---
when: changing the studio UI, adding a panel, or working out where its code lives
answers: "what studio/ is: the author-facing local preview server and its shell, split into a server, a page assembler and real css/js files"
group: engine
---

# studio/

The live scrubbable preview for one scene: a static server, a plan/make/look/ship shell, and a
timeline, so a film can be inspected and approved before it is ever rendered.

```
make studio D=formats/scene/<file>.json [PORT=8799]
```

Open the printed URL, leave it running (Ctrl-C to stop). See `AGENTS.md` for the eight authoring
stages; studio's `plan` state is stage 3, approval.

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
