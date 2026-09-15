// mcp/smoke.mjs. End-to-end check that the MCP server actually works: `node mcp/smoke.mjs`.
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
  // `bg` is REQUIRED, and this scene declared none: it painted a full-canvas rect instead, which the
  // validator does not accept as a backdrop (a scrim is a layer wearing a backdrop's clothes). So the one
  // thing that exercises the MCP path has been failing at `draft not accepted`, and it is wired to no
  // make target, so nothing said so. Verified identical at HEAD before this line was added.
  bg: [{ t: 0, preset: 'plain', value: 'dark' }],
  layers: [
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
for (const want of ['vawe_draft', 'vawe_export', 'vawe_guide', 'vawe_status', 'vawe_next']) {
  if (!names.includes(want)) { console.error(`✗ missing tool ${want}`); process.exit(1); }
}

const next = await client.callTool({ name: 'vawe_next', arguments: {} });
const nextText = next.content[0].text;
if (!nextText.trim()) { console.error('✗ vawe_next with no film returned nothing'); process.exit(1); }
console.log(`✓ vawe_next (no film) → ${nextText.split('\n')[0]}`);

const guide = await client.callTool({ name: 'vawe_guide', arguments: {} });
const guideLen = guide.content[0].text.length;
console.log(`✓ vawe_guide → ${(guideLen / 1024).toFixed(0)}KB of vocabulary + schema`);
if (guideLen < 2000) { console.error('✗ guide looks empty: is site/public/vawe-rules.md present?'); process.exit(1); }

// ── adversarial: the leak vectors must be refused, always. This is the regression that keeps the
// wall shut; if any of these ever renders instead of refusing, a stranger can read the repo. ────────
const attacks = [
  { name: 'escaping src', scene: { module: 'scene', theme: 'vawe', aspect: '16:9', duration: 1, audio: { silent: true },
    layers: [{ type: 'image', src: '/engine-doctrine/MISTAKES.md', x: 0, y: 0, w: 100, h: 100, start: 0, duration: 1 }] } },
  { name: 'protocol src', scene: { module: 'scene', theme: 'vawe', aspect: '16:9', duration: 1, audio: { silent: true },
    layers: [{ type: 'image', src: 'file:///etc/passwd', x: 0, y: 0, w: 100, h: 100, start: 0, duration: 1 }] } },
  { name: 'oversize', scene: { module: 'scene', theme: 'vawe', aspect: '16:9', duration: 1, audio: { silent: true },
    layers: [{ type: 'text', text: 'x'.repeat(1_200_000), x: 0, y: 0, start: 0, duration: 1 }] } },
];
for (const a of attacks) {
  const r = await client.callTool({ name: 'vawe_draft', arguments: { scene: a.scene } });
  const t = r.content[0].text;
  if (!t.startsWith('✗')) { console.error(`✗ SECURITY: "${a.name}" was NOT refused:\n${t}`); process.exit(1); }
}
console.log(`✓ ${attacks.length} leak vectors refused (escaping src, protocol src, oversize)`);

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

  await client.callTool({ name: 'vawe_export', arguments: { video_id: id, aspects: ['16:9', '9:16'] } });
  const exported = await waitFor(id, (t) => t.includes('exported'), 'export');
  const lines = exported.split('\n').filter((l) => l.includes('://'));
  if (lines.length < 2) { console.error(`✗ multi-aspect export produced ${lines.length} file(s), wanted 2`); process.exit(1); }
  console.log(`  ✓ exported 2 ratios:\n  ${lines.join('\n  ')}`);
}

await client.close();
console.log('✓ smoke passed');
