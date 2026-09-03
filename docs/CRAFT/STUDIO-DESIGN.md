---
when: "you are about to add a feature to `make studio`, or you want to know why a feature the other video editors have is deliberately absent here"
answers: "what another engine Studio and another engine Studio really do (interaction model, timeline, refresh loop, assets) · a COPY / REJECT table with a reason per row · a ranked build list for `scripts/dev/studio.mjs` with costs · the three to build first"
group: reference
---

# STUDIO DESIGN: what to take from another engine and another engine, and what to refuse

Two other systems ship a developer-facing video editor. Both are far ahead of ours on features, and
both are built on a format ours does not have. This file reads them, then says which of their
decisions belong here.

**The constraint that decides every row below.** `scripts/dev/studio.mjs` is ONE file: a Node server
plus a page written as a template literal, no build step, no dependency, no framework, light theme by
default because vawe is a white-first product. The scene it edits is a JSON file that a human or an
agent opens and edits directly. A feature that needs a bundler, a component tree, or a second way to
say something the JSON already says is a bad borrow no matter how good it is over there.

---

## 1. another engine Studio

`npx another engine studio` on port 3000, shipped inside `@another engine/cli`. It is the editor for a video that
is a React component tree, and every one of its decisions follows from that.

**Finding your way in.** The left sidebar is a composition selector: every `<Composition id="...">`
registered in the root file, grouped into folders. Click to switch, PageUp and PageDown to step,
Cmd-K for a quick switcher over project files. Cmd-B and Cmd-J toggle the two sidebars. The same
sidebar carries the asset browser, the render queue, the props editor and a shortcut sheet.

**Changing a value.** The props editor is the centrepiece. Attach a Zod schema to a composition and
the Studio generates a typed form: strings, numbers, booleans, dates, arrays, unions, enums, colours,
textareas, matrices, with `.min()`, `.max()` and `.step()` shaping each control. With no schema it
infers basic controls from the values in `defaultProps` (since 4.0.516). A JSON tab edits the raw
object and refuses to apply an invalid one. The save button then writes the edited values back into
the `.tsx` source.

That write-back is the whole design, and it is also the whole limit. another engine statically analyses the
source, so it can only rewrite what it can find: `defaultProps` must be inlined into the
`<Composition>` call, styles must be literal objects, `interpolate()` needs hardcoded output ranges,
and a transform must be individual `scale` and `rotate` props rather than the shorthand string. Where
the analyser cannot reach, **the control greys out**. There is a whole documentation page on writing
code the editor can edit. A second mechanism, `visualControl(name, default)`, puts a slider on a
hardcoded constant anywhere in a component and writes the literal back on save; its first argument
must be a static string, for the same reason.

**The timeline.** One row per `<Sequence>`, nested and cascading, labelled by the sequence's `name`
and hideable with `showInTimeline={false}`. Audio and video rows draw waveforms and thumbnails. Since
4.0.475 it is no longer read-only: you can select sequences, props, effects and keyframes, range-select
with Shift, duplicate, copy and paste effects, and drag keyframes horizontally to retime. An easing
editor takes linear, Bezier and spring, and rewrites an easing helper into an explicit Bezier when you
touch it. In and out points (`I`, `O`, `X`) bound playback AND become the default range in the render
dialog. `--disable-interactivity` turns the writing half off.

**The refresh loop.** Fast Refresh on save. The Studio Server watches the files, the composition
re-executes, and the preview updates in place. The playhead survives the refresh, which another engine
changed deliberately. `registerRoot()` has to live in its own file because Fast Refresh re-runs the
whole refreshed module. When the preview stops updating it is almost always the Studio Server having
disconnected, and the docs say so directly.

**Assets and rendering.** Assets are the `public/` folder reached through `staticFile()`, browsed in a
panel, with `getStaticFiles()`, `watchStaticFile()`, `writeStaticFile()` and `deleteStaticFile()`
exposed programmatically. Render is a button and a dialog over every render option including input
props, defaulting to the in-out range; the Renders panel queues, cancels, retries, previews and
reveals output, and shows a stack trace on failure.

