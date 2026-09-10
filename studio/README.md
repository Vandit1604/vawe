---
when: changing the studio UI, adding a panel, or working out where its code lives
answers: "what studio/ is: the author-facing local preview server and its shell, split into a server, a page assembler and real css/js files"
group: engine
---

# studio/

The live scrubbable preview for one scene: a static server, a plan/make/look/ship shell, and a
timeline, so a film can be inspected and approved before it is ever rendered.

```
make studio D=formats/scene/<file>.json [PORT=8799] [THEME=dark]
```

Open the printed URL, leave it running (Ctrl-C to stop). See `AGENTS.md` for the eight authoring
stages; studio's `plan` state is stage 3, approval.

## Layout

```
studio/
  server.mjs      the http server: routes, the gate run behind the timeline, the write side
  page.mjs        assembles the shell from ui/shell.html + injects the per-scene dynamic bits
  ui/
    shell.html    the markup (a left rail of panels, the preview + transport, the timeline)
    studio.css    all of it, one true-grey colourist's room
    studio.js     the browser code: scrubbing, the timeline model, the write-back to the JSON
```

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
