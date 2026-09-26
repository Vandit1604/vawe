import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseStoryboard } from './storyboard-parse.mjs';
import { writeReceipt } from '../lib/receipt.mjs';
import { DIRECTIONS } from './directions.mjs';   // the table moved so the quiz can read it too
import { beatStarts } from '../../quality/gates/beats-of.mjs';   // the repo's ONE beat model, not a second one
import { SCENE_DIR } from '../../quality/gates/paths.mjs';
import { expandThemeFile } from '../lib/theme-load.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const SB = args.find((a) => !a.startsWith('--'));
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const STRICT = args.includes('--strict');
const N = Math.max(2, Math.min(7, +flag('--n', 3) || 3));
const SEED = Math.abs(Math.trunc(+flag('--seed', 0) || 0));
if (!SB || !fs.existsSync(SB)) {
  console.error('usage: concept <STORYBOARD.md> [--n 3] [--seed 0] [--tail-min 2] [--strict]');
  process.exit(2);
}

const OUTDIR = 'films/scene/_concepts';
const CLOSE = 0.55;                 // similarity.mjs's own "too close" line; not a new number
const IMPROBABLE = 0.10;            // the tail line. Where the number comes from: engine-doctrine/CRAFT/SELECTION.md
const TAIL_MIN = Math.max(2, +flag('--tail-min', 2) || 2);


const PICK = flag('--pick', null);
if (PICK) {
  const src = path.join(OUTDIR, `${path.basename(SB).replace(/\.storyboard\.md$/i, '').replace(/\.md$/i, '')}-${PICK}.storyboard.md`);
  if (!fs.existsSync(src)) {
    console.error(`✗ no such direction: ${src}\n  run \`make concept SB=${SB}\` first, or check the slug.`);
    process.exit(2);
  }
  const dir = DIRECTIONS.find((d) => d.slug === PICK);
  if (fs.existsSync(SB)) {
    fs.copyFileSync(SB, `${SB}.prev`);
    console.log(`  previous storyboard kept at ${SB}.prev`);
  }
  fs.copyFileSync(src, SB);
  writeReceipt('concept', SB, {
    picked: PICK, thread: dir?.thread, preset: dir?.preset, why: dir?.why,
    rejected: DIRECTIONS.filter((d) => d.slug !== PICK).map((d) => ({ slug: d.slug, thread: d.thread, preset: d.preset, why: d.why })),
  });
  console.log(`  ✓ ${PICK} promoted → ${SB}`);
  console.log(`    thread ${dir?.thread} · look ${dir?.preset}`);
  console.log(`\n  next: make treatment SB=${SB}   (it reads which directions you turned down)\n`);
  process.exit(0);
}

const sb = parseStoryboard(fs.readFileSync(SB, 'utf8'));
if (!sb.beats.length) { console.error(`✗ no beats in ${SB}`); process.exit(1); }
const DUR = sb.duration || sb.beats.reduce((a, b) => a + (b.duration || 3), 0) || 15;
const NAME = path.basename(SB).replace(/\.storyboard\.md$/i, '').replace(/\.md$/i, '');
const strip = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function redistribute(beats, target) {
  if (target === beats.length) return beats.map((b) => ({ ...b, _new: false }));
  const out = [];
  if (target < beats.length) {
    const per = beats.length / target;
    for (let i = 0; i < target; i++) {
      const group = beats.slice(Math.round(i * per), Math.max(Math.round((i + 1) * per), Math.round(i * per) + 1));
      out.push({
        name: group[0].name,
        onscreen: group.flatMap((g) => g.onscreen || []),
        narration: group.map((g) => strip(g.narration)).filter(Boolean).join(' '),
        picture: group[0].picture, why: group[0].why, _new: false,
        _merged: group.length > 1 ? group.length : 0,
      });
    }
    return out;
  }
  for (let i = 0; i < target; i++) {
    const src = beats[Math.floor((i * beats.length) / target)];
    const first = Math.floor(((i - 1) * beats.length) / target) !== Math.floor((i * beats.length) / target);
    out.push(first || i === 0
      ? { ...src, _new: false }
      : { name: `${src.name} (continued)`, onscreen: [], narration: '', picture: '', why: '', _new: true });
  }
  return out;
}

