# Design database — animation & style catalog (concept → technique)

A working "design brain" for the video engine: given a **concept/beat**, look up which
background, layout, motion, transition, colour and value to use. Grounded in UI/UX + motion-design
research (Gestalt, 60-30-10, WCAG, Material-3 easing, 12 principles). Rows marked **✅** are built
in this engine (`core/backgrounds.js` presets, `formats/brandfilm` scene types); others are the
broader palette to add when a concept needs them.

> **How to use:** find your beat in §9 (Concept → recipe). It names the background, layout, motion
> character, transition and value. Then pull exact params from §2–§8. Hold the cohesion anchors
> (§8) constant across a film; vary ≥3 axes between adjacent scenes (§10).

---

## 1. Background styles

| Style | Engine | Value | Energy | Mood / reads as | Use for | Built? |
|---|---|---|---|---|---|---|
| **Aurora** | drifting blurred radial blobs | dark | calm | premium, cinematic, "reveal in the void" | hero, hooks, emotional/vision beats, payoff | ✅ `aurora` |
| **Brand-glow** | saturated brand radial + ripple dots + spotlight | dark | warm/strong | the brand moment, climax | CTA, name reveal, closing | ✅ `brandglow` |
| **Constellation** | particle field + proximity lines | dark | medium | data, network, connectivity, tech | stats, "agents/nodes", ecosystem | ✅ `constellation` |
| **Dot-matrix** | grid of dots, wave/ripple/pulse + drift | light or dark | medium | engineered, blueprint, precise, clean | how-it-works, features, light "value-break" scenes | ✅ `dotmatrix` |
| **Spotlight** | soft light sweep + faint pulsing dots | dark | calm | focus, suspense, "one thing matters" | statements, quotes, single-idea beats | ✅ `spotlight` |
| **Mesh** | multi-blob aurora, denser | dark | medium | rich, layered, atmospheric | features, transitions between chapters | ✅ `mesh` |
| Gradient-conic sweep | rotating conic gradient behind subject | dark | calm | aura, halo, metallic | logo reveals, single word | add |
| Bokeh | blurred drifting circles | dark | playful↔calm | soft, warm, organic | lifestyle, emotional (rarely for tech) | add |
| Isometric / blueprint lines | thin grid + scanning highlight | light | medium | engineering, schematic, "under the hood" | technical explainer, architecture | add |
| Scan-lines / CRT | repeating lines + travelling band | dark | edgy | retro-tech, terminal, hacker | dev-tools, code beats (sparingly) | add |
| Noise / grain only | tinted specks over a flat field | either | calm | filmic, restrained, editorial | minimalist type scenes | ✅ `grain` (as a layer) |
| Waveform / audio bars | bars reacting to a curve | dark | energetic | audio, music, voice | podcast/voice products | add |

**Dot-animation math (for `dotmatrix`/ripple/pulse):** spacing 48–64px, r 1.5–3 → peak 4–6, base α 0.06–0.20, peak α 0.3–0.6. `wave`: value = 0.5+0.5·sin(t·ω − (x+y)·k), k≈0.03. `ripple`: replace (x+y) with dist-from-centre. Always add **drift** (8–14 px/s) — a static dot field looks dead; the grid period = spacing so the modulo wrap is seamless.

---

## 2. Motion — the 12 principles, applied

| Principle | Apply as | Param |
|---|---|---|
| Anticipation | tiny counter-move before the main move | scale→0.96 or −8px over 60–120ms, ease-in-back |
| Ease in/out | never linear except continuous loops | see §3 curves |
| Follow-through / overshoot | pass target then settle | scale +4–10%, pos +6–12px; use a **spring** |
| Secondary action | bg parallax / glow pulse under the lead | subtle, never steals focus |
| Staging | one focal action per beat | dim/blur the rest |
| Arcs | curved travel, not straight | offset x/y timing or slight rotation |
| Timing & spacing | durations below | |
| Squash & stretch | 2–5% only (premium) | more = playful |

**Durations:** micro 150–200ms · element enter 300–400ms · full-screen transition 375–500ms · **exit ≈ 0.7× enter**. **Stagger** 40–80ms/item (60–80 = luxurious), cap cascade ≈300ms. **Hold** ≈0.3s/word, floor 1.2–1.8s for a line — never exit type before it's read.

---

## 3. Easing curves (Material-3, drop-in cubic-beziers)

