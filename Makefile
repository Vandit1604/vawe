# Vawe — render engine
# Go renders the video (chromedp + ffmpeg); scenes are HTML/CSS in formats/<name>/.

.PHONY: beatsync gradients ransom-sprites docker-context build video render all look frame verify audit audit-test probe snap snap-all motion lib-test validate palette brandspec lookbook sections photos similar ledger ledger-add feature-audit captions review install-hooks assets list clean gen-image gen-clip gen-video sim sim-audit music music-pack gallery examples

# make fonts  — download the free, openly-licensed faces into the gitignored assets/fonts/
# (no font binary is committed; a fresh clone self-heals). Sohne is paid → drop it in fonts/local/.
fonts:
	node scripts/media/fonts.mjs

# make audio  — bake every cue + music bed from PARAMETERS (core/audio-kit.mjs). No network, no
# licence, deterministic: same params -> same bytes. Replaces downloading a sample library.
audio:
	node scripts/media/audio-bake.mjs

# make audio-bed D=<file> [WRITE=1]  — resolve `audio.music:"auto"` to a concrete bed from the scene's
# profile (docs/CRAFT/SOUND.md via core/audio-select.js). Prints by default; WRITE bakes it in place,
# because the render binary has no JS pre-pass and would read "auto" as a filename → silence.
audio-bed:
	node core/audio-select.js $(D) $(if $(filter 1,$(WRITE)),--write)

# make vo-captions D=<file> [STYLE=weightShift] [WRITE=1]  — turn a VO word-timing sidecar (audio.voWords)
# into timed karaoke captions. No TTS; reads the transcript only. Prints by default; WRITE → <file>.captioned.json.
# (Distinct from `make captions`, which times captions from a plain SCRIPT string — scripts/author/captions.mjs.)
vo-captions:
	node scripts/media/vo-captions.mjs $(D) $(if $(STYLE),--style $(STYLE)) $(if $(filter 1,$(WRITE)),--write)

# make music GENRE=ambient N=0 NAME=launch  — fetch a real soundtrack (Mixkit free stock music) into
#   NOTE: SFX are synthesized (`make audio`); this MUSIC fetcher is the only remaining download.
# the gitignored assets/music/ and record its provenance in credits.json. The MUSIC licence differs
# from the sfx one and is not machine-readable — confirm before commercial release.
music:
	node scripts/media/music.mjs $(if $(ID),--id $(ID)) $(GENRE) $(N) $(NAME)

# make music-pack  — fetch the curated real-loop pack (lofi/chill/beat) the engine ships as its
# default sound, replacing the synthesized drone beds. core/audio-select.js maps profiles onto these.
music-pack:
	node scripts/media/music.mjs --pack

# make gallery  — build the hover-to-play example showcase (out/gallery/index.html) from the flagship
# registry (formats/scene/examples.json). Render the examples first (make video / beatsync).
gallery:
	node scripts/site/examples-gallery.mjs

# make examples  — rebuild the whole flagship showcase from committed sources (beatsync + render each,
# then the gallery). Reproducible fixtures. Run `make music-pack` first for the beat-synced ones.
examples: build
	node scripts/site/examples-build.mjs

# make beatmap MUSIC=assets/music/launch.wav  — detect tempo + beat grid -> <name>.beats.json, so an
# edit can be built ON the music. Reports confidence; an ambient pad has no beat and it says so.
beatmap:
	node scripts/media/beatmap.mjs $(MUSIC)

# make beatsync D=formats/x/video.json MUSIC=assets/music/warm.wav [GRID=beat|downbeat] [SNAP=0.18]
# [LAYERS=1] [WRITE=1]  — snap the scene's cuts/transitions/seams/stings onto the track's beat grid so
# the edit lands ON the beat. Reports drift; WRITE writes <scene>.beatsync.json. Deterministic + idempotent.
beatsync:
	node scripts/media/beatsync.mjs $(D) --music $(MUSIC) $(if $(GRID),--grid $(GRID)) $(if $(SNAP),--snap $(SNAP)) $(if $(filter 1,$(LAYERS)),--layers) $(if $(filter 1,$(WRITE)),--write)

# The sound library is SYNTHESIZED, not downloaded — `make audio` bakes every cue from the Cuelume
# voicings in core/audio-kit.mjs (noise + biquad + envelope, seeded, deterministic, no licence).
# scripts/media/sfx.mjs (the old Mixkit fetcher) is kept for reference but is NOT wired to a target:
# a downloaded file named `click` turned out to be 19.6 seconds long and nothing noticed (MISTAKES #51).

# make sfx-check  — is each sound effect the SHAPE its role claims? A 19.6s file named `click` is how
# a typed line came out sounding like a passing train (docs/MISTAKES.md #51).
# make spectrum MUSIC=assets/music/x.wav [FPS=30] — bake per-frame band energy beside a track, so
# layers can react to the music while renderFrame(n) stays a pure table lookup.
spectrum:
	node scripts/media/spectrum.mjs $(MUSIC) $(if $(FPS),--fps $(FPS))

# make blocks-audit — do the block FACTORIES obey the copy rules the videos are held to? A block
# ships to every caller, so an invented number or a brand default in one reaches every video.
blocks-audit:
	node scripts/gates/blocks-audit.mjs

