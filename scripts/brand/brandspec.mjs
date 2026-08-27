// brandspec.mjs, READ a site's real CSS instead of guessing it. Loads the page, walks the stylesheets
// + computed styles, and reports the facts you author a theme from: the 1-3 real font families (with the
// WEIGHTS actually used, mapped to primary/secondary/accent), the declared design tokens (:root --vars),
// the key colours (bg/text/accent) with WCAG contrast checks, and the shape language (radius/shadow).
// This is the "measure, don't guess" fix for the wrong-weight / wrong-font class of mistakes.
//
//   node scripts/brand/brandspec.mjs https://example.com/home        ·        make brandspec URL=…
import puppeteer from 'puppeteer';

const url = process.argv[2];
if (!url) { console.error('usage: node scripts/brand/brandspec.mjs <url>'); process.exit(1); }

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--force-color-profile=srgb'] });
const page = await browser.newPage();
await page.setViewport({ width: 1512, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2000));

const raw = await page.evaluate(() => {
  const px = (s) => parseFloat(s) || 0;
  const fam1 = (f) => f.split(',')[0].replace(/['"]/g, '').trim();
  // --- declared design tokens: :root/html custom properties from every readable stylesheet ---
  const vars = {};
  for (const ss of document.styleSheets) {
    let rules; try { rules = ss.cssRules; } catch (e) { continue; } // cross-origin sheet → skip
    for (const r of rules || []) {
      if (r.selectorText && /(^|,)\s*(:root|html)\b/.test(r.selectorText) && r.style)
        for (const p of r.style) if (p.startsWith('--')) vars[p] = r.style.getPropertyValue(p).trim();
    }
  }
  // --- @font-face families actually shipped by the site ---
  const faces = new Set();
  for (const ss of document.styleSheets) { let rules; try { rules = ss.cssRules; } catch (e) { continue; }
    for (const r of rules || []) if (r.constructor.name === 'CSSFontFaceRule') faces.add(fam1(r.style.fontFamily || '')); }
  // --- font USAGE: per family, which weights + the biggest size it's set at + how often ---
  const fonts = {};
  for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,p,span,a,button,li,code,pre,strong,em,div')) {
    const t = (el.textContent || '').trim(); if (!t || el.children.length > 3) continue;
    const cs = getComputedStyle(el); const fam = fam1(cs.fontFamily); if (!fam) continue;
    const f = fonts[fam] || (fonts[fam] = { weights: {}, maxSize: 0, count: 0, mono: cs.fontFamily.includes('mono') });
    f.weights[cs.fontWeight] = (f.weights[cs.fontWeight] || 0) + 1;
    f.maxSize = Math.max(f.maxSize, px(cs.fontSize)); f.count++;
  }
  // --- key elements: headline / body / button(accent) / mono ---
  const biggest = (sel) => { let b = null, s = 0; for (const e of document.querySelectorAll(sel)) { const t = (e.textContent || '').trim(); if (!t || t.length > 80) continue; const z = px(getComputedStyle(e).fontSize); if (z > s) { s = z; b = e; } } return b; };
  const specOf = (el) => { if (!el) return null; const c = getComputedStyle(el); return { family: fam1(c.fontFamily), weight: c.fontWeight, size: c.fontSize, tracking: c.letterSpacing, lineHeight: c.lineHeight, color: c.color }; };
  const headline = biggest('h1,h2,[class*=title i],[class*=hero i],[class*=heading i]');
  const body = [...document.querySelectorAll('p,li')].find((p) => (p.textContent || '').trim().length > 50);
  const btn = document.querySelector('a[class*=button i],button,[class*=btn i],[class*=cta i]');
  const mono = [...document.querySelectorAll('code,pre,[class*=mono i]')].find((e) => (e.textContent || '').trim());
  const bg = (() => { for (const el of [document.querySelector('main,section,[class*=hero i]'), document.body]) { if (!el) continue; const c = getComputedStyle(el).backgroundColor; if (c && !/rgba?\(0, 0, 0, 0\)/.test(c)) return c; } return getComputedStyle(document.body).backgroundColor; })();
  // ACCENT = the most VIVID prominent colour, not "the first button's bg" (which was often a black chip).
  // Tally saturated colours (chroma ≥ 0.25 excludes black/white/grey) across CTAs, links, and brand marks
  // (the logo/icon/mascot is where the accent often lives), weighted by saturation × role-prominence.
  const sat = (c) => { const m = c && c.match(/\d+(\.\d+)?/g); if (!m || m.length < 3) return 0; const [r, g, b] = m.map(Number); if (m.length > 3 && Number(m[3]) === 0) return 0; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
  const tally = {};
  const consider = (c, w) => { const s = sat(c); if (s < 0.25) return; tally[c] = (tally[c] || 0) + s * w; };
  for (const e of document.querySelectorAll('a[class*=button i],button,[class*=btn i],[class*=cta i]')) { const cs = getComputedStyle(e); consider(cs.backgroundColor, 4); consider(cs.color, 1); }
  for (const e of document.querySelectorAll('svg,[class*=logo i],[class*=icon i],[class*=mark i],[class*=badge i],[class*=pill i]')) { const cs = getComputedStyle(e); consider(cs.backgroundColor, 3); consider(cs.fill, 3); consider(cs.color, 2); }
  for (const e of document.querySelectorAll('a,[class*=link i],[class*=underline i],[class*=highlight i]')) consider(getComputedStyle(e).color, 1);
  const accent = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || (btn ? getComputedStyle(btn).backgroundColor : null);
  return { vars, faces: [...faces].filter(Boolean), fonts, headline: specOf(headline), body: specOf(body),
    button: btn ? { ...specOf(btn), bg: getComputedStyle(btn).backgroundColor, radius: getComputedStyle(btn).borderRadius } : null,
    accent, mono: specOf(mono), bg, radiusSample: btn ? getComputedStyle(btn).borderRadius : null };
});
await browser.close();

// ---------- post-process: rank fonts → primary/secondary/accent, colours + WCAG ----------
const rgb = (c) => { const m = String(c).match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/); return m ? [+m[1], +m[2], +m[3]] : null; };
const hex = (c) => { const p = rgb(c); return p ? '#' + p.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('') : String(c); };
const lum = (p) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]); };
const ratio = (a, b) => { const A = rgb(a), B = rgb(b); if (!A || !B) return null; const [hi, lo] = lum(A) > lum(B) ? [lum(A), lum(B)] : [lum(B), lum(A)]; return ((hi + 0.05) / (lo + 0.05)); };
const grade = (r) => r == null ? '?' : r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA-large' : 'FAIL';

