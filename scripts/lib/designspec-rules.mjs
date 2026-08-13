// scripts/lib/designspec-rules.mjs — OUR anti-slop rules. A table we own, not a list we borrow.
//
// WHY THIS EXISTS. `make slop` shells out to the vendored impeccable detector (41 rules, Apache-2.0,
// `.claude/skills/impeccable/`). It is good work and it is not ours, in three ways that cost us:
//
//   1. WE CANNOT FIX IT. The browser path injects `detect-antipatterns-browser.js`, a 4,920-line
//      GENERATED bundle whose build script is not vendored. It cannot be regenerated here. When the
//      detector reported 21 false low-contrast findings on the first fragment it was ever shown
//      (docs/MISTAKES.md #324), the only repair was to hand-edit the generated file — and a skill
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
import { plain } from './text.mjs';

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

// "Not a feature. A platform." — a claim manufactured out of a contrast rather than out of a fact.
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
    // Only reachable since the fragments moved into files (docs/MISTAKES.md #325 and the extraction
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
    fires: '01 Capture — 02 Compose — 03 Render — the three steps.',
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
    // vertex computed. Not one drawn." — this rule fires on it, correctly, and the film keeps the line
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
    // gradient sweep and its own comment sets the dose — "ONE hero word per film". A rule that banned
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
];

/** Run every rule over a scene's text UNITS — one per layer, one per fragment file.
 *
 *  SCOPE IS PART OF THE RULE, and getting it wrong is not cosmetic. The first census run joined every
 *  unit into one blob, and `aphoristic-cadence` promptly matched a span that began at a "PARIS" chip
 *  and ended eight layers later: `[^.!?]` crosses a newline, so a film with no manufactured contrast
 *  anywhere reported one. A rule reading across a boundary its subject does not have will invent
 *  findings, which is the failure this whole file exists to stop doing.
 *
 *  `unit` — the tell lives inside one piece of copy. Never let it span two.
 *  `document` — the tell IS the relationship between pieces (01 / 02 / 03 across three layers).
 *
 *  Pure: no files, no DOM, no globals. That is what makes the self-test meaningful. */
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