# make layer-props [D=<file>] — does the engine READ the props a layer sets? `make expand` does this
# for blocks; the primitive path had nothing, so {"type":"glow","r":620} was accepted and dropped.
# make dead-branch — a ternary whose arms are identical, i.e. a decision that decides nothing.
# deploySuccess shipped one next to an always-true condition and its cascade was unreachable; no
# RENDER gate can see that, because the output is valid, deterministic and wrong by omission.
dead-branch:
	node scripts/gates/dead-branch.mjs

# make docs-drift — ROADMAP/PRIMITIVES list shipped effects as missing, or quote a stale count. It decayed this way twice and
# routed two planning passes at work that already existed; its own closing warning says nothing
# checked it. Now something does.
docs-drift:
	node scripts/gates/docs-drift.mjs

layer-props:
	node scripts/gates/layer-props.mjs $(D)

sfx-check:
	node scripts/gates/sfx-audit.mjs

# make canvas-purity [M=scene] [D=<file>] — do the shader/paint PIXELS depend only on n? `make probe`
# compares a DOM signature and structurally cannot see inside a canvas (docs/MISTAKES.md #64).
canvas-purity:
	node scripts/gates/canvas-purity.mjs $(if $(M),$(M),scene) $(D)

build: fonts
	go build -o bin/vawe ./cmd/render

# make video D=path/to/video.json  — one self-describing JSON → out/<name>.mp4
# Runs the mandatory authoring-quality ladder first (set NOCHECK=1 to skip during rapid iteration), then
# renders, then the layout/contrast/size audit (set NOAUDIT=1 to skip). The ladder is what stops an
# effect-soup video shipping silently; NOCHECK=1 is the explicit, logged waiver.
video: build
	@$(if $(NOCHECK),echo "  · author-check skipped (NOCHECK=1)",echo "▶ author-check (value · direction · anti-slop) …" && node scripts/gates/author-check.mjs $(D) $(if $(VS),--vs $(VS)))
	./bin/vawe $(D) $(if $(ASPECT),--aspect $(ASPECT))
	@$(if $(NOAUDIT),echo "  · audit skipped (NOAUDIT=1)",echo "" && echo "▶ audit (contrast · size · safe-zone · overlap) …" && node verify/audit.mjs $(D))
	@echo "" && echo "▶ REQUIRED before shipping: make judge D=$(D)$(if $(VS), VS=$(VS)) — then read /tmp/judge/sheet.png vs the rubric (docs/JUDGE.md)."

# make list  — show formats + where their schema/sample live (for authoring the JSON)
list: build
	./bin/vawe --list

# make render M=scene  — render a format's bundled sample.json
render: build
	./bin/vawe --module $(M) --data formats/$(M)/sample.json --out out/$(M).mp4

# make all  — every format via the render queue
all: build
	./bin/vawe --all

# make look M=scene         — storyboard (key frames) for visual review
look:
	node scripts/author/preview.mjs $(M)

# make frame M=scene N=560  — one exact frame
frame:
	node scripts/author/preview.mjs $(M) $(N)

# make assets D=formats/x/topic.json [WRITE=1]  — fill missing icons: country→flag, brand→logo,
# else a generated topic card. Dry-run without WRITE.
assets:
	node scripts/media/assets.mjs $(D) $(if $(WRITE),--write)

# make verify  — integrity + safe-zone + contact sheets (all formats)
verify:
	node verify/run.js

# make audit [M=scene] [ASPECT=16:9,9:16|all]  — layout audit: overlap / overflow / safe-zone /
# tight-spacing on [data-layer=critical] across sampled frames. Annotated overlays →
# /tmp/audit/<format>[.<aspect>].png. ASPECT mirrors `bin/vawe --aspect`: audit every canvas you ship,
# because a scene can pass at its own ratio and overflow every other one.
audit:
	node verify/audit.mjs $(if $(D),$(D),$(M)) $(if $(ASPECT),--aspect $(ASPECT))

# make audit-test  — regression: proves `make audit` still CATCHES invisible emphasis (blue-on-blue).
# Runs the audit on a fixture that forces accent-<b>-on-accent-bg and asserts a hard contrast fail.
audit-test:
	node verify/contrast-regression.mjs

# make snap M=<format> [SAVE=1]  — check a scene WITHOUT rendering video: capture/diff the per-frame
# DOM signature (bbox/transform/opacity/font/text). Baseline a refactor, then prove frames unchanged.
snap:
	node scripts/gates/scene-snap.mjs $(M) $(if $(SAVE),--save)

# make snap-all [SAVE=1] [SCENE=<name>]  — the WHOLE-LIBRARY net: sweep every shipped scene, quarantine
# any that render order-dependently (non-deterministic), and baseline/diff the rest. Run before/after any
# engine-wide change (a refactor, a version bump) to prove all scenes are byte-identical or see what moved.
snap-all:
	node scripts/gates/snap-scenes.mjs $(SCENE) $(if $(SAVE),--save)

