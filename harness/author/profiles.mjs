// harness/author/profiles.mjs: THE REFERENCE PROFILES, as data.
//
// engine-doctrine/CRAFT/SELECTION.md Part 2 says why they exist: "An adjective is vague; a brand is a spec." Name
// the one reference a video should feel like and every family is chosen at once, coherently. A scene
// opts in with a top-level `"profile": "apple"`.
//
// It lives in its own file because it had exactly ONE reader. The table sat inside
// harness/author/motion-director.mjs and was consumed on the next line, so nothing else in the repo
// could ask what a profile means, not the quiz that needs to offer them, not `vawe_capabilities`, not a
// catalog. A shared vocabulary with a single private reader is a table, not a vocabulary.
//
// THE DOC IS THE SOURCE FOR TASTE; this file is the machine-readable subset. SELECTION.md describes each
// profile as `{ face · pace · easing · cut family · sting policy · look policy · accent }` and the code
// carried only four of those seven. The rest are transcribed here, from that doc, so a consumer can
// reason about pace and accent without re-reading prose. Where the two ever disagree the doc wins and
// this file is the bug.
export const PROFILES = {
  linear: {
    cuts: ['none', 'blur'], stings: [], bounceOk: false, restraint: 'high',
    banCuts: ['whip', 'wipe', 'spin', 'cube', 'roll'], face: 'mono',
    pace: 'fast, snappy', easing: 'easeOutQuart', dominance: 'dark', accent: 'one cool (cobalt/indigo)',
    // `crt`/`matrixDecode` here are AMBIENT FIELDS (core/shaders-ambient.js), not composite looks.
    // SELECTION.md says "backdrop" and means it. `crt` happens to exist in both registries.
    look: 'none, or one crt/matrixDecode backdrop at low intensity',
    blurb: 'technical, dark, restrained. Dev tools. Restraint IS the personality',
    antiBlurb: 'dense terminal readouts and hard cuts, with almost no effects',
  },
  apple: {
    cuts: ['fade', 'riseBlur'], stings: ['lens'], bounceOk: false, restraint: 'high',
    banCuts: ['whip', 'wipe', 'punch', 'jitter'], face: 'sans',
    pace: 'slow and smooth, 0.5-0.9s', easing: 'easeOutCubic', dominance: 'light or deep black',
    accent: 'one, often none', look: 'almost absent. A single lens/chrome glamour moment',
    blurb: 'premium, calm, generous. A product launch. Dissolves, never whips',
    antiBlurb: 'slow, reverent, held frames with huge whitespace',
  },
  stripe: {
    cuts: ['blur', 'fade'], stings: ['dissolve'], bounceOk: false, restraint: 'med',
    banCuts: ['whip', 'jitter'], face: 'sans',
    pace: 'smooth, confident', easing: 'easeOutCubic', dominance: 'light',
    accent: 'gradient (cobalt to violet)', look: 'a soft flow/aurora field behind',
    blurb: 'clean-tech, warm-serious. A developer brand. Trust plus a little warmth',
    antiBlurb: 'soft gradient fields and humanist type, warm but serious',
  },
  nike: {
    cuts: ['whip', 'punch'], stings: ['flash', 'streak'], bounceOk: 'accent', restraint: 'low',
    banCuts: [], face: 'sans',
    pace: 'punchy, nothing sits still', easing: 'easeOutExpo', dominance: 'bold full-bleed',
    accent: 'one loud, on black or white', look: 'motion blur ON, kinetic type is the star',
    blurb: 'energetic, kinetic, high-contrast. A sports ad. Motion drives everything',
    antiBlurb: 'loud, fast, high-contrast, with the type doing the shouting',
  },
  a24: {
    cuts: ['fade', 'letterbox'], stings: ['ink', 'leak'], bounceOk: false, restraint: 'high',
    banCuts: ['whip', 'wipe', 'spin'], banMotion: ['pop'], face: 'serif',
    pace: 'slow, deliberate, long holds', easing: 'easeOutExpo', dominance: 'dark, letterboxed',
    accent: 'one muted', look: 'grain throughout, one vortex at the turn',
    blurb: 'dramatic, editorial, tense. A film trailer. Silence and stillness are the tension',
    antiBlurb: 'moody, letterboxed, grainy film-trailer tension',
  },
  bloomberg: {
    cuts: ['collapse', 'punch'], stings: ['scan'], bounceOk: false, restraint: 'med',
    banCuts: ['whip', 'wipe', 'spin'], face: 'mono',
    pace: 'fast, mechanical, steps-like', easing: 'easeInOutQuart', dominance: 'light, information-dense',
    accent: 'one functional (amber/green for up/down)',
    look: 'minimal, counters and charts ARE the content',
    blurb: 'dense, mechanical, functional. Data and finance. The count easing IS the story',
    antiBlurb: 'dense charts and counters, mechanical and information-first',
  },
  duolingo: {
    cuts: ['wipe', 'iris'], stings: ['confetti', 'sdfIris'], bounceOk: true, restraint: 'low',
    banCuts: [], face: 'sans',
    pace: 'bouncy, overshoot everywhere', easing: 'easeOutBack', dominance: 'light, saturated, rounded',
    accent: 'several bright ones allowed', look: 'confetti on wins',
    blurb: 'playful, bright, rounded. A consumer app. THE one profile where bounce is correct',
    antiBlurb: 'bouncy, confetti, consumer-app cheer',
  },
  vercel: {
    cuts: ['none'], stings: ['glitch', 'chromaticSplit'], bounceOk: false, restraint: 'high',
    banCuts: ['whip', 'wipe', 'spin', 'cube', 'roll'], banMotion: ['bounce'], face: 'sans',
    pace: 'snappy but spare', easing: 'easeOutQuart', dominance: 'pure black',
    accent: 'one white, one accent', look: 'none, no backdrop, maximum contrast',
    blurb: 'keynote restraint, black, sharp. A developer keynote. Maximum restraint',
    antiBlurb: 'pure black, hard cuts only, one dramatic glitch and nothing else',
  },
};

// `banCuts` holds CUT STYLES (core/cuts.js PRESENTATIONS); `banMotion` holds per-layer entrance names.
// An `anim` (core/clips.js) or a kinetic `preset` (core/type.js). They were one list, and the checker
// only ever compared it against a cut, so a24's ban on `pop` (an anim) and vercel's ban on `bounce` (a
// preset) could not fire: two profile rules that read as enforced and never ran once. Two lists, because
// the two vocabularies are disjoint and a single list cannot say which one it means.
export const PROFILE_NAMES = Object.keys(PROFILES);
