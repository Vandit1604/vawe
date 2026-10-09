#!/usr/bin/env node
// harness/dev/see-truth.mjs: score today's measuring tools against fixtures whose properties are known by construction.
//   node harness/dev/see-truth.mjs [--only <fixture>] [--reuse] [--json]
// Each fixture is tests/fixtures/truth/<name>/page.html plus truth.json (the known values and the tolerances a good tool
// should meet). A fixture renders with harness/media/render-page.mjs in its default draft mode (960x540, 30 fps, silent;
// the sound fixture adds --audio; the look fixture is a final render). That is the render `vawe dev` runs, without the
// page checks, which cost minutes on a busy machine. The tools then run on the mp4 or the page and a table of
// measure | truth | measured | error | tolerance | pass/fail | tool is printed. --reuse keeps an mp4 newer than its page.
// A measure with no tool today is listed as "no tool"; a verb that is not on main yet is "not available".
// Fixtures live in tests/fixtures/truth/; mp4s, spec folders and PNGs go to out/see-truth/.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURES = path.join(ROOT, 'tests/fixtures/truth');
const OUT = path.join(ROOT, 'out/see-truth');
export const ORDER = ['cuts', 'flash', 'motion', 'eye', 'ground', 'look', 'type', 'sound'];
const EPS = 1e-9;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const r = (v, d = 3) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);

// ---------- rows ----------

/** One scored measure. Numbers pass inside the tolerance; strings pass when equal; a missing value fails. */
export function scoreRow({ fixture, measure, tool, truth, measured, tolerance }) {
  const base = { fixture, measure, tool, truth, tolerance: tolerance ?? null };
  const m = typeof truth === 'number' ? num(measured) : measured ?? null;
  if (m === null) return { ...base, measured: null, error: null, status: 'fail' };
  if (typeof truth !== 'number') return { ...base, measured: m, error: null, status: m === truth ? 'pass' : 'fail' };
  const error = m - truth;
  return { ...base, measured: m, error, status: Math.abs(error) <= (tolerance ?? 0) + EPS ? 'pass' : 'fail' };
}

/** A measure the repo has no tool for. */
export const noTool = (fixture, measure, truth, tolerance) => ({ fixture, measure, tool: 'no tool', truth, tolerance: tolerance ?? null, measured: null, error: null, status: 'no tool' });

/** A measure whose verb is not on main yet. */
export const notAvailable = (fixture, measure, truth, tool, tolerance) => ({ fixture, measure, tool, truth, tolerance: tolerance ?? null, measured: null, error: null, status: 'not available' });

const cell = (v) => (v == null ? '-' : typeof v === 'number' ? String(r(v, 3)) : String(v));
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));