# make motion [M=<format>] [D=<file.json>] [STRIDE=2]  — animation-over-time audit: renders every frame
# headless (no video) and asserts the motion contract (final frame holds, reveals monotonic, payoffs
# settle before the exit, counters sane, typing completes). The check `make snap`/`make audit` can't do.
# D forwards to --data; without it the target silently audited sample.json instead of your scene.
motion:
	node scripts/gates/motion-audit.mjs $(M) $(if $(D),--data $(D)) $(if $(STRIDE),--stride $(STRIDE))

# make conformance [enums|props|paths]  — does the engine DO what it says it accepts? Applies every
# declared enum value and every layer prop, and asserts the OUTPUT CHANGED. Catches the dominant bug
# class in this repo (docs/MISTAKES.md #19-28): input accepted, then silently ignored or substituted.
conformance:
	node scripts/gates/conformance.mjs $(P)

# make gate-test  — MUTATION-test the gates: feed each one a fixture built to trip it and assert it
# FIRES, plus fixtures that must PASS so a gate cannot buy sensitivity with false positives.
# A gate that cannot fail reports green forever (MISTAKES #26).
gate-test:
	node scripts/gates/gate-mutation.mjs

# make coverage-reel  — generate + render a reel of whatever `make coverage` says nothing exercises,
# derived from the LIVE gap so it never goes stale. Watch it: the gates only prove it did not crash.
coverage-reel:
	node scripts/author/coverage-reel.mjs
	$(MAKE) video D=formats/scene/_coverage-reel.json

# make watermark [TEXT="VAWE DRAFT"] [OPACITY=0.1]  — bake the draft watermark sheet. Offline, once;
# the render only reads the finished PNG. Pass it with ./bin/vawe <scene> --watermark assets/watermark/draft.png
watermark:
	node scripts/media/watermark.mjs

# make site-counts  — every capability number written on the SITE, checked against the registry it
# describes. The copy claimed 96 blocks / 44 families / 22 presets / 32 stings long after the
# registries had moved (docs/MISTAKES.md #111). Hand-typed counts about a growing registry go stale
# by default; this is what notices.
site-counts:
	node scripts/gates/site-counts.mjs

# make knobs-audit [D=<file>]  — DRIFT GUARD: every dial core/knobs.js advertises must actually change
# the render (a manifest that lies is worse than none). With D, also reports knobs set on a preset that
# ignores them (pointSize on extrudeText), turning a silent no-op into a message.
knobs-audit:
	node scripts/gates/knobs-audit.mjs $(D)

# make coverage  — which engine vocabulary no authored scene exercises. Conformance proves a value
# works; this says whether anything USES it. WARN tier, always exits 0.
coverage:
	node scripts/gates/coverage.mjs

# make craft-coverage  — keep the CRAFT decision docs honest: every look/sting in the engine is
# classified in SELECTION.md, no doc names a removed effect, CRAFT cross-links resolve, no guide is
# orphaned from the README index. FAIL tier (exits 1) so the docs can't silently rot.
craft-coverage:
	node scripts/gates/craft-coverage.mjs

# make transitions [BASIC=1]  — print THE TRANSITION DATABASE (core/transitions.js): every transition
# across all four mechanisms (anim/cut/sting/seam), grouped, basics marked. Decision theory: docs/CRAFT/TRANSITIONS.md.
transitions:
	node scripts/gates/transitions-catalog.mjs

# make transition-preview FX=<name> [MECH=seam|cut|sting|anim] [DIR=left|right|up|down] [TIMING=smooth|linear] [DUR=0.7]
# SEE one transition before authoring: renders a canned two-beat scene (blue A → orange B) through the
# transition and lays the window out as a labelled filmstrip → /tmp/transition-preview.png. The labels are
# EASED progress, so `TIMING=linear` vs `smooth` shows as where the motion bunches. Mechanism is inferred
# from the name when unambiguous (default seam). Inventory: `make transitions`. Theory: docs/CRAFT/TRANSITIONS.md.
transition-preview:
	node scripts/author/transition-preview.mjs

# make measure VIDEO=<file> FROM=<s> TO=<s> [EXPECT=<preset>]  — MEASURE a transition's real motion and
# name it in OUR vocabulary: per-frame tracks the moving element and fits the progress curve against the
# engine's own easings (core/motion.js + core/cuts.js), reporting the nearest preset + residual. Point it
# at a reference video ("what transition is this?") or at our own render + EXPECT=<preset> ("did my cut
# render as the curve I authored?"). Dependency-free (ffmpeg + Node). Notes/limits: docs/CRAFT/MEASURE.md.
measure:
	node scripts/author/measure-motion.mjs $(VIDEO) $(FROM) $(TO) $(EXPECT)

# make lib-test  — fast pure-JS asserts for the core/motion.js motion primitives (no browser)
lib-test:
	node scripts/gates/lib-test.mjs

# make lookbook URL=https://site.com NAME=brand  — screenshot the site (full page + viewports) for
# art direction study: derive the video's design language from the brand's own look, no canned styles.
lookbook:
	node scripts/brand/lookbook.mjs $(URL) $(NAME)

