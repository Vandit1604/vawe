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
import * as uploads from './uploads.mjs';
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

// A caller may only see their own videos. Without this, a guessed or leaked video_id from another
// owner would return that record's status and delivery URL. Records are keyed by id, so the owner
// check happens here rather than in the store.
function getOwned(video_id) {
  const rec = store.get(video_id);
  return rec && rec.owner === OWNER ? rec : null;
}

// ── vawe_guide ───────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_guide', {
  title: 'Vawe authoring guide',
  description: 'How to write a scene. Call with no arguments FIRST — that returns a short reference '
    + 'that covers almost everything. Only pass detail:"full" if you need a prop it does not list.',
  inputSchema: {
    detail: z.enum(['quick', 'full']).optional()
      .describe('quick (default) = ~6KB reference. full = every schema prop + the complete vocabulary, ~46KB.'),
  },
}, async ({ detail }) => {
  // Default SMALL on purpose. The full guide is 46KB, and a model that spends its context reading
  // the schema has less left for the thing it was asked to make. The short page covers the shape,
  // the traps that render wrong without erroring, and which effects actually read on screen — which
  // is what the first draft needs. `full` is there for the second question, not the first.
  if (detail !== 'full') {
    const quick = path.join(pipe.repoRoot, 'docs/SCENE-QUICK.md');
    if (fs.existsSync(quick)) {
      return text(fs.readFileSync(quick, 'utf8')
        + '\n\n---\nNeed a prop not listed here? Call vawe_guide with detail:"full".\n');
    }
  }
  const rules = path.join(pipe.repoRoot, 'site/public/vawe-rules.md');
  const schema = path.join(pipe.repoRoot, 'formats/scene/schema.json');
  const parts = [];
  if (fs.existsSync(rules)) parts.push(fs.readFileSync(rules, 'utf8'));
  if (fs.existsSync(schema)) parts.push('## Scene schema\n\n```json\n' + fs.readFileSync(schema, 'utf8') + '\n```');
  return text(parts.join('\n\n---\n\n') || 'guide unavailable');
});

// ── vawe_upload ──────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_upload', {
  title: 'Upload an image or font to use in a scene',
  description: 'Send a file as base64 and get back the `src` path to put in a scene layer. Use this '
    + 'for the logo, product screenshots, or a brand font. Accepts png, jpg, webp, gif, svg, woff2, '
    + 'ttf, otf, up to 12MB. The type is read from the file itself, so the filename does not matter. '
    + 'Uploading the same file twice is free and returns the same path.',
  inputSchema: {
    data: z.string().describe('The file, base64 encoded. A data: URL prefix is fine.'),
    label: z.string().optional().describe('What this is, for your own reference (e.g. "logo").'),
  },
}, async ({ data, label }) => {
  try {
    const r = uploads.save(OWNER, data);
    return text([
      `✓ ${label ? label + ' ' : ''}uploaded${r.reused ? ' (already had it)' : ''}  ${r.ext}, ${(r.bytes / 1024).toFixed(0)}KB`,
      `  "src": "${r.src}"`,
      ``,
      `Use it in a layer:`,
      `  { "type": "image", "src": "${r.src}", "x": 760, "y": 380, "w": 400, "h": 400,`,
      `    "radius": 0, "anim": "fade", "start": 0.3, "duration": 3 }`,
      ``,
      `A logo reads at about 7% of frame height and never below 5%. On 1080 that is 75 to 150px.`,
    ].join('\n'));
  } catch (e) {
    return text(`✗ ${e.message}`);
  }
});

