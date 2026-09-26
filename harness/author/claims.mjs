import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'grammar');
const STILL_FLOOR = 0.5;   // the floor internal/scene/scene.go and study.mjs both use

const films = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));

const SCENES = path.join(ROOT, 'films/scene');
const ours = fs.readdirSync(SCENES).filter((f) => f.endsWith('.json') && f !== 'schema.json'
  && !/\.(animatic|intent|expanded|beatsync|captioned|directed|template)\./.test(f))
  .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(SCENES, f), 'utf8')); } catch { return null; } })
  .filter((d) => d && d.module === 'scene')
  .map((d, i) => ({ name: `ours[${i}]`, scene: d }));

const OURS_METRICS = {
  declaredBeat: ({ scene }) => {
    const b = [...(scene.cuts || []).map((c) => c.t), ...(scene.transitions || []).map((t) => t.at),
      ...(scene.seams || []).map((x) => x.t)].filter((t) => typeof t === 'number').sort((a, b2) => a - b2);
    if (!b.length) return null;               // a one-shot film has no beat length to report
    const edges = [0, ...b, scene.duration].filter((t) => typeof t === 'number');
    const lens = edges.slice(1).map((t, i) => t - edges[i]).filter((l) => l > 0).sort((a, b2) => a - b2);
    return lens.length ? lens[Math.floor(lens.length / 2)] : null;
  },
  presetNames: ({ scene }) => {
    const KEYS = ['anim', 'out', 'preset', 'fx', 'cut', 'morph', 'physics', 'motionPath', 'splitText', 'ransom', 'react'];
    const walk = (ls) => (ls || []).flatMap((L) => (L && typeof L === 'object' ? [L, ...walk(L.children), ...walk(L.layers)] : []));
    const layers = walk(scene.layers);
    if (!layers.length) return null;
    const names = new Set();
    for (const L of layers) for (const k of KEYS) {
      const v = L[k]; if (typeof v === 'string' && v !== 'none') names.add(`${k}:${v}`);
    }
    return names.size;
  },

  declaredCutsPerMinute: ({ scene }) => {
    const n = (scene.cuts || []).length + (scene.transitions || []).length + (scene.seams || []).length;
    return scene.duration > 0 ? (n / scene.duration) * 60 : null;
  },
};
const { claims } = JSON.parse(fs.readFileSync(path.join(DIR, '_claims.json'), 'utf8'));

const cutsFound = (g) => g.measured.shotDetection === 'scene-score';
const shots = (g) => g.shots || [];
const num = (xs) => xs.filter((x) => typeof x === 'number');

const METRICS = {
  filmMotion: (g) => { const m = num(shots(g).map((s) => s.motion)); return m.length ? m.reduce((a, b) => a + b, 0) / m.length : null; },
  heldShare: (g) => {
    const rows = shots(g).filter((s) => typeof s.held === 'number' && typeof s.frames === 'number');
    if (!rows.length) return null;
    const f = rows.reduce((a, s) => a + s.frames, 0);
    return f ? rows.reduce((a, s) => a + s.held * s.frames, 0) / f : null;
  },
  medianShot: (g) => (cutsFound(g) ? g.measured.medianShot : null),
  cutsPerMinute: (g) => (cutsFound(g) ? g.measured.cutsPerMinute : null),
  groundTurns: (g) => {
    const gs = shots(g).map((s) => s.ground).filter(Boolean);
    if (gs.length < 2) return null;
    return gs.some((x, i) => i > 0 && x !== gs[i - 1]);
  },
  peakConcentration: (g) => {
    const ps = num(shots(g).map((s) => s.peak)).sort((a, b) => a - b);
    if (ps.length < 3) return null;
    const med = ps[Math.floor(ps.length / 2)];
    return med > 0 ? ps[ps.length - 1] / med : null;
  },
  hasHeldShot: (g) => {
    const hs = num(shots(g).map((s) => s.motion));
    return hs.length ? hs.some((m) => m < STILL_FLOOR * 4) : null;
  },
};

