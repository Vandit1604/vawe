// mcp/server.mjs. Vawe as an MCP server. Your users' own Claude writes the scene; this renders it.
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
import * as fetchers from './fetchers.mjs';
import * as catalog from './catalog.mjs';
import { stageOf, filePaths, ROOT as STAGE_ROOT } from '../quality/gates/stage.mjs';

// THE INVENTORY GOES IN THE DESCRIPTION, NOT THE REPLY. A calling model reads every tool's description
// before it calls anything and reads a tool's output only if it chooses to call. So "the full block and
// effect vocabulary" tells it nothing about whether opening this is worth a turn, and a model that
// never opens it authors as though the engine had none of this. Naming the size and the six largest
// families in the always-visible text is the cheapest possible fix and costs one line per call.
// Falls back to the plain sentence when site/lib/effects.json is absent, rather than inventing a count.
const INV = catalog.inventory();
const inventoryLine = INV
  ? ` It holds ${INV.total} named things across ${INV.families} families, including ${INV.top.join(' · ')}.`
  : '';
import { reflect } from './reflect.mjs';
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
  description: 'How to write a scene. Call with no arguments FIRST: that returns a short reference '
    + 'that covers almost everything. Only pass detail:"full" if you need a prop it does not list.' + inventoryLine,

  inputSchema: {
    detail: z.enum(['quick', 'full']).optional()
      .describe('quick (default) = ~6KB reference. full = every schema prop + the complete vocabulary, ~46KB.'),
  },
}, async ({ detail }) => {
  // Default SMALL on purpose. The full guide is 46KB, and a model that spends its context reading
  // the schema has less left for the thing it was asked to make. The short page covers the shape,
  // the traps that render wrong without erroring, and which effects actually read on screen, which
  // is what the first draft needs. `full` is there for the second question, not the first.
  if (detail !== 'full') {
    const quick = path.join(pipe.repoRoot, 'engine-doctrine/SCENE-QUICK.md');
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

// ── vawe_logo ────────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_logo', {
  title: 'Fetch a brand logo (simple-icons)',
  description: 'Get a brand mark by its simple-icons slug (e.g. "stripe", "github", "openai") as an '
    + 'src you can use in a layer. Optional hex to tint it. Whenever a company or tool is named on '
    + 'screen, show its mark.',
  inputSchema: {
    slug: z.string().describe('simple-icons slug, e.g. "stripe" or "vercel".'),
    hex: z.string().optional().describe('Tint colour without the #, e.g. "635bff".'),
  },
}, async ({ slug, hex }) => {
  try {
    const r = await fetchers.logo(OWNER, slug, hex);
    return text(`✓ ${slug} logo\n  "src": "${r.src}"\n\nSize it small: a logo reads at ~7% of frame height (75-150px on 1080).`);
  } catch (e) { return text(`✗ ${e.message}`); }
});

// ── vawe_photo ───────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_photo', {
  title: 'Fetch an openly-licensed photo',
  description: 'Search CC0 / public-domain photos and get one back as an src. No credit line needed, '
    + 'no content-claim risk. Treat it (radius, ken, a filter) so it does not look pasted in.',
  inputSchema: { query: z.string().describe('What to find, e.g. "marble bust" or "night city".') },
}, async ({ query }) => {
  try {
    const r = await fetchers.photo(OWNER, query);
    return text(`✓ photo (${r.license}${r.creator ? ', ' + r.creator : ''})\n  "src": "${r.src}"\n\n`
      + `Grade it into the scene: add "radius", a slow "ken", or a "filter".`);
  } catch (e) { return text(`✗ ${e.message}`); }
});

// ── vawe_reflect ─────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_reflect', {
  title: 'Read a brand\'s real colours and fonts from its site',
  description: 'Give a URL and get back the site\'s actual brand colours and font names, so the video '
    + 'is authored in the real palette instead of invented ones. Reads the page source, not a '
    + 'screenshot. Use the vivid brand colours as accents and the neutrals to decide light-first vs '
    + 'dark-first.',
  inputSchema: { url: z.string().describe('The brand site, e.g. "stripe.com".') },
}, async ({ url }) => {
  try {
    const r = await reflect(url);
    return text([
      `✓ ${r.title || r.url}`,
      ``,
      `brand colours:  ${r.brandColours.join('  ') || '(none found)'}`,
      `neutrals:       ${r.neutrals.join('  ') || '(none)'}   ← decides light-first vs dark-first`,
      `fonts:          ${r.fonts.join('  ·  ') || '(none found)'}`,
      ``,
      `Author the theme from these: bg = the dominant neutral, accent = the most vivid brand colour.`,
      `For the font, pick the closest role (sans / serif / mono), or upload the real face with vawe_upload.`,
    ].join('\n'));
  } catch (e) { return text(`✗ ${e.message}`); }
});

