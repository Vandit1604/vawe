// quality/gates/storyboard-check.mjs: the STORYBOARD-AS-PROPOSAL gate.
// A great video is planned on paper BEFORE the JSON. This gate enforces that the plan is a
// real proposal, not a vibe: a one-sentence MESSAGE + audience + arc up front, and per beat a type, the
// on-screen cues, and a WHY (its narrative role / persuasion). A beat with no "why" is decoration; a video
// with no one-sentence message has no spine. It does not judge taste, it enforces that the decisions that
// make a video good were actually made and written down.
//
// Under ~15s it also asks the plan to NAME WHAT HOLDS THE FILM, because a short film planned as
// independent beats is a slideshow on paper and the scene gate can only find that out after the JSON
// exists. It takes either answer: `threads:` names devices from engine-doctrine/CRAFT/FILM-STRUCTURE.md (a match
// cut, a camera travel, a motif, a bookend, a metric cut rate, an unfinished sentence), and `object:`
// names the one device the scene-side gate can also see. It used to demand `object:` and nothing else,
// which enforced the register Murch ranks last and made every other way of holding a film unwritable.
//
//   node quality/gates/storyboard-check.mjs path/to/STORYBOARD.md   ·   make storyboard-check SB=<file>
//   Template: engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// ONE reader for the storyboard contract, shared with the animatic that PLAYS it. Two parsers would
// drift, and the drift would be invisible in the worst way: this gate passing a beat the animatic drops.
import { fieldIn, blocksOf, durSec as parseDur, RANGE as SB_RANGE, parseStoryboard, timeline, ARCHETYPES, WEIGHTS, isArchetype } from '../../harness/author/storyboard-parse.mjs';
import { chainErrors, edges, parseMotion, isCausedTrigger, stagedSchedule, TRIGGER_SEQUENCE, TRIGGER_EMPTY, parseRecipeLine, cameraErrors, cameraWarnings, cameraContinuityErrors, cameraStillHeldWarnings, transitionInErrors, transitionInWarnings, transitionWhyErrors, transitionFindings, moveErrors, motionErrors, parseFragmentSpec, arsenalCorpus, useErrors, useWarnings, eyeErrors, hasEyeCandidateMotion, eyeUntargetedDevices, competingEyeDevices, parseEyeLine, groundErrors, kineticErrors, elementsErrors, transitionValueErrors } from '../../harness/lib/contract.mjs';
import { resolvePx } from '../../harness/lib/placement-resolve.mjs';
import { readReceipt } from '../../harness/lib/receipt.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { adaptFinding } from '../../harness/lib/safeguards.mjs';
import { classifyType, thresholdFor, GENRE_PACING_SOURCE, describeReferenceBank } from '../../harness/lib/genre-pacing.mjs';
import { isWaivedBy } from '../../harness/lib/waivers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ── TASK 5: MIGRATION, WITHOUT A BIG BANG ────────────────────────────────────────────────────────
//
// `ground:`/`kinetic:`/`elements:`/`transition_value:` are all OPTIONAL: 44 storyboards and 232 beats
// exist today and NONE of them declare any of the four (the measurement this whole plan rests on). A
// REQUIRED field would invalidate the corpus at once; this ratchet instead counts how many beats
// declare NOTHING of the four, reports today's number, and fails only on an INCREASE, exactly as
// `quality/gates/output-contract.mjs` and `quality/gates/ledger.mjs unjudged` already ratchet a count down.
//
// THE BASELINE LIVES OUTSIDE quality/baselines/ ON PURPOSE (harness/dev/, the same precedent
// harness/dev/prose-check-ratchet.json set): that directory is reserved for gates this repo has
// decided are load-bearing on every push, and this one is new and adoption-only, never to be
// hand-edited or raised by an agent (see AGENTS.md `quality/baselines/`).
//
//   node quality/gates/storyboard-check.mjs --ratchet [--stamp]   ·   make storyboard-decide-ratchet
if (process.argv.includes('--ratchet')) {
  const RATCHET = path.join(ROOT, 'harness/dev/storyboard-decide-ratchet.json');
  const DECIDES = ['ground', 'kinetic', 'elements', 'transition_value'];
  const files = fs.readdirSync(path.join(ROOT, 'films/scene')).filter((n) => n.endsWith('.storyboard.md'));
  let total = 0, undeclared = 0;
  for (const name of files) {
    const text = fs.readFileSync(path.join(ROOT, 'films/scene', name), 'utf8');
    for (const b of parseStoryboard(text).beats) {
      total++;
      if (!DECIDES.some((k) => b[k])) undeclared++;
    }
  }
  const prior = (() => { try { return JSON.parse(fs.readFileSync(RATCHET, 'utf8')); } catch { return null; } })();
  console.error(`\n  STORYBOARD-DECIDES · ${files.length} storyboard(s) · ${total} beat(s) · `
    + `${undeclared} declare none of ${DECIDES.join('/')}\n`);
  if (process.argv.includes('--stamp')) {
    fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
    fs.writeFileSync(RATCHET, `${JSON.stringify({ undeclared }, null, 1)}\n`);
    console.error(`  ✓ ratchet stamped at ${undeclared} undeclared beat(s)${prior ? `, ${undeclared <= prior.undeclared ? 'down' : 'UP'} from ${prior.undeclared}` : ''}\n`);
    process.exit(0);
  }
  if (prior && undeclared > prior.undeclared) {
    console.error(`  ✗ ${undeclared} beat(s) declare none of ground:/kinetic:/elements:/transition_value:, up from ${prior.undeclared}. `);
    console.error('    A new beat should declare at least one of these decisions, not add to the pile that decides nothing.');
    console.error('    If this increase is deliberate, raise the bar on purpose: node quality/gates/storyboard-check.mjs --ratchet --stamp\n');
    process.exit(1);
  }
  if (prior && undeclared < prior.undeclared) {
    console.error(`  ~ ${prior.undeclared - undeclared} fewer undeclared beat(s) than the ratchet allows. Lower it: `
      + 'node quality/gates/storyboard-check.mjs --ratchet --stamp\n');
  }
  console.error('  ✓ no new undeclared beat\n');
  process.exit(0);
}

const f = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!f || !fs.existsSync(f)) { console.error('usage: storyboard-check <STORYBOARD.md>  (template: engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md)'); process.exit(2); }
const src = fs.readFileSync(f, 'utf8');

// The one waiver mechanism (`authoring.allow` + `_why` in the scene JSON, AGENTS.md), read here too:
// a plan-time blocker earns the same door out as every JSON-side rule, never a second excuse path.
// Before `make assemble` runs there is no JSON yet, so `allowRaw` is empty and a beat that genuinely
// names no real material still passes, because it never uses a content noun in the first place.
const sceneJsonPath = /\.storyboard\.md$/.test(f) ? f.replace(/\.storyboard\.md$/, '.json') : null;
const sceneForWaivers = sceneJsonPath && fs.existsSync(sceneJsonPath)
  ? (() => { try { return JSON.parse(fs.readFileSync(sceneJsonPath, 'utf8')); } catch { return null; } })() : null;
