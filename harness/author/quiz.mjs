// harness/author/quiz.mjs: THE BRIEF, asked before anything is authored.
//
//   node harness/author/quiz.mjs --ask [--url … --name … --slug …]   ·   make quiz
//   node harness/author/quiz.mjs --self-test
//
// It prints an AskUserQuestion payload as JSON. The agent asks it, the answers come back, and `--apply`
// turns them into a storyboard. This file owns BOTH halves on purpose: the option table and the mapping
// from answers to frontmatter are two ends of one contract, and split across files they drift silently.
//
// WHY THIS EXISTS. `skills/vawe-video-planning/SKILL.md` Step 1b already specifies a five-question
// brief and Step 3c already specifies the lock sheet it produces. Neither was ever encoded, so the brief
// ran differently every session and the one decision `storyboard-check` HARD-ERRORS on for a short film,
// `threads:`, what holds the film across its cuts, was not among the five questions.
//
// THREE RULES, and the first two come from what studios actually do (23 published briefs were read; the
// consensus core is audience · goal · distribution · message · references · tone, and every strong
// instrument replaces an adjective with an artefact).
//
//   1. NEVER ASK ABOUT MOTION IN THE ABSTRACT. Not one published brief does. Motion is elicited as clips
//      on a board, as a per-shot field beside framing, or as a reaction to a rough cut. So the look is
//      settled by RENDERING two or three directions and asking which, never by naming an effect. There
//      are 465 of them; a person cannot answer that question and should not be asked to.
//   2. BOUND THE NEGATIVE BY CATEGORY. "What do you hate?" returns nothing; "which of these would make
//      you say that's not us" returns a decision. Anti-references narrow the space faster than
//      aspirations, which all collapse onto the same premium-calm answer.
//   3. QUOTE THE SITE BACK. A generic question wastes the answer. When a site study exists the options
//      are built from that site's own sections, and this file REFUSES to ask genericly instead (exit 2).
//
// The options are rendered from the registries, DIRECTIONS (threads + pace + look), PROFILES (the motion
// policy and its anti-blurb), and the brand's own sections.json, so they cannot drift from what the
// engine can actually do. `--self-test` proves every option still resolves.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseStoryboard } from './storyboard-parse.mjs';
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
// never a restatement of the label. That is the whole difference between a choice and a menu.

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

// The anti-reference, rendered from each profile's own antiBlurb. ELIMINATION, not aspiration, asked the
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
// `storyboard-check` hard-errors without `threads:`, and it is the one answer no amount of site study can
// guess. Each option's consequence is the direction's own `why`, verbatim.
export function threadOptions(job, dirs = DIRECTIONS) {
  const drop = new Set();
  if (job === 'number') drop.add('rhymed');          // a match cut cannot carry a figure
  if (job === 'feel') drop.add('counted');           // a counter is the opposite of mood
  return dirs.filter((d) => !drop.has(d.slug)).slice(0, 4)
    .map((d) => ({ key: d.slug, label: d.thread, description: d.why, pace: d.pace, preset: d.preset }));
}

// THEME SOURCE (owner ruling, .claude/plans/content-richness.plan.md "Update 1"): a brand site gives the
// theme for free (the study already reads its real colours); a prompt with no site gives nothing, so the
// brief must ASK rather than default to plain grey. Asked ONLY when no URL is known (`ask()` below): a
// known site already answers this the ordinary way, `make sections`/`make brandspec`/`make palette`.
export const THEME_SOURCE = [
  { key: 'reference', label: 'I will point you at a reference or a theme',
    description: 'Name a real site (studied the ordinary way) or an existing `themes/<name>.json`, and every colour, face and motion policy traces to it, never invented.' },
  { key: 'choose', label: 'You choose, invent something beautiful',
    description: 'No brand to study, so the theme is DESIGNED, not defaulted: a fresh palette seeded from skills/impeccable/scripts/palette.mjs and a colour direction named from `ui-skills list --category color`, recorded as `theme: invented` so the choice is not lost.' },
];