// ── vawe_examples ────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_examples', {
  title: 'Worked example scenes',
  description: 'List real, shipped scenes to learn structure from, or pass a name to get its full '
    + 'JSON. Read one before authoring something similar; it is faster than writing from the guide alone.',
  inputSchema: { name: z.string().optional().describe('An example name to fetch its JSON. Omit to list.') },
}, async ({ name }) => {
  if (!name) {
    return text('Examples (pass a name to see the JSON):\n'
      + catalog.examples().map((e) => `  ${e.name.padEnd(20)} ${e.teaches}`).join('\n'));
  }
  const json = catalog.example(name);
  return json ? text(json) : text(`no example "${name}". Call vawe_examples with no argument to list them.`);
});

// ── vawe_capabilities ────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_capabilities', {
  title: 'The full block + effect vocabulary',
  description: 'Every composite look, kinetic preset, cut, and block the engine has, read live from '
    + 'the registries. Use it to discover a block (chart, terminal, pricing card, tweet) instead of '
    + 'building one by hand.' + inventoryLine,
  inputSchema: {},
}, async () => {
  const c = await catalog.capabilities();
  // Render each preset with its dials, so a caller does not just learn a name exists but how to tune
  // it. A dial set on a preset that ignores it is reported by the draft gates (dead-knob check).
  // core/registry/knobs.js writes a `desc` on 79 of its dials and this printed only `k.name`, so every one of
  // them was fetched across the wire and dropped on the floor, while the comment above claimed the
  // opposite. A caller learned that `stagger` exists and never that it is the rhythm offset per unit.
  // The DEFAULT goes over too, and it did not before. A caller that cannot see it either leaves the
  // dial out (fine) or writes what it guesses the default is (not fine): that guess is how a wrong
  // number in this manifest turns into a wrong frame, and it is why core/registry/knobs.js now reads every
  // kinetic default off the preset's own signature instead of keeping a second copy. `null` means the
  // preset states no default and resolves the dial at render (colorWave's two colours), so it is left
  // unsaid rather than printed as a value nobody can write.
  const dial = (k) => {
    const d = k.default == null ? '' : `default ${JSON.stringify(k.default)}`;
    const note = [k.desc, d].filter(Boolean).join(', ');
    return note ? `${k.name} (${note})` : k.name;
  };
  const knobLine = (fam) => {
    const K = c.knobs[fam]; if (!K) return '';
    const shared = (K._shared || []).map(dial).join(' · ');
    const per = Object.entries(K).filter(([p]) => p !== '_shared' && K[p].length)
      .map(([p, list]) => `    ${p.padEnd(16)} ${list.map(dial).join(' · ')}`);
    // A family with no per-preset overrides (look) is ONE list and says so; the two that have both
    // keep the split. Without this branch the uniform families printed a header and a blank line.
    return per.length ? `  shared dials: ${shared}\n${per.join('\n')}` : `  dials: ${shared}`;
  };
  return text([
    `looks (${c.looks.length}): the register each evokes; pick the group your story is in, then one member:`,
    ...c.looks.map((l) => `  ${l.name.padEnd(20)} ${l.blurb || ''}`.trimEnd()),
    // Typed by hand, this line drifted from the manifest in both directions at once: it still offered
    // `warmth`, removed because no pass in any of the 31 looks ever read it (core/registry/knobs.js,
    // engine-doctrine/MISTAKES.md #351), and it omitted `colors`, the gradient-map ramp that IS the thermal and
    // chrome looks. So the tool advertised a dead dial and hid the one that matters. Read the manifest.
    knobLine('look'),
    ``,
    `kinetic presets (${c.presets.length}): how a line ARRIVES; set via preset + presetOpts:`,
    ...c.presets.map((x) => `  ${x.name.padEnd(14)} ${x.blurb || ''}`.trimEnd()),
    knobLine('kinetic'),
    ``,
    `three scenes: set via three:"name":`,
    knobLine('three'),
    ``,
    `raymarch / ambient / sting: uniform dials:`,
    `  raymarch: ${(c.knobs.raymarch._shared).map((k) => k.name).join(' ')}`,
    `  ambient:  ${(c.knobs.ambient._shared).map((k) => k.name).join(' ')}`,
    `  sting:    ${(c.knobs.sting._shared).map((k) => k.name).join(' ')}`,
    ``,
    `cuts (${c.cuts.length}): one family per film; the ten that only MASK need sceneUnits:`,
    ...c.cuts.map((x) => `  ${x.name.padEnd(12)} ${x.blurb || ''}`.trimEnd()),
    // The rest of the vocabulary a caller has to choose from. Listed with meanings for the same reason as
    // the three above: a name on its own is not a choice.
    `seams (${c.seams.length}): the only mechanism that samples BOTH beats; one earned blend at the payoff:`,
    ...c.seams.map((x) => `  ${x.name.padEnd(14)} ${x.blurb || ''}`.trimEnd()),
    `stings (${c.stings.length}): a shader AT the cut; the register each says:`,
    ...c.stings.map((x) => `  ${x.name.padEnd(18)} ${x.blurb || ''}`.trimEnd()),
    `layer entrances/exits (${c.anims.length}): anim / out:`,
    ...c.anims.map((x) => `  ${x.name.padEnd(14)} ${x.blurb || ''}`.trimEnd()),
    `gsap effects (${c.gsap.length}): fx on a layer; the LOOPS never settle, so never use one as an entrance:`,
    ...c.gsap.map((x) => `  ${x.name.padEnd(18)} ${x.blurb || ''}`.trimEnd()),
    `gsap exits (${c.gsapExits.length}): fxOut:`,
    ...c.gsapExits.map((x) => `  ${x.name.padEnd(16)} ${x.blurb || ''}`.trimEnd()),
    ``,
    `blocks (${c.blocks.length} across ${c.blockFamilies.length} families):`,
    ...c.blocks.map((b) => `  ${b.name.padEnd(18)} ${b.blurb}`),
  ].join('\n'));
});

