// fonts.js — the font registry + the fallback detector.
//
// THE BUG THIS KILLS: a theme or a captured component names a family that has no @font-face.
// The browser silently substitutes a generic and the video renders in the wrong typeface. It has
// shipped twice (Geist -> Hanken, Anybody -> system sans, Manrope -> system sans) because the fix
// was always "remember to add it to a hardcoded list", and nobody remembers a hardcoded list.
//
// So nothing here is hardcoded. The load set is DERIVED from the @font-face rules in the CSS, and
// the audit is derived from the families the rendered DOM actually asks for.
//
// WHY NOT document.fonts.check() — it is inverted for this job. Measured in headless Chrome:
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

/**
 * Audit the families the scene actually uses.
 *   OK           registered + loaded + painting
 *   BROKEN       registered but the file errored (bad path / 404) -> renders as fallback
 *   SYSTEM-LUCK  painting with NO @font-face: it works on this machine because the font happens to
 *                be installed, and fails everywhere else. The invisible one; still a hard failure.
 *   FALLBACK     not registered, not painting -> the classic silent substitution
 */
export function auditFonts(root) {
  const reg = registeredFamilies();
  const status = new Map();
  document.fonts.forEach((ff) => {
    const f = clean(ff.family);
    if (!status.has(f)) status.set(f, new Set());
    status.get(f).add(ff.status);
  });

  const report = [];
  for (const family of [...usedFamilies(root)].sort()) {
    const registered = reg.has(family);
    const states = [...(status.get(family) || [])].sort();
    const painting = isPainting(family);
    let verdict;
    if (registered && states.includes('error')) verdict = 'BROKEN';
    else if (registered && painting) verdict = 'OK';
    else if (registered && !painting) verdict = 'FALLBACK'; // declared but never actually resolved
    else if (!registered && painting) verdict = 'SYSTEM-LUCK';
    else verdict = 'FALLBACK';
    report.push({ family, verdict, registered, loaded: states.join('+') || 'none' });
  }
  return report;
}