const ARCS = {
  'transforming object': ['build', 'build', 'proof'],
  'unfinished sentence': ['build', 'problem', 'build', 'proof'],
  'camera travel': ['build', 'proof', 'build'],
  'counter or progress': ['proof', 'proof', 'build'],
  'match cut': ['build', 'proof'],
  'open question': ['problem', 'build', 'problem', 'proof'],
  rhythm: ['proof', 'build', 'proof', 'problem'],
};
const typeAt = (i, n, thread) => {
  if (i === 0) return 'hook';
  if (i === n - 1) return 'payoff';
  const arc = ARCS[thread] || ['build', 'problem', 'proof'];
  return arc[(i - 1) % arc.length];
};

function buildOption(dir) {
  const count = Math.max(3, Math.round(DUR / dir.pace));
  const span = +(DUR / count).toFixed(2);
  const beats = redistribute(sb.beats, count);
  const preset = JSON.parse(fs.readFileSync(`directions/${dir.preset}.json`, 'utf8'));

  const lines = [];
  lines.push('---');
  lines.push(`message: ${sb.message || '<the one sentence this film has to land>'}`);
  lines.push(`audience: ${sb.audience || '<who this is for>'}`);
  lines.push(`arc: ${sb.arc || '<the shape, in one line>'}`);
  lines.push(`thread: ${dir.thread}`);
  lines.push(`object: ${dir.thread === 'transforming object' ? (sb.object || '<the prop that carries it>') : `none, the thread is ${dir.thread}`}`);
  lines.push(`duration: ${DUR}s`);
  lines.push(`format: ${sb.format || '1080x1920'}`);
  lines.push(`concept: ${dir.slug} · ${dir.preset} (${preset.dominance})`);
  lines.push('---');
  lines.push('');
  lines.push(`<!-- DIRECTION: ${dir.slug}`);
  lines.push(`     thread ${dir.thread} · ${count} beats at ~${span}s · look ${dir.preset} (${preset.dominance})`);
  lines.push(`     ${dir.why}`);
  lines.push(`     ${preset.desc}`);
  lines.push('     Generated by harness/author/concept.mjs from ' + path.basename(SB) + '. The STRUCTURE and the');
  lines.push('     LOOK are decisions this direction makes; every <…> is a decision it deliberately leaves');
  lines.push('     to you, because a tool that invents copy produces options that are all wrong alike. -->');
  lines.push('');

  let t = 0;
  beats.forEach((b, i) => {
    const end = +(t + span).toFixed(2);
    const type = typeAt(i, count, dir.thread);
    lines.push(`## Beat ${i + 1}: ${b._new ? '<name this beat>' : strip(b.name).replace(/^Beat \d+:\s*/, '')} (${t}s-${end}s)`);
    lines.push(`- type: ${type}`);
    lines.push(`- object: ${dir.thread === 'transforming object' ? '<what shape the prop is in here>' : `<what carries the ${dir.thread} at this beat>`}`);
    lines.push(`- picture: ${b._new ? '<what this beat SHOWS, not what it says>' : strip(b.picture) || '<what this beat SHOWS>'}`);
    lines.push(`- mechanism: <the motion (make arsenal Q="…" · engine-doctrine/EFFECTS.md)>`);
    lines.push(`- becomes: <the X becomes the Y at this junction>`);
    lines.push(`- onscreen: ${(b.onscreen || []).map(strip).filter(Boolean).join(' | ') || '<the words on screen>'}`);
    if (strip(b.narration)) lines.push(`- narration: ${strip(b.narration)}`);
    lines.push(`- why: ${b._new ? '<why this beat earns its seconds>' : strip(b.why) || '<why this beat earns its seconds>'}`);
    lines.push(`- duration: ${span}s`);
    lines.push('');
    t = end;
  });

  const shape = Array.from({ length: count }, (_, i) => typeAt(i, count, dir.thread));
  const pictured = beats.filter((b) => !b._new && strip(b.picture)).length;

  return { dir, count, span, preset, md: lines.join('\n') + '\n',
    silhouette: `${count} beats · ${shape.join('>')} · ${pictured}/${count} pictured`,
    placeholders: (lines.join('\n').match(/<[^>]+>/g) || []).length };
}