| Name | Curve | Use |
|---|---|---|
| Emphasized | `cubic-bezier(.2,0,0,1)` | default hero move |
| Emphasized decelerate | `cubic-bezier(.05,.7,.1,1)` | enters |
| Emphasized accelerate | `cubic-bezier(.3,0,.8,.15)` | exits |
| Expo-out | `cubic-bezier(.16,1,.3,1)` | premium snap |
| Back-out (overshoot) | `cubic-bezier(.34,1.56,.64,1)` | settle-with-bounce |
| Back-in (anticipation) | `cubic-bezier(.36,0,.66,-.56)` | pre-move |
| Linear | — | continuous loops only (bg drift) |

In-engine: `easeOutExpo` (snap), `easeOutBack` (overshoot), `spring({bounce,settle})` (natural settle), `easeOutCubic` (calm).

---

## 4. Transitions

| Technique | Duration | Use when | Built? |
|---|---|---|---|
| Dip-to-colour (through brand/white) | 250–400ms | chapter change; resets eye; brand beat if dipping brand | ✅ |
| Push / slide | 350–500ms | sequential, directional "next" | via enter offset |
| Wipe (angled 15–30° on brand) | 300–450ms | energetic reveal | ✅ `wipe/clockWipe` |
| Mask reveal (shape grows) | 400–600ms | logo/hero moments (closure) | ✅ `circleWipe` |
| Scale-punch (1.08→1 + fast fade) | 200–350ms | beat-synced emphasis cut | ✅ enter |
| Crossfade | 200–300ms | calm, between two light scenes | via opacity |
| Match-cut / shared element | 400–600ms | most premium; carry the accent shape across | add |

Hard-cut on the audio beat + a 2-frame accent flash = punchy and cheap.

---

## 5. Layout patterns

Left-aligned macro · centred statement · 3-up card row (flow) · 2-col feature grid · split (text | image) · lower-third · full-bleed number · quote block. **Rotate them** — never two identical layouts back-to-back. Margins ≥ 8% (~155px at 1920). 40–60% of the frame stays empty (premium = restraint).

---

## 6. Scene types (brandfilm)

| Type | Purpose | Best background |
|---|---|---|
| `title` | hook / name reveal | aurora, brandglow |
| `statement` | one big idea, macro type | spotlight, aurora, dotmatrix(light) |
| `steps` | process / how-it-works (cards + connectors) | dotmatrix(light), mesh |
| `stats` | proof, count-up numbers | constellation |
| `features` | capability grid | mesh, constellation |
| `quote` | serif pull-quote | spotlight |
| `split` | claim + hero image | mesh, aurora |
| `cta` | close, logo + url | brandglow |

---

## 7. Colour & contrast (locked to plinthai.xyz)

Palette: blue `#1F3BFF` (accent/10%) · periwinkle `#757dbb`/`#454e92` · light `#c7cbe8` · off-white `#f5f5f2` · ink `#16161a`. **60-30-10:** dark periwinkle field (60) → structural periwinkle tone (30) → electric blue (10, the thing that moves/reveals last). Dark scenes = shades of the periwinkle hue (never pure `#000`). **WCAG:** white text needs bg L ≤ 45% (dark scenes ✓); on light scenes use ink text + blue accent. Vary hue only *within* the periwinkle→blue family; flip **value** (dark↔light) for drama — the value flip is itself a transition.

---

## 8. Style families & cohesion anchors

**Families you can dial toward:** Swiss/editorial (grids, big type, whitespace) · kinetic-typography (word/char reveals) · data-viz (charts, count-ups, constellation) · cinematic (aurora, slow, dark) · gradient-mesh SaaS (aurora/mesh) · minimal (grain + type). This engine's default = **cinematic-editorial + kinetic type**.

**Cohesion anchors — hold constant across a whole film:** one accent (`#1F3BFF` in every scene) · one type system (Inter / Instrument Serif / Geist Mono) · consistent margins · a grain layer on every scene · one transition vocabulary · the brand mark present.

---

## 9. Concept → recipe (the lookup)

| Concept / beat | Background | Layout | Value | Motion character | Transition in |
|---|---|---|---|---|---|
| **Hook / cold-open** | aurora or spotlight | centred or left macro | dark | slow build, staggered word-rise | — |
| **Name / brand reveal** | brandglow + conic aura | centred, logo + word | dark | mask-reveal + spring overshoot | dip-to-brand |
| **Problem / tension** | spotlight | centred statement | dark | slow, minimal, hold | crossfade |
| **How it works** | dotmatrix (light) | 3-up card flow + connectors | **light** (value break) | staggered card pops (spring), lines draw | dip-to-white |
| **Feature list** | mesh or constellation | 2-col grid | dark | quick staggered fades | push |
| **Proof / stats** | constellation | full-bleed numbers | dark | count-up (expo), rise (back-out) | scale-punch |
| **Ecosystem / network** | constellation | centred | dark | slow drift, nodes connect | crossfade |
| **Emotional / vision** | aurora | centred serif | dark | very slow, grain-forward | crossfade |
| **Testimonial / quote** | spotlight | quote block | dark | word-rise, cite fades last | dip |
| **CTA / close** | brandglow | centred, logo + url button | dark | logo spring, url last | dip-to-brand |

