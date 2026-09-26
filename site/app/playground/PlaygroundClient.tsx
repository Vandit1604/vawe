"use client";

/**
 * The generator playground: a rail of names on the left, the picked one's preview and dials on the
 * right. ONE GENERATOR BOOTS AT A TIME. The page used to scroll every generator and block family past
 * as a wall of live posters, each one mounting its own engine or rAF loop while it was near the
 * viewport, which is more than a name-and-a-picture list needs to cost: nothing here has to be
 * running for someone to find the thing they want to turn. The rail costs nothing to render, and only
 * the selected generator, in the right-hand pane, ever boots.
 *
 * NOTHING HERE KNOWS WHAT A LIGHTFIELD IS. It reads `GENERATORS` out of the vendored engine
 * (core/generators/generators.js) and builds the panel from each generator's declarative schema, so adding a
 * generator to the registry is the whole job of putting it on this page. A hand-kept list of dials
 * over here would be a second source of truth that goes stale in silence, which is exactly how
 * site/public froze 77 files behind core/ (engine-doctrine/MISTAKES.md #271).
 *
 * The engine is loaded at RUNTIME with a dynamic import of "/core/generators/generators.js", not bundled. Two
 * reasons, and the second is the real one: the site vendors core/ into public/ as static files, so
 * bundling would fork the engine into a webpack copy that drifts from the one /editor boots. This
 * way the page runs the same file the renderer does.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSceneEngine } from "../components/useSceneEngine";
import { useStageFit } from "../components/useStageFit";

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
// THE PATH MOVED AND THIS STRING DID NOT. It read "/core/generators.js" until 2026-09-19, and the
// file became core/generators/generators.js on 2026-09-16 in the formats/ to films/ rename
// (a8617ac0). So /playground served a dead engine for three days behind an HTTP 200, and every
// visitor got "The engine did not load" while the page itself looked fine.
//
// Nothing could have caught it. It is a runtime URL in a string, not an import, so the bundler never
// resolves it, docker-context-check's cross-app import scan cannot see it (it reads static import
// specifiers, and says so), and doc-refs only reads docs. The one thing that would have: asking the
// built site for the URL. site-engine.mjs now does exactly that, because a vendored path nobody
// fetches is a path nobody has checked.
const ENGINE_URL = "/core/generators/generators.js";
// /blocklib and NOT /blocks: site/next.config.mjs 308s `/blocks/:name` to `/arsenal/:name`,
// because the old /blocks page moved there. A redirect cannot tell a page path from a static
// file, so a module vendored to /blocks/index.mjs answers 404 at /arsenal/index.mjs.
const BLOCKS_URL = "/blocklib/index.mjs";
// resolveTheme/applyTheme, THE ENGINE'S OWN theme→CSS-vars step (core/engine/boot.js, the scene
// iframe runs it too). A `color`-kind field can default to `var(--text)` or a `color-mix(...)`
// expression rather than a hex, because that is how a block stays theme-following (blocks/schema.mjs
// says so). Reused here rather than re-typed so this page's colour swatches can never drift from what
// the theme actually says `--text` is: only boot.js's applyTheme decides that mapping.
const BOOT_URL = "/core/engine/boot.js";

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
  "borderBeamCard", "glassDock",
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

  // Follow the ROUTE, every time it changes, not just on first arrival. The rail below navigates with
  // real `<Link>`s now rather than in-page state, so `initial` changes on every pick and this has to
  // track it each time, not adopt it once. An unknown name falls through to the index rather than
  // 404ing: the registry is the only thing that knows what exists, and it lives here.
  useEffect(() => {
    if (!engine) { setWhich(null); return; }
    if (!initial) { setWhich(null); return; }
    const i = engine.GENERATORS.findIndex((g) => g.name === initial);
    setWhich(i >= 0 ? i : null);
  }, [engine, initial]);

  const gen = which == null ? null : (engine?.GENERATORS[which] ?? null);

  // Seed the engine's OWN resolved theme colours onto a hidden scope element, once, so a `color`-kind
  // field defaulting to `var(--text)` or a `color-mix(...)` (blocks/schema.mjs) can show its REAL
  // current colour rather than the bare expression. `applyTheme` is the one place a theme's palette
  // becomes CSS custom properties (core/engine/boot.js), and every preview here already renders the
  // "vawe" theme, so reusing it rather than re-typing the palette→var mapping is the only way this
  // cannot drift when a theme adds a token. Failing quietly here still leaves the field editable, just
  // without the swatch, so it is logged rather than surfaced.
  useEffect(() => {
    let alive = true;
    import(/* webpackIgnore: true */ BOOT_URL)
      .then(async (m) => {
        const theme = await m.resolveTheme("vawe");
        if (alive) m.applyTheme(theme, themeScope());
      })
      .catch((e) => console.error("playground: could not resolve theme tokens for colour fields", e));
    return () => { alive = false; };
  }, []);

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
        The engine did not load: {bootErr}. It is served from <code>/core/generators/generators.js</code>; if you
        are running the site locally, <code>npm run predev</code> publishes it.
      </p>
    );
  }
  if (!engine) return <p className="pgnote">Loading the engine…</p>;

  // THE RAIL: every name, ALWAYS on screen, a real `<Link>` per entry. This is the whole fix for
  // "the generators are not all trying to boot on a single page": the old index scrolled all 29
  // posters into view and mounted an engine for every one near the viewport (bounded, but never
  // zero). A name costs nothing to render, so the rail can list every one of them and still boot
  // NOTHING until a person picks one, which the right-hand pane below alone ever does.
  const rail = (
    <div className="rail-col">
      <p className="pg-rail-kicker">generators</p>
      <nav className="rail pg-rail" aria-label="generators">
        {engine.GENERATORS.map((g) => (
          <Link key={g.name} href={`/playground/${g.name}`} scroll={false}
            aria-current={gen?.name === g.name ? "page" : undefined}>
            <span>{g.name}</span>
            <em>{g.origin === "block" ? (g.group || "block") : "generator"}</em>
          </Link>
        ))}
      </nav>
      {engine.HELD_BACK > 0 && (
        <p className="lheld">
          {engine.HELD_BACK} more {engine.HELD_BACK === 1 ? "look is" : "looks are"} built and held
          back: each one is measured against a reference on every run and is not close enough yet.
        </p>
      )}
    </div>
  );

  if (which == null || !gen || !opts) {
    return (
      <div className="rail-layout pg-layout">
        {rail}
        <div className="pg-main">
          <div className="pg-empty">
            <p className="pg-empty-kicker">nothing booted</p>
            <p className="pglede">
              The engine’s generators and its block families, one at a time. Pick a name on the left
              to turn its dials; nothing on this page runs until you do.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="rail-layout pg-layout">
      {rail}
      <div className="pg-main">
        <div className="lback">
          <Link href="/playground">← playground</Link>
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
    </div>
  );
}

