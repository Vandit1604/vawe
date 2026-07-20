// mcp/smoke.mjs — end-to-end check that the MCP server actually works: `node mcp/smoke.mjs`.
//
// Speaks the real protocol over stdio rather than importing the handlers, because the failures worth
// catching here are wiring failures (a tool that never registered, a schema the client rejects), and
// calling the functions directly proves none of that.
//
// Renders a real 2-second scene by default, so it exercises the whole path: validate → expand →
// gates → bin/vawe → watermark → record. Pass --no-render to check only the protocol surface.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RENDER = !process.argv.includes('--no-render');

const SCENE = {
  module: 'scene', theme: 'vawe', aspect: '16:9', duration: 2, audio: { silent: true },
  layers: [
    { type: 'rect', x: 0, y: 0, w: 1920, h: 1080, bg: '#0d0f13', start: 0, duration: 2 },
    { type: 'text', text: 'Hello from MCP', x: 260, y: 470, w: 1400, align: 'center',
      size: 120, font: 'sans', weight: 700, color: '#ffffff', anim: 'rise', enterDur: 0.6,
      start: 0.2, duration: 1.8 },
  ],
};

const transport = new StdioClientTransport({ command: 'node', args: ['mcp/server.mjs'], cwd: repoRoot });
const client = new Client({ name: 'vawe-smoke', version: '1.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
console.log(`✓ connected · tools: ${names.join(', ')}`);
for (const want of ['vawe_draft', 'vawe_export', 'vawe_guide', 'vawe_status']) {
  if (!names.includes(want)) { console.error(`✗ missing tool ${want}`); process.exit(1); }
}

const guide = await client.callTool({ name: 'vawe_guide', arguments: {} });
const guideLen = guide.content[0].text.length;
console.log(`✓ vawe_guide → ${(guideLen / 1024).toFixed(0)}KB of vocabulary + schema`);
if (guideLen < 2000) { console.error('✗ guide looks empty — is site/public/vawe-rules.md present?'); process.exit(1); }

/** Rendering is asynchronous now, so the smoke test has to poll exactly like a caller does. */
async function waitFor(id, done, label) {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await client.callTool({ name: 'vawe_status', arguments: { video_id: id } });
    const t = st.content[0].text;
    if (t.startsWith('✗')) { console.error(`✗ ${label} failed\n${t}`); process.exit(1); }
    if (done(t)) return t;
  }
  console.error(`✗ ${label} never finished`); process.exit(1);
}

if (RENDER) {
  console.log('· drafting a 2s scene (renders for real, in the background)…');
  const draft = await client.callTool({ name: 'vawe_draft', arguments: { scene: SCENE } });
  const out = draft.content[0].text;
  if (!out.startsWith('▶')) { console.error(`✗ draft not accepted\n${out}`); process.exit(1); }
  const id = /video_id: (\S+)/.exec(out)?.[1];
  console.log(`  accepted as ${id}`);

  const drafted = await waitFor(id, (t) => t.includes('draft ready'), 'draft');
  console.log('  ' + drafted.split('\n').slice(0, 2).join('\n  '));

  await client.callTool({ name: 'vawe_export', arguments: { video_id: id } });
  const exported = await waitFor(id, (t) => t.includes('exported'), 'export');
  console.log('  ' + exported.split('\n')[0]);
}

await client.close();
console.log('✓ smoke passed');