const lum = (hex) => {
  const h = String(hex).replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const ch = (i) => parseInt(n.slice(i, i + 2), 16) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(ch(0)) + 0.7152 * f(ch(2)) + 0.0722 * f(ch(4));
};
const GENERATED = '<!-- DIRECTION:';   // the marker buildOption writes; see the header block it emits

function libraryEvidence() {
  const spans = [];
  let dark = 0, light = 0;
  const dir = path.join(ROOT, SCENE_DIR);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json') || /^(schema|sample)/.test(f)) continue;
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    try {
      const { beats, duration } = beatStarts(data);
      if (beats.length >= 2) {
        const gaps = [];
        for (let i = 1; i < beats.length; i++) gaps.push(beats[i] - beats[i - 1]);
        gaps.push(Math.max(0.2, duration - beats[beats.length - 1]));
        gaps.sort((a, b) => a - b);
        spans.push(gaps[gaps.length >> 1]);
      }
    } catch { /* a scene the beat model cannot read is not evidence either way */ }
    try {
      const bg = expandThemeFile(JSON.parse(fs.readFileSync(path.join(ROOT, 'themes', `${data.theme}.json`), 'utf8')))?.palette?.bg;
      if (typeof bg === 'string' && bg.startsWith('#')) (lum(bg) < 0.2 ? dark++ : light++);
    } catch { /* an inline or missing theme has no measurable dominance */ }
  }

  const threads = new Map();
  let corpus = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.storyboard.md')) {
        const src = fs.readFileSync(p, 'utf8');
        if (src.includes(GENERATED)) continue;
        const fm = /^---\n([\s\S]*?)\n---/.exec(src);
        if (!fm) continue;
        const named = /^thread:\s*(.+)$/mi.exec(fm[1]);
        const obj = /^object:\s*(.+)$/mi.exec(fm[1]);
        let t = named ? named[1].trim() : (obj && !/^(none|<)/i.test(obj[1].trim()) ? 'transforming object' : null);
        if (!t || /^none/i.test(t)) continue;
        corpus++;
        threads.set(t, (threads.get(t) || 0) + 1);
      }
    }
  };
  walk(ROOT);

  return { spans, dark, light, threads, corpus, scenes: spans.length };
}

function requireEvidence(ev) {
  const missing = [];
  if (ev.scenes < 20) missing.push(`only ${ev.scenes} shipped scene(s) in ${SCENE_DIR} carry readable beats; the pace evidence would be noise`);
  if (!ev.dark && !ev.light) missing.push('no shipped scene resolved to a theme with a palette.bg, so dominance cannot be measured');
  if (!ev.corpus) missing.push('no hand-written storyboard declares a thread, so thread frequency cannot be measured');
  if (missing.length) {
    console.error('\n  ✗ [unscorable] concept cannot score this round, and will not ship an unscored one:');
    for (const m of missing) console.error(`      ${m}`);
    console.error('');
    process.exit(3);
  }
}

