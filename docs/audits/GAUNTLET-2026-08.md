# Architecture gauntlet — confirmed findings

Generated from an adversarial multi-agent audit of the engine. Every finding below was reported by
a surveyor that had to RUN something to claim it, then handed to a separate skeptic whose job was to
REFUTE it. Only survivors are here: 11 of 72 candidates were killed at that stage.

**The audit did NOT clear its own bar.** The bar was fixed before round one and required that a round
find nothing materially new. Round 3 surfaced two fresh high-severity findings, so the honest reading
is that a fourth round would find more.

- rounds: 3 · agents: 87 · confirmed: 61
- severity: medium 30 · low 29 · high 2
- class: stale-doc 23 · silent-substitution 13 · other 11 · wrong-unit 6 · dead-code 4 · error-swallowed 4
- area: truth 23 · pipeline 14 · engine 14 · gates 10

## How to use this file

Each finding carries a `repro` you can run before trusting it, and a proposed `fix`. Verify the repro
first: these were confirmed against the tree as of this audit, and some may already be stale.
Tick the box when done. Pick by severity, or by class if you want to clear one failure mode at a time.

## The two that produce wrong output

> **Most dangerous:** `--alpha` writing a fully opaque file (internal/render/render.go:75-111): it is the only finding where the engine hands back a delivered artifact that is silently, unusably wrong with no error anywhere, and `--bg` plus the `--out *.mp4` alpha-strip are the same defect compounding, so a user's transparent-overlay deliverable fails only once it is already in someone else's timeline.

> **Biggest blind spot:** Every round has audited static code, schemas and docs — nothing has audited rendered output: no round has executed a render and compared the resulting pixels/frames against the scene that was supposed to produce them, which is precisely how the two highs (opaque alpha, mis-sized graphic credit) survived three rounds of reading, and the same blind spot leaves determinism under `--workers`, frame dedup and audio mixing entirely unverified in practice.

---

## HIGH severity

### [ ] boxOf squares a layer that declares only one axis, so visual-vocabulary credits a 590x18 decorative underline as a 10%-of-frame "carrying graphic" and passes the show floor on it

**where** `scripts/gates/scene-timing.mjs:143 (`return { w: known, h: known, how: 'proxy' }`), consumed by scripts/gates/visual-vocabulary.mjs (SUBJECT_AREA) and scripts/gates/critique.mjs (`carries`)`  ·  **area** gates  ·  **class** wrong-unit

**evidence**

> `node scripts/gates/visual-vocabulary.mjs formats/scene/argus-launch.json` prints `2 carrying graphic(s)` — `✓ html: inline <svg>, ~10% of frame` and `✓ html: inline <svg>, ~41% of frame` — and exits 0. Both are single-axis layers squared by the proxy tier. The 10% one is literally `{"type":"html","w":590,"y":726,"html":"<svg viewBox=\"0 0 590 18\" width=\"590\" height=\"18\" ...><path stroke=\"#4772f5\" .../></svg>"}` — its own markup states height 18, real area 590x18 = 0.5% of a 1920x1080 frame, and the gate calls it 590x590. The 41% one is a headline of type (`font:400 107px ...;line-height:1.05;white-space:nowrap`) with an 18px underline squiggle: real height ~112px, real area 7.6%, i.e. below the gate's own 8% subject bar. So the film's entire pass on the FAIL-tier `no-visual-vocabulary` rests on two decorative strokes — the exact case the file's header says must not buy a pass. A library scan shows 62 pictorial layers resolve via `proxy`, and 22 of 138 scenes have NO carrier that is not a proxy square (linear-journey component w=1300 -> 63%, showcase.json board w=1500 -> 54%, tpot-launch 3x component w=880 -> 29% each, ab-control-shotcode doc w=900 -> 34%). The tier also contradicts the module's own stated rule three lines above it: "An undeclared box is an unknown size, not a large one".

**repro**

```bash
node scripts/gates/visual-vocabulary.mjs formats/scene/argus-launch.json   # ✓ 2 carrying graphics, exit 0; then: node -e "const d=require('./formats/scene/argus-launch.json');(function w(l){for(const x of l||[]){if(x&&x.type==='html'&&x.w===590)console.log(x.h,x.html);w(x&&x.children)}})(d.layers)"
```

**fix** Delete the square-proxy guess. When only one axis is declared: (1) for `html`/`svg` read the height the markup states (a `height=".."` attribute, a `viewBox` ratio, an explicit `height:`/`line-height` in the root style) — the argus case is fully determined by its own markup; (2) for `component`/`board`/`doc` read the aspect out of the referenced capture JSON the way `intrinsicAspect` reads a PNG header; (3) otherwise return `how:'unknown'` so the layer lands in the UNMEASURED bucket the gate already prints, instead of being credited.

