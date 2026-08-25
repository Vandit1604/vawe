#!/usr/bin/env node
// cli/vawe.mjs — the npm entry point.  `npx vawe my.json [--draft] [--aspect 9:16]`
//
// WHY A WRAPPER AND NOT JUST THE BINARY. The Go renderer is already relocatable: repoRoot()
// (cmd/render/main.go:267) walks up from cwd for a directory holding formats/ and core/, and REPO
// overrides it outright. So the engine needs no change to run from an installed package. What it does
// NOT do is behave like a CLI, in three specific ways, and this file is those three fixes and nothing
// else:
//
//   1. The render server only serves paths under the engine root (core/ themes/ formats/ assets/
//      .vawe-data/scenes/ .vawe-data/uploads/). A scene sitting in the user's own directory cannot be
//      fetched by the page, and the engine says so by name. `.vawe-data/scenes/` is the sanctioned
//      drop path, so the scene is STAGED there and removed afterwards.
//   2. Output lands in `$REPO/out/` (main.go:98,208) — inside the installed package, where nobody
//      will look. The mp4 is copied back to the working directory.
//   3. ffmpeg is spawned off PATH (internal/encode/encode.go:12) and Chrome honours CHROME_BIN
//      (internal/scene/scene.go:141). Both are supplied here when we can, and REFUSED LOUDLY when we
//      cannot, because a renderer that starts and then dies inside a worker is the worst outcome.
//
// KNOWN LIMIT, stated rather than discovered later: a scene referencing the user's OWN images cannot
// reach them, for the same serve-path reason as (1). Scenes built from themes, blocks and blueprints
// work; bring-your-own-asset needs a staging pass this version does not do.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const die = (msg, hint) => {
  console.error(`✗ ${msg}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
};

const argv = process.argv.slice(2);
if (!argv.length || argv[0] === '-h' || argv[0] === '--help') {
  console.log(`vawe — one JSON, one video.

  vawe <scene.json> [--draft] [--aspect 16:9,9:16] [--no-grain]

  --draft   fast, no grain, single sample — for iteration
  Renders into the current directory. Engine: ${ROOT}`);
  process.exit(argv.length ? 0 : 1);
}

const scene = argv.find((a) => !a.startsWith('-'));
if (!scene) die('no scene file given', 'vawe <scene.json>');
if (!fs.existsSync(scene)) die(`no such file: ${scene}`);

// PICK THE BINARY FOR THIS MACHINE, AND REFUSE ONE BUILT FOR ANOTHER.
//
// This used to be `process.platform === 'win32' ? 'vawe.exe' : 'vawe'` — a FILENAME choice with no
// architecture check at all. `bin/` ships inside the npm package, so whatever machine published it
// decided everyone's architecture. Published from an Apple Silicon Mac, the tarball carries a
// `Mach-O arm64` binary, and then:
//   Intel Mac  → "Bad CPU type in executable"
//   Linux      → ENOEXEC
// Both arrive raw from the OS loader, through `child.on('error')`, phrased as if the renderer crashed.
// The user is told the wrong thing about a working install of the wrong build.
//
// So the host's own identity picks the file, and the file's MAGIC BYTES are read back before we spawn
// it — the same read-back-from-a-boundary-you-do-not-own rule the engine applies to GSAP eases and CSS
// declarations. The OS loader will not tell us politely, so we ask the bytes first.
const TRIPLE = `${process.platform}-${process.arch}`;
const EXE = process.platform === 'win32' ? '.exe' : '';
const candidates = [path.join(ROOT, 'bin', `vawe-${TRIPLE}${EXE}`), path.join(ROOT, 'bin', `vawe${EXE}`)];
const bin = candidates.find((p) => fs.existsSync(p));
if (!bin) {
  die(`no render binary for ${TRIPLE} in this install`,
      `looked for:\n    ${candidates.join('\n    ')}\n`
      + `  Build one: cd ${ROOT} && make build      (needs Go)\n`
      + `  Or every platform at once: make build-all`);
}

// What was this file actually built for? Four magic numbers cover every target Go emits.
const head = fs.readFileSync(bin, { length: 4, encoding: null }).subarray(0, 4);
const magic = head.toString('hex');
const builtFor =
  magic.startsWith('7f454c46') ? 'linux'                                   // ELF
  : /^(feedfacf|cffaedfe|cafebabe|bebafeca)/.test(magic) ? 'darwin'        // Mach-O (incl. fat)
  : magic.startsWith('4d5a') ? 'win32'                                     // PE/COFF "MZ"
  : null;
if (builtFor && builtFor !== process.platform) {
  die(`this install's render binary was built for ${builtFor}, and you are on ${process.platform} (${process.arch})`,
      `${bin}\n`
      + `  The npm package ships whatever the publishing machine built, which is this bug.\n`
      + `  Build for your machine: cd ${ROOT} && make build      (needs Go)`);
}

