// scripts/author/quiz.mjs — THE BRIEF, asked before anything is authored.
//
//   node scripts/author/quiz.mjs --ask [--url … --name … --slug …]   ·   make quiz
//   node scripts/author/quiz.mjs --self-test
//
// It prints an AskUserQuestion payload as JSON. The agent asks it, the answers come back, and `--apply`
// turns them into a storyboard. This file owns BOTH halves on purpose: the option table and the mapping
// from answers to frontmatter are two ends of one contract, and split across files they drift silently.
//
// WHY THIS EXISTS. `.claude/skills/vawe-video-planning/SKILL.md` Step 1b already specifies a five-question
// brief and Step 3c already specifies the lock sheet it produces. Neither was ever encoded, so the brief
// ran differently every session and the one decision `storyboard-check` HARD-ERRORS on for a short film —
// `threads:`, what holds the film across its cuts — was not among the five questions.
//
// THREE RULES, and the first two come from what studios actually do (23 published briefs were read; the
// consensus core is audience · goal · distribution · message · references · tone, and every strong
// instrument replaces an adjective with an artefact).
//
//   1. NEVER ASK ABOUT MOTION IN THE ABSTRACT. Not one published brief does. Motion is elicited as clips
//      on a board, as a per-shot field beside framing, or as a reaction to a rough cut. So the look is
//      settled by RENDERING two or three directions and asking which — never by naming an effect. There
//      are 465 of them; a person cannot answer that question and should not be asked to.
//   2. BOUND THE NEGATIVE BY CATEGORY. "What do you hate?" returns nothing; "which of these would make
//      you say that's not us" returns a decision. Anti-references narrow the space faster than
//      aspirations, which all collapse onto the same premium-calm answer.
//   3. QUOTE THE SITE BACK. A generic question wastes the answer. When a site study exists the options
//      are built from that site's own sections, and this file REFUSES to ask genericly instead (exit 2).
//
// The options are rendered from the registries — DIRECTIONS (threads + pace + look), PROFILES (the motion
// policy and its anti-blurb), and the brand's own sections.json — so they cannot drift from what the
// engine can actually do. `--self-test` proves every option still resolves.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DIRECTIONS } from './directions.mjs';
import { PROFILES } from './profiles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };

// ── the site study ────────────────────────────────────────────────────────────────────────────────
// A section's `label` is slugified from its real heading, so it is the site's own words with the shape
// knocked off. De-slugging is honest as long as nobody pretends it is verbatim copy: it is a HANDLE for
// a section the author can recognise, and the shot and capture command beside it are the real artefacts.
const deslug = (s) => String(s || '').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()).trim();

export function study(name) {
  if (!name) return null;
  const p = path.join(ROOT, 'assets/brands', name, 'sections/sections.json');
  if (!fs.existsSync(p)) return null;
  try {
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    const sections = (d.sections || []).filter((s) => s && s.label);
    return { url: d.url, brand: d.brand, sections };
  } catch { return null; }
}

// ── the questions ─────────────────────────────────────────────────────────────────────────────────
// A question is { header, question, options: [{label, description}] }. `description` is the CONSEQUENCE,
// never a restatement of the label — that is the whole difference between a choice and a menu.

// The ONE fixed question. Platform, orientation and duration are asked TOGETHER because they are one
// decision: splitting them is how a 60s vertical happens. Nothing in a site study can answer it, so it is
// the only question that does not quote the material back.
export const PLACEMENT = [
  { key: 'timeline', label: 'X or LinkedIn timeline', aspect: '16:9', dims: '1920x1080', duration: 12,
    description: 'Landscape, ~12s, silent and autoplaying. The first 1.5s carries it or nothing does, and there is no room for a slow open.' },
  { key: 'vertical', label: 'Shorts, Reels or TikTok', aspect: '9:16', dims: '1080x1920', duration: 20,
    description: 'Portrait, ~20s. Every coordinate changes and a wide product shot will not read; the frame has to be rebuilt, not cropped.' },
  { key: 'hero', label: 'A site hero, looping', aspect: '16:9', dims: '1920x1080', duration: 8,
    description: 'Landscape, ~8s, no CTA because the page is the CTA. It must survive being watched twenty times, so nothing may be annoying on the second pass.' },
  { key: 'talk', label: 'A demo or conference screen', aspect: '16:9', dims: '1920x1080', duration: 45,
    description: 'Landscape, ~45s. Room for a real walkthrough, and no room for a hook that stalls: a held frame reads as a broken slide to a room.' },
];

