// scripts/lib/designspec-rules.mjs: OUR anti-slop rules. A table we own, not a list we borrow.
//
// WHY THIS EXISTS. `make slop` shells out to the vendored impeccable detector (41 rules, Apache-2.0,
// `skills/impeccable/`). It is good work and it is not ours, in three ways that cost us:
//
//   1. WE CANNOT FIX IT. The browser path injects `detect-antipatterns-browser.js`, a 4,920-line
//      GENERATED bundle whose build script is not vendored. It cannot be regenerated here. When the
//      detector reported 21 false low-contrast findings on the first fragment it was ever shown
//      (docs/MISTAKES.md #338), the only repair was to hand-edit the generated file, and a skill
//      update silently reverts it.
//   2. ITS THRESHOLDS WERE FITTED TO SOMEBODY ELSE'S PAGES. They are calibrated for React landing
//      pages. A 13-second film carries about eight lines of copy, so a rule that needs three
//      occurrences before it speaks will never speak here, no matter how true it is.
//   3. ITS TASTE DATA CONTRADICTS OURS. It bans 17 "overused" fonts globally. This repo asks the
//      better question already, in `designspec-check`: is the face the one `themes/<name>.json`
//      DECLARES? A brand that owns Inter is not committing slop by using Inter.
//
// SO: fork the rules and the data, never the engine. The measurements below are ours, the thresholds
// are fitted to films and fragments, and every rule carries the two samples that prove it works.
//
// EVERY RULE DECLARES `fires` AND `clean`. A rule that cannot demonstrate its own failure is a rule
// nobody can trust, and that is not theoretical here: the detector we are replacing shipped a rule
// whose catalogue entry says "more than two em-dashes" over an implementation that requires five.
// `make designspec-check SELFTEST=1` runs both samples through every rule.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onScreenText as plain } from './text.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Every face's DECLARED weight axis, read from the one place that registers them.
 *
 *  WHY THIS IS SOURCED AND NOT A LIST. `core/tokens.css` is where a face is paid for: the `@font-face`
 *  `font-weight` descriptor says what the loaded file can actually draw. A hand-copied table would go
 *  stale the first time somebody swaps a static face for a variable one, and the rule below would then
 *  be measuring a font nobody has. The same argument BUZZ_PHRASES makes for owning its data, except the
 *  authority for this data already exists in the repo, so it is read rather than restated.
 *
 *  A face registered twice (Space Grotesk ships as two static files) is merged into the span it covers.
 *  On any read failure the map is empty and the rule below goes quiet, which is the correct failure
 *  direction for a warning: it can never invent a finding out of missing evidence. */
function loadFaceWeightAxes() {
  const out = new Map();
  let css;
  try { css = fs.readFileSync(path.join(REPO, 'core/tokens.css'), 'utf8'); } catch { return out; }
  for (const block of css.match(/@font-face\s*\{[^}]*\}/g) || []) {
    const fam = /font-family:\s*['"]([^'"]+)['"]/.exec(block);
    const wt = /font-weight:\s*(\d{3})(?:\s+(\d{3}))?/.exec(block);
    if (!fam || !wt) continue;
    const lo = +wt[1], hi = wt[2] ? +wt[2] : +wt[1];
    const prev = out.get(fam[1]);
    out.set(fam[1], prev ? [Math.min(prev[0], lo), Math.max(prev[1], hi)] : [lo, hi]);
  }
  return out;
}
export const FACE_WEIGHT_AXES = loadFaceWeightAxes();

/** theme name → its primary sans, from `themes/<name>.json`. Same sourcing argument as above: the
 *  theme file is the lock `designspec-check` already enforces the face against, so the rule and the
 *  lock cannot disagree about which face a scene is set in. */
function loadThemeSans() {
  const out = new Map();
  let files;
  try { files = fs.readdirSync(path.join(REPO, 'themes')); } catch { return out; }
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const t = JSON.parse(fs.readFileSync(path.join(REPO, 'themes', f), 'utf8'));
      if (t && t.type && typeof t.type.sans === 'string') out.set(f.slice(0, -5), t.type.sans);
    } catch { /* a theme that will not parse is designspec-check's finding to report, not this rule's */ }
  }
  return out;
}
export const THEME_SANS = loadThemeSans();

/** A phrase list is an opinion, so it is DATA and it sits where it can be argued with.
 *  These are PHRASES. `copy-check.mjs` already carries 43 single WORDS (`seamless`, `leverage`,
 *  `unlock`), and a word list cannot see "trusted by leading" or "built for the modern". The two are
 *  complementary and deliberately not merged: one flags a word, the other flags a construction. */