/** The accuracy table as text: one line per row. */
export function formatTable(rows) {
  const head = ['measure', 'truth', 'measured', 'error', 'tolerance', 'result', 'tool'];
  const body = rows.map((x) => [`${x.fixture}: ${x.measure}`, cell(x.truth), cell(x.measured), x.error == null ? '-' : `${x.error >= 0 ? '+' : ''}${r(x.error, 3)}`,
    x.tolerance == null ? '-' : `+-${cell(x.tolerance)}`, x.status, x.tool]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const line = (cols) => cols.map((c, i) => pad(c, widths[i])).join(' | ').trimEnd();
  return [line(head), widths.map((w) => '-'.repeat(w)).join('-|-'), ...body.map(line)].join('\n');
}

/** Counts per fixture and in total: pass, fail, no tool, not available. */
export function summarise(rows) {
  const count = (list) => ({ pass: 0, fail: 0, 'no tool': 0, 'not available': 0, ...Object.fromEntries(Object.entries(Object.groupBy(list, (x) => x.status)).map(([k, v]) => [k, v.length])) });
  const byFixture = {};
  for (const f of new Set(rows.map((x) => x.fixture))) byFixture[f] = count(rows.filter((x) => x.fixture === f));
  return { total: count(rows), byFixture };
}

/** Per-fixture and total lines, then the three fixtures with the lowest pass share among measured rows. */
export function formatSummary(rows) {
  const { total, byFixture } = summarise(rows);
  const show = (c) => `pass ${c.pass}, fail ${c.fail}, no tool ${c['no tool']}, not available ${c['not available']}`;
  const lines = Object.entries(byFixture).map(([f, c]) => `${f}: ${show(c)}`);
  lines.push(`total: ${show(total)}`);
  const scored = Object.entries(byFixture).filter(([, c]) => c.pass + c.fail > 0).map(([f, c]) => [f, c.pass / (c.pass + c.fail)]);
  const weakest = scored.sort((a, b) => a[1] - b[1]).slice(0, 3).map(([f, s]) => `${f} ${Math.round(s * 100)}%`);
  lines.push(`weakest: ${weakest.join(', ')}`);
  return lines.join('\n');
}

// ---------- parsing today's text output ----------

/** `vawe velocity` summary: one entry per element with its position move. */
export function parseVelocity(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split('\n')) {
    const head = /^\d+\.\s+(.*)$/.exec(line);
    if (head) { cur = { label: head[1], position: { moves: false } }; out.push(cur); continue; }
    const pos = /^\s+position:\s+(.*)$/.exec(line);
    if (!pos || !cur) continue;
    const body = pos[1];
    if (/^still/.test(body)) continue;
    const g = (re) => { const m = re.exec(body); return m ? m[1] : null; };
    const over = g(/overshoots its rest by (\d+(?:\.\d+)?)%/);
    cur.position = { moves: true, start: num(Number(g(/starts (\d+(?:\.\d+)?) s/))), peakPxPerS: num(Number(g(/\((\d+) px\/s\)/))),
      settle: g(/settles (\d+(?:\.\d+)?) s/) == null ? null : Number(g(/settles (\d+(?:\.\d+)?) s/)),
      overshootPct: over !== null ? Number(over) : /no overshoot/.test(body) ? 0 : null,
      shape: g(/(?:overshoot[^,]*|overshoot not judged[^,]*),\s*([a-z -]+)$/) ?? g(/,\s*([a-z-]+(?: [a-z-]+)?)$/) };
  }
  return out;
}

/** `vawe strip --at` motion line: start, peak, settle and the burst count. */
export function parseStrip(text) {
  const m = /motion: starts (\d+(?:\.\d+)?) s, peaks (\d+(?:\.\d+)?) at (\d+(?:\.\d+)?) s, settles (\d+(?:\.\d+)?) s; (\d+) burst/.exec(String(text));
  return m ? { start: Number(m[1]), settle: Number(m[4]), bursts: Number(m[5]) } : null;
}

/** `vawe audio --at a,b` : for each probed second, the cues sounding with the seconds into each. */
export function parseAudioAt(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split('\n')) {
    const at = /^(\d+(?:\.\d+)?) s\s+(?:world|no cue)/.exec(line);
    if (at) { cur = { at: Number(at[1]), cues: [] }; out.push(cur); continue; }
    const cue = /^\s+([a-z0-9-]+): (\d+(?:\.\d+)?) s into/.exec(line);
    if (cue && cur) cur.cues.push({ voice: cue[1], into: Number(cue[2]) });
  }
  return out;
}

/** The integrated loudness of `vawe audio`: "mix as written: -20.6 LUFS". */
export function parseLufs(text) {
  const m = /(-?\d+(?:\.\d+)?) LUFS/.exec(String(text));
  return m ? Number(m[1]) : null;
}

// ---------- maths ----------

/** Display luma 0..255 of a grey whose CIE L* is given. */
export function lumaOfL(L) {
  const f = (L + 16) / 116;
  const y = f > 6 / 29 ? f ** 3 : (f - 16 / 116) / 7.787;
  const enc = y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055;
  return 255 * enc;
}

export const deltaE76 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Distance in frame heights between two 0..1 frame positions. */
export const heights = (a, b, aspect) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);

const nearest = (list, value, key = (x) => x) => list.reduce((best, x) => (best === undefined || Math.abs(key(x) - value) < Math.abs(key(best) - value) ? x : best), undefined);

