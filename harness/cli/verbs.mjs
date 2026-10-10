// The verb table for bin/vawe. Each verb names the script it forwards to and the one command to run next.
// build() returns the steps to run in order; a step is { script, args, env }.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UsageError } from './parse.mjs';
import { compareProblem, CUTS } from '../media/compare-frames.mjs';
import { STRIP_FPS, STRIP_SPAN, stripProblem } from '../media/see/strip-math.mjs';

import { ONION_FRAMES, ONION_SPAN, onionProblem } from '../media/see/onion-math.mjs';
import { ZOOM_SCALE, zoomProblem } from '../media/see/zoom-math.mjs';
import { lookProblem } from '../media/see/look-math.mjs';
import { seeProblem } from '../media/see/one-math.mjs';
import { VELOCITY_SPAN, velocityProblem } from '../media/see/velocity-math.mjs';
import { filmKey, freshImages, summaryLines } from '../lib/critique-summary.mjs';
import { readFindings } from '../lib/findings.mjs';
import { scratch } from '../lib/scratch.mjs';
import { SAY, WAIT_WORK, nextStep } from '../live/stage-say.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// A test that compares seconds with a stamped budget reads a slowdown from the other test files as a slow check, so it runs alone, last.
export const SERIAL_TESTS = ['tests/media/check-budget.test.mjs'];

// Chrome on macOS prints these to stderr on every launch; they mean nothing for a render.
const CHROME_NOISE = [/task_policy_set/, /CVDisplayLinkCreateWithCGDisplay/];

/** `text` without the known Chrome noise lines. Pure. */
export const stripChromeNoise = (text) => String(text).split('\n').filter((l) => !CHROME_NOISE.some((re) => re.test(l))).join('\n');

/** The most commits HEAD lacks from the local `main` or `origin/main` ref (no network); 0 when neither exists. `git(args)` returns stdout or throws. */
export function commitsBehind(git) {
  return Math.max(0, ...['main', 'origin/main'].map((ref) => {
    try { return Number.parseInt(git(['rev-list', '--count', `HEAD..${ref}`]), 10) || 0; } catch { return 0; }
  }));
}

/** The sentence for an unknown verb on a checkout that lags main, or '' when it does not. Pure. */
export const staleNote = (behind) => (behind > 0 ? `this checkout is ${behind} commit${behind === 1 ? '' : 's'} behind main: the verb may exist there (git pull or rebase on main)` : '');

const testFiles =(dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? testFiles(path.join(dir, e.name)) : e.name.endsWith('.test.mjs') ? [path.join(dir, e.name)] : []));

/** The two node --test runs of `vawe test`: every test file in parallel except the serial ones, then the serial ones alone. */
export const testSteps = () => [{ node: ['--test', ...testFiles('tests').filter((f) => !SERIAL_TESTS.includes(f)).sort()] }, { node: ['--test', ...SERIAL_TESTS] }];

const pageName = (page) => {
  const base = path.basename(page, '.html');
  return base === 'page' ? path.basename(path.dirname(path.resolve(page))) : base;
};
const devNext = (v, [page]) => {
  if (v.from != null || v.to != null) return `bin/vawe strip ${page} --at <the second you fixed> and Read it; when every named second is fixed: ${SAY.critique(pageName(page), page)}`;
  const state = nextStep(path.resolve(page), ROOT);
  if (state.stage === 'draft') return SAY.motion(pageName(page), page);
  return state.stage === 'motion' && !/Motion pass/.test(state.why) ? state.next : `${state.next} (${state.why})`;
};
const readFresh = (file, sinceMs) => (fs.existsSync(file) && fs.statSync(file).mtimeMs >= sinceMs ? readFindings(file) || [] : []);
const critiqueFindingsFile = (page) => path.join(scratch('critique', filmKey(page)), 'findings.json');
const opt = (flag, value) => (value === undefined ? [] : [flag, String(value)]);

const PAGE = { name: 'page', required: true, kind: 'file', help: 'films/<name>/page.html' };
const ASPECT = 'one of 16:9 9:16 1:1 4:5 4:3';

