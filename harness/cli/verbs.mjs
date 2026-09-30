// The verb table for bin/vawe. Each verb names the script it forwards to and the one command to run next.
// build() returns the steps to run in order; a step is { script, args, env }.
import path from 'node:path';
import { UsageError } from './parse.mjs';

const pageName = (page) => {
  const base = path.basename(page, '.html');
  return base === 'page' ? path.basename(path.dirname(path.resolve(page))) : base;
};
const opt = (flag, value) => (value === undefined ? [] : [flag, String(value)]);

const PAGE = { name: 'page', required: true, kind: 'file', help: 'films/<name>/page.html' };
const ASPECT = 'one of 16:9 9:16 1:1 4:5 4:3';

export const VERBS = [
  {
    name: 'new', summary: 'start a film: films/<name>/page.html and brief.md',
    positional: [{ name: 'name', required: true, help: 'film name, lowercase with dashes' }],
    flags: [
      { name: 'from', type: 'path', default: 'prompts/brand-launch-from-url.md', help: 'prompts/<template>.md whose inputs section becomes brief.md', kind: 'file' },
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
    name: 'dev', summary: 'draft render: half size, 30 fps, silent; also writes a key-frame sheet PNG next to it',
    positional: [PAGE],
    flags: [
      { name: 'from', type: 'number', help: 'start second' },
      { name: 'to', type: 'number', help: 'end second' },
      { name: 'aspect', type: 'string', default: 'the page meta, else 16:9', help: ASPECT },
      { name: 'audio', type: 'bool', help: 'mix the audio tags into the draft' },
      { name: 'out', type: 'path', default: 'out/<name>-draft.mp4, or out/<name>-draft-<from>-<to>.mp4 for a range', help: 'output file' },
    ],
    example: 'vawe dev films/my-launch/page.html --from 2 --to 6',
    build: (v, [page]) => [{ script: 'harness/media/render-page.mjs', args: [page, ...(v.out ? [v.out] : []), ...opt('--aspect', v.aspect), ...opt('--from', v.from), ...opt('--to', v.to), ...(v.audio ? ['--audio'] : [])] }],
    next: (v, [page]) => `vawe critique ${page}`,
  },
  {
    name: 'ship', summary: 'final render: 60 fps, subframe blur, audio mixed; runs in the background',
    positional: [{ name: 'page|job', help: 'films/<name>/page.html; with --status, a job id (default: the newest job)' }],
    flags: [
      { name: 'aspect', type: 'string', default: 'the page meta, else 16:9', help: `${ASPECT}, or all for one file each` },
      { name: 'out', type: 'path', default: 'out/<name>.mp4', help: 'output file (not with --aspect all)' },
      { name: 'wait', type: 'bool', help: 'block until the render ends instead of running it in the background' },
      { name: 'status', type: 'bool', help: 'print the progress or the result of a background render' },
    ],
    example: 'vawe ship films/my-launch/page.html --aspect all   (then: vawe ship --status)',
    build: (v, [page]) => {
      if (v.status) return [{ script: 'harness/media/ship-job.mjs', args: ['status', ...(page ? [page] : [])] }];
      if (!page) throw new UsageError('missing <page>; usage: vawe ship <page> [flags]  or  vawe ship --status [job]');
      const args = [page, ...(v.out ? [v.out] : [])];
      if (v.wait) return [{ script: 'harness/media/render-page.mjs', args: [...args, '--final', ...opt('--aspect', v.aspect)] }];
      return [{ script: 'harness/media/ship-job.mjs', args: ['start', ...args, ...opt('--aspect', v.aspect)] }];
    },
    next: (v, [page]) => {
      if (v.wait) return `vawe judge out/${pageName(page)}.mp4`;
      if (v.status) return 'vawe ship --status again in 30 s or more; when it says done, vawe judge <the output file>';
      return 'vawe ship --status (a render takes minutes: do not poll faster than every 30 s, and do not sleep-loop)';
    },
  },
  {
    name: 'critique', summary: 'phone sheet, strip, loop seam, measured deltas and page-check to look at',
    positional: [PAGE],
    flags: [
      { name: 'ref', type: 'path', help: 'reference mp4 to measure against', kind: 'file' },
      { name: 'at', type: 'string', default: 'auto', help: 'seconds for the strip, or auto' },
      { name: 'from', type: 'number', help: 'with --ref: match only from this second' },
      { name: 'to', type: 'number', help: 'with --ref: match only to this second' },
      { name: 'final', type: 'bool', help: 'with --ref: match the full-size render; a pass unlocks vawe ship' },
    ],
    example: 'vawe critique films/my-launch/page.html --ref refs/ad.mp4 --at 4.2',
    build: (v, [page]) => [
      { script: 'quality/gates/anim-traps.mjs', args: [page] },
      { script: 'harness/media/see.mjs', args: [page, '--phone', '--strip', v.at || 'auto', '--loop'] },
      v.ref
        ? { script: 'harness/media/see.mjs', args: [page, '--dom', '--ref', v.ref, ...opt('--from', v.from), ...opt('--to', v.to), ...(v.final ? ['--final'] : [])] }
        : { script: 'harness/media/see.mjs', args: [page, '--measure'] },
      { script: 'quality/gates/page-check.mjs', args: [page, ...opt('--ref', v.ref)] },
    ],
    next: (v, [page]) => `look at the sheets above, then in a fresh session: VAWE_AGENT=judge-${pageName(page)} vawe judge ${page}${v.ref ? ` --ref ${v.ref}` : ''}`,
  },
  {
    name: 'compare', summary: 'reference and your film at the same exact seconds, side by side, one PNG',
    positional: [{ name: 'ours.mp4', help: 'your render (a draft is fine); or use --page' }],
    flags: [
      { name: 'page', type: 'path', help: 'seek this page and screenshot it at half size: no render needed; without --ref, only your frames, labelled with time', kind: 'file' },
      { name: 'ref', type: 'path', help: 'reference mp4', kind: 'file' },
      { name: 'at', type: 'string', help: 'comma-separated film seconds, for example 2.5,3.1,4' },
      { name: 'from', type: 'number', default: 0, help: 'the film second where ours starts (a --from/--to draft)' },
      { name: 'out', type: 'path', default: 'out/compare-<ours>.png', help: 'output PNG' },
    ],
    example: 'vawe compare --page films/my-launch/page.html --at 2.5,3.1,4   (add --ref refs/ad.mp4 to see the reference beside it)',
    build: (v, [ours]) => [{ script: 'harness/media/compare-frames.mjs', args: [...(ours ? [ours] : []), ...opt('--page', v.page), ...opt('--ref', v.ref), ...opt('--at', v.at), ...opt('--from', v.from), ...opt('--out', v.out)] }],
    next: () => 'look at the PNG: reference left, yours right; fix the worst row first',
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
    flags: [{ name: 'quiet', type: 'bool', help: 'print only problems' }],
    example: 'vawe doctor',
    build: (v) => [{ script: 'harness/dev/doctor.mjs', args: v.quiet ? ['--quiet'] : [] }],
  },
  {
    name: 'e2e', summary: 'page tests plus a parallel half-size draft of every film (about 5 s)',
    positional: [], flags: [],
    example: 'vawe e2e',
    build: () => [{ script: 'harness/dev/e2e.mjs', args: [] }],
  },
  {
    name: 'test', summary: 'run every tests/**/*.test.mjs with node --test',
    positional: [], flags: [],
    example: 'vawe test',
    build: () => [{ node: ['--test', 'tests/**/*.test.mjs'] }],
  },
  {
    name: 'judge', summary: 'prepare key frames and the rubric for a fresh session to score',
    positional: [{ name: 'page|mp4', required: true, kind: 'file', help: 'a page or a rendered mp4' }],
    flags: [
      { name: 'ref', type: 'path', help: 'reference mp4', kind: 'file' },
      { name: 'struct', type: 'bool', help: 'add the structure pass' },
      { name: 'runs', type: 'string', help: 'double-run labels, for example A,B' },
      { name: 'verdict', type: 'string', help: 'record PASS or FIX; writes out/<name>.judge.json' },
      { name: 'at', type: 'number', help: 'with a FIX verdict: the second of the top fix' },
      { name: 'top-fix', type: 'string', help: 'with a FIX verdict: the one concrete fix' },
    ],
    example: 'vawe judge out/my-launch.mp4 --struct --runs A,B',
    build: (v, [input]) => [{ script: 'quality/gates/judge.mjs', args: [input, ...opt('--ref', v.ref), ...(v.struct ? ['--struct'] : []), ...opt('--runs', v.runs), ...opt('--verdict', v.verdict), ...opt('--at', v.at), ...opt('--top-fix', v['top-fix'])] }],
    next: () => 'judge returns at once; do not poll for it',
  },
];