// ---------- row builders, one per fixture ----------
// Each takes truth.json and the parsed tool results (null when a tool failed) and returns rows. Pure.

export function cutsRows(t, { spec, timeline }) {
  const F = 'cuts', tol = t.tolerance;
  const rows = [];
  const cuts = spec?.cuts ?? null;
  t.truth.cuts.forEach((c, i) => rows.push(scoreRow({ fixture: F, measure: `cut ${i + 1} second`, tool: 'vawe spec (cuts)', truth: c, measured: cuts?.[i]?.t, tolerance: tol.cutSeconds })));
  rows.push(scoreRow({ fixture: F, measure: 'world count', tool: 'vawe spec (shots)', truth: t.truth.worlds.length, measured: spec?.shots?.length, tolerance: tol.worldCount }));
  rows.push(scoreRow({ fixture: F, measure: 'world count', tool: 'vawe timeline', truth: t.truth.worlds.length, measured: timeline?.worlds?.length, tolerance: tol.worldCount }));
  for (const id of t.truth.durationWorlds) {
    const i = t.truth.worlds.findIndex((w) => w.id === id);
    const w = t.truth.worlds[i];
    const dur = w.end - w.start;
    const shot = spec?.shots?.find((s) => Math.abs(s.t0 - w.start) <= tol.worldSeconds);
    const tl = timeline?.worlds?.find((x) => x.id === id);
    rows.push(scoreRow({ fixture: F, measure: `world ${id} duration`, tool: 'vawe spec (shots)', truth: r(dur), measured: shot ? shot.t1 - shot.t0 : null, tolerance: tol.worldSeconds }));
    rows.push(scoreRow({ fixture: F, measure: `world ${id} duration`, tool: 'vawe timeline', truth: r(dur), measured: tl ? tl.end - tl.start : null, tolerance: tol.worldSeconds }));
  }
  return rows;
}

export function flashRows(t, { spec }) {
  const F = 'flash', tol = t.tolerance, fps = t.fps;
  const rows = [];
  t.truth.flashes.forEach((fl, i) => {
    const tag = `flash ${i + 1}`;
    const cut = spec ? nearest(spec.cuts, fl.start, (c) => c.t) : undefined;
    const startOk = cut && Math.abs(cut.t - fl.start) <= tol.startSeconds * 2 ? cut : undefined;
    const next = startOk ? spec.cuts.find((c) => c.frame > startOk.frame) : undefined;
    const shot = startOk ? spec.shots.find((s) => s.f0 === startOk.frame) : undefined;
    const L = shot ? spec.colour?.perShot?.find((p) => p.shot === shot.index)?.dominant?.[0] : undefined;
    rows.push(scoreRow({ fixture: F, measure: `${tag} start second`, tool: 'vawe spec (cuts, derived)', truth: fl.start, measured: startOk?.t, tolerance: tol.startSeconds }));
    rows.push(scoreRow({ fixture: F, measure: `${tag} length in frames`, tool: 'vawe spec (cut pair, derived)', truth: fl.frames, measured: startOk && next ? next.frame - startOk.frame : null, tolerance: tol.lengthFrames }));
    rows.push(scoreRow({ fixture: F, measure: `${tag} peak mean luma`, tool: 'vawe spec (shot colour, derived)', truth: fl.peakLuma, measured: L == null ? null : lumaOfL(L), tolerance: tol.peakLuma }));
  });
  rows.push(noTool(F, 'flash event (one exposure flash, not two cuts)', 2));
  return rows;
}