export const BUZZ_PHRASES = [
  'streamline your', 'empower your', 'supercharge your', 'unleash your', 'unleash the power',
  'leverage the power', 'harness the power', 'built for the modern', 'trusted by leading',
  'trusted by the world', 'best-in-class', 'industry-leading', 'world-class', 'enterprise-grade',
  'next-generation', 'cutting-edge', 'transform your business', 'mission-critical', 'best of breed',
  'future-proof', 'seamless experience', 'seamlessly integrate', 'drive engagement', 'drive growth',
  'drive results',
];

// A section marker must stand ALONE. `\b` is not enough: in `2026-03-01` the `01` sits between a hyphen
// and a comma, both word boundaries, so every ISO date reads as an `01 / 02 / 03` scaffold. Times
// (`12:05`), versions (`v1.02.3`) and decimals do too. Kept from the source we are replacing, because
// it is right and the reasoning is worth carrying over rather than rediscovering.
const MARKER = /(?<![\w\-/:.])(0[1-9]|1[0-2])(?![\w\-/:.])/g;

// "Not a feature. A platform.". A claim manufactured out of a contrast rather than out of a fact.
// The `n` is deliberately either case. The version this came from required a capital, so it saw
// "Not a template. A canvas." and missed "This is not a template. A canvas.", which is the same line
// with a run-up. The two-beat shape is what makes it a tell, never where the sentence happens to start:
// a bare "not a bug" in running prose cannot match, because a short capitalised sentence must follow.
const NOT_A = /\b[Nn]ot an? [a-z][^.!?]{1,40}[.!]\s*[A-Z][^.!?]{1,60}[.!]/g;
const REBUTTAL = /\b[A-Z][^.!?]{4,80}[.!]\s*(No|Just|Not)\s+[a-z][^.!?]{2,60}[.!]/g;

const hits = (re, s) => { re.lastIndex = 0; const out = []; let m; while ((m = re.exec(s)) !== null) out.push(m); return out; };

