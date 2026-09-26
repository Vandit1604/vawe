import puppeteer from 'puppeteer';
import fs from 'node:fs';
import { UNITS } from '../../core/transitions/units.js';
import { seamFrag, SEAM_VERT } from '../../core/timeline/seams.js';

const frags = UNITS.map((u) => ({ name: u.name, source: u.source, vert: SEAM_VERT, frag: seamFrag(u) }));

function execPath() {
  try { const p = puppeteer.executablePath(); if (p && fs.existsSync(p)) return p; } catch {}
  const base = `${process.env.HOME}/Library/Caches/ms-playwright`;
  try {
    const dir = fs.readdirSync(base).filter((d) => d.startsWith('chromium-')).sort().pop();
    for (const rel of ['chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-mac_arm/Chromium.app/Contents/MacOS/Chromium']) {
      const p = `${base}/${dir}/${rel}`; if (fs.existsSync(p)) return p;
    }
  } catch {}
  return undefined;
}

const browser = await puppeteer.launch({ headless: 'new', executablePath: execPath(),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<canvas id="c" width="16" height="16"></canvas>');

const results = await page.evaluate((frags) => {
  const cv = document.getElementById('c');
  const gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
  if (!gl) return frags.map((f) => ({ name: f.name, ok: false, log: 'no webgl context' }));
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    const ok = gl.getShaderParameter(s, gl.COMPILE_STATUS); const log = ok ? '' : gl.getShaderInfoLog(s); gl.deleteShader(s); return { ok, log }; };
  return frags.map((f) => {
    const v = compile(gl.VERTEX_SHADER, f.vert); if (!v.ok) return { name: f.name, ok: false, log: 'VERT: ' + v.log };
    const fr = compile(gl.FRAGMENT_SHADER, f.frag);
    return { name: f.name, source: f.source, ok: fr.ok, log: (fr.log || '').trim().split('\n').slice(0, 3).join(' | ') };
  });
}, frags);

await browser.close();

const fails = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.name.padEnd(20)} ${r.ok ? '' : r.log}`);
console.log(`\n${results.length - fails.length}/${results.length} compiled` + (fails.length ? `; FAILURES: ${fails.map((f) => f.name).join(', ')}` : ', all clean'));
process.exit(fails.length ? 1 : 0);