export function motionRows(t, { velocity, spec, stripA, stripB }) {
  const F = 'motion', tol = t.tolerance, { a, b } = t.truth;
  const vel = (id) => velocity?.find((e) => e.label.endsWith(`#${id}`))?.position;
  const el = (axisStart) => spec?.shots?.flatMap((s) => s.elements).find((e) => e.axis === 'x' && Math.abs(e.start.t - axisStart) <= 0.1);
  const eA = el(a.start), eB = el(b.start);
  const rows = [
    scoreRow({ fixture: F, measure: 'A start second', tool: 'vawe velocity (page)', truth: a.start, measured: vel('a')?.start, tolerance: tol.startSeconds }),
    scoreRow({ fixture: F, measure: 'A settle second', tool: 'vawe velocity (page)', truth: a.settle, measured: vel('a')?.settle, tolerance: tol.settleSeconds }),
    scoreRow({ fixture: F, measure: 'A overshoot (points of travel)', tool: 'vawe velocity (page)', truth: a.overshootPct, measured: vel('a')?.overshootPct, tolerance: tol.overshootPoints }),
    scoreRow({ fixture: F, measure: 'B start second', tool: 'vawe velocity (page)', truth: b.start, measured: vel('b')?.start, tolerance: tol.startSeconds }),
    scoreRow({ fixture: F, measure: 'B settle second (end of move)', tool: 'vawe velocity (page)', truth: b.settle, measured: vel('b')?.settle, tolerance: tol.settleSeconds }),
    scoreRow({ fixture: F, measure: 'B peak speed (css px/s)', tool: 'vawe velocity (page)', truth: b.peakCssPxPerS, measured: vel('b')?.peakPxPerS, tolerance: b.peakCssPxPerS * tol.speedRatio }),
    scoreRow({ fixture: F, measure: 'B ease shape', tool: 'vawe velocity (page)', truth: b.shape, measured: vel('b')?.shape }),
    scoreRow({ fixture: F, measure: 'A start second', tool: 'vawe spec (elements)', truth: a.start, measured: eA?.start?.t, tolerance: tol.startSeconds }),
    scoreRow({ fixture: F, measure: 'A settle second', tool: 'vawe spec (elements)', truth: a.settle, measured: eA?.land?.t, tolerance: tol.settleSeconds }),
    scoreRow({ fixture: F, measure: 'A overshoot (points of travel)', tool: 'vawe spec (elements)', truth: a.overshootPct, measured: eA?.overshoot == null ? null : (eA.overshoot - 1) * 100, tolerance: tol.overshootPoints }),
    scoreRow({ fixture: F, measure: 'A rest x (video px)', tool: 'vawe spec (elements)', truth: a.restVideoX, measured: eA?.to?.[0], tolerance: tol.restPx }),
    scoreRow({ fixture: F, measure: 'B start second', tool: 'vawe spec (elements)', truth: b.start, measured: eB?.start?.t, tolerance: tol.startSeconds }),
    scoreRow({ fixture: F, measure: 'B settle second (end of move)', tool: 'vawe spec (elements)', truth: b.settle, measured: eB?.land?.t, tolerance: tol.settleSeconds }),
    scoreRow({ fixture: F, measure: 'B ease shape', tool: 'vawe spec (elements)', truth: b.shape, measured: eB?.easing?.class }),
    scoreRow({ fixture: F, measure: 'A start second', tool: 'vawe strip (mp4)', truth: a.start, measured: stripA?.start, tolerance: tol.startSeconds }),
    scoreRow({ fixture: F, measure: 'A settle second', tool: 'vawe strip (mp4)', truth: a.settle, measured: stripA?.settle, tolerance: tol.settleSeconds }),
    scoreRow({ fixture: F, measure: 'A bursts', tool: 'vawe strip (mp4)', truth: a.bursts, measured: stripA?.bursts, tolerance: tol.bursts }),
    scoreRow({ fixture: F, measure: 'B start second', tool: 'vawe strip (mp4)', truth: b.start, measured: stripB?.start, tolerance: tol.startSeconds }),
    scoreRow({ fixture: F, measure: 'B settle second (end of move)', tool: 'vawe strip (mp4)', truth: b.settle, measured: stripB?.settle, tolerance: tol.settleSeconds }),
    noTool(F, 'A overshoot from vawe onion (image only, prints no number)', a.overshootPct, tol.overshootPoints),
  ];
  return rows;
}

