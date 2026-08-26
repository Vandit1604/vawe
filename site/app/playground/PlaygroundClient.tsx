"use client";

/**
 * The generator playground: dials on the right, the live generator on the left.
 *
 * NOTHING HERE KNOWS WHAT A LIGHTFIELD IS. It reads `GENERATORS` out of the vendored engine
 * (core/generators.js) and builds the panel from each generator's declarative schema, so adding a
 * generator to the registry is the whole job of putting it on this page. A hand-kept list of dials
 * over here would be a second source of truth that goes stale in silence, which is exactly how
 * site/public froze 77 files behind core/ (docs/MISTAKES.md #271).
 *
 * The engine is loaded at RUNTIME with a dynamic import of "/core/generators.js", not bundled. Two
 * reasons, and the second is the real one: the site vendors core/ into public/ as static files, so
 * bundling would fork the engine into a webpack copy that drifts from the one /editor boots. This
 * way the page runs the same file the renderer does.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [showAll, setShowAll] = useState(false);
  const optsFor = useRef<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  // The last result this generator produced, held so a refused option does not blank the preview.
  const lastGood = useRef<{ name: string; made: string | Layer[] } | null>(null);

  // Boot the engine once. A failure here is shown rather than swallowed: a blank panel with no
  // message is the worst outcome, because it looks like the page simply has nothing in it.
  useEffect(() => {
    let alive = true;
    import(/* webpackIgnore: true */ ENGINE_URL)
      .then((m) => { if (alive) setEngine(m as unknown as Engine); })
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
  // A generator that declares primaries shows those; one that declares none shows everything, which is
  // right for the 63 of 71 with eight controls or fewer. No inference either way.
  const hasPrimary = controls.some((c) => c.spec.primary);
  const shown = hasPrimary && !showAll ? controls.filter((c) => c.spec.primary) : controls;

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
  const sceneUrl = useMemo(() => {
    if (!layers) return null;
    // The SAME scene shape scripts/site/blocks-scenes.mjs builds for the /blocks posters, copied rather
    // than invented: the first version guessed a `calm` backdrop that is not in the registry, and a
    // scene naming a preset nothing has renders black.
    const scene = {
      module: "scene", aspect: "16:9", theme: "vawe", duration: 9,
      audio: { silent: true },
      bg: [{ preset: "plain", from: 0, to: 9 }],
      layers,
    };
    return URL.createObjectURL(new Blob([JSON.stringify(scene)], { type: "application/json" }));
  }, [layers]);
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
  //      every calc() reading it would be invalid and the whole declaration dropped (docs/MISTAKES.md
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
          The engine’s generators, running here rather than in a render. Every card is the real
          thing, drawn still. Open one to turn its dials.
        </p>
        <div className="lgrid">
          {engine.GENERATORS.map((g, i) => (
            <LookCard key={g.name} gen={g} engine={engine} active={false} onPick={() => setWhich(i)} />
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
          {hasPrimary && (
            <button className="pgmore" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "fewer options" : `all options (${controls.length - shown.length} more)`}
            </button>
          )}
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

/** A card in the library: the look itself, rendered still, at card size.
 *
 *  It is the REAL generator, not a screenshot. A poster would be a second artefact to keep in step with
 *  the code, and site/public froze 77 files behind core/ the last time this repo had one of those
 *  (docs/MISTAKES.md #271). A field is a handful of gradients, so a wall of them costs little, and
 *  nothing animates. */
function LookCard({ gen, engine, active, onPick }:
  { gen: Generator; engine: Engine; active: boolean; onPick: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const made = useMemo(() => {
    try {
      const preset = Object.values(gen.presets || {})[0] || {};
      return gen.render(deepMerge(engine.defaultsOf(gen.schema), preset));
    } catch { return null; }
  }, [gen, engine]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (typeof made === "string") { el.innerHTML = made; el.style.setProperty("--t", "0"); return; }
    // A generator that emits scene LAYERS cannot be injected. Where that layer is a SHADER, the card
    // draws it straight to a canvas with the engine's own ambient layer: no scene, no iframe, no
    // second renderer. Booting an engine per card is what /blocks refuses to do, for good reason.
    const layer = Array.isArray(made) ? (made[0] as Record<string, unknown>) : null;
    if (!layer || layer.type !== "shader") return;
    let live = true;
    let inst: { canvas: HTMLCanvasElement; draw: (...a: unknown[]) => void; dispose?: () => void } | null = null;
    Promise.all([
      import(/* webpackIgnore: true */ AMBIENT_URL),
      import(/* webpackIgnore: true */ PALETTE_URL),
    ]).then(([m, p]) => {
      if (!live) return;
      inst = m.createAmbientLayer(480, 300);
      // `draw` wants GL float triples, not hex, and the CONVERSION IS THE ENGINE'S. This used to be a
      // hand-rolled parseInt here, which was a second implementation of core/surfaces/palette.js and
      // was already behind it: a stop may now carry its own position along the ramp as `#rrggbb@0.42`,
      // and the copy here dropped it silently, so a card could not show a moved ramp at all.
      const pal = (layer.colors as string[] | undefined)?.length
        ? (p as { palette: (l: unknown) => unknown }).palette({ colors: layer.colors })
        : null;
      // ALL SIX PARAMETER VECTORS. It passed two. `bands` and `spectrum` read as far as params6, so
      // every card of them was drawn with the other four vectors defaulted to zero: no gradient, no
      // converge, no light shape, no zoom. The card was not a small approximation of the generator, it
      // was a different picture, and it looked plausible enough that nobody checked it against one.
      inst!.draw(layer.shader, 0, layer.seed ?? 0, pal, layer.intensity ?? 1,
        layer.params, layer.params2, layer.params3, layer.params4, layer.params5, layer.params6);
      // aria-hidden, because the canvas sits INSIDE a button that already carries the generator's
      // name and its description. Without it a screen reader announces the button's label and then
      // an unlabelled graphic, which is the same thing said twice with the second half empty. Found
      // by running the Web Interface Guidelines over the rendered page: "decorative media needs
      // assistive-tech hiding", and decorative is exactly what a picture inside its own label is.
      inst!.canvas.setAttribute("aria-hidden", "true");
      el.replaceChildren(inst!.canvas);
      inst!.canvas.style.width = "100%";
      inst!.canvas.style.height = "100%";
      inst!.canvas.style.display = "block";
    }).catch((e) => {
      // Never silent. A blank card that swallowed its reason is indistinguishable from a card that has
      // nothing to draw, and this repo has paid for that confusion more than once.
      console.error(`playground: ${gen.name} card could not draw`, e);
    });
    return () => { live = false; inst?.dispose?.(); };
  }, [made]);
  return (
    <button className={`lcard${active ? " on" : ""}`} onClick={onPick} aria-pressed={active}>
      <span className="lcard-shot" ref={box} aria-hidden />
      <span className="lcard-name">{gen.name}</span>
      <span className="lcard-blurb">{gen.blurb}</span>
    </button>
  );
}

/** The engine iframe, the same hook /blocks and /editor use, so the site runs one engine.
 *
 *  It wears `.sp-stage`, not a class of its own. The hook names the iframe `sp-frame`, and that pair
 *  exists because the iframe renders at FULL frame size and is scaled down: sizing it to the box
 *  instead crops the scene to its top-left corner, which is exactly what the first version here did.
 *  useStageFit does that scaling, and /editor does it with the same call. */
function ScenePreview({ url, title }: { url: string; title: string }) {
  // playing: FALSE. The page's contract is that nothing here moves and the panel says so in as many
  // words, but a generator that emits scene LAYERS came up through this hook with playback on, so the
  // two shader looks ran a 270-frame loop while every other look held still. A field is judged against
  // a still reference; a picture that changes while you look at it cannot be compared to one that does
  // not. One frame is drawn explicitly, because with no loop nobody else would draw it, and it is the
  // MIDDLE one: the engine gives every layer an entrance envelope, so frame 0 is the instant before the
  // picture arrives and the stage came up white. Halfway is past every entrance and before any exit.
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
