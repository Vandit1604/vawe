// mcp/pipeline.mjs — scene JSON in, rendered file out, with the private half of the engine applied.
//
// THE SPLIT THIS FILE EXISTS TO ENFORCE. The authoring vocabulary (schema, look/sting/cut names) is
// already public in site/public/vawe-rules.md, so a caller's own model can write a scene from it and
// pay for its own tokens. What stays here, server-side, is everything that makes the output good and
// took years of judgment to accumulate: the 154 block implementations that `expand` inlines, the
// gates, and the anti-sameness ledger. A caller gets their video and the gate verdicts; they never
// get the corpus.
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pexec = promisify(execFile);
export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const WATERMARK = path.join(repoRoot, 'assets/watermark/draft.png');

/** Run a repo script, returning {ok, out}. Never throws: a failing gate is a RESULT, not a crash. */
async function step(cmd, args, timeout = 15 * 60_000) {
  try {
    const { stdout, stderr } = await pexec(cmd, args, { cwd: repoRoot, timeout, maxBuffer: 8 << 20 });
    return { ok: true, out: (stdout + stderr).trim() };
  } catch (e) {
    return { ok: false, out: ((e.stdout || '') + (e.stderr || '') || e.message).trim() };
  }
}

/**
 * Gate a scene WITHOUT rendering. Cheap (no browser for validate; audit needs one), and the whole
 * point of returning it to the caller: their model can fix its own scene and resubmit, which is far
 * better than us silently "correcting" their intent.
 */
export const MAX_SCENE_BYTES = 1 << 20; // 1MB. A real scene is a few KB; a megabyte is an attack or a bug.

// A scene layer may only point at assets that ship with the engine or that this caller uploaded.
// The file server already refuses anything else (a bad `src` renders blank), but refusing it HERE,
// by name, turns a silent blank box into a message the caller's model can act on. It also blocks the
// path before it reaches the browser at all, which is the belt to the server's braces.
const OK_ABS = ['/assets/', '/.vawe-data/uploads/'];
export function illegalRefs(scene) {
  const bad = [];
  const walk = (node, at) => {
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${at}[${i}]`));
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (k === 'src' && typeof v === 'string') {
          // Relative paths resolve inside the served tree and are fine. An absolute path or a
          // protocol URL can point anywhere, so it must sit under an allowed prefix.
          const abs = v.startsWith('/');
          const proto = /^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith('//');
          if ((abs || proto) && !OK_ABS.some((p) => v.startsWith(p))) {
            bad.push(`${at}.src → ${v.slice(0, 80)}`);
          }
        }
        walk(v, `${at}.${k}`);
      }
    }
  };
  walk(scene, 'scene');
  return bad;
}

/**
 * validate ONLY. Pure JSON, no browser, back in well under a second — which is why it is the only
 * thing a tool call may wait for. Everything else (expand, slop, ledger, audit) opens Chrome and can
 * outlast an MCP client's 60s cancel, so it belongs behind the async boundary with the render.
 */
export async function validate(scenePath) {
  const r = await step('node', ['core/validate.mjs', scenePath], 60_000);
  return { ok: r.ok, report: r.out };
}

/** expand + the advisory gates. Slow (browser), so callers run this in the background. */
export async function gates(scenePath) {
  // expand-blocks turns {"block":"kpiRow"} into real layers using the PRIVATE factories. It has to
  // run before anything measures the scene, or the gates audit a scene that is mostly placeholders.
  const expanded = scenePath.replace(/\.json$/, '.expanded.json');
  const expand = await step('node', ['scripts/author/expand-blocks.mjs', scenePath], 120_000);
  const target = fs.existsSync(expanded) ? expanded : scenePath;

  const slop = await step('node', ['scripts/gates/slop.mjs', target], 180_000);
  const ledger = await step('node', ['scripts/gates/ledger.mjs', 'check', target], 120_000);
  return {
    target,
    report: {
      expand: expand.ok ? 'ok' : expand.out,
      // slop and ledger are ADVISORY. They are taste opinions, and refusing to render someone's
      // video because a detector dislikes their font is the wrong side of a paid product.
      slop: slop.out,
      ledger: ledger.out,
    },
  };
}

/**
 * Render. `watermark` is the only difference between the free preview and the paid file: same scene,
 * same engine, same quality. Degrading the preview's quality would make it useless for judging the
 * thing it exists to let you judge.
 */
export async function render(scenePath, outFile, { watermark = true, aspect } = {}) {
  const args = [scenePath, '--out', outFile];
  if (aspect) args.push('--aspect', aspect);
  if (watermark) {
    if (!fs.existsSync(WATERMARK)) throw new Error('watermark sheet missing — run `make watermark`');
    args.push('--watermark', WATERMARK);
  }
  const r = await step(path.join(repoRoot, 'bin/vawe'), args);
  if (!r.ok || !fs.existsSync(outFile)) throw new Error(`render failed:\n${r.out}`);
  return { file: outFile, log: r.out };
}

/** Audit the RENDERED scene (contrast, overlap, safe zone). Advisory, returned to the caller. */
export async function audit(scenePath) {
  const r = await step('node', ['verify/audit.mjs', scenePath], 300_000);
  return r.out;
}

export function durationOf(file) {
  try {
    return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'csv=p=0', file]).toString().trim());
  } catch { return null; }
}
