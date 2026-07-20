// mcp/server.mjs — Vawe as an MCP server. Your users' own Claude writes the scene; this renders it.
//
//   npx @modelcontextprotocol/inspector node mcp/server.mjs      # try it
//   claude mcp add vawe -- node /abs/path/to/mcp/server.mjs      # wire it into Claude Code
//
// WHY MCP RATHER THAN A WEB APP. The interface to this product is a conversation ("make me a launch
// video for X"), and the caller already has a client that is good at conversation and that they
// already pay for. So the model does the authoring on their tokens, and this server does the two
// things a browser cannot: apply the private half of the engine, and render.
//
// THE FOUR TOOLS ARE THE WHOLE PRODUCT:
//   vawe_guide    what a scene may contain (public vocabulary; cheap, cache it)
//   vawe_draft    scene in → watermarked video + gate verdicts. Free, repeat as needed.
//   vawe_export   the same scene, clean. This is the paid step.
//   vawe_status   what happened to a video
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

import * as store from './store.mjs';
import * as pipe from './pipeline.mjs';
import { quote, isPaid, billingEnabled, checkoutUrl } from './pricing.mjs';

const OWNER = process.env.VAWE_OWNER || 'anon';
const PUBLIC_BASE = process.env.VAWE_PUBLIC_BASE || '';   // e.g. https://cdn.vawe.dev/v
const urlFor = (kind, file) => (PUBLIC_BASE ? `${PUBLIC_BASE}/${kind}/${path.basename(file)}` : `file://${file}`);

const server = new McpServer({ name: 'vawe', version: '1.0.0' });

/** Persist a submitted scene next to its record so a later export renders the SAME bytes. */
function writeScene(id, scene, rev) {
  const file = path.join(store.paths.scenes(), `${id}${rev ? `.r${rev}` : ''}.json`);
  fs.writeFileSync(file, JSON.stringify(scene, null, 2) + '\n');
  return file;
}

const text = (s) => ({ content: [{ type: 'text', text: s }] });

// ── vawe_guide ───────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_guide', {
  title: 'Vawe authoring guide',
  description: 'The scene format and the full effect vocabulary (looks, stings, cuts, easings, '
    + 'presets, themes). Read this ONCE before writing a scene, then write the JSON yourself.',
  inputSchema: {},
}, async () => {
  const rules = path.join(pipe.repoRoot, 'site/public/vawe-rules.md');
  const schema = path.join(pipe.repoRoot, 'formats/scene/schema.json');
  const parts = [];
  if (fs.existsSync(rules)) parts.push(fs.readFileSync(rules, 'utf8'));
  if (fs.existsSync(schema)) parts.push('## Scene schema\n\n```json\n' + fs.readFileSync(schema, 'utf8') + '\n```');
  return text(parts.join('\n\n---\n\n') || 'guide unavailable');
});

