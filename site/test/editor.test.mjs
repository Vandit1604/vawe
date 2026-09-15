// site/test/editor.test.mjs — /editor is the one page on this site that is a TOOL, and nothing
// tested it. It boots the real engine in an iframe, so the only honest test is a real browser.
//
//   npm test            (from site/)
//
// WHAT THIS CAN PROVE. That the page renders, that the engine reaches __engineReady and reports a
// meta, that a scene plays and seeks, that a refusal reaches the screen with the fix named, that a
// missing file names itself, and that every control is reachable and escapable by keyboard.
//
// WHAT IT CANNOT PROVE, stated so a green run is not read as more than it is. It never looks at a
// pixel: layout, contrast, letterboxing and whether a render is CORRECT are all invisible to it. It
// asserts on the DOM and on the engine's own handshake. `make judge` and eyes still own the rest.
//
// No new dependency. `node --test` ships with node; puppeteer is already a repo devDependency and
// 41 repo tools run on it. No GPU, no encode: the whole file is one dev server and a few seconds of
// wall-clock playback.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer";

const PORT = 3100 + (process.pid % 400);
const BASE = `http://localhost:${PORT}`;
const BOOT_MS = 20000;

let server, browser;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll until the page answers, or give up loudly rather than failing every test with a timeout. */
async function ready(deadline = Date.now() + 90000) {
  for (;;) {
    try { if ((await fetch(`${BASE}/editor`)).ok) return; } catch { /* not up yet */ }
    if (Date.now() > deadline) throw new Error(`dev server never answered on ${BASE}`);
    await wait(400);
  }
}

/** A page with the editor loaded and its first scene booted. */
async function open(setup) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  if (setup) await setup(page);
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  return page;
}

/** Resolve once the scene inside the stage iframe has booted, or when the editor reports a fault. */
async function settled(page) {
  await page.waitForFunction(
    () => {
      const f = document.querySelector(".sp-frame");
      const w = f && f.contentWindow;
      return Boolean((w && (w.__engineReady || w.__engineError)) || document.querySelector(".ed-problem"));
    },
    { timeout: BOOT_MS, polling: 200 },
  );
}

const status = (page) => page.$eval(".ed-status", (e) => e.textContent.trim());
const problem = (page) => page.$eval(".ed-problem", (e) => e.textContent).catch(() => null);
const focused = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return a ? `${a.tagName.toLowerCase()}.${a.className || ""}${a.id ? `#${a.id}` : ""}` : "none";
});

before(async () => {
  // `npm run dev` and not `next dev`: predev vendors the engine into public/, and without it the
  // stage iframe 404s and every assertion below is about a dead page.
  server = spawn("npm", ["run", "dev", "--", "-p", String(PORT)], { cwd: new URL("..", import.meta.url).pathname, stdio: "ignore" });
  await ready();
  browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
});

after(async () => {
  await browser?.close();
  server?.kill("SIGTERM");
});

test("the page renders and the starter scene boots the real engine", async () => {
  const page = await open();
  await settled(page);
  const meta = await page.evaluate(() => document.querySelector(".sp-frame").contentWindow.__engine?.meta);
  assert.ok(meta, "window.__engine.meta never appeared — the engine did not boot");
  assert.equal(meta.fps, 30);
  assert.ok(meta.totalFrames > 0);
  assert.match(await status(page), /rendering live/);
  await page.close();
});

test("a scene loads, plays and seeks", async () => {
  const page = await open();
  await settled(page);
  await page.select("#ed-scene", "showcase-type");
  await settled(page);
  const frame = () => page.$eval(".sp-time", (e) => Number(/f(\d+)/.exec(e.textContent)?.[1] ?? -1));
  // The readout says "booting…" while the engine starts. Waiting for a frame NUMBER, not for the
  // handshake, is what makes this insensitive to how many times the scene boots — and a scene load
  // is supposed to boot it exactly once.
  await page.waitForFunction(() => /f\d/.test(document.querySelector(".sp-time").textContent), { timeout: BOOT_MS });
  const a = await frame();
  await wait(700);
  const b = await frame();
  assert.notEqual(a, b, "the frame counter never moved — playback is dead");

  // Seek with the keyboard, which is what a range input is FOR and what a user actually does. The
  // arrow key also proves the control is operable without a pointer.
  await page.focus(".sp-scrub");
  await page.keyboard.press("ArrowLeft");
  const paused = await frame();
  assert.ok(paused >= 0, "the transport lost its frame number mid-test — the scene rebooted");
  await wait(500);
  assert.equal(await frame(), paused, "seeking did not pause playback");
  await page.keyboard.press("ArrowRight");
  assert.equal(await frame(), paused + 1, "the scrubber did not step one frame");
  await page.close();
});