export const VERBS = [
  {
    name: 'new', summary: 'start a film: films/<name>/page.html and brief.md',
    positional: [{ name: 'name', required: true, help: 'film name, lowercase with dashes' }],
    flags: [
      { name: 'from', type: 'path', default: 'the engine-doctrine/CRAFT/ROUTING.md row that --request, the name and --length point at; a sting when none does', help: 'prompts/<template>.md whose inputs section becomes brief.md', kind: 'file' },
      { name: 'request', type: 'string', help: 'the ask in its own words: picks the template when --from is absent, and goes into brief.md' },
      { name: 'answers', type: 'path', help: 'a markdown or `key: value` file with the details the request leaves open (subject, message, show, look, format, family, assets, ending)', kind: 'file' },
      { name: 'detail', type: 'string', repeat: true, help: 'one answer as key=value, repeatable; same keys as --answers' },
      { name: 'defaults', type: 'bool', help: 'unattended run: guess every open detail, marked (guess: change me), instead of printing the questions' },
      { name: 'questions-json', type: 'bool', help: 'print the open details as AskUserQuestion calls (JSON, at most 4 questions each) and write nothing' },
      { name: 'ref', type: 'path', help: 'recreate this reference mp4: writes films/recreations/<name> with SPEC.md', kind: 'file' },
      { name: 'length', type: 'number', help: 'film length in seconds: written to brief.md and the page duration meta' },
      { name: 'aspect', type: 'string', help: `${ASPECT}: written to brief.md and the page aspect meta` },
      { name: 'title', type: 'string', help: 'the starter headline: written to brief.md and the page' },
      { name: 'score', type: 'bool', help: 'with --ref: also render the starter and score it against the reference (slow)' },
    ],
    example: 'vawe new my-launch --from prompts/story-explainer.md',
    build: (v, [name]) => (v.ref ? [{ script: 'harness/dev/recreation-new.mjs', args: [], env: { TYPE: 'recreation', NAME: name, REF: v.ref, ...(v.score ? { SCORE: '1' } : {}) } }] : null),
  },
  {
    name: 'see', summary: 'ONE command that reads a film completely: shots and cuts, motion, light and texture, type, sound, and every image with its numbers (the full read of a bed for cutting to it: vawe sound); --vs puts a reference beside yours with advice',
    positional: [{ name: 'film', required: true, help: 'a rendered mp4, a page (its draft is rendered first when missing or older than the page), or a reference id from vawe refs list' }],
    flags: [
      { name: 'vs', type: 'string', help: 'a second film (same kinds as <film>), usually the reference: both are read, with a delta per measure, one advice line per delta and paired images of the same moment' },
      { name: 'at', type: 'string', help: 'a moment: adds its native frame, a strip, an onion and an edge zoom (with --vs, the same moment of both)' },
      { name: 'at-b', type: 'string', help: 'with --vs and --at: the second of the second film' },
      { name: 'from', type: 'string', help: 'start second: shots before it are left out of the report and the images' },
      { name: 'to', type: 'string', help: 'end second: shots after it are left out of the report and the images' },
      { name: 'draft', type: 'path', help: 'for a page: read this mp4 as its draft instead of out/<name>-draft.mp4', kind: 'file' },
      { name: 'out', type: 'path', default: 'out/see/<name>', help: 'folder for see.md, see.json and the images' },
      { name: 'no-ocr', type: 'bool', help: 'skip reading the words (OCR runs by default when tesseract is installed)' },
      { name: 'no-cache', type: 'bool', help: 'measure again even if this film and the code were measured before (the result is cached by content hash)' },
    ],
    example: 'vawe see out/my-launch.mp4   |   vawe see films/my-launch/page.html --vs mnowak   |   vawe see mnowak --at 2.4',
    build: (v, [film]) => {
      const problem = seeProblem({ at: v.at, atB: v['at-b'], from: v.from, to: v.to, vs: v.vs });
      if (problem) throw new UsageError(problem);
      return [{ script: 'harness/media/see/one.mjs', args: [film, ...opt('--vs', v.vs), ...opt('--at', v.at), ...opt('--at-b', v['at-b']), ...opt('--from', v.from), ...opt('--to', v.to), ...opt('--draft', v.draft), ...opt('--out', v.out), ...(v['no-ocr'] ? ['--no-ocr'] : []), ...(v['no-cache'] ? ['--no-cache'] : [])] }];
    },
    next: (v) => (v.vs ? 'Read see.md, then every image path in it at full size, each with the numbers under it; act on the advice lines (each names the page literal), then vawe see again' : 'Read see.md, then every image path in it at full size, each with the numbers under it; vawe see <film> --vs <ref id> puts a reference beside it'),
  },
  {
    name: 'frames', summary: 'one still per data-world element (the others hidden), a contact sheet and the still-frame layout rules; about 2 s',
    positional: [PAGE],
    flags: [
      { name: 'full', type: 'bool', help: 'full-size stills (the page\'s own size, 1920x1080 for 16:9) as out/<name>-frames/<id>-full.png; no sheet, no frames.html' },
      { name: 'world', type: 'string', repeat: true, help: 'only this world id (comma list or repeat the flag); no sheet, no frames.html. Each still is at its own world\'s time' },
    ],
    example: 'vawe frames films/my-launch/page.html   |   vawe frames films/my-launch/page.html --full --world s3,s5',
    build: (v, [page]) => [{ script: 'harness/media/frames.mjs', args: [page, ...(v.full ? ['--full'] : []), ...(v.world ?? []).flatMap((w) => ['--world', w])] }],
    next: (v, [page]) => (v.full || v.world?.length
      ? `Read the stills at full size and fix the states; then bin/vawe frames ${page} for the sheet`
      : nextStep(path.resolve(page), ROOT).next),
  },
  {
    name: 'dev', summary: 'draft render: half size, 30 fps, silent; also writes a key-frame sheet PNG next to it',
    positional: [PAGE],
    flags: [
      { name: 'from', type: 'number', help: 'start second' },
      { name: 'to', type: 'number', help: 'end second' },
      { name: 'aspect', type: 'string', default: 'the page meta, else 16:9', help: ASPECT },
      { name: 'audio', type: 'bool', help: 'mix the audio tags into the draft' },
      { name: 'out', type: 'path', default: 'out/<name>-draft.mp4, or out/<name>-draft-<from>-<to>.mp4 for a range', help: 'output file' },
      { name: 'fast', type: 'bool', help: 'run only the fast checks (page errors, text size and collisions, still windows, tail tiles, smoothness, motion lint on declared animations)' },
      { name: 'full', type: 'bool', help: 'also run the ship-tier checks: per-frame box motion lint, object tracks, loudness and peak' },
      { name: 'taste', type: 'bool', help: 'also print the taste lines (they are always in out/<name>.dev.md)' },
      { name: 'no-judge', type: 'bool', help: 'skip the stills judge that dev runs on the three directions, once per change of directions.html or their brief lines (about 25 s)' },
    ],
    example: 'vawe dev films/my-launch/page.html --from 2 --to 6',
    build: (v, [page]) => [
      { script: 'harness/live/dev-warn.mjs', args: [page] },
      { script: 'harness/media/render-page.mjs', args: [page, ...(v.out ? [v.out] : []), ...opt('--aspect', v.aspect), ...opt('--from', v.from), ...opt('--to', v.to), ...(v.audio ? ['--audio'] : []), ...(v.fast ? ['--fast'] : []), ...(v.full ? ['--full'] : []), ...(v.taste ? ['--taste'] : [])] },
      ...(v['no-judge'] ? [] : [{ script: 'harness/media/directions-judge.mjs', args: [page] }]),
    ],
    next: devNext,
  },
  {
    name: 'ship', summary: 'final render: 60 fps, motion blur, audio mixed, then a final check and a fresh judge; runs in the background',
    positional: [{ name: 'page|job', help: 'films/<name>/page.html; with --status, that page or a job id (default: the newest job)' }],
    flags: [
      { name: 'aspect', type: 'string', default: 'the page meta, else 16:9', help: `${ASPECT}, or all for one file each` },
      { name: 'out', type: 'path', default: 'out/<name>.mp4', help: 'output file (not with --aspect all)' },
      { name: 'wait', type: 'bool', help: 'block until the render ends instead of running it in the background; with --status, wait up to 9 minutes for the background job, one progress line per minute' },
      { name: 'status', type: 'bool', help: 'print the progress or the result of a background render' },
      { name: 'profile', type: 'bool', help: 'print a cost table: frames, subframes, screenshots, capture and encode seconds, the 5 costliest seconds' },
    ],
    example: 'vawe ship films/my-launch/page.html --aspect all   (then: vawe ship --status --wait)',
    build: (v, [page]) => {
      if (v.status) return [{ script: 'harness/media/ship-job.mjs', args: ['status', ...(page ? [page] : []), ...(v.wait ? ['--wait'] : [])] }];
      if (!page) throw new UsageError('missing <page>; usage: vawe ship <page> [flags]  or  vawe ship --status [job]');
      const args = [page, ...(v.out ? [v.out] : []), ...(v.profile ? ['--profile'] : [])];
      const warn = { script: 'harness/live/ship-warn.mjs', args: [page] };
      if (v.wait) return [warn, { script: 'harness/media/render-page.mjs', args: [...args, '--final', ...opt('--aspect', v.aspect)] }];
      return [warn, { script: 'harness/media/ship-job.mjs', args: ['start', ...args, ...opt('--aspect', v.aspect)] }];
    },
    next: (v, [page]) => {
      if (v.status) return 'if it says "not done", run vawe ship --status <page> --wait once more (one call blocks up to 9 minutes; never run two at once); the result includes the judge. Before you wait: ' + WAIT_WORK;
      if (v.wait) return `vawe judge out/${pageName(page)}.mp4`;
      return `rendering in the background: bin/vawe ship --status ${page} --wait (one call blocks up to 9 minutes; run it once, not in parallel); ${WAIT_WORK}`;
    },
  },
  {
    name: 'spec-sync', summary: 'write the times the last draft measured into the brief\'s Words and Objects tables (after you retimed on purpose)',
    positional: [PAGE],
    flags: [],
    example: 'vawe spec-sync films/my-launch/page.html',
    build: (v, [page]) => [{ script: 'harness/media/spec-sync.mjs', args: [page] }],
    next: (v, [page]) => `bin/vawe dev ${page}; the changed cells end in *`,
  },
  {
    name: 'critique', summary: 'phone sheet, strip, loop seam, measured deltas and page-check to look at',
    positional: [PAGE],
    flags: [
      { name: 'ref', type: 'path', help: 'reference mp4 to measure against (default: the reference the brief names)', kind: 'file' },
      { name: 'at', type: 'string', default: 'auto', help: 'seconds for the strip, or auto' },
      { name: 'from', type: 'number', help: 'with --ref: match only from this second' },
      { name: 'to', type: 'number', help: 'with --ref: match only to this second' },
      { name: 'final', type: 'bool', help: 'with --ref: match the full-size render; a pass unlocks vawe ship' },
    ],
    defaultRef: (v, [page]) => page,
    example: 'vawe critique films/my-launch/page.html --ref refs/ad.mp4 --at 4.2',
    build: (v, [page]) => [
      { label: 'page code traps', script: 'quality/gates/anim-traps.mjs', args: [page] },
      { label: 'phone sheet, strip and loop seam (renders a draft with audio when the last one is stale or silent; 1 to 3 min)', script: 'harness/media/see.mjs', args: [page, '--phone', '--strip', v.at || 'auto', '--loop'] },
      v.ref
        ? { label: 'motion against the reference (1 to 3 min)', script: 'harness/media/see.mjs', args: [page, '--dom', '--ref', v.ref, ...opt('--from', v.from), ...opt('--to', v.to), ...(v.final ? ['--final'] : [])] }
        : { label: 'measured deltas', script: 'harness/media/see.mjs', args: [page, '--measure'] },
      { label: 'page-check: text, cues, spectacle, cuts (1 to 3 min)', script: 'quality/gates/page-check.mjs', args: [page, ...opt('--ref', v.ref)], env: { VAWE_FINDINGS_OUT: critiqueFindingsFile(page) } },
    ],
    summary: (v, [page], sinceMs) => summaryLines(
      readFresh(critiqueFindingsFile(page), sinceMs),
      freshImages(scratch('see', filmKey(page)), sinceMs),
    ),
    next: (v, [page]) => `look at the sheets above, then ${SAY.judge(pageName(page), page, v.ref)}`,
  },
  {
    name: 'compare', summary: 'reference and your film at the same exact seconds, side by side, one PNG',
    positional: [{ name: 'ours.mp4', help: 'your render (a draft is fine); or use --page. Without --ref: a labelled sheet of your frames at the --at seconds' }],
    flags: [
      { name: 'page', type: 'path', help: 'seek this page and screenshot it at half size: no render needed; without --ref, only your frames, labelled with time', kind: 'file' },
      { name: 'ref', type: 'path', help: 'reference mp4 (default: the reference the brief names)', kind: 'file' },
      { name: 'alone', type: 'bool', help: 'only your frames, labelled with time, even when the brief names a reference' },
      { name: 'at', type: 'string', help: 'comma-separated film seconds, for example 2.5,3.1,4; or `cuts` for the middle of each world change (the last full draft\'s data-world spans: run vawe dev first)' },
      { name: 'from', type: 'number', default: 0, help: 'the film second where ours starts (a --from/--to draft)' },
      { name: 'out', type: 'path', default: 'out/compare-<ours>.png', help: 'output PNG' },
    ],
    defaultRef: (v, [ours]) => v.page ?? ours,
    example: 'vawe compare --page films/my-launch/page.html --at 2.5,3.1,4   |   vawe compare out/my-launch.mp4 --at cuts --ref refs/ad.mp4   (without --ref: only your frames, 3 per row)',
    build: (v, [ours]) => {
      const problem = compareProblem({ ours, page: v.page, ref: v.ref, at: v.at });
      if (problem) throw new UsageError(problem);
      return [{ script: 'harness/media/compare-frames.mjs', args: [...(ours ? [ours] : []), ...opt('--page', v.page), ...opt('--ref', v.ref), ...opt('--at', v.at), ...opt('--from', v.from), ...opt('--out', v.out)] }];
    },
    next: (v) => {
      const rows = v.at === CUTS ? 'one frame per world change, at its middle' : 'one frame per --at second';
      return v.ref ? `look at the PNG: ${rows}, reference left, yours right; fix the worst row first` : `look at the PNG: ${rows}, each labelled with its second, 3 per row, left to right`;
    },
  },
  {
    name: 'strip', summary: 'the frames through one moment as ONE grid plus the motion numbers of that window: when it starts, peaks and settles; or one strip per cut',
    positional: [{ name: 'film', required: true, help: 'a rendered mp4, a page (uses its last draft: run vawe dev first), or a reference id from vawe refs list (uses the 1080p copy)' }],
    flags: [
      { name: 'at', type: 'string', help: 'the second to centre the strip on' },
      { name: 'cuts', type: 'bool', help: 'one strip per world change (a page or mp4: the data-world spans of the last full draft) or per shot cut (a reference: spec.json); the strip is centred on the cut' },
      { name: 'span', type: 'number', default: STRIP_SPAN, help: 'seconds of film in the strip' },
      { name: 'fps', type: 'number', default: STRIP_FPS, help: 'frames per second of film in the strip; a grid holds 9 frames, more make a second grid' },
      { name: 'out', type: 'path', default: 'out/strip/<film>', help: 'folder for the grids' },
    ],
    example: 'vawe strip out/my-launch.mp4 --at 8.4   |   vawe strip films/my-launch/page.html --cuts   |   vawe strip u6iro1jHujs --cuts',
    build: (v, [film]) => {
      const span = v.span ?? STRIP_SPAN;
      const fps = v.fps ?? STRIP_FPS;
      const problem = stripProblem({ at: v.at, cuts: v.cuts, span, fps });
      if (problem) throw new UsageError(problem);
      return [{ script: 'harness/media/see.mjs', args: [film, ...(v.cuts ? ['--cuts'] : ['--moment', v.at]), '--span', String(span), '--fps', String(fps), ...opt('--out', v.out)] }];
    },
    next: (v, [film]) => `Read each grid path above at full size: frames run left to right, top to bottom, and the motion line gives the seconds the move starts and settles; ${v.cuts ? 'compare how the outgoing and incoming parts overlap at each cut' : 'then bin/vawe compare --at <s> to put the reference beside yours'}${v.cuts ? (film.endsWith('.html') ? `; ${SAY.motionRows(pageName(film))}, then ${SAY.critique(pageName(film), film)}` : '; then name 3 moves in "Taken from" (ref id, cut second)') : ''}`,
  },
  {
    name: 'onion', summary: 'several frames of one move blended into ONE image, newest strongest, older ones fainter and tinted cool to warm: the spacing, path and overshoot of the move',
    positional: [{ name: 'film', required: true, help: 'a rendered mp4, a page (uses its last draft: run vawe dev first), or a reference id from vawe refs list (uses the 1080p copy)' }],
    flags: [
      { name: 'at', type: 'string', help: 'the second to centre the onion on' },
      { name: 'span', type: 'number', default: ONION_SPAN, help: 'seconds of film the frames cover' },
      { name: 'n', type: 'number', default: ONION_FRAMES, help: 'frames blended, from 2 to 12' },
      { name: 'out', type: 'path', default: 'out/onion/<film>', help: 'folder for the PNG' },
    ],
    example: 'vawe onion out/my-launch.mp4 --at 8.4 --span 0.6 --n 6   |   vawe onion u6iro1jHujs --at 12.3',
    build: (v, [film]) => {
      const span = v.span ?? ONION_SPAN;
      const n = v.n ?? ONION_FRAMES;
      const problem = onionProblem({ at: v.at, span, n });
      if (problem) throw new UsageError(problem);
      return [{ script: 'harness/media/see.mjs', args: [film, '--onion', v.at, '--span', String(span), '--n', String(n), ...opt('--out', v.out)] }];
    },
    next: () => 'Read the PNG at full size: evenly spaced ghosts mean a linear move, ghosts bunched at one end mean an ease, a ghost past the final position means an overshoot; vawe velocity gives the numbers for a page',
  },
  {
    name: 'zoom', summary: 'one region of a frame enlarged with no smoothing (every pixel a square), beside the same region of a second film: fringes, masks and glow',
    positional: [{ name: 'film', required: true, help: 'a rendered mp4, a page (uses its last draft: run vawe dev first), or a reference id from vawe refs list' }],
    flags: [
      { name: 'at', type: 'string', help: 'the second to crop' },
      { name: 'box', type: 'string', help: 'x,y,w,h in 1920x1080 pixels' },
      { name: 'auto', type: 'bool', help: 'crop 240x135 around the densest bright text edge instead of --box' },
      { name: 'scale', type: 'number', default: ZOOM_SCALE, help: 'whole-number enlargement, 1 to 16' },
      { name: 'vs', type: 'string', help: 'a second film (same kinds as <film>): its region goes right of the first, labelled' },
      { name: 'at-b', type: 'string', help: 'with --vs: the second of the second film (default: --at)' },
      { name: 'out', type: 'path', default: 'out/zoom/<film>', help: 'folder for the PNG' },
    ],
    example: 'vawe zoom out/my-launch.mp4 --vs mnowak --at 2.4 --box 800,400,240,135   |   vawe zoom films/my-launch/page.html --auto --at 3',
    build: (v, [film]) => {
      const scale = v.scale ?? ZOOM_SCALE;
      const problem = zoomProblem({ at: v.at, box: v.box, auto: v.auto, scale, vs: v.vs, atB: v['at-b'] });
      if (problem) throw new UsageError(problem);
      return [{ script: 'harness/media/see/zoom.mjs', args: [film, '--at', v.at, ...(v.auto ? ['--auto'] : ['--box', v.box]), '--scale', String(scale), ...opt('--vs', v.vs), ...opt('--at-b', v['at-b']), ...opt('--out', v.out)] }];
    },
    next: () => 'Read the PNG at full size: left is a, right is b; name the pixel pattern you see (colour fringes, a stripe mask, halo width) and then vawe look for the numbers',
  },
  {
    name: 'look', summary: 'numbers for light and texture, a against b: flashes, clipped pixels, bloom width, colour fringe, screen pattern, glow colour, with advice',
    positional: [{ name: 'film', required: true, help: 'a rendered mp4, a page (uses its last draft: run vawe dev first), or a reference id from vawe refs list' }],
    flags: [
      { name: 'vs', type: 'string', help: 'a second film, usually the reference: adds its column and advice lines' },
      { name: 'from', type: 'string', help: 'start second of the window (default: 0)' },
      { name: 'to', type: 'string', help: 'end second of the window (default: the end)' },
    ],
    example: 'vawe look out/my-launch.mp4 --vs mnowak   |   vawe look films/my-launch/page.html --from 2 --to 6',
    build: (v, [film]) => {
      const problem = lookProblem({ from: v.from, to: v.to });
      if (problem) throw new UsageError(problem);
      return [{ script: 'harness/media/see/look.mjs', args: [film, ...opt('--vs', v.vs), ...opt('--from', v.from), ...opt('--to', v.to)] }];
    },
    next: (v) => (v.vs ? 'act on the advice lines, then vawe zoom <film> --vs <ref> --auto --at <s> to see the pixels behind a number' : 'vawe look <film> --vs <ref id> to put the numbers beside a reference'),
  },
  {
    name: 'velocity', summary: 'the speed and scale of page elements over time as a graph, with start, peak, settle, overshoot and ease shape per element (exact: read from the page)',
    positional: [PAGE],
    flags: [
      { name: 'at', type: 'string', help: 'the second to centre the window on' },
      { name: 'span', type: 'number', default: VELOCITY_SPAN, help: 'seconds of film in the window, sampled 120 a second' },
      { name: 'sel', type: 'string', help: 'a CSS selector: graph every element it matches (default: the 4 elements that move most)' },
      { name: 'ids', type: 'string', help: 'element ids, comma separated, instead of --sel' },
      { name: 'out', type: 'path', default: 'out/velocity', help: 'folder for the PNG' },
    ],
    example: 'vawe velocity films/my-launch/page.html --at 2.75   |   vawe velocity films/my-launch/page.html --at 4 --span 0.5 --sel .card',
    build: (v, [page]) => {
      const span = v.span ?? VELOCITY_SPAN;
      const problem = velocityProblem({ at: v.at, span, sel: v.sel, ids: v.ids });
      if (problem) throw new UsageError(problem);
      return [{ script: 'harness/media/see.mjs', args: [page, '--velocity', v.at, '--span', String(span), ...opt('--sel', v.sel), ...opt('--ids', v.ids), ...opt('--out', v.out)] }];
    },
    next: () => 'Read the PNG, then fix the move the summary names: the page literal that sets its ease, its duration or its overshoot',
  },
  {
    name: 'coverage', summary: 'SSIM of your render against the reference at every step; the done check for a recreation',
    positional: [{ name: 'ours.mp4', required: true, kind: 'file', help: 'your render' }],
    flags: [
      { name: 'ref', type: 'path', help: 'reference mp4', kind: 'file' },
      { name: 'step', type: 'number', default: 0.1, help: 'seconds between samples' },
      { name: 'min', type: 'number', default: 0.5, help: 'exit 1 when any second falls below this SSIM' },
      { name: 'out', type: 'path', default: 'out/coverage-<ours>.png', help: 'sheet of the 6 worst moments' },
      { name: 'text', type: 'bool', help: 'check the on-screen words instead of SSIM: every reference row present in yours within 0.25 s; exit 1 when a row is missing' },
    ],
    example: 'vawe coverage out/my-launch.mp4 --ref refs/ad.mp4 --min 0.6',
    build: (v, [ours]) => [{ script: 'harness/media/coverage.mjs', args: [ours, ...opt('--ref', v.ref), ...opt('--step', v.step), ...opt('--min', v.min), ...opt('--out', v.out), ...(v.text ? ['--text'] : [])] }],
    next: () => 'look at the sheet, then vawe compare --page at the worst seconds',
  },
  {
    name: 'review', summary: 'one report, one sheet: clipped glyphs, text timing, motion, coverage, worst first',
    positional: [PAGE],
    flags: [
      { name: 'ref', type: 'path', help: 'reference mp4: compare motion and run coverage', kind: 'file' },
      { name: 'final', type: 'bool', help: 'review the full-size 60 fps render instead of the half-size draft' },
      { name: 'text', type: 'bool', help: 'with --ref: also check the on-screen words against the reference (slow)' },
      { name: 'table', type: 'bool', help: 'print the text timing table (it is always written to out/<name>-review.json)' },
      { name: 'judge', type: 'bool', help: 'prepare the default-reject judge and print the command for a fresh session' },
      { name: 'out', type: 'path', default: 'out/review-<name>.png', help: 'the picture sheet of the 6 worst findings' },
    ],
    example: 'vawe review films/my-launch/page.html --ref refs/ad.mp4',
    build: (v, [page]) => [{ script: 'harness/media/review.mjs', args: [page, ...opt('--ref', v.ref), ...(v.final ? ['--final'] : []), ...(v.text ? ['--text'] : []), ...(v.table ? ['--table'] : []), ...(v.judge ? ['--judge'] : []), ...opt('--out', v.out)] }],
    next: (v, [page]) => `fix the line marked "Fix first", then vawe review ${page} again`,
  },
  {
    name: 'spec', summary: 'measure a reference mp4 into SPEC.md and spec.json',
    positional: [{ name: 'ref.mp4', required: true, kind: 'file', help: 'the reference film' }],
    flags: [
      { name: 'out', type: 'path', default: 'next to the reference', help: 'output directory' },
      { name: 'no-ocr', type: 'bool', help: 'skip the text timeline (OCR runs by default when tesseract is installed)' },
      { name: 'fps', type: 'number', default: 'the video rate', help: 'frame rate for the tables' },
      { name: 'elements', type: 'number', default: 6, help: 'moving elements to track' },
      { name: 'fast', type: 'bool', help: 'half the analysis width and OCR samples, for iteration' },
      { name: 'no-cache', type: 'bool', help: 'measure again even if this reference and code were measured before' },
    ],
    example: 'vawe spec refs/ad.mp4',
    build: (v, [ref]) => [{ script: 'harness/media/ref-spec.mjs', args: [ref, ...opt('--out', v.out), ...opt('--fps', v.fps), ...opt('--elements', v.elements), ...(v['no-ocr'] ? [] : ['--ocr']), ...(v.fast ? ['--fast'] : []), ...(v['no-cache'] ? ['--no-cache'] : [])] }],
    next: () => 'mark every SPEC.md line KEEP or CHANGE, then vawe new <name> and rebuild',
  },
  {
    name: 'refs', summary: 'the top reference films to study before you design, and that the fresh judge compares your film with (kept outside the repo in ~/.vawe/refs, or $VAWE_REFS_DIR)',
    positional: [{ name: 'action', required: true, help: 'list, index (build refs.json from the folder), add, or frames (the settled full-size frame of each shot, into frames/<id>/ with a frames.json manifest; prints every absolute path)' }, { name: 'source', help: 'with add: an mp4 file or a URL (yt-dlp, 360p); with frames: one film id (default: every film in scope); with list: one film id, whose frame paths it prints' }],
    flags: [
      { name: 'type', type: 'string', help: 'with add: product (product and UI launch films) or brand (idents, brand and studio films)' },
      { name: 'title', type: 'string', help: 'with add: the film title' },
    ],
    example: 'vawe refs list [id]   |   vawe refs frames u6iro1jHujs   |   vawe refs add https://youtu.be/xxxx --type product --title "Linear Agent"',
    build: (v, [action, source]) => [{ script: 'harness/dev/refs.mjs', args: [action, ...(source ? [source] : []), ...opt('--type', v.type), ...opt('--title', v.title)] }],
    next: (v, [action]) => (action === 'list' ? 'bin/vawe refs frames, then Read the absolute paths it prints (one per frame) at full size before you design; bin/vawe strip <id> --cuts shows how the film moves through each cut' : action === 'frames' ? 'Read the frames at full size; write what you take from which frame before you design' : 'bin/vawe refs list'),
  },
  {
    name: 'studio', summary: 'live scrubbable preview; edits the page literals in place',
    positional: [PAGE],
    flags: [{ name: 'port', type: 'number', default: 8799, help: 'http port' }],
    example: 'vawe studio films/my-launch/page.html --port 8800',
    build: (v, [page]) => [{ script: 'studio/page-server.mjs', args: [page], env: v.port ? { PORT: String(v.port) } : {} }],
  },
  {
    name: 'check', summary: 'run one gate by name; bare lists the gates',
    positional: [{ name: 'name', help: 'gate name, then that gate\'s own args' }],
    flags: [], raw: true,
    example: 'vawe check anim-traps films/my-launch/page.html',
    build: (v, args) => [{ script: 'harness/lib/check-gate.mjs', args }],
  },
  {
    name: 'doctor', summary: 'check node, ffmpeg, Chrome and the other tools; print the install line for each missing one',
    positional: [],
    flags: [
      { name: 'quiet', type: 'bool', help: 'print only problems and write .vawe/doctor.json' },
      { name: 'json', type: 'bool', help: 'print [{tool, required, ok, version, fix}] instead of text' },
    ],
    example: 'vawe doctor --json',
    build: (v) => [{ script: 'harness/dev/doctor.mjs', args: [...(v.quiet ? ['--quiet'] : []), ...(v.json ? ['--json'] : [])] }],
  },
  {
    name: 'moves', summary: 'render the stale prompts/moves/demo/<move>.html clips to prompts/moves/<move>.mp4 (640 px, 60 fps) in parallel; a clip is stale when its demo, demo.css or a core/ import changed',
    positional: [],
    flags: [
      { name: 'only', type: 'string', help: 'render one move by name, for example weight-morph, even when current' },
      { name: 'all', type: 'bool', help: 'render every clip, stale or not' },
    ],
    example: 'vawe moves --only weight-morph',
    build: (v) => [{ script: 'harness/media/render-moves.mjs', args: [...opt('--only', v.only), ...(v.all ? ['--all'] : [])] }],
    next: () => 'look at a clip in prompts/moves/ before you commit it',
  },
  {
    name: 'fonts', summary: 'the free font faces, one line each, with the file to copy into films/<name>/assets/',
    positional: [], flags: [],
    example: 'vawe fonts',
    build: () => [{ script: 'harness/dev/list-assets.mjs', args: ['fonts'] }],
  },
  {
    name: 'sound', summary: 'the sound of a track, a film or a page read completely, for cutting to the music: loudness, tempo, beat grid with frames, bars, every hit, sections, a PNG, and with --cuts each cut against the beat; with --at or --waveform the cues of a page; with no argument the synth voices',
    positional: [{ name: 'input', required: false, help: 'an audio file (m4a, mp3, wav), an mp4 with audio, a reference id from vawe refs list, or a page (reads its <audio loop> bed, the synth cues as separate rows, and the page\'s own cuts); none: list the synth voices for <audio data-synth>' }],
    flags: [
      { name: 'cuts', type: 'string', help: 'a page (exact worlds from the DOM), an mp4 or a reference id (shot cuts): a table per cut with the nearest hit and beat line, offset in ms and frames, verdict, and the second to move each off cut to' },
      { name: 'from', type: 'number', help: 'start second of the window' },
      { name: 'to', type: 'number', help: 'end second of the window' },
      { name: 'at', type: 'string', help: 'a page: comma-separated seconds, for example 0.8,2.75: the cues sounding there, how far into each and its level in dB' },
      { name: 'waveform', type: 'bool', help: 'a page: one PNG of the mixed waveform, loudness curve, world starts and a tick per cue; prints LUFS and true peak' },
      { name: 'out', type: 'path', default: 'out/see/<name>, or out/<film>-waveform.png with --waveform', help: 'folder for sound.md, sound.json and sound.png, or the PNG path with --waveform' },
      { name: 'no-cache', type: 'bool', help: 'read the track again even if this file and the code were read before' },
    ],
    example: 'vawe sound assets/bed.m4a --cuts films/my-launch/page.html   |   vawe sound films/my-launch/page.html   |   vawe sound films/my-launch/page.html --at 0.8,2.75   |   vawe sound',
    build: (v, [input]) => {
      const view = Boolean(v.at || v.waveform);
      if (!input) {
        if (view || v.cuts) throw new UsageError('give a page: usage: vawe sound <page> --at 0.8,2.75 | --waveform');
        return [{ script: 'harness/dev/list-assets.mjs', args: ['sounds'] }];
      }
      if (view) {
        if (!input.endsWith('.html')) throw new UsageError('--at and --waveform read a page: usage: vawe sound <page> --at 0.8,2.75 | --waveform');
        return [{ script: 'harness/media/audio-view.mjs', args: [input, ...opt('--at', v.at), ...(v.waveform ? ['--waveform'] : []), ...opt('--out', v.out)] }];
      }
      return [{ script: 'harness/media/sound.mjs', args: [input, ...opt('--cuts', v.cuts), ...opt('--from', v.from), ...opt('--to', v.to), ...opt('--out', v.out), ...(v['no-cache'] ? ['--no-cache'] : [])] }];
    },
    next: (v, [input]) => (!input ? 'a voice goes in <audio data-synth="name" data-at="s">; vawe sound <bed> gives the beat grid and hits of a music bed'
      : v.at || v.waveform ? (v.waveform ? 'Read the PNG: each orange tick must sit on the dashed world line of its visual event; move a cue with data-at or data-on' : 'a cue 0 s into itself starts at that second; move one that is off its event with data-at')
        : 'Read sound.md and sound.png; put each cut on a hit or a beat line at the frame the cut table names, then vawe sound <bed> --cuts <page> again'),
  },
  {
    name: 'sounds', summary: 'alias of vawe sound with no argument: the synth voices for <audio data-synth>, one line each, with default gain and length',
    positional: [], flags: [],
    example: 'vawe sounds',
    next: () => 'vawe sounds is now vawe sound with no argument; both print the same list',
    build: () => [{ script: 'harness/dev/list-assets.mjs', args: ['sounds'] }],
  },
  {
    name: 'timeline', summary: 'the worlds, cut rhythm, spectacle and every audio cue as text, before any pixel; about 3 s',
    positional: [PAGE],
    flags: [{ name: 'json', type: 'bool', help: 'print the same data as JSON' }],
    example: 'vawe timeline films/my-launch/page.html',
    build: (v, [page]) => [{ script: 'harness/media/timeline.mjs', args: [page, ...(v.json ? ['--json'] : [])] }],
    next: (v, [page]) => `fix a flagged rhythm or a cue in the wrong world, then bin/vawe sound ${page} --waveform to check each sound on its event`,
  },
  {
    name: 'audio', summary: 'alias of vawe sound: which cues sound at given seconds and how loud, or one PNG of the mixed waveform with world lines and cue ticks',
    positional: [PAGE],
    flags: [
      { name: 'at', type: 'string', help: 'comma-separated seconds, for example 0.8,2.75: the cues sounding there, how far into each and its level in dB' },
      { name: 'waveform', type: 'bool', help: 'one PNG: mixed waveform, loudness curve, world starts as dashed lines, a tick per cue start; prints LUFS and true peak' },
      { name: 'out', type: 'path', default: 'out/<film>-waveform.png', help: 'with --waveform: the PNG path' },
    ],
    example: 'vawe audio films/my-launch/page.html --at 0.8,2.75   |   vawe audio films/my-launch/page.html --waveform',
    build: (v, [page]) => {
      if (!v.at && !v.waveform) throw new UsageError('give --at <s,s,...> or --waveform; usage: vawe audio <page> --at 0.8,2.75');
      return [{ script: 'harness/media/audio-view.mjs', args: [page, ...opt('--at', v.at), ...(v.waveform ? ['--waveform'] : []), ...opt('--out', v.out)] }];
    },
    next: (v) => `vawe audio is now vawe sound <page> ${v.waveform ? '--waveform' : '--at <s,s>'}; the output is the same`,
  },
  {
    name: 'e2e', summary: 'page tests plus a parallel half-size draft of every film (about 5 s)',
    positional: [], flags: [],
    example: 'vawe e2e',
    build: () => [{ script: 'harness/dev/e2e.mjs', args: [] }],
  },
  {
    name: 'test', summary: 'run every tests/**/*.test.mjs with node --test; the timing test runs alone at the end',
    positional: [], flags: [],
    example: 'vawe test',
    build: () => testSteps(),
  },
  {
    name: 'runs', summary: 'where a film\'s time went (per stage and verb, slot wait), what failed (by cause) and the draft series; or, with --all, one row per film of the last 30 days',
    positional: [{ name: 'film', help: 'film name or films/<name>/page.html' }],
    flags: [
      { name: 'all', type: 'bool', help: 'one row per film (drafts, median draft seconds, first and best judged total, PASS), then medians per model' },
      { name: 'taste', type: 'bool', help: 'the taste report over every film: per rule fired, fixed, waived, score gain and a verdict; variety per dial; sibling films; template tells' },
      { name: 'json', type: 'bool', help: 'print the records (or with --all or --taste the report) as JSON' },
      { name: 'dir', type: 'path', default: 'out', help: 'the folder that holds the <film>.runs.jsonl files' },
    ],
    example: 'vawe runs my-launch   |   vawe runs --all   |   vawe runs --taste',
    build: (v, [film]) => {
      if (!v.all && !v.taste && !film) throw new UsageError('missing <film>; usage: vawe runs <film>, vawe runs --all or vawe runs --taste');
      return [{ script: 'harness/dev/runs.mjs', args: [...(v.taste ? ['--taste'] : v.all ? ['--all'] : [film]), ...(v.json ? ['--json'] : []), ...opt('--dir', v.dir)] }];
    },
  },
  {
    name: 'judge', summary: 'prepare key frames and the rubric for a fresh session to score',
    positional: [{ name: 'page|mp4', required: true, kind: 'file', help: 'a page or a rendered mp4' }],
    flags: [
      { name: 'ref', type: 'path', help: 'reference mp4 (default: the reference the brief names)', kind: 'file' },
      { name: 'struct', type: 'bool', help: 'add the structure pass' },
      { name: 'runs', type: 'string', help: 'double-run labels, for example A,B' },
      { name: 'verdict', type: 'string', help: 'record PASS or FIX; writes out/<name>.judge.json' },
      { name: 'at', type: 'number', help: 'with a FIX verdict: the second of the top fix' },
      { name: 'top-fix', type: 'string', help: 'with a FIX verdict: the one concrete fix' },
      { name: 'fresh', type: 'bool', help: 'score now with a separate headless claude session (Read tool only); about 30 s; advises, never blocks' },
      { name: 'brief', type: 'path', help: 'with --fresh: the brief the judge reads', kind: 'file' },
      { name: 'stage', type: 'string', help: 'with --fresh: stills, draft or final' },
    ],
    defaultRef: (v, [input]) => (v.fresh || v.verdict ? null : input),
    example: 'vawe judge out/my-launch.mp4 --struct --runs A,B   |   vawe judge --fresh films/x/page.html --brief films/x/brief.md',
    build: (v, [input]) => v.fresh ? [{ script: 'harness/media/judge-fresh.mjs', args: [input, ...opt('--brief', v.brief), ...opt('--stage', v.stage)] }] : [{ script: 'quality/gates/judge.mjs', args: [input, ...opt('--ref', v.ref), ...(v.struct ? ['--struct'] : []), ...opt('--runs', v.runs), ...opt('--verdict', v.verdict), ...opt('--at', v.at), ...opt('--top-fix', v['top-fix'])] }],
    next: (v) => (v.fresh ? 'read the report; fix the lines under 8, worst first' : 'judge returns at once; do not poll for it'),
  },
];
