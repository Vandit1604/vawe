"use client";

/**
 * The generator playground: dials on the right, the live generator on the left.
 *
 * NOTHING HERE KNOWS WHAT A LIGHTFIELD IS. It reads `GENERATORS` out of the vendored engine
 * (core/generators.js) and builds the panel from each generator's declarative schema, so adding a
 * generator to the registry is the whole job of putting it on this page. A hand-kept list of dials
 * over here would be a second source of truth that goes stale in silence, which is exactly how
 * site/public froze 77 files behind core/ (engine-doctrine/MISTAKES.md #271).
 *
 * The engine is loaded at RUNTIME with a dynamic import of "/core/generators.js", not bundled. Two
 * reasons, and the second is the real one: the site vendors core/ into public/ as static files, so
 * bundling would fork the engine into a webpack copy that drifts from the one /editor boots. This
 * way the page runs the same file the renderer does.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSceneEngine } from "../components/useSceneEngine";
import { useStageFit } from "../components/useStageFit";
// THE ENGINE, IN THE COMPONENT /arsenal ALREADY USES FOR THIS. BlockLive puts a block on screen with
// the real renderer and frames it identically to its still, so the two land in the same box and the
// picture does not jump when the engine arrives. This page had a hand-rolled preview that could only
// animate a block animating through CSS custom properties, which almost none do.
import { BlockLive } from "../arsenal/BlockLive";
// THE MEASURED INK RECT OF EVERY BLOCK, and not a table invented here. `make blocks-scenes` writes
// it by rendering each block alone on a 1920x1080 canvas and measuring what it actually painted,
// /arsenal's detail page already imports the same file, and this page needs the same fact for the
// same reason: a poster should be the shape of the thing inside it. Measured, not guessed:
// morphText's real bounds are 944x194, so a 16:9 poster gave it a box two and a half times its own
// height and the word sat marooned in the middle of it.
import FRAMES from "../../lib/block-frames.json";

type Spec = {
  kind: "int" | "unit" | "num" | "hex" | "enum" | "group" | "hexlist"
      | "str" | "bool" | "color" | "list" | "row" | "oneOf" | "block";
  min?: number; max?: number; def?: unknown; of?: unknown; primary?: boolean;
  fields?: Record<string, Spec>;
};
type Control = { path: string; key: string; group: string | null; spec: Spec };
type Layer = Record<string, unknown>;
type Generator = {
  name: string; blurb: string; docs?: string; group?: string;
  produces?: "html" | "layers";
  // WHICH REGISTRY THIS CAME FROM, recorded where the two lists are joined rather than guessed
  // downstream. A generator and a block behave differently when you open them, and until now the
  // library said nothing about which one you were about to get.
  origin?: "engine" | "block";
  // A FULL-FRAME OVERLAY, said by the block catalog rather than guessed from the layers. It is the
  // same flag blocks-scenes.mjs reads to skip rendering a still, and it is the reason these two have
  // neither a still nor a crop rect: a rect measured around something that IS the frame means
  // nothing. Carried here because it also decides what to preview the thing OVER.
  overlay?: boolean;
  schema: Record<string, Spec>;
  presets?: Record<string, Record<string, unknown>>;
  normalise?: (o: unknown) => Record<string, unknown>;
  render: (opts: unknown) => string | Layer[];
};
type Engine = {
  GENERATORS: Generator[];
  HELD_BACK: number;
  randomOptions: (s: Record<string, Spec>, rand?: () => number, out?: Record<string, unknown>,
    skipped?: string[], base?: Record<string, unknown> | null, free?: boolean) => Record<string, unknown>;
  controlsOf: (s: Record<string, Spec>) => Control[];
  defaultsOf: (s: Record<string, Spec>) => Record<string, unknown>;
  diffFromDefaults: (o: unknown, s: Record<string, Spec>) => Record<string, unknown>;
};

// A RUNTIME url, held in a variable on purpose. As a literal, TypeScript tries to resolve it as a
// module path and fails, because it is not one: it is a static file the site serves at the root. The
// variable also keeps the bundler out of it, which is the point of the whole arrangement.
const ENGINE_URL = "/core/generators.js";
// /blocklib and NOT /blocks: site/next.config.mjs 308s `/blocks/:name` to `/arsenal/:name`,
// because the old /blocks page moved there. A redirect cannot tell a page path from a static
// file, so a module vendored to /blocks/index.mjs answers 404 at /arsenal/index.mjs.
const BLOCKS_URL = "/blocklib/index.mjs";

// ── THE PICK LIST ────────────────────────────────────────────────────────────────────────────────
// THIS PAGE IS AN EDIT, NOT AN INDEX, and that distinction is the whole reason it is worth opening.
// /arsenal is the exhaustive catalogue: every block, every effect, 800-odd things, complete by
// construction and gated to stay that way. The playground is the handful somebody CHOSE, because a
// designer who lands here should meet the engine at its best and leave wanting to try it.
//
// It was eight generators, hand-picked. Then the block library became loadable in a browser and all 95
// families were poured in, on the reasoning that a hand-kept list is a second source of truth that
// goes stale in silence. That reasoning is right about a CATALOGUE and exactly wrong here: the
// curation IS the product. The page filled up with `redditPost`, `codeBlock`, `table` and `feedRow`,
// which are honest working parts and belong in the catalogue, not in a shop window.
//
// So the list is deliberate and it is small. The bar: could a designer see this and want to build
// with it. A part that answers "what would I use this for" rather than "how did they do that" is a
// catalogue entry, and /arsenal already has it. Nothing here goes stale, because a name that stops
// existing fails `lib-test`, which asserts every one of these resolves to a real family.
const FEATURED = new Set([
  // surfaces you feel before you read: glass, light, grain
  "glassCard", "borderBeamCard", "spotlightCard", "meshPanel", "grainOverlay", "glassDock",
  // type and text doing something a still cannot show
  "morphText", "splitFlapBoard", "textCursor", "colorCycle",
  // whole-frame moves
  "parallaxZoom", "uiReveal3d", "screenSwap",
  // the camera pretending to be a camera
  "camcorderHud", "scanGate",
  // A STATE TURNING INTO ANOTHER STATE, which is the family `codeMorph` belongs to and the reason it
  // earns a place here: you cannot screenshot it. The first cut of this list dropped the whole Code
  // category as "utility parts", which was the wrong axis. `table` and `redditPost` are utility;
  // `codeMorph` is a transformation. The test is not what CATEGORY a block is filed under, it is
  // whether it does something over time that a still cannot show.
  "codeMorph", "codeFlight", "codeDiff",
  // a process you watch complete, the other thing a screenshot cannot carry
  "deploySuccess", "terminalPro",
  // interaction, which is the hardest thing for a static portfolio to fake
  "pointer",
]);


const BLOCK_CATALOG_URL = "/blocklib/catalog.mjs";
const AMBIENT_URL = "/core/shaders-ambient.js";
const PALETTE_URL = "/core/surfaces/palette.js";

const get = (o: Record<string, unknown>, path: string): unknown =>
  path.split(".").reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], o);

/** Immutable set-at-path. The panel re-renders off identity, and mutating state in place is how a
 *  control ends up showing a value the generator never received. */
const setAt = (o: Record<string, unknown>, path: string, v: unknown): Record<string, unknown> => {
  const [head, ...rest] = path.split(".");
  if (!rest.length) return { ...o, [head]: v };
  const child = (o[head] ?? {}) as Record<string, unknown>;
  return { ...o, [head]: setAt(child, rest.join("."), v) };
};

// 4K for the DOWNLOAD: a backdrop gets scaled up in use, so give the file room.
const RW = 3840, RH = 2160;
// 1080p for the CLIPBOARD. The same frame at 4K is a 6.6MB write that a chat box or a doc will scale
// straight back down, and the write is slow enough to feel. A paste wants a picture, not an original.
const CW = 1920, CH = 1080;

// bands and spectrum emit scene LAYERS, so the picture on the stage is the engine's own render inside
// an iframe and this page holds no markup for it. Everything that turns markup into a file or an image
// says this rather than doing nothing.
const NO_MARKUP = "this look renders as a scene, not as markup, so there is no fragment here to save "
  + "or copy as an image. The options and the link still copy.";