test("a scene using build-time sugar boots directly, no separate expand step", async () => {
  const page = await open();
  await settled(page);
  // saas-hero-launch is SHIPPED in the picker, and it AUTHORS four `"type":"block"` layers. It boots
  // with no refusal because scripts/site/scenes-json.mjs ran expandScene over it at PUBLISH time, so
  // what the picker serves under site/public/scenes/ is already plain layers. Nothing expands sugar at
  // load: films/scene/scene.js:152 never imports core/engine/expand.js, on purpose. That is exactly why
  // site/app/editor/sugar.ts still refuses sugar a visitor TYPES, which has no publish step behind it.
  await page.select("#ed-scene", "saas-hero-launch");
  await settled(page);
  const meta = await page.evaluate(() => document.querySelector(".sp-frame").contentWindow.__engine?.meta);
  assert.ok(meta, "window.__engine.meta never appeared — the engine did not boot");
  assert.ok(meta.totalFrames > 0);
  assert.equal(await problem(page), null, "a build-time-sugar scene must not raise a problem any more");
  assert.match(await status(page), /rendering live/);
  await page.close();
});

test("a broken scene shows the engine's own refusal, not a blank stage", async () => {
  const page = await open();
  await settled(page);
  await page.click(".ed-cm .cm-content");
  await page.keyboard.down("Meta"); await page.keyboard.press("a"); await page.keyboard.up("Meta");
  // Valid JSON the ENGINE rejects (bg is required), so this exercises the boot handshake rather
  // than the local parser.
  await page.keyboard.type('{"module":"scene","aspect":"16:9","duration":2,"layers":[]}');
  await page.waitForSelector(".ed-problem", { timeout: BOOT_MS });
  const text = await problem(page);
  assert.match(text, /bg is required/, "the engine's own words never reached the page");
  // The message names two faults on two lines. It was being collapsed into one paragraph and then
  // cut off, so the newline is the assertion.
  assert.match(text, /layers needs/);
  assert.ok(text.includes("\n"), "the refusal's own line breaks were collapsed");
  await page.close();
});

test("a scene that 404s names the file", async () => {
  const page = await open(async (p) => {
    await p.setRequestInterception(true);
    p.on("request", (r) => (r.url().endsWith("/scenes/hero-site.json")
      ? r.respond({ status: 404, contentType: "text/plain", body: "gone" })
      : r.continue()));
  });
  await settled(page);
  await page.select("#ed-scene", "hero-site");
  await page.waitForSelector(".ed-problem", { timeout: BOOT_MS });
  assert.match(await problem(page), /\/scenes\/hero-site\.json not found \(404\)/);
  await page.close();
});

test("every control is reachable by keyboard, and the code pane can be left", async () => {
  const page = await open();
  await settled(page);
  await page.focus("#ed-scene");
  const order = [];
  // Walk the whole editor the way a keyboard user does. Tab stops inside CodeMirror (it indents),
  // so the walk releases it with Escape and carries on — the exact sequence the pane head prints.
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("Tab");
    const at = await focused(page);
    order.push(at);
    if (at.includes("cm-content")) await page.keyboard.press("Escape");
  }

  for (const want of ["button.ed-fold", "button.ed-copy", "button.sp-play", "input.sp-scrub"]) {
    assert.ok(order.some((f) => f.startsWith(want)), `${want} is not reachable by Tab — got ${order.join(", ")}`);
  }
  // The stage is a whole rendered document with nothing focusable in it. Tabbing into it used to
  // make the focus ring disappear (useSceneEngine now sets tabIndex -1).
  assert.ok(!order.some((f) => f.startsWith("iframe")), `focus entered the stage iframe: ${order.join(", ")}`);

  // CodeMirror binds Tab to indent, which is a keyboard trap unless Escape releases it. The pane
  // head says so; this proves the page is telling the truth. Reloaded first: the walk above left
  // an Escape pending, and that flag is exactly what this half is measuring.
  await page.reload({ waitUntil: "networkidle0" });
  await settled(page);
  await page.click(".ed-cm .cm-content");
  await page.keyboard.press("Tab");
  assert.match(await focused(page), /cm-content/, "Tab left the editor, so the pane head's hint is wrong");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  assert.doesNotMatch(await focused(page), /cm-content/, "Escape then Tab did not leave the code pane");
  await page.close();
});