const TELLS = [
  { id: 'habitual-pace', doc: 'engine-doctrine/CRAFT/FILM-STRUCTURE.md',
    anchor: 'Our films sit at 2.5 to 4 seconds a beat',
    says: 'this library already cuts at 2.5 to 4s, so that pace is the house habit',
    hit: (o) => o.dir.pace >= 2.5 && o.dir.pace <= 4 },
  { id: 'the-free-device', doc: 'engine-doctrine/CRAFT/FILM-STRUCTURE.md',
    anchor: 'A keyed `w`/`h` on a rectangle passes. A motif does not.',
    says: 'the transforming object is the device the tooling made free, so it is the one reached for first',
    hit: (o) => o.dir.thread === 'transforming object' },
  { id: 'slideshow-shape', doc: 'AGENTS.md',
    anchor: 'plain-slideshow',
    says: 'few beats over a FULL runtime is the shape the ambition floor exists to catch',
    hit: (o) => o.count <= 4 && DUR >= 10 },
];
for (const t of TELLS) {
  const src = fs.readFileSync(path.join(ROOT, t.doc), 'utf8');
  if (!src.includes(t.anchor)) {
    console.error(`\n  ✗ [tell-lost-its-source] the tell "${t.id}" cites ${t.doc} for:\n      "${t.anchor}"\n` +
      '      That sentence is no longer there. Re-read the doc and update the tell, or drop it. A scorer\n' +
      '      enforcing a rule its own source has dropped is scoring from memory.\n');
    process.exit(3);
  }
}

const PACE_BANDS = [1.5, 2.0, 2.5, 4.0];
const bandOf = (pace) => PACE_BANDS.findIndex((b) => pace < b) + 1 || PACE_BANDS.length + 1;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function scoreRound(round, ev) {
  const lightShare = ev.light / (ev.light + ev.dark);
  return round.map((o) => {
    const paceEcho = ev.spans.filter((s) => s >= o.dir.pace * 0.75 && s <= o.dir.pace * 1.25).length / ev.spans.length;
    const share = o.preset.dominance === 'light' ? lightShare : 1 - lightShare;
    const lookEcho = clamp01((share - 0.5) * 2);
    const threadEcho = (ev.threads.get(o.dir.thread) || 0) / ev.corpus;
    const libraryEcho = 0.40 * paceEcho + 0.30 * lookEcho + 0.30 * threadEcho;

    const others = round.filter((x) => x !== o);
    const roundEcho = others.length
      ? others.reduce((a, x) => {
        const shared = (x.count === o.count ? 1 : 0)
          + (x.preset.dominance === o.preset.dominance ? 1 : 0)
          + (bandOf(x.dir.pace) === bandOf(o.dir.pace) ? 1 : 0);
        return a + (shared >= 2 ? shared / 3 : 0);
      }, 0) / others.length
      : 0;

    const tells = TELLS.filter((t) => t.hit(o));
    const p = clamp01(0.02 + 0.50 * libraryEcho + 0.20 * roundEcho + 0.28 * (tells.length / TELLS.length));
    return { ...o, p, paceEcho, lookEcho, threadEcho, roundEcho, tells };
  });
}

const combinations = (n, k) => {
  const out = [];
  const walk = (start, acc) => {
    if (acc.length === k) { out.push(acc.slice()); return; }
    for (let i = start; i < n; i++) { acc.push(i); walk(i + 1, acc); acc.pop(); }
  };
  walk(0, []);
  return out;
};
const keyOf = (ids, seed) => {
  let h = (2166136261 ^ seed) >>> 0;
  for (const i of ids) { h = Math.imul(h ^ (i + 1), 16777619) >>> 0; }
  return h;
};