# make palette IMG=assets/brands/<brand>/sections/01-*.png  — EYEDROP the real hero pixels →
# dominant colours + LIGHT/DARK dominance (grounded, not a heuristic) + a swatch card to /tmp/palette.png.
# Author themes/<brand>.json from THIS, then verify the video with `make beats VS=<brand>`.
palette:
	node scripts/brand/palette.mjs $(IMG)

# make brandspec URL=https://site.com  — READ the site's real CSS + computed styles (don't guess): the
# 1-3 real font families with the WEIGHTS actually used (→ primary/secondary/accent), declared :root
# design tokens (--color-*/--font-*), key colours with WCAG contrast, radius. Run this BEFORE authoring
# a theme — the accurate source for weight/accent that eyedrop (pixels) can't give (it read creed's
# accent as the sky-photo blue; the CSS says #2563eb). Pair with `make palette` for dominance.
brandspec:
	node scripts/brand/brandspec.mjs $(URL)

# make sections URL=https://site.com NAME=brand  — inventory the page as SECTIONS: one screenshot per
# major block + sections.json (stable selector + ready-to-paste `make capture` command per section).
# The doctrine step: capture the real sections, don't rewrite them. Storyboard = one beat per section.
sections:
	node scripts/brand/sections.mjs $(URL) $(NAME) $(if $(VIEWPORT),--viewport $(VIEWPORT))

# make preview HTML=path/frag.html [THEME=linear] [BG=#hex] [W=1400] [SERVE=1]  — render a single
# hand-written fragment (or a captured component JSON) STANDALONE on the theme bg → /tmp/preview.png.
# SERVE=1 keeps it LIVE in your browser instead (real fonts/assets). "is this HTML doing what I want?".
preview:
	node scripts/author/preview-fragment.mjs $(HTML) $(if $(THEME),--theme $(THEME)) $(if $(BG),--bg $(BG)) $(if $(W),--w $(W)) $(if $(SERVE),--serve)

# make beats D=formats/x/video.json [VS=brand]  — first/mid/last frame of every beat in one contact
# sheet → /tmp/beats/$(notdir $(basename $(D))).png. VS=brand stacks each beat beside its source-section shot (fidelity diff).
beats:
	node scripts/author/beats.mjs $(D) $(if $(VS),--vs $(VS)) $(if $(STRIDE),--stride $(STRIDE))

# make sheet NAME=brand [SERVE=1]  — DESIGN SHEET: every captured element on one page (on the theme bg),
# labelled with size + font-substitution warnings. Review + fix the raw material BEFORE building a video.
# Default → /tmp/sheet.png (tall contact sheet). SERVE=1 → live in your browser (real fonts, scrollable).
sheet:
	node scripts/brand/design-sheet.mjs $(NAME) $(if $(THEME),--theme $(THEME)) $(if $(SERVE),--serve)

# make slop D=formats/x/video.json [AT=1.5]  — ANTI-SLOP gate: render the real DOM at a frame and run the
# vendored impeccable detector (41 rules: overused fonts, purple/blue gradients, card-in-card, centered
# defaults, …). Catches AI-generic tells in the HTML we hand-author. See .claude/skills/{taste-skill,impeccable}.
slop:
	node scripts/gates/slop.mjs $(D) $(if $(AT),--at $(AT))

# make theme-remix PRESET=editorial BRAND=acme [BG=#hex ACCENT=#hex TEXT=#hex]  — pick a design-system
# PRESET (presets/*.json) and remix it onto a brand's base+accent → a complete themes/<brand>.json. The
# another engine "pick a preset, paint the brand into it" move: good coherent design in one command, not
# hand-authored per pixel. Reads assets/brands/<brand>/palette.json when BG/ACCENT are omitted.
theme-remix:
	node scripts/brand/theme-remix.mjs --preset $(PRESET) --brand $(BRAND) $(if $(BG),--bg "$(BG)") $(if $(ACCENT),--accent "$(ACCENT)") $(if $(TEXT),--text "$(TEXT)")

# make tts (SCRIPT=narration.txt | TEXT="…") OUT=formats/scene/<name>.vo [VOICE=Samantha]  — LOCAL narration:
# synthesize a voiceover WAV + word-timing sidecar offline with macOS `say` (no cloud, no key). Writes
# <OUT>.wav + <OUT>.words.json; wire them into the scene's audio block: { "vo":…, "voWords":… }.
tts:
	node scripts/media/tts.mjs $(if $(SCRIPT),--script $(SCRIPT)) $(if $(TEXT),--text "$(TEXT)") --out $(OUT) $(if $(VOICE),--voice $(VOICE))

# make storyboard-check SB=path/to/STORYBOARD.md  — the storyboard-as-PROPOSAL gate: a one-sentence
# message + audience/arc/format/duration, and per beat a type + on-screen cues + a WHY. Enforces that the
# decisions that make a video good were made and written down BEFORE the JSON. Template: docs/CRAFT/STORYBOARD-TEMPLATE.md
storyboard-check:
	node scripts/gates/storyboard-check.mjs $(SB)

# make storyboard-draft NAME=<brand> [MSG="one sentence" DUR=30 FORMAT=landscape] — auto-draft a
# STORYBOARD.md skeleton from a captured sections.json (one beat per real section, in the site's order,
# pre-wired with type + capture command + suggested blueprint). Fill the <…> fields, then storyboard-check.
storyboard-draft:
	node scripts/brand/storyboard-draft.mjs

