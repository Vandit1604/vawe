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

const LABELS: Record<string, string> = {
  seed: "seed", colour: "colour", shadow: "shadow", pattern: "pattern", motion: "motion",
};

export function PlaygroundClient() {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [bootErr, setBootErr] = useState<string | null>(null);
  // `null` is the LIBRARY: a wall of looks and nothing else. Picking one opens the tuner. Two states
  // rather than one, because a grid plus a full-size preview plus a panel put the preview back below
  // the fold, which is the thing this page was just fixed for.
  const [which, setWhich] = useState<number | null>(null);
  const [opts, setOpts] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [preset, setPreset] = useState<string | null>(null);
  const [noDial, setNoDial] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [t, setT] = useState(0);
  const stage = useRef<HTMLDivElement>(null);

  // Boot the engine once. A failure here is shown rather than swallowed: a blank panel with no
  // message is the worst outcome, because it looks like the page simply has nothing in it.
  useEffect(() => {
    let alive = true;
    import(/* webpackIgnore: true */ ENGINE_URL)
      .then((m) => { if (alive) setEngine(m as unknown as Engine); })
      .catch((e) => { if (alive) setBootErr(String(e?.message || e)); });
    return () => { alive = false; };
  }, []);

  const gen = which == null ? null : (engine?.GENERATORS[which] ?? null);

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
    if (!gen || !opts) return null;
    try { const r = gen.render(opts); setErr(null); return r; }
    catch (e) { setErr(String((e as Error)?.message || e)); return null; }
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

  // Paint it and write `--t` ONCE. The preview does not animate: a moving field cannot be judged, and a
  // rAF loop on a page whose whole purpose is looking closely is a cost with no benefit. `--t` is still
  // the engine's own clock in SECONDS, so what you see at t is exactly the frame the renderer would
  // produce there, and the slider is how you inspect motion instead of being subjected to it.
  useEffect(() => {
    const el = stage.current;
    if (!el || html == null) return;
    el.innerHTML = html;
    el.style.setProperty("--t", t.toFixed(3));
  }, [html, t]);

  const apply = useCallback((next: Record<string, unknown>, named: string | null = null) => {
    setPreset(named);
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
  const patchJson = JSON.stringify(patch, null, 2);
  const link = typeof window === "undefined" ? "" :
    `${window.location.origin}${window.location.pathname}?g=${gen.name}` +
    (Object.keys(patch).length ? `&o=${btoa(JSON.stringify(patch))}` : "");

  return (
    <div className="pg">
      <div className="lback">
        <button onClick={() => setWhich(null)}>← all looks</button>
        <strong>{gen.name}</strong>
        <span>{engine.GENERATORS.length} in the library</span>
      </div>

      <div className="pggrid">
        <div className="pgstage">
          {sceneUrl
            ? <ScenePreview url={sceneUrl} title={`${gen.name} preview`} />
            : <div className="pgfield" ref={stage} aria-label={`${gen.name} preview`} />}
          {err && <p className="pgerr">{err}</p>}
          {/* Parked at 0, so nothing moves until you ask. A generator with `motion: still` ignores it,
              which is correct and visible rather than hidden. */}
          <label className="pgtime">
            <span>t</span>
            <input type="range" min={0} max={6} step={0.05} value={t}
              onChange={(e) => setT(Number(e.target.value))} aria-label="time, in seconds" />
            <code>{t.toFixed(2)}s</code>
          </label>
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
              if (e.target.value === "html" && made) copy("html", typeof made === "string" ? made : JSON.stringify(made, null, 2));
              if (e.target.value === "link") copy("link", link);
              e.target.value = "";
            }}>
            <option value="" disabled>…</option>
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
        <p className="pgabout">
          Every control here is built from the generator&apos;s own option schema, so what you can turn
          is exactly what it accepts, and an option it does not understand says so instead of quietly
          doing nothing. Paste these into a scene, or copy the HTML straight out. If a dial should
          exist and does not, that is worth telling us.
        </p>
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
        <input id={id} type="number" min={min} max={max} step={step} value={Number(value ?? 0)}
          onChange={(e) => onChange(path, Number(e.target.value))} />
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
  const html = useMemo(() => {
    try {
      const preset = Object.values(gen.presets || {})[0] || {};
      return gen.render(deepMerge(engine.defaultsOf(gen.schema), preset)) as string;
    } catch { return null; }
  }, [gen, engine]);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof html !== "string") return;
    el.innerHTML = html;
    el.style.setProperty("--t", "0");
  }, [html]);
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
 *  instead crops the scene to its top-left corner, which is exactly what the first version here did. */
function ScenePreview({ url, title }: { url: string; title: string }) {
  const { hostRef, meta } = useSceneEngine({ dataUrl: url, aspect: "16:9", title, playing: true });
  useEffect(() => {
    const h = hostRef.current;
    if (!h || !meta) return;
    const fit = () => {
      h.style.setProperty("--sp-scale", String(h.clientWidth / meta.width));
      h.style.setProperty("--sp-w", `${meta.width}px`);
      h.style.setProperty("--sp-h", `${meta.height}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(h);
    return () => ro.disconnect();
  }, [hostRef, meta]);
  return <div className="sp-stage pgscene" ref={hostRef} aria-label={title} />;
}

function groupsOf(gs: Generator[]): [string | null, { g: Generator; i: number }[]][] {
  const out: [string | null, { g: Generator; i: number }[]][] = [];
  gs.forEach((g, i) => {
    const key = g.group ?? null;
    const row = out.find(([k]) => k === key);
    if (row) row[1].push({ g, i });
    else out.push([key, [{ g, i }]]);
  });
  return out;
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