// rank: display faces (big + used) = primary; a distinct body face = secondary; mono/other = accent. Cap 3.
const ranked = Object.entries(raw.fonts).map(([fam, f]) => ({ fam, ...f, topW: Object.entries(f.weights).sort((a, b) => b[1] - a[1])[0]?.[0] }))
  .sort((a, b) => (b.maxSize * Math.log(b.count + 1)) - (a.maxSize * Math.log(a.count + 1)));
const primary = ranked[0];
const secondary = ranked.find((f) => f.fam !== primary?.fam && !f.mono);
const accent = ranked.find((f) => f.mono) || ranked.find((f) => f.fam !== primary?.fam && f.fam !== secondary?.fam);
const roleLine = (label, f) => f ? `  ${label.padEnd(10)}: ${f.fam}  ·  weights ${Object.keys(f.weights).sort().join('/')}  ·  set up to ${f.maxSize | 0}px` : `  ${label.padEnd(10)}: (none distinct)`;

console.log(`\nBRANDSPEC · ${url}\n${'='.repeat(60)}`);
console.log(`\nFONTS (1-3 real faces → roles; use these WEIGHTS, don't guess):`);
console.log(roleLine('primary', primary)); console.log(roleLine('secondary', secondary)); console.log(roleLine('accent', accent));
if (raw.faces.length) console.log(`  @font-face shipped: ${raw.faces.join(', ')}`);
console.log(`\nKEY TYPE (measured):`);
for (const [k, v] of Object.entries({ headline: raw.headline, body: raw.body, button: raw.button, mono: raw.mono }))
  if (v) console.log(`  ${k.padEnd(9)}: ${v.family} ${v.weight} · ${v.size} · track ${v.tracking} · lh ${v.lineHeight}`);

const bg = raw.bg, text = raw.body?.color || raw.headline?.color, accentC = raw.accent || raw.button?.bg;
console.log(`\nCOLOURS (measured; author theme ONLY from these):`);
console.log(`  bg      : ${hex(bg)}`);
console.log(`  text    : ${hex(text)}   contrast vs bg ${ratio(text, bg)?.toFixed(1)}:1 [${grade(ratio(text, bg))}]`);
// accent = the most-saturated prominent colour (ranked across CTAs/links/marks), not "the first button".
// It can still hide from CSS: a RASTER logo/mascot has no CSS colour, and oklch/oklab values aren't RGB.
// So print what we found honestly and always point to the eyedrop (pixels never lie).
if (accentC && rgb(accentC)) console.log(`  accent  : ${hex(accentC)}   vs white ${ratio(accentC, '#fff')?.toFixed(1)}:1 [${grade(ratio(accentC, '#fff'))}] · vs bg ${ratio(accentC, bg)?.toFixed(1)}:1`);
else if (accentC) console.log(`  accent  : ${accentC}   (non-RGB, e.g. oklch, CONFIRM by eyedrop)`);
else console.log(`  accent  : none in CSS. The brand colour likely lives in a raster logo/mascot.`);
console.log(`  → accent is unreliable from CSS alone. EYEDROP the hero to be sure: make palette IMG=assets/brands/<brand>/sections/01-*.png`);
console.log(`  headline vs bg: ${ratio(raw.headline?.color, bg)?.toFixed(1)}:1 [${grade(ratio(raw.headline?.color, bg))}] (display type wants AAA ≥7)`);
const tokenColors = Object.entries(raw.vars).filter(([k, v]) => /#|rgb|hsl/.test(v) && /colou?r|bg|text|accent|brand|fg|surface/i.test(k));
const tokenFonts = Object.entries(raw.vars).filter(([k]) => /font/i.test(k));
if (tokenColors.length) console.log(`\nDECLARED COLOUR TOKENS (:root):\n${tokenColors.slice(0, 16).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`);
if (tokenFonts.length) console.log(`\nDECLARED FONT TOKENS (:root):\n${tokenFonts.slice(0, 8).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`);
if (raw.radiusSample) console.log(`\nSHAPE: button radius ${raw.radiusSample}`);
console.log(`\n→ Author themes/<brand>.json: type.sans = primary, type.mono = accent(mono); use the MEASURED`);
console.log(`  headline weight (not 800 by default). Fix any FAIL contrast with COLOR.md before shipping.\n`);