const allowRaw = (sceneForWaivers?.authoring && Array.isArray(sceneForWaivers.authoring.allow)) ? sceneForWaivers.authoring.allow : [];

const gf = gateFindings();
// errs/warns/notes drive the console prose below, unchanged; err()/warn()/note() mirror each one into
// gf so --json (and the VAWE_FINDINGS_OUT side channel) carry the same facts as records. `note` is
// severity 'info': a fact worth printing with no bar behind it, never a blocker, never counted as a
// "finding" by author-check's own glyph-scrape (✗/~ only).
const errs = [], warns = [], notes = [];
const err = (code, msg, extra) => { errs.push(msg); gf.fail(code, msg, extra); };
const warn = (code, msg, extra) => { warns.push(msg); gf.warn(code, msg, extra); };
const note = (code, msg, extra) => { notes.push(msg); gf.note(code, msg, extra); };
// ── THE PICTURE, ACROSS THE FILM ────────────────────────────────────────────────────────────────
// Two rules that only exist between beats, so no per-beat check can see them. Both silent on a
// storyboard that declares neither field, for the reason the per-beat versions are.
function pictureAcrossFilm(blocks, notLine) {
  const arch = blocks.map((b) => (fieldIn(b, 'archetype') || '').trim().split(/\s+\(/)[0]);
  const wts = blocks.map((b) => (fieldIn(b, 'weight') || '').trim());
  const titles = blocks.map((b) => b.split('\n')[0].trim());
  const notCtx = { not: notLine ? [notLine] : [] };
  if (arch.some(Boolean)) {
    for (let i = 1; i < arch.length; i++) {
      if (arch[i] && arch[i] === arch[i - 1]) {
        const adapted = adaptFinding({ kind: 'archetype-repeat' }, notCtx).adapted;
        if (adapted) { warns.push(adapted.line); continue; }
        warn('archetype-repeat', `beats "${titles[i - 1]}" and "${titles[i]}" both use the "${arch[i]}" archetype. `
          + 'Two beats running with the same composition is the flat film: nothing about the cut between them '
          + 'reads as a change. Rotate it, or say why this pair is the exception.');
      }
    }
  }
  if (wts.some(Boolean)) {
    const peaks = wts.filter((w) => w === 'peak').length;
    if (peaks === 0) warn('no-peak', 'no beat declares `weight: peak`. A film that names no peak has not chosen '
      + 'restraint, it has chosen one flat volume for its whole runtime.');
    if (peaks > 1) err('two-peaks', `${peaks} beats declare \`weight: peak\`. One. Naming the loudest moment is at the `
      + 'same time a promise that every other beat stays quieter, and two peaks is no promise at all.');
  }
}

// ── frontmatter: the video's spine ──────────────────────────────────────────────────────────────
const fm = /^---\n([\s\S]*?)\n---/.exec(src);
const head = fm ? fm[1] : '';
const field = (k) => { const m = new RegExp(`^${k}\\s*:\\s*(.+)$`, 'mi').exec(head); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };
if (!fm) err('no-frontmatter', 'no frontmatter block: the spine (message · audience · arc · format · duration) goes in a leading --- … --- block');
const message = field('message');
if (!message) err('missing-message', 'missing `message:`. The ONE sentence this video communicates. Without it the video has no spine.');
else if (message.split(/\s+/).length > 20) warn('message-too-long', `message is ${message.split(/\s+/).length} words. A proposal message should be ONE tight sentence (≤ ~18 words).`);
for (const k of ['audience', 'arc', 'format', 'duration']) if (!field(k)) warn('missing-frontmatter-field', `missing \`${k}:\` in frontmatter`);

// ── WHAT HOLDS THE FILM: required on short films ──────────────────────────────────────────────────
// A film under ~15s has no room for chapters, so something has to carry the viewer across the cuts, and
// the plan is where that gets decided. TWO ANSWERS ARE ACCEPTED and they are not ranked. `threads:` names
// devices from engine-doctrine/CRAFT/FILM-STRUCTURE.md; `object:` names a continuous object, the one device the
// scene-side gate can measure, and the one Murch's Rule of Six ranks last of six. Demanding `object:`
// alone made a manifesto, an anthology, a comparison and a metric-cut film unplannable here.
//
// The object spine keeps its own shape when it IS the answer, object_t0 · object_states · object_last in
// the frontmatter (anything under a `##` heading is parsed as a beat), plus an `object:` line per beat,
// because a declared spine that no beat locates is a claim nobody kept.
// ── pacing is subjective to the type of video (the owner's steer), not one number for every film.
// filmType is derived structurally (harness/lib/genre-pacing.mjs): no storyboard records its scaffold
// type, so this reads the same content signals a human would (the `framework:` line, a captured
// `refs/*.mp4` clip, the filename) rather than trust a field nothing writes.
const filmType = classifyType(src, path.basename(f));
const holdMaxS = thresholdFor(filmType);

// No external source (Cinemetrics/ASL literature does not map: whole-film average shot length answers
// a different question than "below what runtime is a named holding device required").
// engine-doctrine/RESEARCH/TIMING-SOURCES.md part 3/6.
const SPINE_MAX_S = 15;
const durRaw = field('duration');
const durSec = parseDur(durRaw);
const shortFilm = durSec != null && durSec < SPINE_MAX_S;
const hasObject = !!field('object');
const hasThreads = !!field('threads');
if (shortFilm && !hasObject && !hasThreads) {
  err('no-holding-device', `this is a ${durRaw} film and the frontmatter names neither \`threads:\` nor \`object:\`, NAME WHAT HOLDS THIS FILM. Under ${SPINE_MAX_S}s there is no room for chapters, so a film whose beats are islands is a slideshow. Write \`threads:\` naming two devices from engine-doctrine/CRAFT/FILM-STRUCTURE.md (a match cut · a camera travel · a motif · a bookend · a metric cut rate · an unfinished sentence · an open question · a transforming object). If one of them is a continuous object, name it as \`object:\` too and the scene-side gate can check it.`);
}
if (shortFilm && !hasThreads && hasObject) {
  warn('single-thread', 'one thread only: `object:` names a continuous object and nothing else. A single thread has to be literal and obvious to work, which is how a film ends up as a resizing box. Add `threads:` with a second device (engine-doctrine/CRAFT/FILM-STRUCTURE.md).');
}
if (shortFilm && hasObject) for (const k of ['object_t0', 'object_states', 'object_last']) {
  if (!field(k)) warn('missing-object-field', `missing \`${k}:\`. A declared object spine needs the object's state at t=0, at each cut, and at the last frame (the payoff, or the moment before it).`);
}

// ── the two decisions that are made ONCE, for the whole film ──────────────────────────────────────
// PRESENCE ONLY, AND DELIBERATELY SO. This gate cannot tell a good spectacle from a bad one, and a check
// that pretended to would manufacture findings. The failure mode this repo logs hardest against. What it
// can tell is whether the decision was made at all, and both of these are decisions that vanish if nobody
// forces them. `spectacle:` names the one exaggerated moment, which is two-sided: naming it is at the same
// time a promise every other beat stays restrained, and a film that names none has quietly chosen "all of
// it, evenly", which is the flat register everything here comes out in by default. `not:` is the exclusion
// line, because most generic output is not a wrong decision, it is an un-excluded default.
//
// The film-side half is `make plan-check D=<file>` (quality/gates/plan-vs-render.mjs): it reads the same
// `spectacle:` line and warns when the scene builds no `spectacle` block, or builds one in another beat.
// Writing the peak down is not building it, exactly as with `becomes:`.
const spectacle = field('spectacle');
const not = field('not');
if (!spectacle) err('missing-spectacle', 'missing `spectacle:`. NAME THE ONE EXAGGERATED MOMENT: which beat, which layer, which device, and what it is for. It is two-sided, and that is the point: naming the peak is a promise that every other beat stays restrained. A film that names none has not chosen restraint, it has chosen one flat volume for the whole runtime. Then build it in the scene as `"spectacle": { "at", "of", "device", "why" }` (core/timeline/spectacle.js): `device` is a shader sting name (injected), or "<kind>:<name>" naming a cut, seam, kinetic preset, or another layer this film already builds (verified, not injected), which `make plan-check` checks against this line.');
if (!not) err('missing-not', 'missing `not:`. NAME WHAT THIS FILM IS NOT. Most generic output is not a wrong decision, it is an un-excluded default: the centred type, the even grid, the fade on everything. Write the defaults you are refusing here, in your own words, so the beats below have something to be measured against. Nothing grades the prose; the line exists so the decision gets made.');

// ── beats: each must state its job ────────────────────────────────────────────────────────────────
const beats = [...src.matchAll(/^##\s+(?:Beat\s+)?(\d+|[A-Za-z].*?)\s*[, :-].*$/gmi)];
const blocks = blocksOf(src);
if (blocks.length < 2) err('too-few-beats', 'fewer than 2 beats: a video is a sequence of beats; storyboard each one as `## Beat N, title`.');
const REQ = ['type', 'onscreen', 'why'];

// ── THE CAMERA, THE CUT IN, THE MOVE: reached at plan time, never silently documentary ─────────────
// `camera:`/`transition_in:`/`move:`/`motion:` are all fields a beat has always been able to write
// and, until now, only `camera:`/`transition_in:` risked being pure prose nobody built. Checked HERE
// (plan time, harness/lib/contract.mjs's own parsers, never a second copy of them) rather than only at
// `make assemble`, so a wrong or unresolved line is visible before the JSON exists, the same "catch it
// while it is still free to fix" this gate already does for the timeline (see below).
const sbBeats = timeline(parseStoryboard(src)).beats;
for (const e of cameraErrors(sbBeats)) err('camera-unknown', e);
for (const w of cameraWarnings(sbBeats)) warn('camera-undecided', w);
for (const e of cameraContinuityErrors(sbBeats)) err('camera-snap-at-seam', e);
// REPORT ONLY, never a blocker: the engine keeps every camera move's hold by design
// (skills/vawe-camera/SKILL.md); this only tells an author who did not intend it before the render does.
for (const w of cameraStillHeldWarnings(sbBeats)) warn('camera-still-held', w);
for (const e of transitionInErrors(sbBeats)) err('transition-in-unknown', e);
for (const w of transitionInWarnings(sbBeats)) warn('transition-in-undecided', w);
// `transition_why` runs the decision procedure's own questions per boundary (engine-doctrine/CRAFT/
// TRANSITIONS.md), report-only: a bad shape is an error (it will never parse), the three coverage/
// reasoning findings are warnings, because the field is new and a blocker here would fail every
// storyboard written before it existed.
for (const e of transitionWhyErrors(sbBeats)) err('transition-why-unknown', e);
// `transition_value:` names what this boundary does to ground VALUE (dark->light · light->dark ·
// held), the CLOSED set ground-arc.mjs's own classifier uses, so a declared value and a measured one
// are directly comparable (quality/gates/plan-vs-render.mjs). An ERROR, not a warning, the same as
// archetype/weight below: this field only exists once someone declares it, so a bad value is a typo,
// never an undecided sentence.
for (const e of transitionValueErrors(sbBeats)) err('transition-value-unknown', e);
// `ground:`/`kinetic:`/`elements:` (harness/lib/contract.mjs): the ground a beat sits on, the kinetic
// preset (+ split) its type uses, the layer types it puts on screen, each validated against the
// engine's own registry (core/backgrounds/presets.js, core/kinetic/presets.js, core/layers/index.js).
// PRESENCE ONLY, AND ONLY WHEN DECLARED, the same restraint archetype/weight below already keep: a
// storyboard written before these fields existed still passes.
for (const e of groundErrors(sbBeats)) err('ground-unknown', e);
for (const e of kineticErrors(sbBeats)) err('kinetic-unknown', e);
for (const e of elementsErrors(sbBeats)) err('elements-unknown', e);
const tf = transitionFindings(sbBeats);
for (const w of tf.unreasoned) warn('transition-unreasoned', w);
for (const w of tf.uncovered) warn('boundary-uncovered', w);
for (const w of tf.mismatch) warn('transition-reason-mismatch', w);
// `move:`/`motion:` are already a real grammar (never free prose): a bad line is a typo, not an
// undecided sentence, so it is reported here the same way `recipe:` already is above, a plan-time
// WARNING (assemble.mjs still blocks on it at JSON-build time; two gates, one parser).
for (const e of moveErrors(sbBeats)) warn('move-unknown', e);
for (const e of motionErrors(sbBeats)) warn('motion-unknown', e);
// `use:` is the general door onto the arsenal's 790-entry corpus (harness/lib/contract.mjs), checked
// here the same way: ambiguous, refused, or decisive-but-unknown is an ERROR (a name that will not
// build); free prose is a WARNING (documentary, never silently dropped). Top-level await: this file is
// ESM and a gate run resolving one corpus import is cheap next to the render it precedes.
const useCorpus = await arsenalCorpus();
for (const e of useErrors(sbBeats, useCorpus)) err('use-unresolved', e);
for (const w of useWarnings(sbBeats, useCorpus)) warn('use-prose', w);

// ── THE EYE: does the plan say where attention goes, per the owner's own framing (engine-doctrine/CRAFT/
// DIRECTION.md, "Directing the eye") - every device exists to point the eye somewhere, and naming the
// device without naming its target is not a plan. WARN, never a blocker: `eye:` is a new field and a
// blocker here would fail every storyboard written before it existed.
for (const w of eyeErrors(sbBeats)) warn('eye-unresolved', w);
sbBeats.forEach((b, i) => {
  if (hasEyeCandidateMotion(b) && !b.eye) {
    warn('eye-missing', `beat ${i + 1} (${b.name}) has motion (camera:/move:/motion:/recipe:) but no `
      + '`eye:` line. Add "eye: <where it starts> -> <what pulls it, naming the device> -> <where it lands>".');
  }
  const untargeted = eyeUntargetedDevices(b);
  for (const name of untargeted) {
    warn('eye-device-untargeted', `beat ${i + 1} (${b.name}) names "${name}" but its \`eye:\` line does `
      + `not use it: this device has no stated target. Either point \`eye:\` at what "${name}" pulls the `
      + 'eye toward, or drop the device.');
  }
  const p = parseEyeLine(b.eye, b);
  const competing = (p && !p.error) ? competingEyeDevices(p.device) : null;
  if (competing) {
    warn('eye-competing-focal-points', `beat ${i + 1} (${b.name}) eye: "${b.eye}" pulls toward `
      + `${competing.join(' and ')} with no stated order between them. Material's own choreography rule: `
      + '"maintain a clear focal point during transitions" (engine-doctrine/MOTION-CRAFT.md). Say which pulls '
      + 'first with "then"/"before"/"after", or drop one.');
  }
});

// ── PLAIN CONTENT: a beat that draws a screen/window/app/UI and names no real source for it ────────
// engine-doctrine/CRAFT/CONTENT.md: real content (a capture, a real photo, a screen designed for the video) is
// what makes a beat DENSE where the reference is dense; a beat that only DESCRIBES a screen and stops
// is the grey mock the owner named directly ("their content is designed for the video; ours is
// plain"). A BLOCKER, not a warning (the owner's own words: "no made-up content... always ask for
// these details explicitly"): a film that never names a real source for the content it draws reached
// design with nothing to show, and nothing stopped it. This does not fire on a film that names no content noun at all, so a
// legitimately asset-free film (a sting, a chart-only explainer, a pure type film) is never touched;
// a beat that DOES declare a real source, or is waived with a `_why` (the one waiver mechanism,
// AGENTS.md), still passes.
const CONTENT_NOUN_RE = /\b(screen|window|app|ui|dashboard|grid|card|product|photo)\b/i;
const REAL_ASSET_RE = /assets\/|\.vawe-data\/uploads\//;
const REAL_COMMAND_RE = /\bmake\s+(capture|sections|screen|assets|photos|gen-image|gen-video|gen-clip)\b/i;

// A RECIPE: structure measured off a real film (recipes/README.md), applied to layers the author
// already named. One parser, shared with assemble.mjs (harness/lib/contract.mjs parseRecipeLine), so
// an unknown name or an unfilled slot is caught here, before the JSON, not after. Its own function
// (not inlined in the beat loop) so the recipe/slot/param checks nest against a fresh function body,
// not against the loop's own depth.
function recipeLineFindings(b, title) {
  const recipe = fieldIn(b, 'recipe');
  if (!recipe) return;
  const rp = parseRecipeLine(recipe);
  if (rp.error) { err('recipe-unknown', `beat "${title}": recipe: "${recipe}" - ${rp.error}`); return; }
  if (rp.unknown.length) err('recipe-unknown-slot', `beat "${title}": recipe "${rp.name}" does not take `
    + `${rp.unknown.join(', ')}. Slots: ${Object.keys(rp.def.slots).join(', ')}. `
    + `Params: ${Object.keys(rp.def.params || {}).join(', ') || '(none)'}.`);
  if (rp.missingSlots.length) err('recipe-missing-slots', `beat "${title}": recipe "${rp.name}" is missing `
    + `slot(s): ${rp.missingSlots.join(', ')}. recipes/README.md.`);
}

function plainContentCheck(b, title) {
  const text = ['onscreen', 'picture', 'mechanism', 'object'].map((k) => fieldIn(b, k) || '').join(' ');
  const noun = (CONTENT_NOUN_RE.exec(text) || [])[1];
  if (!noun) return;
  if (REAL_ASSET_RE.test(b) || REAL_COMMAND_RE.test(b)) return;   // a real source is already named
  const { path: fragRaw, none: noFragment } = parseFragmentSpec(fieldIn(b, 'fragment'));
  if (noFragment) return;   // `fragment: none`: a native-layer beat, nothing on disk to check
  if (fragRaw) {
    const fragPath = fragRaw.includes('/') ? path.resolve(ROOT, fragRaw) : path.join(path.dirname(f), fragRaw);
    if (fs.existsSync(fragPath)) return;   // the fragment already exists on disk: a real source
  }
  if (isWaivedBy(allowRaw, 'plain-content', title)) return;   // {"authoring":{"allow":["plain-content@<title>"],"_why":{...}}}
  if (/^photo$/i.test(noun)) {
    err('plain-content', `beat "${title}": names a photo with no real source stated. ASK for the real image, `
      + 'do not invent one. Get it with `make photos` (engine-doctrine/CRAFT/IMAGERY.md), or `make gen-image` '
      + 'if none exists to capture; never draw an invented photo.');
    return;
  }
  err('plain-content', `beat "${title}": names a ${noun.toLowerCase()} but no real source is stated (no `
    + '`fragment:` file that exists on disk, no assets/ or .vawe-data/uploads/ path, no capture/sections/'
    + 'screen/assets/photos mention). ASK for the real source, do not invent one. A real screen already exists? '
    + '`make capture` or `make sections URL=<site>`. Otherwise design one for this beat: `make screen '
    + 'F=<fragment.html> [KIND=editor|grid|dashboard|chat|card] [REF=<ref> ACT=<n>] [THEME=<name>]` '
    + '(engine-doctrine/CRAFT/SCREENS.md). Chosen absence, not a gap? Waive it: '
    + `{"authoring":{"allow":["plain-content@${title}"],"_why":{"plain-content@${title}":"…"}}}.`);
}

// ── the vocabulary that separates a MECHANISM from a TRANSFORMATION ──────────────────────────────
// `mechanism:` answers how the frame moves; `becomes:` answers what the thing turned into. They read
// alike and are not the same question, and the cheap answer to the second is the first one again.
// A beat whose change is "fade, then slide up" has planned a move and no change at all.
const ANIM_VOCAB = /\b(fades?|slides?|wipes?|cuts?|dissolves?|zooms?|blurs?|scales?|rises?|drops?|pans?|pushe?s?|spins?|pops?|staggers?|reveals?|fade|slide|wipe|cut|dissolve|zoom|blur|scale|rise|drop|pan|push|spin|pop|stagger|reveal)\b/i;
// Bare `is` is deliberately NOT a change verb. "the card is faded out" would otherwise read as a
// transformation and suppress the very warning it should trip, and it would inflate the change count
// that held-state-too-long reads, so a 4s beat saying "the card is blurred" would escape both tells.
// A change verb has to name a thing on the far side of it.
const CHANGE_VERB = /(becomes?|turns? into|opens? into|collapses?|morphs?|splits?|unfolds?|folds?|resolves? into|hardens? into|→)/gi;

// ── the CAUSE: what MADE this beat happen ────────────────────────────────────────────────────────
// Three fields now sit beside each other and they answer three different questions. `mechanism:` is
// HOW the frame moves. `becomes:` is WHAT the thing turned into. `trigger:` is WHAT MADE IT HAPPEN.
// A film where every beat has a `becomes:` and no beat is caused by the one before it is a run of
// unrelated changes, which is the slideshow failure read off the plan instead of off the render.
// `no-continuous-object` cannot see this: it measures a prop surviving a junction, which is spatial,
// and a cause is not spatial. Named `trigger` because engine-doctrine/CRAFT/TRANSITIONS.md already calls it that
// ("motion that emerges from a real trigger, a whip, a touch point"); `because` was rejected for
// colliding with `why:`, which asks the beat's narrative job and is a third question again.
//
// REPORT, NEVER A REQUIREMENT. No storyboard in the library carries this field, so a per-beat presence
// blocker would fire on all twelve at once and be waived by reflex inside a week. What always prints is
// the CHAIN: the film's causal spine drawn as a line, every unstated link shown as a break. A plan whose
// spine is four fragments has learnt something a presence count never tells it.
//
// post hoc is not propter hoc: a trigger that only says WHEN is a sequence, and a slideshow already
// has one of those.
//
// TRIGGER_SEQUENCE/TRIGGER_EMPTY/isCausedTrigger now live in harness/lib/contract.mjs (imported above):
// assemble.mjs needs the exact same "is this a real cause" test to decide what to stage, and two copies
// of it is exactly the drift MISTAKES.md #159 already names.

// The time range the beat headings already carry: the SAME shape intent-from-storyboard reads.
const RANGE = SB_RANGE;
const spans = [];

let n = 0;
pictureAcrossFilm(blocks, not);
for (const b of blocks) {
  n++;
  const title = b.split('\n')[0].trim();
  const has = (k) => new RegExp(`(^|\\n)\\s*[-*]?\\s*${k}\\s*:`, 'i').test(b);
  const r = RANGE.exec(title);
  spans.push({ title, start: r ? parseFloat(r[1]) : null, end: r ? parseFloat(r[2]) : null });
  // A DECLARED object spine must be located in every beat. Only when the film declared one: a plan held
  // by a motif or a metric cut rate has no object to place, and asking for one anyway is what turned a
  // catalogue of devices into a single mandatory device.
  if (shortFilm && hasObject && !has('object')) err('beat-missing-object', `beat "${title}" is missing \`object:\`. This film declares \`object: "${field('object')}"\`, so say what it has become in this beat (or where it is, if it is not born yet). Every cut must read "the X becomes the Y". If the object is not really what holds this film, drop it and name the real devices in \`threads:\`.`);
  const missing = REQ.filter((k) => !has(k));
  if (missing.length) err('beat-missing-fields', `beat "${title}" is missing: ${missing.map((m) => `\`${m}\``).join(', ')} (every beat needs a type, its on-screen cues, and a WHY).`);
  plainContentCheck(b, title);
  // A beat that plans its frame with `make screen F=` and no matching `fragment:` has a frame no reader
  // can see: the stage, frame-check and the studio read `fragment:` only, so the film skips design.
  const screenFile = (/\bmake\s+screen\s+F=(\S+)/i.exec(b) || [])[1];
  const fragNamed = parseFragmentSpec(fieldIn(b, 'fragment')).path || '';
  if (screenFile && path.basename(fragNamed) !== path.basename(screenFile)) {
    err('screen-without-fragment', `beat "${title}": plans \`make screen F=${screenFile}\` but `
      + (fragNamed ? `its \`fragment:\` is ${fragNamed}` : 'has no `fragment:` line')
      + `. The stage, frame-check and the studio read \`fragment:\`, so this frame is invisible and the film `
      + `skips design. Add \`- fragment: ${screenFile}\`.`);
  }
  // A beat that names ANY of these has already said how it moves or arrived, so `blueprint:`/
  // `mechanism:` are not the only way to satisfy this: `recipe:` names structure copied from a real
  // film (recipes/README.md), and `camera:`/`move:`/`motion:` each reach a real engine capability
  // (harness/lib/contract.mjs). `blueprint:` itself is legacy free-text prose kept for older
  // storyboards; `make blueprints` no longer exists (the mechanism it drove was retired), so the fix
  // this warning names is `mechanism:` prose, a `recipe:` line, or `make arsenal Q="…"` for a named
  // core capability, never a dead command.
  if (!/(^|\n)\s*[-*]?\s*(blueprint|mechanism|recipe|camera|move|motion)\s*:/i.test(b)) {
    warn('beat-missing-blueprint', `beat "${title}": no \`mechanism:\`, \`recipe:\`, \`camera:\`, \`move:\` or `
      + `\`motion:\`, name the shot shape / motion so the JSON transcribes it: write \`mechanism:\` prose, a `
      + `\`recipe:\` line (recipes/README.md), or find a named capability with \`make arsenal Q="…"\`.`);
  }

  // The transformation, as a field of its own. `object:` says where the thing IS; `becomes:` says what
  // it TURNED INTO here. Measured against the reference film, our recreations landed state-changes at
  // half its rate. Every one of them planned by beats that never wrote the change down.
  const becomes = fieldIn(b, 'becomes');
  const teach = `beat "${title}" is missing \`becomes:\`, write the change at this junction as "the X becomes the Y". \`mechanism:\` is the preset (how it moves); \`becomes:\` is the change (what it turned into). They are different questions and the second is the one the viewer sees.`;
  if (!becomes) (shortFilm ? errs : warns).push(teach);
  else {
    const changes = becomes.match(CHANGE_VERB) || [];
    if (!changes.length && ANIM_VOCAB.test(becomes)) {
      warn('becomes-is-preset', `beat "${title}": becomes-is-a-preset, "${becomes}". That is the mechanism, not the transformation: \`mechanism:\` already answers how it moves; \`becomes:\` answers what it turned into.`);
    }
    // A beat is a hold for as long as nothing in it changes. NO EXTERNAL OR HOUSE SOURCE SETS A
    // CEILING ON A HELD VISUAL STATE: the answer depends on what the beat is SHOWING, a craft
    // judgement, not a measurable constant (harness/lib/genre-pacing.mjs's header has the full
    // argument, including why read-check.mjs's subtitling MAX_HOLD was tried here and rejected, for
    // the same reason a per-word formula was: a held beat need carry no prose at all). So this fires
    // only against `thresholdFor()`'s reported MOTION-CRAFT.md band, when one is known, worded as a
    // NOTE, not a cap: printed for an author or `make plan-judge`'s `beat-pacing` code to weigh, never
    // as a finding this gate enforces.
    const span = spans[n - 1];
    if (holdMaxS != null && span.start != null && span.end - span.start >= holdMaxS && changes.length <= 1) {
      const typeArticle = filmType && /^[aeiou]/i.test(filmType) ? 'an' : 'a';
      const recreationNote = filmType === 'recreation'
        ? '; recreation has no band of its own there and inherits its source\'s rhythm, so only the absolute ceiling applies' : '';
      note('held-state-too-long', `beat "${title}": held one state for ${(span.end - span.start).toFixed(2)}s, past `
        + `the ${holdMaxS.toFixed(1)}s band ${GENRE_PACING_SOURCE} reports for ${filmType ? `${typeArticle} ${filmType} film` : 'this film'}`
        + `${recreationNote}. This is a REPORT, not a bar: no external or house source sets a ceiling on how long an `
        + `arbitrary visual state may hold, only on how long readable PROSE may hold (that is read-check.mjs's job, `
        + `already cited: BBC subtitling, 2-5s). If this beat's text is prose, look there. Otherwise judge it by eye, `
        + `or with \`make plan-judge\`'s \`beat-pacing\` finding. ${describeReferenceBank()}. Either name the second `
        + `change or split the beat if it earns it.`);
    }
    // ── THE PICTURE'S OWN DECISIONS ──────────────────────────────────────────────────────────────
    // `picture:` and `style:` are prose, and prose is where the wrong object hides: a beat that
    // described "a white pill bar with a round cobalt run button" passed every check while drawing an
    // AI chat input into a film about a command line (engine-doctrine/MISTAKES.md #596). These three fields are
    // closed vocabularies precisely so a gate can disagree with them.
    //
    // PRESENCE ONLY, AND ONLY WHEN DECLARED. A film written before these existed still passes: this
    // gate grades the plan against itself, and inventing a failure for eight older storyboards would
    // teach nobody anything. What is DECLARED must be legal, and `frame-check` is where a declared
    // value meets the frame that was built from it.
    const arch = fieldIn(b, 'archetype');
    if (arch && !isArchetype(arch)) {
      err('archetype-unknown', `beat "${title}": archetype "${arch}" is not one of ${ARCHETYPES.join(' · ')}. `
        + 'The list is closed so that "no archetype twice in a row" is checkable rather than hoped for. '
        + 'If the composition genuinely is not one of these, write `other (what it is)` and the reason travels with it.');
    }
    const wt = fieldIn(b, 'weight');
    if (wt && !WEIGHTS.includes(String(wt).trim())) {
      err('weight-unknown', `beat "${title}": weight "${wt}" is not one of ${WEIGHTS.join(' · ')}. `
        + 'Exactly one beat in a film is the peak; naming it per beat is what makes the promise measurable '
        + 'against the frames actually built.');
    }
    const borrows = fieldIn(b, 'borrows');
    if (borrows && !/(->|→)\s*\S/.test(borrows)) {
      err('borrows-without-role', `beat "${title}": \`borrows: ${borrows}\` names a reference device and not what it `
        + 'BECOMES here. Write it as "<their device> -> <our object>". A shape copied without its role is how a '
        + 'chat input ends up in a film about a command line: their hero object is a chat box because their '
        + 'product is chat, and ours is not.');
    }

    recipeLineFindings(b, title);

    // ends-on-a-claim. The last beat puts a sentence on screen and nothing changes under it, so the
    // film's final act is a line of copy appearing. Three of our recreations closed exactly this way:
    // the closing line named a capability, the reference spent the same seconds performing it, and
    // ours stopped at the sentence. Deliberately inside the `else`: a final beat with NO `becomes:` is
    // already a blocker above, and one mistake should not collect two near-identical blockers.
    const onscreen = fieldIn(b, 'onscreen') || '';
    const quoted = /"[^"]+"/.test(onscreen);
    if (n === blocks.length && quoted && !changes.length) {
      (shortFilm ? errs : warns).push(`beat "${title}": ends-on-a-claim. The last thing that happens in this film is a sentence appearing. Its \`onscreen:\` puts copy up and its \`becomes:\` ("${becomes}") names no change, so the film closes on a statement it never demonstrates. If the last line says the product does X, the last beat has to show X happening: the toggle flipping, the card submitting, the state that proves the sentence. Name those changes in \`becomes:\` and the film ends on the thing instead of the promise.`);
    }
  }

  // The cause, read per beat and recorded on the span so the chain can be drawn below.
  const trigger = fieldIn(b, 'trigger');
  const filled = !!trigger && !TRIGGER_EMPTY.test(trigger);
  spans[n - 1].trigger = filled ? trigger : null;
  spans[n - 1].caused = isCausedTrigger(trigger);
  if (filled && TRIGGER_SEQUENCE.test(trigger)) {
    warn('trigger-is-sequence', `beat "${title}": trigger-is-a-sequence, "${trigger}". That says WHEN this beat happens, not what made it happen, and every slideshow already has an order. Name the act on screen that forces it: the cursor clicking Send, a number crossing the line, the hand letting go of the card.`);
  } else if (filled && trigger.split(/\s+/).length <= 6 && ANIM_VOCAB.test(trigger)) {
    // ponytail: word-count guard, because a long trigger that happens to contain "slides" is usually
    // describing a real event. Widen it only if short real causes start tripping.
    warn('trigger-is-mechanism', `beat "${title}": trigger-is-a-mechanism, "${trigger}". A cut or a fade is how the film arrives here, not why it had to. \`mechanism:\` already answers that. \`trigger:\` names the thing in the PREVIOUS beat that made this one necessary.`);
  }

  // A why that says "hook" restates the beat's category. The category is already in `type:`.
  const why = fieldIn(b, 'why');
  if (why && (why.split(/\s+/).length < 5 || /^(the\s+)?(hook|payoff|cta|because|setup|intro|outro)\b[\s.·, -]*$/i.test(why))) {
    warn('stub-why', `beat "${title}": stub-why, "${why}". A why states what the viewer learns or feels HERE and why it belongs at this point in the film, not the beat's category.`);
  }
}