// ── vawe_draft ───────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_draft', {
  title: 'Render a free watermarked draft',
  description: 'Submit a scene JSON. Validates immediately, then renders in the BACKGROUND and '
    + 'returns a video_id right away. Poll vawe_status(video_id) until status is "drafted" — a '
    + '10s video takes a couple of minutes. Free and unlimited; the watermark is the ONLY difference '
    + 'from the paid export, so what you judge here is what you get.',
  inputSchema: {
    scene: z.record(z.any()).describe('The scene JSON. Must start with "module": "scene".'),
    video_id: z.string().optional().describe('Revise an existing video instead of starting a new one.'),
    aspect: z.string().optional().describe('Override aspect, e.g. "9:16". Default: the scene\'s own.'),
  },
}, async ({ scene, video_id, aspect }) => {
  // Guard before touching disk. A megabyte of JSON is an attack or a bug, and a src that escapes the
  // served tree is either a mistake or an attempt to read a server file. Both get a clear refusal.
  const size = Buffer.byteLength(JSON.stringify(scene || {}));
  if (size > pipe.MAX_SCENE_BYTES) {
    return text(`✗ scene too large: ${(size / 1024).toFixed(0)}KB, limit ${pipe.MAX_SCENE_BYTES / 1024}KB. A scene is normally a few KB.`);
  }
  const refs = pipe.illegalRefs(scene);
  if (refs.length) {
    return text('✗ a layer points outside what you may use. A `src` must be a relative path, an '
      + '`/assets/...` path, or an upload you got from vawe_upload.\n  ' + refs.join('\n  '));
  }

  // Owner scoping: revising a video you do not own is a "no such video", not an error that confirms
  // it exists. A new video is created under you.
  const rec = video_id ? getOwned(video_id) : store.create({ owner: OWNER, aspect });
  if (!rec) return text(`no such video: ${video_id}`);
  if (video_id) rec.revisions += 1;

  const scenePath = writeScene(rec.id, scene, rec.revisions);
  // Only validate synchronously: it is pure JSON and fast, and a schema error is worth answering in
  // the same breath so the caller can fix it without a round trip. Every other gate opens a browser.
  const v = await pipe.validate(scenePath);
  if (!v.ok) {
    rec.status = 'invalid';
    rec.lastGates = { validate: v.report };
    store.save(rec);
    return text(`✗ the scene did not validate, nothing was rendered.\n\n${v.report}`);
  }

  // Render in the BACKGROUND and answer now. MCP clients cancel a tool call after 60s by default
  // (JSON-RPC -32001), and a ten-second video takes minutes, so a blocking draft is cancelled every
  // time on real content. The first fresh-session test failed exactly here.
  const out = path.join(store.paths.drafts(), `${rec.id}.r${rec.revisions}.mp4`);
  rec.status = 'rendering';
  store.save(rec);

  (async () => {
    try {
      const g = await pipe.gates(scenePath);          // expand + slop + ledger (browser, slow)
      await pipe.render(g.target, out, { watermark: true, aspect: aspect || undefined });
      const seconds = pipe.durationOf(out);
      const auditOut = await pipe.audit(g.target);
      const cur = store.get(rec.id) || rec;
      cur.status = 'drafted';
      cur.draft = { file: out, url: urlFor('drafts', out), seconds };
      cur.lastGates = { validate: v.report, ...g.report, audit: auditOut };
      store.save(cur);
    } catch (e) {
      const cur = store.get(rec.id) || rec;
      cur.status = 'failed';
      cur.error = e.message;
      store.save(cur);
    }
  })();

  return text([
    `▶ rendering (free draft, watermarked)`,
    `  video_id: ${rec.id}   revision ${rec.revisions}`,
    ``,
    `The scene validated. Rendering runs in the background; roughly 10 to 15 seconds of`,
    `render per second of video, so expect a couple of minutes.`,
    ``,
    `Call vawe_status("${rec.id}") until status is "drafted" (or "failed"). It returns the`,
    `video URL and every gate verdict. Then fix what the gates say and call vawe_draft again`,
    `with the same video_id. Drafts are free.`,
  ].join('\n'));
});

// ── vawe_export ──────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_export', {
  title: 'Export the clean video (paid)',
  description: 'Re-renders the latest revision without the watermark. Priced by finished duration.',
  inputSchema: { video_id: z.string() },
}, async ({ video_id }) => {
  const rec = getOwned(video_id);
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
  rec.status = 'exporting';
  store.save(rec);
  (async () => {   // background for the same reason as draft: this is a full render, not a copy
    try {
      await pipe.render(src, out, { watermark: false, aspect: rec.aspect === '16:9' ? undefined : rec.aspect });
      const cur = store.get(rec.id) || rec;
      cur.status = 'exported';
      cur.export = { file: out, url: urlFor('exports', out), seconds: pipe.durationOf(out) };
      store.save(cur);
    } catch (e) {
      const cur = store.get(rec.id) || rec;
      cur.status = 'export-failed';
      cur.error = e.message;
      store.save(cur);
    }
  })();
  return text(`▶ exporting clean (${q.label}). Poll vawe_status("${rec.id}") until status is "exported".`);
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
    return text(all.map((r) => `${r.id}  ${r.status.padEnd(10)} rev ${r.revisions}`).join('\n'));
  }
  const rec = getOwned(video_id);
  if (!rec) return text(`no such video: ${video_id}`);

  // Since rendering moved to the background, THIS is where a caller learns what happened. It has to
  // answer "is it done", "is it any good" and "what do I do next" in one read, or the model polls
  // blind and then guesses.
  if (rec.status === 'rendering' || rec.status === 'exporting') {
    return text(`▶ ${rec.status} — not finished yet. Wait a bit and call vawe_status("${rec.id}") again.`);
  }
  if (rec.status === 'failed' || rec.status === 'export-failed') {
    return text(`✗ ${rec.status}\n\n${rec.error || 'no detail recorded'}`);
  }
  if (rec.status === 'exported') {
    return text(`✓ exported (clean)\n  ${rec.export.url}`);
  }
  if (rec.status === 'drafted') {
    const g = rec.lastGates || {};
    const q = quote(rec.draft?.seconds || 0);
    return text([
      `✓ draft ready (watermarked)   revision ${rec.revisions}   ${rec.draft.seconds ? rec.draft.seconds.toFixed(1) + 's' : ''}`,
      `  ${rec.draft.url}`,
      ``,
      `── gates ──`,
      `audit:  ${(g.audit || '').split('\n').filter(Boolean).slice(-3).join('\n        ')}`,
      `slop:   ${(g.slop || '').split('\n').filter(Boolean).slice(-2).join(' ')}`,
      `ledger: ${(g.ledger || '').split('\n').filter(Boolean).slice(-1)[0] || ''}`,
      ``,
      `Fix anything above and call vawe_draft again with video_id "${rec.id}". Drafts are free.`,
      `When it is genuinely good: vawe_export("${rec.id}") — ${q.label}, $${q.usd}.`,
    ].join('\n'));
  }
  return text(JSON.stringify({ ...rec, billing: billingEnabled() ? 'on' : 'off' }, null, 2));
});

await server.connect(new StdioServerTransport());