// ── vawe_draft ───────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_draft', {
  title: 'Render a free watermarked draft',
  description: 'Submit a scene JSON. Returns a watermarked video plus every gate verdict so you can '
    + 'fix the scene and call again. Free and unlimited. The watermark is the ONLY difference from '
    + 'the paid export: same engine, same quality, so what you judge here is what you get.',
  inputSchema: {
    scene: z.record(z.any()).describe('The scene JSON. Must start with "module": "scene".'),
    video_id: z.string().optional().describe('Revise an existing video instead of starting a new one.'),
    aspect: z.string().optional().describe('Override aspect, e.g. "9:16". Default: the scene\'s own.'),
  },
}, async ({ scene, video_id, aspect }) => {
  const rec = video_id ? store.get(video_id) : store.create({ owner: OWNER, aspect });
  if (!rec) return text(`no such video: ${video_id}`);
  if (video_id) rec.revisions += 1;

  const scenePath = writeScene(rec.id, scene, rec.revisions);
  const checked = await pipe.check(scenePath);
  if (!checked.ok) {
    rec.status = 'invalid';
    rec.lastGates = { stage: checked.stage, report: checked.report };
    store.save(rec);
    return text(`✗ the scene did not validate, nothing was rendered.\n\n${checked.report}`);
  }

  const out = path.join(store.paths.drafts(), `${rec.id}.r${rec.revisions}.mp4`);
  let rendered;
  try {
    rendered = await pipe.render(checked.target, out, { watermark: true, aspect: aspect || undefined });
  } catch (e) {
    rec.status = 'failed';
    store.save(rec);
    return text(`✗ render failed.\n\n${e.message}`);
  }

  const seconds = pipe.durationOf(out);
  const auditOut = await pipe.audit(checked.target);
  rec.status = 'drafted';
  rec.draft = { file: out, url: urlFor('drafts', out), seconds };
  rec.lastGates = { ...checked.report, audit: auditOut };
  store.save(rec);

  const q = quote(seconds || 0);
  return text([
    `✓ draft ready (watermarked)`,
    `  video_id: ${rec.id}   revision ${rec.revisions}   ${seconds ? seconds.toFixed(1) + 's' : ''}`,
    `  ${rec.draft.url}`,
    ``,
    `── gates ──`,
    `audit:  ${auditOut.split('\n').slice(-3).join('\n        ')}`,
    `slop:   ${(checked.report.slop || '').split('\n').slice(-2).join(' ')}`,
    `ledger: ${(checked.report.ledger || '').split('\n').slice(-1)[0]}`,
    ``,
    `Fix anything above and call vawe_draft again with video_id "${rec.id}". Drafts are free.`,
    `When it is right: vawe_export("${rec.id}") — ${q.label}, $${q.usd}.`,
  ].join('\n'));
});

// ── vawe_export ──────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_export', {
  title: 'Export the clean video (paid)',
  description: 'Re-renders the latest revision without the watermark. Priced by finished duration.',
  inputSchema: { video_id: z.string() },
}, async ({ video_id }) => {
  const rec = store.get(video_id);
  if (!rec) return text(`no such video: ${video_id}`);
  if (!rec.draft) return text('draft this video first — export renders the revision you last drafted.');

  const seconds = rec.draft.seconds || 0;
  const q = quote(seconds);
  if (!(await isPaid(rec))) {
    const url = await checkoutUrl(rec, seconds);
    return text(`payment required: ${q.label}, $${q.usd}\n  ${url}\n\nCall vawe_export again once paid.`);
  }

  // Render from the SAME scene file the draft used. Re-authoring here would let the paid file differ
  // from the one that was approved, which is the one thing an export must never do.
  const scenePath = path.join(store.paths.scenes(),
    `${rec.id}${rec.revisions ? `.r${rec.revisions}` : ''}.json`);
  const expanded = scenePath.replace(/\.json$/, '.expanded.json');
  const src = fs.existsSync(expanded) ? expanded : scenePath;

  const out = path.join(store.paths.exports(), `${rec.id}.mp4`);
  try {
    await pipe.render(src, out, { watermark: false, aspect: rec.aspect === '16:9' ? undefined : rec.aspect });
  } catch (e) {
    return text(`✗ export render failed.\n\n${e.message}`);
  }
  rec.status = 'exported';
  rec.export = { file: out, url: urlFor('exports', out), seconds: pipe.durationOf(out) };
  store.save(rec);
  return text(`✓ clean export ready\n  ${rec.export.url}`);
});

// ── vawe_status ──────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_status', {
  title: 'Video status',
  description: 'Status, URLs and the last gate report for a video. Omit video_id to list yours.',
  inputSchema: { video_id: z.string().optional() },
}, async ({ video_id }) => {
  if (!video_id) {
    const all = store.list(OWNER);
    if (!all.length) return text('no videos yet — start with vawe_guide, then vawe_draft.');
    return text(all.map((r) => `${r.id}  ${r.status.padEnd(9)} rev ${r.revisions}  ${r.export ? 'exported' : r.draft ? 'draft' : ''}`).join('\n'));
  }
  const rec = store.get(video_id);
  if (!rec) return text(`no such video: ${video_id}`);
  return text(JSON.stringify({ ...rec, billing: billingEnabled() ? 'on' : 'off' }, null, 2));
});

await server.connect(new StdioServerTransport());