**Pacing arc:** hook → build → payoff. Trace it with value (dark→light break→dark climax) and motion character (calm → cascade → punchy). Scene length 2.5–4s (punchy) up to 5s (the climax holds longest).

---

## 10. Variety checklist (no two adjacent scenes alike)

Change **≥3 of 6** between neighbours, holding the anchors (§8):
1. **Layout** (centred ↔ left ↔ grid ↔ split ↔ full-bleed)
2. **Scale** (macro type ↔ small/dense)
3. **Value** (dark ↔ light) — the strongest lever
4. **Background engine** (never the same twice in a row)
5. **Hue** (walk periwinkle→blue within family)
6. **Motion character** (snappy expo ↔ slow settle ↔ staggered build)

---

---

## 11. Microinteractions (product-demo scenes) — Saffer model

Every micro-animation = **Trigger → Rules → Feedback → Loops/Modes**; you animate the *feedback*.
UI micro-motion **100–300ms, never >400ms**; **ease-out** for anything triggered, spring (low bounce ≤0.1) for physical feel. Built into the `demo` format.

| Pattern | Duration | Easing | Params |
|---|---|---|---|
| Button press | 100/180ms | ease-out → spring | scale 1→0.96 |
| Hover lift | 150–200ms | ease-out | translateY −2…−4px + shadow |
| Toggle flip | 200–250ms | spring low-bounce | knob slide + track cross-fade |
| Checkmark draw | 300–400ms | ease-out | SVG stroke-dashoffset |
| Ripple on click | 300–600ms | ease-out | ring scales from point, α 0.3→0 |
| Number tick / odometer | 400–800ms | ease-out | count-up (scale to magnitude) |
| Skeleton→content | 200–300ms | ease-out | shimmer ~1200ms/loop while waiting |
| Success pulse/glow | 300–600ms one-shot | ease-out | scale 1→1.05→1 + glow |
| Shake on error | 300–400ms | ease-in-out | translateX ±6–10px, decaying |

Overshoot/bounce is **seasoning** — 1–2 per scene max. Everything bouncing = amateur.

## 12. Cursor / pointer (scripted demos) — Fitts's Law

Move time ∝ log2(distance/size). Motion is **ballistic**: fast launch, decelerate into target (`ease-out`), slight arc/overshoot — never a ruler-straight line. Move durations: short hop 0.4–0.6s · cross-screen 0.7–1.0s · from off-screen ~1.0s. **Click** = cursor dip + scale ~0.9 → `back.out` overshoot back + a ripple ring on the target at contact. **Dwell ~200–400ms arriving before pressing**; **pause ~100–300ms after click before the UI reacts** (instant = fake). After a major action, **hold ~1.0–1.4s** so the viewer registers the change — removing these pauses is the #1 demo mistake. Built into `demo` (`cursor` waypoints + ripple).

## 13. Zoom / scale storytelling

Camera moves = **ease-in-out (emphasized), 400–800ms, transform only**. **Zoom-to-focus** scale 1.0→1.3–1.4 + translate element to center ("look here"). **Zoom-out** reveals context/where-you-are. **Ken Burns** = slow continuous 3–8% zoom (1.0→1.05–1.08) over 5–15s so nothing is ever dead. **Match-zoom** = zoom INTO an element that becomes the next scene (cleanest "deeper"). **Snap zoom** 150–250ms = energetic punch. Zoom earns its place only when it directs attention, shows hierarchy, or bridges via a shared element — otherwise it's gimmicky. Built into `demo` (`camera` keyframes + canvas Ken-Burns).

## 14. "Feels alive" checklist

Never a fully static frame · idle Ken-Burns drift on bg (3–8%, 10–20s) · breathing/pulse on the live/CTA element (scale 1↔1.03, 2–4s) · staggered entrances (40–80ms/item) · parallax between layers on camera moves · secondary motion (shadow/icon settle a beat after the card) · springs over linear · ease-out reactive / ease-in-out camera · **restraint pass: after adding it all, cut half** — one clear focal motion per beat (NN/g: gratuitous animation distracts).