// ── the CHAIN: the film's causal spine, printed every run ─────────────────────────────────────────
// One link per junction, so a five-beat film has four. A link is CAUSED when the beat after it states a
// trigger that names an act rather than a moment. The count that matters is fragments: a spine in one
// piece is a film where each beat forces the next, and four fragments is four films in a row.
const links = spans.slice(1);
const causedLinks = links.filter((s) => s.caused).length;
const fragments = 1 + (links.length - causedLinks);
const chainLines = spans.map((s, i) => {
  const head = `    ${i + 1}. ${s.title}`;
  if (i === 0) return head;
  const arrow = s.caused
    ? `       v because ${s.trigger}`
    : `       x nothing stated - these two beats only follow each other`;
  return `${arrow}\n${head}`;
});
if (links.length && causedLinks && causedLinks < links.length) {
  warn('chain-breaks', `chain-breaks: ${causedLinks} of ${links.length} junctions name what caused them and ${links.length - causedLinks} do not, so this film's causal spine is ${fragments} fragments, not one. The beats you did write a \`trigger:\` for prove the film can carry a cause; the gaps are where it stops and starts again. Fill the missing ones, or move the beat somewhere its cause exists.`);
}

// ── the clock: the storyboard already carries times, so read them ─────────────────────────────────
// The beat headings have carried "(0s-1.53s)" all along and nothing ever parsed them, so a plan could
// stop three seconds short of its own duration and every gate reported green. The last seconds are
// where the payoff lands; a plan that runs out early ships a film that ends on an unmade claim.
const timed = spans.filter((s) => s.start != null);
if (timed.length && timed.length < spans.length) {
  warn('partial-timeline', `partial-timeline: ${timed.length}/${spans.length} beats carry a (start s-end s) range. Without one on every beat the plan cannot be checked against the clock. Missing: ${spans.filter((s) => s.start == null).map((s) => `"${s.title}"`).join(', ')}.`);
} else if (timed.length === spans.length && spans.length) {
  for (let i = 1; i < spans.length; i++) {
    const prev = spans[i - 1], cur = spans[i];
    const d = cur.start - prev.end;
    if (d >= 0.5) err('timeline-hole', `timeline-hole: "${prev.title}" ends at ${prev.end}s and "${cur.title}" starts at ${cur.start}s: ${d.toFixed(2)}s of the film is unplanned. Nothing is storyboarded to be on screen there.`);
    else if (-d >= 0.5) err('timeline-hole', `timeline-hole: "${prev.title}" runs to ${prev.end}s while "${cur.title}" starts at ${cur.start}s: they overlap by ${(-d).toFixed(2)}s. Two beats claiming the same seconds means one of them is not planned.`);
  }
  const last = spans[spans.length - 1];
  if (durSec != null && durSec - last.end > 0.5) {
    err('timeline-underrun', `timeline-hole, your beats stop at ${last.end}s of a ${durSec}s film: ${(durSec - last.end).toFixed(2)}s of the film is unplanned. The last seconds are where the payoff lands; a storyboard that runs out early ships a film that ends on a claim it never demonstrated.`);
  }
  // …and the MIRROR, which was missing: beats that run PAST the declared duration. Only the short side
  // was checked, so a plan could declare 12s and storyboard 16s of beats and be called complete. The
  // overrun is the more expensive direction, because every beat after the clock runs out is work that
  // gets cut at author time, and the cut lands wherever the JSON happens to stop rather than where the
  // story should end. `plan-vs-render` fails `plan-overruns-render` for the same reason one stage later;
  // this is that check at the stage where it is still free to fix.
  if (durSec != null && last.end - durSec > 0.5) {
    err('timeline-overrun', `timeline-overrun, your beats run to ${last.end}s of a ${durSec}s film: ${(last.end - durSec).toFixed(2)}s more is storyboarded than the film has. Either raise \`duration:\` to ${Math.ceil(last.end)}s, or cut beats until they fit. Whichever you do, decide it here rather than letting the JSON run out mid-beat.`);
  }
}