// ── vawe_next ────────────────────────────────────────────────────────────────────────────────────
// The one question an agent outside this repo could never ask before: what stage is this film in,
// and what is the ONE next thing to do. quality/gates/stage.mjs already answers it from the files on
// disk, never from stored state, so this tool calls straight into stageOf() rather than keeping a
// second copy of the eight-stage order.
function listFilms() {
  const dir = path.join(STAGE_ROOT, 'formats/scene');
  const skip = new Set(['schema', 'sample']);
  const names = new Set();
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      // A leading underscore is this repo's own scratch convention (throwaway fanout/probe files);
      // surfacing those as "films" would bury the real ones under noise.
      if (f.startsWith('_')) continue;
      const m = f.match(/^(.+?)\.(json|storyboard\.md|brief\.md)$/);
      if (m && !skip.has(m[1])) names.add(m[1]);
    }
  }
  return [...names].sort();
}

server.registerTool('vawe_next', {
  title: 'What stage this film is in, and the one next step',
  description: 'The authoring ladder has eight stages (brief, plan, approval, design, assemble, '
    + 'direct, render, judge) and this is the only question an agent outside the repo could not ask '
    + 'before: where is this film, and what is the ONE next command. Pass a film name (same as you\'d '
    + 'give `make stage D=`) or omit it to list films on disk and whether each has shipped. Approval '
    + 'is a human act: this tool can tell you a plan is waiting on it, but nothing can grant it.',
  inputSchema: {
    film: z.string().optional().describe('Film name or path, e.g. "launch" or "formats/scene/launch.json". Omit to list films.'),
  },
}, async ({ film }) => {
  if (!film) {
    const names = listFilms();
    if (!names.length) return text('no films yet. Start one: vawe_guide, then vawe_draft with a scene.');
    // Capped, not paged: this reads a shared, ever-growing scratch directory (formats/scene/*.json is
    // gitignored, so a long-lived worktree accumulates hundreds of throwaway scenes). A caller asking
    // "what films exist" wants a usable answer, not the whole directory dumped into its context.
    const CAP = 40;
    const lines = names.slice(0, CAP).map((n) => {
      const p = filePaths(n);
      const shipped = fs.existsSync(p.mp4) ? 'rendered' : fs.existsSync(p.sb) ? 'has a storyboard' : 'scene only';
      return `  ${n.padEnd(28)} ${shipped}`;
    });
    const more = names.length > CAP ? [``, `…and ${names.length - CAP} more. Name one directly to see its stage.`] : [];
    return text(['films on disk (pass a name for its exact stage):', ...lines, ...more].join('\n'));
  }

  const st = stageOf(film);
  const line = st.order.map((id) => (id === st.stage ? `[${id}]` : id)).join(' → ');
  const out = [
    `${st.name} is at stage ${st.stage.toUpperCase()}`,
    line,
    ``,
    `why: ${st.why}`,
    `do:  ${st.next}`,
  ];
  if (st.stage === 'approval') {
    out.push('', 'approval is a human act: no tool, including this one, can grant it. A person has to '
      + 'look at the plan and run /vawe-approve themselves.');
  }
  return text(out.join('\n'));
});