const msgOf = (e: unknown) => String((e as Error)?.message || e);

/** A look and its only preset usually share a name, and "colonnade-colonnade" is noise. */
const stampOf = (name: string, tag: string | null) =>
  (tag ?? "custom") === name ? name : `${name}-${tag ?? "custom"}`;

const LABELS: Record<string, string> = {
  seed: "seed", colour: "colour", shadow: "shadow", pattern: "pattern", motion: "motion",
};

/** A set of layers, wrapped in the smallest scene that will render them, as a blob URL.
 *
 *  ONE BUILDER, TWO CALLERS: the detail stage and every poster whose item has no pre-rendered scene
 *  in the build. They were never allowed to disagree about what previewing a set of layers means, and
 *  a second copy of this is how they would have.
 *
 *  The SAME scene shape scripts/site/blocks-scenes.mjs builds for the /arsenal posters, copied rather
 *  than invented: the first version guessed a `calm` backdrop that is not in the registry, and a
 *  scene naming a preset nothing has renders black.
 *
 *  THE DURATION COMES FROM THE LAYERS, and 9 was a constant that blanked the stage. The detail stage
 *  draws the MIDDLE frame, so on a fixed 9s scene that is t=4.5. A generator emitting one long layer
 *  is fine there; a BLOCK is not. morphText returns `start: 0, duration: 3.8`, so the middle frame of
 *  a nine-second scene is a second and a half after the block has finished, and the preview came up
 *  empty with nothing wrong anywhere: the engine drew exactly what was asked. A tail keeps the last
 *  exit inside the scene rather than clipped by its final frame. */
function sceneBlob(layers: Layer[], over: "plain" | "black" = "plain"): string {
  const span = layers.reduce((m, L) => {
    const l = L as Record<string, number>;
    return Math.max(m, (Number(l.start) || 0) + (Number(l.duration) || 0));
  }, 0);
  const duration = Math.max(3, Math.min(30, span > 0 ? span + 0.4 : 9));
  const scene = {
    module: "scene", aspect: "16:9", theme: "vawe", duration,
    audio: { silent: true },
    // AN OVERLAY NEEDS SOMETHING TO BE OVER. `plain` is right for a block, which is a thing placed on
    // a page, and it is what the build renders every block still on. It is wrong for the two families
    // the catalog marks `overlay`: camcorderHud is a white viewfinder HUD, and on a white backdrop
    // the poster was a white rectangle with a few grey ticks in the corners, which is not a bug in
    // the block, it is a preview shown over nothing. Black is the honest ground for something
    // authored to sit over footage, and it is the one preset that is actually #000000.
    bg: [{ preset: over, from: 0, to: duration }],
    layers,
  };
  return URL.createObjectURL(new Blob([JSON.stringify(scene)], { type: "application/json" }));
}