*Sources: Saffer Microinteractions · Material 3 · Emil Kowalski animations.dev · motion.dev · Fitts (IxDF) · Ken Burns · NN/g · StudioBinder.*

---

## 14b. Focus techniques — draw the eye to ONE thing

Ways to spotlight a word/element (pick per brand's personality; annotations suit warm/editorial, clean wipes suit tech):
- **Highlighter sweep** — a translucent accent rect behind text, `transform-origin:left; scaleX 0→1` (~0.4s ease-out). Left→right.
- **Underline** — a rule (straight for tech, hand-drawn SVG `stroke-dashoffset 100→0` for editorial) draws L→R (~0.5s).
- **Color-change wipe** — the word recolours to the accent **left→right** (or up→down): overlay the same text in accent, clip it with `inset()`/`clip-path` animating `0→100%`. Directional = reveals meaning (progress, arrival).
- **Circle / arrow annotation** — hand-drawn SVG loop or arrow (`pathLength=100`, animate `stroke-dashoffset`) around/at the focal element, + a **Caveat** handwritten label. Signature of `formats/threadcite` (marks up a Reddit card / AI-source pill).
- **Scale-punch / glow pulse** — one-shot `scale 1→1.05→1` (§11) for arrivals.
- **De-emphasize the rest** — dim/blur non-focal elements so the one thing wins (staging).

These are *bespoke-design tools*, not a template — e.g. ThreadCite uses circle+arrow+highlighter+handwriting to feel like *annotating/citing*; a clean tech brand uses a color-wipe underline. **Design the focus treatment from the brand, don't reuse one.**

## 15. Storyboard & narrative structure (brand/product ads)

**Spine (any framework maps onto it):** Hook → Build → Proof → Payoff → CTA. **Hook must land in the first 3s.** Climax/best-stat at **80–90%** of runtime (never in the hook — tease it, pay it off at the end). CTA is the **shortest** scene (3–5s), one action.

**Scene budget:** 30s → **5–7 scenes** (~3–6s each) · 60s → **8–12 scenes** (~4–7s). New beat every 5–7s. Vary scene length; accelerate toward the climax, then hold it a beat.

**Narrative spines + beat timing (30s / 60s):**
- **PAS** (pain-aware): Problem 0–6/0–10 · Agitate 6–14/10–28 · Solution 14–26/28–52 · CTA 26–30/52–60
- **AIDA** (launch/unaware): Attention 0–2/0–3 · Interest 2–8/3–18 · Desire 8–25/18–52 · Action 25–30/52–60
- **Hook·Story·Offer**: Hook 0–3 · Story 3–22/3–48 · Offer 22–30/48–60
- **Golden Circle** (premium/mission): Why 0–8/0–15 · How 8–20/15–40 · What+CTA 20–30/40–60
- **Before·After·Bridge**: Before(hook) · After(payoff) · Bridge(product)+CTA
- **FAB** = a reusable proof block inside Build: feature (~1.5s) → does what (~1.5s) → benefit (~2s), chain 2–4.

**Product info → beats:** tagline→**hook** (front-load strong word, open loop) · pain→problem · how-it-works→**build** (1 step/scene, **max 3**) · features→FAB blocks (2–4, cut low-differentiation) · **best stat→payoff** (save the shocker), others earlier · transformation→payoff · CTA→end.

**PLAIN vs BUSY bg (the tasteful rule):** decorate *transitions and low-copy scenes*; **strip high-copy and payoff scenes bare.** Go **PLAIN** when a scene has one high-value payload (big number, bold line, logo, a UI mockup that must breathe) or it's the climax, or the brand is premium/confident. Go **BUSY** (shapes/dots/aurora) only on the hook, CTA, and connective/low-copy "vibe" beats. Never decorate a scene whose whole job is to make one thing land. Negative space is the silent character — 40–60% of the frame stays empty.

**Brand DNA → motion/pacing (from `dna/<name>.json`):** *tempo* sets scene-count + clip length; *personality* sets easing + plain-vs-busy; *visual identity* supplies palette/type. Confident/premium → slow, few scenes, PLAIN. Playful/energetic → fast cuts, many scenes, BUSY. Precise/technical → steady, structured, semi-plain.

*Sources: StudioBinder, Boords, Sinek (Golden Circle), AIDA/PAS/BAB copywriting canon, OpusClip/Cloudinary retention data, Tubik (negative space).*

*Companion machine-readable index: `docs/animation-db.json` (same data). Brand onboarding: `make brandkit URL=… NAME=…` → `themes/<name>.json` (colours pack) + `dna/<name>.json` (identity + storyboard).*