// Options built from the site's OWN sections. This is the question that cannot be answered generically,
// and the `kind` tells the author what each one costs to put on screen.
export function proofOptions(st) {
  if (!st || !st.sections.length) return null;
  const rich = st.sections.filter((s) => s.kind === 'rich').slice(0, 3);
  // `title` is the heading verbatim; `label` is its 28-char filename slug. Older studies predate `title`,
  // so de-slugging is the fallback rather than the plan, re-run `make sections` and the real words return.
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
    return { error: 'no-study', message: `study the site before asking. A generic question wastes the answer.\n`
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
  // NO URL KNOWN: nothing has given this film a theme yet, and the failure mode is silent (a plain grey
  // default). ASK rather than assume: point at a reference, or say "you choose" and get an invented one.
  if (!url) round1.push({ header: 'Theme source',
    question: 'Point me at a reference or a theme, or say "you choose" and I will design one', options: THEME_SOURCE });

  return {
    context: {
      brand: name, url: url || (st && st.url) || null, slug: slug || name || null,
      study: st ? `${st.sections.length} sections inventoried` : 'none, questions are unavoidably generic',
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
  return { questions: out, note: out.length ? null : 'nothing left to ask. Round 1 and the study decided it all' };
}

// ── apply ─────────────────────────────────────────────────────────────────────────────────────────
// Answers in, a storyboard out. It does NOT write the .intent.json sidecar: that comes from
// `make intent` through storyboard-parse.mjs, the one reader the gate and the animatic also use. Writing
// it here would bypass the shared parser, which is the exact drift storyboard-parse exists to prevent.
export function frontmatter(a) {
  const pl = PLACEMENT.find((p) => p.key === a.placement) || PLACEMENT[0];
  const job = JOBS.find((j) => j.key === a.job) || JOBS[0];
  const dir = DIRECTIONS.find((d) => d.slug === a.thread) || null;
  // A SECOND thread is paired automatically, because storyboard-check warns on a short film held by one
  // device and engine-doctrine/CRAFT/FILM-STRUCTURE.md is explicit that one thread has to be literal and obvious to
  // work alone. The pairing follows the job: a claim bookends, a number escalates, a mood asks.
  const second = { claim: 'bookend', number: 'escalation', feel: 'open question', how: 'through-line' }[job.key];
  return {
    arc: job.arc,
    format: pl.dims,
    duration: `${pl.duration}s`,
    threads: dir ? `${dir.thread} · ${second}` : null,
    framework: a.framework || null,
    pace: dir ? dir.pace : null,
    beats: dir ? Math.max(2, Math.round(pl.duration / dir.pace)) : null,
    profile: a.not || null,          // the ELIMINATED one; the caller narrows from it
    // THEME SOURCE (only asked when no URL is known, see ask() above). "choose" is the owner ruling's
    // INVENT branch, recorded so the decision is not lost between the brief and the lock sheet.
    theme: a.themeSource === 'choose' ? 'invented (palette.mjs seed + `ui-skills list --category color`)'
      : a.themeSource === 'reference' ? 'reference (name it before authoring: make sections/brandspec/palette)'
      : null,
  };
}

// THE NO-SITE BRANCH. A topic film has no sections to walk, so `storyboard-draft`, which is one beat per
// real section, in the site's order. Has nothing to iterate. This is a SECOND writer, deliberately, for a
// genuinely different input: there the structure comes from the site, here it comes from the arc and the
// chosen pace. Keeping one writer would have meant faking a sections.json, which is a lie on disk.
//
// It writes a SKELETON and says so. Every line a person must own is a `<fill:>`, because a brief can lock
// the shape of a film and cannot invent its words, and the honesty rule in CLAUDE.md means the tool must
// not put a claim on screen that nobody has stood behind.
const ROLES = {
  'hook → build → proof → payoff → CTA': ['hook', 'build', 'proof', 'payoff', 'cta'],
  'problem → mechanism → result': ['problem', 'mechanism', 'mechanism', 'result'],
  'question → escalation → answer': ['question', 'escalation', 'escalation', 'answer'],
  'image → turn → mark': ['image', 'turn', 'mark'],
};
function applyNoStudy({ a, fm, name, out }) {
  const dest = out || path.join(ROOT, 'films/scene', `${(name || 'untitled').replace(/[^a-z0-9-]/gi, '-')}.storyboard.md`);
  const dur = parseInt(fm.duration, 10);
  const n = fm.beats || Math.max(2, Math.round(dur / 2.5));
  const roles = ROLES[fm.arc] || ROLES['hook → build → proof → payoff → CTA'];
  const per = +(dur / n).toFixed(1);
  const L = ['---'];
  L.push(`message: ${a.message || '<fill: the ONE sentence this film lands, the spine, not a feature list>'}`);
  L.push(`audience: ${a.audience || '<fill: who this is for, role and context>'}`);
  L.push(`arc: ${fm.arc}`);
  if (fm.framework) L.push(`framework: ${fm.framework}`);
  if (fm.threads) L.push(`threads: ${fm.threads}`);
  if (fm.theme) L.push(`theme: ${fm.theme}`);
  L.push(`format: ${fm.format}`);
  L.push(`duration: ${dur}s`);
  L.push('---', '');
  L.push(`# ${name || 'untitled'}: storyboard SKELETON (from the brief, no site study)`);
  L.push('');
  L.push('> The brief fixed the shape: arc, duration, beat count and what holds it across the cuts. Every');
  L.push('> `<fill:>` below is a decision a person still owes. Motion: `make arsenal Q="…"`.');
  L.push('');
  for (let i = 0; i < n; i++) {
    const role = roles[Math.min(i, roles.length - 1)];
    const start = +(i * per).toFixed(1), end = +((i + 1) * per).toFixed(1);
    L.push(`## Beat ${i + 1}, <fill: name this beat>  (${start}s–${end}s)`, '');
    L.push(`- type: ${role}`);
    L.push(`- onscreen: "<fill: the exact words on screen${i === 0 ? ', ≤12 and front-load the strong one' : ''}>"`);
    L.push(`- why: <fill: what this beat PROVES that no other does, cut it, and what is lost?>`);
    L.push(`- becomes: <fill: the change at this junction, as "the X becomes the Y">`);
    L.push(`- picture: <fill: what is SHOWN here. A graphic is the subject at ~8% of the frame or more>`);
    L.push('');
  }
  fs.writeFileSync(dest, L.join('\n'));
  const g = spawnSync(process.execPath, [path.join(ROOT, 'quality/gates/storyboard-check.mjs'), dest], { encoding: 'utf8' });
  return { dest, fm, draft: `✓ wrote ${dest}, ${n} beat skeleton from the brief (no site study)`, warnings: '',
    gate: `${(g.stdout || '').trim()}\n${(g.stderr || '').trim()}`.trim(), gateOk: g.status === 0 };
}

function apply({ answersPath, name, slug, out }) {
  const a = JSON.parse(fs.readFileSync(answersPath, 'utf8'));
  const fm = frontmatter(a);
  const st = study(name);
  if (!st) return applyNoStudy({ a, fm, name, out });
  const dest = out || path.join(ROOT, 'assets/brands', name, 'STORYBOARD.md');
  const env = { ...process.env, NAME: name, DUR: String(parseInt(fm.duration, 10)),
    FORMAT: fm.format, ARC: fm.arc, OUT: dest };
  if (fm.threads) env.THREADS = fm.threads;
  if (fm.framework) env.FRAMEWORK = fm.framework;
  if (a.message) env.MSG = a.message;
  if (a.audience) env.AUDIENCE = a.audience;
  // ONE WRITER. storyboard-draft.mjs already emits one beat per real section in the site's order, which
  // is what CLAUDE.md asks a reflecting film to be. Emitting beats here as well would be a second writer
  // of the same artifact, and the two would drift.
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/brand/storyboard-draft.mjs')], { env, encoding: 'utf8' });
  if (r.status !== 0) return { error: 'draft-failed', message: (r.stderr || r.stdout || '').trim() };
  // READ BACK WHAT WE WROTE, through the parser the gate and `make intent` also use. Writing a field and
  // assuming it parsed is how a brief silently loses the decision it was asked for: `threads:` is the whole
  // reason this step exists and nothing downstream would have noticed its absence until storyboard-check
  // failed on a film nobody had run the gate on yet.
  // The parser exposes the named fields at the top level and everything else through `field(name)`.
  // `threads` is NOT one of the named ones, which is worth knowing: the field this whole step exists to
  // supply is the one the parser has no first-class accessor for.
  const parsed = parseStoryboard(fs.readFileSync(dest, 'utf8'));
  const lost = ['arc', 'format', 'duration'].filter((k) => !String(parsed[k] ?? '').trim())
    .concat(fm.threads && !String(parsed.field('threads') || '').trim() ? ['threads'] : []);
  if (lost.length) return { error: 'round-trip', message: `wrote ${dest} but ${lost.join(', ')} did not parse back out of it, `
    + `the brief's decision was lost between here and storyboard-parse.mjs.` };
  // …and run the gate rather than telling the author to. It never claims a green plan: whatever the gate
  // says is passed straight through, blockers included.
  const g = spawnSync(process.execPath, [path.join(ROOT, 'quality/gates/storyboard-check.mjs'), dest], { encoding: 'utf8' });
  // The child's WARNINGS go to stderr, and printing only stdout swallowed them: the draft warns when the
  // sections cannot fit the duration, which is the single most useful thing it says to a short film, and
  // this function was eating it. A wrapper that hides its child's warnings is worse than no wrapper.
  return { dest, fm, draft: (r.stdout || '').trim(), warnings: (r.stderr || '').trim(),
    gate: `${(g.stdout || '').trim()}\n${(g.stderr || '').trim()}`.trim(), gateOk: g.status === 0 };
}

// ── look ──────────────────────────────────────────────────────────────────────────────────────────
// THE LOOK IS SETTLED BY PICTURE, NOT BY QUESTION. Of 23 published studio briefs, not one asks a client
// to describe motion in the abstract: it is elicited as clips on a board, as a per-shot field beside
// framing, or as a reaction to a rough cut. The governing rule across all of them is that every good
// instrument replaces an adjective with an artefact, and style frames are the contract, "if the client
// approves the styleframe, they have approved the look".
//
// So this renders the candidate directions and asks which, rather than naming an effect at anybody. The
// pieces all existed: `concept` generates N directions that each commit to a thread, a pace and a look,
// and MEASURES their divergence with similarity.mjs; `panels` draws the storyboard stop as a picture.
// Nothing had put them in one line.
//
// TWO OR THREE, NEVER FIVE, "one polished concept and one meaningful alternative" is the published
// standard, and a fourth option is where a decision turns back into a menu.
function look({ sb, n = 3 }) {
  if (!sb || !fs.existsSync(sb)) return { error: 'no-storyboard', message: `--look needs a storyboard (got ${sb || 'nothing'}). Run --apply first.` };
  const N = Math.min(3, Math.max(2, +n || 3));
  const run = (args) => spawnSync(process.execPath, args, { encoding: 'utf8', cwd: ROOT });
  const c = run([path.join(ROOT, 'harness/author/concept.mjs'), sb, '--n', String(N)]);
  if (c.status !== 0) return { error: 'concept-failed', message: (c.stderr || c.stdout || '').trim() };
  const stem = path.basename(sb).replace(/\.storyboard\.md$/, '');
  const dir = path.join(ROOT, 'films/scene/_concepts');
  const variants = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.startsWith(`${stem}-`) && f.endsWith('.storyboard.md'))
    : [];
  if (!variants.length) return { error: 'no-variants', message: `concept wrote no variants for ${stem}` };
  const sheets = [];
  for (const v of variants) {
    const slug = v.slice(stem.length + 1).replace(/\.storyboard\.md$/, '');
    const r = run([path.join(ROOT, 'harness/author/panels.mjs'), path.join(dir, v)]);
    const m = (r.stdout || '').match(/(\/[^\s]*\.png)/);
    const d = DIRECTIONS.find((x) => x.slug === slug);
    sheets.push({ slug, sheet: m ? m[1] : null, thread: d ? d.thread : slug, why: d ? d.why : '', pace: d ? d.pace : null,
      ok: r.status === 0, err: r.status === 0 ? null : (r.stderr || '').trim().split('\n')[0] });
  }
  return { stem, sheets: sheets.filter((s) => s.sheet), failed: sheets.filter((s) => !s.sheet) };
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
  ok(THEME_SOURCE.length === 2, 'theme source should be exactly two options: point at one, or invent one');
  ok(frontmatter({ themeSource: 'choose' }).theme === 'invented (palette.mjs seed + `ui-skills list --category color`)',
    'themeSource "choose" should record theme: invented');
  ok(frontmatter({ themeSource: 'reference' }).theme != null, 'themeSource "reference" should record a theme line too');
  ok(frontmatter({}).theme == null, 'a known-URL brief (no themeSource asked) should record no theme line');
  // The consequence must not restate the label. A menu is not a choice.
  const all = [...PLACEMENT, ...JOBS, ...antiOptions(), ...threadOptions('claim'), ...THEME_SOURCE];
  for (const o of all) {
    ok(o.description && o.description.length > 40, `option "${o.label}" has no real consequence text`);
    ok(o.description.toLowerCase() !== String(o.label).toLowerCase(), `option "${o.label}" restates itself`);
  }
  // NO EFFECT NAMES, EVER. The whole design rests on this: a person cannot choose between 465 effects,
  // and an option naming one has smuggled the author's job into the brief.
  const EFFECTY = /\b(easeOut|easeIn|whipPan|cinematicZoom|riseBlur|sdfIris|dotmatrix|gradientWash|kineticHook|slowPush|diveIn)\b/;
  for (const o of all) ok(!EFFECTY.test(`${o.label} ${o.description}`), `option "${o.label}" names an effect, ask about intent, not vocabulary`);
  for (const k of Object.keys(PROFILES)) {
    const shown = [...antiOptions()].some((o) => `${o.label} ${o.description}`.includes(k));
    ok(!shown, `a profile NAME ("${k}") is visible to the user. Show its antiBlurb, never the key`);
  }
  if (errs.length) { console.error('✗ quiz self-test\n' + errs.map((e) => `  - ${e}`).join('\n')); process.exit(1); }
  console.log(`✓ quiz self-test: ${PLACEMENT.length} placements · ${JOBS.length} jobs · ${antiOptions().length} anti-refs · ${DIRECTIONS.length} directions · ${THEME_SOURCE.length} theme sources, every option resolves`);
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  if (argv.includes('--self-test')) { selfTest(); }
  else if (argv.includes('--round') && flag('--round') === '2') {
    console.log(JSON.stringify(round2({ placement: flag('--placement'), job: flag('--job') }), null, 2));
  } else if (argv.includes('--look')) {
    const res = look({ sb: flag('--sb'), n: flag('--n', '3') });
    if (res.error) { console.error(`✗ ${res.message}`); process.exit(2); }
    for (const f of res.failed) console.error(`  ⚠ ${f.slug}: panels failed, ${f.err || 'no sheet'}`);
    console.log(`\n  ${res.sheets.length} direction(s) drawn. READ THE SHEETS, then pick one:\n`);
    for (const s of res.sheets) console.log(`  ${s.thread.padEnd(24)} ${s.sheet}\n      ${s.why}\n`);
    console.log(JSON.stringify({ questions: [{ header: 'Direction', question: 'Which of these is the film?',
      options: res.sheets.map((s) => ({ label: s.thread, description: `${s.why} Drawn at ${s.pace}s a beat. See ${s.sheet}.` })) }] }, null, 2));
    console.log(`\n  then: make concept-pick SB=<storyboard> OPTION=<direction>`);
  } else if (argv.includes('--apply')) {
    const res = apply({ answersPath: flag('--answers'), name: flag('--name'), slug: flag('--slug'), out: flag('--out') });
    if (res.error) { console.error(`✗ ${res.message}`); process.exit(2); }
    if (res.warnings) console.error(res.warnings);
    console.log(res.draft);
    const shown = (f) => { const r = path.relative(ROOT, f); return r.startsWith('..') ? f : r; };
    console.log(`\n  brief → ${shown(res.dest)}`);
    console.log(`  locked: ${res.fm.format} · ${res.fm.duration} · arc "${res.fm.arc}"${res.fm.threads ? ` · threads "${res.fm.threads}"` : ''}`);
    if (res.fm.beats) console.log(`  the chosen thread paces this at ~${res.fm.beats} beats (${res.fm.pace}s each)`);
    console.log(`\n${res.gate}`);
    console.log(res.gateOk ? '' : `  ↑ the gate's blockers are yours to fill; the brief locked the frontmatter, not the copy.`);
    console.log(`\n  next: make intent SB=${shown(res.dest)} D=<scene.json>   → then make plan-check`);
    console.log(`        then make concept SB=${shown(res.dest)} N=3. Three directions, rendered, so the LOOK is picked from pictures`);
  } else if (argv.includes('--ask')) {
    const payload = ask({ name: flag('--name'), url: flag('--url'), slug: flag('--slug') });
    if (payload.error) { console.error(`✗ ${payload.message}`); process.exit(2); }
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.error('usage: quiz --ask [--name <brand> --url <url> --slug <slug>] | --round 2 --placement <k> --job <k> | --self-test');
    process.exit(2);
  }
}