export const RULES = [
  {
    id: 'buzzword-phrase',
    category: 'copy',
    scope: 'unit',
    severity: 'warn',
    needs: 'text',
    why: 'A stock phrase is what someone writes when they have nothing specific to say. The film has '
      + 'seconds; spend them on the true, particular thing.',
    test(text) {
      const lower = text.toLowerCase();
      const found = BUZZ_PHRASES.filter((p) => lower.includes(p));
      return found.length ? `${found.length} stock phrase(s): "${found.join('", "')}"` : null;
    },
    fires: 'Enterprise-grade rendering, built for the modern team.',
    clean: 'Every frame is a pure function of its number.',
  },
  {
    id: 'numbered-section-markers',
    category: 'copy',
    scope: 'document',
    severity: 'warn',
    needs: 'text',
    // Only reachable since the fragments moved into files (docs/MISTAKES.md #339 and the extraction
    // beside it). While the markup was escaped inside the scene JSON there was nothing to read.
    why: 'Numbers earn their place when the content IS a sequence and the order carries information. '
      + '01 / 02 / 03 over three unrelated sections is scaffolding by reflex.',
    test(text) {
      const seen = [...new Set(hits(MARKER, text).map((m) => m[1]))].sort();
      if (seen.length < 3) return null;
      let run = 0;
      for (let i = 1; i < seen.length; i++) if (+seen[i] === +seen[i - 1] + 1) run++;
      return run >= 2 ? `sequence ${seen.slice(0, 6).join(' · ')}` : null;
    },
    fires: '01 Capture · 02 Compose · 03 Render, the three steps.',
    clean: 'Shot on 2026-03-01, exported at 12:05, engine v1.02.3.',
  },
  {
    id: 'aphoristic-cadence',
    category: 'copy',
    scope: 'unit',
    severity: 'warn',
    needs: 'text',
    // THE THRESHOLD IS THE WHOLE POINT, and it is where we part company with the rule we took this
    // from. That one waits for THREE constructions, which is right for a landing page and useless for
    // a film: eight lines of copy will never reach three. Here ONE is the signal, because in a film
    // this shape lands on the last beat and IS the ending. `showcase-flight-globe` closes on "Every
    // vertex computed. Not one drawn.". This rule fires on it, correctly, and the film keeps the line
    // with a waiver. That is the intended outcome: the gate makes the author decide, not comply.
    why: 'Manufactured contrast reads as profundity and carries no fact. If the line is true and '
      + 'specific, keep it and waive; if it only sounds good, it is filler in the payoff slot.',
    test(text) {
      const m = [...hits(NOT_A, text), ...hits(REBUTTAL, text)];
      return m.length ? `${m.length} construction(s): "${m[0][0].trim().slice(0, 70)}"` : null;
    },
    fires: 'Every vertex computed. Not one drawn.',
    clean: 'The route draws in six seconds and the aircraft rides the same parameter.',
  },
  {
    id: 'gradient-text-overuse',
    category: 'colour',
    scope: 'scene',
    severity: 'warn',
    needs: 'scene',
    // THE COLOUR FAMILY WAS ALMOST ENTIRELY ALREADY OURS, and better. Four of the five rules we went
    // to port were dropped after measuring what this repo has:
    //   low-contrast    → verify/audit.mjs already computes WCAG contrast on the RENDERED scene, walks
    //                     for the effective background, and samples the bg canvas underneath. It also
    //                     parses `color(srgb …)`, which is what Chromium returns for every color-mix()
    //                     this library uses. Strictly more than a detector reading one element's style.
    //   ai-color-palette → designspec-check asks the better question: distance from the theme's own
    //                     palette, not membership of a global "purple is 260–310°" hue band.
    //   cream-palette   → same answer. Our backdrops come from the theme.
    //   gray-on-color   → a subset of the contrast audit above, on the cases where it matters.
    //
    // Which leaves gradient text, and the port INVERTS there. Upstream calls it "decorative, never
    // meaningful" and bans it. Here it is a first-party effect: `core/type.js:122` implements a
    // gradient sweep and its own comment sets the dose, "ONE hero word per film". A rule that banned
    // it would ban a capability we built. So this counts instead, and the engine's comment IS the
    // threshold. Only we could know that, which is the whole argument for owning the table.
    why: 'A gradient sweep reads as the hero moment because it is rare. Two of them in one film is two '
      + 'ordinary words. core/type.js sets the dose at one, and that is the number.',
    test(scene) {
      const found = [];
      const walk = (a) => { for (const l of Array.isArray(a) ? a : []) {
        if (!l || typeof l !== 'object') continue;
        if (l.preset === 'gradient' || l.anim === 'gradient') found.push(plain(l.text || '').slice(0, 24) || l.id || l.type || '?');
        if (l.children) walk(l.children);
      } };
      walk(scene && scene.layers);
      return found.length > 1 ? `${found.length} gradient-swept unit(s): ${found.join(' · ')}` : null;
    },
    fires: { layers: [{ type: 'text', text: 'Compose', preset: 'gradient' }, { type: 'text', text: 'Render', preset: 'gradient' }] },
    clean: { layers: [{ type: 'text', text: 'Compose', preset: 'gradient' }, { type: 'text', text: 'Render', preset: 'up' }] },
  },
  {
    id: 'flat-type-hierarchy',
    category: 'type',
    scope: 'scene',
    severity: 'warn',
    needs: 'scene',
    // THE TYPOGRAPHY FAMILY, TRIAGED. Seven of the ten rules we looked at are dropped, and each drop is
    // a measurement of what this repo already does better:
    //   overused-font  → designspec-check asks whether the face is a ROLE the theme declares. A global
    //                    list of 17 "overused" faces cannot know that a brand owns one of them.
    //   tiny-text      → verify/audit.mjs:389 already has a floor, and it is FRAME-RELATIVE (1.3% of
    //                    frame height) rather than a fixed 12px, so it scales with the canvas. It is
    //                    what caught a 17px footer on the flight film.
    //   wide-tracking  → would fire on nearly every film here and be wrong every time. Our labels are
    //                    deliberately tracked out ("NEW YORK" at 0.16em); that is the house style, not
    //                    a defect. A rule that flags the design we chose teaches people to ignore it.
    //   tight-leading  → same argument, on display type.
    //   single-font · italic-serif-display · oversized-h1 → the first two are theme questions
    //                    designspec-check already owns; the third overlaps copy-check's hook length.
    //
    // What is left is scale contrast, which nothing here measured and CLAUDE.md names directly: "one
    // huge hero + tiny caption". Threshold fitted to the library rather than taken: the ratio between
    // the largest and smallest text on a scene is 1.13 at the worst, then 1.37, then 1.56. 1.25 sits in
    // the real gap, so it separates the one flat scene from the ones that are merely close.
    why: 'Sizes within a quarter of each other read as one undifferentiated block, so nothing is the '
      + 'subject. Scale contrast is what makes a frame legible in the second it gets.',
    test(scene) {
      const sizes = [];
      const walk = (a) => { for (const l of Array.isArray(a) ? a : []) {
        if (!l || typeof l !== 'object') continue;
        if (l.type === 'text' && typeof l.text === 'string' && plain(l.text).trim() && l.size) sizes.push(l.size);
        if (l.children) walk(l.children);
      } };
      walk(scene && scene.layers);
      // Two text layers are a title and a caption, not a hierarchy to judge.
      if (sizes.length < 3) return null;
      const u = [...new Set(sizes)].sort((a, b) => b - a);
      if (u.length < 2) return null;
      const ratio = u[0] / u[u.length - 1];
      return ratio < 1.25 ? `${u[0]}px to ${u[u.length - 1]}px is a ${ratio.toFixed(2)}x range over ${sizes.length} text layers` : null;
    },
    fires: { layers: [{ type: 'text', text: 'a', size: 100 }, { type: 'text', text: 'b', size: 95 }, { type: 'text', text: 'c', size: 90 }] },
    clean: { layers: [{ type: 'text', text: 'a', size: 120 }, { type: 'text', text: 'b', size: 96 }, { type: 'text', text: 'c', size: 24 }] },
  },
  {
    id: 'extreme-negative-tracking',
    category: 'type',
    scope: 'scene',
    severity: 'warn',
    needs: 'scene',
    // The library's tightest declared tracking is exactly -0.04em, so the floor sits just beyond it:
    // fitted to what we ship, not to a number somebody else picked. `ls` is a documented synonym for
    // `tracking` (docs/MISTAKES.md), so both are read. Reading one and not the other is how a prop
    // goes silently unchecked here.
    why: 'Past about -0.04em the letters touch and the word stops being read, it is recognised. That is '
      + 'a logo technique, and it is wrong for anything a viewer has to actually read.',
    test(scene) {
      const bad = [];
      const walk = (a) => { for (const l of Array.isArray(a) ? a : []) {
        if (!l || typeof l !== 'object') continue;
        const raw = l.tracking ?? l.ls;
        if (raw != null) {
          const s = String(raw);
          let em = null;
          if (/em$/.test(s)) em = parseFloat(s);
          else if (/px$/.test(s) && l.size) em = parseFloat(s) / l.size;   // px is relative to THIS layer's size
          if (em != null && em < -0.04) bad.push(`${plain(l.text || '').slice(0, 20) || l.id || l.type} at ${s}`);
        }
        if (l.children) walk(l.children);
      } };
      walk(scene && scene.layers);
      return bad.length ? `${bad.length} layer(s) past the -0.04em floor: ${bad.join(' · ')}` : null;
    },
    fires: { layers: [{ type: 'text', text: 'Crushed', size: 100, tracking: '-0.06em' }] },
    clean: { layers: [{ type: 'text', text: 'Tight', size: 100, tracking: '-0.04em' }, { type: 'text', text: 'Px', size: 100, ls: '-4px' }] },
  },
  {
    id: 'unused-weight-range',
    category: 'type',
    scope: 'scene',
    severity: 'warn',
    needs: 'scene',
    // MEASURED BEFORE WRITTEN. Across the 154 scene files here, 137 declare a `weight` at all and the
    // whole library sits inside 400-800: not one declaration at or below 300, not one at or above 900,
    // and the widest spread any single scene reaches is 400. Meanwhile eleven faces in core/tokens.css
    // register a full `100 900` axis. The light and the black ends are downloaded on every render and
    // never drawn. That is the lazy default named exactly, and nothing here measured it.
    //
    // TWO SHAPES WERE AVAILABLE AND THIS ONE IS THE SPREAD. "Never leaves the 400-800 band" was the
    // other, and it is the wrong question: it would clear a scene that used 400 and 420 on the grounds
    // that 400 is a band edge, and it would fire on a scene deliberately built out of 350 and 850. What
    // a viewer reads in the second a frame gets is the DIFFERENCE between two weights on screen, so the
    // difference is what gets measured.
    //
    // THE THRESHOLD IS THE FACE'S OWN AXIS, not a number. A scene is asked to use a quarter of the range
    // its face ships; below that the type is one voice at slightly different volumes. Deriving it from
    // the axis is also the only honest way to keep it off a face that has no light or black end: the
    // gate below exempts any face registering under 600 of range, so Geist (400 800), Plus Jakarta Sans
    // (400 800) and Archivo (300 700) can never be flagged for weights they cannot draw. On the library
    // this fires on 21 of 137, which is a rate an author can act on rather than learn to skip past.
    //
    // DECLARED weights only. core/layers/util.js:76 defaults an undeclared layer to 800 (400 for serif),
    // and reproducing that defaulting rule here would be a second copy of it, going stale invisibly. The
    // subject is the type system the author wrote down, so three declarations is the floor for having
    // one at all. The same reasoning `flat-type-hierarchy` uses for sizes.
    why: 'Weight contrast has to survive motion, and a frame is on screen for about a second. One step '
      + 'apart on the 400/500/600/700/800 ladder is not a hierarchy, it is the same voice twice. The '
      + 'light and black ends of the face are already loaded and paid for.',
    test(scene) {
      const face = THEME_SANS.get(scene && scene.theme);
      const axis = face && FACE_WEIGHT_AXES.get(face);
      if (!axis) return null;
      const span = axis[1] - axis[0];
      // A face that ships no light or black end cannot be accused of ignoring one.
      if (span < 600) return null;
      const w = [];
      // `parts` as well as `children`: a kinetic beat sets its weights on the parts, and a walk that
      // reads one and not the other checks half a scene while looking complete.
      const walk = (a) => { for (const l of Array.isArray(a) ? a : []) {
        if (!l || typeof l !== 'object') continue;
        if (Number.isFinite(+l.weight)) w.push(+l.weight);
        if (l.children) walk(l.children);
        if (l.parts) walk(l.parts);
      } };
      walk(scene && scene.layers);
      if (w.length < 3) return null;
      const lo = Math.min(...w), hi = Math.max(...w), spread = hi - lo;
      const need = span / 4;
      if (spread >= need) return null;
      return `${w.length} declared weights span ${lo} to ${hi} (${spread}) on ${face}, which ships ${axis[0]} to ${axis[1]}`;
    },
    fires: { theme: 'vawe', layers: [{ type: 'text', text: 'a', weight: 700 }, { type: 'text', text: 'b', weight: 700 }, { type: 'text', text: 'c', weight: 800 }] },
    clean: { theme: 'vawe', layers: [{ type: 'text', text: 'a', weight: 200 }, { type: 'text', text: 'b', weight: 500 }, { type: 'text', text: 'c', weight: 900 }] },
  },
];

