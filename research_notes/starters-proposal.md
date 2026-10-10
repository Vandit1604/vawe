# Page starters by film type: inventory and proposal

## What `bin/vawe new` writes today

Checked 2026-10-10 by running `bin/vawe new <tmp> --request "a 10 s launch film for an invented app" --defaults`.

- `films/<name>/page.html`: ONE generic starter for every type (`starterPage`, `harness/cli/new.mjs`). Meta tags, an
  unchosen palette, one bundled face, and `data-world` sections cut by length (`starterBeats`, `harness/lib/worlds.mjs`:
  one world every 2 s or so, every third world wordless). No kit, no motion, no sound.
- `brief.md`: built from the routed template `prompts/<t>.md` (`--from`, or chosen from `--request` and the length by
  `harness/lib/route.mjs`). The template gives the Questions, Spec tables and Pitfalls. The shared skeleton adds Taken from,
  Directions, Signature, Design system and kit, States, Board, Motion pass.
- `directions.html`: three starter stills (type, object, graphic).
- `assets/`: the starter face. `--ref` writes SPEC.md instead (reference rebuild).

So the type shapes the brief only. The page is the same for a sting, a brand launch and a UI morph.

## Which films we make

Templates named in `films/*/brief.md` (37 folders): 14 brand launch (`brand-launch-from-url.md`), 6 sting
(`beat-sheet.md`), 0 others. Also 1 `recreations/` folder (reference rebuild), 6 skill-combo test films,
the Loomline series (invented product launches, built from `beat-sheet.md`). Gold examples: `colour-sting`
(sting), `tracking-hud` (UI moves), `three-star` (3D). Types 3, 4, 5, 6, 7, 8 of `guides/ROUTING.md` have no film.

## Proposal: five starters, in this order

Each is a page.html skeleton chosen by the routed type, plus a prefilled Board skeleton in the brief. No kit art
is generated: the starter names the kit parts, the agent draws them.

| # | starter | covers | pre-builds |
|---|---|---|---|
| 1 | sting (5 to 10 s) | beat-sheet, Loomline | 3 worlds (setup, spectacle, tail), a spectacle meta at 60 to 70 percent, one hero element with `enter({anticipate})`, a moving tail element, 2 sound rows (action cue, spectacle cue). Moves: `calm-lockup`, `arrival-spring`, `exit-fast`. Board rows: one cut under 0.4 s, one over 0.9 s. |
| 2 | brand launch (20 to 40 s) | brand-launch-from-url | 5 worlds: hook, product proof, second proof, spectacle, CTA lockup; a `kit/` skeleton with ground, UI card, logo, cursor; capture slots in `assets/`; sound rows per proof. Moves: `card-assemble`, `caret-follow`, `camera-moves`, `chart-build`. RECIPES.md launch chain. |
| 3 | UI morph loop | ui-morph-loop | one element, N state sections on a beat grid, a loop seam check, `--beat-n` vars on a 8 to 12 beat grid. Moves: `clip-expand`, `anchor-cycle`. |
| 4 | explainer | story-explainer | worlds as claim, evidence, turn; a caption band reserved; a chart world. Moves: `chart-build`, `before-after-wipe`, `caption-editorial`. |
| 5 | music video | music-video-beat-synced | a `--beat-n` table filled from `vawe sound <track>`, each cut on a downbeat, one drop world. |

Reference rebuild already has its own path (`--ref`, SPEC.md). Long form, lab capture and showreel stay
brief-only until a film of that type exists.

## Order and cost

Build 1 and 2 first (20 of 20 films). Implement as `starterPage({ type })` choosing a template string next to the
type's prompt file, so one owner (`harness/cli/new.mjs`) keeps the choice. Read-load rises by the starter's words
(the `bench` read-load counts only the default starter), so keep each under 300 words.
