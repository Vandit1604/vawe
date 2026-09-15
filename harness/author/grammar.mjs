// harness/author/grammar.mjs: what we have learned about how good films are BUILT.
//
//   node harness/author/grammar.mjs            # the whole store, as one comparison table
//   node harness/author/grammar.mjs <name>     # one film's full reading
//   make grammar [N=<name>]
//
// WHY THIS EXISTS. `make study` reads one reference and writes `grammar/<name>.json`. That is a fact
// per film. The question an author actually has is comparative: how long does a shot hold in work that
// reads well, how active is it, does the ground turn, what survives a cut. Answering that meant opening
// several JSON files and holding five numbers in your head, which is where a reading goes to die.
//
// IT REPORTS WHAT IS MISSING AS LOUDLY AS WHAT IS THERE. A grammar file with every judgement blank is
// a film that was measured and never read, and a table that quietly omitted those rows would present a
// corpus of three as a corpus of nine. That is the absence-read-as-a-pass shape harness/lib/census.mjs
// exists for, so the unread films are counted in the header and listed at the end.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'grammar');
const ONE = process.argv.slice(2).find((a) => !a.startsWith('--'));

let files = [];
// A LEADING UNDERSCORE MEANS "not a film", which is the convention formats/scene already uses for a
// file that is in the directory but not part of the population. `_claims.json` and `_patterns.json`
// live here because they are ABOUT the films and belong beside them; they are excluded by RULE rather
// than by a list of names, because a list of exceptions grows and the second time I added one I had
// already forgotten the first. Anything without the prefix must be a film, so a real grammar file
// missing `measured` still crashes loudly instead of being quietly skipped.
try { files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort(); } catch { /* none yet */ }
if (!files.length) {
  console.log(`\n  No grammar yet. \`make study VIDEO=refs/<file>.mp4 NAME=<name>\` measures a reference and`);
  console.log(`  writes grammar/<name>.json, which is committed and outlives refs/.\n`);
  process.exit(0);
}

const all = files.map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
const read = (g) => (g.shots || []).filter((s) => s.onScreen).length;

if (ONE) {
  const g = all.find((x) => x.name === ONE);
  if (!g) { console.error(`✗ no grammar for "${ONE}". Have: ${all.map((x) => x.name).join(', ')}`); process.exit(2); }
  console.log(`\n  GRAMMAR · ${g.name}   ${g.measured.duration}s · ${g.measured.shots} shots · median ${g.measured.medianShot}s · ${g.measured.cutsPerMinute}/min`);
  console.log(`  ground   ${g.groundPattern}`);
  if (g.motionBand) console.log(`  motion   ${g.motionBand.lo} to ${g.motionBand.hi}  (the renderer prints this number for our films too)\n`);
  for (const s of g.shots) {
    console.log(`  ${String(s.i).padStart(2)}. ${String(s.t0).padStart(6)}s  ${String(s.len).padStart(5)}s  ${String(s.ground || '?').padEnd(5)} luma ${String(s.luma ?? '?').padStart(5)}  motion ${String(s.motion ?? '?').padStart(5)}  ${s.accent || ''}`);
    if (s.onScreen) console.log(`      on screen   ${s.onScreen}`);
    if (s.moves)    console.log(`      moves       ${s.moves}`);
    if (s.trigger)  console.log(`      triggers    ${s.trigger}`);
    if (!s.onScreen) console.log(`      (unread: measured, never watched)`);
    console.log('');
  }
  for (const [k, label] of [['threads', 'THREAD    '], ['spectacle', 'SPECTACLE '], ['takeaway', 'TAKEAWAY  ']])
    if (g[k]) console.log(`  ${label}${String(g[k]).replace(/\n/g, '\n            ')}\n`);
  process.exit(0);
}

// A SHOT COUNT THIS TOOL GUESSED MUST NOT PRINT LIKE ONE IT MEASURED, and the first version of this
// table did exactly that. `study.mjs` falls back to fixed sampling when no frame scores above the cut
// threshold, which is the correct answer for a film built on dissolves, and it records the fallback in
// `measured.shotDetection`. The table read `measured.shots` and `measured.medianShot` without asking,
// so a 19.78s film sampled into 10 equal 1.98s slices printed as "10 shots, median 1.98s, 30.3/min".
//
// The hand study of that same film (engine-doctrine/CRAFT/REF-pin-16818198602994243.md) counted 15 shots at a
// 1.08s median, by eye, correctly. Five of the seven rows here were in that state. So the store's first
// act was to contradict the one careful reading the repo already had, in a table with nothing on it to
// say which number to believe. That is absence read as a pass, in a file whose own header warns about
// absence read as a pass.
//
// A fixed-sampled row keeps its ground and motion, which are real: those are measured over spans and do
// not care where the spans came from. It loses its shot count, its median and its cut rate, because
// those are answers to a question that was never answered.
const sampled = (g) => g.measured.shotDetection !== 'scene-score';