export function eyeRows(t, { spec }) {
  const F = 'eye', tol = t.tolerance, asp = t.aspect;
  const rows = [];
  const per = spec?.eye?.perShot ?? [];
  const shot = (t0) => per.find((p) => Math.abs(p.t0 - t0) <= 0.05);
  t.truth.shots.forEach((s, i) => {
    const m = shot(s.t0);
    for (const end of ['start', 'end']) {
      const got = m?.[end];
      rows.push(scoreRow({ fixture: F, measure: `shot ${i + 1} eye ${end} (frame heights from truth)`, tool: 'vawe spec (eye)', truth: 0, measured: got ? heights(got, s[end], asp) : null, tolerance: tol.eyeHeights }));
    }
  });
  t.truth.shots.forEach((s, i) => {
    rows.push(scoreRow({ fixture: F, measure: `shot ${i + 1} eye travel inside the shot (frame heights)`, tool: 'vawe spec (eye)', truth: r(heights(s.start, s.end, asp)), measured: shot(s.t0)?.travel, tolerance: tol.travelHeights }));
  });
  for (let i = 0; i + 1 < t.truth.shots.length; i++) {
    const b = t.truth.shots[i + 1];
    const jump = spec?.eye?.cuts?.find((c) => Math.abs(c.at - b.t0) <= 0.05);
    rows.push(scoreRow({ fixture: F, measure: `cut ${i + 1} eye jump (frame heights)`, tool: 'vawe spec (eye)', truth: r(heights(t.truth.shots[i].end, b.start, asp)), measured: jump?.jump, tolerance: tol.travelHeights }));
  }
  return rows;
}

export function groundRows(t, { spec }) {
  const F = 'ground', tol = t.tolerance;
  const rows = [];
  const per = spec?.ground?.perShot ?? [];
  const shot = (t0) => per.find((p) => Math.abs(p.t0 - t0) <= 0.05);
  t.truth.shots.forEach((s, i) => {
    const m = shot(s.t0);
    rows.push(scoreRow({ fixture: F, measure: `world ${i + 1} ground colour (deltaE from truth)`, tool: 'vawe spec (ground)', truth: 0, measured: m?.start ? deltaE76(m.start, s.lab) : null, tolerance: tol.deltaE }));
  });
  t.truth.cutDeltaE.forEach((de, i) => {
    const cut = spec?.ground?.cuts?.find((c) => Math.abs(c.at - t.truth.shots[i + 1].t0) <= 0.05);
    rows.push(scoreRow({ fixture: F, measure: `cut ${i + 1} deltaE`, tool: 'vawe spec (ground)', truth: de, measured: cut?.dE, tolerance: tol.deltaE }));
  });
  const drift = t.truth.shots.at(-1);
  const d = shot(drift.t0);
  rows.push(scoreRow({ fixture: F, measure: 'light drift of world 4 (L change)', tool: 'vawe spec (ground)', truth: drift.driftL, measured: d?.lightDrift == null ? null : Math.abs(d.lightDrift), tolerance: tol.driftL }));
  rows.push(scoreRow({ fixture: F, measure: 'still worlds report no drift (worlds 1 to 3)', tool: 'vawe spec (ground)', truth: 0, measured: [0, 1, 2].every((i) => shot(t.truth.shots[i].t0)) ? Math.max(...[0, 1, 2].map((i) => Math.abs(shot(t.truth.shots[i].t0).lightDrift ?? 0))) : null, tolerance: tol.driftL }));
  return rows;
}