const OPS = {
  within: (v, c) => v >= c.lo && v <= c.hi,
  atLeast: (v, c) => v >= c.value,
  atMost: (v, c) => v <= c.value,
  is: (v, c) => v === c.value,
};

const fmt = (v) => (typeof v === 'number' ? (Math.abs(v) < 10 ? v.toFixed(2) : v.toFixed(1)) : String(v));
const expectation = (c) => (c.op === 'within' ? `${c.lo} to ${c.hi}`
  : c.op === 'atLeast' ? `at least ${c.value}` : c.op === 'atMost' ? `at most ${c.value}` : String(c.value));

console.log(`\n  CLAIMS · ${claims.length} checked · ${films.length} studied reference(s) · ${ours.length} of our own films\n`);
const rows = [];
for (const c of claims) {
  const scope = c.scope || 'reference';
  const table = scope === 'ours' ? OURS_METRICS : METRICS;
  const pop = scope === 'ours' ? ours : films;
  const metric = table[c.metric];
  if (!metric) { console.error(`✗ claim "${c.id}" (scope ${scope}) names metric "${c.metric}", which does not exist. Known for that scope: ${Object.keys(table).join(', ')}`); process.exit(2); }
  const evidence = pop.map((g) => ({ name: g.name, v: metric(g) })).filter((x) => x.v !== null && x.v !== undefined);
  const agree = evidence.filter((x) => OPS[c.op](x.v, c));
  const n = evidence.length;
  const share = n ? agree.length / n : 0;
  const verdict = !n ? 'UNTESTABLE' : share >= 0.7 ? 'SUPPORTED' : share <= 0.3 ? 'CONTRADICTED' : 'SPLIT';
  rows.push({ c, verdict, n, agree: agree.length, evidence, share, scope });
}

const order = { CONTRADICTED: 0, SPLIT: 1, UNTESTABLE: 2, SUPPORTED: 3 };
rows.sort((a, b) => order[a.verdict] - order[b.verdict]);

for (const r of rows) {
  const weight = r.n === 0 ? 'no evidence' : r.n < 4 ? `weak: ${r.n} film(s)` : `${r.n} films`;
  console.log(`  ${r.verdict.padEnd(13)} ${r.c.id.padEnd(20)} ${r.agree}/${r.n} agree   (${weight}, ${r.scope === 'ours' ? 'OUR films' : 'reference films'})`);
  console.log(`      "${r.c.claim}"`);
  console.log(`      claimed ${expectation(r.c)} · source ${r.c.source}`);
  if (r.n) {
    const vals = r.evidence.map((x) => x.v).filter((x) => typeof x === 'number').sort((a, b) => a - b);
    if (vals.length) console.log(`      measured ${fmt(vals[0])} to ${fmt(vals[vals.length - 1])}, median ${fmt(vals[Math.floor(vals.length / 2)])}`);
    const against = r.evidence.filter((x) => !OPS[r.c.op](x.v, r.c)).slice(0, 4);
    if (against.length && r.verdict !== 'SUPPORTED')
      console.log(`      against: ${against.map((x) => `${x.name} ${fmt(x.v)}`).join(' · ')}`);
  }
  console.log('');
}

const bad = rows.filter((r) => r.verdict === 'CONTRADICTED');
if (bad.length) {
  console.log(`  ${bad.length} claim(s) the films CONTRADICT. Weighted down, not deleted: the corpus is ${films.length} films`);
  console.log(`  and proof may arrive with the next one. Either the doctrine is wrong and the doc should say`);
  console.log(`  what the films say, or the claim is missing a condition and should state it.\n`);
}
const weak = rows.filter((r) => r.n > 0 && r.n < 4);
if (weak.length) console.log(`  ${weak.length} verdict(s) rest on fewer than 4 films. Study more references before quoting them.\n`);