// ffmpeg: prefer a bundled static build, fall back to PATH, refuse if neither. `ffmpeg-static` is an
// OPTIONAL dependency on purpose — it is ~80MB, and a machine that already has ffmpeg should not pay
// for a second copy.
const env = { ...process.env };
let ffmpegNote = 'system ffmpeg (on PATH)';
try {
  const { default: ff } = await import('ffmpeg-static');
  if (ff && fs.existsSync(ff)) {
    env.PATH = `${path.dirname(ff)}${path.delimiter}${env.PATH || ''}`;
    ffmpegNote = 'bundled ffmpeg-static';
  }
} catch { /* not installed; PATH it is */ }
if (ffmpegNote.startsWith('system')) {
  const dirs = (env.PATH || '').split(path.delimiter);
  const found = dirs.some((d) => d && fs.existsSync(path.join(d, 'ffmpeg')));
  if (!found) {
    die('ffmpeg not found, and no bundled copy is installed',
        'Install it (brew install ffmpeg / apt install ffmpeg), or: npm i ffmpeg-static');
  }
}

// Chrome: an explicit CHROME_BIN always wins. Otherwise offer puppeteer's download if it is there, and
// stay silent if it is not — chromedp finds a system Chrome on its own, and overriding that with a
// guess would be worse than leaving it alone.
if (!env.CHROME_BIN) {
  try {
    const pptr = await import('puppeteer');
    const p = pptr.default?.executablePath?.();
    if (p && fs.existsSync(p)) env.CHROME_BIN = p;
  } catch { /* let chromedp find the system browser */ }
}
env.REPO = ROOT;

// Stage the scene where the render server will serve it from, EXPANDING it on the way in.
//
// `{type:"block"}` / `{type:"beat"}` / `{type:"comp"}` are authoring sugar that a Node build step
// resolves (scripts/author/expand-blocks.mjs); the Go renderer never expands, it only strips the
// `.expanded` suffix off the output name (main.go:184-188). So without this, any scene using a block —
// which is most of them — reaches the validator as an unknown layer type and dies. That is exactly the
// failure the gh-wrapped source shows when it is validated directly instead of expanded.
//
// It runs UNCONDITIONALLY rather than sniffing for sugar, because expansion is a verified no-op on a
// scene that has none ("expanded 0 block + 0 beat + 0 comp instance(s)", output byte-identical). One
// code path is worth more than one skipped subprocess, and a sniff is a second thing to get wrong.
const base = path.basename(scene).replace(/\.json$/i, '');
const stageDir = path.join(ROOT, '.vawe-data', 'scenes');
fs.mkdirSync(stageDir, { recursive: true });
const staged = path.join(stageDir, `${base}.json`);

const expander = path.join(ROOT, 'scripts', 'author', 'expand-blocks.mjs');
if (fs.existsSync(expander)) {
  const r = spawnSync(process.execPath, [expander, path.resolve(scene), staged], { encoding: 'utf8' });
  if (r.status !== 0) {
    die('could not expand the scene', (r.stderr || r.stdout || '').trim().split('\n').slice(0, 4).join('\n  '));
  }
} else {
  fs.copyFileSync(scene, staged);
}

const passthrough = argv.filter((a) => a !== scene);
console.log(`▶ ${base}  ·  ${ffmpegNote}${env.CHROME_BIN ? ' · bundled Chrome' : ' · system Chrome'}`);

const child = spawn(bin, [staged, ...passthrough], { stdio: 'inherit', env });
child.on('error', (e) => { fs.rmSync(staged, { force: true }); die(`could not start the renderer: ${e.message}`); });
child.on('exit', (code) => {
  fs.rmSync(staged, { force: true });
  if (code !== 0) process.exit(code ?? 1);
  // Copy every artifact this render produced back to the user. Multi-aspect writes more than one file
  // (name-16x9.mp4, name-9x16.mp4), so match on the prefix rather than assuming a single mp4.
  const outDir = path.join(ROOT, 'out');
  const made = fs.existsSync(outDir)
    ? fs.readdirSync(outDir).filter((f) => f.endsWith('.mp4') && (f === `${base}.mp4` || f.startsWith(`${base}-`)))
    : [];
  if (!made.length) {
    die('the renderer reported success but produced no mp4', `looked in ${outDir}`);
  }
  for (const f of made) {
    const dest = path.join(process.cwd(), f);
    fs.copyFileSync(path.join(outDir, f), dest);
    fs.rmSync(path.join(outDir, f), { force: true });
    console.log(`✓ ${dest}`);
  }
});