**What it refuses to be.** Not an NLE. Jonny Burger's line is that whether you edit interactively,
programmatically or agentically, the code stays the source of truth. So you do not drag a clip to
retime it in the general case: you drag a keyframe whose value the analyser can locate and rewrite.

## 2. another engine Studio

another engine renders video from HTML, and its Studio is served by `npx another engine preview
--background` at a project URL. Read from the eight installed another engine skills, which are the
primary source and are more honest than any write-up.

**Two surfaces, deliberately split.** `preview` opens Studio: the full timeline editor, panels, the
review surface where a person edits by hand. `play` opens the same composition through an embeddable
player component with no editor and no panels, for sharing a link. A third view, `?view=storyboard`
ahead of the project hash, shows the plan as a board of cards and wireframe sketches before any
composition exists. The skill is explicit that the early board is not approval of the final video.

**What Studio shows and writes.** The timeline draws a lane per clip; `data-track-index` is described
in the contract as "a Studio display lane, not a timing constraint", so the picture and the timing are
separated on purpose. An eye icon per element toggles `data-hidden`, which is non-destructive,
reversible, and hides the element in BOTH preview and render. The audio side is a real mixer: an
effect rack per track, a voiceover-carve module at the top of it, automation lanes, and a preview that
runs the same Web Audio graph as the render. The skill states the payoff plainly: one implementation
of each effect, so what you hear while scrubbing is what gets written, and you never tune twice. A
MutationObserver picks up an attribute edited mid-playback.

**The bridge to the agent, which is the best idea in either system.** The human clicks an element in
Studio; the agent then runs `preview --context --json --context-fields selection` and gets back the
selected element's source file, composition path, current timeline time, stable `data-hf-id`, selector,
bounding box, text content and a thumbnail URL. It does not start a server, it reads the running one
and exits. Failure is named rather than guessed: `no-selection` means ask the person to click
something and rerun. There is a rule against inferring the target from a screenshot when the CLI can
give a stable id, and a `--context-detail full` tier for computed styles so the cheap call stays cheap.

**Finding a move.** Before authoring motion by hand you search the registry by intent:
`catalog --query "reveal a headline one line at a time"`, ranked locally, with an optional on-device
semantic tier behind a consented download. The search envelope names which tier answered, and there is
a separate command to report that the catalog had nothing worth installing.

**Diagnostics that are not the editor.** `check` sweeps a seek grid in one browser session for runtime
errors, layout, motion sidecar assertions and WCAG contrast. `keyframes` reports whether a subject's
motion is `flat`, has explicit stops, or follows a path, and `--shot`, `--layout strip` and `--ghost`
produce onion-skin proofs of the movement. `beats` writes a Studio-compatible beat grid from a music
track.

**What it refuses.** Never render because the checks passed: the loop stops at the final preview and
waits for a person to approve. It refuses to guess which track is the voice when two could be, rather
than carving the wrong one. A mix it cannot parse fails the render instead of quietly writing the dry
signal, while preview plays dry so the composition stays workable. There is no time-varying playback
rate: a speed ramp must be preprocessed into a derived asset, and the skill says so instead of faking
it.

## 3. Where ours stands

`make studio` today: the real engine in an iframe driven by its own `renderFrame(n)`, a scrubber, a
timeline of one bar per layer with cuts and seams and stings on the ruler, enter and exit ramps shaded
off the settled middle, dead-air holes painted as hazard bands from the real `scripts/gates/beat-check.mjs`
findings, a picker that hit-tests the frame and hands back the exact authored JSON, and one write:
drag a selected layer and a motion key lands on disk through the surgical text patcher in
`scripts/author/patch-motion.mjs`, with a whole-file undo stack.

Two things it is fair to call better than both. The bars are read from the LIVE DOM, so they show what
the engine really did rather than what the JSON asked for, including a window the beat wrapper held
open. And the patcher never re-serialises: one key moved is one line changed, and the file's hand
formatting survives.

`docs/CRAFT/KEYED-MOTION.md` already names the gaps and they are the right ones: no curve editor, no
motion path, no onion skin, no key deletion. Add to that list: no live reload, no way to add a layer,
no search over the effects, the blocks or the themes, no undo outside the key endpoint, and no way
for the agent driving the session to read what the person clicked.

