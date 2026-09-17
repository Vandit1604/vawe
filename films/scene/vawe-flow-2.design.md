---
type:
  hook:
    family: Anybody
    size: 92
    weight: 700
  headline:
    family: Anybody
    size: 64
    weight: 700
  body:
    family: Anybody
    size: 38
    weight: 400
  caption:
    family: Anybody
    size: 28
    weight: 400
  meta:
    family: Inter
    size: 16
    weight: 400
  command:
    family: Inter
    size: 32
    weight: 500
  output:
    family: Inter
    size: 32
    weight: 400
  eyebrow:
    family: Inter
    size: 30
    weight: 400
  wordmark:
    family: Anybody
    size: 172
    weight: 800
radius:
  panel: 12
  frame: 34.56
  card: 22
  tile: 10
  badge: 50
  chip: 999
  dot: 4
  mark: 2
  studio-in: 8
  studio-pill: 6
shadow:
  glass: "rgba(0, 0, 0, 0.03) 0px 2px 2px 0px, rgba(0, 0, 0, 0.043) 0px 6px 5px 0px, rgba(0, 0, 0, 0.055) 0px 13px 10px 0px, rgba(0, 0, 0, 0.07) 0px 22px 18px 0px, rgba(0, 0, 0, 0.086) 0px 42px 34px 0px, rgba(0, 0, 0, 0.12) 0px 100px 80px 0px, rgba(255, 255, 255, 0.05) 0px 1px 0px 0px inset, rgba(15, 22, 32, 0.043) 0px 0px 0px 1px"
  glass-light: "rgba(0, 0, 0, 0.03) 0px 2px 2px 0px, rgba(0, 0, 0, 0.043) 0px 6px 5px 0px, rgba(0, 0, 0, 0.055) 0px 13px 10px 0px, rgba(0, 0, 0, 0.07) 0px 22px 18px 0px, rgba(0, 0, 0, 0.086) 0px 42px 34px 0px, rgba(0, 0, 0, 0.12) 0px 100px 80px 0px, rgba(255, 255, 255, 0.9) 0px 1px 0px 0px inset, rgba(15, 22, 32, 0.043) 0px 0px 0px 1px"
  card: "rgba(0, 0, 0, 0.03) 0px 2px 2px 0px, rgba(0, 0, 0, 0.043) 0px 6px 5px 0px, rgba(0, 0, 0, 0.055) 0px 13px 10px 0px, rgba(0, 0, 0, 0.07) 0px 22px 18px 0px, rgba(0, 0, 0, 0.086) 0px 42px 34px 0px, rgba(0, 0, 0, 0.12) 0px 100px 80px 0px"
  chip: "rgba(0, 0, 0, 0.04) 0px 1px 1px 0px, rgba(0, 0, 0, 0.06) 0px 2px 4px -2px"
  studio-panel: "rgba(255, 255, 255, 0.06) 0px 0px 0px 1px, rgba(0, 0, 0, 0.5) 0px 8px 24px -8px"
space: {}
surfaces: []
palette:
  panel-top: "#33404f"
  panel-line: "#26313f"
  prompt-path: "#8fc0ff"
  meta: "#7d8b9e"
  muted: "#aab6c6"
  success: "#5fd68c"
  branch: "#5fd68c"
  chip-text: "#1c1c1c"
  chip-label: "#52525a"
  chip-bg-purple: "#a67dff"
  chip-bg-orange: "#e0714f"
  chip-bg-pink: "#cf5b98"
  chip-bg-blue: "#3ea3ff"
  chip-bg-green: "#0eaf80"
  film-still-bg: "#161b22"
  timestamp: "rgba(255, 255, 255, 0.72)"
  studio-panel: "#212025"
  studio-lane: "#27262c"
  studio-line: "rgba(255, 255, 255, 0.07)"
  studio-accent: "#0a87ff"
  studio-ink-2: "#d8d8da"
  studio-ink-3: "#97969b"
  film-scrim: "linear-gradient(to top, rgba(10, 15, 25, 0.9) 0%, rgba(10, 15, 25, 0.9) 20%, rgba(10, 15, 25, 0) 52%)"
  film-caption-fg: "#ffffff"
---

This film's look: a Warp-style teal-black glass terminal on cobalt, a dark timeline wearing the studio's own editor tokens,
a dark card ring of film stills, and the vawe wordmark. Glass panels carry a deep six-layer shadow,
the terminal's edge lit by a faint white inset, the timeline's by a near-white one. Timeline chips are
small pills in five semantic colours with dark text and a thin drop shadow. The timeline beat is the
real studio: its ground, panel, lane track, hairline and accent are the measured tokens from
studio/ui/studio.css, declared above under studio-*, so the film shows the tool rather than a lookalike. New values needed by a
fragment go here first, named for what they are, never inlined.