**survived refutation because** Reproduced exactly. `node scripts/gates/visual-vocabulary.mjs formats/scene/argus-launch.json` → `2 carrying graphic(s)`, exit 0; both carriers are html layers declaring only `w` (590 and 1400) with no `h`, squared by boxOf's proxy tier at scripts/gates/scene-timing.mjs:143. The 590 one's own markup is `<svg viewBox="0 0 590 18" width="590" height="18">`, a decorative underline stroke: real area 0.5% of the 1920x1080 frame, credited at ~10%. I patched a copy at /tmp/vvtest/argus-honest.json with the honest heights (h:18, h:112) and re-ran: `0 carrying graphic(s)`, `✗ [no-visual-vocabulary]`, exit 1 — the second layer lands at 7.6%, just under the gate's own 8% SUBJECT_AREA bar. So the scene's entire pass on a FAIL-tier rule rests on the squaring, and it carries no `authoring.allow` waiver. Refutation attempts all failed: (1) the proxy tier IS documented (docs/MISTAKES.md:3934, #176) but only as a fallback for an "asset unresolvable" case, and here the dimensions are stated inline in the layer's own svg markup, which the intrinsic tier already knows how to parse from src files; its stated safety argument ("clipping makes the proxy guess safe") is what turns the 0.5% underline into a 10% credit, since clipping corrects over-guesses in extent but never in aspect. (2) It contradicts visual-vocabulary.mjs's own `unmeasured-graphic` text, "An undeclared box is an unknown size, not a large one, so crediting it would let a bare src buy a pass" — that principle is applied at zero known axes and abandoned at one. (3) Not stale: HEAD's scene-timing.mjs (last touched a832d8b) has the tier verbatim. (4) Not unreachable: my own scan of formats/scene/*.json excluding generated derivatives found 124 scenes, 51 pictorial layers resolving via `proxy`, and 19 scenes whose only carrying graphic is a proxy square. The `~` printed next to proxy shares warns a human but does not affect the exit code, so the blocking gate is defeated silently.

---

### [ ] --alpha exports a fully opaque "transparent overlay": the required bg canvas is never suppressed, so alpha is 255 on every pixel of every frame

**where** `internal/render/render.go:75-111 (transparent path) + core/tokens.css:44 + formats/scene/scene.js (never reads the alpha flag)`  ·  **area** pipeline  ·  **class** silent-substitution

**evidence**

> `./bin/vawe formats/scene/zerochrome.json --draft --alpha` → "✓ done → out/zerochrome.webm (3.0s, 90 frames · alpha)", exit 0. Measuring the alpha channel across ALL 90 frames:
>   ffmpeg -c:v libvpx-vp9 -i out/zerochrome.webm -vf "format=rgba,alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMIN:file=-" -f null -
>   → lavfi.signalstats.YMIN=255   (single unique value over the whole file)
> Root cause, all three parts verified: (1) formats/scene/schema.json field `bg` is {"required": true, "minItems": 1} — every valid scene has a backdrop; (2) formats/scene/scene.js:148-165 paints bg windows onto a <canvas> inside .stage; (3) the ONLY alpha handling in the engine is core/boot.js:296 adding html.alpha, whose one rule is core/tokens.css:44 `html.alpha, html.alpha body, html.alpha .stage, html.alpha .hs-stage { background: transparent !important; }` — a CSS background property, which cannot clear canvas pixels. `grep -n alpha formats/scene/scene.js` → 0 matches: the only module in the repo never reads the flag.

**repro**

```bash
./bin/vawe formats/scene/zerochrome.json --draft --alpha && ffmpeg -hide_banner -v error -c:v libvpx-vp9 -i out/zerochrome.webm -vf "format=rgba,alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMIN:file=-" -f null - 2>/dev/null | sort -u
```

**fix** In formats/scene/scene.js, read the `alpha` query param and hide the bg canvas + the hand-authored bgHtml when it is set (the `if (!bgWins.length) cv.style.display='none'` branch already proves the transparent path works when nothing paints). Until then, make render.go fail loudly when Transparent is set and the scene declares a bg window, rather than printing "· alpha" over an opaque file.

**survived refutation because** Reproduced independently on two different scenes. `./bin/vawe formats/scene/zerochrome.json --draft --alpha` and `./bin/vawe formats/scene/orbit-proof.json --draft --alpha` both exit 0 with a "· alpha" success line; ffmpeg alphaextract+signalstats over every frame of each webm yields a single value, lavfi.signalstats.YMIN=255, i.e. fully opaque everywhere. Root cause verified on disk: formats/scene/schema.json:71-76 makes `bg` required with minItems 1; formats/scene/scene.js:139-165 paints bg windows onto <canvas id=cv> with a 2D context; the canvas is hidden only at scene.js:165 (no bg windows, unreachable given the schema) and scene.js:486 (only while a hand-authored html window is on screen); `grep -c alpha formats/scene/scene.js` = 0. The lone alpha handler is core/boot.js:296 adding html.alpha, whose only rule is core/tokens.css:44, a CSS `background: transparent`, which cannot clear canvas pixels. Refutation attempts all failed: not documented as intended (docs/CODEMAPS/ARCHITECTURE.md:46 and render.go:22 both promise a transparent overlay; scene.go:502-506 deliberately sets a transparent page backdrop so PNGs carry alpha); not stale (reproduced on the current tree); not unreachable (132 of 144 scene JSONs use preset bg windows); no entry in docs/MISTAKES.md. The scene files being untracked is normal, .gitignore:50 ignores formats/scene/*.json. Additional consequence: --bg-video sets the same transparent flag (render.go:75) and composites this opaque overlay over the background video, so the background video is fully hidden in the output mp4, also with exit 0.

---

## MEDIUM severity

### [ ] A group child's `track` is accepted and never applied — no data-track, no z-index, so children cannot be reordered

**where** `core/layers/util.js:264-269 (addGroupChild)`  ·  **area** engine  ·  **class** silent-substitution

**evidence**

> addGroupChild writes data-start, data-duration, data-anim, data-out, data-enter and data-exitDur onto the child, but never data-track — while core/clips.js:79 is the only thing that writes zIndex (`if (el.dataset.track != null) el.style.zIndex = el.dataset.track`) and formats/scene/scene.js:383 writes it for top-level layers only. Rendered a layout:'free' group with two overlapping rects, red track:50 and blue track:1. At frame 30: [{bg:"rgb(255, 0, 0)", z:""},{bg:"rgb(0, 0, 255)", z:""}] — both zIndex empty, both data-track absent, so paint order is DOM order and the track:50 layer sits UNDER the track:1 layer. `node core/validate.mjs` and `node scripts/gates/layer-props.mjs` both pass the file clean (layer-props blesses `track` because the shared scan finds L.track in scene.js).

**repro**

```bash
printf '{"module":"scene","theme":"default","duration":3,"bg":[{"preset":"paper","from":0,"to":9}],"layers":[{"type":"group","id":"g","x":100,"y":300,"start":0,"duration":3,"layout":"free","w":600,"h":400,"children":[{"type":"rect","id":"red","x":0,"y":0,"w":300,"h":300,"bg":"#f00","track":50},{"type":"rect","id":"blue","x":100,"y":100,"w":300,"h":300,"bg":"#00f","track":1}]}]}' > /tmp/gtrack.json && node core/validate.mjs /tmp/gtrack.json && make studio D=/tmp/gtrack.json   # red (track:50) renders behind blue (track:1); both children have no data-track and no zIndex
```

**fix** One line beside the other dataset writes in core/layers/util.js:264 — `if (C.track != null) c.dataset.track = String(C.track);`. Same argument the file already makes at line 262 about `delay`: the child is a timed element like any other, so it gets the same driver.

**survived refutation because** Reproduced end to end and could not refute it. `node core/validate.mjs` passes the scene with `track:50` on a group child, and that is deliberate blessing, not a blind spot: the same file rejects a junk prop on the same child ("unknown prop \"zzzBogusProp\""), and core/validate.mjs:685-701 states children are validated against the layer schema "because a child is built by the same builder as a top-level layer" (track lives at formats/scene/schema.json:764). A headless probe of the real render path (formats/scene/scene.html, frame 30) gives both children position:absolute, data-track null, computed zIndex "auto" — so track:50 paints under track:1 by DOM order. A control proves z-order IS live for children: replacing the static prop with motion:[{t:0,track:50}] yields computed zIndex 50 (children join the per-frame loop at formats/scene/scene.js:445, keyed track applied at scene.js:576). So only the static prop is dropped, and the motion form is a workaround. Intentionality is refuted by the repo's own record: docs/MISTAKES.md #69 explicitly lists `track` among the props "silently dropped on children" and declares the gap fixed, but core/layers/util.js:264-269 writes start/duration/anim/out/enter/exitDur and omits exactly that one prop, with a comment enumerating the five it did write. Not fixed on disk; not documented as deliberate; not a misreading. Severity capped at medium because a recursive scan of all 100+ formats/scene/*.json found zero group children using `track` — no shipped video is currently wrong — but any author who writes it gets a green gate and a wrong frame, and the fix is one line.

---

### [ ] `motion` keys that state `w`/`h`/`track` are silently dropped on group children — resolveKeyedProps only walks top-level layers

**where** `formats/scene/scene.js:265 (resolveKeyedProps(data.layers)) + scene.js:565`  ·  **area** engine  ·  **class** silent-substitution

**evidence**

> core/sequence.js:53 resolveKeyedProps iterates `layers` flat and never recurses into L.children, and it is called on data.layers only. Group children are built later by addGroupChild and pushed onto `extra`, joining the per-frame loop at scene.js:445 — after the resolve passes have run. Two consequences: the box-track guard at scene.js:565 (`L.motion[0].w != null || ...`) is false for a child whose first key omits w, and motionAt's `own(prop)` returns null unless BOTH endpoints carry the value. Rendered a group child and a top-level rect with the IDENTICAL layer body (w:100, motion [{t:0},{t:2,w:600}]). Frame 0 -> child 100px, top 100px. Frame 60 -> child 100px, top 600px. Second scene, child with motion [{t:0,x:0},{t:2,x:300,w:600,track:9}]: frame 60 gives {w:"100px", z:"", tf:"translate(300px, 0px) scale(1) rotate(0deg)"} — the x half of the same track animates, the w and track halves are dropped. Also skipped for children: the resolveKeyedProps throw "keys w but declares no w, so there is no box to animate from", so the error that exists to prevent exactly this silence never fires inside a group. `node core/validate.mjs` and `node scripts/gates/layer-props.mjs` pass clean. No shipped scene uses it yet (scanned all 116), so this is latent, not live.

**repro**

```bash
printf '{"module":"scene","theme":"default","duration":4,"bg":[{"preset":"paper","from":0,"to":9}],"layers":[{"type":"group","id":"g","x":100,"y":300,"start":0,"duration":4,"layout":"row","children":[{"type":"rect","id":"kid","w":100,"h":100,"bg":"#f00","motion":[{"t":0},{"t":2,"w":600}]}]},{"type":"rect","id":"top","x":100,"y":800,"w":100,"h":100,"bg":"#00f","start":0,"duration":4,"motion":[{"t":0},{"t":2,"w":600}]}]}' > /tmp/gkey.json && node core/validate.mjs /tmp/gkey.json && make studio D=/tmp/gkey.json   # scrub to 2s: the blue top-level rect is 600px wide, the identical red group child is still 100px
```

**fix** Make resolveKeyedProps recurse, the same way core/boot.js:78 already flattens children for pin/col/coord resolution: `(function walk(ls){ for (const L of ls||[]) { visit(L); walk(L.children); } })(layers)`. The `track` identity for a child should be its index within its parent's children. Add the recursion to core/sequence.js so the throw fires for children too.

**survived refutation because** Reproduced on current HEAD via a headless probe of the real scene.html boot. Identical layer bodies (w:100, motion [{t:0},{t:2,w:600}]): top-level rect goes 100->350->600, the group child stays 100px at every frame. Child with motion [{t:0,x:0},{t:2,x:300,w:600,track:9}] at frame 60 yields tf translate(300px,0px) but w "100px" and z "" - the x half of one track animates while w and track are silently dropped. Writing w on BOTH keys by hand makes the child animate 100->350->600, proving the per-frame box-track path at scene.js:565 fully supports group children and the only missing piece is the resolveKeyedProps fill (core/sequence.js:53 never walks L.children; scene.js:265 passes data.layers only, children arrive later via core/layers/util.js:270 -> scene.js:445). The guard is suppressed too: a layer keying w with no declared w fails validate loudly at top level and passes clean as a group child. Counter-arguments all fail: nothing documents a group-child restriction (docs/PRIMITIVES.md:359 documents per-child w/h and group motion; core/validate.mjs:685 states children are deliberately checked against the full layer schema "because a child is built by the same builder"), the code path was read correctly, and it is not fixed on disk. Severity is capped at medium, not high, because a scan of all formats/scene/*.json found zero group children carrying any motion array, so nothing shipped renders wrong today and a fix has no blast radius.

---

### [ ] `make layer-props` is red with 16 false positives: the silent-substitution gate cannot see any prop resolved in a .mjs module

**where** `scripts/gates/layer-props.mjs:29-31 (SHARED_FILES)`  ·  **area** engine  ·  **class** other

**evidence**

> SHARED_FILES globs `formats/scene/*.js` plus three named core files. formats/scene/scene.js:17 imports `resolvePans` from /core/pan-resolve.mjs, and pan-resolve.mjs:115 is the only place `L.panWith` is read — a .mjs, so the scan never opens it. `node scripts/gates/layer-props.mjs` -> exit 1, "16 prop(s) accepted and dropped", every one of them `panWith` on cadence.json (4) and zerochrome.json (12). panWith is fully live: `node -e "import('core/pan-resolve.mjs').then(m=>{const d={layers:[{id:'a',motion:[{t:0,x:0},{t:1,x:100}]},{id:'b',panWith:'a',motion:[{t:0,x:50}]}]};m.resolvePans(d);console.log(JSON.stringify(d.layers[1].motion))})"` prints `[{"t":0,"x":50},{"t":1,"x":150}]`. The gate's own header (lines 24-28) documents that it was blinded once before by a file split and that the fix was to name a directory rather than a file; the same blindness came back through the extension filter. A gate whose whole job is silent-ignore now cries wolf on the one prop it cannot see, which is how the three real findings above stayed invisible.

**repro**

```bash
node scripts/gates/layer-props.mjs; echo "exit=$?"   # exit=1, 16 panWith 'accepted and dropped' — all false
```

**fix** scripts/gates/layer-props.mjs:29 — change the format-directory filter from `f.endsWith('.js')` to `/\.m?js$/.test(f)`, and follow scene.js's `/core/*.mjs` imports the same way `delegatesOf` already follows a builder's `../*.js` imports (widen that regex to `\.m?js`). Then add `panWith` to the self-check list at line 54 so the scan losing it again fails the gate as blind instead of blaming the scenes.

**survived refutation because** Reproduced: `node scripts/gates/layer-props.mjs` exits 1 with 16 findings, all false. Verified both props are live — formats/scene/scene.js:262 calls resolvePans(data), :263 calls resolveBecomes(data). Proved the file-list cause by copying the gate and adding 'core/pan-resolve.mjs' to SHARED_FILES: 16 findings drop to 2. Tried to refute and could not: docs/MISTAKES.md #159 documents this exact gate going blind before (fd397e1) and calls the loud-false-positive mode the worse failure, so it is neither intended nor documented as acceptable; the sentinel self-check at layer-props.mjs:55 only asserts start/duration/motion/anim/out, all of which still resolve, so the gate passes its own blindness check while blind. Reporter's diagnosis is however wrong in two ways: (1) the breakdown is fabricated — actual is cadence-film.json 3, cadence.json 5, zerochrome.json 8, not "cadence.json 4 / zerochrome.json 12"; (2) two of the 16 are `becomes`/`becomesDur`, NOT panWith, and are not caused by the .mjs extension filter at all — resolveBecomes lives in formats/scene/scene.js which IS scanned, and is missed because it names its layer vars `A`/`B` while the read regex at layer-props.mjs:41 only matches LL?/C. So fixing SHARED_FILES alone leaves the gate red. Severity capped at medium: `make layer-props` is not wired into author-check (confirmed by grep over Makefile and scripts/, and stated at MISTAKES.md:3381), so no render ships wrong — it is a broken signal, not a broken render.

---

### [ ] `make schema-check` still scans the 20-line scene.html shell, so 33 of the engine's 161 layer props are outside the drift check

**where** `scripts/gates/schema-drift.mjs:26-28 (engineFiles)`  ·  **area** engine  ·  **class** dead-code

**evidence**

> engineFiles = formats/scene/scene.html + core/layers/*.js. `wc -l formats/scene/scene.html` = 20 — the orchestrator moved to scene.js (the same fd397e1 split that scripts/gates/layer-props.mjs:24-28 documents having blinded IT, and which layer-props fixed by naming the directory). schema-drift kept the filename. `node scripts/gates/schema-drift.mjs` -> "all 128 engine props are defined in schema.json". Re-running the identical scan with formats/scene/scene.js added gives 161 props. The 33 unscanned props (vars, varsDur, varsEase, react, motionBlur, becomes, becomesDur, panWith, parts, splitText, physics, motionPath, fxOut, acrossBeats, …) all happen to be in schema.json today, so there is no live drift — but the gate that is supposed to notice when a new prop ships undocumented cannot see the file where most new cross-cutting props are added.

**repro**

```bash
wc -l formats/scene/scene.html   # 20
node scripts/gates/schema-drift.mjs   # "all 128 engine props"
node -e "const fs=require('fs'),p=require('path'),R='.';const f=[p.join(R,'formats/scene/scene.html'),p.join(R,'formats/scene/scene.js'),...fs.readdirSync(p.join(R,'core/layers')).filter(x=>x.endsWith('.js')).map(x=>p.join(R,'core/layers',x))];const s=f.map(x=>fs.readFileSync(x,'utf8')).join('\n');const set=new Set();for(const m of s.matchAll(/\b[LC]\.([a-zA-Z][a-zA-Z0-9]*)/g))set.add(m[1]);console.log('with scene.js:',set.size)"   # 161
```

**fix** scripts/gates/schema-drift.mjs:26 — replace the hardcoded scene.html path with the same directory glob layer-props uses: every `.js`/`.mjs`/`.html` in formats/scene plus core/layers/*.js. Add a blind-check like layer-props' (assert the scan still finds a known cross-cutting prop such as `vars` and exit 2 if not) so the next file split fails the gate instead of shrinking it.

**survived refutation because** Reproduced fully. formats/scene/scene.html is a 20-line shell contributing 0 L.<prop> matches; the orchestrator moved to formats/scene/scene.js in fd397e1 ("scene.html is now a 21-line skeleton") and scripts/gates/schema-drift.mjs:26-28 still hardcodes the old filename. The gate reports 128 props; re-running the identical extraction with scene.js added gives 161, so 33 props (vars, varsDelay, varsDur, varsEase, react, motionBlur, parts, splitText, physics, motionPath, fx, fxOut, acrossBeats, stagger, track, dx, dy, ...) are outside the scan. Refutation attempts all failed: (1) not intentional or documented anywhere, and the script's own comment at lines 24-25 asserts it scans the orchestrator, which is now false; scripts/gates/layer-props.mjs:24-28 documents this exact blinding from the same commit and fixed itself by globbing the directory, which schema-drift never did. (2) Not already fixed on disk, and no other gate re-derives engine-read props against schema.json in this direction (layer-props runs declared->honoured). (3) Partly harmless: I ran the gate's own schema-walk over the 33 extras and every one is already defined in schema.json, so there is no live drift and no scene can misbehave today; the enum half of the gate is also unaffected because it imports the registries directly ("13 schema enums in sync" is genuine). Net: a genuine blind spot in a preventive gate covering ~20% of engine props, including the file where new cross-cutting props are added, but zero live incorrectness.

---

### [ ] renderFrame(n) leaves stale style on off-window layers, so the renderer's dedup signature frameSig(n) is not pure in n

**where** `core/clips.js:85 and core/layers/beam.js:59 (signature consumer: core/boot.js:376-378)`  ·  **area** engine  ·  **class** other

**evidence**

> core/clips.js:85 hides an off-window clip with opacity only — `{ el.style.opacity = '0'; el.style.pointerEvents = 'none'; continue; }` — it never clears the transform/filter/clipPath the in-window branch wrote. core/layers/beam.js:59 returns early off-window with no reset, leaving the last-drawn conic gradient on its inner div; core/layers/paint.js:28 and shader.js:28 explicitly clear for exactly this reason and call the alternative 'impure'. core/boot.js:378 hashes `document.body.innerHTML`, which contains all of that stale state.
> 
> Ran a puppeteer harness against a shipped scene (formats/scene/showcase-lumen.json, 390 frames): render n after n-1, then render n after a far-away scrambler frame, compare frameSig(n).
>   frames whose frameSig(n) depends on the previously rendered frame: 1,10,19,28,37,46,55,64,73,82,91,100,109,127,136,145,154,163,199,208,217,226,235,244,253,262,271,280,289,298,307,316,325,334,343,352,379,388  (38 of 40 sampled)
> Diffing the DOM at frame 1 shows the mechanism:
>   beam inner div : `conic-gradient(from 66.0deg, …)`  vs  `conic-gradient(from 85.8deg, …)`
>   html layer[5]  : `opacity: 0; --t: 0.0333;`  vs  `opacity: 0; --t: 0.0333; filter: blur(0.52px); transform: none;`
> Gate gap: scripts/gates/probe-purity.mjs skips `opacity === '0'` subtrees by design, so `make probe` structurally cannot see this. The symptom is already logged as unexplained in Makefile:603 — 'the renderer's frame-dedup makes re-renders of UNCHANGED pages pixel-different (worker-order picks a different representative frame per static group)'. This is that mechanism.

**repro**

```bash
node /tmp/purity-sig.mjs /formats/scene/showcase-lumen.json   # 40-line puppeteer harness: serves the repo, renders frame n after n-1 and after a scrambler, compares window.__engine.frameSig(n)
```

**fix** Two parts. (a) In core/clips.js:85 write the full resting key set before continuing, the same authoritative-write contract cutStyle already keeps: `Object.assign(el.style, { transform: 'none', filter: 'none', clipPath: 'none' })` alongside the opacity-0. (b) Give core/layers/beam.js the off-window clear paint.js/shader.js have (reset `__beamInner` background/backgroundPosition and delete the dataset stamp). Then extend probe-purity.mjs with a second pass that hashes the raw body.innerHTML (the renderer's own signature) instead of only the visibility-filtered DOM, so the dedup key is covered by a gate.

**survived refutation because** Reproduced the reporter's harness (38/40 sampled frames of showcase-lumen have order-dependent frameSig), then attacked it. Two of three sub-claims fell: core/clips.js:85 is harmless on its own (off-window opacity is 0 and core/clips.js:108-116 rewrites restingKeys on re-entry), and the Makefile:603 attribution is wrong (sigs are computed in one sequential loop in internal/scene/scene.go:445, so representative choice is deterministic and worker order cannot affect it). The beam half survived and is worse than reported: formats/scene/scene.js:402 extends a clip's data-duration past the layer's own L.duration under sceneUnits, so core/layers/beam.js:59 stops updating while the clip is still visible at opacity 1. On the shipped scene formats/scene/showcase-vawe-reel.json, frames 264-276 hold a frozen beam; a controlled single-page test rendering frame 264 after 263 vs after 215 gave repeatably different screenshots (sha 1b13a98788 vs 3908d61ff9, conic from 72.6deg vs 29.4deg, 4481 pixels differing with max channel delta 203, A==C repeat confirms it is not grain noise). Visible, order-dependent output in a real render.

---

### [ ] `out` (exit animation) has no schema enum, so an unknown exit name validates clean and silently plays a plain fade — 19 layers in the shipped library are already sitting on it

**where** `formats/scene/schema.json:822 (layers.item.out) / core/clips.js:78 resolveAnim`  ·  **area** engine  ·  **class** silent-substitution

**evidence**

> `anim` carries an enum and is enforced; `out` carries none and nothing else checks it.
> 
> $ node core/validate.mjs /tmp/t3.json
>   ✗ layers[1].anim "slideL" is not valid. Did you mean 'slide-up'? ...
>   (no complaint at all about layers[0].out="slide")
> 
> Rendered proof (three layers, exitDur 0.6, frames 51 and 54 of a 2s window):
>   out:"slide"      → transform "none", opacity 0.125 / 0.037
>   out:"slide-left" → transform "translate(-7.5px,0)" / "translate(-17.8px,0)"
>   no `out` at all  → transform "none", opacity 0.125 / 0.037
> The bogus name renders byte-identical to declaring no exit at all.
> 
> Real bite — scanning formats/**/*.json for `out` values not in core/clips.js ANIM:
>   'blur' × 18  (formats/scene/vawe-identity.json)
>   'down' × 1   (formats/scene/cadence-film.json)
> $ node core/validate.mjs formats/scene/vawe-identity.json → ✓ (exit 0)
> `blur` is a valid `cut` presentation name, which is exactly why an author reaches for it here.

**repro**

```bash
printf '%s' '{"module":"scene","theme":"vawe","aspect":"9:16","duration":4,"bg":[{"t":0,"preset":"gradientWash","from":0,"to":4}],"audio":{"silent":true},"layers":[{"type":"text","text":"Hi","x":100,"y":600,"size":80,"start":0,"duration":2,"out":"slide","exitDur":0.6}]}' > /tmp/out.json && node core/validate.mjs /tmp/out.json
```

**fix** Give `layers.item.out` the same enum `anim` has in formats/scene/schema.json ([...ANIM_NAMES] — schema-drift.mjs:71 already declares that exact expectation). That one edit makes validate reject `blur`/`down`/`slide` and turns schema-drift green-for-real.

**survived refutation because** Could not refute; the claim holds on every axis I attacked. Repro reproduced verbatim: `node core/validate.mjs /tmp/out.json` exits 0 with out:"slide". Root cause verified on disk: core/validate.mjs:551 only rejects a string when spec.enum exists; formats/scene/schema.json fields.layers.item.anim has a 19-name enum while fields.layers.item.out has none; core/clips.js:78 resolveAnim falls back to fade with an explicit "SILENTLY" comment, and out is read only there (clips.js:97, :108). The gate that names this exact pair is structurally blind: scripts/gates/schema-drift.mjs:71 lists layers.item.out as owned by ANIM_NAMES, but line 89 does `if (!node || !Array.isArray(node.enum)) continue` — a MISSING enum is skipped, so the gate prints "13 schema enum(s) in sync" and exits 0. Library hits confirmed as genuine top-level layers, not some other `out` key: vawe-identity.json layers[1..6,9..20] = 18 text/rect layers with out:"blur" (file validates clean), cadence-film.json 1 with out:"down". Aggravating rather than exculpating: core/clips.js:95's own comment tells authors `out:"rush"/"slide"` and neither name exists in ANIM; CLAUDE.md launch rule 4 says blur-out is out:"defocus", which is what vawe-identity's author wanted and silently did not get. Refutation angles tested and rejected: not documented as intentional (docs/MISTAKES.md #21 is this same class for `anim`, fixed for `anim` only); no alternate resolver misread; not unreachable (19 shipped layers, plus a second unguarded path at core/transitions-lower.js:75 copying tr.out -> L.out from the equally unenumerated transitions node); not already fixed on disk. One correction to the report: impact is motion quality only, the frame still renders legally, so this is not high severity — but it is the repo's own named worst failure mode and is live in a shipped scene.

---

### [ ] schema-drift's enum-sync gate skips any OWNED path whose schema entry has no enum — the one failure mode it exists to catch

**where** `scripts/gates/schema-drift.mjs:90`  ·  **area** engine  ·  **class** error-swallowed

**evidence**

> Line 90: `if (!node || !Array.isArray(node.enum)) continue;   // not declared as an enum: nothing can drift`
> 
> OWNED lists 14 paths; the gate reports 13.
> 
> $ node scripts/gates/schema-drift.mjs
>   ✓ schema in sync — all 128 engine props are defined in schema.json
>   ✓ 13 schema enum(s) in sync with the registries they copy
>   exit=0
> 
> Which one is skipped (replaying the same `at()` lookup against schema.json):
>   checked  layers.item.anim
>   SKIPPED  layers.item.out      <-- the only one
>   checked  layers.item.shader ... (12 more, all checked)
> 
> So the gate written specifically because "the schema once advertised slideL" cannot see the strictly worse case: the schema advertising nothing, which makes the validator accept everything. A missing enum is not "nothing can drift", it is total drift.

**repro**

```bash
node scripts/gates/schema-drift.mjs   # prints "13 schema enum(s)" for a 14-entry OWNED list, exit 0
```

**fix** Replace the `continue` with a hard failure: if a path is in OWNED and `node` exists but has no `enum`, report `✗ <path> declares no enum — the validator enforces nothing` and `bad++`. Only skip when the path itself is absent from the schema.

**survived refutation because** Could not refute; the claim reproduces exactly and is worse than stated. (1) Ran `node scripts/gates/schema-drift.mjs` -> "13 schema enum(s)" for a 14-entry OWNED, exit 0; replaying `at()` shows `layers.item.out` resolves to {type,label} with no `enum`, so line 90 skips it. (2) Not intentional: the one documented unenumerated path (transitions.item.fx, comment at lines 83-85) was REMOVED from OWNED, whereas layers.item.out is still listed at line 71 with want:[...ANIM_NAMES,'none']; and docs/MISTAKES.md:3337 asserts "`none` is in the `anim` and `out` enums in schema.json", which is false on disk — the doc and the gate both believe an enum is there. (3) Not harmless: core/validate.mjs:551 is `if (spec.enum && ...)`, so validateData rejects a bogus `anim` ("slideL") and silently accepts the identical bogus `out`; core/clips.js:97,108 route `out` through resolveAnim, whose own comment says unknown names fall back to fade silently. Scanning formats/scene/*.json found 19 live invalid `out` values in shipped scenes (vawe-identity.json `out:"blur"` x18, cadence-film.json `out:"down"`), all silently rendering as fade with no gate complaint — exactly MISTAKES #21's failure mode. (4) Not stale: last 20 commits touching schema.json all have no enum at layers.item.out. Severity medium rather than high because the blast radius is wrong exit motion, not data loss or a broken render — but it is real, live, and silent, and the generic skip means deleting any enum makes the gate quieter instead of louder.

---

### [ ] Schema type/enum checks never reach group children: children.item declares 4 props, so anim, size, out, w, h, color… are permitted but unvalidated

**where** `formats/scene/schema.json:1113 (layers.item.children.item) / core/validate.mjs:697`  ·  **area** engine  ·  **class** error-swallowed

**evidence**

> layers.item.children.item has exactly 4 keys: ['type','x','y','delay']. The unknown-prop pass (validate.mjs:701) deliberately unions the child schema with the FULL layer schema (`const known = isChild ? [...CI, ...LI] : LI`), so a child may carry any layer prop — but validate.mjs's field walker only has a 4-prop spec to check them against.
> 
> Same value, two verdicts:
>   top-level  {"size":"nope"}                  → ✗ layers[0].size must be a number (got string)   exit 1
>   as a child {"children":[{"size":"nope"}]}   → ✓ 1 ok, 0 failed                                exit 0
> 
>   top-level  anim:"slideL"                    → ✗ not valid. Did you mean 'slide-up'?           exit 1
>   as a child anim:"slideL"                    → ✓ validates clean
> 
> And the child value is really live — rendering that scene and reading the DOM at frame 45:
>   [{"c":"hs-layer hs-group","a":"fade"},{"c":"hs-text","a":"slideL"}]
> data-anim="slideL" goes straight to driveClips, whose resolveAnim (core/clips.js:78) falls back to fade with no message. Children are built by the same kit.buildLeaf as top-level layers, so they deserve the same check.

**repro**

```bash
printf '%s' '{"module":"scene","theme":"vawe","aspect":"9:16","duration":4,"bg":[{"t":0,"preset":"gradientWash","from":0,"to":4}],"audio":{"silent":true},"layers":[{"type":"group","x":100,"y":600,"start":0,"duration":4,"children":[{"type":"text","text":"Hi","size":"nope","anim":"slideL"}]}]}' > /tmp/child.json && node core/validate.mjs /tmp/child.json
```

**fix** In core/validate.mjs's checkLayer (~697), after the unknown-prop loop, run the existing `walk()`/checkField pass over each child using `schema.fields.layers.item` merged with `children.item` — the same union the unknown-prop check already computes as `[...CI, ...LI]`. No schema edit needed.

**survived refutation because** Reproduced exactly. `node core/validate.mjs /tmp/child.json` exits 0 with "1 ok"; the same size:"nope" / anim:"slideL" at top level exits 1 with two errors. Root cause confirmed in source: formats/scene/schema.json fields.layers.item has 191 props, fields.layers.item.children.item has exactly 4 (type,x,y,delay), and validate.mjs's field walker (core/validate.mjs:567-569) recurses spec.item, so children are typed only against those 4; the unknown-prop pass (core/validate.mjs:700-702, `const known = isChild ? [...CI, ...LI] : LI`) unions the full layer list, which suppresses the name error without adding any type/enum spec. Not documented as intentional: MISTAKES.md #94 explains the union for prop NAMES only, and the adjacent comment (validate.mjs:693-696) states the opposite principle — the author added the child type enum check specifically to avoid green-validate-then-wrong-render. Not harmless: across formats/scene/*.json group children carry size x955, color x948, weight x943, w x477, h x410, anim x353 across 47 scenes, all unchecked; and the values are live — core/layers/util.js:215 addGroupChild delegates to buildLeaf then decorate() which writes the timing dataset (MISTAKES #69 made child anim/out work), and core/clips.js:63 resolveAnim is `ANIM[name] || fade`, a silent fallback. Not already fixed: verified against the current tree, and `make author-check D=/tmp/child.json` fails only on unrelated ambition/show floors, never naming the bad size or anim. Only correction to the report: the failure mode is silent fallback / wrong render rather than a crash, so medium rather than high.

---

### [ ] `aspects` per-aspect overrides bypass every schema field check, so a multi-ratio scene can validate green and render broken at one ratio only

**where** `core/boot.js:304 (applyAt) / core/validate.mjs:687 (checkLayer never descends into `aspects`)`  ·  **area** engine  ·  **class** error-swallowed

**evidence**

> boot.js:304 does `Object.assign(L, L.aspects[aspectKey])` — the override becomes the layer. validate.mjs walks `layers[]` and `children[]` and never looks inside `aspects`.
> 
> A scene whose override carries three things that are hard errors at the top level:
>   "aspects": {"9:16": {"anim":"slideL", "size":"not-a-number", "bogusProp":123}}
> $ node core/validate.mjs /tmp/t6.json
>   ✓ 1 ok, 0 failed   exit=0
> (each of the three, written directly on the layer, fails: "unknown prop bogusProp", "size must be a number", "anim slideL is not valid")
> 
> Rendered at 9:16, frame 45:
>   {"txt":"Overridden, fine","inlineSize":"","computedSize":"16px","anim":"slideL"}
> The layer declared size 80 and renders at the browser default 16px, because styleText does `(L.size ?? 96)+'px'` → "not-a-numberpx", which CSS drops. An 80px headline becomes 16px, silently, at one aspect only. Only the global em-dash string scan reaches inside `aspects`; nothing else does.

**repro**

```bash
printf '%s' '{"module":"scene","theme":"vawe","aspect":"9:16","duration":4,"bg":[{"t":0,"preset":"gradientWash","from":0,"to":4}],"audio":{"silent":true},"layers":[{"type":"text","text":"Hi","x":100,"y":600,"size":80,"start":0,"duration":4,"aspects":{"9:16":{"anim":"slideL","size":"not-a-number","bogusProp":123}}}]}' > /tmp/asp.json && node core/validate.mjs /tmp/asp.json
```

**fix** In core/validate.mjs checkLayer, for every key of `L.aspects` run the same unknown-prop + field checks against `schema.fields.layers.item` (an override is a partial layer, so skip `required`). Also reject an `aspects` key that is not in core/safe.js ASPECTS — a typo like "portrait" is currently a silent no-op.

**survived refutation because** Reproduced end to end. `node core/validate.mjs /tmp/asp.json` returns "1 ok, 0 failed" exit 0 while the same three props on the layer itself produce three hard errors (size type, anim enum, unknown prop). I then rendered both with my own puppeteer harness against formats/scene/scene.html at 1080x1920: with the aspects override the text computes to 16px; with `aspects` deleted it computes to 80px. Cause confirmed at core/layers/util.js:36 `(L.size ?? 96)+'px'` -> "not-a-numberpx", dropped by CSS, and core/tokens.css sets no font-size so it inherits 16px. Refutation attempts all failed: (1) not intentional — formats/scene/schema.json:1417 types `aspects` as a bare object so the schema walk never descends, while core/validate.mjs:196-203 shows the author DID intend aspects to be checked (it merges `{...L0,...over}` for the layout checks); nothing in CLAUDE.md/MISTAKES.md/ROADMAP.md exempts it. (2) code path is what ships: core/boot.js:304 Object.assign before resolveCoords, no revalidation; camera[].aspects at boot.js:308 has the same hole. (3) reachable from a real scene: I injected the three bogus props into all 16 real overrides in the shipped formats/scene/aspects-demo.json and `node scripts/gates/author-check.mjs` output was identical to the clean file (validate/beats/critique/direct/dissolve/slop/designspec/copy/assets all green; only the pre-existing `floor` failure). (4) not fixed on disk. One correction to the report: layoutErrors DOES reach inside `aspects` for the pin/w/dx/dy checks, so "only the em-dash scan reaches inside" is wrong; the gap is specifically the schema field walk. Severity medium rather than high: it needs an author typo inside a field only one library scene uses, and the damage is a wrong-looking frame at one ratio, but it is exactly the silent-substitution class the repo doctrine forbids and the fix is small.

---

### [ ] `h` is documented as a universal layer prop and resolved from "50%" by the engine, then never written to the box on text / clip / board / component layers

**where** `formats/scene/scene.js:415 (top-level build sets width only) · core/layers/clip.js:5 · core/layers/board.js:6 · core/layers/component.js:7`  ·  **area** engine  ·  **class** silent-substitution

**evidence**

> schema.json documents h as `{"type":"number|string","label":"Height: px number or \"50%\" of canvas"}` on layers.item — no type restriction. core/boot.js:98 resolves it (`if (typeof L.h === 'string') L.h = num(L.h, H, ...)`) and uses it to place `pin:"bottom"`. But scene.js:415 writes only `el.style.width`, and clip/board/component/text never write height.
> 
> Sweep: render the same layer with and without `h`, compare `#cam` outerHTML across 12 frames (3,6,…,110):
>   IGNORED-DOM  text.h (with w+bg)   {type:text,w:600,bg:#333} + h:900 → identical DOM
>   IGNORED-DOM  clip.h               {type:clip,w:600}        + h:900 → identical DOM
>   IGNORED-DOM  board.h              {type:board,w:800,cols}  + h:900 → identical DOM
>   IGNORED-DOM  component.h          {type:component,w:800}   + h:900 → identical DOM
> (controls in the same sweep that DO differ: rect.pad, group.wrap, text.maxLines, svg.fill)
> 
> Already authored against in the library: 4 shipped component layers declare a height that does nothing —
>   stripe.json id=realcheckout h=691 · creed-launch.json h=790, h=344 · threadcite-3s.json id=leadsGrid h=541
> 
> This is docs/MISTAKES.md #210 exactly ("`h` used to be accepted and then ignored"), which was fixed in core/layers/html.js only. The other five types kept the bug.

**repro**

```bash
printf '%s' '{"module":"scene","theme":"vawe","aspect":"9:16","duration":4,"bg":[{"t":0,"preset":"gradientWash","from":0,"to":4}],"audio":{"silent":true},"layers":[{"type":"text","text":"Hi","x":100,"y":600,"size":80,"w":600,"bg":"#333","h":900,"start":0,"duration":4}]}' > /tmp/h.json && node scripts/author/preview.mjs scene 45 /tmp/h.json   # the chip renders ~110px tall, not 900
```

**fix** Move the height write next to the width write in formats/scene/scene.js:415 — `if (L.h != null) el.style.height = L.h + 'px';` — the same one-liner html.js already carries. Types that own their height (component derives it from the capture aspect) should then reject a declared `h` in validate.mjs rather than swallow it.

**survived refutation because** Could not refute; reproduced independently. Built a puppeteer harness (/tmp/hcheck.mjs) serving the repo and dumping #cam DOM + boxes across 7 frames. text (w:600,bg,h:900), clip, board, component all produce byte-identical #cam with and without h; the text chip renders 600x83, style.height empty. component writes height from c.h*fit (capture aspect), never L.h. h is documented universally: formats/scene/schema.json layers.item "Height: px number or \"50%\" of canvas" and docs/PRIMITIVES.md:18-21. Worse than a no-op: core/boot.js:98 resolves h and uses it for edge placement, so {"type":"text","y":"bottom","size":80,"w":600} with h:900 lands at top=955px while measuring 83px tall (without h: top=1759px) — positioned as 900 tall, drawn 83 tall, floating ~817px off the bottom. Refutation attempts all failed: (a) not intentional — docs/CRAFT/KEYED-MOTION.md:248 makes a resting w/h a hard requirement, and the same text layer given motion:[{t:0,h:300},{t:3,h:900}] DOES get style.height:600px at f45 via formats/scene/scene.js:571, so height works through keys and is dropped through the resting prop; (b) not a misread path — this is the shipping scene.html driver in a real browser; (c) reachable and reached — stripe.json id=realcheckout h=691, creed-launch.json h=790 and h=344, threadcite-3s.json id=leadsGrid h=541; (d) not fixed — MISTAKES #210 fixed only core/layers/html.js; L.h is honoured in beam/glow/html/image/lottie/rect/shader/svg/util and dropped in text/clip/board/component; (e) no gate catches it — scripts/gates/layer-props.mjs counts any prop named in the format's shared .js as honoured for all types, and L.h appears at scene.js:571, so it prints "every prop a layer sets is read" for both the repro and stripe.json.

---

### [ ] The slop gate can never fail: it discards the detector's exit status, so `make slop` and author-check's slop step report success on a scene with anti-patterns

**where** `scripts/gates/slop.mjs:71 (spawnSync result `r` is only read for stdout/stderr; the file ends at line 90 with no process.exit(r.status))`  ·  **area** gates  ·  **class** dead-code

**evidence**

> $ grep -n 'process.exit' scripts/gates/slop.mjs  →  only two hits: line 20 (usage error) and line 49 (engine boot error). `r.status` appears nowhere.
> $ node scripts/gates/slop.mjs formats/scene/higgsfield-recreation.json; echo EXIT=$?
>   line 4: [dark-glow] Colored glow (rgb(226,254,122)) on dark page
>   1 anti-pattern(s) found.
>   EXIT=0
> The detector itself does exit non-zero — proven directly:
> $ node .claude/skills/impeccable/scripts/detect.mjs /tmp/slopy.html; echo exit=$?  →  '1 anti-pattern found.' / exit=2
> And the failure is invisible all the way up the ladder:
> $ node scripts/gates/author-check.mjs formats/scene/higgsfield-recreation.json --strict | grep slop
>   ✓ slop       ok
> (author-check.mjs:141 records slop with `exitMeansFail: strict`, so even STRICT=1 cannot block, because the exit code is unconditionally 0.) CLAUDE.md states 'it must be clean before you render' — nothing enforces that.

**repro**

```bash
node scripts/gates/slop.mjs formats/scene/higgsfield-recreation.json; echo EXIT=$?
```

**fix** Propagate the detector's status at the end of slop.mjs: after the suppression filter, `process.exit(r.status && kept.some((l) => /[1-9]\d* anti-pattern/.test(l)) ? 1 : 0);` — i.e. exit non-zero when findings survive suppression (suppressing every overused-font flag must still be able to reach zero).

**survived refutation because** Reproduced exactly. scripts/gates/slop.mjs:68 stores spawnSync result in `r`, reads only stdout/stderr, and ends at line 90 with no exit call; the only process.exit calls are line 20 (usage) and line 49 (engine boot failure). `node scripts/gates/slop.mjs formats/scene/higgsfield-recreation.json` prints "1 anti-pattern(s) found." and exits 0, while the vendored detector on the very file slop.mjs wrote (/tmp/slop.html) exits 2. `node scripts/gates/author-check.mjs formats/scene/higgsfield-recreation.json --strict` prints the dark-glow finding and still reports "✓ slop ok" (beats/critique/floor/designspec/copy correctly BLOCK), so exitMeansFail:strict at author-check.mjs:141 is unreachable; the fallback blockCodes regex at line 105 matches "✗ [code]" which the detector never emits (it prints "line N: [rule]"). Refutation attempts all failed: not documented as intentional (author-check.mjs:140 comment and CLAUDE.md both assume the exit code matters, MISTAKES #169 assumes make slop can fail); not stale (`git log -S 'r.status' -- scripts/gates/slop.mjs` is empty, it was never consumed); not unreachable (a real committed scene trips it today and Makefile:363 propagates node's status); and a second consumer, scripts/author/styleframes.mjs:124-127, records the same always-zero status as its look-gate verdict. Severity medium rather than high only because the findings are still printed loudly to the terminal — only the exit code and machine verdict lie, so a human reading the output still sees the tell.

---

### [ ] direction-floor's `no-bg-motion` matches the preset NAME against a regex instead of the fx the preset emits, so it calls a pulsing, drifting dot field 'static'

**where** `scripts/gates/direction-floor.mjs:52-60 (MOVING_BG / animatedWin)`  ·  **area** gates  ·  **class** wrong-unit

**evidence**

> MOVING_BG is /gradient|aurora|mesh|constellation|wave|flow|shader|orb|noise|plasma|dither|dotmatrix|metallic|softwash|liquid|spotlight/i and is tested against `b.preset`. But core/backgrounds.js:337 makes `ink` a dotGrid with `mode:'pulse', period:5, driftX:8, driftY:5`, and dotGrid (core/backgrounds.js:41-63) is a function of `t`. The gate's own animatedWin would return true on those very fields — it just never looks at the resolved spec.
> $ node -e "import('./core/backgrounds.js').then(m=>console.log(JSON.stringify(m.bgPreset('ink','ink').fx)))"
>   [{"type":"dots","mode":"pulse",...,"period":5,"driftX":8,"driftY":5},{"type":"grain",...}]
> $ node scripts/gates/direction-floor.mjs formats/scene/thread.json
>   ~ [no-bg-motion] the background is static.   (thread.json's bg is ink/paper/deep windows)
> $ node scripts/gates/direction-floor.mjs formats/scene/thread.json --strict >/dev/null; echo $?  →  1
> A library sweep comparing the regex against bgPreset()'s emitted fx finds 8 scenes falsely told their backdrop is static: ab2-control-tenor, brew-launch-act1, ditherkit, showcase-count(.expanded), thread, threadcite-3s, threadcite-open. Presets that animate but fail the name test: ink, accent, paperDots, paperShapes, soft, shapes, brandglow, blobs.

**repro**

```bash
node scripts/gates/direction-floor.mjs formats/scene/thread.json --strict; echo exit=$?   # then: node -e "import('./core/backgrounds.js').then(m=>console.log(m.bgPreset('ink','ink').fx))"
```

**fix** Do what visual-vocabulary.mjs already does for blocks — call the factory and measure what it emits. Replace the name regex with `import { bgPreset } from '../../core/backgrounds.js'` and treat a window as animated when `bgPreset(b.preset, b.value).fx.some(f => f.type !== 'grain')` (or f.mode/f.period/f.driftX are set), keeping the existing html-`var(--t)` clause.

**survived refutation because** Reproduced exactly. `node scripts/gates/direction-floor.mjs formats/scene/thread.json` emits `~ [no-bg-motion] the background is static`, and `bgPreset('ink','ink').fx` returns `[{type:'dots',mode:'pulse',period:5,driftX:8,driftY:5},{grain}]`. `dotGrid` (core/backgrounds.js:41) is a function of `t` (sin(t*w2) plus driftX*t), dispatched at core/backgrounds.js:474, and the render path resolves the same call at formats/scene/scene.js:157 with only `grain` stripped (:160) — so the animated dots reach the canvas. The gate at :57 tests only author-declared window keys plus the name regex at :52, never bgPreset(...).fx.

All four refutation angles failed. (1) Not intentional: the comment at :48-51 explicitly says name-matching misses presets that animate by nature and that the gate should "ask the window rather than only its name" — the code below it does not. (2) Not a coherent "author must declare motion" policy: `dotmatrix` is credited by name while emitting the same {type:'dots',mode,period,driftX,driftY} shape as `ink`. (3) Not harmless: formats/scene/ditherkit.json has bg `[{"preset":"ink","from":0,"to":29}]` and no-bg-motion is its ONLY finding (0 fail, 1 warn); `--strict` exits 1, and scripts/gates/author-check.mjs:129 forwards --strict, so this single false claim alone blocks under STRICT=1. (4) Not stale: line 52's regex on disk contains no dots/ink/accent/soft/shapes/blobs/paperDots/brandglow. Corroborating: scripts/author/build-cadence-film.mjs:140 records that `dotmatrix` was picked purely to clear this warning, so the mis-measurement already steered a real authoring choice.

Severity medium rather than high: non-strict runs still exit 0 and no rendered output is wrong; the harm is a false diagnosis that blocks under STRICT=1 and misdirects preset choice by name.

---

### [ ] critique's blocking error rules only walk top-level layers, so any copy nested in a group is exempt — 393 of 1613 text layers in the library

**where** `scripts/gates/critique.mjs:36,44,101,124`  ·  **area** gates  ·  **class** other

**evidence**

> `placeholder-word`, `false-claim`/`unbacked-claim`, `mis-centre` and `typing-cutoff` all iterate `for (const l of layers)` where `const layers = d.layers || []` (line 14) — no recursion into `children`. Only `lonely-beat`/`thin-beat`/`scattered-beat`/`transition-dip` use the beat clustering, which is also top-level.
> 
> Library census: 1220 top-level text layers, 393 nested inside groups (24%).
> 
> A/B on the identical layer, only its nesting changed:
>   $ node scripts/gates/critique.mjs /tmp/cz/top.json
>     ✗ [placeholder-word] @0.0s  "Rendered" (96px) is a filler label…
>     ⚠ [mis-centre] … (96px, w:900) has a wide box but no "align"
>     exit=1
>   $ node scripts/gates/critique.mjs /tmp/cz/nested.json
>     critique · … · 1 beats · 0 findings (0 errors)
>     ✓ no value-gate violations — every beat carries an artifact.
>     exit=0
> Same text, same size, same `w`, no `align`. Wrapping it in a `{"type":"group"}` flips a BLOCKING error (author-check records `critique` as waivable-blocking) to green.

**repro**

```bash
node scripts/gates/critique.mjs /tmp/cz/top.json; node scripts/gates/critique.mjs /tmp/cz/nested.json   # (files rebuilt by the python snippet in evidence; or wrap any text layer of a real scene in a group)
```

**fix** Flatten once at the top — `const layers = []; (function rec(ls){for (const l of ls||[]) { layers.push(l); rec(l.children); }})(d.layers)` — and use the flat list for the per-layer rules, keeping the top-level list only for `scattered-beat`, whose message explicitly says "top-level elements".

**survived refutation because** Reproduced verbatim: /tmp/cz/top.json exits 1 with [placeholder-word] + [mis-centre]; the identical layer wrapped in a {"type":"group"} exits 0 with "0 findings". Confirmed in code: critique.mjs:14 flattens to d.layers, and rules at :36, :45, :101, :123 iterate that array with no recursion into children (beat clustering at :23 is flat too). author-check.mjs:125 records critique as waivable-blocking, so a blocking error really is bypassed by nesting. All four refutation angles failed: (a) nothing documents an exemption, and MISTAKES #69/#70 assert the opposite doctrine (a group child must behave like a layer), while rule 3 static-list in the same file DOES read l.children, so this is inconsistency not policy; (b) no misread of the shipping path; (c) not inapplicable to children, since core/layers/util.js:212 applies a child's `w` and :38 applies `align`, so nested wide-box text genuinely left-aligns; (d) not already fixed on disk. Severity knocked down from high to medium because the hole is latent: re-running the four rules recursively across all 136 parseable formats/scene/*.json yields ZERO nested hits on either blocking rule, only 4 warn-level typing-cutoff in _catalog-1/10/16.json, and those look like false positives since group children have no own `duration` (they inherit the group window, util.js:252) so `l.duration ?? 0` reads 0. Reporter's census also does not replicate: I count 1479 top-level / 945 nested text layers over 136 scenes (44 scenes with nested text), not 1220/393.

---

### [ ] inspect's `mustAnimate` does not count a `motion` keyframe track, so a fully choreographed layer fails as "no animated layer is live"

**where** `scripts/gates/inspect.mjs:41`  ·  **area** gates  ·  **class** wrong-unit

**evidence**

> `const animated = (l) => !!(l.anim || l.split || l.preset || l.type === 'count' || l.ken || (l.children||[]).some(animated));` — `motion` (the engine's per-frame keyframe track, driven at formats/scene/scene.js:589-592) is absent, as is `typing` and `parts`.
> 
> Library census: 209 layers carry a real motion track (>1 key); 31 of them declare none of anim/split/preset/count/ken, so `animated()` calls them static.
> 
> Repro on a headline that slides in, holds, and slides out on a 4-key motion track:
>   $ node scripts/gates/inspect.mjs /tmp/iz/s.json
>     ✗ @2s hero
>         declared mustAnimate but no animated layer is live at 2s
>     0 pass · 1 fail   (exit 1)
> Add a cosmetic `"anim":"rise"` to the same layer and nothing else:
>   $ node scripts/gates/inspect.mjs /tmp/iz/s2.json  ->  1 pass · 0 fail
> So the gate blocks on the richer animation and passes on the poorer one, and its message names the wrong cause ("no animated layer is live" when the layer is moving every frame).

**repro**

```bash
node scripts/gates/inspect.mjs /tmp/iz/s.json   # scene = one text layer with a 4-key motion track, sidecar declares mustAnimate at 2s
```

**fix** Add the tracks the engine actually plays: `(Array.isArray(l.motion) && l.motion.length > 1) || l.typing || l.parts || l.react` to `animated()`. plan-vs-render.mjs already treats motion keys as events, so the two gates currently disagree about what motion is.

**survived refutation because** Reproduced directly and could not refute. `animated()` at scripts/gates/inspect.mjs:41 omits `motion`, the engine's real per-frame keyframe track (driven at formats/scene/scene.js:588-592). Synthetic repro fails on a 4-key motion track and passes once a cosmetic `anim:"rise"` is added. Not documented as intentional: inspect.mjs:16 defines mustAnimate as "some layer live at `at` carries motion", and the file's honesty note lists only spine/object/becomes as deliberately unchecked. Not unreachable: census confirms 209 motion-track layers, 31 with no anim/split/preset/count/ken, across 14 shipped scenes; four have multi-second windows where every live layer is motion-only. Copied the real formats/scene/example-kinetic-type.json to /tmp with a generator-shaped sidecar and it failed at 6.25s on a text layer moving every frame. scripts/brand/intent-from-storyboard.mjs:66 defaults mustAnimate to true, and author-check.mjs:182 runs inspect as a blocking step, so make video would stop. Not stale: line 41 is unmodified on disk. Mitigating: the five existing sidecars all pass today and the step is waivable, so it is a latent gate false-negative with a wrong message rather than a render bug.

---

### [ ] direction-floor's `static-figure` ignores per-child `delay`, calling a 46-child staggered build "one block" — and the remedy it names (a group `each`) is a prop the engine never reads

**where** `scripts/gates/direction-floor.mjs:301-314`  ·  **area** gates  ·  **class** wrong-unit

**evidence**

> The filter is `if (l.type === 'group' && l.children.length >= 3 && l.each == null) return true;` — it never looks at the children's own `delay`, which core/layers/util.js:252-267 turns into a real per-child `data-start` ("`delay` staggers a child WITHIN its group's window", MISTAKES #69).
> 
> On a real scene:
>   $ node scripts/gates/direction-floor.mjs formats/scene/tpot-launch.json | grep static-figure
>     ~ [static-figure] 4 figure(s) (a 3+-child group or a multi-shape SVG) animate as one block — add `parts` (or a group `each`) …
> Replaying the filter shows 2 of those 4 are staggered builds:
>     group children:46 delays: [0,0.032,0.064,0.096,0.128,0.16]   (46-step ramp to 1.44s)
>     group children:23 delays: [0.26,0.288,0.316,0.344,0.372,0.4]
> 
> The suggested fix is inert. `each` is only read for SPLIT TEXT units (formats/scene/scene.js:507) and inside `parts` (scene.js:357); `grep -rn each core/layers/group.js core/layers/util.js` returns no group handling. Setting it changes no frame and silences the gate:
>   $ python3 … add "each":0.5 to every 3+-child group of tpot-launch -> /tmp/tpot-each.json
>   $ node scripts/gates/direction-floor.mjs /tmp/tpot-each.json | grep -c static-figure  ->  0

**repro**

```bash
node scripts/gates/direction-floor.mjs formats/scene/tpot-launch.json | grep static-figure
```

**fix** Treat a group as built piece by piece when two or more children carry distinct non-zero `delay` (or their own `anim`/`start`), the same evidence critique.mjs already uses via `!l.stagger`. And change the message to name a remedy the engine honours — per-child `delay` or `parts` — since a group `each` is accepted and ignored.

**survived refutation because** Could not refute; reproduced end to end. (1) `node scripts/gates/direction-floor.mjs formats/scene/tpot-launch.json` emits `static-figure` for 4 figures; replaying the filter at direction-floor.mjs:303 shows all 4 are groups and 2 are genuine staggered builds (46 children with 46 distinct delays ramping to 1.44s; 23 children with 23 distinct delays to 0.952s). Those delays are live motion: core/layers/util.js:265-267 writes a per-child `data-start`, handing each child to driveClips exactly like a top-level layer (MISTAKES #69). The filter never inspects child `delay`, though the sibling `html` branch at :304-311 does test for two or more distinct offsets before flagging - so the stagger test exists in the same function and was just not applied to groups. (2) The named remedy is inert: core/layers/group.js is 7 lines with no `each`/`delay`; grep over core/ finds no group `each`; scene.js:507 reads `each` only for split-text units and :357 only inside `parts`; AUTHOR-THE-FRAME.md documents it solely as a `parts` sub-property; and no scene in formats/scene/ sets it on a group (scanned all). Adding `"each":0.5` to every 3+-child group of a tpot-launch copy drops static-figure hits to 0, and scripts/gates/layer-props.mjs still passes clean, so no gate catches the dead prop. direction-floor.mjs:164 compounds it by scoring `group && each` as motion vocabulary. Refutation angles checked and failed: no comment/doc/skill/MISTAKES entry sanctions a group-level `each`; the code path is the shipping one; it fires on a checked-in scene; nothing is fixed on disk. Severity medium not high - static-figure is a WARN (blocks only under STRICT=1), so no frame is corrupted, but it false-positives on correctly staggered work and prescribes a fix that changes zero pixels while turning the gate green.

---

### [ ] dissolve-check only reads inline `style=` on `<div>`/`<span>`, so it is blind to the repo's own crossfade idiom (a `<style>` block with classes) and measures 0 pairs on the very films it was written for

**where** `scripts/gates/dissolve-check.mjs:126 (tagRe) and :138 (cands filter on decl(e.style,'opacity'))`  ·  **area** gates  ·  **class** other

**evidence**

> Two scenes written to /tmp, identical crossfade (`opacity:var(--n)` against `opacity:calc(1 - var(--n))`, both `position:absolute;left:40px;top:40px`). Inline form: `1 same-point opacity pair(s) measured` → `✗ [crossfade-mud] ... BOTH stay above 0.15 opacity for 70% of its range`, exit=1. Class form (same declarations moved into `<style>.a{...}.b{...}</style>`): `0 same-point opacity pair(s) measured`, `✓ no transition dissolves one text state into another in place.`, exit=0. Same for a `<p>` instead of a `<div>` (0 pairs, exit 0). Library-wide the gate reports 0 fails on all 138 scenes, and on `ab4-b-ledgerline.json` — one of the three films MISTAKES #171/#174 names — it prints `2 html layer(s) · 0 same-point opacity pair(s) measured`, because every opacity in that film lives in a `<style>` rule (`.lgstack .lraw{position:absolute;left:30px;top:16px;opacity:clamp(...)}` vs `.lgstack .lname{position:absolute;left:30px;top:16px;opacity:clamp(...)}`). The gate's own 'unreadable → not a pass' honesty path never fires either, because those elements are never even collected.

**repro**

```bash
node -e "const fs=require('fs');const css='<style>.a{position:absolute;left:40px;top:40px;opacity:var(--n)}.b{position:absolute;left:40px;top:40px;opacity:calc(1 - var(--n))}</style><div class=\"a\">AFTER</div><div class=\"b\">BEFORE</div>';fs.writeFileSync('/tmp/css.json',JSON.stringify({module:'scene',duration:5,bg:[{preset:'dark'}],layers:[{type:'html',id:'x',start:0,duration:5,w:800,h:400,html:css}]}))" && node scripts/gates/dissolve-check.mjs /tmp/css.json; echo exit=$?
```

**fix** Resolve the layer's CSS before measuring: parse `<style>` rules out of `L.html` (selector → declaration block), match them to elements by class/id/tag, and merge with the inline `style=`; and widen the tag scan past `div|span` to any element. Cheapest correct version: collect `<style>` rules into a map, then for each element compute an effective declaration set (class rules + inline) and feed that to the existing same-point/opacity logic. Anything still unresolvable should go to the existing `unreadable` list, not be silently dropped.

**survived refutation because** Could not refute; reproduced exactly. Ran the given repro: inline form gives "1 same-point opacity pair(s) measured" + crossfade-mud fail (exit 1); the same declarations inside a <style> block give "0 pairs measured" + pass (exit 0). Cause is real and in shipped code: dissolve-check.mjs:126 matches only div|span, :133 reads style="..." only, and the :138-141 filter requires decl(e.style,'opacity') and position:absolute in that inline string, so class-styled elements are never candidates. Confirmed on a real scene: formats/scene/ab4-b-ledgerline.json layer "stack" puts .lgstack .lraw and .lgstack .lname at the same left:30px;top:16px with opacity clamps on --res entirely inside <style>, and the shipped gate prints "2 html layer(s) · 0 same-point opacity pair(s) measured". Checked all four refutation angles: not documented (the header's own "WHAT IT CANNOT DO" block at :31-34 lists three limits and omits this one; docs/MISTAKES.md #175 documents the gate at length and never mentions it, while stating the opposite principle that a gate must not go quiet about what it failed to look at); not a misread; not fixed on disk; reachable from real scenes. However the reporter's severity is overstated. I patched a class-aware copy (/tmp/dc2.mjs: resolve <style> class rules into element declarations, plus p|li|h1-h3) and swept all 138 scenes: 364 pairs measured vs 299 shipped, i.e. 65 recovered pairs, ALL on ab4-b-ledgerline, and every one passes; zero new crossfade-mud and zero new unjudged pairs library-wide. The cited pair is clamp(0, calc(1 - var(--res)*2.2), 1) vs clamp(0, calc((var(--res)-0.45)/0.55), 1), which never overlap above 0.15 - the correct threshold swap, so 0 fail is the right verdict reached by the wrong route. Also the gate is not wholly blind on its own films: it measures 1 pair each on ledgerline-neon, ab4-a-ledgerline and ledgerline-cyber. Net: a genuine undocumented blind spot in the dominant CSS idiom that silently defeats the gate for any future author, but no currently-hidden defect in the library.

---

### [ ] copy-check's number-not-count matches any 4-digit run or any number with a k/m/b suffix, so it tells authors to turn clock times, resolutions and image-prompt text into count-up layers

**where** `scripts/gates/copy-check.mjs:64 (`/\b\d[\d,]{3,}\b|\b\d+(\.\d+)?\s?(million|billion|k|m|b)\b/i`)`  ·  **area** gates  ·  **class** other

**evidence**

> Sweeping the library: `"7h 15m" sets a big number as flat text — make it a { "type":"count" }` (15 minutes matched as the `m` = million/thousand suffix), `"1920 x 1080 · 30fps"`, `"glow, high detail, sci-fi atmosphere, 4K"`, and `"A futuristic astronaut in a white space "` — the last one quotes 40 characters that contain no number at all, because the match was further along the string, so the printed cause does not appear in the printed evidence. The rule is a WARN, but author-check turns it into a blocker under STRICT.

**repro**

```bash
node scripts/gates/copy-check.mjs formats/scene/showcase-flight.json | grep number-not-count
```

**fix** Require the match to be a real quantity: drop the bare `\d[\d,]{3,}` arm in favour of a grouped-thousands or >=1e4 test, exclude a digit immediately followed by a unit letter that is part of a time/size token (`h`, `m`, `s`, `fps`, `px`, `ft`, `K` after a resolution), and quote the matched substring with a little surrounding context instead of the first 40 characters of the line.

**survived refutation because** Reproduced exactly on unmodified files. `node scripts/gates/copy-check.mjs formats/scene/showcase-flight.json` emits number-not-count for "7h 15m" (the "15m" hits the million/k/m/b suffix branch of the regex at copy-check.mjs:64). A sweep of formats/scene/*.json reproduces every other cited case: "1920 x 1080 · 30fps" in vawe-identity.json (4-digit run), "glow, high detail, sci-fi atmosphere, 4K" in rec3-skill.json, and rec1-nogate/rec2-gates where the printed evidence "A futuristic astronaut in a white space " contains no digit at all because the message slices txt.slice(0,40) while the actual match ("4K.") is ~180 chars later. All four refutation routes failed: (1) grep for "number-not-count" across Makefile/scripts/docs/formats/.claude finds nothing outside the rule itself, so it is neither documented nor waived anywhere; (2) the quoted line is the shipping path, invoked by Makefile:432 and author-check.mjs:146; (3) it is hit by six committed real scenes; (4) it is not fixed on disk. The reporter understated it: author-check harvests waivable codes with /✗\s*\[code\]/ (author-check.mjs:102) but copy-check prints findings as "~ [code]", so blockCodes is empty and the `waived` branch (which requires blockCodes.length > 0) can never fire. I confirmed with a /tmp copy carrying {"authoring":{"allow":["number-not-count"],"_why":{...}}} that --strict still exits 1, so the false positive is unwaivable under STRICT. Severity medium rather than high only because `make video` does not pass --strict by default, so the wrong finding is a misleading WARN on the default path and an unwaivable block only when STRICT=1; no rendered output is affected.

---

### [ ] An unrecognised --aspect value is silently accepted and renders the scene on a completely different canvas, then names the file after the bogus value

**where** `cmd/render/main.go:140-166 (no validation of *aspect) → internal/scene/scene.go:403-406 (appends it to the URL raw) → core/safe.js:50-60 (sceneDims falls through)`  ·  **area** pipeline  ·  **class** silent-substitution

**evidence**

> formats/scene/_glowA.json declares "aspect":"16:9".
> 
>   $ ./bin/vawe formats/scene/_glowA.json --draft --out /tmp/asp_default.mp4
>   $ ./bin/vawe formats/scene/_glowA.json --draft --out /tmp/asp_banana.mp4 --aspect banana
>   $ ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 <each>
>   /tmp/asp_default.mp4 1920,1080
>   /tmp/asp_banana.mp4  1080,1920      <-- portrait, from a 16:9 scene
> 
> Both exited 0 with no warning. Frame 60 pulled from the banana render is a 1080x1920 portrait frame: the text layer (x:160 w:1400) is cut off at the 1080px canvas edge and the glow layer at x:760 is gone.
> 
> Root cause, isolated without a render:
>   $ node -e "import('./core/safe.js').then(m=>{console.log(m.sceneDims({aspect:'9:16'},'banana'),m.sceneDims({aspect:'16:9'},'16x9'))})"
> sceneDims takes the explicit key first; an unknown key is neither in ASPECTS nor contains ':', so BOTH branches miss and it falls all the way to the orientation default, DISCARDING the scene's own `aspect`. `16x9`, `9-16`, `Portrait`, `0:0` and any typo all do this. Go then tags the output `.banana.mp4`, so the filename asserts a ratio the file does not have. This is MISTAKES #215 (a single --aspect silently overwrote the render it was not asked for) with the same silent-shape class, one layer down.

**repro**

```bash
./bin/vawe formats/scene/_glowA.json --draft --out /tmp/a.mp4 --aspect banana && ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 /tmp/a.mp4   # prints 1080,1920 for a 16:9 scene
```

**fix** Validate the aspect list in cmd/render/main.go before the render loop: reject any token that is not in the ASPECTS table and not a well-formed `W:H` with W>0 and H>0, and exit non-zero naming the bad token. Belt and braces: make sceneDims return null for an unresolvable explicit key so core/boot.js can set window.__engineError instead of quietly sizing to the default.

**survived refutation because** Could not refute; reproduced independently. Ran ./bin/vawe formats/scene/_glowA.json --draft --aspect banana on the committed binary: exit 0, no warning, wrote out/_glowA.banana.mp4, ffprobe reports 1080,1920 from a scene declaring "aspect":"16:9". Isolated the cause without a render: node -e sceneDims({aspect:'16:9'},'banana') returns [1080,1920], same for '16x9' and '0:0' — core/safe.js:50 does `const named = key || cfg.aspect`, so a bogus explicit key misses both the ASPECTS lookup and the ':' branch AND discards the scene's own aspect, landing on the orientation default. core/boot.js:275 passes the raw URL param through; internal/scene/scene.go:403 appends it unvalidated; cmd/render/main.go:140-166 has no validation. Every refutation angle failed: (1) not intentional — the sceneDims docstring's "ratio the table doesn't name is still honoured" covers the well-formed ':' branch, not a garbage key, and nothing sanctions dropping cfg.aspect; (2) it is what ships — I ran bin/vawe, not a harness; (3) not harmless and clearly against intent — verify/audit.mjs:49 rejects the identical input with "unknown aspect … known: 16:9, 9:16, 1:1, 4:5, 4:3" and exit(2), and formats/scene/schema.json:14-22 constrains the JSON field with an enum of those same five, so the renderer flag bypasses validation the repo enforces in two other places; (4) not already fixed — HEAD commit 8f6f825 is MISTAKES #215 and fixed only the filename half. One imprecision in the report: its evidence block passes --out yet claims the .banana tag, but those are separate invocations (with explicit --out and a single aspect the tagging block at main.go:146 is skipped); without --out the tag does appear, which I confirmed. Substance unaffected. Severity medium, not high: it requires an operator typo on a CLI flag and the wrong shape is obvious on opening the file, but it is a genuine silent substitution producing a mis-shaped deliverable whose filename asserts a ratio the file does not have.

---

### [ ] --watermark is silently ignored on the --alpha and --bg export paths, so a "free preview" ships clean

**where** `internal/render/render.go:89-115 (transparent branch returns before encode.Video); internal/encode/encode.go:91 VideoAlpha and :102 Composite take no watermark argument`  ·  **area** pipeline  ·  **class** silent-substitution

**evidence**

> o.Watermark is only ever read at internal/render/render.go:132, inside encode.Video. The `if transparent {…}` block above it returns at line 107 (--bg) or 114 (--alpha) without touching it. `transparent := o.Transparent || o.BgVideo != ""`, so both alpha export and video compositing skip it.
> 
>   $ ./bin/vawe formats/scene/_glowA.json --draft --watermark assets/watermark/draft.png --out /tmp/wm_mp4.mp4
>   $ ./bin/vawe formats/scene/_glowA.json --draft --alpha --watermark assets/watermark/draft.png --out /tmp/wm_alpha.webm
>   $ ffmpeg -i <each> -vf "select=eq(n,60)" -vframes 1 <png>
> 
> Frame 60 of wm_mp4.mp4 is tiled with "VAWE DRAFT". Frame 60 of wm_alpha.webm is clean. Exit 0, no warning, on both. The flag's own doc string says it exists for "free previews", and Makefile:216-219 documents `make watermark` + `--watermark` as the way to gate them, so the one export a customer can drop straight onto their own footage is the one that comes out unmarked.

**repro**

```bash
./bin/vawe formats/scene/_glowA.json --draft --alpha --watermark assets/watermark/draft.png --out /tmp/w.webm && ffmpeg -y -i /tmp/w.webm -vf "select=eq(n\,60)" -vframes 1 /tmp/w.png   # /tmp/w.png has no watermark
```

**fix** Thread watermark into encode.VideoAlpha and encode.Composite (a second `-i wm` plus `[1:v][0:v]scale2ref[wm][base];[base][wm]overlay=0:0[v]` before the codec args, same shape as encode.Video's filter_complex). If the alpha path genuinely cannot carry it, fail loudly instead: `return fmt.Errorf("--watermark is not supported with --alpha/--bg")` in render.Render.

**survived refutation because** Reproduced exactly against a fresh build of HEAD (go build ./cmd/render; internal/ and cmd/ clean in git status, so not a stale binary or stale file). Rendered _glowA.json twice with --watermark assets/watermark/draft.png, once plain and once with --alpha, then pulled frame 60 of each with ffmpeg: the mp4 is tiled with "VAWE DRAFT", the webm is completely clean. Both exited 0 with no warning that the flag was dropped. Code confirms: render.go:75 sets transparent := o.Transparent || o.BgVideo != ""; the block returns at 107 (--bg) or 114 (--alpha); o.Watermark is read only at line 132, below both returns; encode.VideoAlpha and encode.Composite take no watermark argument. All four refutation angles failed: (1) not documented as intentional anywhere - encode.go:21, cmd/render/main.go:53 ("laid over every frame") and mcp/pipeline.mjs:102 ("the only difference between the free preview and the paid file") all imply the opposite; (2) reporter did not misread the path, verified by execution; (3) not already fixed on disk. Where the claim overstates: the "free preview ships clean" revenue-leak framing does not hold. --alpha and --bg are CLI-only flags, not settable from scene JSON (cmd/render/main.go:52-54), and the only paywall is the MCP server, whose mcp/pipeline.mjs:106-112 builds argv as [scenePath, --out, outFile] plus optional --aspect/--watermark and never passes --alpha or --bg. So vawe_draft cannot be steered onto the unmarked path; exploiting it requires running bin/vawe directly, where one could simply omit --watermark anyway. No auth boundary is crossed. What survives is a genuine silent-substitution bug - the engine accepts an input and ignores it with exit 0 and no warning, the class CLAUDE.md names "the worst failure" - but it is not a shipped paywall bypass. Hence medium, not high.

---

### [ ] The "CAP AT 4" that fixed the corrupted-frame bug is only a default — --workers 8+ is still accepted with no clamp and no warning

**where** `cmd/render/main.go:36-45 (comment) and :46 (`flag.Int("workers", max(1, min(runtime.NumCPU()-1, 4)), …)`); internal/scene/scene.go:427-431 only clamps upward from 1 and downward to `total``  ·  **area** pipeline  ·  **class** other

**evidence**

> The source comment is written as a hard constraint ("CAP AT 4, NOT 8", "8 workers gave 8-11 corrupted frames per run and a DIFFERENT set each run, 4 workers gave zero"), and docs/MISTAKES.md #190 records the fix as "Render at 4 workers, not 8." Nothing enforces it:
> 
>   $ ./bin/vawe formats/scene/_glowA.json --draft --workers 12 --out /tmp/w12.mp4
>   ▶ scene : capturing across 12 workers…
>   ✓ done → /tmp/w12.mp4  (4.0s, 120 frames)
>   exit=0
> 
> 12 browsers, no clamp, no warning, exit 0 — three times the count their own measurement says produces silently corrupted frames. Compounding it, `--concurrency N` on the --all path multiplies against --workers with no shared budget.
> 
> The safety net the comment points at does not exist either:
>   $ grep -n flicker Makefile   -> no matches
>   $ find . -name 'flicker*' -not -path './node_modules/*'   -> nothing
> So the one instrument for this defect class is unavailable to anyone who follows the comment.

**repro**

```bash
./bin/vawe formats/scene/_glowA.json --draft --workers 12 --out /tmp/w12.mp4 2>&1 | head -1   # prints "capturing across 12 workers…"
```

**fix** Clamp in internal/scene/scene.go next to the existing bounds: `const maxWorkers = 4; if workers > maxWorkers { fmt.Fprintf(os.Stderr, "! --workers %d exceeds the raster-safe cap, using %d (MISTAKES #190)\n", workers, maxWorkers); workers = maxWorkers }`, with VAWE_UNSAFE_WORKERS=1 as the deliberate override. Put the cap where the browsers are actually spawned so --concurrency cannot route around it.

**survived refutation because** Reproduced verbatim: `./bin/vawe formats/scene/_glowA.json --draft --workers 12` prints "capturing across 12 workers…" and exits 0. Traced the full path — cmd/render/main.go:46 sets 4 only as a flag DEFAULT, :58/:108 copy *workers into render.Options unmodified, internal/render/render.go:83 forwards it, internal/scene/scene.go:427-431 clamps only to [1, total]. No other reference to Workers exists in the Go tree, so there is no clamp and no warning. Not documented as an intentional escape hatch: the adjacent --ss flag carries an explicit "a flag is what makes testing it possible" note while --workers carries the opposite, a hard-constraint comment, and docs/MISTAKES.md #190 (line 4290) records the fix as "Render at 4 workers, not 8." Not stale: current main matches. Reachable beyond raw binary use — Makefile:121 (`make dev`) passes WORKERS= straight through unclamped. The referenced safety net is genuinely absent: `flicker-check` appears only in that source comment and MISTAKES.md, with no Makefile target and no script. Severity discounted to medium, not high: the repro proves only that the flag is unclamped, not that it corrupts (it ran --draft/ss=1 on a 120-frame scene, while #190's corruption was measured at final ss=2 on 588 frames), and every automated path — make video, --all at concurrency 1, animatic — stays at 4 or below, so reaching the bad regime requires a deliberate opt-in.

---

### [ ] --watermark is drawn at 2x size and cropped on every non-draft render, because scale2ref sizes the sheet against the SUPERSAMPLED frame instead of the final one

**where** `internal/encode/encode.go:68`  ·  **area** pipeline  ·  **class** other

**evidence**

> encode.Video builds `fc := "[1:v][0:v]scale2ref[wm][base];" + "[base]scale=W:H:flags=area[g];" + "[g][wm]overlay=0:0[v]"`. scale2ref's reference is [0:v], the RAW captured frame, which on a final render is ss=2 supersampled (render.go:126 sets sw/sh only when ss>1 on the JPEG path, i.e. exactly when the frames are 2x). So [wm] is sized to 2160x3840 (or 3840x2160), [base] is then scaled DOWN to 1080x1920, and the 2x watermark is overlaid at 0:0 and clipped to the top-left quarter. The comment on line 47 asserts the opposite ("Placed first in the chain so grain and the watermark apply at final size").
> 
> Proved end-to-end on a real scene, same command, same PNG sheet:
>   ./bin/vawe formats/scene/_glowA.json --watermark assets/watermark/draft.png --out /tmp/wm_final.mp4   -> frame shows ~6 huge 'VAWE DRAFT' repeats, words sliced off at every edge
>   ./bin/vawe formats/scene/_glowA.json --draft --watermark assets/watermark/draft.png --out /tmp/wm_draft.mp4  -> frame shows the intended dense tiled sheet (draft = ss 1, so sw/sh are 0 and no scale is inserted, which accidentally makes it correct)
> Also reproduced with the literal ffmpeg args in /tmp/wmtest (asis.mp4 vs a corrected chain), on synthetic 2160x3840 frames.
> 
> This is the product's monetization boundary: mcp/pipeline.mjs:105-112 renders the FREE PREVIEW with `--watermark` and no `--draft`, so every free preview the MCP server has ever shipped carries the broken watermark. internal/encode has no tests (`go test ./...` = 4 tests across 6 packages, none in encode/render/queue), and no gate renders a watermarked frame.

**repro**

```bash
./bin/vawe formats/scene/_glowA.json --watermark assets/watermark/draft.png --out /tmp/wm_final.mp4 && ./bin/vawe formats/scene/_glowA.json --draft --watermark assets/watermark/draft.png --out /tmp/wm_draft.mp4 && ffmpeg -y -i /tmp/wm_final.mp4 -frames:v 1 /tmp/wm_final.png && ffmpeg -y -i /tmp/wm_draft.mp4 -frames:v 1 /tmp/wm_draft.png && open /tmp/wm_final.png /tmp/wm_draft.png
```

**fix** Scale the base BEFORE scale2ref so the watermark is sized against the final frame: build the chain as `[0:v]<scaleFx>[base];[1:v][base]scale2ref[wm][b2];[b2][wm]overlay=0:0[v]` (verified identical-to-draft output in /tmp/wmtest/correct.mp4). Add a Go test on encode.Video that renders 1 supersampled frame with a watermark and asserts the sheet's tile pitch matches the ss=1 render.

**survived refutation because** Could not refute; reproduced end-to-end. Built a fresh binary from HEAD (go build -o /tmp/skep/vawe ./cmd/render, HEAD b2ca970) and rendered formats/scene/_glowA.json with and without --draft: /tmp/skep/wm_final.png shows ~6 oversized 'VAWE DRAFT' repeats sliced at every edge, /tmp/skep/wm_draft.png shows the intended dense tile. Also isolated it with the literal ffmpeg chain on synthetic 2160x3840 frames (/tmp/skep/asis.png vs a reordered /tmp/skep/fixed.png). Mechanism confirmed by reading: encode.go:68 makes scale2ref's reference [0:v], the raw frame, which render.go:76 supersamples 2x on every non-draft render, and render.go:125-131 passes sw/sh only in that same case, so the sheet is built at 2160x3840, the base is scaled down after, and overlay=0:0 shows the sheet's top-left quarter. Refutation attempts all failed: the comment at encode.go:46-48 asserts the opposite ("so grain and the watermark apply at final size"), so it is not documented intent; nothing in CLAUDE.md or docs/MISTAKES.md covers it; it is not fixed on disk; and mcp/pipeline.mjs:105-112 passes --watermark with no --draft, so the free preview takes this path. I do downgrade the reporter's severity framing: the sheet still covers the whole frame, so no paid output leaks and the monetization boundary holds. The damage is cosmetic, an oversized edge-clipped watermark on free previews. Real defect, medium.

---

### [ ] The Go audio mixer silently decodes 24-bit and 32-bit-int PCM WAVs to pure silence, while every JS reader in the repo handles them

**where** `internal/audio/audio.go:330`  ·  **area** pipeline  ·  **class** silent-substitution

**evidence**

> readWavMono's sample switch has cases only for `format==3 && bits==32` (float), `bits==16` and `bits==8`. A 24-bit or 32-bit-integer PCM file falls through every case, so `v` stays 0 for every sample. The function still returns a non-nil *wav with the correct rate and sample count, so nothing downstream can tell: audio.Render mixes silence, writes the WAV, returns true, encode.Mux attaches a silent AAC track, and the render prints "done".
> 
> Same two files, one made by ffmpeg at each depth:
>   Go readWavMono:  s16.wav -> 44100 samples, PEAK 0.1250 ; s24.wav -> 44100 samples, PEAK 0.0000
>   repo JS reader (scripts/media/wav-read.mjs): s16.wav bits 16 PEAK 0.1250 ; s24.wav bits 24 PEAK 0.1250
> 
> The repo already knows this matters and fixed it everywhere except the one reader that reaches the shipped video. scripts/media/wav-read.mjs:2 exists because '...handles 16/24/32-bit PCM plus 32-bit float, because the repo holds both synthesized 16-bit cues and recorded 24-bit ones', and scripts/gates/sfx-audit.mjs:51 repeats it: 'the recorded Mixkit ones are 24-bit'. sfx-audit therefore reads a 24-bit cue happily and passes it; core/validate.mjs:741-768 only checks that the file EXISTS. Both gates go green on a bed/VO/cue that renders as silence. (Every .wav currently under assets/ is 16-bit, so this is latent for repo assets and live for any user-supplied VO, absolute-path music, or a newly dropped 24-bit cue.)

**repro**

```bash
rm -rf /tmp/wavprobe && mkdir -p /tmp/wavprobe && cp internal/audio/audio.go /tmp/wavprobe/ && ffmpeg -v error -y -f lavfi -i "sine=f=440:d=1:r=44100" -c:a pcm_s24le /tmp/wavprobe/s24.wav && ffmpeg -v error -y -f lavfi -i "sine=f=440:d=1:r=44100" -c:a pcm_s16le /tmp/wavprobe/s16.wav && printf 'package audio\nimport ("math";"testing")\nfunc TestX(t *testing.T){for _,f:=range []string{"/tmp/wavprobe/s16.wav","/tmp/wavprobe/s24.wav"}{w:=readWavMono(f);p:=0.0;for _,v:=range w.data{if math.Abs(v)>p{p=math.Abs(v)}};t.Logf("%%s -> %%d samples, PEAK %%.4f",f,len(w.data),p)}}\n' > /tmp/wavprobe/x_test.go && (cd /tmp/wavprobe && go mod init p >/dev/null 2>&1; go test -v -run TestX .) && node -e "import('./scripts/media/wav-read.mjs').then(m=>{for(const f of ['/tmp/wavprobe/s16.wav','/tmp/wavprobe/s24.wav']){const w=m.readWav(f);let p=0;for(const v of w.mono)p=Math.max(p,Math.abs(v));console.log(f,'bits',w.bits,'PEAK',p.toFixed(4));}})"
```

**fix** Port the three lines from scripts/media/wav-read.mjs: add `case bits == 24: v = float64(int32(uint32(buf[o])|uint32(buf[o+1])<<8|uint32(int8(buf[o+2]))<<16)) / 8388608` and `case format == 1 && bits == 32: v = float64(int32(binary.LittleEndian.Uint32(buf[o:o+4]))) / 2147483648`, and make readWavMono return nil for any (format,bits) pair it still cannot decode so audio.Render can report the file rather than mix zeros. Then have core/validate.mjs read the fmt chunk of every referenced wav and fail on a depth the Go mixer does not implement.

**survived refutation because** Tried to refute; could not. Reproduced independently and then went further.

1) Decoder level (/tmp/wavprobe, copy of internal/audio/audio.go, ffmpeg-made sines):
   s16.wav -> 44100 samples PEAK 0.1250; s24.wav -> 44100 samples PEAK 0.0000; s32.wav (pcm_s32le, format 1) -> 44100 samples PEAK 0.0000.
   The switch at internal/audio/audio.go:328-337 has only `format==3 && bits==32`, `bits==16`, `bits==8`. 24-bit and 32-bit-INT fall through with v=0, and a non-nil *wav with the right rate and sample count is still returned, so nothing downstream can distinguish it from real audio.

2) I went past the reporter and exercised the public mixer API end-to-end (/tmp/mixprobe): audio.Render(Config{Music:"assets/m16.wav"},...) -> Render=true, mixed peak 0.0750; Config{Music:"assets/m24.wav"} -> Render=true, mixed peak 0.0000. A fully silent WAV is written and `true` is returned, so internal/render/render.go:139 sets hasAudio=true and muxes a silent track. No error, no warning.

Refutation attempts, all failed:
- Intentional/documented? The only note is the terse header comment "minimal WAV decode (PCM16/PCM8/float32)" — it states the scope but never sanctions silent output. The repo's own doctrine points the other way: core/validate.mjs:741 says "Silence is the worst failure, so name each problem here", and MISTAKES #132 is the same silent-substitution class. MISTAKES.md:925 records that the JS decoder was widened to 16/24/32-bit + float precisely because recorded samples are 24-bit; the Go reader was never widened.
- Misread path? No. readWavMono is the only WAV reader in the Go renderer (internal/audio/audio.go:178, :263) and is what render.go calls.
- Already fixed on disk? No; the current file has no 24-bit or 32-bit-int case.
- Reachable? Yes but not by today's assets. All 27 .wav under assets/ are pcm_s16le, and scripts/media/tts.mjs's `say`+ffmpeg chain yields pcm_s16le here (verified), so no in-repo asset triggers it. It is live for anything an author supplies: audio.vo (an externally recorded VO is commonly 24-bit), audio.music by path (resolve() accepts absolute paths), or a newly dropped recorded cue — exactly the 24-bit recorded case scripts/gates/sfx-audit.mjs:51 and scripts/media/wav-read.mjs:3 say the repo holds. Both gates go green: validate.mjs only checks existence, sfx-audit decodes with the widened JS reader and sees a healthy waveform.

Severity medium rather than high only because nothing currently in the repo hits it; the failure mode itself (silent success on the shipped render path) is the worst class this codebase names.

---

### [ ] --bg composites the graphics over a background video that is 100% hidden, because the overlay it builds is the same opaque frame

**where** `internal/render/render.go:96-104 (encode.VideoAlpha → encode.Composite)`  ·  **area** pipeline  ·  **class** silent-substitution

**evidence**

> Rendered zerochrome three ways and compared with PSNR:
>   ./bin/vawe formats/scene/zerochrome.json --draft --out /tmp/zc.mp4
>   ./bin/vawe formats/scene/zerochrome.json --draft --bg /tmp/bgvideo.mp4 --out /tmp/comp.mp4   → "✓ done (3.0s, 90 frames · over video)"
>   composite vs graphics-only:  PSNR average 30.57  (essentially the same picture)
>   composite vs the background video: PSNR average 11.38  (nothing of it survives)
> Same root cause as the --alpha finding: encode.Composite overlays a yuva420p layer whose alpha is uniformly 255, so `overlay=0:0` writes the graphics over every background pixel. ffmpeg exits 0 and render.go prints "· over video".

**repro**

```bash
./bin/vawe formats/scene/zerochrome.json --draft --out /tmp/zc.mp4 && ./bin/vawe formats/scene/zerochrome.json --draft --bg /tmp/zc.mp4 --out /tmp/comp.mp4 && ffmpeg -hide_banner -i /tmp/comp.mp4 -i /tmp/zc.mp4 -lavfi "[0][1]psnr" -f null - 2>&1 | grep average
```

**fix** Fix the alpha suppression in scene.js (previous finding). Additionally, have render.go measure the captured overlay's alpha (it already decodes PNGs in pngDiffRatio) and abort with a named error when the graphics layer is fully opaque — a composite that cannot show the background is a wrong deliverable, not a slow one.

**survived refutation because** Could not refute; independently reproduced and confirmed the mechanism directly. Ran the repro: zerochrome --draft vs --bg /tmp/bgvideo.mp4 gives PSNR average 31.87 (y 30.17) against the graphics-only render, i.e. the same picture, and the CLI exits 0 printing "· over video". Proved the cause rather than inferring it: exporting the overlay alone with --alpha and measuring the alpha plane (format=yuva420p,alphaextract,signalstats) yields YMIN=YAVG=YMAX=255 on every sampled frame, so overlay=0:0 in encode.Composite covers every background pixel. Same result on a second scene (sample.json), so it is not zerochrome-specific. All four refutation angles fail: (1) not intentional — README.md:95 and docs/CODEMAPS/ARCHITECTURE.md:46 advertise --alpha as a real transparent overlay export and MISTAKES.md has no entry; (2) not a misread — render.go:72 sets transparent for --bg, scene.Capture adds &alpha=1, core/boot.js:296 adds html.alpha, but core/tokens.css:44 only clears CSS backgrounds while the backdrop is painted into the #cv canvas bitmap (core/seams.js:479 calls #cv "the opaque backdrop"), and grep shows no JS anywhere reads the alpha class; (3) not unreachable — bg is required with no transparent/none value in schema.json and the produce baseline injects one, so 136 of 143 scene JSONs declare a bg and the 7 without are .intent/schema sidecars, meaning no reachable scene composites correctly; (4) not stale — clean tree on main, ran the checked-in ./bin/vawe. Severity medium not high only because both --bg and --alpha sit off the main `make video` loop and no shipping scene uses them; within the feature the failure is total and silent.

---

### [ ] --alpha with an explicit --out *.mp4 silently strips the alpha channel: the .webm extension the alpha path computes is discarded whenever --out is given

**where** `cmd/render/main.go:133-136 (ext) and cmd/render/main.go:146-147 (outPath := *out, ext only applied on the auto-named branch)`  ·  **area** pipeline  ·  **class** silent-substitution

**evidence**

> `./bin/vawe formats/scene/zerochrome.json --draft --alpha --out /tmp/audit_alpha.mp4` printed "▶ encoding (alpha / vp9)… ✓ done → /tmp/audit_alpha.mp4 (3.0s, 90 frames · alpha)", exit 0. ffprobe on the result:
>   codec_name=vp9
>   pix_fmt=yuv420p          ← encode.VideoAlpha asked for yuva420p
> ffmpeg dropped the alpha plane because the MP4 muxer has no place to put VP9 alpha side data, and said nothing. main.go:133 computes ext=".webm" for this mode but line 146 assigns outPath := *out and line 147 only rebuilds the name (and therefore only applies ext) when --out was empty or several aspects were asked for.

**repro**

```bash
./bin/vawe formats/scene/zerochrome.json --draft --alpha --out /tmp/audit_alpha.mp4 && ffprobe -v error -show_entries stream=codec_name,pix_fmt -of default=nw=1 /tmp/audit_alpha.mp4
```

**fix** On the alpha path, reject an --out whose extension is not .webm (or force the extension and say so), the same way the aspect tag is now forced. Silently writing a codec into a container that cannot carry its alpha is the exact failure mode --alpha exists to avoid.

**survived refutation because** Tried to refute it; could not. Confirmed, though the reporter's cited evidence line is itself a misread.

Repro (mine, exact): `./bin/vawe formats/scene/zerochrome.json --draft --alpha --out /tmp/audit_alpha.mp4` → "▶ encoding (alpha / vp9)… ✓ done → /tmp/audit_alpha.mp4 (3.0s, 90 frames · alpha)", exit 0, no ffmpeg warning surfaced.

Where the reporter is wrong: `pix_fmt=yuv420p` proves nothing. The *correct* .webm export reports `pix_fmt=yuv420p` too, because VP9 alpha rides as side data, not in the main stream's pix_fmt. I rendered the same scene to `/tmp/audit_alpha.webm` and got the identical `pix_fmt=yuv420p`.

Where the reporter is right anyway, by a stronger test:
- Container metadata: the .webm carries `streams.stream.0.tags.alpha_mode="1"`; the .mp4 carries no alpha_mode tag at all.
- Controlled decode, alpha-aware decoder (`-c:v libvpx-vp9`), on a transparent 64x64 PNG sequence run through the *exact* argv from `internal/encode/encode.go:91-96` into each container:
    source PNG corner alpha → `0000 0000 ...`
    o.webm corner alpha     → `0000 0000 ...`   (alpha preserved)
    o.mp4  corner alpha     → `ffff ffff ...`   (alpha gone)
  ffmpeg exits 0 and says nothing.

Code path reads as reported. /Users/vandit/Developer/code/shortwave/cmd/render/main.go:133-135 computes `ext = ".webm"` when `*alpha && *bg == ""`; line 146 `outPath := *out` and line 147 `if outPath == "" || len(aspects) > 1` mean `ext` is only ever applied on the auto-named branch. Nothing between there and `encode.VideoAlpha` validates the extension (/Users/vandit/Developer/code/shortwave/internal/render/render.go:109-113).

Not intentional, not documented: /Users/vandit/Developer/code/shortwave/cmd/render/main.go:51 and docs/CODEMAPS/ARCHITECTURE.md:46 both state `--alpha` produces a VP9 `.webm`. The one comment near line 147 ("An explicit --out still wins") is about the *aspect tag*, not the container, and was written for a different bug (MISTAKES.md #215). The engine itself knows the extension is load-bearing: the `--bg` composite path hard-codes its intermediate as `"."+base+".ov.webm"` (render.go:96). docs/MISTAKES.md:5091 ("Alpha stays PNG... exactly the kind of silent substitution this repo keeps making") is the same class, treated as a bug.

Honest limit on impact, which is why not high: I could not make a real scene produce a transparent pixel. `html.alpha` only clears page/body/stage backgrounds (core/tokens.css:44); the scene-level `bg` field is required and still paints a full-bleed layer, so both zerochrome.json and sample.json came out fully opaque at frame 1 corner even in the correct .webm. So today the wrong file is usually not visibly different, and hitting it needs a user who both passes `--alpha` and overrides `--out` with a non-webm name. Real silent-substitution defect, limited blast radius.

No repo files modified; all work in /tmp.

---

### [ ] The render's default frame rate is 60, but the schema label, render.go's own field comment and CLAUDE.md all say 30 — and `make frame N=<n>`, the documented frame-check step, still resolves frame numbers at 30fps

**where** `internal/render/render.go:31 and :50-62; formats/scene/schema.json fields.fps label; scripts/author/preview.mjs:47`  ·  **area** pipeline  ·  **class** stale-doc

**evidence**

> Rendered a scene that pins no fps:
>   ./bin/vawe formats/scene/zerochrome.json --out /tmp/audit_zc.mp4   → "(3.0s, 180 frames)"
>   ffprobe → r_frame_rate=60/1  nb_frames=180  duration=3.000000
> What the docs say: render.go:31 `FPS float64 // per-scene frame rate (opt-in; default 30, use 60 for smoother fast motion)`; formats/scene/schema.json fps label "Frame rate (default 30; use 60 for smoother fast motion)"; CLAUDE.md line 1 "one rendered video (30fps mp4 …)". The code at render.go:56-61 sets 60 for any non-draft render.
> Consequence, not just wording: scripts/author/preview.mjs:47 pins &fps=30 in the scene URL, so `make frame M=scene N=<n>` maps a frame number to twice the time it has in the deliverable. On the 3.0s zerochrome:
>   node scripts/author/preview.mjs scene 120 formats/scene/zerochrome.json
>   → "scene f120 (4.0s) → /tmp/preview_scene_120.png"
> Frame 120 of the shipped mp4 is at 2.0s; the documented QA tool rendered 4.0s, a full second past the end of the film. (scripts/gates/seam-snap.mjs:29-38 already reads the rate from the file and comments that "Finals now render at 60" — so one consumer was fixed and the rest were not.)

**repro**

```bash
./bin/vawe formats/scene/zerochrome.json --out /tmp/audit_zc.mp4 && ffprobe -v error -show_entries stream=r_frame_rate,nb_frames -of default=nw=1 /tmp/audit_zc.mp4 && node scripts/author/preview.mjs scene 120 formats/scene/zerochrome.json
```

**fix** Correct the three "default 30" statements to 30-draft / 60-final, and make preview.mjs derive fps the way seam-snap.mjs already does (scene JSON fps, else 60, else 30 with --draft) instead of hardcoding &fps=30, so a frame number means the same instant in the sheet and in the mp4.

**survived refutation because** Reproduced fully. ./bin/vawe formats/scene/zerochrome.json (scene pins no "fps") printed "(3.0s, 180 frames)" and ffprobe returned r_frame_rate=60/1, nb_frames=180; make video (Makefile:112) passes no -fps and no --draft, so render.go:56-61 picks 60 for everything that ships. All three doc surfaces still say 30: internal/render/render.go:31 struct comment, formats/scene/schema.json:45 label, CLAUDE.md:3. Blame confirms the drift instead of excusing it — commit c224bb6 changed the default and updated only the two mp4-reading gates named in docs/MISTAKES.md #205 (seam-snap.mjs, flicker-check.mjs), leaving the comment two lines above the change, the schema and CLAUDE.md untouched. The preview mismatch also reproduced: scripts/author/preview.mjs:47 hard-codes &fps=30, so f120 rendered at 4.0s, a second past the end of the 3.0s film, while frame 120 of the deliverable is at 2.0s — the exact anti-pattern MISTAKES #205 closes by stating ("if a number's meaning depends on a setting, read the setting"). Two findings do soften it, so I graded down rather than refuting: the Makefile frame: target (Makefile:156-157) passes only $(M) $(N) with no data file, so `make frame M=scene N=<n>` as documented previews sample.json and cannot reach the reporter's repro path (which used a direct node call with a third arg); and preview.mjs prints the seconds it rendered ("f120 (4.0s)"), so the skew is labelled, not silent. Every other 30fps consumer I grepped (beats.mjs:54, reveal.mjs:65, slop.mjs:39, studio.mjs:127, motion-audit.mjs:35, core/validate.mjs:140, core/motion.js:9) samples by seconds and converts within the same 30fps clock, so it stays self-consistent. No shipped mp4 is wrong; the blast radius is author-time inspection plus three misleading docs.

---

### [ ] The Go audio mixer reads any absolute path on the render host and bakes it into the delivered mp4, with none of the default-deny containment the HTTP server documents for untrusted scenes

**where** `internal/audio/audio.go:232-245 (resolve), reached from internal/render/render.go:135`  ·  **area** pipeline  ·  **class** other

**evidence**

> internal/scene/scene.go:44-58 states the threat model explicitly ("This process renders scenes written by strangers (the MCP product) … the SERVER, not the layer, decides what may leave") and enforces the `served` prefix allowlist for everything the browser can fetch. audio.resolve has no equivalent: `a := p; if !filepath.IsAbs(a) { a = filepath.Join(base, p) }; if exists(a) { return a }` — an absolute path is used verbatim, and a relative one is joined without any containment check against the base.
> Proven end to end with a scene already committed to this repo, whose audio.vo points outside the repository and outside every served prefix:
>   formats/scene/onefile.animatic.json → "vo": "/tmp/animatic/onefile-storyboard/scratch.wav"
>   ./bin/vawe formats/scene/onefile.animatic.json --draft --out /tmp/audit_animatic.mp4  → "▶ muxing audio… ✓ done (13.2s, 397 frames)"
>   ffprobe → codec_type=audio  codec_name=aac  duration=13.211995
> That /tmp WAV was read by the render process and encoded into the output. Any WAV on the host is reachable the same way via audio.music / audio.vo.

**repro**

```bash
./bin/vawe formats/scene/onefile.animatic.json --draft --out /tmp/audit_animatic.mp4 && ffprobe -v error -show_entries stream=codec_type,codec_name -of default=nw=1 /tmp/audit_animatic.mp4
```

**fix** Give audio.resolve the same wall the file server has: resolve every candidate with filepath.Abs and require it to stay under one of the render bases (formatDir, repoRoot/assets, .vawe-data), rejecting absolute paths and any join that escapes. Keep a VAWE_AUDIO_ANY=1 debug escape hatch matching VAWE_SERVE_ALL if local absolute-path VO is genuinely wanted.

**survived refutation because** Reproduced and strengthened, not refuted. Ran the given repro (renders, muxes audio). Went further to prove content exfiltration rather than mere track presence: generated a 997 Hz sine at /tmp/skeptic/tone.wav, set audio.vo to it in a scene, rendered, and Goertzel on the output mp4 audio at t=5s gave 997Hz=0.0624 vs 440Hz=0.0002 and 2000Hz=0.00008 (rms 0.088) — the out-of-repo file's waveform is in the delivered mp4. Refutation attempts all failed: (a) not documented anywhere — scene.go:44-58 states the stranger/MCP threat model explicitly and core/validate.mjs:750 deliberately mirrors the absolute-path resolution while checking only existence, never containment; nothing in docs/MISTAKES.md covers it; (b) code path read correctly — audio.go:92-94 calls resolve for Music and VO, resolve at :233-245 is as quoted; (c) reachable from the untrusted surface — mcp/server.mjs:239 is the only pre-disk guard and calls pipe.illegalRefs, which at mcp/pipeline.mjs:45 matches ONLY keys named `src`; I ran it on {audio:{vo:'/tmp/...',music:'/etc/hosts'}} and it returned [], so vawe_draft accepts it and the caller polls back their own mp4 (closed exfil loop); (d) not fixed on disk. Two reporter errors, neither load-bearing: formats/scene/onefile.animatic.json is NOT committed (.gitignore:50 ignores formats/scene/*.json; git ls-files empty), and the read is not "any absolute path" — readWavMono (audio.go:299) requires literal RIFF magic and a parseable fmt/data chunk, so only real WAV files are reachable, which caps severity below the arbitrary-file-read the `served` wall stops. Two aggravating findings: relative paths escape too (filepath.Join(base,p) with ../ climbs out of both bases unchecked), and core/validate.mjs:768 returns `audio.vo "<path>" not found` synchronously to the MCP caller, an existence oracle for any absolute host path regardless of file type. Severity medium: genuine containment gap in the codebase's own stated threat model, bounded to WAV content plus a path-existence oracle. No repo file modified (temp scene created under gitignored formats/scene/ and deleted; git status back to baseline).

---

### [ ] `make effects-check` fails on a clean HEAD: docs/EFFECTS.md is missing 6 shipped effects, and no aggregate gate runs it

**where** `docs/EFFECTS.md:382 / Makefile:588`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> Working tree clean (`git status --short` → empty). `make effects-check` → `✗ docs/EFFECTS.md is stale — run \`make effects\`` exit 1. Diffing the doc's tables against the live registries (script /tmp/diff.mjs importing core/compositions/index.js, blueprints/index.mjs, core/backgrounds.js, core/clips.js) prints: Compositions doc 1 reg 2 → missing `commaSplit`; Beat blueprints doc 10 reg 12 → missing `typedHook`, `morphButton`; Backgrounds doc 21 reg 22 → missing `liquid`; Enter/exit anims doc 17 reg 19 → missing `wipe-left`, `none`. Meanwhile `make docs-drift` prints `✓ docs in sync — no shipped effect listed as missing, every quoted registry count right` — it only covers ROADMAP/PRIMITIVES/bg presets. `grep -rn effects-check Makefile scripts .githooks` shows the only reference is its own target definition: nothing in `check`, `ship`, `review`, `author-check` or any hook runs it. CLAUDE.md step 0a tells authors to read docs/EFFECTS.md as "the whole arsenal", so six shipped effects are invisible to every author.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && make effects-check
```

**fix** Run `make effects` to regenerate docs/EFFECTS.md, and add `effects-check` to the `check`/`review` aggregate (or fold the EFFECTS.md comparison into `docs-drift`, whose stated job already is "no shipped effect listed as missing").

**survived refutation because** Reproduced exactly on clean HEAD b2ca970: `make effects-check` exits 1 with "docs/EFFECTS.md is stale". Verified independently with my own script importing core/compositions/index.js, blueprints/index.mjs, core/backgrounds.js, core/clips.js: doc is missing `commaSplit`, `typedHook`, `morphButton`, `liquid`, `wipe-left` (I confirm 5 of the reported 6; `none` matched my regex loosely). Gate gap confirmed: grep across Makefile/scripts/.githooks/.github finds effects-check only at its own definition (Makefile:588); `check`, `ship`, `review` and .githooks/pre-push (schema-check + lib-test only) never run it, and scripts/gates/docs-drift.mjs contains zero occurrences of "EFFECTS" yet reports green. Refutation attempts all failed: docs/MISTAKES.md:2929 explicitly relies on effects-check as the proof mechanism, so the failure is unintended, not documented-as-expected; nothing is fixed on disk; the --check path does a whole-file compare of exactly what ships. Extra finding the reporter missed: the doc footer says 245 effects/16 families while CLAUDE.md:196 still quotes 240/15. Severity is medium, not high: no render or runtime breakage, one `make effects` fixes the doc, but CLAUDE.md step 0a points every author at EFFECTS.md as the arsenal and no gate will catch the next drift.

---

### [ ] `make blueprints` — step 0 of the mandatory authoring ladder — is a silent no-op, shadowed by the repo's blueprints/ directory

**where** `Makefile:582 (target `blueprints`), Makefile:4 (.PHONY list)`  ·  **area** truth  ·  **class** dead-code

**evidence**

> $ make blueprints
> make: `blueprints' is up to date.
> (exit 0, no output)
> 
> A directory `blueprints/` exists at the repo root and `blueprints` is absent from the .PHONY list on Makefile:4, so make treats the directory as the target's up-to-date output and never runs the recipe. The recipe itself is fine:
> $ node scripts/site/blueprints-catalog.mjs
>   BEAT BLUEPRINTS · 12 directed beats  (compose a video as a sequence of these)
>   • kineticHook …
> 
> I checked every Makefile target against the filesystem; `blueprints` is the only one that collides with a real path and is not .PHONY. It is cited as the FIRST authoring step in CLAUDE.md:192 ("0. Compose from blueprints"), CLAUDE.md:165, docs/CRAFT/AUTHORING-WALKTHROUGH.md:62, docs/CRAFT/BLUEPRINTS.md:21, docs/CRAFT/SHOW-DONT-TELL.md:102, docs/CRAFT/FRAME-SPEC.md:34 and docs/CRAFT/STORYBOARD-TEMPLATE.md:75. An author following the docs sees a success message and an empty catalog, then hand-authors plain rise+fade — the exact failure CLAUDE.md calls "the #1 failure".

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && make blueprints
```

**fix** Add `blueprints` to the .PHONY line in Makefile:4. (A broader fix: make .PHONY cover every non-file target — a lint over `^[a-z-]+:` vs the filesystem would have caught this.)

**survived refutation because** Repro is exact. `ls -d blueprints` shows a real directory at repo root; `make blueprints` prints `make: 'blueprints' is up to date.` and exits 0 without running the recipe; `grep -n '^\.PHONY' Makefile` confirms line 4's list omits `blueprints`, and the target at Makefile:582 has no prerequisites, so it can never fire while the directory exists. Running the recipe body directly (`node scripts/site/blueprints-catalog.mjs`) prints the full 12-beat catalog, so only the make-level shadowing is at fault. I tried four ways to refute: (a) intentional/documented — no, docs/MISTAKES.md:2884 and :4239 both describe `make blueprints` as a command that prints/regenerates, and scripts/author/concept.mjs:194 emits it into generated storyboards; no comment or waiver mentions the collision; (b) misread path — no, the Makefile comment names blueprints/index.mjs as the target's SOURCE, and there is no vpath or second rule; (c) stale — no, current main, Makefile unmodified; (d) unreachable/harmless — only partly: nothing in the render path or author-check depends on the target, so no video renders wrong, and the blocking `direction-floor` gate still catches the plain rise+fade outcome downstream. Damage is limited to the documented step-0 authoring workflow silently returning nothing, which is why I rate it medium rather than high.

---

### [ ] `make review`, the documented health snapshot, fails on a clean HEAD: 2 of its 3 checks are MODULE_NOT_FOUND from pre-move script paths

**where** `verify/review.mjs:18 and verify/review.mjs:20`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> $ make review
> ▶ motion primitives (lib-test)…
> Error: Cannot find module '/Users/vandit/Developer/code/shortwave/scripts/lib-test.mjs'
> ▶ motion audit (animation over time)…
> Error: Cannot find module '/Users/vandit/Developer/code/shortwave/scripts/motion-audit.mjs'
> ==================== REVIEW ====================
>   ✗  motion primitives (lib-test)
>   ✓  layout audit (overlap/spacing)
>   ✗  motion audit (animation over time)
> ✗ 2 check(s) failed
> make: *** [review] Error 1   (exit 2)
> 
> Both scripts moved under scripts/gates/ and review.mjs was never updated:
> $ ls scripts/lib-test.mjs scripts/motion-audit.mjs
> ls: No such file or directory
> $ ls scripts/gates/lib-test.mjs scripts/gates/motion-audit.mjs   → both exist
> The Makefile's own `lib-test` (line 267) and `motion` (line 195) targets already use the scripts/gates/ paths, so only review.mjs is stale. Working tree was clean (`git status --porcelain` empty) before and after. CLAUDE.md:308 tells you to "run make review for a fast health snapshot" — it is permanently red, which trains you to ignore it and hides the two checks it is supposed to run.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && make review; echo $?
```

**fix** In verify/review.mjs change `'scripts/lib-test.mjs'` → `'scripts/gates/lib-test.mjs'` (line 18) and `'scripts/motion-audit.mjs'` → `'scripts/gates/motion-audit.mjs'` (line 20).

**survived refutation because** Reproduced verbatim on a clean tree (git status --porcelain empty): `make review` exits 2 with MODULE_NOT_FOUND for scripts/lib-test.mjs and scripts/motion-audit.mjs; both files exist only at scripts/gates/. verify/review.mjs:18,20 still spawn the pre-move paths. git show --stat f6e11f2 confirms that refactor renamed both scripts into scripts/gates/ and never touched verify/review.mjs, while Makefile:196 and Makefile:267 were updated. No comment, CLAUDE.md, or docs/MISTAKES.md entry documents this as intentional; docs/CODEMAPS/ARCHITECTURE.md:81 still advertises `make review` as working. Not already fixed on disk. Severity capped at medium because it is dev tooling only: the gates themselves pass when invoked directly (node scripts/gates/lib-test.mjs exits 0), `make lib-test`/`make motion` work, and the pre-push hook still runs lib-test, so no shipped render or scene output is affected. Fix is two path edits.

---

### [ ] site/lib/blocks.json is 5 blocks stale, so glassCard, meshPanel, spotlightCard, borderBeamCard and bento never reach the website block grid

**where** `site/lib/blocks.json:1 (generator: scripts/site/blocks-json.mjs)`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> $ node -e "console.log(require('./site/lib/blocks.json').length)"
> 148
> 
> $ make blocks-json
> blocks-json: 153 entries → site/lib/blocks.json
>   + glassCard, meshPanel, spotlightCard, borderBeamCard, bento
>   grid changed → run `make blocks-scenes` so the site has a scene + poster for it
> 
> $ git diff --stat site/lib/blocks.json
>  1 file changed, 72 insertions(+)
> 
> (reverted with git checkout immediately; working tree left clean)
> 
> The generator's own output says the grid changed and that make blocks-scenes must follow, so the committed file also has no scene/poster for those five. No gate reads site/lib/blocks.json:
> $ grep -rn 'blocks.json' scripts/gates/   → no matches

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && node -e "console.log('committed', require('./site/lib/blocks.json').length)" && node scripts/site/blocks-json.mjs
```

**fix** Run `make blocks-json && make blocks-scenes` and commit, then add a --check mode to scripts/site/blocks-json.mjs that exits non-zero when the regenerated JSON differs from the committed one, and wire it into `make site-counts` (or the pre-push hook) so the site grid cannot drift behind the registry again.

**survived refutation because** Reproduced exactly: blocks/catalog.mjs yields 153 non-overlay rows, committed site/lib/blocks.json has 148, missing glassCard, meshPanel, spotlightCard, borderBeamCard, bento (no extras). Both site consumers read the file directly (site/app/blocks/page.tsx:5 renders the grid from it; site/app/blocks/[name]/page.tsx:6,19 builds generateStaticParams from it and notFound()s otherwise), so those five are absent from /blocks and their detail pages 404. Not intentional: scripts/site/blocks-json.mjs:5-13 and docs/MISTAKES.md #111 exist precisely to prevent this drift, and no waiver or comment sanctions 148. Not already fixed on disk. One sub-claim in the report IS wrong: the five DO have scenes and posters (site/public/assets/blocks/{glassCard,meshPanel,spotlightCard,borderBeamCard,bento}.{png,json}) and site/lib/block-frames.json has 153 entries covering all five, so make blocks-scenes was run and only make blocks-json was skipped. Also, while no gate reads blocks.json (grep of scripts/gates/ is empty), scripts/gates/site-counts.mjs already FAILS today on the same root cause (features.ts:40 "148 components, registry has 153", 63->68 families, presets, themes), so the drift is not wholly unwatched. Severity medium rather than high: docs-site surface only, no effect on the renderer, scenes, or authoring gates.

---

## LOW severity

### [ ] `speed` on a paint layer is applied twice, so the effect runs at speed² (speed:2 plays 4× fast)

**where** `core/layers/paint.js:32 (with core/paint-fx.js:34,58,73,101,129)`  ·  **area** engine  ·  **class** wrong-unit

**evidence**

> core/layers/paint.js:32 scales local time by speed — `const lt = (t - start) * (L.speed ?? 1)` — and then line 35 passes the whole layer as the fx options object: `fx(ctx, w, h, lt, L.seed ?? 0, L)`. Every PAINT_FX reads `o.speed` again off that same object (paint-fx.js:73 `const sp = o.speed ?? 1`, then `Math.sin(lt * sp * …)`). Shader and raymarch do NOT do this (they pass only lt, never L), so the bug is unique to paint.
> 
> Ran, replicating paint.js frame() exactly against the real PAINT_FX.aurora with a stub 2D context that records blob centres:
>   speed 1 @ t=2 : [ 755.26, 603.52 ]
>   speed 2 @ t=1 : [ 643.46, 825.66 ]   <- should match the line above if speed were applied once
>   speed 1 @ t=4 : [ 643.46, 825.66 ]   <- what speed:2 @ t=1 actually matches (t·speed²)
> 
> 9 shipped scenes set speed on a paint layer: paint-demo.json (matrix 1.1, starfield 1.2), react-demo.json (waves 0.8), showcase-composition.json (aurora 0.8), showcase-flight.json (starfield 0.7), showcase-lumen.json (aurora 0.9), showcase-vawe-reel.json (meteor 1.1), motion-showcase.json (aurora 1.0). Every non-1.0 value is rendering at the wrong rate and nothing says so.

**repro**

```bash
node --input-type=module -e "const {PAINT_FX}=await import('./core/paint-fx.js');function stub(){const rec=[];return {rec,globalCompositeOperation:'',createRadialGradient(x,y){rec.push([+x.toFixed(2),+y.toFixed(2)]);return{addColorStop(){}}},fillRect(){},set fillStyle(v){},clearRect(){}}}const f=(tRel,L)=>{const c=stub();PAINT_FX.aurora(c,1080,1920,tRel*(L.speed??1),0,L);return c.rec[0]};console.log('speed1@t2',f(2,{speed:1}));console.log('speed2@t1',f(1,{speed:2}));console.log('speed1@t4',f(4,{speed:1}))"
```

**fix** Stop double-feeding the dial. In core/layers/paint.js:35 pass options with speed neutralised — `fx(ctx, w, h, lt, L.seed ?? 0, { ...L, speed: 1 })` — keeping the single scaling at line 32 (the shader/raymarch contract). Add a lib-test asserting PAINT_FX output at (t=2, speed=1) equals the layer path at (t=1, speed=2).

**survived refutation because** Ran the supplied repro verbatim: speed:2@t=1 produced [643.46, 825.66], identical to speed:1@t=4 and not speed:1@t=2 ([755.26, 603.52]) — speed applied twice, confirmed. Read core/layers/paint.js: line 32 scales lt by L.speed, line 35 passes the whole layer L as the fx opts object; all five effects in core/paint-fx.js re-read o.speed (lines 34, 58, 73, 101, 129) and multiply lt again. Checked every refutation angle and none held: (1) not intentional or documented — formats/scene/schema.json describes speed as a single linear rate multiplier, and the sibling layers shader.js:29, raymarch.js:28, three.js:25 scale lt identically but pass only lt onward; raymarch.js:29 even comments on giving a second time dial a distinct name (spin), so the divergence in paint is inconsistency, not design. docs/MISTAKES.md logs other paint bugs (off-window clearing, ignored opacity) but nothing about speed. scripts/gates/layer-props.mjs:57 knows paint forwards L into PAINT_FX only for prop validation. (2) Not a misread path — grep of .speed across core/ shows no normalizer strips or renames it between the scene JSON and frame(). (3) Not unreachable — 9 shipped scenes set speed on paint layers (paint-demo, react-demo, showcase-composition, showcase-lumen, showcase-flight, showcase-vawe-reel, motion-showcase). (4) Not already fixed on disk. Severity is low rather than high because every shipped value sits in 0.7-1.2, so the actual error is 0.49x-1.44x of intent: a background field drifting at a slightly wrong pace, with no crash, no visual artifact, and determinism intact (the frame stays a pure function of t). The nonlinearity would matter to anyone using speed:2 or 0.25, but no scene does.

---

### [ ] `fit:"contain"` is documented and implemented for clip/lottie layers, and the validator rejects it as not-a-boolean

**where** `formats/scene/schema.json (layers.item.fit) vs core/layers/lottie.js:14, core/layers/clip.js:7, docs/PRIMITIVES.md:321`  ·  **area** engine  ·  **class** dead-code

**evidence**

> docs/PRIMITIVES.md:321 documents `fit:"contain"` letterboxes (default fills)`. core/layers/lottie.js:14 implements it — `preserveAspectRatio: L.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'` — and core/layers/clip.js:7 writes it straight into CSS: `object-fit:${L.fit || 'cover'}`. But schema.json declares fit as `{"type":"boolean","label":"Auto-size text down to fit w"}` (the unrelated text auto-fit prop), and the validator is type-agnostic across layer types, so it blocks the documented string:
> 
>   $ node core/validate.mjs /tmp/fit-test.json     # one lottie layer with fit:"contain"
>   ✗ /tmp/fit-test.json (scene)
>       • layers[0].fit must be a boolean (got string)
>   validate: 0 ok, 1 failed   (exit 1)
> 
> Since `make video` runs author-check first, no scene can ever ship with it. Zero scenes in formats/scene/ use a non-boolean fit — not because authors don't want it, but because the gate makes it unauthorable.

**repro**

```bash
printf '{"module":"scene","theme":"linear","duration":2,"bg":[{"preset":"paper"}],"layers":[{"type":"lottie","src":"/assets/lottie/x.json","x":100,"y":100,"w":400,"h":400,"fit":"contain","start":0,"duration":2}]}' > /tmp/fit-test.json && node core/validate.mjs /tmp/fit-test.json
```

**fix** One prop is carrying two unrelated meanings. Split them: keep `fit` boolean for the text auto-fit and give the raster layers their own `objectFit` (enum cover|contain), reading it in clip.js/lottie.js and updating docs/PRIMITIVES.md:321. If the overload is kept, schema.json must declare `"type":"boolean|string"` with the enum, and the validator must accept 'cover'/'contain' on clip and lottie layers only.

**survived refutation because** Repro reproduces verbatim at HEAD: `node core/validate.mjs /tmp/fit-test.json` → `layers[0].fit must be a boolean (got string)`, exit 1. schema.json:737 declares fit as boolean with the text-only label "Auto-size text down to fit w", while core/validate.mjs:534 walks one flat field table with no per-layer-type dispatch, so the text spec is enforced on lottie/clip. Both consumers are string-typed (lottie.js:14 'contain' -> xMidYMid meet; clip.js:7 object-fit:${L.fit||'cover'}) and docs/PRIMITIVES.md:321 documents fit:"contain". No doc sanctions boolean-only: every `fit` hit in MISTAKES.md/FRAMEWORK-AUDIT.md/ROADMAP.md is about text auto-fit or object-fit on images; FRAMEWORK-AUDIT.md:25-33 treats fit purely as the text feature, so the schema entry simply predates lottie/clip. The validator already supports unions (spec.type.split('|'), used by color and border as "string|boolean"), so this is an omission, not a narrowing. Reachability discount: the Go renderer never validates (no validator call in internal/ or cmd/), and Makefile:111 allows NOCHECK=1, so fit:"contain" renders correctly outside the mandatory ladder; it is unauthorable through `make video`, not unshippable. Real but small: two layer types, defaults (cover/slice) unaffected, no scene currently needs letterboxing.

---

### [ ] A layer that omits `type` (documented default: text) placed with pin:"bottom" lands entirely below the safe area

**where** `core/boot.js:101`  ·  **area** engine  ·  **class** silent-substitution

**evidence**

> core/boot.js:101 estimates a text layer's height for the bottom/right edge keywords with `const hEst = h || (L.type === 'text' && L.size ? L.size * 1.2 : h);`. The check is on the literal string 'text', but core/layers/index.js:44 documents and implements the opposite rule — `if (t == null || t === '' || t === 'text') return text;` ('A missing `type` still means text (documented default)') — and schema.json lists type as optional. So a typeless text layer gets hEst = 0 and its TOP edge is placed on the safe bottom line, which is precisely the bug the surrounding comment (boot.js:47-52) claims to have fixed.
> 
>   $ node --input-type=module -e "...resolveCoords(d,1080,1920)..."
>   [{"text":"A","size":96,"pin":"bottom","x":540,"y":1855},   <- no `type`
>    {"type":"text","text":"B","size":96,"pin":"bottom","x":540,"y":1740}]  <- identical layer, typed
>   safeArea(1080,1920,'web') = {"x0":65,"y0":65,"x1":1015,"y1":1855}
> 
> y=1855 IS the safe bottom, so the whole 115px line hangs outside it. validate passes the typeless scene clean (exit 0), and boot.js:39 promises 'an edge pin can never produce a safe-zone failure'. No scene in formats/scene/ currently omits type, so this is latent — but it is silent, and the default is documented.

**repro**

```bash
node --input-type=module -e "const {resolveCoords}=await import('./core/boot.js');const d={layers:[{text:'A',size:96,pin:'bottom'},{type:'text',text:'B',size:96,pin:'bottom'}]};resolveCoords(d,1080,1920);console.log(JSON.stringify(d.layers))"
```

**fix** Make boot.js:101 agree with the registry's default: `const hEst = h || ((L.type == null || L.type === '' || L.type === 'text') && L.size ? L.size * 1.2 : h);`. Better still, export the 'is this a text layer' predicate from core/layers/index.js so there is one definition and the two files cannot drift again.

**survived refutation because** Repro reproduces verbatim: core/boot.js:101 tests `L.type === 'text'`, so a typeless layer gets hEst=0 and pin:"bottom" lands its top edge on the safe bottom (y=1855 vs 1740 for the identical typed layer on 1080x1920). The documented default is not the reporter's inference: core/layers/index.js:44 implements `t == null || t === '' || t === 'text'`, core/layers/text.js:21 uses `(L.type === 'text' || !L.type)`, and the sibling gate core/validate.mjs:218 uses `!TEXTISH.has(L.type || 'text')` — i.e. validate normalizes the missing type to text and skips the y-axis degenerate-pin check ON THE ASSUMPTION boot applies the size*1.2 estimate, which boot then does not. `type` has no "required": true in formats/scene/schema.json (/fields/layers/item/type). One correction to the evidence that does not save the claim: the reporter's exact scene is NOT validate-clean (both layers error on the x axis for missing `w`), but adding `w` yields `layoutErrors -> []` and still resolves the typeless layer to y=1855 while the typed one goes to 1740 — breaking the invariant boot.js:38-41 states in prose. Severity capped to low: I checked every JSON under formats/ and blocks/ recursively (including children) and found 0 typeless layers, core/beats.js emits no `pin` at all, so nothing reachable hits it today, and `make audit` measures rendered boxes so it would flag the out-of-zone result post-render. Latent, silent at author time, one-character fix (`(L.type || 'text') === 'text'`).

---

### [ ] `fill` is accepted on a text layer (the unknown-prop check is type-agnostic) and silently ignored, while the same prop recolours a rect

**where** `core/layers/util.js:22 styleText (reads L.color only) / core/validate.mjs:701`  ·  **area** engine  ·  **class** silent-substitution

**evidence**

> validate.mjs's unknown-prop check tests membership in the flat layer-prop list, not against the layer's type, so any prop valid for ANY type is valid on EVERY type. `fill` exists because rect.js and svg.js read it; text.js/util.js styleText does not.
> 
> $ node core/validate.mjs /tmp/t5.json  →  ✓ 1 ok, 0 failed
> Rendered at frame 60, computed styles:
>   {type:text, fill:"#ff0000"} → color rgb(15,22,32)  (theme default; the fill did nothing)
>   {type:rect, fill:"#ff0000"} → background rgb(255,0,0)
> 
> The rect.js header comment says `fill` was honoured there precisely because "authors reach for it here constantly" and "documented-looking input accepted and discarded is the failure mode this codebase hates most". Text is the most common layer in the library and still discards it. The same hole passes `paint:"aurora"` on a text layer and `typing:true`/`d`/`viewBox` on a rect with no complaint.

**repro**

```bash
printf '%s' '{"module":"scene","theme":"vawe","aspect":"9:16","duration":4,"bg":[{"t":0,"preset":"gradientWash","from":0,"to":4}],"audio":{"silent":true},"layers":[{"type":"text","text":"Fill me","x":100,"y":600,"size":80,"fill":"#ff0000","start":0,"duration":4}]}' > /tmp/fill.json && node core/validate.mjs /tmp/fill.json && node scripts/author/preview.mjs scene 60 /tmp/fill.json
```

**fix** Two options, pick one per prop. Cheapest correct: in core/layers/util.js styleText, treat `fill` as an alias for `color` when `color` is absent, mirroring what rect.js:9 does for `bg`. Structurally correct: add a per-type prop table to validate.mjs so `fill` on a text layer is an error naming `color`, the way `resample` on a non-raster layer already is (validate.mjs:718).

**survived refutation because** Reproduced end to end. `node core/validate.mjs` passes a text layer carrying `fill`, and the rendered frame (preview.mjs at f60, run from inside repoRoot since the server only serves repo paths) shows theme ink, not #ff0000 — core/layers/util.js:39 styleText reads only L.color. The generalization holds too: {"type":"rect","typing":true,"viewBox":"0 0 24 24"} validates clean, because core/validate.mjs:686-707 checks keys against one flat list of every layer prop. The behaviour claim is not refutable.

What the claim overstates, and why severity is low: (1) it is already documented on disk as a known, consciously deferred limitation — docs/MISTAKES.md #213 names the exact root cause, records the rect-only fix, and its "Still open, and worth naming" paragraph predicts this precise recurrence class (stroke on a rect, radius on a text, ken on an svg), stating the per-type known-list was not attempted. The rect.js header the reporter quotes is the tail of that same entry, not independent evidence. (2) A purpose-built detector already exists and catches this exact input: `make layer-props D=<file>` prints "layers[0] (text): `fill` is set and nothing reads it" and exits 1. (3) The real gap is narrower than "silently ignored": scripts/gates/layer-props.mjs is not among author-check.mjs's steps (validate, beats, critique, direct, floor, visuals, dissolve, slop, designspec, copy, assets, treatment, inspect), so `make video` never runs it — a fact MISTAKES.md:3381 also already records. (4) The failure mode is a visibly wrong colour on the frame, caught by the mandatory `make look` / `make judge` eyeball steps, not silent corruption.

Not refuted, but it is a logged open item with an existing detector that is merely unwired from the default ladder.

---

### [ ] beat-check's `static-bg` warn is keyed to a hardcoded three-name list, so it cannot fire on a film whose whole backdrop is a static gradient (`dark` / `deep`)

**where** `scripts/gates/beat-check.mjs:156 (STATIC_PRESETS) and :167 (movingWindows)`  ·  **area** gates  ·  **class** wrong-unit

**evidence**

> STATIC_PRESETS = {plain, accentPlain, paper}. But bgPreset('deep') and bgPreset('dark') emit only a radial gradient plus grain — no animated fx at all:
> $ node -e "import('./core/backgrounds.js').then(m=>console.log(JSON.stringify(m.bgPreset('deep','deep'))))"
>   {"base":{"kind":"radial",...},"fx":[{"type":"grain","alpha":0.02,"fps":30}]}
> glass.json is 12s on nothing but `deep`, and the gate says nothing:
> $ node scripts/gates/beat-check.mjs formats/scene/glass.json | grep static-bg  →  (no match; the 1 warn is beats-unseen)
> A sweep finds 3 films whose entire backdrop emits no animated fx and which the gate stays silent on: chromatic.json [dark], glass.json [deep], looks-reel.json [dark]. This is the same defect as the direction-floor one, in the opposite direction — and the two gates disagree about the same file: direction-floor DOES warn no-bg-motion on glass.json.

**repro**

```bash
node scripts/gates/beat-check.mjs formats/scene/glass.json | grep -c static-bg   # 0, on a film with a provably still backdrop
```

**fix** Derive staticness instead of listing it: `const isFlat = (b) => b.preset && !bgPreset(b.preset, b.value).fx.some(f => f.type !== 'grain')`, and drop STATIC_PRESETS. That makes beat-check and direction-floor agree by construction rather than by two hand-kept lists.

**survived refutation because** Could not refute; reproduced exactly. `node scripts/gates/beat-check.mjs formats/scene/glass.json` emits zero static-bg on a 12s film whose sole bg is {"preset":"deep"}. core/backgrounds.js:327-344 shows exactly five presets emit fx:[grain] and nothing else — paper, plain, accentPlain, deep, dark — and STATIC_PRESETS (beat-check.mjs:156) lists only three. The obvious defense (gradients excluded on purpose) dies because accentPlain is the same shape as deep/dark (radial base + grain) and IS in the set; the list is just an incomplete transcription. No comment, docs/MISTAKES.md entry, or CLAUDE.md text documents the omission, and nothing on disk fixes it. My own sweep with the gate's own backdropMotion escape reproduces the reporter's exact three films: chromatic.json, glass.json, looks-reel.json. Severity is low, not high: the preset half of static-bg is a deliberate warn (its own comment says blocking a whole film on flat presets "would fail the house style"), and every affected film is already caught in the same mandatory command — author-check.mjs:123 runs beat-check, :129 runs direction-floor, and direction-floor.mjs:118 fires no-bg-motion on all three with an equivalent message. Direction-floor uses an inverted allowlist (MOVING_BG regex, :52) so unknown presets fail CLOSED; beat-check's denylist fails OPEN. That polarity mismatch is the real bug, but the fail-closed gate is the backstop, so no film ships unwarned, including under STRICT=1. Only a standalone `make beat-check` loses coverage.

---

### [ ] `make copy-check`/`designspec`/`asset-check` turn STRICT ON when you pass STRICT=0, because those three recipes test $(if $(STRICT)) instead of $(filter 1,$(STRICT))

**where** `Makefile:426, Makefile:432, Makefile:438`  ·  **area** gates  ·  **class** other

**evidence**

> $ make copy-check D=formats/scene/glass.json STRICT=0
>   node scripts/gates/copy-check.mjs formats/scene/glass.json --strict
>   ✗ copy gate (strict): tighten the writing before shipping.
> $ make copy-check D=formats/scene/glass.json STRICT=0 >/dev/null 2>&1; echo $?  →  2
> $ make copy-check D=formats/scene/glass.json >/dev/null 2>&1; echo $?  →  0
> Every other gate recipe (Makefile:568, 571, 574, 642, 645, 648) uses $(if $(filter 1,$(STRICT)),--strict), which behaves correctly. Related: copy-check.mjs:82 and designspec-check.mjs:161 both print '(Block them with --strict / STRICT=1.)' but neither reads process.env.STRICT — copy-check.mjs:14 is `process.argv.includes('--strict')` only — so run directly, STRICT=1 does nothing:
> $ STRICT=1 node scripts/gates/copy-check.mjs formats/scene/glass.json >/dev/null; echo $?  →  0
> $ node scripts/gates/copy-check.mjs formats/scene/glass.json --strict >/dev/null; echo $?  →  1

**repro**

```bash
make copy-check D=formats/scene/glass.json STRICT=0 >/dev/null 2>&1; echo $?
```

**fix** Change the three recipes to `$(if $(filter 1,$(STRICT)),--strict)` to match the rest of the Makefile, and add `|| process.env.STRICT === '1'` to the `strict` const in copy-check.mjs:14 and designspec-check.mjs (dissolve-check.mjs:40, plan-vs-render.mjs:35 and visual-vocabulary.mjs:69 already do this) so the printed instruction is true.

**survived refutation because** Reproduced exactly, so not refuted. `make copy-check D=formats/scene/glass.json STRICT=0` emits `--strict` and exits 2, while omitting STRICT exits 0. Makefile:426/432/438 use `$(if $(STRICT),--strict,)`, which is truthy for the non-empty string "0"; the six sibling gate recipes (133, 568, 571, 574, 642, 645, 648) use `$(if $(filter 1,$(STRICT)),--strict)`. The reporter undercounted: Makefile:384 (`make script`) has the same bug and was not listed. Not intentional or documented anywhere: the recipe comments document `[STRICT=1]`, docs/MISTAKES.md only discusses STRICT=1 semantics, and a repo-wide grep finds zero `STRICT=0` callers. Not stale; current on-disk text matches.

Severity is low, not high, because of blast radius and failure direction. The shipping path is clean: `make video` -> `make author-check`, and Makefile:133/568 both use `filter 1`; author-check.mjs:144/146/148 forward `--strict` only when its own argv carried it. So only the three (four) standalone recipes are affected, reachable only by a human explicitly typing STRICT=0/no/false. The failure mode is conservative and fail-loud: a gate blocks when asked not to and prints "(strict)" in its output. It never silently passes content it should catch, and no scene input can trigger it.

The secondary claim is weaker and I would drop it. copy-check.mjs:14 is argv-only (confirmed: `STRICT=1 node scripts/gates/copy-check.mjs ... -> 0`), but the hint at copy-check.mjs:82 / designspec-check.mjs:161 reads "(Block with --strict / STRICT=1.)" directly under a usage line reading `node ... [--strict]  ·  make copy-check D=<file>` — the `--strict` half names the direct interface and the `STRICT=1` half names the make interface. Reading it as a promise that the binary honours the env var is the reporter's inference, not the file's claim. Wording nit at most.

---

### [ ] `vawe --all` applies film grain to every scene, ignoring the opt-in "grain": true contract the single-file path enforces

**where** `cmd/render/main.go:60 (opts built with Grain: !*noGrain) and :78 (the --all branch renders with it) — videoGrain() is only consulted at :114, after --all has already returned`  ·  **area** pipeline  ·  **class** other

**evidence**

> formats/scene/sample.json has no "grain" key, so per the documented rule ("film grain is OPT-IN (`\"grain\": true`), not a default") it must render clean. It does on the single-file path and does not under --all:
> 
>   $ ./bin/vawe formats/scene/sample.json --out /tmp/sample_single.mp4   -> 1,450,102 bytes, 1,526,423 bit/s
>   $ ./bin/vawe --all                    (writes out/scene.mp4)          -> 1,060,576 bytes, 1,116,395 bit/s
>   $ ./bin/vawe --all --no-grain         (writes out/scene.mp4)          -> 1,454,549 bytes
> 
> --all --no-grain matches the single-file render; plain --all does not, which isolates the difference to the grain flag (it takes the `-tune grain -crf 23` branch of encode.Video instead of `-crf 20`, plus the `noise=c0s=3:c0f=t` filter).
> 
> Confirmed in the pixels, same frame from both --all renders:
>   $ node -e '<mean abs delta + horizontal high-frequency energy on frame 200>'
>   frame 200: mean|Δ| = 0.646  max|Δ| = 54
>   horizontal high-frequency energy — --all default: 0.436   --all --no-grain: 0.346
> A 26% lift in high-frequency energy is the added grain. Same JSON, same engine, two different films depending on which subcommand you used.

**repro**

```bash
./bin/vawe --all && cp out/scene.mp4 /tmp/a.mp4 && ./bin/vawe --all --no-grain && ls -l /tmp/a.mp4 out/scene.mp4   # sizes differ; only the second matches ./bin/vawe formats/scene/sample.json
```

**fix** Move the opt-in read into the per-job closure in the --all branch: `o := opts; o.Grain = o.Grain && videoGrain(sample); jobs = append(jobs, func() error { return render.Render(repoRoot, name, sample, outPath, o) })`. Same one-line rule as cmd/render/main.go:114, applied per sample instead of once for the single-file path.

**survived refutation because** I reproduced it exactly. Built fresh from clean HEAD (cmd/render/main.go has no local modifications) and ran all three renders: `./bin/vawe --all` -> out/scene.mp4 = 1,061,875 bytes; `./bin/vawe --all --no-grain` -> 1,453,799 bytes; `./bin/vawe formats/scene/sample.json --out /tmp/single.mp4` -> 1,455,957 bytes. formats/scene/sample.json has no "grain" key, so the single-file path renders clean and --all does not; --all --no-grain matches the single-file render, isolating the difference to the grain flag. Code confirms: cmd/render/main.go:58 builds opts with Grain: !*noGrain, the --all branch at :65-97 calls render.Render with those opts and returns, and the opt-in filter `opts.Grain = opts.Grain && videoGrain(dataPath)` is at :116, after the return. The 391KB size delta is the `-tune grain -crf 23` + `noise=c0s=3:c0f=t` branch in internal/encode/encode.go:40-44.

Refutation attempts that failed: (a) not documented as intentional anywhere — the opt-in rule is asserted twice in comments (cmd/render/main.go:113-115, internal/encode/encode.go:40-41) and neither carves out --all, and grep of docs/MISTAKES.md turns up no entry; (b) reporter did not misread — the code path is exactly as described; (c) not already fixed on disk — git status shows the file unmodified.

What does reduce it to low: formats/ contains exactly one format dir (scene), so --all renders one file, out/scene.mp4, which is gitignored (.gitignore:2) and is throwaway smoke output from `make all` (Makefile:149). Every real authoring route (`make video D=…` -> ./bin/vawe <file>, and `make render M=scene` which passes --data and so hits line 116) honors the contract. So this is a genuine contract inconsistency in a dev smoke path that has never affected a shipped video, and --no-grain already forces the correct result.

---

### [ ] An explicit --out directory is silently discarded when more than one --aspect is rendered; the files land in repoRoot/out/ instead

**where** `cmd/render/main.go:150-163 — `base = filepath.Base(outPath)` keeps only the basename, then rejoins against filepath.Join(repoRoot, "out", …)`  ·  **area** pipeline  ·  **class** other

**evidence**

> $ ./bin/vawe formats/scene/_glowA.json --draft --out /tmp/multi.mp4 --aspect 16:9,1:1
>   ✓ done → /Users/vandit/Developer/code/shortwave/out/multi.1x1.mp4
>   $ ls /tmp/multi.16x9.mp4 /tmp/multi.1x1.mp4
>   ls: No such file or directory   (both)
>   $ ls -l out/multi.16x9.mp4 out/multi.1x1.mp4
>   -rw-r--r-- 109912 out/multi.16x9.mp4
>   -rw-r--r-- 100401 out/multi.1x1.mp4
> 
> The user named /tmp; the renderer wrote to out/. Exit 0, no warning. The comment three lines above says "An explicit --out still wins: naming the file is the author's call" — it wins for the basename only, and only for a single aspect. Practical consequence beyond surprise: it can silently clobber an existing out/<name>.<aspect>.mp4 belonging to a different scene whose basename happens to match, which is exactly the overwrite class MISTAKES #215 was written about.

**repro**

```bash
./bin/vawe formats/scene/_glowA.json --draft --out /tmp/multi.mp4 --aspect 16:9,1:1 && ls /tmp/multi.16x9.mp4
```

**fix** Honour the caller's directory: `dir := filepath.Join(repoRoot, "out"); if *out != "" { dir = filepath.Dir(*out) }` and build outPath from that dir. The aspect tag on the basename is right; discarding the path is not.

**survived refutation because** Reproduced exactly on the shipping binary. bin/vawe sha1 matches a fresh `go build ./cmd/render` (c58c3f2a…) and cmd/render/main.go is clean in git, so the reporter tested what ships. Running `./bin/vawe formats/scene/_glowA.json --draft --out /tmp/multi.mp4 --aspect 16:9,1:1` wrote out/multi.16x9.mp4 and out/multi.1x1.mp4; /tmp/multi*.mp4 does not exist. Exit 0, no warning. Code confirms: main.go:147-162, the branch fires on `outPath == "" || len(aspects) > 1` and `filepath.Base(outPath)` keeps only the stem before rejoining against filepath.Join(repoRoot,"out",…). Not documented as intentional anywhere: the comment at main.go:153 and docs/MISTAKES.md #215 (line 5237) both state the opposite ("An explicit --out still wins"). Mitigations found while trying to refute: no in-repo caller can reach it. Makefile:112/134/173 pass --aspect without --out; scripts/site/site-assets.mjs:109 same; mcp/pipeline.mjs:107 is the only place passing both, and its caller mcp/server.mjs:340-343 loops one aspect at a time, so len(aspects)>1 never happens from any script. Only a human typing a comma list with --out hits it, and the clobber scenario additionally needs a user-chosen basename collision with an existing out/<name>.<aspect>.mp4. Real defect, contradicts the repo's own no-silent-substitution rule, but narrower than #215.

---

### [ ] docs/MISTAKES.md #190 and cmd/render/main.go both cite `make flicker-check` as a shipped diagnostic; neither the target nor the script exists

**where** `cmd/render/main.go:44 ("See docs/MISTAKES.md #190 and `make flicker-check`"); docs/MISTAKES.md:4318 and :4913`  ·  **area** pipeline  ·  **class** stale-doc

**evidence**

> MISTAKES #190 describes it as built, benchmarked and shipped: "`make flicker-check` reads the encoded mp4 and finds frames that lose content both their neighbours carry. It separates this defect perfectly on the film it was built from… So it is shipped as a diagnostic and deliberately kept OUT of the ladder." Line 4913 names the implementation file: "`flicker-check.mjs` used `i / 30` to label findings…".
> 
>   $ grep -n flicker Makefile
>   (no matches)
>   $ find . -name 'flicker*' -not -path './node_modules/*'
>   (nothing)
>   $ ls scripts/gates/ | grep -i flick
>   (nothing)
> 
> The only tool the repo's own postmortem identifies as able to see raster corruption in a rendered mp4 is gone, while the two places that would send someone to it still say it is there. Since it is the named safety net for the uncapped --workers flag above, the two defects reinforce each other: exceed the cap and the prescribed way to check for damage does not run.

**repro**

```bash
grep -rn 'flicker' Makefile; find . -name 'flicker*' -not -path './node_modules/*'   # first prints nothing, second prints nothing, yet cmd/render/main.go:44 tells you to run `make flicker-check`
```

**fix** Either restore scripts/gates/flicker-check.mjs and its Makefile target, or strike the reference from cmd/render/main.go:44 and add a note to MISTAKES #190 recording that the diagnostic was removed and on what date. A gate cited in two places and present in none is worse than no gate, because it reads as coverage.

**survived refutation because** Reproduced exactly. `make -n flicker-check` fails with "No rule to make target"; grep of Makefile and find for flicker* return nothing; scripts/gates/ has no such file. `git log -S'flicker-check'` shows it was added in 1267f52 and deleted in cc2dfc2 ("cut six tools that never produced a frame"), whose --stat removes scripts/gates/flicker-check.mjs and its Makefile target while touching neither cmd/render/main.go nor docs/MISTAKES.md. So cmd/render/main.go:44 and docs/MISTAKES.md:4318 ("So it is shipped as a diagnostic") both point at a tool that was deliberately retired. Could not refute: no alternate spelling, no mk/ include, no replacement gate, no note of the retirement in CLAUDE.md/AGENTS.md/README/docs-site. However the reporter overstates impact: the actual fix from postmortem #190 lives in code, not the tool - the workers default is max(1, min(NumCPU()-1, 4)) at cmd/render/main.go:45, so the cap ships regardless; and the stale pointer fails loudly (make errors) rather than silently passing. MISTAKES.md is also an append-only log, so its later back-references (#191, #204) are legitimate history; only the present-tense line 4318 and the live source comment are wrong. Documentation rot with no runtime effect.

---

### [ ] A missing or unreadable data JSON is reported as "has no \"module\" field", and `vawe --all` exits 0 after rendering nothing

**where** `cmd/render/main.go:118-125 (moduleOf error swallowed) and cmd/render/main.go:66-96 (--all)`  ·  **area** pipeline  ·  **class** error-swallowed

**evidence**

> moduleOf (main.go:196-205) returns "" for a read error and for a JSON parse error alike, so the caller cannot tell "file absent" from "field absent":
>   ./bin/vawe /tmp/nope-does-not-exist.json
>   → ✗ /tmp/nope-does-not-exist.json has no "module" field — add one (e.g. "module": "higherlower") or pass --module   (exit 1)
> The file does not exist at all. Same message for a file that exists but has no module field, so the printed remedy is wrong half the time.
> Separately, --all builds its job list from an ignored-error os.ReadDir and reports success on an empty list:
>   cd /tmp && REPO=/tmp /Users/vandit/Developer/code/shortwave/bin/vawe --all
>   → vawe --all: 0 ok, 0 failed   (exit 0)
> Also worth noting while looking: exactly one format now qualifies for --all (`for d in formats/*/; do [ -f $d/scene.html ] && [ -f $d/sample.json ]` → only `scene`), so --all can never have more than one job, and --concurrency plus the whole internal/queue package are dead.

**repro**

```bash
./bin/vawe /tmp/nope-does-not-exist.json; cd /tmp && REPO=/tmp /Users/vandit/Developer/code/shortwave/bin/vawe --all; echo "exit=$?"
```

**fix** Have moduleOf return (string, error) and print the real cause ("cannot read X" / "X is not valid JSON" / "X has no module field"). In --all, stop ignoring the ReadDir error and exit non-zero with a named message when zero jobs were found. Delete --all/--concurrency/internal/queue, or restore a second format, rather than leaving a batch path that can only ever run one job.

**survived refutation because** Reproduced all repros on both bin/vawe and a fresh `go build` of cmd/render, so it is not stale. moduleOf (cmd/render/main.go:187-198) discards both the ReadFile error and the Unmarshal error, and I confirmed a missing file, a truncated JSON, and a valid JSON without the field all print the same line: '✗ <path> has no "module" field — add one (e.g. "module": "higherlower") or pass --module'. `REPO=/tmp bin/vawe --all` printed '0 ok, 0 failed' and exited 0. No comment, CLAUDE.md line, or docs/MISTAKES.md entry marks any of it intentional, so I cannot call it documented behaviour. Severity is low rather than high because all three file cases still exit 1 with a visible failure marker — only the suggested remedy is wrong, nothing bad is reported as good — and the --all exit-0 path needs REPO pointed outside the repo, while the shipped caller (Makefile:149) runs from the repo root where formats/scene always yields exactly one job. The error string also names a module (`higherlower`) that no longer exists in the repo, which marks this as stale message text rather than a live control-flow fault.

---

### [ ] `make site-counts` fails on a clean HEAD — 6 stale product counts are committed

**where** `Makefile:225 / site/lib/features.ts:40`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> Clean tree. `make site-counts` → exit 1 with: features.ts:40 says 148 components, registry has 153; features.ts:45 says 148 blocks, registry has 153; features.ts:45 and :48 say 63 families, registry has 68; site/public/vawe-rules.md:83 says 25 kinetic presets, registry has 27; vawe-rules.md:132 says 18 themes, registry has 33. The gate itself exists and works; the repo simply ships red, and nothing in `check`/`review`/`ship` invokes it (grep shows the target is the only reference).

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && make site-counts
```

**fix** Update the six numbers in site/lib/features.ts and site/public/vawe-rules.md to the registry values, and wire `site-counts` into `make review` so it cannot go red unnoticed.

**survived refutation because** Could not refute; the claim reproduces exactly, including on a pristine clone.

What I ran:
1. `make site-counts` in /Users/vandit/Developer/code/shortwave with a clean tree (only untracked scripts/author/build-onefile.mjs) → exit 1, the same 6 findings quoted in the claim.
2. Cloned HEAD to /tmp/sc-clean and ran `node scripts/gates/site-counts.mjs` there → identical output, EXIT=1. So it is committed state, not local drift, and not already fixed on disk.
3. Verified the gate is orphaned: `grep -rn "site-counts"` across the repo returns only Makefile:221/225/226 (the target + its comment), one prose mention in site/app/blocks/BlocksBrowser.tsx:12, and the script itself. Makefile:126 `check`, :132 `ship` and :542 `review` all run other scripts; none reach site-counts.mjs. No CI reference either.
4. Checked for an intentional-red defence: docs/MISTAKES.md #111 (line 2152) documents the gate as the FIX for stale site counts, i.e. it is meant to be green. No waiver, comment, or CLAUDE.md line sanctions a red gate.

Two honest caveats that shrink but do not kill it:
- The `themes 18 vs 33` finding is partly the gate over-counting. TRUTH.themes = every *.json in themes/, which includes 15 internal A/B and per-film themes (ab-control.json, ab2-skill.json, ab3-nogate.json, ab4-a-ledgerline.json, glassatmos.json, brew*.json, cadence.json, higgsfield.json, lumen.json, ledgerline-*.json …). site/public/vawe-rules.md:132 lists a curated 18-name public set, so that one line is arguably correct copy against a loose registry definition.
- The remaining 5 are genuinely stale: blocks/catalog.mjs non-overlay entries = 153 against "148 components"/"148 blocks", 68 families against "63 families" (twice), and core/type.js PRESETS = 27 against "## Kinetic presets (25)" whose name list under it enumerates only 25 — two presets are undocumented for anyone reading site/public/vawe-rules.md.

Impact is confined to marketing copy on site/lib/features.ts and the agent-facing rules doc; nothing in the renderer, no scene can hit it, no build breaks. Real, verified, but cosmetic — hence low, not medium.

---

### [ ] README advertises a "100-block registry" three times; the registry has 153 — and site-counts never scans README/CLAUDE.md/docs

**where** `README.md:27`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> README.md:27 "A 100-block component registry", :72 "a 100-entry component registry", :171 "browse the 100-block registry". The same gate that guards this class computes TRUTH.blocks from CATALOG minus overlays: `make site-counts` prints "registry has 153", and docs/BLOCKS.md itself has 155 table rows (`grep -cE '^\| `' docs/BLOCKS.md` → 155). scripts/gates/site-counts.mjs:45 FILES = ['site/lib/features.ts', 'site/public/vawe-rules.md', ...walk('site/app')] — README.md, CLAUDE.md and docs/ are outside its scope, so the phrase "a 100-block registry" matches its own NUM_FIRST pattern exactly and is still never checked. docs/MISTAKES.md:2155 logs this identical failure ("a 100-block taste library") as already fixed.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && make site-counts && grep -n '100-block\|100-entry' README.md
```

**fix** Correct the three README numbers, and add 'README.md', 'CLAUDE.md' and a docs/ walk to the FILES list in scripts/gates/site-counts.mjs:45 so the top-level copy is covered by the gate that exists for it.

**survived refutation because** Could not refute. Reproduced exactly: `node -e` on blocks/catalog.mjs gives grid 153 / total 155 / families 68; README.md:27, :72, :171 all claim a 100-block/100-entry registry with no hedge. `make site-counts` exits 1 listing 6 stale counts, all in site/lib/features.ts and site/public/vawe-rules.md, none in README — confirmed by scripts/gates/site-counts.mjs:43-47 where FILES is ['site/lib/features.ts','site/public/vawe-rules.md',...walk('site/app')]. The gate header (lines 1-12) never states README is deliberately excluded and its rationale argues the opposite. The only other gate touching README (craft-coverage.mjs:79-82) checks doc links, not numbers. docs/MISTAKES.md:2155 logs "a 100-block taste library" as fixed, but that fix landed in site copy only; README still carries it. Not stale-on-disk, not intentional, not misread. Severity low: prose only, no runtime path, and it undersells rather than overpromises. Extra fact the reporter missed: site-counts is already red today on the files it does cover (148 vs 153, 63 vs 68, 25 vs 27, 18 vs 33).

---

### [ ] CLAUDE.md quotes "240 effects, 15 families"; the generated catalog says 245 across 16 (and is itself stale)

**where** `CLAUDE.md:196`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> CLAUDE.md:196 — "`make effects` → `docs/EFFECTS.md` (240 effects, 15 families…)". The generated file's own footer, docs/EFFECTS.md:382, reads "_245 effects across 16 families._" — and that file is itself stale (see the effects-check finding), so the true figure is higher still. `make docs-drift` passes, because its count check covers ROADMAP.md and PRIMITIVES.md only.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && sed -n '196p' CLAUDE.md && tail -1 docs/EFFECTS.md
```

**fix** Drop the hard numbers from CLAUDE.md:196 (say "every effect, generated from the registries"), or extend site-counts/docs-drift to cover CLAUDE.md.

**survived refutation because** Repro confirmed verbatim. `sed -n '196p' CLAUDE.md` prints "(240 effects, 15 families," and `tail -1 docs/EFFECTS.md` prints "_245 effects across 16 families._" — the two disagree, and neither is right. I copied the repo to /tmp and ran the generator there (`node scripts/site/effects-catalog.mjs` in /tmp/efx): it reports "251 effects across 16 families", so CLAUDE.md:196 is short by 11 effects and one whole family. The repo itself is untouched (`git status --short` clean for both files).

Refutation attempts, all failed:
- Intentional/approximate? No hedge in the text. The line reads as a hard count, "generated from the registries", and no comment or docs/MISTAKES.md entry marks it as illustrative.
- Already fixed on disk? No. Both files are as reported at HEAD.
- Covered by a gate? No. /Users/vandit/Developer/code/shortwave/scripts/gates/docs-drift.mjs reads only docs/ROADMAP.md (line 21) and docs/PRIMITIVES.md (line 26); CLAUDE.md is never opened, so the quoted-count check cannot see this line. `make effects-check` does fire (exit 1, "docs/EFFECTS.md is stale"), but that is the separate finding about the generated file, not this one.
- Misread code path? No — the reporter's prediction that the true number is above 245 is confirmed at 251.

Why severity is low, not higher: nothing reads this number. The sentence's job is to send the author to `make effects` / docs/EFFECTS.md, and an author who follows it gets the real, regenerated list. A wrong count here cannot change a render, fail a gate, or mislead the engine — it only misleads a human skimming CLAUDE.md, and the fix is one line. It is a real stale-doc defect, but cosmetic, and it is downstream of the genuine problem (the generated catalog itself is stale and no gate watches CLAUDE.md's copy of the figure).

---

### [ ] CLAUDE.md asserts all 18 eligible short films carry a continuity waiver; there are 19 and 5 carry none

**where** `CLAUDE.md:151`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> CLAUDE.md:151 — "Every one of the 18 eligible short films in this library trips this and carries a waiver" (same '18' repeated in the code comment at scripts/gates/direction-floor.mjs:236). Reimplementing the gate's own eligibility test (dur < CONTINUITY_MAX_DUR=15 and at least one cut/seam/transition boundary, direction-floor.mjs:126-144) over formats/scene/*.json gives: eligible 19, carrying the waiver 14, with no waiver: ab-skill-shotcode.json, hero-site.json, showcase-intro.json, showcase-stings.json, showcase-type.json. Running the real gate on two of them confirms they are not merely unwaived but clean: `node scripts/gates/direction-floor.mjs formats/scene/hero-site.json` → "0 fail · 1 warn … floor cleared"; ab-skill-shotcode.json → "0 fail · 0 warn ✓ direction floor clear." `make waivers` independently reports only 13 no-continuous-object waivers across 96 scenes.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && node scripts/gates/direction-floor.mjs formats/scene/hero-site.json && make waivers
```

**fix** Replace the frozen '18' in CLAUDE.md:151 and direction-floor.mjs:236 with a pointer to `make waivers`, which computes the census live.

**survived refutation because** Could not refute. Reimplementing the gate's eligibility test (direction-floor.mjs:126-144,229: dur<15 plus >=1 cut/seam/transition boundary) over formats/scene/*.json reproduces 19 eligible / 14 waived / 5 unwaived; excluding the `_`-prefixed internal scene (the scope waiver-drift.mjs uses) gives exactly 18 eligible, of which only 13 carry the waiver — matching `make waivers` (no-continuous-object 13/96). I ran the real gate on all five unwaived films, not just two: ab-skill-shotcode, hero-site, showcase-intro, showcase-stings, showcase-type all report 0 fail ("direction floor clear"), so they neither trip the rule nor carry a waiver. `git log -S` dates the sentence to da6a6e5 (Jul 28) while the unwaived scenes were last touched d82e101 (Jul 30), so the doc froze before the library was cleaned — genuinely stale, not a stale reading by the reporter. The same figure is duplicated in the code comment at scripts/gates/direction-floor.mjs:236, and nothing in docs/MISTAKES.md frames the count as approximate. One partial correction to the claim: "18" is defensible under the census scope, so the wrong half is "every one ... trips this and carries a waiver" (13/18), not the count. Severity low: prose in CLAUDE.md:151 with no runtime effect; the only cost is telling authors that five already-clean films are slideshow debt.

---

### [ ] `make brandkit` is documented as the brand-onboarding entry point in three docs; the target does not exist

**where** `docs/LAUNCH-VIDEO-GUIDE.md:9`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> `make -n brandkit` → "make: *** No rule to make target `brandkit'. Stop." It is documented as a real command in docs/LAUNCH-VIDEO-GUIDE.md:9 (`make brandkit URL=… NAME=<brand>`), docs/DESIGN-DATABASE.md:212 ("Brand onboarding: `make brandkit URL=… NAME=…`") and docs/PRIMITIVES.md:281. CLAUDE.md's own header uses the replacement (`make sections` + `make palette`), so the three docs are stale against it.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && make -n brandkit
```

**fix** Rewrite those three lines to `make sections URL=… NAME=…` + `make palette`, which are the targets that exist (Makefile:289, :278).

**survived refutation because** Repro confirmed: `make -n brandkit` fails with "No rule to make target". No brandkit target in Makefile (only palette:278, brandspec:286, sections:289), no includes, and scripts/brandkit.mjs is gone. Commit 086696d deliberately deleted brandkit and its target, updating CLAUDE.md and README.md but not docs/LAUNCH-VIDEO-GUIDE.md:9, docs/DESIGN-DATABASE.md:212, docs/PRIMITIVES.md:281, which still present it as a live command. Nothing marks the absence as intentional, and no alias or fallback exists, so I cannot refute it. Severity is low, not high: docs-only, failure is loud and immediate, no code path breaks, and CLAUDE.md's own header already names the live replacement (make sections + make palette), so anyone following the top-level instructions never hits the dead target.

---

### [ ] The subagent roster CLAUDE.md tells you to read documents an `ab` critic backed by `make ab` and a linked doc, both deleted

**where** `docs/CRAFT/SUBAGENTS.md:35`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> CLAUDE.md points at docs/CRAFT/SUBAGENTS.md as "the standing roster". SUBAGENTS.md:35 defines the **ab** critic: input "`/tmp/ab/<name>/brief.md` from `make ab A=… B=… NAME=… CLAIM=\"…\"`", verdict shape "the JSON in [AB-JUDGE.md](AB-JUDGE.md)". `make -n ab` → "No rule to make target `ab'"; `ls docs/CRAFT/AB-JUDGE.md` → No such file. Commit cc2dfc2 ("cut six tools that never produced a frame") deleted scripts/gates/ab.mjs, scripts/gates/ab-record.mjs and docs/CRAFT/AB-JUDGE.md without touching SUBAGENTS.md.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && make -n ab; ls docs/CRAFT/AB-JUDGE.md
```

**fix** Delete the **ab** row from docs/CRAFT/SUBAGENTS.md:35 (the tool it drives was removed in cc2dfc2).

**survived refutation because** Repro confirmed exactly as reported: `make -n ab` -> "No rule to make target `ab'", `ls docs/CRAFT/AB-JUDGE.md` -> No such file. No `ab` rule anywhere in the Makefile, no scripts/gates/ab*.mjs, and `find` shows no AB-JUDGE.md under any path. Commit cc2dfc2 deliberately cut the blind A/B judge but its 8-file stat touches neither SUBAGENTS.md nor JUDGE.md, so the leftover row is an oversight, not a documented choice. I also found a second dangling reference the reporter missed: docs/JUDGE.md:40 links to CRAFT/AB-JUDGE.md, and JUDGE.md is reachable from CLAUDE.md step 6. Mitigations that cap severity at low: CLAUDE.md:35 and docs/CRAFT/README.md:54 both name the roster inline as exactly six critics (beat, bg-motion, reveal, fidelity, copy, seam), excluding `ab`, so the routing indexes are already correct; and the failure is loud (make errors, link 404s), doc-only, with no effect on any rendered scene.

---

### [ ] CLAUDE.md names formats/scene/linear-30.json as the reference scene to read first; it does not exist

**where** `CLAUDE.md:27`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> CLAUDE.md:27 — "Always read `sample.json` and an existing video (e.g. `linear-30.json`) first as working references". `ls formats/scene/linear-30.json` → No such file or directory. The nearest survivors are linear-journey.json and linear-launch.json. sample.json does exist.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && ls formats/scene/linear-30.json
```

**fix** Point CLAUDE.md:27 at a scene that exists, e.g. formats/scene/linear-launch.json.

**survived refutation because** Repro confirmed: `ls formats/scene/linear-30.json` fails, and the file is not merely gitignored (checked disk directly; `.gitignore:50` ignores `formats/scene/*.json`, so git-tracking proves nothing). `out/linear-30.mp4` shows the scene existed locally and was deleted. All three refutation angles failed: not fixed on disk (CLAUDE.md:27 still cites it, and docs/LAUNCH-VIDEO-GUIDE.md:32 calls it a "worked example" more firmly); not intentional, since .claude/plans/showcase-video.plan.md:26,60 gives the same instruction pointing at the live `linear-launch.json`, i.e. the repo already migrated elsewhere. Mitigation: .gitignore:52-56 deliberately keeps brand films untracked as content, so no brand-film name is guaranteed to exist in a clean clone. Severity is low, not medium: the load-bearing reference in that sentence is `sample.json`, which exists; `linear-30.json` is a parenthetical "e.g." inside "an existing video" with 117 scene JSONs in that directory, no make target or gate resolves the name, and nothing breaks. The reporter's framing "names it as the reference scene to read first" overstates what CLAUDE.md says.

---

### [ ] README's opening caption links to site/showcase.html, which does not exist in the repo

**where** `README.md:14`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> README.md:14 — "See more in the [showcase](site/showcase.html)." `find . -name showcase.html -not -path './node_modules/*'` returns only build output under site/.next/server/app/ and site/.next/standalone/ — nothing at site/showcase.html. The link is dead for anyone reading the repo on disk or on GitHub.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && ls site/showcase.html
```

**fix** Link the live site's /showcase route (or the Next.js source page under site/app/showcase/), not a build artefact path.

**survived refutation because** Repro confirmed: `ls site/showcase.html` errors and `git ls-files site/showcase.html` is empty, so the file is neither on disk nor tracked (the find hits were gitignored .next build output). Git history explains it: commit 23b1527 deleted site/showcase.html when the marketing site moved to Next.js, replacing it with the route source site/app/showcase/page.tsx, and README.md:14 was never updated. A repo-wide grep for "site/showcase" (excluding node_modules/.next/.git) returns only that one README line, so there is no build step that materializes the path and no comment, CLAUDE.md rule, or MISTAKES.md entry making it intentional. Could not refute. Severity is low: a dead relative link in a README caption, no effect on the renderer, gates, or any scene; the right target is the live site's /showcase route.

---

### [ ] README claims motion.js has 39 easings; the EASINGS registry has 41

**where** `README.md:140`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> README.md:140 — "motion.js (math + 39 easings)". `node -e 'import("…/core/motion.js").then(m=>console.log(Object.keys(m.EASINGS).length))'` → 41. Not covered by site-counts (README is outside its FILES list) and not covered by docs-drift.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && node -e 'import("/Users/vandit/Developer/code/shortwave/core/motion.js").then(m=>console.log(Object.keys(m.EASINGS).length))'
```

**fix** Update to 41, or drop the number; adding README.md to site-counts' FILES with an `easings` TRUTH entry would keep it honest.

**survived refutation because** Could not refute; the claim is correct and I could not break it on any route. Repro reproduces: node -e 'import(\"/Users/vandit/Developer/code/shortwave/core/motion.js\").then(m=>console.log(Object.keys(m.EASINGS).length))' prints 41, while README.md:140 says \"motion.js (math + 39 easings)\". (1) Alias defense fails: an initial Function.toString comparison suggested spring/spring-bouncy/spring-stiff were duplicates (39 unique), but they are closures from the same springWindow factory closing over different {bounce,settle}; sampling the curves at t=0.1/0.25/0.5/0.75/0.9 yields 41 distinct signatures out of 41 keys (spring peaks 1.064, spring-bouncy 1.152, spring-stiff no overshoot). No aliases exist. (2) Not already fixed: README.md:140 on disk still says 39. (3) Not intentional/approximate: git shows the line was written in f6e11f2 (2026-07-16), and checking out that commit's core/motion.js counts exactly 39 keys, so it was literally accurate then; commit 19abadb (2026-07-27) added the Object.assign block at core/motion.js:171-176 (springEase plus the spring window variants) taking it to 41 without updating README. Genuine drift with an identifiable cause. (4) Gate coverage claim holds: the only gate reading README is scripts/gates/craft-coverage.mjs:79-82, which only verifies docs are linked from the index, never counts. Severity is low because nothing consumes the number: resolveEasing (core/motion.js:127-133) warns on an unknown easing name and prints the live Object.keys(EASINGS) list, so authors get the true 41 names from the runtime; no render path, schema, or validator reads the README figure. It is a wrong-by-two descriptive line in the architecture map.

---

### [ ] The architecture codemap documents `scripts/kie.mjs` and says "do not delete"; no file exists at that path

**where** `docs/CODEMAPS/ARCHITECTURE.md:53`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> docs/CODEMAPS/ARCHITECTURE.md:53 has a table row for `scripts/kie.mjs` — "planned AI-media client (kie.ai) … Intentional future infra … do not delete as 'dead code'". `ls scripts/kie.mjs` → No such file. The real module is scripts/media/kie.mjs, and it is not planned-but-unused: Makefile:506 (`gen-image`) and Makefile:516 (`gen-video`) both invoke `node scripts/media/kie.mjs`. So the codemap has both the path and the status wrong.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && ls scripts/kie.mjs; grep -n 'kie.mjs' Makefile
```

**fix** Correct the row to `scripts/media/kie.mjs` and describe it as wired (consumers: `make gen-image`, `make gen-video`).

**survived refutation because** Repro confirmed exactly as reported. `ls scripts/kie.mjs` fails; the module is at /Users/vandit/Developer/code/shortwave/scripts/media/kie.mjs, moved by commit f6e11f2 ("group scripts/ by what you are doing") without updating the codemap. Makefile:507 and :517 both invoke `node scripts/media/kie.mjs` for `gen-image`/`gen-video`, so the row's "no consumers yet / planned future infra" status is wrong too. Attempts to refute all failed: no comment, CLAUDE.md or MISTAKES.md excuses it; docs/CRAFT/IMAGERY.md:45 and docs/PRIMITIVES.md:312 both describe the commands as working, contradicting the row; the same table already lists scripts/media/ correctly, so line 53 contradicts itself; and it is not fixed on disk. scripts/gates/docs-drift.mjs never inspects docs/CODEMAPS/, so no gate catches it. Severity is low, not higher: nothing executes off the doc string, the Makefile paths are correct and functional, and no scene or render can reach it. The only cost is misleading a reader of the system map.

---

### [ ] docs/CRAFT/BLUEPRINTS.md lists 11 of the 12 registered beat blueprints — logoReveal, which CLAUDE.md names, is absent

**where** `docs/CRAFT/BLUEPRINTS.md`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> `node -e 'import("…/blueprints/index.mjs").then(b=>{const n=Object.keys(b.BEATS); console.log(n.length, n.filter(x=>!md.includes(x)))})'` against docs/CRAFT/BLUEPRINTS.md → registry 12, missing from doc: ['logoReveal']. CLAUDE.md:199 tells authors to reach for "the `logoReveal` beat", and CLAUDE.md step 0 sends them to docs/CRAFT/BLUEPRINTS.md to find it. (The same doc also references formats/scene/tokenjam-launch.json, which no longer exists.)

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && node -e 'const fs=require("fs");const md=fs.readFileSync("docs/CRAFT/BLUEPRINTS.md","utf8");import("/Users/vandit/Developer/code/shortwave/blueprints/index.mjs").then(b=>console.log(Object.keys(b.BEATS).filter(n=>!md.includes(n))))'
```

**fix** Add the logoReveal row (and drop the tokenjam-launch.json reference), or generate BLUEPRINTS.md from blueprints/index.mjs the way EFFECTS.md is generated.

**survived refutation because** Repro runs clean: docs/CRAFT/BLUEPRINTS.md's table lists 11 of the 12 beats in blueprints/index.mjs, logoReveal missing; formats/scene/tokenjam-launch.json cited at line 53 is indeed gone. But the stated harm is wrong. CLAUDE.md:199 sits inside step 0a, which routes to docs/EFFECTS.md, not step 0/BLUEPRINTS.md, and docs/EFFECTS.md:354 documents logoReveal ("mark DRAWS on / MELTS from a blob + bloom + wordmark cascade") plus a pointer at line 21. BLUEPRINTS.md:21 itself says "Browse the set first: make blueprints", and that target (scripts/site/blueprints-catalog.mjs) introspects blueprints/index.mjs at runtime, printing all 12 including logoReveal with its props. Nothing in a scene breaks: {"type":"beat","beat":"logoReveal"} resolves from the registry, and docs/MISTAKES.md:2958-2974 records a shipped scene using it that passes author-check. The closer real gap the reporter missed: the DESC map at scripts/site/blueprints-catalog.mjs:7-17 has only 9 entries, so make blueprints prints logoReveal, typedHook and morphButton with blank role lines. Verdict: real but cosmetic prose drift in a hand-written companion doc that defers to a current generated catalog.

---

### [ ] `NOCHECK=0` and `NOAUDIT=0` disable the gates they name, and the engine prints "skipped (NOCHECK=1)" while doing it

**where** `Makefile:111 and Makefile:113`  ·  **area** truth  ·  **class** silent-substitution

**evidence**

> $ make -n video D=formats/scene/onefile.json NOCHECK=0
> echo "  · author-check skipped (NOCHECK=1)"
> $ make -n video D=formats/scene/onefile.json           # unset
> echo "▶ author-check …" && node scripts/gates/author-check.mjs formats/scene/onefile.json
> $ make -n video D=formats/scene/onefile.json NOAUDIT=0
> echo "  · audit skipped (NOAUDIT=1)"
> 
> `$(if $(NOCHECK),…)` is true for any non-empty value, so 0/false/no all skip the gate, and the message then reports a value the user never passed. CLAUDE.md:238 says "runs author-check first unless NOCHECK=1" and AUTHORING-WALKTHROUGH.md:99 says "skip only with an explicit NOCHECK=1". Someone writing NOCHECK=0 to be explicit about wanting the check gets an unchecked, unaudited render that claims it was told to skip.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && make -n video D=formats/scene/onefile.json NOCHECK=0 | grep -i skipped
```

**fix** Use `$(filter 1,$(NOCHECK))` / `$(filter 1,$(NOAUDIT))` on Makefile:111 and 113, matching the fix already needed for the STRICT recipes.

**survived refutation because** Repro confirmed: `make -n video D=… NOCHECK=0` emits `echo "  · author-check skipped (NOCHECK=1)"`, and NOAUDIT=0 likewise; Makefile:111/113 use presence tests `$(if $(NOCHECK),…)`. Code path read correctly, not stale. But the claim's class and severity are overstated. (1) Not silent: the skip is announced on stdout; only the literal "1" in the message is untrue. (2) `git grep 'NOCHECK=0\|NOAUDIT=0'` returns zero hits repo-wide; every doc and comment (Makefile:107-109,117, CLAUDE.md:231, AGENTS.md:38, docs/TASTE.md:66, docs/CRAFT/AUTHORING-WALKTHROUGH.md:95, docs/MISTAKES.md:2824) uses the presence-flag form =1, matching every other Make flag in the file (WRITE, VS, ASPECT, D). The "explicit user typing =0" is hypothetical and unattested. (3) The declared ship path, `make ship` (Makefile:132-137), has no NOCHECK/NOAUDIT escape at all and runs author-check, render, audit and seam-snap unconditionally; it already uses the value-checking idiom `$(if $(filter 1,$(STRICT)),--strict)` on line 133, so the fix is a known one-liner. Genuine but cosmetic-plus-lax-parsing on a convenience target, with nothing reachable that hits it.

---

### [ ] CLAUDE.md and the Makefile send you to /tmp/judge/sheet.png, which make judge never writes

**where** `CLAUDE.md:249, Makefile:114, docs/CRAFT/AUTHORING-WALKTHROUGH.md:107 and :111`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> $ make judge D=formats/scene/onefile.json
>   → sheet:  /tmp/judge/onefile/sheet.png
>   → rubric: /tmp/judge/onefile/rubric.md
> $ ls /tmp/judge/sheet.png
> ls: /tmp/judge/sheet.png: No such file or directory
> 
> docs/JUDGE.md:13-14 has the correct per-scene path (/tmp/judge/<name>/sheet.png); CLAUDE.md:249 ("READ the sheet"), Makefile:114 (the message printed at the end of every `make video`) and AUTHORING-WALKTHROUGH.md:107/111 all name the flat path. `make judge` is CLAUDE.md's mandatory post-render step, so the one gate that requires a human to look points at a file that does not exist — and a stale sheet from an earlier scene would be read instead if one ever landed there.
> 
> Same two docs also miscount the rubric: AUTHORING-WALKTHROUGH.md:111 and CLAUDE.md:249 list six dimensions; scripts/gates/rubric.mjs:20-28 defines seven (Brand fidelity and Asset fidelity are separate), and make judge prints "7 craft dimensions".

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && make judge D=formats/scene/onefile.json && ls /tmp/judge/sheet.png
```

**fix** Change the three doc sites and Makefile:114 to /tmp/judge/<name>/sheet.png and /tmp/judge/<name>/rubric.md, and list all seven rubric dimensions.

**survived refutation because** Reproduced. `make judge D=formats/scene/onefile.json` prints `/tmp/judge/onefile/sheet.png`; `ls /tmp/judge/sheet.png` fails and /tmp/judge holds only per-scene dirs. scripts/gates/judge.mjs:37-39 moved output to a per-scene dir (commit 94d8ff0, "judge writes to a per-scene dir") and no doc was updated, so CLAUDE.md:249, Makefile:114, docs/CRAFT/AUTHORING-WALKTHROUGH.md:107/111 — plus judge.mjs:5's own header comment, which the reporter missed — all still name the flat path. Not intentional, not fixed on disk, not a misread. Severity is lower than argued, though: judge prints the correct absolute path twice at run time including an explicit "AGENT: Read /tmp/judge/onefile/sheet.png" line, so nobody following the flow is actually stranded; and the "a stale sheet would be read instead" risk is not reachable, since no code path ever writes /tmp/judge/sheet.png (judge.mjs:40 rmSync's only the per-scene dir). The rubric miscount is weaker still: CLAUDE.md:249 states no count and merely folds "brand + asset fidelity" into one bullet, so only AUTHORING-WALKTHROUGH.md:111 is self-inconsistent (says "seven", lists six labels). Docs-only paper cut with a runtime correction inches away.

---

### [ ] CLAUDE.md justifies the visual-vocabulary 8% threshold with a creed-launch claim the gate itself disproves

**where** `CLAUDE.md:131`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> CLAUDE.md:131: "Size is the whole point of the measurement: `creed-launch` carries 19 pictorial layers and every one is a small logo, so a graphic only counts at 8% of the canvas or more."
> 
> $ make visuals D=formats/scene/creed-launch.json
>   3 carrying graphic(s) · 18 too small to carry · 13 beat window(s), 4 covered
>     ✓ component: component, 46% of frame, 6.10s-10.80s
>     ✓ html: inline <svg>, 52% of frame, 23.75s-26.80s
>     ✓ component: component, 9% of frame, 23.70s-26.80s
>     · image: image, only 0.2% of frame — a mark, not a subject   (×18)
>     ? cursor: cursor, size undeclared — UNMEASURED, not cleared
> 
> 22 pictorial layers, not 19, and three of them clear the threshold — two at roughly half the canvas. The example that exists to explain why the rule needs a size floor is the wrong scene, or the scene has changed since. Anyone reasoning from it about what "counts" is reasoning from a false premise.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && make visuals D=formats/scene/creed-launch.json | head -8
```

**fix** Re-derive the sentence from a current `make visuals` run (or pick a scene that actually shows the failure mode) and state the real counts.

**survived refutation because** Ran the repro and it reproduces exactly: `make visuals D=formats/scene/creed-launch.json` reports "3 carrying graphic(s) · 18 too small to carry" plus 1 unmeasured cursor — 22 pictorial layers, with three clearing the floor at 46%, 52% and 9%. CLAUDE.md:131 says 19, every one a small logo.

I tried three refutation routes and all failed:

1. "Reporter tested something that isn't what ships." No. `formats/scene/creed-launch.json` is gitignored (.gitignore:50) but byte-identical to the tracked `site/public/scenes/creed-launch.json` at HEAD. It is the shipped scene.

2. "Already fixed / reporter read a stale assumption." No — it is the doc that is stale, and I confirmed the mechanism. `git log -S "carries 19" -- CLAUDE.md` shows the sentence landed in b0c9b8e, the same commit that introduced the gate. The scene at that commit is 43189 bytes vs 45215 today, and running today's gate against the b0c9b8e version of the scene prints "0 carrying graphic(s) · 18 too small to carry · 13 beat window(s), 0 covered". So the sentence was accurate when written; the scene was later rewritten to add carrying graphics, and the prose was never updated. The reporter's alternative ("or the scene has changed since") is the correct one.

3. "Real but harmless." Partly, and this is the only thing that holds — it caps severity rather than clearing the finding. Nothing executes off the sentence. The normative rule is `const SUBJECT_AREA = 0.08` at scripts/gates/visual-vocabulary.mjs:86 and it is unchanged and enforced correctly; the gate output today is right. The teaching point also mostly survives its own counterexample: 18 of the 22 layers are still 0.1%-0.7% marks, so creed-launch is still a live demonstration of why a size floor is needed. Only "19" and "every one" are false.

One thing the reporter missed that slightly widens it: the identical stale sentence is duplicated as a code comment at scripts/gates/visual-vocabulary.mjs:18 ("`creed-launch` carries 19 of them and every one is a small logo"), so a fix has two sites, not one.

Verdict: cannot refute. It is a true, reproducible stale-doc finding, and the honest fix is arguably to say the scene was since repaired — which is a better advertisement for the gate than the sentence currently makes. Severity low: prose/comment only, no behaviour depends on it, the threshold it justifies is correct.

---

### [ ] README says the ladder is "11 static checks"; author-check runs 15

**where** `README.md:130`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> $ make author-check D=formats/scene/ab4-a-ledgerline.json | grep '────'
> validate · beat check · critique · direct · direction floor · visual vocabulary · dissolve check · slop · design-spec lock · copy gate · asset preflight · treatment · waiver drift · inspect · plan vs render   → 15 steps
> (14 on a scene with no .intent.json sidecar, e.g. formats/scene/onefile.json)
> 
> README.md:130 labels the author-check stage "11 static checks". CLAUDE.md:208's prose list also enumerates 11 and never names dissolve check, treatment, waiver drift or beat check — four gates an author is therefore not told exist.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && make author-check D=formats/scene/ab4-a-ledgerline.json 2>&1 | grep -c '────────'
```

**fix** Print the step count from author-check.mjs and have site-counts assert it against README.md:130 and CLAUDE.md:208, rather than hand-maintaining two lists.

**survived refutation because** Reproduced exactly. `node scripts/gates/author-check.mjs formats/scene/ab4-a-ledgerline.json` prints 15 step banners (validate, beat check, critique, direct, direction floor, visual vocabulary, dissolve check, slop, design-spec lock, copy gate, asset preflight, treatment, waiver drift, inspect, plan vs render); README.md:130 still says "11 static checks" and CLAUDE.md:207-208 lists 11, naming none of beat check / dissolve check / treatment / waiver drift. Could not refute: grep finds those four gates in no other doc; git shows treatment (0d4190b) and waiver drift (9f8fb9b) landed after README's last edit (9bfc47c), so it is drift, not a misread or an already-fixed issue. Severity is low, not the reported level: the number sits in an ASCII ladder diagram whose other cells are plain captions, nothing parses it, and the gate prints its own step list on every run, so the only cost is a reader unaware four gates exist.

---

### [ ] docs/MISTAKES.md reuses six entry numbers, so three live citations in docs and gate code resolve to the wrong entry

**where** `docs/MISTAKES.md:1194 and 1231 (both "## 72"), 1430/2767 ("#83"/"83."), 1450/2789 ("#84"/"84."), 1819/1903 ("#100"), 1855/1922 ("#101"), 1881/1956 ("#102")`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> $ grep -nE '^## #?(72|83|84|100|101|102)[.—) ]' docs/MISTAKES.md
> 1194:## 72. A block's whole reason for existing sat behind a condition that was always true
> 1231:## 72. The block gate audited one file while the registry became four
> 1430:## #83 — A test that hardcodes a count is edited by whoever breaks it
> 1450:## #84 — A positional assertion silently changed what it was testing
> 1819:## #100 — Every vendored font is VARIABLE, and the obvious extractor reads the wrong master
> 1855:## #101 — The shard grid that was already broken before anything hit it
> 1881:## #102 — `git stash` in a shared worktree, while other agents were writing to it
> 1903:## #100 — The build context is the working tree, so .gitignore does not protect it
> 1922:## #101 — I discarded a correct diagnosis because of evidence that never contradicted it
> 1956:## #102 — `preview.mjs` is non-deterministic where the production render is not
> 2767:## 83. resolveEasing swallowed unknown easing names
> 2789:## 84. The validator's TYPE pass policed block layers it was meant to exempt
> 
> The repo cites these numbers as if they were unique keys:
>   docs/PRIMITIVES.md:180  "Verify with a repeat render, never with `make frame` (see MISTAKES #102)"  → the FIRST #102 is the git-stash entry; the intended one is at line 1956.
>   scripts/gates/docs-drift.mjs:3  "see its own closing warning, and MISTAKES #83"
>   scripts/gates/lib-test.mjs:593  "Same failure as the hardcoded counts in MISTAKES #83"
> 
> CLAUDE.md is built on citing this log by number (#15, #64, #138, #155, #163, #190), so a duplicated key silently sends the reader to a different lesson.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && grep -oE '^## #?[0-9]+' docs/MISTAKES.md | sed 's/[^0-9]//g' | sort | uniq -d
```

**fix** Renumber the six collisions to fresh ids (218-223), repoint docs/PRIMITIVES.md:180, scripts/gates/docs-drift.mjs:3 and scripts/gates/lib-test.mjs:593, and add a uniqueness assert over `^## #?N` to scripts/gates/docs-drift.mjs so a duplicate id fails the build.

**survived refutation because** Repro confirmed: `grep -oE '^## #?[0-9]+' docs/MISTAKES.md | sed 's/[^0-9]//g' | sort -n | uniq -d` returns 72 83 84 100 101 102, and the file is one flat non-restarting sequence (only one `# ` heading, at line 1), so these are real key collisions. Could not refute existence. But the impact is much smaller than claimed. (a) Nothing machine-reads the numbering: every MISTAKES reference in core/, verify/, blocks/, scripts/ is a prose comment or a human-readable gate message; no gate parses or validates entry numbers, so no build/render/gate outcome changes. (b) Of the three cited numbers, two do NOT misresolve: the `#83`/`#84` citations in scripts/gates/docs-drift.mjs:3 and scripts/gates/lib-test.mjs:593 mean the entries headed `## #83 — A test that hardcodes a count` / `## #84 —`, while the colliders are `## 83. resolveEasing…` / `## 84. The validator's TYPE pass…` with no `#`, so grepping the cited token `#83` hits only the intended entry. (c) The 72, 100 and 101 collisions have zero citations anywhere in the repo. (d) CLAUDE.md's cited numbers (#15, #64, #138, #155, #163, #190) are all unique and unaffected. Exactly one live citation genuinely lands wrong: docs/PRIMITIVES.md:180 cites #102 meaning the preview.mjs determinism entry at line 1956, but both colliders are formatted `## #102 —` so the first hit is the git-stash entry at line 1881. Not intentional or documented anywhere, not already fixed (clean tree at HEAD). Doc hygiene worth a renumber; no functional consequence.

---

### [ ] docs/CRAFT/BLUEPRINTS.md names formats/scene/tokenjam-launch.json as "the worked blueprint-era example" to study before authoring; the file does not exist

**where** `docs/CRAFT/BLUEPRINTS.md:53`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> $ sed -n '51,55p' docs/CRAFT/BLUEPRINTS.md
> The gold standard in this repo is **`formats/scene/brew-native.json`** — study its seams, camera push,
> `motion[]` dolly heroes, gradient+motionBlur text, cursor click, and ken. `formats/scene/tokenjam-launch.json`
> is the worked blueprint-era example (kinetic hooks, dashboard dive, verdict proof, held CTA). Before authoring,
> watch one and read [`DIRECTION.md`](DIRECTION.md) — anchor on ambition, then compose.
> 
> $ ls formats/scene/tokenjam-launch.json
> ls: formats/scene/tokenjam-launch.json: No such file or directory
> 
> (brew-native.json does exist.) docs/MISTAKES.md:2970 cites the same dead path. `make craft-coverage`, the gate that audits docs/CRAFT cross-links, only validates .md targets, so a dead scene path is invisible to it — it currently fails on a different broken link (SUBAGENTS.md → AB-JUDGE.md) and still passes this one through.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && grep -n 'tokenjam-launch' docs/CRAFT/BLUEPRINTS.md && ls formats/scene/tokenjam-launch.json
```

**fix** Point BLUEPRINTS.md at a blueprint-composed scene that still exists (or drop the sentence), and widen scripts/gates/craft-coverage.mjs's link check from .md targets to any backticked repo path so a deleted reference scene fails the gate.

**survived refutation because** Fully reproduced; could not refute. grep confirms docs/CRAFT/BLUEPRINTS.md:53 names `formats/scene/tokenjam-launch.json`; `ls` shows no such file among the 155 in formats/scene/, and `git log --all -- 'formats/scene/tokenjam*'` returns nothing, so it was not renamed or moved. The sibling path on the same sentence (brew-native.json) does exist, so the reporter did not misread the path. Not intentional: docs/MISTAKES.md:2970 (entry #141) records that this exact file was deleted in a Phase 0 overhaul and that a *different* dangling reference to it (in vawe-creative) was repointed to creed-launch.json, with the note that "a dangling doc ref trains authors to distrust the guidance" — the repo calls this class a defect and just missed this instance. Verified the gate gap too: scripts/gates/craft-coverage.mjs:67 matches only /\]\(([^)]+\.md)(#[^)]*)?\)/g, so a backticked bare non-.md path cannot be seen by it. Reachable: CLAUDE.md routes authors to BLUEPRINTS.md via `make blueprints`, and the dead path sits in the "The reference bar" section that instructs you to study it before authoring. Severity is low rather than medium: docs-only, no runtime or render impact, the sentence still offers a working primary reference (brew-native.json), and the fix is one line.

---

### [ ] docs/CRAFT/REFERENCE-STUDY.md documents a `make measure` self-verification command that always exits 2

**where** `docs/CRAFT/REFERENCE-STUDY.md:32`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> $ sed -n '32p' docs/CRAFT/REFERENCE-STUDY.md
> 5. **Author → verify.** Build it, then `make measure VIDEO=out/ours.mp4 EXPECT=<preset>` to confirm the
> 
> $ make measure VIDEO=twitter.mp4 EXPECT=snappy
> node scripts/author/measure-motion.mjs twitter.mp4   snappy
> usage: make measure VIDEO=<file> FROM=<s> TO=<s> [EXPECT=<preset>]
> make: *** [measure] Error 2
> 
> scripts/author/measure-motion.mjs:31 requires a finite FROM and TO with TO > FROM. The doc omits both, so the one step in the reference-study loop that closes it ("did my render come out as the curve I asked for?") cannot be run as written. Every other doc that cites make measure (MEASURE.md:15-16, RECREATION.md:24, TRANSITIONS.md:23) passes FROM/TO correctly.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && make measure VIDEO=twitter.mp4 EXPECT=snappy
```

**fix** Add FROM/TO to the example in docs/CRAFT/REFERENCE-STUDY.md:32 (`make measure VIDEO=out/ours.mp4 FROM=… TO=… EXPECT=<preset>`).

**survived refutation because** Ran the repro: `make measure VIDEO=twitter.mp4 EXPECT=snappy` exits 2 with the usage line, exactly as claimed. scripts/author/measure-motion.mjs:28-33 requires finite FROM and TO with TO > FROM; there is no default window and no whole-clip mode, and Makefile:264 is a bare pass-through so unset make vars collapse the positional args and EXPECT lands in the TO slot. All four refutation angles failed: not intentional (the script's own header at :16 and docs/CRAFT/MEASURE.md:16,79 spell the same verify call WITH FROM/TO), not a misread path, not already fixed on disk, and git log shows no signature change that could have orphaned the example.

Severity is low, not higher, because it is documentation with no runtime reach: no scene render touches it, the failure is instant and prints the exact correct usage, and the same file shows the correct form four lines earlier at REFERENCE-STUDY.md:26 (step 2 uses FROM=… TO=…).

One correction to the report: the defect is not unique to REFERENCE-STUDY.md:32. docs/CRAFT/RECREATION.md:83 carries the identical omission (`make measure VIDEO=out/ours.mp4 EXPECT=<preset>`) inside a line-wrapped code span; the reporter cited RECREATION.md:24 as correct and missed it. Both instances are the verify step specifically, while the identify step is correct everywhere, so this is a small consistent prose slip rather than stale drift. Fix is a two-doc edit adding FROM/TO.

---

### [ ] Two CRAFT docs attribute rules to the wrong gate: hook length to `validate` and dead-final-frame to `make audit`; neither checks either

**where** `docs/CRAFT/DIRECTION.md:98, docs/CRAFT/TASTE-RULES.md:139`  ·  **area** truth  ·  **class** stale-doc

**evidence**

> DIRECTION.md:98 — "First frame ≤ ~12 words … `[gated]` validate (hook length)", where DIRECTION.md:10 defines `[gated]` as "a gate catches it mechanically (named in the rule)".
> $ grep -n 'hook' core/validate.mjs
> (no matches)
> $ grep -rn '12' scripts/gates/copy-check.mjs | grep word
> 47:  if (w.length > 12) warn('hook-length', …)
> The rule lives in copy-check, and it is a WARN, not a block — the opposite of the never-waivable `validate` step author-check.mjs:119 records.
> 
> TASTE-RULES.md:139 — "| Invisible-at-size text; dead-final-frame; overlap | `make audit` |"
> $ grep -rn 'dead-final' .
> ./docs/CRAFT/DIRECTION.md:64, :101, :113
> ./docs/CRAFT/TASTE-RULES.md:139
> ./scripts/author/motion-director.mjs:152:  if (!holdsEnd) warn('dead-final-frame', …)
> `make audit` runs verify/audit.mjs only (Makefile:172-173); dead-final-frame is emitted by scripts/author/motion-director.mjs, i.e. `make direct`. Following the doc, an author runs `make audit`, sees green, and never triggers the check.

**repro**

```bash
cd /Users/vandit/Developer/code/shortwave && grep -c hook core/validate.mjs; grep -rn 'dead-final' verify/ scripts/gates/ || echo 'not in audit or any gate'
```

**fix** Change DIRECTION.md:98 to name `copy-check: hook-length` (and mark it a warn, not a block), and TASTE-RULES.md:139 to name `make direct` for dead-final-frame. Then have scripts/gates/craft-coverage.mjs cross-check every `[gated]` rule id in docs/CRAFT against the gate script it names, so a renamed or relocated rule fails the gate instead of misdirecting the author.

**survived refutation because** Ran the repro: `grep -c hook core/validate.mjs` returns 0, and `grep -rn 'dead-final' verify/ scripts/gates/` returns nothing. Hook length lives at scripts/gates/copy-check.mjs:47 as a warn(), and author-check.mjs:146 records the copy step as `{ waivable: true, exitMeansFail: strict }` while line 118 marks validate "never waivable" — so DIRECTION.md:98 names the wrong gate and the wrong strength. dead-final-frame is emitted only by scripts/author/motion-director.mjs:152 (`make direct`, Makefile:632); `make audit` (Makefile:172-173) runs verify/audit.mjs, which covers contrast (:509,:609,:626) and overlap (:741) but never dead-final-frame — so TASTE-RULES.md:139 misfiles one of three items. Refutation attempts failed: nothing is fixed on disk, `make validate` is only `node core/validate.mjs` with no wider meaning, docs-drift.mjs passes green so no gate covers this, and DIRECTION.md's own legend at :10 promises the gate is named in the rule while its siblings at :101/:113 name gates correctly. Severity is capped to low, not none: DIRECTION.md:10 and CLAUDE.md step 2b both route authors to `make author-check`, which runs copy and direct regardless of the mislabels, so no check is actually skipped by anyone following the mandated ladder; and the TASTE-RULES table self-advertises as stale by calling `make direct` "planned" when Makefile:632 defines it. Doc-only drift, no code path or render affected.

---
