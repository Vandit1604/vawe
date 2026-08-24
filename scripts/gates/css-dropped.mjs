#!/usr/bin/env node
// scripts/gates/css-dropped.mjs — find CSS declarations the browser SILENTLY DROPS.
//   make css-dropped            sweep every block factory
//   node scripts/gates/css-dropped.mjs --scene <file>
//
// WHY. A CSS declaration the parser rejects is not an error anywhere: the browser drops that one
// declaration, keeps the rest of the rule, and renders on. Nothing throws, nothing warns, and the
// element simply does not do the thing you wrote. It is the purest form of this engine's cardinal
// sin — input accepted and then ignored — and until now the only way to catch it was to render the
// frame and notice with your eyes that something did not move.
//
// The case that prompted this: a block emitted `left: -calc(...)`. A leading minus outside calc() is
// invalid CSS (the valid form is `calc(-1 * ...)`), so three of four focus brackets never moved. Every
// gate was green. It was found by looking at a picture.
//
// HOW, and why not CSS.supports(). Comparing against `CSS.supports(prop, value)` needs the checker to
// know which properties exist, and it answers "is this valid" rather than "did this survive". The
// direct question is better: parse the raw style attribute into declarations, then ask the element
// which ones actually landed in `el.style`. A declaration present in the source and absent afterwards
// was dropped by the parser. No property list to maintain, no vendor-prefix allowlist, and it reports
// the browser's real behaviour rather than a model of it.
//
// KNOWN LIMIT, stated because it bounds what a green run means: custom properties (`--x`) accept ANY
// token by design, so `--x: -calc(1px)` lands and is invisible here. It only becomes a drop where that
// variable is USED in a real property, and that use is what this catches. Verified, not assumed.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { CATALOG } from '../../blocks/catalog.mjs';
import * as B from '../../blocks/index.mjs';

const argOf = (f) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : null; };
const sceneArg = argOf('--scene');
const ALL = process.argv.includes('--all'); // every scene in the library, one browser, one pass

// Collect every html string this repo would put in front of a browser.
const samples = []; // { where, html }
if (sceneArg || ALL) {
  const walk = (layers, where) => {
    for (const L of layers || []) {
      if (!L || typeof L !== 'object') continue;
      if (typeof L.html === 'string') samples.push({ where: `${where} layer[${L.id || L.type}]`, html: L.html });
      walk(L.children, where);
    }
  };
  const files = ALL
    ? fs.readdirSync('formats/scene').filter((f) => f.endsWith('.json') && f !== 'schema.json').map((f) => path.join('formats/scene', f))
    : [sceneArg];
  for (const f of files) {
    let d; try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    if (d.module !== 'scene') continue;
    walk(d.layers, path.basename(f));
  }
} else {
  for (const entry of CATALOG) {
    const fn = B[entry.name];
    if (typeof fn !== 'function') continue;
    let out;
    try { out = fn({ ...(entry.props || {}) }); } catch { continue; } // a factory that needs real args is not this gate's business
    for (const L of [].concat(out || [])) {
      if (L && typeof L.html === 'string') samples.push({ where: entry.name, html: L.html });
    }
  }
}

if (!samples.length) { console.log('✓ no html fragments to check'); process.exit(0); }

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const findings = [];
for (const s of samples) {
  await page.setContent(`<div id="__probe">${s.html}</div>`, { waitUntil: 'domcontentloaded' });
  const dropped = await page.evaluate(() => {
    const out = [];
    const probe = document.createElement('div');
    for (const el of document.querySelectorAll('#__probe [style]')) {
      const raw = el.getAttribute('style') || '';
      // Split on top-level semicolons only: a url() or a data: URI may contain one.
      const decls = []; let depth = 0, cur = '';
      for (const ch of raw) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (ch === ';' && depth === 0) { decls.push(cur); cur = ''; } else cur += ch;
      }
      decls.push(cur);
      for (const d of decls) {
        const i = d.indexOf(':');
        if (i < 0) continue;
        const prop = d.slice(0, i).trim();
        const val = d.slice(i + 1).trim();
        if (!prop || !val || prop.startsWith('--')) continue; // custom props accept anything, by design
        // TEST EACH DECLARATION IN ISOLATION, on a scratch element. Reading it back off the real
        // element looks equivalent and is not: CSSOM refuses to serialise a SHORTHAND whose longhands
        // are not uniform, so `border: 4px solid rgba(...)` followed by any `border-*-color` override
        // reads back as '' while rendering perfectly. That produced six false positives on the first
        // sweep of this library, all of them shorthands, none of them bugs. In isolation there is
        // nothing to interfere: the declaration either parses or it does not.
        probe.style.cssText = '';
        probe.style.setProperty(prop, val);
        if (probe.style.getPropertyValue(prop) === '') {
          out.push({ prop, val, tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 40) });
        }
      }
    }
    return out;
  });
  for (const d of dropped) findings.push({ ...d, where: s.where });
}
await browser.close();

if (!findings.length) {
  console.log(`✓ no dropped CSS declarations across ${samples.length} fragment(s)`);
  process.exit(0);
}
console.error(`✗ ${findings.length} CSS declaration(s) the browser SILENTLY DROPS:\n`);
for (const f of findings) {
  console.error(`  ${f.where}  <${f.tag}${f.cls ? ` class="${f.cls}"` : ''}>`);
  console.error(`      ${f.prop}: ${f.val}`);
}
console.error('\n  The browser keeps the rest of the rule and renders on, so this does not throw anywhere —');
console.error('  the element just never does the thing. Common cause: `-calc(...)`; the valid form is `calc(-1 * ...)`.');
process.exit(1);
