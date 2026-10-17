#!/usr/bin/env node
// Runs before `vawe dev` renders: prints the plan status (what is empty or stale, the plan findings, the ban lines, one next command),
// at most 8 lines, nothing when the plan is filled. Advice only: the exit code is always 0.
//   node harness/live/dev-warn.mjs <page.html>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBrief } from '../lib/brief-tables.mjs';
import { planFindings, planLines } from '../lib/plan-findings.mjs';
import { attractorProblems } from '../lib/directions.mjs';
import { pageAuthoring } from '../lib/motion-stamp.mjs';
import { ideasFilled } from '../lib/ideas.mjs';
import { metaOf } from '../lib/page-meta.mjs';
import { readRuns } from '../lib/runlog.mjs';
import { nextStep } from './stage-say.mjs';
import { planStatusLines } from './plan-status.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const mtime = (p) => { try { return fs.statSync(p).mtimeMs; } catch { return 0; } };

const worldIds = (html) => [...html.matchAll(/\bdata-world="([^"]+)"/g)].flatMap((m) => m[1].split('+'));

/** The facts planStatusLines needs, read from the page's files and the run log. */
export function readPlanState(pagePath, root = ROOT) {
  const abs = path.resolve(pagePath);
  const name = path.basename(path.dirname(abs));
  const rel = path.relative(root, abs);
  const html = read(abs) ?? '';
  const brief = read(path.join(path.dirname(abs), 'brief.md'));
  const frames = mtime(path.join(root, 'out', `${name}-frames.png`));
  const found = brief === null ? [] : planFindings({ brief: readBrief(abs), duration: Number(metaOf(html, 'duration')), records: null, probe: null, worlds: worldIds(html), authoring: pageAuthoring(abs) });
  const covered = ideasFilled(brief ?? '') === false ? 'ideas-missing' : null;
  const findings = brief === null ? [] : [...attractorProblems(brief), ...planLines(found.filter((f) => f.code !== covered), root)];
  const step = nextStep(abs, root);
  return {
    name, rel, brief, findings,
    design: read(path.join(path.dirname(abs), 'DESIGN.md')),
    early: !mtime(path.join(root, 'out', `${name}-draft.mp4`)) && !mtime(path.join(root, 'out', `${name}.mp4`)),
    frames: !frames ? 'none' : frames < mtime(abs) ? 'stale' : 'ok',
    storyboardRan: readRuns(name, root).some((r) => r.cmd === 'verb' && r.verb === 'storyboard' && r.exitCode === 0),
    digest: read(path.join(root, 'taste', 'build', 'DIGEST.md')) ?? '',
    next: step.stage === 'draft' ? `bin/vawe storyboard ${rel}` : step.next,
  };
}

const [page] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (page && import.meta.url === `file://${process.argv[1]}`) {
  const lines = planStatusLines(readPlanState(page));
  if (lines.length) console.log(`${lines.join('\n')}\n`);
}