export function PlaygroundClient({ initial }: { initial?: string } = {}) {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [bootErr, setBootErr] = useState<string | null>(null);
  // `null` is the LIBRARY: a wall of looks and nothing else. Picking one opens the tuner. Two states
  // rather than one, because a grid plus a full-size preview plus a panel put the preview back below
  // the fold, which is the thing this page was just fixed for.
  // `null` is the LIBRARY. The name comes from the URL, so a refresh keeps you where you were and a
  // link opens on the same generator. Resolved to an index once the engine has loaded, because only
  // the engine knows the registry.
  const [which, setWhich] = useState<number | null>(null);
  const [opts, setOpts] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // A SECOND message, kept apart from `err` on purpose. `err` means the generator refused an option, and
  // the stage answers that by dimming and saying the picture is the last one that rendered. A copy or a
  // download that cannot run says nothing about the picture, which is current and correct, so it must
  // not borrow that annotation.
  const [toolErr, setToolErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [preset, setPreset] = useState<string | null>(null);
  const [noDial, setNoDial] = useState<string[]>([]);
  // The patch, for the download filename only. A ref because it is read inside a callback and must not
  // put that callback in every render's dependency list.
  const patchRef = useRef<Record<string, unknown>>({});
  const presetRef = useRef<string | null>(null);
  const optsFor = useRef<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  // The last result this generator produced, held so a refused option does not blank the preview.
  const lastGood = useRef<{ name: string; made: string | Layer[] } | null>(null);

  // Boot the engine once. A failure here is shown rather than swallowed: a blank panel with no
  // message is the worst outcome, because it looks like the page simply has nothing in it.
  useEffect(() => {
    let alive = true;
    // BLOCKS JOIN THE GENERATORS, AND THEY ARE NOT A SECOND LIST. Every block family already carries
    // a typed option table with real bounds (blocks/schema.mjs, whose banner says it exists so that
    // "nothing could build a control panel for a block" would stop being true), and this page, the one
    // page built to turn dials, could not reach a single one, because blocks/index.mjs called
    // fs.readdirSync on its own directory and so could never be vendored to the browser. It imports
    // statically now, site-engine.mjs ships it to /blocklib, and a family adapts to the generator
    // shape here rather than being re-declared: name, blurb and category come from the block
    // registry, the schema comes from the block's own table, and `render` is the factory itself.
    Promise.all([
      import(/* webpackIgnore: true */ ENGINE_URL),
      // NOT `.catch(() => null)`. Swallowing this is the exact failure this repo names most often: the
      // page would show eight generators, look entirely correct, and never say that a hundred block
      // families did not arrive. The generators are the page's floor, so a block failure must not
      // blank it, but it MUST be audible.
      import(/* webpackIgnore: true */ BLOCKS_URL)
        .catch((e) => { console.error("playground: blocks did not load from " + BLOCKS_URL, e); return null; }),
      import(/* webpackIgnore: true */ BLOCK_CATALOG_URL)
        .catch((e) => { console.error("playground: block catalog did not load", e); return null; }),
    ])
      .then(([m, b, c]) => {
        if (!alive) return;
        const engineMod = m as unknown as Engine;
        const blocks: Generator[] = [];
        if (b && c) {
          const B = b as unknown as { BLOCKS: Record<string, (o: unknown) => Layer[]>;
            SCHEMAS: Record<string, Record<string, Spec>>; CATEGORY_OF: Record<string, string> };
          const rows = (c as unknown as { CATALOG: { name: string; family: string; blurb?: string;
            overlay?: boolean; props?: Record<string, unknown> }[] }).CATALOG;
          // A BARE FAMILY ROW, AND ONLY ONE THAT IS ON THE PICK LIST. The catalog also carries
          // namespaced `family.variant` presets, which share their family's option table and would put
          // the same dials on the page a dozen times under different names.
          const seen = new Set<string>();
          for (const row of rows) {
            if (row.name.includes(".") || seen.has(row.family)) continue;
            if (!FEATURED.has(row.family)) continue;
            const schema = B.SCHEMAS[row.family];
            const factory = B.BLOCKS[row.family];
            // A family with no schema has no dials to turn, so it has no business on this page.
            if (!schema || typeof factory !== "function") continue;
            seen.add(row.family);
            // THE CATALOG ROW IS THE PRESET, and without it the page opens on a refusal. A block's
            // schema defaults are neutral values (`words: []` on morphText), and a BARE family name
            // does not inherit its row's props: blocks/index.mjs is explicit that only a namespaced
            // `family.variant` merges them, and that this is deliberate for a scene, where silently
            // giving every unset field demo content would be a substitution wearing the other coat.
            // A playground is the other case. This page already starts every generator on its first
            // preset for the same reason it needs one here, in its own words: "the schema's defaults
            // are the neutral value of each field, which is a different thing from a considered
            // result". So the row becomes a preset rather than a new kind of default: it shows in the
            // preset chips, it is one click to leave, and `diffFromDefaults` still reports the patch
            // against the real schema defaults rather than against the demo.
            const demo = row.props && Object.keys(row.props).length ? { [row.name]: row.props } : undefined;
            blocks.push({ name: row.family, blurb: row.blurb || "", produces: "layers",
              origin: "block", overlay: !!row.overlay,
              group: B.CATEGORY_OF[row.family] || "blocks", schema, presets: demo,
              render: (o: unknown) => factory(o) });
          }
        }
        setEngine({ ...engineMod, GENERATORS: [...engineMod.GENERATORS, ...blocks] });
      })
      .catch((e) => { if (alive) setBootErr(String(e?.message || e)); });
    return () => { alive = false; };
  }, []);

  // Adopt the name from the path exactly once, when the engine arrives. An unknown name falls through
  // to the library rather than 404ing: the registry is the only thing that knows what exists, and it
  // lives here.
  const adopted = useRef(false);
  useEffect(() => {
    if (!engine || adopted.current) return;
    adopted.current = true;
    if (!initial) return;
    const i = engine.GENERATORS.findIndex((g) => g.name === initial);
    if (i >= 0) setWhich(i);
  }, [engine, initial]);

  const gen = which == null ? null : (engine?.GENERATORS[which] ?? null);

  // Keep the address bar honest without a navigation: replaceState, so opening a generator and going
  // back does not stack history entries nobody asked for.
  useEffect(() => {
    if (!engine) return;
    const path = gen ? `/playground/${gen.name}` : "/playground";
    if (window.location.pathname !== path) {
      window.history.replaceState(null, "", path + window.location.search);
    }
  }, [engine, gen]);

  // Reset to a generator's own defaults when it changes, and read a shared link on first load.
  useEffect(() => {
    if (!engine || !gen) return;
    // Start on the generator's FIRST PRESET where it has one. The schema's defaults are the neutral
    // value of each field, which is a different thing from a considered result, and landing someone on
    // them shows the least interesting version of what you are asking them to judge.
    const first = gen.presets ? Object.keys(gen.presets)[0] : null;
    const base = first
      ? deepMerge(engine.defaultsOf(gen.schema), gen.presets![first])
      : engine.defaultsOf(gen.schema);
    setPreset(first);
    setNoDial([]);                 // the skipped list belongs to the generator that produced it
    optsFor.current = gen.name;
    const raw = new URLSearchParams(window.location.search).get("o");
    if (!raw) { setOpts(base); return; }
    try {
      const patch = JSON.parse(atob(raw));
      setOpts(deepMerge(base, patch));
      setPreset(null);
    } catch { setOpts(base); }
  }, [engine, gen]);

  const controls = useMemo(
    () => (engine && gen ? engine.controlsOf(gen.schema) : []),
    [engine, gen],
  );
  // NOTHING IS HIDDEN. A generator that declares `primary` used to show only those, with the rest
  // behind an "all options (12 more)" button. That is the right instinct on a page you are scanning
  // and the wrong one on a page whose entire purpose is the dials: the person who opened
  // /playground/bands came to turn things, and the option they came for was as likely to be in the
  // twelve as in the four. `primary` still does work, it ORDERS the panel rather than truncating it,
  // so the interesting dials still lead and none of them is a click away.
  const shown = [...controls].sort((a, b) => Number(!!b.spec.primary) - Number(!!a.spec.primary));

  // The generated markup, or the generator's own error message. `render` THROWS on a bad option
  // rather than substituting a default, and that message is the most useful thing on the page when
  // something is wrong, so it is shown verbatim instead of being turned into "invalid input".
  const made = useMemo(() => {
    // Options are a generator's OWN vocabulary. Switching looks kept the previous object for one
    // render, so `bands`' `count` reached lightfield and it refused, correctly, with an error the
    // person switching had not caused. `optsFor` is the name of the generator these belong to, and a
    // mismatch means the reset below has not run yet: render nothing rather than something wrong.
    if (!gen || !opts || optsFor.current !== gen.name) return null;
    try {
      const r = gen.render(opts);
      setErr(null);
      lastGood.current = { name: gen.name, made: r };
      return r;
    } catch (e) {
      setErr(String((e as Error)?.message || e));
      // HOLD THE LAST FRAME THAT RENDERED. A refusal is usually one bad keystroke on one dial, and
      // blanking the stage throws away the picture the refusal has to be read against: you lose both
      // the thing you were judging and the ability to see what the dial was doing. The stage is
      // marked stale below so the held frame is never mistaken for the current one.
      return lastGood.current?.name === gen.name ? lastGood.current.made : null;
    }
  }, [gen, opts]);
  const html = typeof made === "string" ? made : null;
  const layers = Array.isArray(made) ? made : null;

  // A block is a scene FRAGMENT, so it previews as a scene: build one around it and hand the engine a
  // blob URL, which is the path /blocks already takes. Painting its `html` layers by hand here would be
  // a second engine that agrees with the first right up until it does not.
  const sceneUrl = useMemo(() => (layers ? sceneBlob(layers) : null), [layers]);
  // Revoke the previous blob when it is replaced. Every keystroke on a dial makes one, and a page that
  // leaks a blob per keystroke is a page that gets slower the longer someone plays with it.
  const lastUrl = useRef<string | null>(null);
  useEffect(() => {
    const prev = lastUrl.current;
    lastUrl.current = sceneUrl;
    return () => { if (prev && prev !== sceneUrl) URL.revokeObjectURL(prev); };
  }, [sceneUrl]);

  // Paint it and pin `--t` to ZERO. Nothing on this page moves, and nothing can be made to move: there
  // is no loop and no clock control. A field is judged against a still reference, and a picture that
  // changes while you look at it cannot be compared to one that does not.
  //
  // `motion.*` are still real options, because they are real in a render. They sit behind the
  // disclosure and the panel says the preview is still, which is the honest version of a dial whose
  // effect you cannot see here.
  useEffect(() => {
    const el = stage.current;
    if (!el || html == null) return;
    el.innerHTML = html;
    el.style.setProperty("--t", "0");
  }, [html]);

  const apply = useCallback((next: Record<string, unknown>, named: string | null = null) => {
    setPreset(named);
    if (gen) optsFor.current = gen.name;
    try { setOpts(gen?.normalise ? gen.normalise(next) : next); setErr(null); }
    catch (e) { setErr(String((e as Error)?.message || e)); }
  }, [gen]);

  const change = useCallback((path: string, v: unknown) => {
    setOpts((o) => {
      if (!o) return o;
      const next = setAt(o, path, v);
      setPreset(null);
      try { return gen?.normalise ? gen.normalise(next) : next; }
      catch { return next; }        // the render below reports it; do not swallow the edit
    });
  }, [gen]);

  // Roll one section. Asking for `colour` by name is asking for a different colour, not a slightly
  // different one, so a section roll is FREE where the global one nudges.
  const rollSection = useCallback((group: string) => {
    if (!engine || !gen || !opts) return;
    const spec = gen.schema[group];
    if (!spec?.fields) return;
    const sub = engine.randomOptions(spec.fields, Math.random, {}, [],
      (opts[group] ?? null) as Record<string, unknown> | null, true);
    apply({ ...opts, [group]: sub });
  }, [engine, gen, opts, apply]);

  // Rasterise the fragment to a PNG, client side, with the same trick core/seams.js uses in the engine:
  // wrap the markup in an SVG <foreignObject>, load that as an image, draw it to a canvas.
  //
  // TWO THINGS THAT WOULD SILENTLY RUIN IT, both learned in the engine and both handled here:
  //   1. External stylesheets DO NOT apply inside a foreignObject. This works because a generator emits
  //      its own <style> inline, so the fragment is self-contained. A generator that ever relied on a
  //      page stylesheet would rasterise wrong, and that is why this asks the generator for markup
  //      rather than serialising the live DOM node.
  //   2. `--t` has to be written on the wrapper. Inside the SVG there is no page to inherit it from, so
  //      every calc() reading it would be invalid and the whole declaration dropped (engine-doctrine/MISTAKES.md
  //      #261). Pinned to 0, the frame everyone is looking at.
  //
  // One rasteriser, two callers. The download and the clipboard were never allowed to disagree about
  // what a frame of this look looks like.
  const rasterise = useCallback(async (w: number, h: number): Promise<Blob> => {
    if (typeof html !== "string") throw new Error(NO_MARKUP);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`
      + `<foreignObject width="100%" height="100%">`
      + `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;position:relative;--t:0">`
      + `${html}</div></foreignObject></svg>`;
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
    if (!blob) throw new Error("the canvas produced no PNG");
    return blob;
  }, [html]);

  const download = useCallback(async (what: "png" | "html") => {
    if (!gen) return;
    // This used to return in silence, so on a scene-layer look every download in the menu was a button
    // that did nothing and said nothing. Both of them are refused by name now.
    if (typeof html !== "string") { setToolErr(NO_MARKUP); return; }
    setToolErr(null);
    // The name says what this IS. `preset` was measured against the schema's defaults, so simply opening
    // a look and downloading it produced "custom" before anyone had touched a dial, which is a filename
    // that lies about its own contents. The preset STATE is the honest source: it is null the moment
    // anything is changed and holds the preset's name until then.
    const stamp = stampOf(gen.name, presetRef.current);
    if (what === "html") {
      // A whole page, not a bare fragment: what someone downloads should open.
      const doc = `<!doctype html><meta charset="utf-8"><title>${gen.name}</title>`
        + `<style>html,body{margin:0;height:100%;background:#000}`
        + `#f{position:relative;width:100vw;height:100vh;--t:0}</style><div id="f">${html}</div>`;
      save(new Blob([doc], { type: "text/html" }), `${stamp}.html`);
      return;
    }
    try { save(await rasterise(RW, RH), `${stamp}-${RW}x${RH}.png`); }
    catch (e) {
      // Loud, because a silent failure here looks like a browser that ignored the click.
      setToolErr(`could not rasterise: ${msgOf(e)}`);
    }
  }, [html, gen, rasterise]);

  // The frame itself, on the clipboard, so it can go straight into a message or a doc.
  const copyImage = useCallback(() => {
    if (!gen) return;
    if (typeof html !== "string") { setToolErr(NO_MARKUP); return; }
    setToolErr(null);
    const png = rasterise(CW, CH);
    const stamp = stampOf(gen.name, presetRef.current);
    // No image clipboard here: Firefox writes text only, and `write` does not exist outside a secure
    // context at all. Degrade to the file rather than leave a button that looks like it worked.
    if (!window.isSecureContext || typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      png.then((b) => save(b, `${stamp}-${CW}x${CH}.png`))
         .catch((e) => setToolErr(`could not rasterise: ${msgOf(e)}`));
      setToolErr("this browser will not put an image on the clipboard, so the PNG was downloaded instead");
      return;
    }
    // The PENDING blob is what goes into the ClipboardItem, and the write is called INSIDE the click.
    // Safari ties clipboard permission to the gesture, so an `await` between the two loses it.
    navigator.clipboard.write([new ClipboardItem({ "image/png": png })])
      .then(() => { setCopied("image"); setTimeout(() => setCopied(null), 1600); })
      .catch((e) => setToolErr(`could not copy the image: ${msgOf(e)}`));
  }, [html, gen, rasterise]);

  const copy = useCallback((label: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1600);
    });
  }, []);

  if (bootErr) {
    return (
      <p className="pgnote pgbad">
        The engine did not load: {bootErr}. It is served from <code>/core/generators.js</code>; if you
        are running the site locally, <code>npm run predev</code> publishes it.
      </p>
    );
  }
  if (!engine) return <p className="pgnote">Loading the engine…</p>;

  if (which == null) {
    return (
      <>
        <p className="pglede">
          The engine’s generators and its block families, running here rather than in a render.
          Every poster is the real thing, moving while it is on screen. Open one to turn its dials.
        </p>
        {/* A SCROLL, NOT A WALL. The grid put two 420px cards abreast and asked the eye to compare
            them, which is why nothing was allowed to move. One poster at a time is a different
            question: not "which of these", but "what is this". So they are full width and they run. */}
        <div className="pgscroll">
          {engine.GENERATORS.map((g, i) => (
            <Poster key={g.name} gen={g} engine={engine} onPick={() => setWhich(i)} />
          ))}
        </div>
        {engine.HELD_BACK > 0 && (
          <p className="lheld">
            {engine.HELD_BACK} more {engine.HELD_BACK === 1 ? "look is" : "looks are"} built and held
            back: each one is measured against a reference on every run and is not close enough yet.
          </p>
        )}
      </>
    );
  }

  if (!gen || !opts) return <p className="pgnote">Loading the engine…</p>;

  // Only what was changed. Short, and more usefully READABLE: it says what this person did, which is
  // the thing worth pasting into a scene or into an issue.
  const patch = engine.diffFromDefaults(opts, gen.schema);
  patchRef.current = patch;
  presetRef.current = preset;
  const patchJson = JSON.stringify(patch, null, 2);
  const link = typeof window === "undefined" ? "" :
    `${window.location.origin}${window.location.pathname}` +
    (Object.keys(patch).length ? `?o=${btoa(JSON.stringify(patch))}` : "");

  return (
    <div className="pg">
      <div className="lback">
        <button onClick={() => setWhich(null)}>← all looks</button>
        <strong>{gen.name}</strong>
        <span>{engine.GENERATORS.length} in the library</span>
      </div>

      <div className="pggrid">
        <div className={`pgstage${err && made ? " is-stale" : ""}`}>
          {sceneUrl
            ? <ScenePreview url={sceneUrl} title={`${gen.name} preview`} />
            : <div className="pgfield" ref={stage} aria-label={`${gen.name} preview`} />}
          {(err || toolErr) && (
            <div className="pgerr" role="status">
              <p>{err ?? toolErr}</p>
              {/* Sibling, not a nested span: inside the paragraph the two strings ran together in
                  textContent, so a screen reader read "got 0the picture above is the last one". */}
              {err && made && <p className="pgheld">the picture above is the last one that rendered</p>}
            </div>
          )}
        </div>

        <div className="pgpanel">
          <p className="pgblurb">{gen.blurb}</p>
          {gen.presets && (
            <div className="pgpresets">
              {Object.keys(gen.presets).map((k) => (
                <button key={k} className={preset === k ? "on" : undefined}
                  onClick={() => apply(deepMerge(engine.defaultsOf(gen.schema), gen.presets![k]), k)}>{k}</button>
              ))}
            </div>
          )}
          {groupControls(shown).map(([group, items]) => (
            <fieldset key={group ?? "_"} className="pggroup">
              {group && (
                <legend>
                  {LABELS[group] ?? group}
                  <button className="pgroll" title={`randomise ${group} only`}
                    onClick={() => rollSection(group)} aria-label={`randomise ${group}`}>↻</button>
                </legend>
              )}
              {items.map((c) => (
                <Row key={c.path} c={c} value={get(opts, c.path)} onChange={change} />
              ))}
            </fieldset>
          ))}
        </div>
      </div>

      <div className="pgbar">
        {/* One copy control. Three buttons of equal weight made the person choose before they knew the
            difference; options is what almost everyone wants, and the other two are a keystroke away. */}
        <div className="pgcopy">
          <button className="btn btn-ghost" onClick={() => copy("options", patchJson)}>
            {copied ? "copied" : "copy options"}
          </button>
          <select aria-label="copy something else" value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === "html" && made) copy("html", typeof made === "string" ? made : JSON.stringify(made, null, 2));
              if (v === "link") copy("link", link);
              if (v === "image") copyImage();
              if (v === "png" || v === "file") download(v === "png" ? "png" : "html");
              e.target.value = "";
            }}>
            <option value="" disabled>…</option>
            <option value="png">download PNG (4K)</option>
            <option value="file">download HTML</option>
            <option value="image">copy image (1080p)</option>
            <option value="html">copy HTML</option>
            <option value="link">copy link</option>
          </select>
        </div>
        <button className="btn btn-ghost" onClick={() => {
          // Randomise WITHIN what each field declares, and seed it from the value on screen so a
          // colour keeps its lightness: rolling that uniformly makes a bright ground and a dark bloom,
          // and every result looks broken. `skipped` is shown rather than swallowed, because a field
          // with no declared range is a gap in the schema and the person turning dials should see it.
          const skipped: string[] = [];
          setPreset(null);
          apply(engine.randomOptions(gen.schema, Math.random, {}, skipped, opts));
          setNoDial(skipped);
        }}>randomise</button>

        {noDial.length > 0 && (
          <span className="pgmeta pgskip" title="these fields declare no range, so randomise leaves them alone">
            left alone: {noDial.join(", ")}
          </span>
        )}
        <span className="pgmeta">
          {Object.keys(patch).length ? `${countLeaves(patch)} changed from the defaults` : "at the defaults"}
        </span>
      </div>

      <details className="pgjson">
        <summary>the options, as a scene would carry them</summary>
        <pre>{patchJson === "{}" ? "// nothing changed yet" : patchJson}</pre>
      </details>
    </div>
  );
}