// ── the document: one page an author reads BEFORE authoring ──────────────────────────────────────
//
// GENERATED, never hand-written, and that is the whole difference between it and the deep studies it
// links to. `engine-doctrine/CRAFT/REF-<name>.md` is a person going frame by frame through ONE film: palette by
// pixel share, type crops, the continuity register, what the engine cannot do. Those are worth writing
// and there is no machine substitute for them. What no one was ever going to keep current by hand is
// the CROSS-FILM page: every reference on one scale, so "how long does a shot hold in work that reads
// well" has an answer instead of an impression.
//
// So the two are not two owners of one fact. The store owns the measurements and the per-film reading;
// a deep study owns one film in depth and names itself in `deepStudy`; this page is a VIEW over the
// store and is overwritten every run. Editing it by hand is the one thing to not do, which is why it
// says so in its own first line.
function renderDoc(all) {
  const sampled = (g) => g.measured.shotDetection !== 'scene-score';
  const readN = (g) => (g.shots || []).filter((s) => s.moves).length;
  const cut = all.filter((g) => !sampled(g));
  const bands = all.map((g) => g.motionBand).filter(Boolean);
  const lo = bands.length ? Math.min(...bands.map((b) => b.lo)) : null;
  const hi = bands.length ? Math.max(...bands.map((b) => b.hi)) : null;
  const meds = cut.map((g) => g.measured.medianShot).sort((a, b) => a - b);
  const med = meds.length ? meds[Math.floor(meds.length / 2)] : null;

  const L = [];
  L.push('---');
  L.push('when: "before authoring, or when a film reads flat and you cannot say why"');
  L.push('answers: "what films that read well actually MEASURE: shot length, motion, whether the ground turns, and what carries across a cut"');
  L.push('group: crosscutting');
  L.push('---');
  L.push('');
  L.push('# The motion grammar');
  L.push('');
  L.push('## AGENT SUMMARY');
  L.push('');
  L.push('- Before authoring, or when a film reads flat and you cannot say why: check the measured motion/shot-length band for each reference film below, then read "What recurs across films" for the technique that explains why it works.');
  L.push('- `[ref: make grammar --doc]`: a measured catalog, not a gate. Nothing here blocks. Regenerate from `grammar/*.json` via `make study`; never hand-edit this file.');
  L.push('- Checkable action: where does this film\'s motion number land against the library band, and which recurring technique below explains the choice?');
  L.push('');
  L.push('> GENERATED by `make grammar --doc` from `grammar/*.json`. Do not edit this file: edit the JSON');
  L.push('> (or re-run `make study`) and regenerate. The measured half comes off the film; the authored half');
  L.push('> is written by a person into the JSON and merged forward on every re-study.');
  L.push('');
  L.push(`${all.length} reference film(s) measured. ${all.filter((g) => g.takeaway).length} carry a written reading.`);
  L.push('');
  L.push('## The numbers, on one scale');
  L.push('');
  L.push('`motion` is mean frame-to-frame luma delta. **`./bin/vawe <scene>` prints the same figure beside');
  L.push('every render**, so this table is a target and not a mood.');
  L.push('');
  L.push('| film | dur | shots | median | /min | motion | ground |');
  L.push('|---|---|---|---|---|---|---|');
  for (const g of all) {
    const m = g.motionBand ? `${g.motionBand.lo}–${g.motionBand.hi}` : '?';
    const sc = sampled(g) ? '· | · | ·' : `${g.measured.shots} | ${g.measured.medianShot}s | ${g.measured.cutsPerMinute}`;
    L.push(`| ${g.deepStudy ? `[${g.name}](${path.relative(path.join(ROOT, 'engine-doctrine/CRAFT'), path.join(ROOT, g.deepStudy))})` : g.name} | ${g.measured.duration}s | ${sc} | ${m} | ${g.groundPattern || '?'} |`);
  }
  L.push('');
  if (lo != null) {
    L.push(`**A shot in work that reads well measures ${lo} to ${hi}.**`);
    if (med != null) L.push(`Across the films whose cuts are measurable, the median shot runs **${med}s**.`);
    L.push('');
  }
  const guessed = all.filter(sampled);
  if (guessed.length) {
    L.push(`**\`·\` means no hard cut was found** (peak scene score below threshold), so the tool fell back to`);
    L.push('fixed sampling. Ground and motion stay real: they are measured over spans and do not care where the');
    L.push('spans came from. A shot count is not, so it is not printed. That is often the finding rather than a');
    L.push(`failure: ${guessed.map((g) => `\`${g.name}\``).join(', ')} ${guessed.length === 1 ? 'is' : 'are'} built on travel and dissolves.`);
    L.push('');
  }
  L.push('## What each film does');
  L.push('');
  for (const g of all) {
    L.push(`### ${g.name}${g.deepStudy ? ` · [deep study](${path.relative(path.join(ROOT, 'engine-doctrine/CRAFT'), path.join(ROOT, g.deepStudy))})` : ''}`);
    L.push('');
    if (!g.takeaway && !readN(g)) { L.push('_Measured, never read. The numbers above are real; nobody has written down what causes what._'); L.push(''); continue; }
    if (g.takeaway) { L.push(`**Takeaway.** ${g.takeaway.replace(/\n/g, '\n\n')}`); L.push(''); }
    if (g.threads) { L.push(`**Carries across the cuts.** ${g.threads}`); L.push(''); }
    if (g.spectacle) { L.push(`**The loud moment.** ${g.spectacle}`); L.push(''); }
    const withMoves = (g.shots || []).filter((s) => s.moves);
    if (withMoves.length) {
      L.push('| # | in | len | ground | motion | what moves | what triggers the next |');
      L.push('|---|---|---|---|---|---|---|');
      for (const s of withMoves)
        L.push(`| ${s.i} | ${s.t0}s | ${s.len}s | ${s.ground} ${s.luma} | ${s.motion} | ${s.moves} | ${s.trigger || '·'} |`);
      L.push('');
    }
  }
  // PATTERNS: what recurs ACROSS films, which is the only thing a corpus can say that a single study
  // cannot. Authored, never derived: a device seen in three films is a person's judgement that the three
  // are doing the same thing, and no measurement reaches that. Each cites its films so the weight is
  // visible and a reader can check it.
  try {
    const P = JSON.parse(fs.readFileSync(path.join(DIR, '_patterns.json'), 'utf8'));
    if (P.patterns && P.patterns.length) {
      L.push('## What recurs across films');
      L.push('');
      L.push('A device seen in one film is an idea; in three it is a technique. Every pattern names the films');
      L.push('it was read in, so its weight is visible and you can go and check it.');
      L.push('');
      for (const p of P.patterns) {
        L.push(`### ${p.name}`);
        L.push('');
        L.push(`**Seen in ${p.seen.length}:** ${p.seen.map((n) => `\`${n}\``).join(' · ')}`);
        L.push('');
        L.push(p.what);
        L.push('');
        L.push(`**Why it works.** ${p.why}`);
        L.push('');
        if (p.ours) { L.push(`**In our engine.** ${p.ours}`); L.push(''); }
      }
    }
  } catch { /* no patterns file yet */ }

  // GAPS: what a reference does that we cannot. The other half of reading a film, and the half that
  // turns a study into engine work. Each names the film that motivated it and says whether a probe was
  // actually rendered, because "we cannot do this" asserted without a probe is how a capability gets
  // rebuilt beside the one that already existed.
  try {
    const G = JSON.parse(fs.readFileSync(path.join(DIR, '_gaps.json'), 'utf8'));
    if (G.gaps && G.gaps.length) {
      const v = G.gaps.filter((x) => x.status === 'verified').length;
      const fx = G.gaps.filter((x) => x.status === 'fixed').length;
      L.push('## What we cannot do yet');
      L.push('');
      L.push(`${G.gaps.length} gap(s) found by reading these films and probing the engine: ${v} confirmed by a rendered probe, ${fx} since fixed.`);
      L.push('');
      for (const g of G.gaps) {
        const badge = g.status === 'fixed' ? '**fixed**' : g.status === 'verified' ? '**verified by a probe**' : 'suspected, not yet built';
        L.push(`### ${g.name.replace(/\s+·\s+FIXED$/, '')}  ·  ${badge}`);
        L.push('');
        L.push(`**Seen in.** ${g.from}`);
        L.push('');
        L.push(`**Why we cannot.** ${g.why}`);
        L.push('');
        if (g.fix) { L.push(`**The fix.** ${g.fix}`); L.push(''); }
        if (g.workaround) { L.push(`**Today.** ${g.workaround}`); L.push(''); }
      }
    }
  } catch { /* no gaps file yet */ }

  L.push('## How to add one');
  L.push('');
  L.push('```bash');
  L.push('make study VIDEO=refs/<file>.mp4 NAME=<name>   # measures it, writes grammar/<name>.json');
  L.push('# then fill onScreen / moves / trigger per shot, and threads / spectacle / takeaway, in that JSON');
  L.push('make grammar --doc                             # regenerates this page');
  L.push('```');
  L.push('');
  L.push('`refs/` is gitignored and holds other people\'s films. `grammar/` is committed and holds what we');
  L.push('measured and concluded: no frame, no crop, no copy, no mark. The pixels stay out of the repo and');
  L.push('the reading stops dying with the checkout.');
  L.push('');

  return L.join('\n');
}