// ── THE FILM AGAINST THE PLAN: does the motion this storyboard promised actually exist? ────────────
// Everything above grades the plan against itself. This is the one check that grades it against the
// thing it claims to have produced: a storyboard saying "the headline pushes left" and a rendered
// scene where nothing moves is a defect no static read of the markdown can ever find, because the
// markdown is telling the truth about its own intentions and lying about the film.
//
// ADVISORY (warn, never a blocker): a storyboard is legitimately checked before `make assemble` has
// ever run, and the film beside it may simply not exist yet, or may be mid-edit. What this reports is
// PRESENCE of the declared motion in the built layers, read the same way `edges`/`parseMotion`
// (harness/lib/contract.mjs) already read the storyboard, never a second parser.
const filmPath = /\.storyboard\.md$/.test(f) ? f.replace(/\.storyboard\.md$/, '.json') : null;
if (filmPath && fs.existsSync(filmPath)) {
  const full = parseStoryboard(src);
  const { beats: tBeats } = timeline(full);
  const scene = JSON.parse(fs.readFileSync(filmPath, 'utf8'));
  const sceneLayers = Array.isArray(scene.layers) ? scene.layers : [];
  const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= tol;
  // assemble.mjs writes exactly one `html` layer per beat, IN BEAT ORDER (scene1, scene2, …), so beat i
  // is html layer i by position. A staged junction (harness/lib/contract.mjs STAGE_S) now legitimately
  // writes a RELATIVE `start` ("scene1.end+0.05"), which `near()` on a raw number can no longer match,
  // so position is the one lookup that survives a start being either a number or a junction reference.
  const htmlLayersBuilt = sceneLayers.filter((l) => l.type === 'html');

  // motion: each beat's declared entries must show up as `parts` on the layer built for that beat.
  tBeats.forEach((b, i) => {
    const motion = parseMotion(b.motion);
    if (!motion.length) return;
    const layer = htmlLayersBuilt[i];
    if (!layer) {
      warn('motion-not-built', `beat "${b.name}" (${b.start}s) declares \`motion:\` but no scene layer starts there in ${path.basename(filmPath)}. Run \`make assemble D=${filmPath}\` to build it, or the storyboard is describing a film that does not exist.`);
      return;
    }
    const built = Array.isArray(layer.parts) ? layer.parts : [];
    for (const m of motion) {
      const match = built.find((p) => p.select === m.selector && p.anim === m.kind);
      if (!match) {
        const have = built.length ? built.map((p) => `${p.select}@${p.anim}`).join(', ') : '(none)';
        warn('motion-diverges', `beat "${b.name}": storyboard declares \`${m.selector}@${m.kind}\` but the built scene's layer at ${b.start}s carries: ${have}. The film does not do what the plan says. Re-run \`make assemble D=${filmPath}\`, or fix the storyboard.`);
      }
    }
  });

  // the continuous object: its edges must resolve to where the built layer's motion track actually is.
  const chain = chainErrors(tBeats).length ? [] : edges(tBeats);
  if (chain.length) {
    const objLayer = sceneLayers.find((l) => l.acrossBeats && Array.isArray(l.motion) && l.motion.length);
    if (!objLayer) {
      warn('object-not-built', `the storyboard declares a continuous-object contract (object_in/object_out) but ${path.basename(filmPath)} has no \`acrossBeats\` layer with a motion track. Run \`make assemble D=${filmPath}\`.`);
    } else {
      const aspect = scene.aspect || '16:9';
      const destination = scene.destination;
      const layerStart = objLayer.start ?? 0;
      const keyAt = (t) => {
        const tt = +(t - layerStart).toFixed(3);
        return objLayer.motion.find((k) => near(k.t, tt, 0.05));
      };
      // A staged junction (harness/lib/contract.mjs stagedSchedule, the SAME schedule assemble.mjs
      // builds the film from) moves where a beat's pose really lands: comparing against the storyboard's
      // raw beat.start/end here would flag every staged handoff as "diverges" even on a clean build.
      const { shiftedStart, shiftedEnd } = stagedSchedule(tBeats);
      const TOL = 4;
      // THE POSE, not only the position: w/h/rot/opacity are read off the built key exactly the way
      // motion-diverges already reads `parts` against `motion:`. A key that omits one of these (assemble
      // only writes w/h/rot/opacity when the chain actually uses them, contract.mjs) means "unchanged",
      // so a beat that DECLARES a pose value the built key does not carry is exactly the divergence this
      // was missing: the storyboard's promise (a rotation, a fade) silently did not survive the build.
      const poseCheck = (edge, key, base, when, verb) => {
        if (!key) return; // reported by the position check below, do not double-report
        if (edge.w !== base.w || edge.h !== base.h) {
          if (key.w == null || key.h == null || !near(key.w, edge.w, TOL) || !near(key.h, edge.h, TOL)) {
            warn('object-diverges', `beat "${when}": storyboard says the object ${verb} sized ${edge.w}x${edge.h} but the built key is ${key.w != null ? `${key.w}x${key.h}` : 'unsized (no w/h on this key)'}.`);
          }
        }
        if (edge.rot && (key.rot == null || !near(key.rot, edge.rot, 1))) {
          warn('object-diverges', `beat "${when}": storyboard says the object ${verb} rotated ${edge.rot}deg but the built key carries ${key.rot ?? 'no rotation'}.`);
        }
        if (edge.opacity !== 1 && (key.opacity == null || !near(key.opacity, edge.opacity, 0.02))) {
          warn('object-diverges', `beat "${when}": storyboard says the object ${verb} at opacity ${edge.opacity} but the built key carries ${key.opacity ?? 'full opacity'}.`);
        }
      };
      const base = { w: chain[0].in.w, h: chain[0].in.h };
      chain.forEach((e, i) => {
        const at = shiftedStart[i], to = shiftedEnd[i];
        const wantIn = resolvePx(e.in, { aspect, destination });
        const wantOut = resolvePx(e.out, { aspect, destination });
        const kIn = keyAt(at), kOut = keyAt(to);
        const gotIn = kIn ? { x: objLayer.x + kIn.x, y: objLayer.y + kIn.y } : null;
        const gotOut = kOut ? { x: objLayer.x + kOut.x, y: objLayer.y + kOut.y } : null;
        if (!gotIn || !near(gotIn.x, wantIn.x, TOL) || !near(gotIn.y, wantIn.y, TOL)) {
          warn('object-diverges', `beat "${e.name}" (${at}s): storyboard says the object arrives at ${e.in.placement}@${e.in.w}x${e.in.h} (${wantIn.x},${wantIn.y}px) but the built layer is at ${gotIn ? `${gotIn.x},${gotIn.y}px` : 'nowhere (no key at that time)'}.`);
        } else poseCheck(e.in, kIn, base, `${e.name} (${at}s)`, 'arrives');
        if (!gotOut || !near(gotOut.x, wantOut.x, TOL) || !near(gotOut.y, wantOut.y, TOL)) {
          warn('object-diverges', `beat "${e.name}" (${to}s): storyboard says the object leaves at ${e.out.placement}@${e.out.w}x${e.out.h} (${wantOut.x},${wantOut.y}px) but the built layer is at ${gotOut ? `${gotOut.x},${gotOut.y}px` : 'nowhere (no key at that time)'}.`);
        } else poseCheck(e.out, kOut, base, `${e.name} (${to}s)`, 'leaves');
      });
    }
  }
}

