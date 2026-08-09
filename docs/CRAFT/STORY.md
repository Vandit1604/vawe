---
when: deciding the beats and their order
answers: "the spine · beat-role→persuasion→feeling · named spines + timing · scene budget · product→beats"
group: story
---

# STORY — why these beats, in this order, doing what

The four other spines answer how a frame looks, fills, moves, and sounds. This one answers the
question that comes first: **what beats, in what order, and what each one is DOING to the viewer.**
A video with perfect type and motion still fails if the beats are in the wrong order or none of them
earns its time. This is the story-spine layer, and until now it lived stranded in the stale
`DESIGN-DATABASE.md` and half-said inside the planning skill. This is its home.

Its companions: [`TASTE-RULES.md`](TASTE-RULES.md) names the *feeling* a beat targets;
[`SELECTION.md`](SELECTION.md) turns a beat's intent into the transition/font/effect; [`SOUND.md`](SOUND.md)
says what it should sound like; [`DENSITY.md`](DENSITY.md) says how full the frame should be. STORY comes
first and hands off to all four.

---

## The prime rule

> **Never spoil the payoff. Pose the question in the first 3 seconds, answer it last.**

Every video is one open loop. The hook opens it; the best, most counterintuitive fact closes it at the
end. A beat that has no job in opening, sustaining, or closing that loop is not a beat, it is time
being spent. Cut it. (This is the value gate in `vawe-video-planning` and the required per-beat fields
in TASTE-RULES.)

---

## The spine every framework maps onto

**Hook → Build → Proof → Payoff → CTA.** Any named structure below is just a way to fill these five.

- **Hook** lands in the first 3s, front-loads the strong word, opens a loop. Never the best stat, tease it.
- **Build** carries one idea per beat. How-it-works is at most 3 steps, one per beat.
- **Proof** is a real artifact: a live UI capture, a true stat, a customer. Not a claim in a box.
- **Payoff** is the shocker, placed at **80–90% of runtime**. The climax holds the longest.
- **CTA** is the **shortest** scene (3–5s), one action, held on a still frame (never fade the payoff).

---

## Beat role → persuasion → feeling (the layering lookup)

This is the table the other docs point back to. Every beat in the lock sheet declares a **persuasion**
(the rhetorical move) and a **feeling** (the emotion arc) — TASTE-RULES makes those required fields.
This says which ones fit which role, so you pick a coherent chain instead of guessing per beat.

| Beat role | Persuasion move | Feeling arc | Hands off to |
|---|---|---|---|
| **Hook** | open loop · pattern interrupt · negative contrast | curiosity → tension | SELECTION: notice-the-cut · SOUND: silent or one cue |
| **Problem / tension** | pain agitation · status-quo cost | recognition → unease | TASTE: slow hold, `easeInOutSine` · DENSITY: lean |
| **Build / how** | inevitability · mechanism reveal | unease → understanding | SELECTION: hard cuts, one family · DENSITY: hero+support |
| **Proof / stats** | social proof · demonstration | doubt → belief | DENSITY: hero+support+metadata · SOUND: one `chime` on the number |
| **Feature (FAB)** | future pacing (feature→benefit) | interest → desire | SELECTION: `weightShift` emphasis |
| **Payoff / climax** | the shocker · negative contrast resolved | tension → payoff | SELECTION: the ONE sting/look · SOUND: the earned `success` |
| **CTA / close** | risk reversal · single next step | desire → decision | TASTE: held frame, `exitDur:0` · SOUND: silence |

Read a row left to right and you have a beat that persuades, feels, and cuts as one thing. A chain of
rows in spine order is a storyboard. If a beat can name neither a persuasion nor a feeling, it fails
the value gate.

---

## Choose a spine — named frameworks with beat timing (30s / 60s)

Pick by what the viewer already knows and how they should feel. Each maps onto Hook→…→CTA.

