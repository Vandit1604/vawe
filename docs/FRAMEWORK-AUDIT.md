---
when: arguing about a gap between this engine and another engine or another engine
answers: "the benchmarked audit, severity-ranked, of API consistency, text fit and the rest"
group: engine
---

# FRAMEWORK-AUDIT — the scene engine, benchmarked against another engine & another engine

Audited July 2026. Scope = the **permanent** engine (not videos): `formats/scene/scene.html`,
`core/*.js`, `formats/scene/schema.json`, the gates (`verify/audit.mjs`, `scripts/{motion-audit,
slop,validate,probe-purity,similarity}.mjs`), `core/tokens.css`, `core/theme-contract.js`.

Method: inline code audit of our engine + source reads of another engine (`packages/core`, `layout-utils`,
`renderer`) and another engine (`packages/{core,parsers,engine,cli}`). Each finding: **our state → how they
solve it → severity → fix.** Severity: 🔴 defect · 🟠 ergonomics/maintainability · 🟢 already solid.

---

## 1. API / prop consistency — 🟠 Med
**Us:** we invented a JSON DSL over CSS and it drifted — `align` (text-align) vs `align2` (align-items,
cryptic) vs `justify` (justify-content); `layout` vs legacy `direction`; `cols` (board's array) collided
so groups got the awkward `gridCols`; `dir` vs `direction`.
**Them:** *neither engine invents a layout vocabulary.* another engine authors raw HTML (`flex-direction`,
`justify-content`, `gap`, `align-items`); another engine uses React inline styles — **there is no custom layout
DSL to be inconsistent about.** Each keeps a uniform suffix convention for its own API (another engine
`*InFrames`; HF `*Seconds`).
**Fix:** mirror CSS names 1:1 — `align` → align-items, `justify` → justify-content, `dir`/`direction` →
flex-direction, retire `align2`, keep `gridCols` (grid needs a count CSS doesn't name). Add back-compat
aliases; document the canonical set. *No behavior change, just names.*

## 2. Text fit / overflow — 🔴 Med-High
**Us:** `fit` is **opt-in and single-line only** (`scene.html:313`), so long headlines clip; the layout
audit *does* flag overflow/clip after the fact.
**Them:** another engine ships `fitText` (single-line), **`fitTextOnNLines`** (binary-search font size over N
lines, `fit-text-on-n-lines.ts:34`), and `measureText` with a **font-loaded guard that throws if the font
isn't loaded** (`measure-text.ts:146`). another engine has `fitTextFontSize` (single-line) **plus** its
`inspect` audit with codes `text_box_overflow`/`clipped_text`/`content_overlap`/`text_occluded` sampled
across the timeline (`layoutAudit.ts:12`).
**Fix:** (a) make `fit` robust — binary-search multi-line (mirror `fitTextOnNLines`), not single-line;
(b) add a **font-loaded guard** before measuring so a substituted/local font (Söhne) doesn't mis-size;
(c) our audit already flags overflow — keep it, it's the HF `inspect` equivalent.

## 3. Gate coverage — 🟠 Med
**Us:** audit = overlap / safe-zone / overflow / WCAG-contrast / **tiny-image**; motion = i–ix
(holds/settles/monotonic/counters/typing/frozen/jump/shimmer/rhythm); slop = the impeccable detector
(font-heavy).
**Them:** HF has **two** gates — `lint` (~90 static codes: `overlapping_clips_same_track`,
`timed_element_missing_clip_class`, `non_deterministic_code`) + `inspect` (runtime: `clipped_text`,
`text_box_overflow`, `content_overlap`, `text_occluded`, and **motion-intent** codes `motion_off_frame`,
`motion_frozen`, `motion_out_of_order`, `motion_appears_late`). another engine is static eslint only —
`deterministic-randomness`, `non-pure-animation`, `even-dimensions`, `slow-css-property`.
**We already have:** overlap/overflow/safe/contrast/tiny-image + motion i–ix (incl. our own `frozen`/`jump`
≈ HF's `motion_frozen`/`motion_off_frame`). **Gaps:** no **preset-monotony** (every headline `preset:"up"`
= the "all text rises" complaint — HF has nothing here either; it's our specific failure); no
**readable-text-size floor** (min font px, the type analog of tiny-image); cheap determinism lints we lack:
**even-dimensions** (odd W/H breaks some encoders) and a **non-pure-animation** static check.
**Fix:** add preset-monotony + min-font-size floor to the audit; optionally an even-dimensions validate check.

## 4. Determinism & render performance — 🟠 Med (one real architectural win)
**Us:** `renderFrame(f)` is provably pure — every value a function of `t = f/fps` (`scene.html:364`).
Static-frame dedup + **same-instance anchor verification** cope with cross-Chrome-instance raster drift.
But we **spawn a browser per worker** — which is *why* we needed same-instance anchoring at all.
**Them:**
- another engine: **one reused browser, a pool of pages** shared across all frames (`render-frames.ts:522,317`);
  concurrency `min(8, cpus/2)` (`get-concurrency.ts:7`); a long-running **Rust compositor** child process
  with an **LRU decoded-frame cache** (`rust/frame_cache.rs:30`). Per-frame = seek + JPEG screenshot.
- another engine: worker threads with a **cost-aware sizer** — `calculateOptimalWorkers` reduces workers for
  expensive captures to avoid starvation (`parallelCoordinator.ts:158`); static-frame dedup default-on with
  anchor verify (convergent with us); deterministic capture via Chrome **BeginFrame** (`frameCapture.ts:8`).
**The win:** adopting **one browser + a page pool** (another engine's model) would (a) cut per-frame browser
spawn cost and (b) **unify raster across frames — eliminating the same-instance-anchor complexity entirely**,
since all frames render in one instance. Chrome BeginFrame capture (HF) is a second determinism upgrade.
**Fix (Phase 3):** single browser + page pool; measure per-frame cost first, then evaluate BeginFrame.

## 5. Motion coverage — spring on the keyframe track — 🔴 Med
**Us:** the `motion` track interpolates keyframes with **eased-linear only** (`motionAt` →
`resolveEasing`, `scene.html:346`). `spring()` exists in `core/motion.js` but isn't usable on the track — so
choreography can't overshoot/settle organically.
**Them:** another engine exposes `Easing.spring({damping,mass,stiffness})` as a plain **`t→t` easing usable
inside `interpolate`** (`easing.ts:77`). another engine' `springEase.ts` solves the damped oscillator
**offline and bakes it to a 120-point curve** used as the easing between two keyframes (`springEase.ts:37`).
**Fix (high-value, low-risk):** register a `springEase(t,{bounce|stiffness|damping})` t→t function in
`EASINGS`/`resolveEasing`, plus named presets (`spring`, `spring-bouncy`, `spring-stiff`). Because
`motionAt` already routes through `resolveEasing`, keyframes get `ease:"spring"` for free. Mirror HF's
bake-to-curve or another engine's live function — both are pure-in-`t`, so determinism holds.

## 6. Code health & testability — 🟠 Med
**Us:** the layer engine is a **427-line inline `<script>`** in `scene.html` — the motion/camera/layer
math is entangled with DOM writes and can't be unit-tested. `core/motion.js` *is* tested (`lib-test`, 168
asserts).
**Them:** another engine keeps math in small pure modules (`spring/`, `interpolate.ts`, `easing.ts`) with **57
test files** (bun); another engine splits `parsers` (~26 tests) from `engine` (~43) with vitest — e.g.
`springEase.ts` is 88 pure lines with 9 tests.
**Fix (Phase 3):** extract the pure math — `motionAt`, `cameraAt`, keyframe/easing eval — into a
`core/sequence.js` module of `(config, t) → value` functions; unit-test the table like `spring.test.ts`.
DOM render stays in `scene.html`. Purity-guarded by `make probe` + `make snap`.

## 7. Schema ↔ engine drift — 🔴 Med
**Us:** **`motion` is entirely missing from `schema.json`** — I shipped the primitive and never
registered it; validation passes only because unknown props are allowed. No automated check keeps schema
and engine in sync.
**Them:** another engine's props are typed (TS) so drift is a compile error; HF parsers validate against a
typed IR.
**Fix (quick win):** add `motion` (+ its keyframe shape) to the schema, and a `scripts/gates/schema-drift.mjs`
(`make schema-check`) asserting every `L.<prop>` the engine reads exists in the schema.

---

## Phase-2 — ✅ SHIPPED (July 12, 2026; snap-identical, purity held)
| # | Fix | Dim | Why now |
|---|---|---|---|
| 1 | Add `motion` to schema + `make schema-check` drift test | 7 | closes a silent gap; cheap |
| 2 | `springEase` t→t easing + presets → `motion` gets `ease:"spring"` | 5 | the "real animation" upgrade; low-risk |
| 3 | Robust multi-line `fit` + font-loaded guard | 2 | stops headline clipping; measurable defect |
| 4 | Two gate checks: preset-monotony + min-font-size floor | 3 | catches the "all text rises" / unreadable-text failures |
| 5 | Mirror CSS layout prop names + aliases + doc | 1 | ergonomics; back-compat, snap-identical |

## Deferred to Phase 3 (each its own Medium)
- Extract pure timeline math → `core/sequence.js` + unit tests (dim 6).

## Tried & rejected — single-browser + N-tab page pool (dim 4, July 12 2026)
Implemented one booted browser with N child-context tabs (replacing the browser-per-worker
`newTab`), incl. the Puppeteer/another engine anti-throttling flags (`disable-renderer-backgrounding`
et al.). **Measured a severe regression and reverted:**

| Model | northwind (330 frames) |
|---|---|
| per-browser (HEAD), 8 workers | **20s** |
| per-browser, 1 worker | 37s |
| **one browser + 8 tabs** | **>5 min, never finished** |

**Why it fails for us (not for another engine):** another engine's page pool is paired with a Rust compositor
and pre-warmed, seek-only pages. Our chromedp path screenshots per frame, so 8 heavy tabs in one
process thrash — CDP traffic serializes over one connection, every `CaptureScreenshot` contends on
the single compositor, and scene memory multiplies in one process. The anti-throttling flags fixed
the background-rAF stall but not the contention. The cost the audit hoped to cut — per-**worker**
browser spawn — is one-time (~1-2s, parallel, amortized over the whole render); the per-browser
model's dedicated per-tab process that the OS schedules across cores is exactly what makes it fast.
**Conclusion: keep browser-per-worker.** The "same-instance anchor" it necessitates is cheap and
correct; it is not worth trading for a slower render.

## Guardrail for every fix
`make snap` on all shipped videos (`linear-journey`, `northwind`, `stripe`, `kanban-drag`) must stay
**identical** (aliases/additions only), and `make probe` must stay pure. Nothing here changes a rendered
pixel except (3) fit and (4) new *warnings*.