# make intent SB=<storyboard.md> [D=formats/scene/<topic>.json] — export the storyboard's per-beat whys
# into a <topic>.intent.json sidecar, so author-check's `inspect` VERIFIES the render delivers each beat's
# on-screen copy + motion (turns "every beat earns its frame" from doctrine into a checked contract).
intent:
	node scripts/brand/intent-from-storyboard.mjs

# make designspec-check D=<scene.json> [STRICT=1] — THE DESIGN-SPEC LOCK: the theme is the locked visual
# system; flag any layer using an off-palette chromatic colour or a non-role font. The look twin of the
# storyboard gate. Advisory in author-check; STRICT=1 blocks. Optional radii/shadow lock via scene "spec".
designspec-check:
	node scripts/gates/designspec-check.mjs $(D) $(if $(STRICT),--strict,)

# make copy-check D=<scene.json> [STRICT=1] — THE COPY GATE: on-screen writing tells (hook >12 words /
# weak opener, marketing jargon, vague quantifiers, restated headlines, a big number as flat text). The
# words are the video's voice. Advisory in author-check; STRICT=1 blocks.
copy-check:
	node scripts/gates/copy-check.mjs $(D) $(if $(STRICT),--strict,)

# make asset-check D=<scene.json> [STRICT=1] — ASSET-READINESS PREFLIGHT: confirm every referenced image /
# icon / captured component / VO file exists on disk before you render (a missing one = a broken image or
# silent gap). Prints how to fetch each. Advisory in author-check; STRICT=1 blocks.
asset-check:
	node scripts/gates/asset-check.mjs $(D) $(if $(STRICT),--strict,)

# make pace-from-vo VO=<file>.words.json [BEATS=n] — SCRIPT-FIRST PACING: propose beat start/durations
# timed to the narration (from a voWords sidecar) so the reveals land on the voice. Proposes; never mutates.
pace-from-vo:
	node scripts/media/pace-from-vo.mjs

# make studio D=formats/scene/<file>.json [PORT=8799] — LIVE scrubbable preview (no mp4 render). Serves
# the scene in a browser with a frame slider + play; scrub/step to iterate, edit the JSON + reload. Under
# it, a TIMELINE: a bar per layer against a seconds/frames ruler, cuts/seams/stings marked, enter/exit
# ramps shaded off the settled middle, and every dead-air hole (beat-check) painted as a hazard band.
# Drag the timeline to seek. Dev tooling only (drives the engine's own renderFrame(n)); Ctrl-C to stop.
studio:
	node scripts/dev/studio.mjs $(D)

# make seam-check D=formats/x/video.json  — SAMPLE THE SEAMS: pull the frames straddling every transition
# (cut/seam/sting/beat boundary) out of the RENDERED mp4 and flag a luminance flash in the overlap — the
# black-flash / collision class the center-sampling gates (beats/audit/probe) structurally miss (#138).
# Requires out/<name>.mp4 (render first). Sheet → /tmp/seams/$(notdir $(basename $(D))).png (read it — the eye is the backstop).
seam-check:
	node scripts/gates/seam-snap.mjs $(D)

# make similar [D="a.json b.json"]  — sameness audit: score authored videos pairwise (motion vocab
# + beat structure + layout). Cross-brand SAME (>0.75) fails; the anti-template gate.
similar:
	node scripts/gates/similarity.mjs $(D)

# make feature-audit  — static utilization report: framework vocabulary (kinetic presets / cuts /
# shader stings) + capability primitives (group/motion/spring/fitH…) vs what authored videos use.
# Surfaces under-adopted primitives + preset-monotony. WARN tier (always exits 0).
feature-audit:
	node scripts/gates/feature-audit.mjs

# make captions D=formats/x/video.json TEXT="script"  — auto-time a script into muted-social burned-in
# subtitles (captionMode:pop). Deterministic (time proportional to word count). See scripts/author/captions.mjs.
captions:
	node scripts/author/captions.mjs $(D) "$(TEXT)"

# make ledger D=formats/x/video.json  — check a design against ALL shipped designs (cross-video
# memory); make ledger-add D=… logs it after shipping.
ledger:
	node scripts/gates/ledger.mjs check $(D)
ledger-add:
	node scripts/gates/ledger.mjs add $(D)

# make photos Q="server room" NAME=brand [N=4]  — fetch openly-licensed photos (Openverse: cc0/pdm/by)
# with attribution recorded to credits.json. Use in clipped image layers with ken burns zoom.
photos:
	node scripts/brand/photos.mjs "$(Q)" $(NAME) $(if $(N),--n $(N))

# make capture-scene URL=… SEL="section" NAME=brand LABEL=intake PARTS="sel1,sel2"  — capture an
# ANIMATED site section as parts (relative geometry) to re-stage with our motion primitives.
capture-scene:
	node scripts/author/capture-scene.mjs $(URL) "$(SEL)" $(NAME) $(LABEL) --parts "$(PARTS)"