// The JOB decides the arc, and the arc decides the beat roles. Phrased as what must be TRUE for the
// viewer afterwards rather than "what is the goal", because a goal invites the brochure answer.
export const JOBS = [
  { key: 'claim', label: 'They remember one claim', arc: 'hook → build → proof → payoff → CTA',
    description: 'One idea, said in three pictures. Everything else gets cut, including the feature you like most.' },
  { key: 'how', label: 'They understand how it works', arc: 'problem → mechanism → result',
    description: 'Needs real product surface on screen, which costs roughly 40% of the runtime and rules out the shortest cuts.' },
  { key: 'number', label: 'They believe a number', arc: 'question → escalation → answer',
    description: 'The film is built backwards from the figure. If the number is not true and yours, this option is not available.' },
  { key: 'feel', label: 'They feel something, then click', arc: 'image → turn → mark',
    description: 'Buys mood and holds. Buys no explanation: a newcomer will not learn what the product does.' },
];

// The anti-reference, rendered from each profile's own antiBlurb. ELIMINATION, not aspiration — asked the
// other way round every answer lands on the same premium-calm profile. The user never sees a profile name.
export function antiOptions(profiles = PROFILES) {
  const pick = ['duolingo', 'a24', 'bloomberg', 'apple'];
  // The consequence is DERIVED from the profile's own policy, not written beside it: what disappears is
  // its cut family and its pace, which is the part an author feels later. A hand-written consequence here
  // would be a third copy of SELECTION.md and would drift from the table the director actually enforces.
  return pick.map((k) => {
    const P = profiles[k];
    // pace/dominance/accent, never `cuts`/`stings`: those fields hold EFFECT NAMES, and the self-test
    // below refuses to show one to a person. Deriving the consequence from the wrong field is how an
    // option ends up saying "sdfIris" to somebody who was asked what their brand is not.
    const bounce = P.bounceOk === true ? ' Nothing will overshoot or bounce.' : '';
    return { key: k, label: P.antiBlurb,
      description: `Takes ${P.pace} pacing and a ${P.dominance} frame off the table.${bounce} Every beat moves further from that register, and the accent narrows to ${P.accent}.` };
  });
}

// The thread question, rendered from DIRECTIONS. Only asked on a SHORT film, because that is where
// `storyboard-check` hard-errors without `threads:` — and it is the one answer no amount of site study can
// guess. Each option's consequence is the direction's own `why`, verbatim.
export function threadOptions(job, dirs = DIRECTIONS) {
  const drop = new Set();
  if (job === 'number') drop.add('rhymed');          // a match cut cannot carry a figure
  if (job === 'feel') drop.add('counted');           // a counter is the opposite of mood
  return dirs.filter((d) => !drop.has(d.slug)).slice(0, 4)
    .map((d) => ({ key: d.slug, label: d.thread, description: d.why, pace: d.pace, preset: d.preset }));
}

// Options built from the site's OWN sections. This is the question that cannot be answered generically,
// and the `kind` tells the author what each one costs to put on screen.
export function proofOptions(st) {
  if (!st || !st.sections.length) return null;
  const rich = st.sections.filter((s) => s.kind === 'rich').slice(0, 3);
  // `title` is the heading verbatim; `label` is its 28-char filename slug. Older studies predate `title`,
  // so de-slugging is the fallback rather than the plan — re-run `make sections` and the real words return.
  const opts = rich.map((s) => ({ key: s.label, label: s.title || deslug(s.label),
    description: `A real section of ${st.brand || 'the site'}, captured live${s.shot ? ' (a screenshot already exists)' : ''}. Costs one capture and about 2s of runtime.` }));
  // NEVER TRIM THIS OPTION. Without it the question quietly licenses inventing a figure, and the honesty
  // rule in CLAUDE.md ("the on-screen copy must be true") then has no way to be chosen.
  opts.push({ key: '__none', label: 'None of these are the proof yet',
    description: 'The film will not assert a number or a customer it cannot show. It states what the product does and stops there.' });
  return opts;
}

// ── the payload ───────────────────────────────────────────────────────────────────────────────────
export function ask({ name = null, url = null, slug = null } = {}) {
  const st = study(name);
  // THE PRECONDITION, AS AN EXIT CODE. The skill has said "study the site first" in prose for months and
  // prose cannot stop anyone. A generic question asked of somebody who has a site is a wasted answer.
  if (url && !st) {
    const n = name || '<brand>';
    return { error: 'no-study', message: `study the site before asking — a generic question wastes the answer.\n`
      + `  make sections URL=${url} NAME=${n}\n  make brandspec URL=${url}\n`
      + `then re-run. (Looked for assets/brands/${n}/sections/sections.json)` };
  }
  const proof = proofOptions(st);
  const round1 = [
    { header: 'Placement', question: 'Where does this play, exactly?', options: PLACEMENT },
    { header: 'Job', question: 'What has to be TRUE for the viewer after it ends?', options: JOBS },
    { header: 'Not this', question: 'Which of these would make you say "that is not us"?', options: antiOptions() },
  ];
  if (proof) round1.push({ header: 'Proof', question: st.brand
    ? `Which part of ${st.brand} does the convincing?` : 'Which part of the product does the convincing?', options: proof });

  return {
    context: {
      brand: name, url: url || (st && st.url) || null, slug: slug || name || null,
      study: st ? `${st.sections.length} sections inventoried` : 'none — questions are unavoidably generic',
      skipped: st ? [] : ['proof (needs a site study)'],
      note: 'Round 2 is emitted by --ask --round 2 with round 1\'s answers, and emits nothing already decided.',
    },
    questions: round1.map((q) => ({ ...q, options: q.options.map(({ label, description }) => ({ label, description })) })),
  };
}

