// brandkit.mjs — one command to turn a website into a video "colors pack" + fonts + favicon.
// Automates the repeated brand-video workflow (see docs/DESIGN-DATABASE.md, memory brand-video-workflow):
//   crawl CSS → extract colours + roles → detect DOMINANT bg (white-first vs dark) → download fonts →
//   fetch favicon → write themes/<name>.json (palette + bg preset palette + type + format vars).
//
//   node scripts/brandkit.mjs https://threadcite.live threadcite
//   make brandkit URL=https://threadcite.live NAME=threadcite
//
// After it runs: set "theme":"<name>" in a demo/brandfilm data JSON; the fonts @font-face lines it
// prints go into core/tokens.css (once). Idempotent-ish; re-run to refresh.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
const get = async (url) => { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r; };
const getText = async (url) => (await get(url)).text();

// ---- colour helpers ----
const hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const toHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lum = (h) => { const [r, g, b] = hex(h).map((v) => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const sat = (h) => { const [r, g, b] = hex(h).map((v) => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
const rgb = (h) => hex(h).join(',');
const mix = (a, b, t) => toHex(hex(a).map((x, i) => x + (hex(b)[i] - x) * t));
const norm = (v) => { v = (v || '').trim().replace(/;$/, ''); const m = v.match(/#[0-9a-f]{3,8}/i); return m ? m[0].toLowerCase().slice(0, 7) : null; };

async function main() {
  const url = process.argv[2], name = process.argv[3];
  if (!url || !name) { console.error('usage: node scripts/brandkit.mjs <url> <name>'); process.exit(1); }
  const origin = new URL(url).origin;
  const html = await getText(url);

  // 1) gather CSS
  const cssHrefs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].map((m) => m[1])
    .concat([...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi)].map((m) => m[1]));
  let css = '';
  for (const href of [...new Set(cssHrefs)].slice(0, 6)) { try { css += '\n' + await getText(href.startsWith('http') ? href : origin + href); } catch {} }

  // 2) named role tokens (Tailwind/shadcn style) → the strongest signal for roles
  const tokens = {};
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{3,8})/gi)) tokens['--' + m[1].toLowerCase()] = m[2].toLowerCase();
  const pick = (...names) => { for (const n of names) if (tokens[n]) return norm(tokens[n]); return null; };

  // 3) frequency of all hex (fallback + palette breadth)
  const freq = {};
  for (const m of css.matchAll(/#[0-9a-f]{6}\b/gi)) { const c = m[0].toLowerCase(); freq[c] = (freq[c] || 0) + 1; }
  const byFreq = Object.entries(freq).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  const lightest = byFreq.filter((c) => lum(c) > 0.9).sort((a, b) => lum(b) - lum(a));
  const darkest = byFreq.filter((c) => lum(c) < 0.2).sort((a, b) => lum(a) - lum(b));
  const vivid = byFreq.filter((c) => sat(c) > 0.5 && lum(c) > 0.15 && lum(c) < 0.75);

  // 4) resolve roles (named tokens first, else frequency heuristics)
  const bg = pick('--background', '--color-bg', '--color-background', '--bg', '--color-white') || lightest[0] || '#ffffff';
  const surface = pick('--surface', '--color-surface', '--card', '--color-card', '--muted-2') || mix(bg, '#000000', 0.03);
  const ink = pick('--foreground', '--color-ink', '--color-fg', '--ink', '--text', '--color-text', '--color-foreground') || darkest[0] || '#111111';
  // accent = the BRAND colour: prefer a named token, but only if it's actually vivid (sites reuse
  // --accent for pale surfaces); otherwise the most-frequent vivid colour on the page.
  let accent = pick('--color-accent', '--accent', '--primary', '--color-primary', '--brand', '--color-brand');
  if (!accent || sat(accent) < 0.4) accent = vivid[0] || accent || '#1f3bff';
  const accentSoft = pick('--color-accent-soft', '--accent-soft', '--accent-100') || mix(accent, bg, 0.86);
  const grays = byFreq.filter((c) => sat(c) < 0.18 && lum(c) > 0.28 && lum(c) < 0.72);
  let muted = pick('--color-muted', '--muted', '--muted-foreground');
  if (!muted || sat(muted) > 0.25 || lum(muted) > 0.8) muted = grays[0] || mix(ink, bg, 0.5);
  let border = pick('--color-border', '--border');
  if (!border || lum(border) < 0.7) border = mix(ink, bg, 0.86);
  const dominant = lum(bg) > 0.55 ? 'light' : 'dark';

  // 5) fonts — named families in CSS, generic filtered out
  const generic = /system-ui|ui-sans|ui-mono|ui-serif|sans-serif|serif|monospace|apple|segoe|noto|roboto|arial|helvetica|inherit|var\(/i;
  const fams = [...new Set([...css.matchAll(/font-family:\s*["']?([A-Za-z0-9 ]+?)["']?[;,}]/g)].map((m) => m[1].trim()))]
    .filter((f) => f && !generic.test(f) && f.length < 30);
  const sans = fams.find((f) => /jakarta|inter|geist|manrope|satoshi|archivo|figtree|outfit|sans|grotesk/i.test(f)) || fams[0] || 'Inter';
  const mono = fams.find((f) => /mono|jetbrains|geist mono|fira|ibm plex mono/i.test(f)) || 'JetBrains Mono';
  const serif = fams.find((f) => /serif|caveat|instrument|playfair|lora|fraunces/i.test(f)) || null;

  // 6) download fonts (Google Fonts, best-effort) + favicon
  const fontDir = path.join(ROOT, 'engine/assets/fonts');
  const face = [];
  for (const [fam, wght] of [[sans, '400;600;700;800'], [mono, '400;700'], serif ? [serif, '400;700'] : null].filter(Boolean)) {
    try {
      const gcss = await getText(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam)}:wght@${wght}&display=swap`);
      const woff = [...gcss.matchAll(/https:\/\/[^)]+\.woff2/g)].map((m) => m[0]).pop();
      if (!woff) throw 0;
      const file = fam.replace(/[^A-Za-z0-9]/g, '') + '.woff2';
      fs.writeFileSync(path.join(fontDir, file), Buffer.from(await (await get(woff)).arrayBuffer()));
      face.push(`@font-face { font-family: '${fam}'; font-weight: 400 800; font-display: block; src: url('/engine/assets/fonts/${file}') format('woff2'); }`);
    } catch { console.error(`  · font "${fam}" not on Google Fonts — add manually`); }
  }
  const brandDir = path.join(ROOT, 'engine/assets/brands', name); fs.mkdirSync(brandDir, { recursive: true });
  let favicon = '';
  const icoHref = (html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i) || [])[1];
  for (const cand of [icoHref, '/icon.png', '/favicon.png', '/favicon.ico', '/icon.svg'].filter(Boolean)) {
    try { const r = await get(cand.startsWith('http') ? cand : origin + cand); const ext = (cand.split('?')[0].match(/\.(png|svg|ico)$/) || [, 'png'])[1];
      const f = path.join(brandDir, 'icon.' + ext); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); favicon = `/engine/assets/brands/${name}/icon.${ext}`; break; } catch {}
  }

  // 6.5) content signals + inferred identity → the storyboard raw material
  const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const meta = (n) => (html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${n}["'][^>]*content=["']([^"']+)["']`, 'i')) || [])[1] || '';
  const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
  const title = decode(strip((html.match(/<title>([^<]*)<\/title>/i) || [])[1] || ''));
  const headings = [...new Set([...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => decode(strip(m[1]))).filter((t) => t && t.length > 2 && t.length < 90))].slice(0, 24);
  const buttons = [...new Set([...html.matchAll(/<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)].map((m) => decode(strip(m[1]))).filter((t) => t && t.length < 30 && /start|try|get|sign|join|book|demo|free|buy|publish|launch/i.test(t)))].slice(0, 6);
  const description = decode(meta('description') || meta('og:description'));
  const productName = decode(meta('og:site_name')) || decode(meta('og:title')).split(/[|·—-]/)[0].trim() || title.split(/[|·—-]/)[0].trim();
  // identity inferred from colour DNA: light+desaturated → calm/premium/plain; dark+vivid → bold/energetic/busy
  const energetic = dominant === 'dark' || sat(accent) > 0.72;
  const voice = dominant === 'light' ? 'clean · confident · editorial' : 'bold · energetic · technical';
  const motion = energetic ? 'punchy — fast cuts, snap easing, animated bgs' : 'calm — restrained, slow settle, mostly plain bgs';
  const bgStrategy = dominant === 'light'
    ? 'WHITE-first. Default to PLAIN paper backgrounds so content breathes; add subtle shapes/dots ONLY on the hook + CTA. Accent (blue) used sparingly on key words + UI.'
    : 'DARK. Aurora/mesh glow for hook + CTA + emotional beats; plainer/ink scenes for how-it-works + proof so it does not fatigue.';

  // 7) assemble the colours-pack theme (palette + bgPreset palette + type + format vars)
  const inkBase = [mix(ink, bg, 0.12), ink], paperBase = [bg, surface], softBase = [accentSoft, mix(accentSoft, ink, 0.06)];
  const accentBase = [accent, mix(accent, '#000000', 0.18)];
  const theme = {
    name, note: `Colours pack auto-extracted from ${url} by scripts/brandkit.mjs. Dominant: ${dominant}. Use ONLY these.`,
    palette: { bg, text: dominant === 'light' ? ink : bg, accent, accent2: muted },
    type: { sans, mono, ...(serif ? { serif } : {}) },
    // bgPreset palette (rgb accents + base hex pairs) — light-first presets use paperBase/softBase.
    bg: {
      accent: rgb(accent), tint: rgb(muted), tint2: rgb(accent), dotLight: rgb(muted),
      paperBase, softBase, accentBase, inkBase, border,
      light: paperBase, dark: [mix(ink, accent, 0.2), ink], darkMesh: [mix(ink, accent, 0.25), ink],
      deep: [mix(ink, bg, 0.15), ink], ink: accentBase, paper: bg,
    },
    // format role vars (brandfilm/demo read these; fallbacks keep other brands intact)
    vars: {
      '--ink': ink, '--paper': bg, '--muted': muted, '--em': accent,
      '--on-light': ink, '--on-dark': dominant === 'light' ? bg : mix(bg, '#ffffff', 0.6),
      '--border': border, '--accent-soft': accentSoft,
    },
  };
  const themePath = path.join(ROOT, 'themes', name + '.json');
  fs.writeFileSync(themePath, JSON.stringify(theme, null, 2) + '\n');

  // 7.5) BRAND DNA — the full identity a generator uses to storyboard the video.
  const dna = {
    name, url, dominant,
    product: { name: productName, tagline: headings[0] || description.split(/[.·]/)[0] || '', description, headings, ctaText: buttons[0] || 'Get started' },
    colors: { bg, surface, ink, accent, accentSoft, muted, border, dominant },
    type: theme.type, favicon,
    identity: { voice, motion, energetic, bgStrategy },
    // storyboard hint: default beat plan (fill copy from product.*). See docs/DESIGN-DATABASE.md §Storyboard.
    storyboard: dominant === 'light'
      ? ['hook: tagline (paperShapes)', 'problem/what: statement (paper)', 'how-it-works: steps/demo (paper)', 'proof: stats (paper)', 'cta: url (soft/paperShapes)']
      : ['hook: tagline (aurora)', 'problem: statement (spotlight)', 'how: steps (dotmatrix/ink)', 'proof: stats (constellation)', 'cta: url (brandglow)'],
  };
  fs.mkdirSync(path.join(ROOT, 'dna'), { recursive: true });
  const dnaPath = path.join(ROOT, 'dna', name + '.json');
  fs.writeFileSync(dnaPath, JSON.stringify(dna, null, 2) + '\n');

  // 8) report
  console.log(`\n✓ brandkit: ${name}  (dominant: ${dominant.toUpperCase()})`);
  console.log(`  bg ${bg}  ink ${ink}  accent ${accent}  soft ${accentSoft}  muted ${muted}  border ${border}`);
  console.log(`  fonts: ${sans} / ${mono}${serif ? ' / ' + serif : ''}`);
  console.log(`  favicon: ${favicon || '(none found)'}`);
  console.log(`  → wrote ${path.relative(ROOT, themePath)} + ${path.relative(ROOT, dnaPath)}`);
  console.log(`  product: ${productName} — "${dna.product.tagline}"`);
  console.log(`  identity: ${voice}  ·  motion: ${motion}`);
  if (face.length) { console.log(`\n  add these @font-face to core/tokens.css (once):`); face.forEach((f) => console.log('    ' + f)); }
  console.log(`\n  next: set "theme":"${name}"${favicon ? ` and use logo "${favicon}"` : ''} in a demo/brandfilm data JSON.`);
  console.log(`  video should be ${dominant === 'light' ? 'WHITE-first (paper/paperShapes/soft bgs)' : 'DARK (aurora/mesh/brandglow bgs)'} per the dominant colour.`);
}
main().catch((e) => { console.error('✗ brandkit failed:', e.message); process.exit(1); });