# make capture-motion URL=… SEL="section" [ONLOAD=1] [DUR=2.5]  — WATCH a real element animate and emit a
# motion track (from→rest keyframes) to replay the site's actual move. Scroll-triggered by default; ONLOAD=1
# for on-load reveals. The motion twin of brandspec: measure the animation, don't guess it.
capture-motion:
	node scripts/author/capture-motion.mjs $(URL) "$(SEL)" $(if $(ONLOAD),--onload) $(if $(DUR),--dur $(DUR))

# ---- generated media (kie.ai; needs KIE_API_KEY or a gitignored .kie.key) ----
# make gen-image Q="a neon server room" NAME=hero [ASPECT=16:9]  — generate an image → assets/gen/<NAME>.png
# (use it as a normal { "type": "image", "src": "/assets/gen/<NAME>.png" } layer).
gen-image:
	node scripts/media/kie.mjs image "$(Q)" --out assets/gen/$(NAME).png $(if $(ASPECT),--aspect $(ASPECT))

# make gen-clip IN=path/to.mp4 NAME=city [FPS=30] [W=720]  — extract ANY mp4 (a kie.ai generation or a
# local file) to a DETERMINISTIC frame sequence + manifest → assets/gen/<NAME>/ (use as a `clip` layer).
gen-clip:
	node scripts/media/gen-clip.mjs $(IN) $(NAME) $(if $(FPS),--fps $(FPS)) $(if $(W),--w $(W))

# make gen-video Q="a drone shot over a city" NAME=city [ASPECT=16:9]  — generate a video AND extract it to a
# clip in one step (a deterministic `clip` layer). Chains kie.ai video → gen-clip.
gen-video:
	node scripts/media/kie.mjs video "$(Q)" --out assets/gen/$(NAME).mp4 $(if $(ASPECT),--aspect $(ASPECT))
	node scripts/media/gen-clip.mjs assets/gen/$(NAME).mp4 $(NAME)

# make capture URL=… SEL=".card" NAME=brand LABEL=pricing  — lift a REAL UI component off a live site
# (its HTML + computed CSS) into an animatable `component` scene fragment. See scripts/author/capture-component.mjs.
capture:
	node scripts/author/capture-component.mjs $(URL) "$(SEL)" $(NAME) $(LABEL) $(if $(LS),--localstorage "$(LS)") $(if $(SETTLE),--settle $(SETTLE))

# make validate [D=formats/x/topic.json]  — check data + inline theme against the format schema.
# No D = validate every formats/*/sample.json. Same validator boot() runs before rendering.
validate:
	node core/validate.mjs $(D)

# make schema-check  — assert every layer prop the engine (scene.html) reads is defined in schema.json
# (catches drift like a new primitive that shipped without a schema entry). Exits 1 on drift.
schema-check:
	node scripts/gates/schema-drift.mjs

# make lint-test  — regression asserts for validate's lintData (missing-duration / typing+markup /
# scene-collision). Each rule caught a real bug this session; this pins that it still fires.
lint-test:
	node scripts/gates/lint-test.mjs

# make review  — one-command health snapshot: lib-test + layout audit + a master overlay sheet
# (/tmp/review.png). Heavier gates stay separate: make probe (purity), make verify (render integrity).
review:
	node verify/review.mjs