// ── did anybody LOOK at it ────────────────────────────────────────────────────────────────────────
// This gate reads a plan and grades it against itself, which cannot see composition at all. `make
// panels` draws one rough still per beat and is the only artefact that can. Never a blocker: a plan may
// legitimately be read without panels, and a gate that blocks on an advisory step teaches people to
// waive it. But "the storyboard changed since anyone last looked at the pictures" is precisely what the
// receipt exists to say out loud.
const seen = readReceipt('panels', f);
if (!seen.exists) warn('no-panels', `no panels have been drawn for this storyboard, run \`make panels SB=${f}\` and READ the sheet. This gate grades the plan against itself and cannot see composition; the panels are the only artefact at this stage that can.`);
else if (seen.stale) warn('stale-panels', `the panels are stale: they were drawn from an older version of this file (${seen.receipt.at}). Re-run \`make panels SB=${f}\` and look again; the beat you changed is the one nobody has seen.`);

// ── report ────────────────────────────────────────────────────────────────────────────────────────
console.log(`  storyboard-check · ${f} · ${blocks.length} beat(s)`);
if (message) console.log(`  message: "${message}"`);
if (links.length) {
  console.log(`  causal chain · ${causedLinks}/${links.length} junction(s) caused · ${fragments} fragment(s)`);
  for (const l of chainLines) console.log(l);
  if (!causedLinks) console.log(`    (no beat states a \`trigger:\`. It names WHAT MADE THIS BEAT HAPPEN. The act in the beat before that forced it. \`mechanism:\` is how it moves, \`becomes:\` is what it turned into, \`trigger:\` is why it had to.)`);
}
for (const e of errs) console.error(`    ✗ ${e}`);
for (const w of warns) console.log(`    ~ ${w}`);
for (const n of notes) console.log(`    · ${n}`);
if (errs.length) { console.error(`\n✗ storyboard incomplete, ${errs.length} blocker(s). Fill them before authoring JSON.`); process.exit(1); }
// `<fill: …>` IS the repo's placeholder convention, `intent-from-storyboard.mjs` already refuses to emit
// a `mustShow` for one, and this gate had never heard of it. So a storyboard where every single line was
// still a placeholder came back as "a complete proposal", which is the one thing it certainly was not. A
// skeleton is a legitimate artefact and is not a failure; announcing it as ready for sign-off is.
const unfilled = (src.match(/<fill:/g) || []).length;
if (unfilled) {
  console.log(`\n~ storyboard is STRUCTURALLY complete (every field the gate can check is present) but ${unfilled} decision(s) are still \`<fill: …>\`.`);
  console.log(`  It is a skeleton, not a proposal. Fill them before presenting: the gate reads shape, and shape is not the film.`);
  process.exit(0);
}
console.log(`\n✓ storyboard is a complete proposal: present it ("This video tells <audience> that <message>") and get sign-off before the JSON.`);
