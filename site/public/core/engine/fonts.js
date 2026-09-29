// fonts.js: the font registry + the fallback detector.
//
// THE BUG THIS KILLS: a theme or a captured component names a family that has no @font-face.
// The browser silently substitutes a generic and the video renders in the wrong typeface. It has
// shipped twice (Geist -> Hanken, Anybody -> system sans, Manrope -> system sans) because the fix
// was always "remember to add it to a hardcoded list", and nobody remembers a hardcoded list.
//
// So nothing here is hardcoded. The load set is DERIVED from the @font-face rules in the CSS, and
// the audit is derived from the families the rendered DOM actually asks for.
//
// WHY NOT document.fonts.check(). It is inverted for this job. Measured in headless Chrome:
//   check("600 100px 'NoSuchFaceXYZ'") -> true    (a family that does not exist anywhere)
//   check("600 100px 'Manrope'")       -> false   (registered + vendored, merely not loaded yet)
// It answers "can these glyphs be drawn somehow", not "is the face I asked for the one painting".

/** Generic + system-stack names. A first-choice generic is a deliberate fallback, not a missing face. */
const GENERIC = new Set(['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded', '-apple-system', 'blinkmacsystemfont',
  'inherit', 'initial', 'unset', 'revert', 'emoji', 'math', 'fangsong']);

const clean = (f) => f.trim().replace(/^["']|["']$/g, '');
const isGeneric = (f) => GENERIC.has(clean(f).toLowerCase());

/** Every family declared by an @font-face rule -> the file(s) it points at. Same-origin sheets only. */
export function registeredFamilies() {
  const out = new Map();
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin sheet: not ours, skip
    if (!rules) continue;
    for (const rule of rules) {
      if (rule.constructor?.name !== 'CSSFontFaceRule' && !(rule.type === 5)) continue;
      const fam = clean(rule.style.fontFamily || '');
      if (!fam) continue;
      if (!out.has(fam)) out.set(fam, []);
      out.get(fam).push(rule.style.src || '');
    }
  }
  return out;
}

/** Load every registered family across the weight range scenes use. Replaces the old FACES list. */
export async function loadRegistered(extraFamilies = []) {
  const fams = new Set([...registeredFamilies().keys(), ...extraFamilies.filter((f) => f && !isGeneric(f))]);
  const specs = [];
  for (const f of fams) for (const w of [400, 500, 600, 700, 800]) specs.push(`${w} 100px '${f}'`);
  // A face that fails to load must not stop the others (or the render).
  await Promise.all(specs.map((s) => document.fonts.load(s).catch(() => {})));
  try { await document.fonts.ready; } catch {}
  return [...fams];
}

/**
 * Is `family` actually painting? Render a probe string with the family followed by three different
 * generics. If the family resolves it wins in all three and the widths match; if it does not, each
 * generic paints and the widths differ. Verified against a known-missing family and a known-present
 * system family. Widths are OS-dependent, so only the boolean is ever reported.
 */
export function isPainting(family) {
  const ctx = isPainting._c || (isPainting._c = document.createElement('canvas').getContext('2d'));
  const probe = 'MWQ@#iIl1 wave 0123';
  const w = ['monospace', 'serif', 'sans-serif'].map((g) => {
    ctx.font = `600 100px '${family}', ${g}`;
    return Math.round(ctx.measureText(probe).width * 100);
  });
  return w[0] === w[1] && w[1] === w[2];
}

/** First-choice family of every element under `root` that actually renders text. */
export function usedFamilies(root = document.querySelector('.stage') || document.body) {
  const fams = new Set();
  const walk = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      const first = (cs.fontFamily || '').split(',')[0];
      if (first && !isGeneric(first)) fams.add(clean(first));
    }
    for (const c of el.children) walk(c);
  };
  if (root) walk(root);
  return fams;
}

/** Per-family FontFace states, keyed by family name. One walk of document.fonts, shared by both
 *  consumers below so they cannot disagree about what "loaded" means. */