function chooseRound(all, ev) {
  const rejected = [];
  const candidates = combinations(all.length, N)
    .map((ids) => ({ ids, key: keyOf(ids, SEED), first: ids.every((v, i) => v === i) }))
    .sort((a, b) => (b.first - a.first) || (a.key - b.key) || (a.ids.join() < b.ids.join() ? -1 : 1));

  let best = null;
  for (const c of candidates) {
    const scored = scoreRound(c.ids.map((i) => all[i]), ev);
    const label = scored.map((o) => o.dir.slug).join(', ');
    const tail = scored.filter((o) => o.p < IMPROBABLE);

    const twins = [];
    for (let i = 0; i < scored.length; i++) for (let j = i + 1; j < scored.length; j++) {
      if (scored[i].silhouette === scored[j].silhouette) twins.push([scored[i], scored[j]]);
    }
    if (twins.length) {
      rejected.push(`${label}: ${twins[0][0].dir.slug} and ${twins[0][1].dir.slug} have one silhouette (${twins[0][0].silhouette}), so the round holds ${N - 1} concepts, not ${N}.`);
      continue;
    }
    if (tail.length < TAIL_MIN) {
      rejected.push(`${label}: ${tail.length} of ${N} under ${IMPROBABLE.toFixed(2)} (${scored.map((o) => o.p.toFixed(2)).join(' · ')}); every pitch is the median.`);
      if (!best || tail.length > best.tail) best = { scored, tail: tail.length };
      continue;
    }
    return { scored, rejected };
  }
  console.error(`\n  ✗ [all-median] no round of ${N} from the ${all.length} directions available puts ${TAIL_MIN} concepts under ${IMPROBABLE.toFixed(2)}.`);
  console.error('     Every subset is the median, which is a fact about the direction table, not about this brief.');
  for (const r of rejected.slice(0, 6)) console.error(`      rejected: ${r}`);
  if (rejected.length > 6) console.error(`      ...and ${rejected.length - 6} more`);
  console.error('     Widen harness/author/directions.mjs, or ask for fewer options.\n');
  process.exit(1);
}

const evidence = libraryEvidence();
requireEvidence(evidence);
const built = DIRECTIONS.map(buildOption);
const { scored: options, rejected } = chooseRound(built, evidence);

fs.mkdirSync(OUTDIR, { recursive: true });
const kept = new Set(options.map((o) => `${NAME}-${o.dir.slug}.storyboard.md`));
const tracked = new Set(
  spawnSync('git', ['ls-files', OUTDIR], { cwd: ROOT, encoding: 'utf8' })
    .stdout?.split('\n').filter(Boolean).map((p) => path.basename(p)) || [],
);
const stale = [];
for (const f of fs.readdirSync(OUTDIR)) {
  if (!f.startsWith(`${NAME}-`) || !f.endsWith('.storyboard.md') || kept.has(f)) continue;
  if (!fs.readFileSync(path.join(OUTDIR, f), 'utf8').includes(GENERATED)) continue;
  if (tracked.has(f)) stale.push(f); else fs.unlinkSync(path.join(OUTDIR, f));
}
for (const o of options) {
  fs.writeFileSync(path.join(OUTDIR, `${NAME}-${o.dir.slug}.storyboard.md`), o.md);
}

const dup = (key, label) => {
  const seen = new Map();
  for (const o of options) {
    const k = o.dir[key];
    if (seen.has(k)) return `two directions share the same ${label} ("${k}"): "${seen.get(k)}" and "${o.dir.slug}". A direction is defined by its thread, its pace and its look; duplicate any one and the pair stops being a real alternative.`;
    seen.set(k, o.dir.slug);
  }
  return null;
};
const problems = [dup('thread', 'thread'), dup('preset', 'look')].filter(Boolean);

const closePace = [];
for (let i = 0; i < options.length; i++) {
  for (let j = i + 1; j < options.length; j++) {
    const r = Math.max(options[i].dir.pace, options[j].dir.pace) / Math.min(options[i].dir.pace, options[j].dir.pace);
    if (r < 1.25) closePace.push(`${options[i].dir.slug} and ${options[j].dir.slug} cut at nearly the same rate (${r.toFixed(2)}x apart)`);
  }
}

