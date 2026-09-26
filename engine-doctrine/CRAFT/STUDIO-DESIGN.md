---
when: "you are about to add a feature to `make studio`, or you want to know why a feature other video editors have is deliberately absent here"
answers: "a COPY / REJECT table with a reason per row · a ranked build list for `studio/server.mjs` with costs · the three to build first"
group: reference
---

# STUDIO DESIGN: what our studio deliberately takes, and what it refuses

## AGENT SUMMARY

- Read this before adding a feature to `make studio` (`studio/server.mjs`): it holds the COPY/REJECT
  verdict (§2) and the ranked build list with costs (§3) for every candidate feature, each with a reason.
- `make studio`'s server (`studio/server.mjs`) has no build step, no dependency, no framework; the page
  is split into `studio/page.mjs` plus `studio/ui/shell.html`, `studio.css` and `studio.js` for syntax
  highlighting and a linter, and ships dark-only, no light/dark toggle. A feature that needs a bundler, a
  component tree, or a second way to say what the JSON already says is a bad borrow, no matter how good
  it looks in another editor.
- Checkable action: before building, find your feature's row in §2; if it says REJECT, read the reason
  before reopening the question. `[ref: studio/server.mjs]`

Other developer-facing video editors exist, further ahead on features, built on formats ours does not
use. This file states which editing decisions belong here, and why, on this engine's own terms.

**The constraint that decides every row below.** `make studio`'s Node server has no build step, no
dependency, no framework; the page it serves is dark-only, no light/dark toggle. The scene it edits is
a JSON file that a human or an
agent opens and edits directly. A feature that needs a bundler, a component tree, or a second way to
say something the JSON already says is a bad borrow, no matter how good it looks in another editor.

---

## 1. Where ours stands

`make studio` today: the real engine in an iframe driven by its own `renderFrame(n)`, a scrubber, a
timeline of one bar per layer with cuts and seams and stings on the ruler, enter and exit ramps shaded
off the settled middle, dead-air holes painted as hazard bands from the real `quality/gates/beat-check.mjs`
findings, a picker that hit-tests the frame and hands back the exact authored JSON, and one write:
drag a selected layer and a motion key lands on disk through the surgical text patcher in
`harness/author/patch-motion.mjs`, with a whole-file undo stack.

Two things worth naming. The bars are read from the LIVE DOM, so they show what the engine really did
rather than what the JSON asked for, including a window the beat wrapper held open. And the patcher
never re-serialises: one key moved is one line changed, and the file's hand formatting survives.

`engine-doctrine/CRAFT/KEYED-MOTION.md` already names the gaps and they are the right ones: no curve editor, no
motion path, no onion skin, no key deletion. Add to that list: no live reload, no way to add a layer,
no search over the effects, the blocks or the themes, no undo outside the key endpoint, and no way
for the agent driving the session to read what the person clicked.

The plan and the film are still in two places. `make panels` renders the storyboard as a grey sheet and
`make animatic` cuts it to a scratch read, but neither reaches the studio page.

## 2. COPY / REJECT

| Verdict | Feature | Reason |
|---|---|---|
| COPY | reload on file change, playhead kept | The single largest cost in the loop today is "edit the JSON, hit reload". `reloadScene()` already restores the frame, so this is a watcher and a message. Restoring the playhead automatically on refresh is the finished answer; build the watcher, not a new way to keep the frame. |
| COPY | a selection endpoint the agent reads | The picker already computes the answer and then strands it in the browser. The person clicks, the agent reads a stable index and the frame, and nobody describes a position in prose. The strongest idea behind this whole file. |
| COPY | name the failure instead of returning empty | Studio already learned this once when a boot error sat one property away from a blank stage. Apply it to every new endpoint. |
| COPY | in and out points that bound playback and the draft render | Cheap on a scrubber that already owns the clock, and it makes iterating on one beat of a 30s film possible. |
| COPY | a per-layer hide toggle | Answers "what is under that" without editing the file. Ours stays preview-only (see the REJECT row). |
| COPY | onion-skin proof of a move | `make reveal` proves this reads well as a sheet. On a selected layer in the studio it is the thing that makes a keyed track legible. |
| COPY | search by intent, not a browse grid | `node harness/author/arsenal.mjs --census` prints how many named things exist across how many vocabularies, and how many of them are blocks; too many to browse. Rank them against a plain-English description of the beat. `engine-doctrine/EFFECTS.md` and `blocks/index.mjs` are already the index. |
| COPY | one implementation, two surfaces | Studio's write path must call the same functions the CLI authoring scripts call, exactly as it re-runs `quality/gates/beat-check.mjs` rather than restating its rules. A second definition drifts. |
| COPY | stop at the preview and wait for approval | Already our doctrine (`make judge`). Any render button added to the studio must not become a reason to skip the eye. |
| REJECT | a schema-generated prop form | That control only makes sense when props live in typed source and cannot be edited as text. Ours are JSON already: the picker shows the authored object, and a generated form would be a second, lossier view of the same bytes. |
| REJECT | greyed-out controls and an "edit-friendly code" style guide | That limit is a tax on write-back into a program. Writing into JSON has no such tax, so importing the UI that apologises for it would import a problem we do not have. |
| REJECT | dragging a bar to retime a clip | A layer's window is set by `start`, by the beat it belongs to, and by junction binding in `core/timeline/junctions.js`. A drag would be a second way to say a start time, which is exactly the drift this repo keeps paying for. |
| REJECT | a render queue panel | We render one film at a time from a Makefile, and `make ship` is the ladder. A queue in the editor duplicates the ladder without its gates. |
| REJECT | an easing editor | Real value, wrong order. Curves matter once dense keys are cheap and deletable; today they are neither. Revisit after the keyframe items land. |
| REJECT | a hide toggle that also hides in the render | Non-destructive in preview is a viewing aid. The same flag reaching the render is a second way to say a duration, and it is invisible in the JSON diff. |
| REJECT | an "Ask AI" panel in the editor | The agent is already outside the browser driving the session. Build the context endpoint it can read; do not build a chat box inside a template literal. |
| REJECT | a second lightweight player | Ours is one file with no build step and no editor chrome to shed. Splitting it buys nothing and doubles the surface. |
| REJECT | a flag that turns the editing half off | A second mode nobody runs is a second mode nobody tests. Every write here is undoable and surgical; that is the safety. |
| REJECT | a light-mode toggle | The shipped chrome is dark-only, a deliberate creative-tool look; vawe's own white-first product identity lives in the rendered films, not in the tool that edits them. |