The plan and the film are still in two places. `make panels` renders the storyboard as a grey sheet and
`make animatic` cuts it to a scratch read, but neither reaches the studio page.

## 4. COPY / REJECT

| Verdict | Feature | From | Reason |
|---|---|---|---|
| COPY | reload on file change, playhead kept | both | The single largest cost in the loop today is "edit the JSON, hit reload". `reloadScene()` already restores the frame, so this is a watcher and a message. another engine made playhead survival a deliberate fix; take the finished answer. |
| COPY | a selection endpoint the agent reads | another engine `preview --context` | The picker already computes the answer and then strands it in the browser. The person clicks, the agent reads a stable index and the frame, and nobody describes a position in prose. Best idea in either system. |
| COPY | name the failure instead of returning empty | another engine `no-selection` | Studio already learned this once when a boot error sat one property away from a blank stage. Apply it to every new endpoint. |
| COPY | in and out points that bound playback and the draft render | another engine `I` / `O` / `X` | Cheap on a scrubber that already owns the clock, and it makes iterating on one beat of a 30s film possible. |
| COPY | a per-layer hide toggle | another engine eye icon | Answers "what is under that" without editing the file. Ours stays preview-only (see the REJECT row). |
| COPY | onion-skin proof of a move | another engine `--ghost` / `--layout strip` | `make reveal` proves this reads well as a sheet. On a selected layer in the studio it is the thing that makes a keyed track legible. |
| COPY | search by intent, not a browse grid | another engine `catalog --query` | 566 effects and 217 blocks cannot be browsed. Rank them against a plain-English description of the beat. `docs/EFFECTS.md` and `blocks/index.mjs` are already the index. |
| COPY | one implementation, two surfaces | another engine audio graph | Studio's write path must call the same functions the CLI authoring scripts call, exactly as it re-runs `scripts/gates/beat-check.mjs` rather than restating its rules. A second definition drifts. |
| COPY | stop at the preview and wait for approval | another engine | Already our doctrine (`make judge`). Any render button added to the studio must not become a reason to skip the eye. |
| REJECT | a schema-generated prop form | another engine Zod editor | It exists because props live in TypeScript and cannot be edited as text. Ours are JSON. The picker shows the authored object; a generated form would be a second, lossier view of the same bytes. |
| REJECT | greyed-out controls and an "edit-friendly code" style guide | another engine static analysis | That limit is a tax on write-back into a program. Writing into JSON has no such tax, so importing the UI that apologises for it would import a problem we do not have. |
| REJECT | dragging a bar to retime a clip | another engine / NLE habit | A layer's window is set by `start`, by the beat it belongs to, and by junction binding in `core/junctions.js`. A drag would be a second way to say a start time, which is exactly the drift this repo keeps paying for. |
| REJECT | a render queue panel | another engine Renders panel | We render one film at a time from a Makefile, and `make ship` is the ladder. A queue in the editor duplicates the ladder without its gates. |
| REJECT | an easing editor | another engine | Real value, wrong order. Curves matter once dense keys are cheap and deletable; today they are neither. Revisit after the keyframe items land. |
| REJECT | hide that also hides in the render | another engine `data-hidden` | Non-destructive in preview is a viewing aid. The same flag reaching the render is a second way to say a duration, and it is invisible in the JSON diff. |
| REJECT | an "Ask AI" panel in the editor | another engine Cmd-I | The agent is already outside the browser driving the session. Build the context endpoint it can read; do not build a chat box inside a template literal. |
| REJECT | a second lightweight player | another engine `play` | Ours is one file with no build step and no editor chrome to shed. Splitting it buys nothing and doubles the surface. |
| REJECT | a flag that turns the editing half off | another engine `--disable-interactivity` | A second mode nobody runs is a second mode nobody tests. Every write here is undoable and surgical; that is the safety. |
| REJECT | dark-first chrome | both | Deliberate. Light is the default because vawe is a white-first product and names the dark creative-tool look as an anti-reference. The toggle stays. |

## 5. The ranked build list

Cost is measured against this one file with no build step.