# make probe [M=scene]  — assert renderFrame(n) is PURE in n (byte-identical regardless of
# render order). Guards sharded/parallel rendering. No M = every format.
probe:
	@if [ -n "$(M)" ]; then node scripts/gates/probe-purity.mjs $(M); else \
		for d in formats/*/scene.html; do f=$$(basename $$(dirname $$d)); \
		node scripts/gates/probe-purity.mjs $$f || exit 1; done; fi

# make font-audit [D=formats/scene/x.json] [M=scene]  — assert every family the scene renders is
# actually vendored, loaded and painting. Catches the silent substitution that shipped Geist,
# Anybody and Manrope in the wrong typeface. Writes out/<name>.fonts.json. Exits 1 on any non-OK.
# (Distinct from `make fonts`, which DOWNLOADS the faces.)
font-audit:
	node scripts/gates/font-audit.mjs $(if $(M),$(M),scene) $(D)

# make install-hooks  — activate the version-controlled git hooks (pre-push runs the framework gates)
install-hooks:
	git config core.hooksPath .githooks
	@echo "✓ git hooks active (.githooks) — pre-push runs schema-check + lib-test"

clean:
	rm -rf bin out/*.mp4

author-check: ## MANDATORY authoring ladder: validate+critique+direct+slop+inspect (D=<file> [STRICT=1] [VS=<brand>])
	node scripts/gates/author-check.mjs $(D) $(if $(filter 1,$(STRICT)),--strict) $(if $(VS),--vs $(VS))

direction-floor: ## ambition floor: fail a plain slideshow (too little motion) (D=<file> [STRICT=1])
	node scripts/gates/direction-floor.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

beat-check: ## timeline gate: dead air, empty last frame, empty cut window, dead backdrop (D=<file> [STRICT=1])
	node scripts/gates/beat-check.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

# make impeccable D="a.html b.html"  — the bundled impeccable anti-slop detector on raw HTML fragments
# (local, no network, token-efficient). `make slop` runs the same detector on the RENDERED scene DOM;
# this is for a hand-written fragment BEFORE it goes into a scene. Build HTML through impeccable, not by eye.
impeccable: ## impeccable detector on raw HTML fragment(s) (D=<file...>)
	node .claude/skills/impeccable/scripts/detect.mjs --json $(D)

blueprints: ## catalog the directed-motion beat blueprints (blueprints/index.mjs)
	node scripts/site/blueprints-catalog.mjs

effects: ## regenerate docs/EFFECTS.md — the whole arsenal in one place (from the registries)
	node scripts/site/effects-catalog.mjs

effects-check: ## fail if docs/EFFECTS.md is stale vs the registries
	node scripts/site/effects-catalog.mjs --check

critique: ## value-gate: flag hollow/low-value beats (D=<file>)
	node scripts/gates/critique.mjs $(D)

compare: ## variant selection: tile candidate frames to pick the best (args in ARGS)
	node scripts/gates/compare.mjs $(ARGS)

expand: ## expand {type:block} + {type:comp} sugar into real layers (D=<file>)
	node scripts/author/expand-blocks.mjs $(D)

catalog: build ## render the block registry to paged sheets (browse the arsenal)
	node scripts/site/blocks-catalog.mjs
	@# render only pages whose JSON changed since their mp4 (blocks-catalog writes-on-change): the
	@# renderer's frame-dedup makes re-renders of UNCHANGED pages pixel-different (worker-order picks
	@# a different representative frame per static group), which churns every cropped clip in git.
	@for f in formats/scene/_catalog-*.json; do \
	  m=out/_catalog-$$(basename $$f .json | sed 's/_catalog-//').mp4; \
	  if [ ! -f $$m ] || [ $$f -nt $$m ]; then ./bin/vawe $$f --draft || exit 1; else echo "  · $$m up to date"; fi; \
	done
	@echo "→ out/_catalog-*.mp4 (one page per file)"

blocks-docs: ## regenerate the docs/BLOCKS.md table from the manifest
	node scripts/site/blocks-docs.mjs

blocks-json: ## regenerate site/lib/blocks.json (the site's grid) from the manifest
	node scripts/site/blocks-json.mjs

# make blocks-sync — after adding a block: docs table, the site's grid, and the site's per-block
# scenes + posters. blocks-scenes is safe to include here because it needs no render: each block is
# measured on its own stage, so adding one touches only its own files.
blocks-sync: blocks-docs blocks-json blocks-scenes ## regenerate everything derived from the block manifest

# make blocks-scenes — one scene JSON + one poster still per block, for the site's blocks browser.
# Each block gets its OWN 1920x1080 stage, so there is no cell arithmetic, no neighbour bleeding into
# a crop, and no dependency on a rendered catalog reel. The site plays the scene live in the engine it
# already vendors; the poster is the same scene, framed by the same measured rect.
blocks-scenes: ## per-block scene JSON + poster still for the site (no render needed)
	node scripts/site/blocks-scenes.mjs

house-style: ## scaffold/refresh a brand's persisted Design Read (NAME=<brand> [THEME=<theme>])
	node scripts/brand/house-style.mjs $(NAME) $(THEME)

direct: ## direction gate + motion director: audit direction, suggest cuts/stings (D=<file> [WRITE=1])
	node scripts/author/motion-director.mjs $(D) $(if $(filter 1,$(WRITE)),--write)

judge: ## vision gate: prep key frames + rubric for the agent to score (D=<file> [VS=<brand>])
	node scripts/gates/judge.mjs $(D) $(if $(VS),--vs $(VS))

ab: ## blind A/B: pair two cuts beat-by-beat for 3 judges (A=… B=… NAME=… CLAIM="…" [SEED=0] [VS=…])
	node scripts/gates/ab.mjs --a $(A) --b $(B) --name $(NAME) --claim "$(CLAIM)" $(if $(SEED),--seed $(SEED)) $(if $(VS),--vs $(VS))

ab-record: ## validate + aggregate the A/B verdicts, reveal the arms, persist (NAME=…)
	node scripts/gates/ab-record.mjs --name $(NAME)

inspect: ## verify a scene against its .intent.json sidecar (D=<file>)
	node scripts/gates/inspect.mjs $(D)

plan-check: ## plan vs render: does the film change where the storyboard promised it would (D=<file>)
	node scripts/gates/plan-vs-render.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

visuals: ## show-do-not-tell gate: does anything in the film SHOW, or is it all type (D=<file>)
	node scripts/gates/visual-vocabulary.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

dissolve: ## transition gate: is any text state cross-dissolved into another (mud) (D=<file>)
	node scripts/gates/dissolve-check.mjs $(D) $(if $(filter 1,$(STRICT)),--strict)

scrub: ## preview strip: contact sheet of the whole film (M=<fmt> or F=<mp4>)
	node scripts/author/scrub.mjs $(F)

batch: ## data-driven variants: TPL=<template.json> DATA=<data.json> [render]
	node scripts/author/batch.mjs $(TPL) $(DATA)

site-assets: ## engine renders -> site/public/assets (+posters). [RENDER=1] [ONLY=films] [CHECK=1] [FORCE=1]
	node scripts/site/site-assets.mjs $(if $(RENDER),--render) $(if $(ONLY),--only $(ONLY)) $(if $(CHECK),--check) $(if $(FORCE),--force)

# make glyphs FONT=Anybody [WEIGHT=700] [CHARSET=ascii|latin1]
# woff2 -> three.js typeface JSON (glyph OUTLINES) for extruded 3D text, into assets/fonts/3d/.
# wawoff2 + fontkit are devDependencies: build-time only, never bundled, never on the render path.
# Every face here is a VARIABLE font, so the weight is baked explicitly — the default master of
# Anybody is Thin, and baking it silently would ship the brand headline in a hairline.
glyphs: ## woff2 -> 3D typeface JSON (FONT=<Name> [WEIGHT=700] [CHARSET=ascii])
	node scripts/fonts/glyphs.mjs $(FONT) $(if $(WEIGHT),--weight $(WEIGHT)) $(if $(CHARSET),--charset $(CHARSET))

glyphs-verify: ## render a baked typeface with three.js next to the real woff2 -> /tmp/glyphs-<Name>.png (LOOK AT IT)
	node scripts/fonts/verify-render.mjs $(FONT) $(TEXT)

glyphs-audit: ## fail if any baked 3D typeface is stale against its woff2 or has charset gaps
	node scripts/gates/glyphs-audit.mjs

# ── Tier B: stateful simulation, baked offline ────────────────────────────────────────────────────
# renderFrame(n) is a pure function of n, so a simulation cannot run inside it: frame 412 exists only
# because 411 ran first. So it runs HERE instead — offline, in its own process, in frame order, as
# stateful as it likes — and emits a PNG sequence the scene plays back through the existing `clip`
# layer. Non-determinism is confined to bake time. Same shape as canvas-fx (baked once at boot) and
# `make spectrum` (FFT baked to a per-frame table). Contract: sims/README.md.
sim: ## bake a simulation to frames: D=sims/<name>.mjs [WRITE=1] -> assets/baked/<name>/
	node scripts/sim/run.mjs $(D) $(if $(WRITE),--write)

# It is confined, not abolished: same source + same seed must still give the same PNGs. This fails a
# sim that reaches for Math.random or the clock, a bake whose sim has been edited since (the frames
# would silently keep playing the previous version of the effect), and a sequence with a hole in it.
sim-audit: ## sims seeded? bakes fresh against their source? sequences intact?
	node scripts/gates/sim-audit.mjs

# The build context is the WORKING TREE, so .gitignore does not apply to it. assets/baked and
# assets/gen were gitignored, referenced by no COPY, and shipped to the daemon on every build
# regardless — 72M of bake output nobody could see in a diff. This measures what Docker would
# actually send and fails when it exceeds the budget.
docker-context: ## does the docker build context still fit its budget?
	node scripts/gates/docker-context.mjs

# Bake a pack of REAL cut-out letter images into the sprite set the `ransom` layer composes from.
# Unzip your pack into assets/ransom-src/ (a folder per character is ideal), then run this once.
ransom-sprites: ## bake assets/ransom-src/ -> assets/ransom/ + manifest.json
	node scripts/ransom/sprites.mjs

# Bake a gradient-background pack into a render-ready library (4K -> 1920, indexed).
# Royalty-free to use, NOT to redistribute: assets/gradients is gitignored. SRC=<zip|folder>
gradients: ## bake a gradient pack -> assets/gradients/ + index.json
	node scripts/media/gradients.mjs

# make filmstrip VIDEO=<file> [FPS=2] [COLS=8] [DEDUP=1] [FROM= TO=]  — SEE a whole video efficiently:
# extract frames and pack them into a few dense timestamped contact sheets (the whole piece in a small
# token budget vs reading 2000+ raw frames). DEDUP=1 keeps only changed keyframes; FROM/TO+FPS=12 zooms
# a transition. Reports sheet count + token estimate. Reusable for any reference or our own renders.
filmstrip:
	node scripts/author/filmstrip.mjs $(VIDEO)

# make reveal D=<scene.json> [ENTER=0.7] [N=8]  — see how each beat ANIMATES IN, not where it lands.
# `make beats` samples a beat's middle (the settled state) and hides the reveal motion; this renders,
# per beat, the ENTER arc densely + the settled frame + the EXIT arc, from the scene's exact layer
# start-times. The check that catches "judged the hold, missed the reveal". → /tmp/reveal/$(notdir $(basename $(D))).png
reveal:
	node scripts/author/reveal.mjs $(D) $(if $(ENTER),--enter $(ENTER)) $(if $(N),--n $(N)) $(if $(filter 1,$(LAYERS)),--layers)

# make cinematic D=<scene.json> [WRITE=1]  — the CINEMATIC MOTION director: emit the camera-push +
# per-hero dolly + motion-blur scaffold that makes a video alive-by-default, derived from the scene's
# own beats (not a template). WRITE=1 → <file>.cinematic.json; then refine + `make reveal`.
cinematic:
	node scripts/author/cinematic.mjs $(D) $(if $(filter 1,$(WRITE)),--write)