function writeDoc(all) {
  const out = path.join(ROOT, 'engine-doctrine/CRAFT/GRAMMAR.md');
  fs.writeFileSync(out, renderDoc(all));
  return out;
}

// A GENERATED DOC WITH NO DRIFT CHECK IS A HAND-WRITTEN DOC THAT LOOKS GENERATED. GRAMMAR.md is
// rebuilt by `--doc`, and until this existed the rebuild happened when somebody remembered, which is
// the same "one fact, two owners" the page itself is about. `--check` regenerates in memory and
// compares; docs-drift runs it, so studying a film and not regenerating the page now fails.
if (process.argv.includes('--check')) {
  const out = path.join(ROOT, 'engine-doctrine/CRAFT/GRAMMAR.md');
  const want = renderDoc(all);
  const have = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
  if (have === want) { console.log(`  ✓ engine-doctrine/CRAFT/GRAMMAR.md matches the ${all.length} grammar file(s) it is generated from`); process.exit(0); }
  console.error(`  ✗ engine-doctrine/CRAFT/GRAMMAR.md is ${have === null ? 'missing' : 'stale'}: it does not match the ${all.length} grammar file(s).`);
  console.error(`    Fix: make grammar DOC=1`);
  process.exit(1);
}

if (process.argv.includes('--doc')) {
  const out = writeDoc(all);
  console.log(`\n  ✓ wrote ${path.relative(ROOT, out)} from ${all.length} grammar file(s)\n`);
  process.exit(0);
}