| # | Item | Cost | Unblocks |
|---|---|---|---|
| 1 | **Reload on change.** Watch the scene file, push a line over Server-Sent Events, call the existing `reloadScene()` so the frame is kept. Refresh the timeline model in the same beat. | cheap | Every other item. The edit-and-reload tax is paid on every single change today, and it is the reason people scrub less than they should. |
| 2 | **A selection endpoint.** `GET /api/selection` returns the current layer index, its authored object, the frame and time, and the picker's hit box, or `{"selection":null,"code":"no-selection"}`. The page POSTs it on every pick. Print the curl line in the studio banner. | cheap | The context hand-off the owner asked for. A person clicks the wrong thing on screen and the agent knows exactly which layer it is, without a screenshot or a description. |
| 3 | **Generalise the write.** `POST /api/set {layer, path, value}` on top of `propSpan` and `layerSpan`, which `scripts/author/patch-motion.mjs` already exports. Every write pushes the whole file onto the existing undo stack, so undo covers everything at once. | medium | Editing a number without leaving the studio, and items 5, 6 and 8, which are all writes. |
| 4 | **The plan beside the film.** Draw the storyboard's beat spans as a band on the timeline ruler, and put the `make panels` sheet behind a key as an overlay. The storyboard path is already resolved by the authoring ladder. | medium | Seeing the promise and the render on one clock, which is the question `plan-check` answers in text and nobody reads at the moment of the edit. |
| 5 | **In and out points.** `i`, `o`, `x` on the scrubber. Playback loops the range, and the range is offered as the draft render window. | cheap | Iterating on one beat of a long film instead of scrubbing past it every time. |
| 6 | **Search the arsenal.** A key opens a box, you type what the beat should do, and the studio ranks effects, blocks and themes by word overlap against their own descriptions. Selecting one copies the JSON snippet; it does not insert it. | medium | The 566 effects that are currently reachable only by reading a generated 849-line file. Copy the ranked-search shape, not the auto-install. |
| 7 | **Per-layer hide.** A toggle on each bar, preview only, held in the page, never written to disk. | cheap | Answering "what is behind that" during a layout argument. |
| 8 | **Key deletion and key drag.** Click a tick on a bar to select the key, delete it, or drag it along the bar to retime. Same patcher, same undo. | medium | The other half of the one interaction we already have. Dense keys are cheap to place today and expensive to correct. |
| 9 | **Onion skin.** For the selected layer, draw its position at N sampled frames as ghosts over the stage. | medium | Reading a keyed track as a path, which is the thing a bar with ticks cannot show. |
| 10 | **Add a layer.** A key inserts a skeleton layer of a chosen type at the playhead, written through the patcher. | medium | The gap between "the studio can edit a film" and "the studio can build one". Worth doing after 3 and 6, because a picker without search would just paste `rise` and `fade` again. |
| 11 | **Draft render from the page,** with progress in the transport and the mp4 path printed. One render, no queue. | medium | Closing the loop for a person who is not in the terminal. Deliberately below the editing items. |
| 12 | **A sound lane.** Waveform of the bed under the ruler, once films here carry sound. | medium | Cutting picture to sound in the same view. Low today because most films ship mute. |
| 13 | **Multi-select.** | medium | Little. Listed so it is visibly ranked last rather than forgotten. |
| 14 | **An easing editor.** | expensive | Nothing until 8 and 9 exist. |

## 6. The three to build first

**Reload on change**, because it is the tax on every other change. Everything in this file is about
shortening the loop between a thought and a picture, and today that loop still runs through a browser
reload the author has to remember. It is a file watcher, one Server-Sent Events route, and a call to a
function that already exists.

**The selection endpoint**, because it is the highest-value idea in either system and we are one small
route away from it. The picker already computes the exact authored object under the cursor and then
throws it away when the tab closes. Exposing it turns the studio from a thing an agent starts into a
channel the agent and the person share: they click, we read the index, and nobody describes a position
in English again.

**The generalised write**, because the machinery is built and pointed at one field. `patch-motion.mjs`
already finds the character span of any property of any layer and replaces those bytes without
reformatting the file, and the undo stack already keeps whole previous contents. Aiming it at every
scalar is a small diff that turns four later items from features into forms over an endpoint that
already works.

What those three have in common is the reason to do them first: none of them adds a second way to say
anything. They make the existing way faster to reach, faster to see, and readable by the other party in
the room.