export function typeRows(t, { spec }) {
  const F = 'type', tol = t.tolerance;
  const rows = [];
  const fps = spec?.fps ?? t.fps;
  const words = spec ? spec.shots.flatMap((s) => s.text ?? []) : null;
  const find = (text) => words?.find((w) => String(w.text).toUpperCase().replace(/[^A-Z]/g, '') === text);
  rows.push(scoreRow({ fixture: F, measure: 'word count', tool: 'vawe spec (words, OCR)', truth: t.truth.words.length, measured: words?.length, tolerance: tol.wordCount }));
  for (const w of t.truth.words) {
    const m = find(w.text);
    rows.push(scoreRow({ fixture: F, measure: `${w.text} in second`, tool: 'vawe spec (words, OCR)', truth: w.in, measured: m ? m.f0 / fps : null, tolerance: tol.wordSeconds }));
    rows.push(scoreRow({ fixture: F, measure: `${w.text} out second`, tool: 'vawe spec (words, OCR)', truth: w.out, measured: m ? m.f1 / fps : null, tolerance: tol.wordSeconds }));
    rows.push(scoreRow({ fixture: F, measure: `${w.text} cap height (fraction of frame)`, tool: 'vawe spec (words, OCR)', truth: t.truth.capHeightFraction, measured: m && spec?.media?.height ? m.boxHeightPx / spec.media.height : null, tolerance: tol.capHeightFraction }));
  }
  return rows;
}

export function soundRows(t, { audioAt, lufs, timeline, spec }) {
  const F = 'sound', tol = t.tolerance;
  const rows = [];
  t.truth.cues.forEach((c, i) => {
    const probe = audioAt?.find((p) => Math.abs(p.at - (c.at + PROBE_OFFSET)) < 1e-6);
    const cue = probe?.cues.find((x) => x.voice === c.voice);
    rows.push(scoreRow({ fixture: F, measure: `${c.voice} cue second`, tool: 'vawe audio --at (page)', truth: c.at, measured: cue ? probe.at - cue.into : null, tolerance: tol.cueSeconds }));
    rows.push(scoreRow({ fixture: F, measure: `${c.voice} cue second`, tool: 'vawe timeline (page)', truth: c.at, measured: timeline?.cues?.[i]?.voice === c.voice ? timeline.cues[i].at : null, tolerance: tol.cueSeconds }));
    const hit = spec?.audio?.hits ? nearest(spec.audio.hits, c.at, (h) => h.t ?? h.frame / spec.fps) : undefined;
    rows.push(scoreRow({ fixture: F, measure: `${c.voice} cue second`, tool: 'vawe spec (audio hits of the mp4)', truth: c.at, measured: hit ? hit.t ?? hit.frame / spec.fps : null, tolerance: tol.cueSeconds }));
  });
  rows.push(scoreRow({ fixture: F, measure: 'integrated loudness (LUFS)', tool: 'vawe audio --waveform (page)', truth: t.truth.lufs, measured: lufs, tolerance: tol.lufs }));
  return rows;
}

/** Seconds after a cue start at which `vawe audio --at` probes it. */
export const PROBE_OFFSET = 0.1;

export function lookRows(t, { available }) {
  const F = 'look', tol = t.tolerance, v = t.truth;
  const make = available ? (m, truth, tolerance) => ({ ...noTool(F, m, truth, tolerance), tool: 'look verb found, not wired into the scorer' })
    : (m, truth, tolerance) => notAvailable(F, m, truth, 'vawe look / zoom', tolerance);
  return [
    make('bloom radius (css px, gaussian sigma)', v.bloomSigmaPx, tol.bloomPx),
    make('red vs blue channel offset (css px)', v.channelOffsetPx, tol.channelOffsetPx),
    make('RGB stripe period (css px)', v.stripePeriodPx, tol.stripePeriodPx),
  ];
}

// ---------- running the tools ----------

const sh = (cmd, args, opts = {}) => {
  const res = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26, ...opts });
  return { ok: res.status === 0, text: `${res.stdout ?? ''}${res.stderr ?? ''}` };
};
const vawe = (...args) => sh('node', ['bin/vawe', ...args]);
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const loadTruth = (name) => JSON.parse(fs.readFileSync(path.join(FIXTURES, name, 'truth.json'), 'utf8'));
const pageOf = (name) => path.join('tests/fixtures/truth', name, 'page.html');