| Spine | Reach for it when | Beats (30s / 60s) |
|---|---|---|
| **PAS** (problem-aware) | the viewer feels the pain already | Problem 0–6/0–10 · Agitate 6–14/10–28 · Solution 14–26/28–52 · CTA 26–30/52–60 |
| **AIDA** (unaware launch) | a cold audience, a new category | Attention 0–2/0–3 · Interest 2–8/3–18 · Desire 8–25/18–52 · Action 25–30/52–60 |
| **Hook · Story · Offer** | a personal or founder voice | Hook 0–3 · Story 3–22/3–48 · Offer 22–30/48–60 |
| **Golden Circle** (why-first) | a premium or mission brand | Why 0–8/0–15 · How 8–20/15–40 · What+CTA 20–30/40–60 |
| **Before · After · Bridge** | a clear transformation | Before(hook) · After(payoff) · Bridge(product)+CTA |

**FAB** is a reusable proof block *inside* Build, not a whole spine: feature (~1.5s) → what it does
(~1.5s) → the benefit (~2s). Chain 2–4, cut any with weak differentiation.

The named **reference profiles** in [`SELECTION.md`](SELECTION.md) pair naturally with spines: `a24`
and `apple` suit Golden Circle (why-first, restraint); `nike` and `duolingo` suit AIDA/BAB
(attention-first, energetic); `linear`/`vercel` suit PAS (problem-aware, technical).

---

## Scene budget and the pacing arc

- **30s → 5–7 scenes** (~3–6s each) · **60s → 8–12 scenes** (~4–7s). A new beat every 5–7s.
- **Vary scene length.** Accelerate toward the climax, then **hold the climax a beat longer** than
  anything else. Uniform scene length is the story equivalent of the monotone-timing failure.
- **Value arc** as the pacing spine: dark → a light "how it works" break → dark climax. Value is the
  strongest variety lever (change ≥3 of layout/scale/value/bg/hue/motion between neighbours).
- **Pacing character:** calm → cascade → punchy. The hook and vision beats breathe; the payoff snaps.

Brand DNA (`dna/<name>.json`) sets the pacing: *tempo* → scene count and clip length; *personality* →
easing and plain-vs-busy; confident/premium → slow, few scenes; playful/energetic → fast, many scenes.

---

## Product material → beats (the mapping)

Turn what you have into where it goes:

- **tagline → hook** (front-load the strong word, open the loop)
- **the pain → problem beat**
- **how it works → build** (one step per beat, **max 3**)
- **features → FAB blocks** (2–4, cut low-differentiation ones)
- **the best stat → payoff** (save the shocker; put lesser stats earlier as proof)
- **the transformation → payoff**
- **the CTA → the end**, one action

If a piece of material maps to no beat, it does not go in the video. A launch film is not an inventory.

---

## Per-beat recipe (role → the rest of the stack)

The starting recipe for each role. These are defaults to depart from with intent, not a template —
the actual transition/density/sound come from the linked docs, chosen by the brand.

| Beat role | Background | Layout | Value | Motion character |
|---|---|---|---|---|
| Hook / cold-open | vibe texture (hook is allowed to be busy) | centred or left macro | dark | slow build, staggered word-rise |
| Name / brand reveal | brand glow | centred, logo + word | dark | mask reveal + one spring |
| Problem / tension | plain, spacious | centred statement | dark | slow, minimal, hold |
| How it works | plain (a light value break) | card flow + connectors | **light** | staggered card pops, lines draw |
| Proof / stats | plain (strip it bare) | full-bleed number | dark | count-up, rise-in |
| Emotional / vision | soft texture | centred serif | dark | very slow, grain-forward |
| CTA / close | brand glow | centred, logo + url | dark | logo settles, url last, then hold |

**Strip the payoff bare.** Decorate transitions and low-copy vibe beats (hook, CTA); a beat whose whole
job is to make one thing land stays plain. Negative space is the silent character (40–60% empty). This
is the same rule DENSITY states from the composition side: the exception for a lean beat is the
deliberate hook or end card.

---

## What this replaces

The narrative content formerly in `DESIGN-DATABASE.md` §9 and §15 lives here now; that file keeps only
the technique catalog (backgrounds, easing curves, microinteractions, focus treatments). If the two
ever disagree, STORY is the story authority and DESIGN-DATABASE is the technique authority.

*Sources: StudioBinder, Boords, Sinek (Golden Circle), the AIDA/PAS/BAB copywriting canon, retention
data (OpusClip/Cloudinary), Tubik on negative space.*
