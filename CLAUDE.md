# CLAUDE.md — authoring videos for this engine

This repo turns **one self-describing JSON → one rendered Short** (1080×1920, 30fps, mp4).
Your job when asked to "make a video about X" is to **write a data JSON** for the right format,
then render it. You do **not** edit the format HTML/CSS or the Go renderer unless explicitly asked.

## The loop

```bash
make list                              # the 5 formats + where each schema/sample lives
./bin/shortwave path/to/video.json        # module read from JSON → engine/out/<name>.mp4
make video D=path/to/video.json        # same, via make   (add --draft to bin/shortwave for fast no-grain)
```

Every JSON **must** start with `"module": "<format>"` — that picks which format renders it.
Save new videos as `formats/<format>/<topic>.json` (siblings of `sample.json`). Always read the
format's `sample.json` first as a working reference, then adapt.

## Content philosophy (what makes these good — follow it)

Every format is built on **hook → suspense → payoff**. The data must earn attention:

- **Never spoil the payoff.** The hook poses a question / open loop; the answer lands at the end.
- **Build to a shocker.** Order items so the most counterintuitive, "no way" moment is last.
- **Be honest.** The on-screen copy must be delivered by the data. No clickbait the video can't pay off.
- **Stakes + a human line.** A surprising, specific fact beats a dry number (the quiz's `fact`, growth's `beats`).
- **Numbers:** use real, accurate figures. Big counts as absolute integers (`2500000000` → renders `2.5B`);
  or small numbers with a unit suffix (`unit: "$B"`, value `880` → `$880B`). The engine compacts ≥1e6.

## Hard rules

- First-frame `hook` ≤ ~12 words, front-load the strong word, ≤ 1 emoji.
- `fact` / `question` may contain `<b>…</b>` (rendered as HTML). Plain text elsewhere.
- Keep names short (they sit in cards/bars) — "Spider-Man", not "Spider-Man: No Way Home".

## Icons (real images first, emoji last)

**Always prefer a real image; reach for emoji only when no safe image exists.** An `icon` field accepts an
**image path** → rendered as `<img>`, or an **emoji** → rendered as text. Order of preference:

1. **Free/public-domain or openly-licensed images** — fetch these:
   - Flags (public domain): `curl -s "https://flagcdn.com/<iso2>.svg" -o engine/assets/flags/<iso2>.svg` → `/engine/assets/flags/<iso2>.svg`
   - Brand logos (simple-icons, free): `curl -s "https://cdn.simpleicons.org/<slug>/<hex>" -o engine/assets/icons/<slug>.svg` → `/engine/assets/icons/<slug>.svg`
   - CC-licensed photos: Wikimedia Commons / Openverse (check the license is CC0/CC-BY/PD before using).
2. **Generated cards** — a designed SVG (title + theme color) when no free image fits.
3. **Emoji** — last resort only. `barrace`/`countdown` also fall back to a colored monogram of the name.

**Never embed copyrighted material** into a video that gets published: movie/TV posters, album covers,
film stills, magazine/news photos, paid stock. They trigger YouTube Content ID claims and takedowns.
For those topics use option 2 (generated cards) or a topic that images cleanly, or the user's own licensed files.

Check what's already fetched: `ls engine/assets/flags engine/assets/icons`.

## The 5 formats

### higherlower — "Higher or Lower" quiz  ⭐ best-performing
Guess which is bigger. 5 rounds: coin-flip pairs (within ~15%) + **1–2 shock reversals as the peaks**,
shocker last. Each round has a difficulty `pct` (stake) and a `fact` (awe payoff).
```jsonc
{ "module": "higherlower",
  "hook": "Bet you can't score {n}/{n}",      // {n} → round count
  "hookSub": "Which app has more users?",
  "question": "Who has <b>MORE USERS?</b>",
  "cta": "Subscribe for more",
  "audio": { "music": "assets/music.wav", "musicGain": 0.4 },
  "rounds": [
    { "a": "YouTube", "iconA": "/engine/assets/icons/youtube.svg",
      "b": "WeChat",  "iconB": "/engine/assets/icons/wechat.svg",
      "valA": 2500000000, "valB": 1340000000, "unit": "users", "pct": 66,
      "fact": "YouTube reaches <b>2.5B</b> people every month" }
    /* …4 more, ending on the shocker… */ ] }
```