const fullyRead = all.filter((g) => read(g) === (g.shots || []).length && g.takeaway);
console.log(`\n  GRAMMAR · ${all.length} reference film(s), ${fullyRead.length} of them actually read,`
  + ` ${all.filter(sampled).length} whose cuts this tool could not find\n`);
console.log(`  ${'film'.padEnd(24)} ${'dur'.padStart(6)} ${'shots'.padStart(5)} ${'median'.padStart(7)} ${'/min'.padStart(5)}  ${'motion'.padStart(11)}  ground`);
for (const g of all) {
  const m = g.motionBand ? `${g.motionBand.lo}–${g.motionBand.hi}` : '?';
  const mark = read(g) === (g.shots || []).length && g.takeaway ? ' ' : '·';
  const cells = sampled(g)
    ? `${'·'.padStart(5)} ${'·'.padStart(7)} ${'·'.padStart(5)}`
    : `${String(g.measured.shots).padStart(5)} ${String(g.measured.medianShot).padStart(6)}s ${String(g.measured.cutsPerMinute).padStart(5)}`;
  console.log(`${mark} ${g.name.padEnd(24)} ${String(g.measured.duration).padStart(5)}s ${cells}  ${m.padStart(11)}  ${(g.groundPattern || '').slice(0, 44)}`);
}
const guessed = all.filter(sampled);
if (guessed.length) {
  console.log(`\n  · means this tool found NO hard cut in that film (peak scene score below the threshold), so it`);
  console.log(`  fell back to fixed sampling. The ground and motion columns are still real, because they are`);
  console.log(`  measured over spans. The shot count is not a shot count, so it is not printed as one:`);
  for (const g of guessed) console.log(`    ${g.name.padEnd(24)} peak score ${g.measured.peakSceneScore} < ${g.measured.threshold}. It dissolves, or it is one shot.`);
  console.log(`  Re-run with a lower --threshold and compare the sheets, or count them by eye and write the`);
  console.log(`  reading into grammar/<name>.json, which is what the authored half is for.`);
}

// THE NUMBER THIS WHOLE STORE EXISTS TO PUT IN FRONT OF SOMEBODY. Our renderer prints the same motion
// figure beside every render, so the comparison is one scale, not two impressions.
const bands = all.map((g) => g.motionBand).filter(Boolean);
if (bands.length) {
  const lo = Math.min(...bands.map((b) => b.lo)), hi = Math.max(...bands.map((b) => b.hi));
  console.log(`\n  Across the store, a shot in work that reads well measures ${lo} to ${hi}.`);
  console.log(`  \`./bin/vawe <scene>\` prints the same figure for ours, so it is a target and not a feeling.`);
}
const unread = all.filter((g) => read(g) < (g.shots || []).length || !g.takeaway);
if (unread.length) {
  console.log(`\n  ${unread.length} film(s) are MEASURED AND NEVER READ. The numbers are real; nobody wrote down`);
  console.log(`  what causes what, which is the half a measurement cannot reach:`);
  for (const g of unread) console.log(`    ${g.name.padEnd(24)} ${read(g)}/${(g.shots || []).length} shots read${g.takeaway ? '' : ', no takeaway'}`);
  console.log(`\n  Fill them in grammar/<name>.json (onScreen · moves · trigger, then threads/spectacle/takeaway).`);
  console.log(`  A re-study merges them forward, so filling one in is not undone by measuring again.`);
}
console.log('');