console.log(`\n  CONCEPT · ${path.basename(SB)} → ${options.length} directions for a ${DUR}s film`);
console.log(`  message: ${sb.message || '(none stated)'}`);
console.log(`  measured against ${evidence.scenes} shipped scenes and ${evidence.corpus} hand-written storyboards · seed ${SEED}\n`);

for (const r of rejected) console.log(`  ↻ regenerated: ${r}`);
if (rejected.length) console.log('');

console.log(`  ${'direction'.padEnd(15)} ${'thread'.padEnd(22)} ${'beats'.padEnd(14)} ${'look'.padEnd(11)} ${'p'.padEnd(5)} open`);
console.log(`  ${'─'.repeat(15)} ${'─'.repeat(22)} ${'─'.repeat(14)} ${'─'.repeat(11)} ${'─'.repeat(5)} ────`);
for (const o of options) {
  console.log(`  ${o.dir.slug.padEnd(15)} ${o.dir.thread.padEnd(22)} ${`${o.count} @ ${o.span}s`.padEnd(14)} ${`${o.dir.preset}/${o.preset.dominance}`.padEnd(11)} ${o.p.toFixed(2).padEnd(5)} ${o.placeholders}`);
}
console.log('\n  p is how likely this is the FIRST direction anybody proposes. Low is the good end.');
console.log(`  Where each number comes from (pace · look · thread are shares of the real library):`);
for (const o of options) {
  console.log(`    ${o.dir.slug.padEnd(15)} pace ${o.paceEcho.toFixed(2)} · look ${o.lookEcho.toFixed(2)} · thread ${o.threadEcho.toFixed(2)} · round ${o.roundEcho.toFixed(2)}`
    + `${o.tells.length ? ` · tells: ${o.tells.map((t) => t.id).join(', ')}` : ' · no tells'}`);
}
console.log(`\n  ${OUTDIR}/${NAME}-<direction>.storyboard.md  ·  "open" counts the decisions left to you\n`);

if (stale.length) {
  console.log(`  ~ [stale-variant] ${stale.length} committed variant(s) are not in this round, and were left`);
  console.log('      alone rather than deleted. Remove them yourself if they are no longer wanted:');
  console.log(`      ${stale.join(', ')}\n`);
}
for (const p of problems) console.log(`  ✗ [options-collapse] ${p}`);
for (const c of closePace) console.log(`  ~ [close-pace] ${c}, fine if the thread and look carry it, worth changing if they do not.`);
if (problems.length) { console.log(''); process.exit(1); }
console.log('  ✓ every direction commits to a different thread, a different look and a different silhouette.');
console.log(`  ✓ ${options.filter((o) => o.p < IMPROBABLE).length} of ${options.length} sit under ${IMPROBABLE.toFixed(2)}, so the round is not all median.\n`);

const pick = [...options].sort((a, b) => a.p - b.p || a.placeholders - b.placeholders || (a.dir.slug < b.dir.slug ? -1 : 1))[0];
const left = [...options].sort((a, b) => b.p - a.p)[0];
console.log(`  RECOMMENDED: ${pick.dir.slug} (p ${pick.p.toFixed(2)}, the least likely thing to propose here).`);
console.log(`    ${pick.dir.why}`);
console.log(`    Left behind: ${left.dir.slug} (p ${left.p.toFixed(2)}) is the most typical answer available`
  + `${left.tells.length ? `, and it carries ${left.tells.length} of this repo's own named tells` : ''}.`);
console.log('    A low p buys nothing on its own. It says the idea is unusual, never that it is good.\n');

console.log('  These are STARTING POINTS, not finished films: whether the one you pick ends up too close');
console.log('  to something already shipped is a question about a real scene, and `make ledger` answers it.\n');
console.log('  next: fill the <…> slots in the direction you believe in, then');
console.log(`        make concept-pick SB=${SB} OPTION=<direction>\n`);
process.exit(STRICT && options.some((o) => o.placeholders > 40) ? 1 : 0);
