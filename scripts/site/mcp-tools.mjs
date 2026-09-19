// scripts/site/mcp-tools.mjs: the MCP tools the server actually registers, written where the site
// can read them.
//
// WHY THIS EXISTS. Three places on this site claimed a different number on the same day: /ai-agents
// carried a hand-kept list of six and prose saying "Ten tools", /hyperframes-alternatives said "four
// tools" in prose and "4 tools" in a table, and mcp/server.mjs's own header comment still says "THE
// FOUR TOOLS ARE THE WHOLE PRODUCT" from when that was true. The server registers ELEVEN. Every one
// of those numbers was typed by a person reading something stale.
//
// This repo already has a law about that, in site/CLAUDE.md: "The numbers on this site are never
// typed." quality/gates/site-counts.mjs enforces it, but only over the registries it knows, and mcp/
// was not one of them. So the count joins the generated set like every other figure: read from the
// registerTool calls, written to site/lib, checked by quality/gates/generated-check.mjs, which runs
// every generator and asks git what moved.
//
// READ STATICALLY, NOT BY IMPORTING. mcp/server.mjs opens a stdio transport at module scope, so
// importing it here would start a server rather than answer a question. The regex reads the one
// shape the file uses, and refuses rather than guessing if that shape ever stops matching: a
// generator that silently emits an empty list is worse than one that stops.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SERVER = path.join(ROOT, 'mcp/server.mjs');
const OUT = path.join(ROOT, 'site/lib/mcp-tools.json');

const src = fs.readFileSync(SERVER, 'utf8');

// server.registerTool('vawe_x', { title: '...', description: '...' + more, inputSchema: {...
const tools = [];
for (const m of src.matchAll(/server\.registerTool\('([a-z_]+)',\s*\{([\s\S]*?)inputSchema/g)) {
  const [, name, body] = m;
  const title = /title:\s*'([^']*)'/.exec(body)?.[1] ?? '';
  // A description is often a concatenation across lines; take the first literal, which is the
  // sentence that opens it, and never stitch fragments into prose this file did not write.
  const description = /description:\s*'([^']*)'/.exec(body)?.[1] ?? '';
  tools.push({ name, title, description });
}

if (!tools.length) {
  console.error('✗ mcp-tools: matched no registerTool call in mcp/server.mjs.');
  console.error('  Either the server stopped registering tools, or it changed shape and this reader');
  console.error('  went blind. Both are worth knowing; neither is worth writing an empty list for.');
  process.exit(1);
}

const out = { count: tools.length, tools };
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`  mcp tools · ${tools.length} registered → ${path.relative(ROOT, OUT)}`);