function Row({ c, value, onChange }:
  { c: Control; value: unknown; onChange: (p: string, v: unknown) => void }) {
  const { spec, path, key } = c;
  const id = `pg-${path.replace(/\./g, "-")}`;

  if (spec.kind === "enum") {
    return (
      <label className="pgrow" htmlFor={id}>
        <span>{key}</span>
        <select id={id} value={String(value ?? "")} onChange={(e) => onChange(path, e.target.value)}>
          {((spec.of as string[]) ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    );
  }

  if (spec.kind === "hex") {
    return (
      <label className="pgrow" htmlFor={id}>
        <span>{key}</span>
        <span className="pghex">
          <input id={id} type="color" value={String(value ?? "#000000")}
            onChange={(e) => onChange(path, e.target.value)} />
          <code>{String(value ?? "")}</code>
        </span>
      </label>
    );
  }

  if (spec.kind === "hexlist") {
    const list = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="pgrow pgrow-stack">
        <span>{key}</span>
        <span className="pghex">
          {list.map((h, i) => (
            <input key={i} type="color" value={h}
              onChange={(e) => onChange(path, list.map((x, j) => (j === i ? e.target.value : x)))} />
          ))}
          {list.length < (spec.max ?? 4) && (
            <button className="pgadd" onClick={() => onChange(path, [...list, "#4c8dff"])}>+</button>
          )}
          {list.length > 0 && (
            <button className="pgadd" onClick={() => onChange(path, list.slice(0, -1))}>−</button>
          )}
        </span>
      </div>
    );
  }

  if (spec.kind === "str") {
    return (
      <label className="pgrow" htmlFor={id}>
        <span>{key}</span>
        <input id={id} type="text" className="pgtext" maxLength={spec.max as number | undefined}
          value={String(value ?? "")} onChange={(e) => onChange(path, e.target.value)} />
      </label>
    );
  }

  if (spec.kind === "bool") {
    return (
      <label className="pgrow" htmlFor={id}>
        <span>{key}</span>
        <input id={id} type="checkbox" checked={!!value}
          onChange={(e) => onChange(path, e.target.checked)} />
      </label>
    );
  }

  // `color` is NOT `hex`. A block's real defaults are `var(--accent)` and `color-mix(...)`, because a
  // block reskins per theme, so the field has to accept an expression as well as a literal. A colour
  // well alone would force every one of them to a hex and quietly break the theming that is the point.
  if (spec.kind === "color") {
    const v = String(value ?? "");
    const literal = /^#[0-9a-f]{6}$/i.test(v);
    return (
      <label className="pgrow" htmlFor={id}>
        <span>{key}</span>
        <span className="pghex">
          {literal && <input type="color" value={v} onChange={(e) => onChange(path, e.target.value)} />}
          <input id={id} type="text" className="pgtext pgtext-sm" value={v}
            onChange={(e) => onChange(path, e.target.value)} />
        </span>
      </label>
    );
  }

  // list · row · oneOf · block are CONTENT, not a dial: a chart's rows, a pane descriptor, a slot that
  // takes two shapes. Rendering them as a number field is what this branch used to do, and a string
  // field showing `0` is worse than no control, because it lies about what the generator holds. Say so
  // instead, and let the JSON below stay the way to edit them.
  if (spec.kind === "list" || spec.kind === "row" || spec.kind === "oneOf" || spec.kind === "block") {
    const n = Array.isArray(value) ? value.length : null;
    return (
      <div className="pgrow">
        <span>{key}</span>
        <span className="pgtodo">
          {n === null ? spec.kind : `${n} item${n === 1 ? "" : "s"}`} · edit as JSON
        </span>
      </div>
    );
  }

  // int · unit · num. A `unit` is a 0..1 dial, so its bounds are implicit and its step is fine;
  // an `int` steps by 1. A number with no declared bounds gets a plain field rather than a slider
  // with invented ends, because a made-up range is a lie about what the generator accepts.
  const isUnit = spec.kind === "unit";
  const min = isUnit ? 0 : spec.min;
  const max = isUnit ? 1 : spec.max;
  const step = spec.kind === "int" ? 1 : isUnit ? 0.01 : 0.05;
  const bounded = typeof min === "number" && typeof max === "number";
  // A seed is a bounded int and a slider over four billion values is not a control anyone can use.
  const huge = bounded && (max as number) - (min as number) > 100000;

  return (
    <label className="pgrow" htmlFor={id}>
      <span>{key}</span>
      <span className="pgnum">
        {bounded && !huge && (
          <input type="range" min={min} max={max} step={step} value={Number(value ?? 0)}
            onChange={(e) => onChange(path, Number(e.target.value))} aria-hidden tabIndex={-1} />
        )}
        {/* step="any" on the FIELD, the real step on the slider beside it. A declared step makes the
            browser mark every off-grid value :invalid, and a preset lands off the grid constantly:
            lightWidth 0.62 against step .05 announced itself as invalid to a screen reader. */}
        <input id={id} type="number" min={min} max={max} step={spec.kind === "int" ? 1 : "any"}
          value={Number(value ?? 0)} onChange={(e) => onChange(path, Number(e.target.value))} />
        {huge && (
          <button className="pgadd" title="a new random seed"
            onClick={() => onChange(path, Math.floor(Math.random() * (max as number)))}>↻</button>
        )}
      </span>
    </label>
  );
}

/** Put a block or generator FRAGMENT on the page without letting its CSS out.
 *
 *  THE BUG THIS EXISTS FOR, because innerHTML looked obviously right. A block's html carries its own
 *  `<style>`, written for the engine's scene document where it is the only thing in the frame, so its
 *  selectors are short and global: `.l { position: absolute; … }`. Injected straight into the site
 *  page, one of 103 posters styled EVERY `.l` in the document and painted a 1253 x 79002 rectangle
 *  over the whole playground, heading included. Nothing errored. The page simply went dark.
 *
 *  A shadow root is the fix and it is the cheap one: styles stay in, custom properties still inherit
 *  through the boundary, so the `--p` / `--i` channels the layer declares keep working. The
 *  alternative was an iframe per poster, which is what /blocks refuses to do and would be
 *  indefensible a hundred times over.
 *
 *  `w` is the fragment's own authored width. It is laid out at that width and SCALED to the box, so a
 *  900px block reads the same shape here as in a render rather than being cropped by a narrow column.
 *
 *  `aspect` is the POSTER's shape, and the inner box takes it rather than assuming 16:9. It used to
 *  assume: `ih = iw * 9 / 16` gave morphText a 900x506 box to sit in when the block's own measured
 *  bounds are 944x194, so the word was laid out in the middle of a box two and a half times its own
 *  height and then scaled as a whole. That empty space is what made a fragment look lost in its
 *  poster. Both boxes are the same shape now, so the fit is a fit rather than a letterbox. */
function mountFragment(host: HTMLElement, html: string, w: number, aspect = 16 / 9) {
  const root = (host as HTMLElement & { _shadow?: ShadowRoot })._shadow
    || ((host as HTMLElement & { _shadow?: ShadowRoot })._shadow = host.attachShadow({ mode: "open" }));
  const box = host.getBoundingClientRect();
  // A FRAGMENT NEEDS A FRAME, and without one a full-bleed generator collapses. A look that emits
  // html is written for the whole canvas and sizes itself in percentages, so dropping it into an
  // auto-height box gives its children 100% of nothing and the poster paints its own background and
  // nothing else. A block carries its authored width instead, and gets that. Either way the inner box
  // is a REAL rectangle at the size the fragment expects, and the scale takes it down to the poster.
  const iw = w > 0 ? w : CW;
  const ih = Math.round(iw / aspect);
  // FIT BOTH AXES. Scaling by width alone was safe only while the box was always 16:9 and the inner
  // box was built to match; now that a poster takes its item's own shape, a fragment taller than its
  // box would be cropped by .fit's overflow rather than shrunk to fit.
  const scale = box.width > 0 && box.height > 0
    ? Math.min(box.width / iw, box.height / ih) : 1;
  root.innerHTML = `<style>
    :host { display: block; }
    /* Absolute centring, not grid centring. The inner box is 1920 wide inside a poster around 1100
       wide, and a grid item larger than its cell is clamped to the start edge rather than allowed to
       overflow both ways, so every full-frame fragment sat in the bottom-right corner. */
    .fit { position: relative; width: 100%; height: 100%; overflow: hidden; }
    /* The position below is load-bearing: a fragment lays itself out with absolutely positioned
       children, and with no containing block here they resolve against the viewport and land in a
       corner of the poster instead of filling it. */
    .in { position: absolute; left: 50%; top: 50%; width: ${iw}px; height: ${ih}px;
          transform: translate(-50%, -50%) scale(${scale}); transform-origin: center; }
  </style><div class="fit"><div class="in">${html}</div></div>`;
}

/** Empty a poster back to nothing: the shadow root's contents, any canvas, and the channels the loop
 *  wrote on the host.
 *
 *  THE MEASUREMENT THIS EXISTS FOR. Scrolling the library top → bottom → top took the document from
 *  889 nodes to 1338 to 2172, and it never came back down: the IntersectionObserver stopped the rAF
 *  loop when a poster left, but nothing removed what the poster had built, so a shadow root and its
 *  ~250 nodes stayed for the life of the page. Thirteen of them survived one pass. The observer
 *  already knew the poster was gone; only the other half of the sentence was missing.
 *
 *  The shadow ROOT itself stays: attachShadow is one-way, and the host is reused when the poster
 *  comes back. Emptying it is what returns the nodes. */
function clearPoster(host: HTMLElement) {
  const root = (host as HTMLElement & { _shadow?: ShadowRoot })._shadow;
  if (root) root.replaceChildren();
  host.replaceChildren();
  // The loop wrote --t and the layer's own channels straight onto the host. Nothing reads them once
  // the fragment is gone, but leaving them means a re-mount inherits the frame it stopped on.
  host.removeAttribute("style");
}

/** A layer may declare ONE duration for every channel, or one PER CHANNEL.
 *
 *  scanGate does the second: `varsDur: {'--scan': 2.25, '--lock': 0.45}` with delays to match, and
 *  `Number({...})` is NaN, so `Number(l.varsDur ?? 1.4) || 1.4` collapsed both channels onto one
 *  1.4s clock. The band and the brackets ran together instead of the brackets landing after the band
 *  had crossed. Read the shape the layer actually wrote. */
const chan = (v: unknown, key: string, dflt: number): number => {
  const raw = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>)[key] : v;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : dflt;
};