function faceStates() {
  const status = new Map();
  document.fonts.forEach((ff) => {
    const f = clean(ff.family);
    if (!status.has(f)) status.set(f, new Set());
    status.get(f).add(ff.status);
  });
  return status;
}

/**
 * One family -> one verdict.
 *   OK           registered + loaded + painting
 *   BROKEN       registered but the file errored (bad path / 404) -> renders as fallback
 *   SYSTEM-LUCK  painting with NO @font-face: it works on this machine because the font happens to
 *                be installed, and fails everywhere else. The invisible one; still a hard failure.
 *   FALLBACK     not registered, not painting -> the classic silent substitution
 */
function verdictOf(family, reg, status) {
  const registered = reg.has(family);
  const states = [...(status.get(family) || [])].sort();
  const painting = isPainting(family);
  let verdict;
  if (registered && states.includes('error')) verdict = 'BROKEN';
  else if (registered && painting) verdict = 'OK';
  else if (registered && !painting) verdict = 'FALLBACK'; // declared but never actually resolved
  else if (!registered && painting) verdict = 'SYSTEM-LUCK';
  else verdict = 'FALLBACK';
  return { family, verdict, registered, loaded: states.join('+') || 'none', src: (reg.get(family) || []).join(' ') };
}

/** Audit the families the scene actually uses (needs a rendered frame: a layer that is not up yet
 *  declares no family). */
export function auditFonts(root) {
  const reg = registeredFamilies();
  const status = faceStates();
  return [...usedFamilies(root)].sort().map((f) => verdictOf(f, reg, status));
}

// assertFamilies(families, where): THE READ-BACK for the font boundary.
//
// WHY. `document.fonts.load()` is a boundary we do not own, and it shrugs by contract: a face whose
// file 404s leaves the FontFace at status "error" and the browser paints a generic instead. Measured
// in headless Chrome against a @font-face pointing at a missing file:
//   document.fonts.load("400 100px 'ProbeMissing'")  rejects "A network error occurred."
//   [...document.fonts] -> ["ProbeMissing", "error"]
//   document.fonts.check("400 100px 'TotallyNoSuchFaceXYZ'") -> TRUE   (inverted; see the note above)
// boot.js awaited that load inside `try { ... } catch (e) {}`, so the rejection was thrown away and
// every frame rendered in a substitute with nothing said. That is how Geist, Anybody and Manrope each
// shipped wrong, and how a fresh worktree rendered its whole library in a fallback serif.
//
// The audit that could have caught it existed the whole time and was OPT-IN (`make check GATE=font-audit`), which
// is a gate for a value we could refuse at the write site. This refuses it there instead: the four
// families a theme names are author-supplied, they are known before the first frame, and a wrong one
// invalidates every frame that follows.
export function assertFamilies(families, where = 'theme') {
  const want = [...new Set(families)].filter((f) => typeof f === 'string' && f && !isGeneric(f)).map(clean);
  if (!want.length) return [];
  const reg = registeredFamilies();
  const status = faceStates();
  const rows = want.map((f) => verdictOf(f, reg, status));
  const bad = rows.filter((r) => r.verdict !== 'OK');
  if (bad.length) {
    const why = {
      BROKEN: (r) => `its @font-face file never loaded (${r.src || 'no src'}), run \`make gen X=fonts\``,
      FALLBACK: (r) => (r.registered
        ? `declared by an @font-face (${r.src || 'no src'}) that never resolved, run \`make gen X=fonts\``
        : 'no @font-face declares it: add one to core/tokens.css, or name a family that has one'),
      'SYSTEM-LUCK': () => 'it paints only because this machine happens to have it installed, and no '
        + '@font-face declares it: every other machine renders a substitute',
    };
    throw new Error(`${where}: ${bad.length} font famil${bad.length > 1 ? 'ies' : 'y'} would render as a substitute:\n`
      + bad.map((r) => `  - "${r.family}" (${r.verdict}, FontFace ${r.loaded}): ${why[r.verdict](r)}`).join('\n')
      + '\nThe browser does not refuse a font it cannot load; it paints a generic and says nothing, so an'
      + ' unchecked family here renders a plausible frame in the wrong typeface.');
  }
  return rows;
}