function render(name, { reuse, audio, final }) {
  fs.mkdirSync(OUT, { recursive: true });
  const mp4 = path.join('out/see-truth', `${name}.mp4`);
  const fresh = fs.existsSync(path.join(ROOT, mp4)) && fs.statSync(path.join(ROOT, mp4)).mtimeMs > fs.statSync(path.join(ROOT, pageOf(name))).mtimeMs;
  if (reuse && fresh) return mp4;
  const res = sh('node', ['harness/media/render-page.mjs', pageOf(name), mp4, ...(audio ? ['--audio'] : []), ...(final ? ['--final'] : [])]);
  if (!res.ok) { console.error(`render of ${name} failed:\n${res.text.split('\n').slice(-8).join('\n')}`); return null; }
  return mp4;
}

function specOf(name, mp4, ocr) {
  const dir = path.join('out/see-truth', `${name}-spec`);
  if (!mp4) return null;
  const res = vawe('spec', mp4, '--out', dir, '--no-cache', ...(ocr ? [] : ['--no-ocr']));
  if (!res.ok) console.error(`vawe spec on ${name} failed:\n${res.text.split('\n').slice(-6).join('\n')}`);
  return readJson(path.join(ROOT, dir, 'spec.json'));
}

const timelineOf = (name) => { const res = vawe('timeline', pageOf(name), '--json'); try { return JSON.parse(res.text.slice(0, res.text.lastIndexOf('}') + 1)); } catch { return null; } };

const verbs = () => new Set([...fs.readFileSync(path.join(ROOT, 'harness/cli/verbs.mjs'), 'utf8').matchAll(/name:\s*'([a-z-]+)'/g)].map((m) => m[1]));

const FIXTURE_RUN = {
  cuts: (t, o) => { const mp4 = render('cuts', o); return cutsRows(t, { spec: specOf('cuts', mp4), timeline: timelineOf('cuts') }); },
  flash: (t, o) => { const mp4 = render('flash', o); return flashRows(t, { spec: specOf('flash', mp4) }); },
  motion: (t, o) => {
    const mp4 = render('motion', o);
    const { a, b } = t.truth;
    const vel = vawe('velocity', pageOf('motion'), '--at', '1.5', '--span', '3', '--out', 'out/see-truth/velocity');
    const strip = (s) => (mp4 ? parseStrip(vawe('strip', mp4, '--at', String(s.at), '--span', String(s.span), '--out', 'out/see-truth/strip').text) : null);
    return motionRows(t, { velocity: parseVelocity(vel.text), spec: specOf('motion', mp4), stripA: strip(a.strip), stripB: strip(b.strip) });
  },
  eye: (t, o) => { const mp4 = render('eye', o); return eyeRows(t, { spec: specOf('eye', mp4) }); },
  ground: (t, o) => { const mp4 = render('ground', o); return groundRows(t, { spec: specOf('ground', mp4) }); },
  type: (t, o) => { const mp4 = render('type', o); return typeRows(t, { spec: specOf('type', mp4, true) }); },
  sound: (t, o) => {
    const mp4 = render('sound', { ...o, audio: true });
    const probes = t.truth.cues.map((c) => r(c.at + PROBE_OFFSET, 3)).join(',');
    const at = vawe('audio', pageOf('sound'), '--at', probes);
    const wave = vawe('audio', pageOf('sound'), '--waveform', '--out', 'out/see-truth/sound-wave.png');
    return soundRows(t, { audioAt: parseAudioAt(at.text), lufs: parseLufs(wave.text), timeline: timelineOf('sound'), spec: specOf('sound', mp4) });
  },
  look: (t) => {
    const names = verbs();
    return lookRows(t, { available: names.has('look') || names.has('zoom') });
  },
};

export async function main(argv) {
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
  if (only && !FIXTURE_RUN[only]) { console.error(`unknown fixture ${only}; known: ${ORDER.join(', ')}`); return 2; }
  const opts = { reuse: argv.includes('--reuse') };
  const started = Date.now();
  const rows = [];
  for (const name of ORDER) {
    if (only && only !== name) continue;
    console.error(`see-truth: ${name}`);
    rows.push(...FIXTURE_RUN[name](loadTruth(name), opts));
  }
  if (argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else console.log(`${formatTable(rows)}\n\n${formatSummary(rows)}\nrun time: ${Math.round((Date.now() - started) / 1000)} s`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(await main(process.argv.slice(2)));