function Row({ c, value, onChange }:
  { c: Control; value: unknown; onChange: (p: string, v: unknown) => void }) {
  const { spec, path, key } = c;
  const id = `pg-${path.replace(/\./g, "-")}`;
  // Called unconditionally (rules of hooks), and a no-op for every kind but `color`: see the branch
  // below for what it resolves and why.
  const resolvedColor = useResolvedColour(spec.kind === "color" ? String(value ?? "") : null);

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
  //
  // BUT A RAW EXPRESSION IS NOT A CONTROL. Showing "var(--text)" in a text field and stopping there
  // used to be the whole of this branch, which is a string with no visual meaning and no colour well
  // at all unless someone had already turned it into a literal. `useResolvedColour` asks the browser
  // what the theme's `--text` (or `color-mix(...)`) actually paints right now, the same way the
  // engine itself resolves it, so the well ALWAYS shows a real swatch: the resolved colour while the
  // field is untouched, the literal once someone has picked one. Touching the well always writes a
  // literal hex, which is what a colour well can express and what this kind already accepts, so the
  // written value is never a lie about what a browser control produced; leaving it alone keeps the
  // field theme-following, unchanged, forever.
  if (spec.kind === "color") {
    const v = String(value ?? "");
    const literal = /^#[0-9a-f]{6}$/i.test(v);
    const swatch = literal ? v : (resolvedColor ?? "#808080");
    return (
      <label className="pgrow" htmlFor={id}>
        <span>{key}</span>
        <span className="pghex">
          <input type="color" value={swatch} onChange={(e) => onChange(path, e.target.value)}
            title={literal ? undefined : `follows the theme's ${v}; picking a colour here fixes it instead`} />
          <code>{v}</code>
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

/** The engine iframe, the same hook /blocks and /editor use, so the site runs one engine.
 *
 *  It wears `.sp-stage`, not a class of its own. The hook names the iframe `sp-frame`, and that pair
 *  exists because the iframe renders at FULL frame size and is scaled down: sizing it to the box
 *  instead crops the scene to its top-left corner, which is exactly what the first version here did.
 *  useStageFit does that scaling, and /editor does it with the same call.
 *
 *  STILL, DELIBERATELY. The motion a person came to this page for is the DIALS: a scene looping
 *  underneath while you drag a slider makes it impossible to tell which change was yours. One frame
 *  is drawn explicitly, because with no loop nobody else would draw it, and it is the MIDDLE one: the
 *  engine gives every layer an entrance envelope, so frame 0 is the instant before the picture arrives
 *  and the stage came up white. Halfway is past every entrance and before any exit. */
function ScenePreview({ url, title }: { url: string; title: string }) {
  const { hostRef, meta, renderFrame } = useSceneEngine({ dataUrl: url, aspect: "16:9", title, playing: false });
  useEffect(() => { if (meta) renderFrame(Math.floor(meta.totalFrames / 2)); }, [meta, renderFrame]);
  useStageFit(hostRef, meta);
  return <div className="sp-stage pgscene" ref={hostRef} aria-label={title} />;
}

// A shared, offscreen probe element. One per page rather than one per colour field: creating and
// discarding a DOM node on every keystroke of every dial is wasted work a single reused element avoids.
let colourProbe: HTMLDivElement | null = null;
let colourCanvas: HTMLCanvasElement | null = null;
let themeHost: HTMLDivElement | null = null;

/** The element the engine theme is applied to. The theme's palette shares names with the site's
 *  own tokens (--bg, --surface, --ink), so applying it to :root repainted the whole page. */
function themeScope(): HTMLDivElement {
  if (!themeHost) {
    themeHost = document.createElement("div");
    themeHost.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:0;height:0;pointer-events:none";
    document.body.appendChild(themeHost);
  }
  return themeHost;
}

/** What a CSS colour EXPRESSION actually paints, right now, resolved by the browser rather than
 *  guessed by a second copy of the theme's palette table. Setting `color` on a real element and
 *  reading it back with `getComputedStyle` resolves `var(--text)` and `color-mix(in srgb, ...)`
 *  exactly as the engine's own scene document would, because both are the SAME CSS engine looking at
 *  the SAME custom properties: the theme-seeding effect above writes them onto `themeScope()` with
 *  the engine's own `applyTheme`, and the probe lives inside that scope so it inherits them.
 *
 *  THE CANVAS STEP IS NOT DECORATION. `getComputedStyle` does not always answer in `rgb()`: a
 *  `color-mix()` with any transparency comes back as `color(srgb 0.14 0.39 0.92 / 0.14)`, whose
 *  numbers are 0-1 floats, not 0-255 bytes, and a regex expecting `rgb()` read that `0.14` as if it
 *  were a channel and produced a wrong, unreadable swatch. A 1x1 canvas parses ANY valid CSS colour
 *  (canvas fillStyle follows the same grammar) and, painted over white first, hands back the exact
 *  bytes this page's own white ground would show, alpha included. */
function resolveTokenColour(expr: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    if (!colourProbe) {
      colourProbe = document.createElement("div");
      themeScope().appendChild(colourProbe);
    }
    colourProbe.style.color = "";
    colourProbe.style.color = expr;
    const resolved = getComputedStyle(colourProbe).color;

    if (!colourCanvas) { colourCanvas = document.createElement("canvas"); colourCanvas.width = 1; colourCanvas.height = 1; }
    const ctx = colourCanvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = resolved; ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

/** Resolves a `color`-kind field's value to a real hex for the colour well, ONLY when it is not
 *  already one: a literal hex needs no resolving and is passed `null` by the caller. Runs in an
 *  effect because it reads computed style, which is a browser-only operation and one render behind
 *  is fine for a swatch nobody is validating against. */
function useResolvedColour(expr: string | null): string | null {
  const [resolved, setResolved] = useState<string | null>(null);
  useEffect(() => {
    if (!expr) { setResolved(null); return; }
    setResolved(resolveTokenColour(expr));
  }, [expr]);
  return resolved;
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