/** How a poster is going to draw, decided once from what the item actually returns.
 *
 *  THE MEASUREMENT THAT DECIDED THIS. Screenshotting every poster twice, 700ms apart: THREE of the
 *  twenty-three changed. colonnade, bands and scanGate. The other twenty were pictures of a motion
 *  engine sitting still, and ten of those were not pictures at all, they were empty black boxes.
 *
 *  Both failures are the same failure, and it is this file's own hand-rolled preview. It mounts a
 *  fragment and writes the CSS custom properties the layer declares in `vars`, so it can only animate
 *  a block that happens to animate through `vars`. Almost none do: a block moves on the ENGINE's
 *  timeline, through `anim`, `enterDur`, `parts` and keyframes, which live in the renderer and not in
 *  a custom property. And a block built from `group`, `text` and `rect` layers carries no fragment to
 *  mount at all, which is where the ten black boxes came from: glassCard, meshPanel, spotlightCard,
 *  borderBeamCard, screenSwap, glassDock, colorCycle, splitFlapBoard, grainOverlay, rangeSelector.
 *
 *  So a block family stops being previewed by this file and is handed to the ENGINE, through the
 *  component /arsenal already uses for exactly this: `BlockLive`, over the still that
 *  `make blocks-scenes` renders for it. Both artefacts already exist for 13 of the 15 families here,
 *  both are generated from the code on every build, and BlockLive already carries the framing maths
 *  that makes the still and the live render land in the same box, so nothing jumps when the engine
 *  arrives. This page had a worse copy of a solved problem.
 *
 *  A GENERATOR IS NOT A BLOCK and keeps the local paths, deliberately. `bands` and `colonnade` are
 *  two of the three things that already moved: a shader drawn by the engine's own ambient layer, and
 *  a self-contained fragment on a `--t` clock. Both are correct, both cost a rAF rather than an
 *  iframe, and neither has a block scene to point BlockLive at.
 *
 *  THE RULE IS ONE LINE: if an item emits scene LAYERS, the engine renders it. Layers are the
 *  engine's own input format, so anything else this file did with them was a re-implementation. The
 *  two exceptions below are not softenings of that rule, they are cases where the item is not layers.
 *
 *    scene   anything that emits layers. The engine renders it, over a still where the build made
 *            one. That is 15 of the 23, and 11 of them showed nothing at all before.
 *    html    a generator emitting an html STRING, which is not a scene layer and has no timeline: a
 *            self-contained backdrop fragment on a --t clock, in a shadow root. This is what
 *            colonnade is, and colonnade was one of the three things that already moved.
 *    shader  a shader LAYER. It is layers, so the rule says engine, and this is the one place a
 *            cheaper path is genuinely equivalent: core/shaders-ambient.js is the same code the
 *            renderer runs for that layer, it takes `t` as an argument, and it costs one canvas
 *            instead of a whole engine. bands was the other thing that already moved.
 *    none    the item refused to render at all, and the poster says so instead of going black. */