/** Run every rule over a scene's text UNITS: one per layer, one per fragment file.
 *
 *  SCOPE IS PART OF THE RULE, and getting it wrong is not cosmetic. The first census run joined every
 *  unit into one blob, and `aphoristic-cadence` promptly matched a span that began at a "PARIS" chip
 *  and ended eight layers later: `[^.!?]` crosses a newline, so a film with no manufactured contrast
 *  anywhere reported one. A rule reading across a boundary its subject does not have will invent
 *  findings, which is the failure this whole file exists to stop doing.
 *
 *  `unit`: the tell lives inside one piece of copy. Never let it span two.
 *  `document`: the tell IS the relationship between pieces (01 / 02 / 03 across three layers).
 *
 *  No DOM, no globals, and every `test` is a pure function of what it is handed. That is what makes the
 *  self-test meaningful. The one exception is stated where it happens: FACE_WEIGHT_AXES and THEME_SANS
 *  read `core/tokens.css` and `themes/` ONCE at module load, because that data has an authority in this
 *  repo already and copying it here is how it goes stale. Nothing reads a file per run. */
export function runRules(units, { allow = [], scene = null } = {}) {
  const list = (Array.isArray(units) ? units : [units]).map((u) => plain(String(u || ''))).filter((u) => u.trim());
  const doc = list.join('\n');
  const out = [];
  for (const r of RULES) {
    if (allow.includes(r.id)) continue;
    // A `scene` rule reads the parsed JSON, not words: some tells are declarations, not writing.
    if (r.scope === 'scene') {
      const snippet = r.test(scene);
      if (snippet) out.push({ id: r.id, severity: r.severity, why: r.why, snippet });
      continue;
    }
    if (r.scope === 'document') {
      const snippet = r.test(doc);
      if (snippet) out.push({ id: r.id, severity: r.severity, why: r.why, snippet });
      continue;
    }
    for (const u of list) {
      const snippet = r.test(u);
      if (snippet) { out.push({ id: r.id, severity: r.severity, why: r.why, snippet }); break; }
    }
  }
  return out;
}