// ── vawe_draft ───────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_draft', {
  title: 'Render a free watermarked draft',
  description: 'Submit a scene JSON. Validates immediately, then renders in the BACKGROUND and '
    + 'returns a video_id right away. Poll vawe_status(video_id) until status is "drafted": a '
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
      const g = await pipe.gates(scenePath);          // designspec + ledger + knobs (browser, slow)
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
  title: 'Export the clean video',
  description: 'Re-renders the latest revision without the watermark, priced by duration. Pass '
    + '`aspects` to get the SAME scene in more than one ratio in one call, e.g. ["16:9","9:16"] for '
    + 'a landscape post and a vertical reel from one source.',
  inputSchema: {
    video_id: z.string(),
    aspects: z.array(z.string()).optional()
      .describe('Ratios to export, e.g. ["16:9","9:16","1:1"]. Default: the scene\'s own aspect.'),
  },
}, async ({ video_id, aspects }) => {
  const rec = getOwned(video_id);
  if (!rec) return text(`no such video: ${video_id}`);
  if (!rec.draft) return text('draft this video first: export renders the revision you last drafted.');

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
  // {"type":"block"/"beat"/"comp"} sugar expands at LOAD time now (core/engine/expand.js), so the renderer
  // reads the source scene directly; there is no more `.expanded.json` derivative to prefer.
  const src = scenePath;

  // One render per requested ratio, each to its own file. The scene's own aspect is expressed as
  // undefined (no --aspect), so a default export matches the draft exactly.
  const want = (aspects && aspects.length ? aspects : [rec.aspect || '16:9']);
  rec.status = 'exporting';
  store.save(rec);
  (async () => {
    const done = [];
    try {
      for (const asp of want) {
        const tag = want.length > 1 ? '.' + asp.replace(':', 'x') : '';
        const out = path.join(store.paths.exports(), `${rec.id}${tag}.mp4`);
        await pipe.render(src, out, { watermark: false, aspect: asp === rec.aspect ? undefined : asp });
        done.push({ aspect: asp, file: out, url: urlFor('exports', out), seconds: pipe.durationOf(out) });
      }
      const cur = store.get(rec.id) || rec;
      cur.status = 'exported';
      cur.export = done.length === 1 ? done[0] : { multi: done };
      store.save(cur);
    } catch (e) {
      const cur = store.get(rec.id) || rec;
      cur.status = 'export-failed';
      cur.error = e.message;
      store.save(cur);
    }
  })();
  const label = want.length > 1 ? `${want.length} ratios (${want.join(', ')})` : want[0];
  return text(`▶ exporting clean · ${label} · ${q.label}. Poll vawe_status("${rec.id}") until status is "exported".`);
});

// ── vawe_status ──────────────────────────────────────────────────────────────────────────────────
server.registerTool('vawe_status', {
  title: 'Video status',
  description: 'Status, URLs and the last gate report for a video. Omit video_id to list yours.',
  inputSchema: { video_id: z.string().optional() },
}, async ({ video_id }) => {
  if (!video_id) {
    const all = store.list(OWNER);
    if (!all.length) return text('no videos yet: start with vawe_guide, then vawe_draft.');
    return text(all.map((r) => `${r.id}  ${r.status.padEnd(10)} rev ${r.revisions}`).join('\n'));
  }
  const rec = getOwned(video_id);
  if (!rec) return text(`no such video: ${video_id}`);

  // Since rendering moved to the background, THIS is where a caller learns what happened. It has to
  // answer "is it done", "is it any good" and "what do I do next" in one read, or the model polls
  // blind and then guesses.
  if (rec.status === 'rendering' || rec.status === 'exporting') {
    return text(`▶ ${rec.status}: not finished yet. Wait a bit and call vawe_status("${rec.id}") again.`);
  }
  if (rec.status === 'failed' || rec.status === 'export-failed') {
    return text(`✗ ${rec.status}\n\n${rec.error || 'no detail recorded'}`);
  }
  if (rec.status === 'exported') {
    const e = rec.export;
    if (e.multi) return text('✓ exported (clean)\n' + e.multi.map((x) => `  ${x.aspect.padEnd(5)} ${x.url}`).join('\n'));
    return text(`✓ exported (clean)\n  ${e.url}`);
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
      (g.knobs && g.knobs.includes('dead knob')) ? `knobs:  ${g.knobs.split('\n').filter((l) => l.includes('does nothing')).join('\n        ')}` : '',
      ``,
      `Fix anything above and call vawe_draft again with video_id "${rec.id}". Drafts are free.`,
      `When it is genuinely good: vawe_export("${rec.id}"), ${q.label}, $${q.usd}.`,
    ].join('\n'));
  }
  return text(JSON.stringify({ ...rec, billing: billingEnabled() ? 'on' : 'off' }, null, 2));
});

await server.connect(new StdioServerTransport());