type Mode = "scene" | "html" | "shader" | "none";

type Frame = { x: number; y: number; w: number; h: number };
const FRAME_OF = FRAMES as Record<string, Frame>;
// The whole canvas, for an item the build measured no crop rect around. blocks-scenes.mjs skips
// `overlay` families on purpose, because a rect around something that IS the frame means nothing, so
// the honest window for one of those is the frame itself. Generators compose on the full canvas too.
const FULL: Frame = { x: 0, y: 0, w: 1920, h: 1080 };
// The same names blocks-scenes.mjs writes, and the same sanitiser /arsenal's detail page uses.
const asset = (name: string, ext: string) => `/assets/blocks/${name.replace(/[^a-z0-9.]/gi, "_")}.${ext}`;

function modeOf(made: string | Layer[] | null): Mode {
  if (typeof made === "string") return "html";
  if (!Array.isArray(made) || !made.length) return "none";
  return (made[0] as Record<string, unknown>).type === "shader" ? "shader" : "scene";
}

/** The poster's own shape: the aspect of the rect the build measured around the item, exactly.
 *
 *  NOT CLAMPED, AND THE CLAMP IS WHY. A first version held this between 16:9 and 3.2:1, reasoning
 *  that a very wide block becomes a letterbox slot too shallow to read. What it actually produced was
 *  the bug it was written to fix. BlockLive maps the measured rect onto the box by WIDTH, so a box
 *  that is not the rect's shape does not letterbox the picture, it leaves the difference empty at the
 *  bottom: morphText is 944x194, the clamp gave it a 3.2:1 box, and the word sat in the top two
 *  thirds of it with 85px of nothing underneath. Any clamp in either direction does this, because the
 *  box and the content can only agree at one number and that number is the item's own.
 *
 *  So the poster is the shape of the thing in it, which is the rule /arsenal already states for the
 *  same artefacts: "a block poster is cropped to the block's own bounds, so its aspect is whatever
 *  the block is". 16:9 is the fallback rather than a floor, and it applies only where nothing
 *  measured the item: a generator composes on the whole canvas, so the whole canvas is its shape. */
function aspectOf(gen: Generator, made: string | Layer[] | null): number {
  const f = FRAME_OF[gen.name];
  if (f && f.w > 0 && f.h > 0) return f.w / f.h;
  const l = Array.isArray(made) ? (made[0] as Record<string, number>) : null;
  if (l && Number(l.w) > 0 && Number(l.h) > 0) return Number(l.w) / Number(l.h);
  return 16 / 9;
}