// Round 2 exists only for what round 1 could not decide. It is allowed to be EMPTY, and usually is on a
// long film with a site study: a second round that asks something derivable is a tax on the user.
export function round2({ placement, job } = {}) {
  const pl = PLACEMENT.find((p) => p.key === placement);
  const out = [];
  if (pl && pl.duration < 15) {
    out.push({ header: 'Thread', question: 'What carries the viewer across the cuts?',
      options: threadOptions(job).map(({ label, description }) => ({ label, description })) });
  } else if (pl) {
    out.push({ header: 'Framework', question: 'How should it be argued?', options: [
      { label: 'Problem, agitate, solve', description: 'The first third is the viewer\'s pain, so a third of the runtime shows the problem rather than the product.' },
      { label: 'Before and after', description: 'Two states and the bridge between them. Needs both states to be showable, or the turn lands on a claim.' },
      { label: 'Attention, interest, desire, action', description: 'Front-loads the hook and ends on the ask. The most conventional, and the least surprising.' },
      { label: 'Star, story, solution', description: 'A named subject carries it. Strongest when there is a real customer; hollow when the star is the product itself.' },
    ] });
  }
  return { questions: out, note: out.length ? null : 'nothing left to ask — round 1 and the study decided it all' };
}

// ── self-test ─────────────────────────────────────────────────────────────────────────────────────
// Every option must resolve in the registry it claims to come from, so a renamed direction or profile
// fails HERE rather than rendering a question about something the engine cannot do.
function selfTest() {
  const errs = [];
  const ok = (c, m) => { if (!c) errs.push(m); };
  for (const o of antiOptions()) ok(PROFILES[o.key], `anti-reference option "${o.key}" is not a profile`);
  for (const o of threadOptions('claim')) ok(DIRECTIONS.some((d) => d.slug === o.key), `thread option "${o.key}" is not a direction`);
  for (const p of PLACEMENT) {
    ok(/^\d+x\d+$/.test(p.dims), `placement "${p.key}" has no dimensions`);
    ok(p.duration > 0, `placement "${p.key}" has no duration`);
    ok(['16:9', '9:16', '1:1', '4:5'].includes(p.aspect), `placement "${p.key}" names an aspect the engine does not have: ${p.aspect}`);
  }
  for (const j of JOBS) ok(j.arc && j.arc.includes('→'), `job "${j.key}" has no arc`);
  // The consequence must not restate the label. A menu is not a choice.
  const all = [...PLACEMENT, ...JOBS, ...antiOptions(), ...threadOptions('claim')];
  for (const o of all) {
    ok(o.description && o.description.length > 40, `option "${o.label}" has no real consequence text`);
    ok(o.description.toLowerCase() !== String(o.label).toLowerCase(), `option "${o.label}" restates itself`);
  }
  // NO EFFECT NAMES, EVER. The whole design rests on this: a person cannot choose between 465 effects,
  // and an option naming one has smuggled the author's job into the brief.
  const EFFECTY = /\b(easeOut|easeIn|whipPan|cinematicZoom|riseBlur|sdfIris|dotmatrix|gradientWash|kineticHook|slowPush|diveIn)\b/;
  for (const o of all) ok(!EFFECTY.test(`${o.label} ${o.description}`), `option "${o.label}" names an effect — ask about intent, not vocabulary`);
  for (const k of Object.keys(PROFILES)) {
    const shown = [...antiOptions()].some((o) => `${o.label} ${o.description}`.includes(k));
    ok(!shown, `a profile NAME ("${k}") is visible to the user — show its antiBlurb, never the key`);
  }
  if (errs.length) { console.error('✗ quiz self-test\n' + errs.map((e) => `  - ${e}`).join('\n')); process.exit(1); }
  console.log(`✓ quiz self-test — ${PLACEMENT.length} placements · ${JOBS.length} jobs · ${antiOptions().length} anti-refs · ${DIRECTIONS.length} directions, every option resolves`);
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  if (argv.includes('--self-test')) { selfTest(); }
  else if (argv.includes('--round') && flag('--round') === '2') {
    console.log(JSON.stringify(round2({ placement: flag('--placement'), job: flag('--job') }), null, 2));
  } else if (argv.includes('--ask')) {
    const payload = ask({ name: flag('--name'), url: flag('--url'), slug: flag('--slug') });
    if (payload.error) { console.error(`✗ ${payload.message}`); process.exit(2); }
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.error('usage: quiz --ask [--name <brand> --url <url> --slug <slug>] | --round 2 --placement <k> --job <k> | --self-test');
    process.exit(2);
  }
}