## 3. The ranked build list

Cost is measured against this one file with no build step.

| # | Item | Cost | Unblocks |
|---|---|---|---|
| 1 | **Reload on change.** Watch the scene file, push a line over Server-Sent Events, call the existing `reloadScene()` so the frame is kept. Refresh the timeline model in the same beat. | cheap | Every other item. The edit-and-reload tax is paid on every single change today, and it is the reason people scrub less than they should. |
| 2 | **A selection endpoint.** `GET /api/selection` returns the current layer index, its authored object, the frame and time, and the picker's hit box, or `{"selection":null,"code":"no-selection"}`. The page POSTs it on every pick. Print the curl line in the studio banner. | cheap | The context hand-off the owner asked for. A person clicks the wrong thing on screen and the agent knows exactly which layer it is, without a screenshot or a description. |
| 3 | **Generalise the write.** `POST /api/set {layer, path, value}` on top of `propSpan` and `layerSpan`, which `harness/author/patch-motion.mjs` already exports. Every write pushes the whole file onto the existing undo stack, so undo covers everything at once. | medium | Editing a number without leaving the studio, and items 5, 6 and 8, which are all writes. |
| 4 | **The plan beside the film.** Draw the storyboard's beat spans as a band on the timeline ruler, and put the `make panels` sheet behind a key as an overlay. The storyboard path is already resolved by the authoring ladder. | medium | Seeing the promise and the render on one clock, which is the question `plan-check` answers in text and nobody reads at the moment of the edit. |
| 5 | **In and out points.** `i`, `o`, `x` on the scrubber. Playback loops the range, and the range is offered as the draft render window. | cheap | Iterating on one beat of a long film instead of scrubbing past it every time. |
| 6 | **Search the arsenal.** A key opens a box, you type what the beat should do, and the studio ranks effects, blocks and themes by word overlap against their own descriptions. Selecting one copies the JSON snippet; it does not insert it. | medium | The named things counted by `node harness/author/arsenal.mjs --census`, currently reachable only by reading a generated file. Rank by intent, don't auto-install. |
| 7 | **Per-layer hide.** A toggle on each bar, preview only, held in the page, never written to disk. | cheap | Answering "what is behind that" during a layout argument. |
| 8 | **Key deletion and key drag.** Click a tick on a bar to select the key, delete it, or drag it along the bar to retime. Same patcher, same undo. | medium | The other half of the one interaction we already have. Dense keys are cheap to place today and expensive to correct. |
| 9 | **Onion skin.** For the selected layer, draw its position at N sampled frames as ghosts over the stage. | medium | Reading a keyed track as a path, which is the thing a bar with ticks cannot show. |
| 10 | **Add a layer.** A key inserts a skeleton layer of a chosen type at the playhead, written through the patcher. | medium | The gap between "the studio can edit a film" and "the studio can build one". Worth doing after 3 and 6, because a picker without search would just paste `rise` and `fade` again. |
| 11 | **Draft render from the page,** with progress in the transport and the mp4 path printed. One render, no queue. | medium | Closing the loop for a person who is not in the terminal. Deliberately below the editing items. |
| 12 | **A sound lane.** Waveform of the bed under the ruler, once films here carry sound. | medium | Cutting picture to sound in the same view. Low today because most films ship mute. |
| 13 | **Multi-select.** | medium | Little. Listed so it is visibly ranked last rather than forgotten. |
| 14 | **An easing editor.** | expensive | Nothing until 8 and 9 exist. |

## 4. The three to build first

**Reload on change**, because it is the tax on every other change. Everything in this file is about
shortening the loop between a thought and a picture, and today that loop still runs through a browser
reload the author has to remember. It is a file watcher, one Server-Sent Events route, and a call to a
function that already exists.

**The selection endpoint**, because it is the highest-value idea in this document and we are one small
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