### compare — head-to-head battle
Two things across spec rows; running score; **winner revealed only at the end** (the surprise).
`overall`/`winner` = `"a"` or `"b"`. `verdict` is the payoff margin line. `icon` per side = logo/emoji.
```jsonc
{ "module": "compare", "hook": "One is 3× bigger", "hookSub": "most people guess wrong",
  "verdict": "worth 3× more 🤯", "cta": "Subscribe for more",
  "a": { "name": "Coca-Cola", "icon": "/engine/assets/icons/cocacola.svg" },
  "b": { "name": "Tesla", "icon": "/engine/assets/icons/tesla.svg" }, "overall": "b",
  "fields": [ { "label": "Market Cap", "valA": 260, "valB": 800, "unit": "$B", "winner": "b" } /* … */ ] }
```

### countdown — Top-N reveal
Reveals #N→#2, then a **"can you guess #1?" pause**, then the #1 slam. `items` ordered with **#1 first**.
Tease #1 in `teaseHook` without naming it. `value` drives the count-up; `icon` optional (else monogram).
```jsonc
{ "module": "countdown", "kicker": "TOP 10", "hook": "Stocks that turned $1k into $100k+",
  "teaseHook": "#1 isn't a tech stock 👀", "cta": "Subscribe for more", "unit": "×",
  "items": [ { "name": "Monster Beverage", "value": 1500 }, { "name": "Apple", "value": 1000 } /* …#1 first… */ ] }
```

### growth — "$X → today"
`startCash` invested in YEAR climbs to a slam. **Don't reveal the final number in the hook** — it's
withheld and earned. `beats` are emotional callouts at chart dips ("−58% · most gave up here").
`series` is the price history (date/value); `icon` = the ticker logo.
```jsonc
{ "module": "growth", "hook": "$1,000 in NVDA in 2015", "ticker": "NVDA",
  "icon": "/engine/assets/icons/nvidia.svg", "startCash": 1000, "startNote": "invested · Jan 2015",
  "cta": "Subscribe for more",
  "beats": [ { "atDate": "Jul 2022", "label": "−58% · most gave up here" } ],
  "series": [ { "date": "Jan 2015", "value": 0.5 }, { "date": "Jan 2024", "value": 49 } /* … */ ] }
```

### barrace — bar race over time
Vertical bars grow over `frames` (years); the **overtake / crown change is the payoff**. Tease "#1 today?"
without showing it. `items` define competitors (+ `color` hex, optional `icon`); each frame's `values`
array is **one number per item, in item order**.
```jsonc
{ "module": "barrace", "hook": "Big Oil ruled for 100 years", "hookSub": "then this happened 👇",
  "cta": "Subscribe for more", "unit": "$B",
  "items": [ { "name": "Apple", "color": "#3fd07a", "icon": "/engine/assets/icons/apple.svg" },
             { "name": "ExxonMobil", "color": "#ff9f43" } ],
  "frames": [ { "label": "1990", "values": [5, 280] }, { "label": "2024", "values": [3500, 480] } ] }
```

## Optional: generate hook/title copy first

A static (no-AI) template library proposes hooks/titles you can pick from:
```bash
node scripts/hooks.mjs --data formats/higherlower/apps.json --slot hook   # prints ranked variants
node scripts/hooks.mjs --data … --slot hook --apply 5                     # writes choice into data.hook
```
Titles/descriptions/comments go to `engine/out/<name>.meta.json` (no publishing layer exists yet).

## After writing a JSON

1. **Images:** `make assets D=formats/<format>/<topic>.json` fills any missing icons
   (country→flag, brand→logo, else a generated topic card). Dry-run; add `WRITE=1` to apply.
2. Render it: `make video D=formats/<format>/<topic>.json`.
3. **Layout audit:** `make audit M=<format>` — catches overlap / clipped text / things too close
   (overlays → `/tmp/audit/<format>.png`). Fix with the spacing tokens, re-run.
4. **Check frames** before declaring done: `make look M=<format>` / `make frame M=<format> N=<n>`
   (or `make verify`). Eyeball the hook, a reveal, and the end screen.
5. Fix the data and re-render — never silently ship an unverified video.

> **Editing a `scene.html`?** Read the `shortwave-scene-authoring` skill first (render-frame purity,
> tokens, motion primitives, image system, QA loop). System map: `docs/CODEMAPS/ARCHITECTURE.md`.
> Run `make probe` after scene-logic changes and `make review` for a fast health snapshot.