/** Does this reader want motion? Read once, and read as STATE rather than at effect time, because a
 *  scene poster decides whether to boot an engine at all on the answer and that is a render decision.
 *  Live, so a reader who changes the OS setting is answered without a reload. */
function useStill() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setStill(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return still;
}

/** One poster in the library scroll: the real generator, at full width, MOVING while it is on screen.
 *
 *  It is the REAL generator, not a screenshot. A poster would be a second artefact to keep in step with
 *  the code, and site/public froze 77 files behind core/ the last time this repo had one of those
 *  (engine-doctrine/MISTAKES.md #271).
 *
 *  IT MOVES NOW, AND THAT REVERSES A DELIBERATE DECISION, so here is the old one and why it does not
 *  hold any more. ScenePreview set `playing: false` and said: "A field is judged against a still
 *  reference; a picture that changes while you look at it cannot be compared to one that does not."
 *  That argument is about a GRID, where a dozen fields sit side by side and the eye is comparing them.
 *  This is a scroll: one or two posters are on screen at a time and nothing is being compared, so the
 *  cost is gone and what is left is that a motion engine was advertising itself with stills.
 *
 *  STILL AND LIVE, BOTH, and the still is the one that is always there. Every poster is an <img> of
 *  the frame the build rendered: it costs one request, it is correct on the first paint, it is what a
 *  reader who does not want motion keeps, and it is a picture somebody can take away. The engine
 *  mounts OVER it while the poster is on screen and fades in when it reports ready, so the boot is
 *  never a black rectangle and the swap never moves the picture. That is not a new arrangement: it is
 *  what /arsenal's block page does, in the same component, and this is the scrolling version of it.
 *
 *  "NO IFRAME" USED TO BE WRITTEN HERE, and it was wrong in a way worth recording, because it sounds
 *  like restraint. Refusing the engine did not avoid a renderer, it forced a WORSE one: a hand-rolled
 *  preview that could animate a block only if the block happened to animate through CSS custom
 *  properties. Twenty of twenty-three posters were stills and ten were empty, on a page whose whole
 *  claim is that the engine moves. The cost the refusal was protecting against is real but it is a
 *  cost of COUNT, not of kind, and the count here is bounded by the viewport rather than by the
 *  library: the observer mounts the engine for what is on screen and unmounts it behind you.
 *
 *  ONLY WHILE VISIBLE, and only if the reader wants motion. `prefers-reduced-motion: reduce` never
 *  boots an engine and never starts a loop at all: the still is left in place, which is a held frame
 *  of the finished picture rather than of whichever instant the clock stopped on. */
