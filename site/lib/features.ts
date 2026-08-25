export type Feature = {
  slug: string;
  kicker: string;
  title: string;
  tagline: string;
  demo: string | null;
  poster: string | null;
  aspectTrio?: boolean;
  body: string[];
  code?: string;
  codeLabel?: string;
  tag: string;
  docs: string;
};

const GH = "https://github.com/Vandit1604/vawe";

export const FEATURES: Feature[] = [
  {
    slug: "determinism",
    kicker: "01 / determinism",
    title: "Same JSON, same bytes.",
    tagline: "renderFrame(n) is a pure function of the frame number.",
    demo: "/assets/hero.mp4",
    poster: "/assets/hero.jpg",
    body: [
      "A virtual clock coerces Date, requestAnimationFrame, and Math.random to frame-time, so there is no wall-clock and no un-seeded randomness. The same scene renders byte-identical frames regardless of order.",
      "That is what lets frames shard across parallel browser tabs, and what makes every video reproducible and diff-able. It is guarded by `make probe`, which renders sampled frames in scrambled order and diffs the DOM.",
    ],
    code: `<span class="a">renderFrame</span><span class="p">(</span><span class="k">n</span><span class="p">)</span>  <span class="s">// pure in n</span>
<span class="p">→</span> same bytes, any order
<span class="p">→</span> <span class="a">make probe</span>  <span class="s">// verifies it</span>`,
    codeLabel: "purity",
    tag: "guarded by make probe",
    docs: `${GH}#determinism`,
  },
  {
    slug: "blocks",
    kicker: "02 / blocks",
    title: "185 components, theme-aware.",
    tagline: "A vetted library you drop into a scene.",
    demo: "/assets/showcase/data.mp4",
    poster: "/assets/showcase/data.jpg",
    body: [
      "Charts, cards, code, terminals, KPIs, browser frames, tweets, chat bubbles. 185 blocks across 97 families, each deterministic and reskinnable to any brand via CSS variables and a color ramp.",
      "Browse the full registry on the blocks page. In a scene you reference one by name and `make expand` inlines it into real layers.",
    ],
    tag: "97 families · make catalog",
    docs: "/blocks",
  },
  {
    slug: "kinetic-type",
    kicker: "03 / kinetic type",
    title: "Type that moves like it reads.",
    tagline: "The motion is part of the meaning.",
    demo: "/assets/showcase/type.mp4",
    poster: "/assets/showcase/type.jpg",
    body: [
      "Split a headline by word or character; each unit enters on its own preset, staggered in reading order. Rise, decode, gradient, focus, riseClip, and more. The hero element moves last or largest.",
      "Text enters L to R, top to bottom, rises from its own baseline, and settles before it exits. No sub-pixel drift.",
    ],
    tag: "preset: up · decode · gradient",
    docs: `${GH}/blob/main/docs/MOTION-CRAFT.md`,
  },
  {
    slug: "cuts",
    kicker: "04 / transitions",
    title: "Cuts with intent.",
    tagline: "One cut family per film, chosen by the director.",
    demo: "/assets/showcase/cuts.mp4",
    poster: "/assets/showcase/cuts.jpg",
    body: [
      "Whip, punch, spin, zoom, blinds, riseBlur. The motion director picks cuts per transition from the brand's motion personality, covering a hard background jump with a sting, whipping only when the background does not change.",
      "Every cut is covered by a whoosh from the sound library, placed deterministically.",
    ],
    tag: "cut: whip · punch · spin · zoom",
    docs: `${GH}/blob/main/docs/MOTION-CRAFT.md`,
  },
  {
    slug: "shader-stings",
    kicker: "05 / shader stings",
    title: "GPU stings between beats.",
    tagline: "Real fragment shaders, seek-safe and reproducible.",
    demo: "/assets/showcase/stings.mp4",
    poster: "/assets/showcase/stings.jpg",
    body: [
      "Flash, glitch, scan, ripple, burn, pixel, warp. Keyed on (progress, seed) only, so they are pure in the frame and byte-reproducible, and they draw only during their sting window.",
      "Reach for a sting to cover a background jump at an act break, or a flash to punctuate a reveal.",
    ],
    tag: "sting: flash · glitch · scan · ripple",
    docs: `${GH}/blob/main/docs/MOTION-CRAFT.md`,
  },
  {
    slug: "sound-design",
    kicker: "06 / sound design",
    title: "Scored automatically.",
    tagline: "Cues derived from the scene's own cuts and stings.",
    demo: "/assets/showcase/ui.mp4",
    poster: "/assets/showcase/ui.jpg",
    body: [
      "A PCM mixer places named sound effects at cue times derived deterministically from the JSON: every cut becomes a whoosh, every sting a reveal, mixed with music and a soft limiter.",
      "The reusable library is curated from Mixkit (free license) and fetched with `make sfx`. Unmute the clip to hear it.",
    ],
    tag: "make sfx · cuts→whoosh · stings→reveal",
    docs: `${GH}#sound`,
  },
  {
    slug: "multi-aspect",
    kicker: "07 / any aspect",
    title: "One scene, every ratio you compose for.",
    tagline: "Relative coordinates resolve per aspect.",
    demo: null,
    poster: null,
    aspectTrio: true,
    body: [
      "Pin keywords, a 12-column grid, and optical centering resolve to pixels per canvas, deterministically. The same source renders 16:9, 9:16, 1:1, and 4:5 in a single pass.",
      "The condition is real: absolute x and w are pixels tuned to one canvas, so a hand-placed scene is composed for the ratio you placed it at, not for four. Compose in relative coordinates and the ratio becomes a flag rather than a rewrite.",
      "make audit ASPECT=all checks every canvas you intend to ship, because a scene renders fine at its own ratio and can be wrong at all the others.",
    ],
    tag: "--aspect 16:9,9:16,1:1",
    docs: `${GH}#any-aspect`,
  },
  {
    slug: "taste-gates",
    kicker: "08 / taste gates",
    title: "A gate ladder to great.",
    tagline: "Static engines make correct-but-generic video. Vawe fights that.",
    demo: null,
    poster: null,
    body: [
      "Before a video ships it climbs a ladder: validate (schema + no em-dash), critique (does every beat earn its time), designspec (locks the palette and fonts to the theme), audit (contrast, overlap, safe-zone), and judge, a vision gate that sees the rendered frames and scores composition and brand fidelity.",
      "Paired with per-brand house style and a 155-block library, it keeps output on-brand and specific.",
    ],
    code: `<span class="a">make validate</span>     <span class="s">// schema, no em-dash</span>
<span class="a">make critique</span>     <span class="s">// value of each beat</span>
<span class="a">make designspec-check</span> <span class="s">// palette + font lock</span>
<span class="a">make audit</span>        <span class="s">// contrast · overlap</span>
<span class="a">make judge</span>        <span class="s">// vision gate</span>`,
    codeLabel: "the ladder",
    tag: "validate → judge",
    docs: `${GH}/blob/main/docs/JUDGE.md`,
  },
];

export const bySlug = (slug: string) => FEATURES.find((f) => f.slug === slug);