function Poster({ gen, engine, onPick }:
  { gen: Generator; engine: Engine; onPick: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [live, setLive] = useState(false);
  const stillOnly = useStill();
  // A still that 404s is a state, not a crash, and /arsenal answers the same case the same way
  // rather than showing a broken glyph.
  const [noStill, setNoStill] = useState(false);
  const made = useMemo(() => {
    try {
      const preset = Object.values(gen.presets || {})[0] || {};
      return gen.render(deepMerge(engine.defaultsOf(gen.schema), preset));
    } catch { return null; }
  }, [gen, engine]);
  const mode = useMemo(() => modeOf(made), [made]);
  const aspect = useMemo(() => aspectOf(gen, made), [gen, made]);
  // The build's own crop rect where it measured one, the whole canvas where it did not.
  const frame = FRAME_OF[gen.name] ?? FULL;
  // A STILL EXISTS ONLY WHERE THE BUILD RENDERED ONE, so it is asked for and allowed to fail rather
  // than assumed: `noStill` is what the <img> reports back.
  const poster = FRAME_OF[gen.name] ? asset(gen.name, "png") : null;

  // rootMargin, so a poster is drawing before it reaches the viewport and never arrives blank.
  // 200px, DOWN FROM 300px, because a scene poster now boots an ENGINE rather than starting a rAF
  // loop, and this margin is the only thing deciding how many of those exist at once. Measured at
  // 1280x900 with the whole page walked: 4 engines settled in the band, 5 at the peak of a fast
  // scroll, and every one of them gone again by the time the scroll stops somewhere else.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const io = new IntersectionObserver((es) => setNear(es.some((e) => e.isIntersecting)),
      { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The engine is a React child, so leaving view UNMOUNTS it: the iframe, its document and its heap
  // go with it. Nothing here has to remember to tear that down.
  const wantsEngine = mode === "scene" && near && !stillOnly;
  useEffect(() => { if (!wantsEngine) setLive(false); }, [wantsEngine]);
  const onReady = useCallback(() => setLive(true), []);

  // THE SCENE THE BUILD ALREADY RENDERED, where there is one: it is the scene the still was made
  // from, so the still and the live render are the same picture and the swap is invisible. Where
  // there is none, wrap the layers in the smallest scene that will render them, and do it ONLY while
  // the poster is on screen: a blob per poster held for the life of the page is the leak this pass
  // exists to remove, not one to add.
  const [blob, setBlob] = useState<string | null>(null);
  useEffect(() => {
    if (!wantsEngine || poster || !Array.isArray(made)) { setBlob(null); return; }
    const url = sceneBlob(made, gen.overlay ? "black" : "plain");
    setBlob(url);
    return () => { setBlob(null); URL.revokeObjectURL(url); };
  }, [wantsEngine, poster, made, gen.overlay]);
  const src = poster ? asset(gen.name, "json") : blob;

  useEffect(() => {
    const el = box.current;
    // The engine and the still own their own box; nothing imperative may touch it. Mounting a shadow
    // root here would only be a second empty one to tear down.
    if (!el || mode === "scene" || mode === "none") return;
    // GONE MEANS EMPTIED. Returning here without clearing is what made the node count a ratchet.
    if (!near) { clearPoster(el); return; }
    const frozen = stillOnly;
    let raf = 0;
    const t0 = performance.now();

    if (typeof made === "string") {
      mountFragment(el, made, 0, aspect);
      const tick = (now: number) => {
        el.style.setProperty("--t", String(((now - t0) / 1000) % 4));
        raf = requestAnimationFrame(tick);
      };
      if (frozen) el.style.setProperty("--t", "0"); else raf = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(raf); clearPoster(el); };
    }

    const layer = Array.isArray(made) ? (made[0] as Record<string, unknown>) : null;
    if (!layer) return;

    // An HTML layer: write the channels the layer itself declares, on a loop the length it asks for.
    if (layer.type === "html" && typeof layer.html === "string") {
      mountFragment(el, layer.html as string, Number(layer.w) || 0, aspect);
      const vars = (layer.vars || {}) as Record<string, [number, number] | number[]>;
      // Written on the HOST, not inside the shadow root: a custom property inherits through a shadow
      // boundary, so this is the one channel that still reaches the fragment.
      // EACH CHANNEL ON ITS OWN CLOCK, because a layer is allowed to give each one its own.
      const keys = Object.keys(vars);
      const span = (k: string) => chan(layer.varsDelay, k, 0) + chan(layer.varsDur, k, 1.4);
      const write = (now: number) => {
        for (const k of keys) {
          const range = vars[k];
          const [a, b] = Array.isArray(range) ? [Number(range[0]), Number(range[1])] : [0, 1];
          const d = chan(layer.varsDelay, k, 0), dur = chan(layer.varsDur, k, 1.4);
          const p = Math.max(0, Math.min(1, (now - d) / dur));
          el.style.setProperty(k, String(a + (b - a) * p));
        }
      };
      // A beat of rest after the LAST channel finishes, so a cycle reads as a cycle.
      const loop = keys.reduce((m, k) => Math.max(m, span(k)), 0) + 1.2;
      const tick = (t: number) => {
        write(((t - t0) / 1000) % loop);
        raf = requestAnimationFrame(tick);
      };
      // Held on the frame every channel has finished, which is the composed picture rather than
      // whichever channel happened to be longest.
      if (frozen) write(loop); else raf = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(raf); clearPoster(el); };
    }

    if (layer.type !== "shader") return;
    let live = true;
    let inst: { canvas: HTMLCanvasElement; draw: (...a: unknown[]) => void; dispose?: () => void } | null = null;
    Promise.all([
      import(/* webpackIgnore: true */ AMBIENT_URL),
      import(/* webpackIgnore: true */ PALETTE_URL),
    ]).then(([m, p]) => {
      if (!live) return;
      inst = m.createAmbientLayer(960, 540);
      // `draw` wants GL float triples, not hex, and the CONVERSION IS THE ENGINE'S. A hand-rolled
      // parseInt here would be a second implementation of core/surfaces/palette.js, and would already
      // be behind it: a stop may carry its own position along the ramp as `#rrggbb@0.42`.
      const pal = (layer.colors as string[] | undefined)?.length
        ? (p as { palette: (l: unknown) => unknown }).palette({ colors: layer.colors })
        : null;
      // ALL SIX PARAMETER VECTORS. An earlier version passed two, so every card of `bands` and
      // `spectrum` was drawn with the other four defaulted to zero: no gradient, no converge, no light
      // shape, no zoom. Not a small approximation of the generator, a different picture.
      const paint = (t: number) => inst!.draw(layer.shader, t, layer.seed ?? 0, pal,
        layer.intensity ?? 1, layer.params, layer.params2, layer.params3, layer.params4,
        layer.params5, layer.params6);
      // aria-hidden, because the canvas sits INSIDE a button that already carries the generator's name
      // and its description. Without it a screen reader announces the label, then an unlabelled
      // graphic: the same thing said twice with the second half empty.
      inst!.canvas.setAttribute("aria-hidden", "true");
      el.replaceChildren(inst!.canvas);
      inst!.canvas.style.width = "100%";
      inst!.canvas.style.height = "100%";
      inst!.canvas.style.display = "block";
      paint(0);
      if (!frozen) {
        const tick = (now: number) => { paint((now - t0) / 1000); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
      }
    }).catch((e) => {
      // Never silent. A blank poster that swallowed its reason is indistinguishable from one that has
      // nothing to draw, and this repo has paid for that confusion more than once.
      console.error(`playground: ${gen.name} poster could not draw`, e);
    });
    // dispose() frees the GL context; replaceChildren takes the canvas element out of the document.
    // Doing only the first left a dead canvas in the tree for the rest of the session.
    return () => { live = false; cancelAnimationFrame(raf); inst?.dispose?.(); clearPoster(el); };
  }, [made, near, mode, stillOnly, gen.name]);

  // WHAT KIND OF THING THIS IS, said on the poster rather than discovered by clicking it. An engine
  // generator opens on a fragment and its own dials; a block family opens on a scene the engine
  // renders. They are different objects and they behaved differently on arrival with nothing
  // announcing it.
  const kind = gen.origin === "block" ? (gen.group || "block") : "generator";

  // What the poster is doing RIGHT NOW, in one word, because the owner asked for both states and a
  // reader cannot tell a paused engine from a picture of one. "live" is claimed only once the engine
  // has reported ready: saying it while the iframe is still booting is the claim being false for the
  // second that matters.
  // A FRAGMENT MOVES ONLY IF IT READS THE CLOCK, and whether it does is in the markup rather than in
  // an assumption. Measured: of the four generators emitting an html string, only colonnade contains
  // `var(--t)`. crt, thermalBlur and keyframeHandle carry no clock of any kind, so no loop this page
  // runs can move them, and calling them "live" was the label being false on three posters.
  const readsClock = typeof made === "string" && /var\(\s*--t\b/.test(made);
  const state = mode === "none" ? "no preview"
    : stillOnly ? "still"
    : mode === "scene" ? (live ? "live" : "still")
    : mode === "shader" || readsClock ? "live"
    : "still";

  return (
    <button className="pgposter" onClick={onPick} type="button"
      style={{ "--pg-aspect": String(aspect) } as React.CSSProperties}>
      <span className="pgposter-shot" data-mode={mode} aria-hidden>
        {/* THE STILL FIRST, AND IT STAYS. It is the first paint, it is the whole answer under
            reduced motion, and it is the bed the engine fades in over, so a boot is never a black
            rectangle and the swap never moves the picture. */}
        {poster && !noStill && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" loading="lazy" decoding="async" onError={() => setNoStill(true)} />
        )}
        {/* Nothing rendered a still for this one, so the stripe is the bed instead of a black hole,
            and the engine covers it when it arrives. The line states a FACT rather than promising a
            picture: it read "live only" for a while, which was a promise grainOverlay cannot keep. It
            is a 12% noise rect in `overlay` blend, a texture modifier with no picture of its own, and
            that is exactly why the build rendered no still for it either. */}
        {(mode === "none" || !poster || noStill) && (
          <span className="pgposter-none">
            <span className="pgposter-none-tag">{kind}</span>
            <span className="pgposter-none-why">
              {mode === "none" ? "nothing to render"
                : gen.overlay ? "a full-frame overlay, so no still" : "no still was rendered"}
            </span>
          </span>
        )}
        {wantsEngine && src && (
          <BlockLive name={gen.name} src={src} frame={frame} playing onReady={onReady} />
        )}
        {/* The generator paths draw straight into this box. It is empty for a scene poster and costs
            nothing there. */}
        <span ref={box} className="pgposter-live" />
      </span>
      <span className="pgposter-meta">
        <span className="pgposter-tags">
          {/* Inert data about the entry, so both of these are ink and not cobalt: the site keeps the
              accent for things you can act on. */}
          <span className="pgposter-kind" data-origin={gen.origin ?? "engine"}>{kind}</span>
          <span className="pgposter-state" data-state={state}>{state}</span>
        </span>
        <span className="pgposter-name">{gen.name}</span>
        <span className="pgposter-blurb">{gen.blurb}</span>
        {/* NOT HOVER-ONLY. It was the single thing saying the poster is a control, and a touch screen
            has no hover, so on a phone nothing said so at all. better-ui puts it plainly: every
            animated state change needs a static cue as well. */}
        <span className="pgposter-go" aria-hidden>turn its dials →</span>
      </span>
    </button>
  );
}

/** The engine iframe, the same hook /blocks and /editor use, so the site runs one engine.
 *
 *  It wears `.sp-stage`, not a class of its own. The hook names the iframe `sp-frame`, and that pair
 *  exists because the iframe renders at FULL frame size and is scaled down: sizing it to the box
 *  instead crops the scene to its top-left corner, which is exactly what the first version here did.
 *  useStageFit does that scaling, and /editor does it with the same call.
 *
 *  STILL, DELIBERATELY, and unlike the library posters. The posters move because a scroll shows one
 *  at a time and nothing is being compared. This is the detail view, where the motion a person came
 *  for is the DIALS: a scene looping underneath while you drag a slider makes it impossible to tell
 *  which change was yours. One frame is drawn explicitly, because with no loop nobody else would draw
 *  it, and it is the MIDDLE one: the engine gives every layer an entrance envelope, so frame 0 is the
 *  instant before the picture arrives and the stage came up white. Halfway is past every entrance and
 *  before any exit. */
function ScenePreview({ url, title }: { url: string; title: string }) {
  const { hostRef, meta, renderFrame } = useSceneEngine({ dataUrl: url, aspect: "16:9", title, playing: false });
  useEffect(() => { if (meta) renderFrame(Math.floor(meta.totalFrames / 2)); }, [meta, renderFrame]);
  useStageFit(hostRef, meta);
  return <div className="sp-stage pgscene" ref={hostRef} aria-label={title} />;
}

function groupControls(cs: Control[]): [string | null, Control[]][] {
  const out: [string | null, Control[]][] = [];
  for (const c of cs) {
    const last = out[out.length - 1];
    if (last && last[0] === c.group) last[1].push(c);
    else out.push([c.group, [c]]);
  }
  return out;
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  a.click();
  // Revoking immediately cancels the download in some browsers; a tick is enough and leaks nothing.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const countLeaves = (o: unknown): number =>
  o && typeof o === "object" && !Array.isArray(o)
    ? Object.values(o).reduce<number>((n, v) => n + countLeaves(v), 0)
    : 1;

function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v)
      ? deepMerge((base[k] ?? {}) as Record<string, unknown>, v as Record<string, unknown>)
      : v;
  }
  return out;
}
