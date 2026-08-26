import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import "./type.css";
import { TypeBrowser, type Group } from "./TypeBrowser";
import catalogue from "../../../lib/type-specimens.json";

/* /type — the typographic vocabulary, as specimens.
 *
 * The catalogue is GENERATED (scripts/site/type-specimens.mjs) from the registries that render it,
 * never hand-kept here: core/type.js for the presets and their blurbs, blueprints/index.mjs for the
 * beats, and the generated schema for the per-layer text props. Add a preset to the engine, re-run
 * the generator, and it is on this page with its own description and a working specimen.
 */

const C = catalogue as unknown as {
  _derivedFrom: string[];
  counts: { specimens: number; presetsInEngine: number; presetsShown: number; beatsInEngine: number; beatsShown: number };
  coverage: { textPropsNotShown: string[]; beatsNotShown: string[] };
  groups: Group[];
};

export const metadata: Metadata = {
  title: "Vawe · typography",
  description:
    "The engine's typographic vocabulary as specimens: kinetic presets, per-layer text mechanics and typographic beats, each playing in the real engine with the JSON that produces it.",
};

export default function TypePage() {
  return (
    <div className="shell">
      <Header active="showcase" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="phead">
            <span className="kicker">
              <span className="dot" /> typography
            </span>
            <h1>{C.counts.specimens} specimens. Every one of them moves.</h1>
            <p>
              Type is where this engine is deepest, and a still cannot show any of it. So press play on
              a specimen and it runs in the <b>real engine</b>, in the browser, from the same scene
              JSON the picture was shot from. Not a reproduction: the site ships{" "}
              <span className="mono">core/</span> and <span className="mono">scene.html</span>, so
              this is the renderer that makes the videos.
            </p>
            <div className="bnote">
              <b>{C.counts.presetsShown} of {C.counts.presetsInEngine} kinetic presets</b>
              &nbsp;·&nbsp;the still is shot <b>part way through</b> the entrance, never after it
              &nbsp;·&nbsp;every card carries its JSON
            </div>
          </section>

          {/* THE GROUPING EXPLAINED ITSELF TWICE, AND THE SECOND TIME COST A SCREEN. This section
              was a full h2 plus a paragraph saying the specimens are grouped by job rather than by
              registry, standing directly above eight headings that read "Reveal a line", "Punctuate
              a word", "Resolve out of noise". The headings ARE the explanation, and they arrive
              sooner. Measured: the first specimen sat at 1106px, so a visitor scrolled a whole
              screen of prose to reach the work on a page whose entire argument is that a still
              cannot show it. Provenance is real and stays, one keystroke away, because a generated
              catalogue that hides where it came from is worth less. It is a footnote, not a
              preface. Same cut, same reasoning, as showcase/effects/page.tsx. */}
          <details className="fold">
            <summary>Why these groups, and where the list comes from</summary>
            <p>
              Not by registry. An author reaches for a job, not a name: reveal a line, punctuate one
              word, resolve out of noise, paint the glyphs, or set the whole beat in one line. The
              descriptions and the cautions are the engine&apos;s own words, read out of the code
              beside each preset, so they cannot drift from what it does.
            </p>
            <ul className="tyderived">
              <li className="tyderived-h">Generated from</li>
              {C._derivedFrom.map((d) => (
                <li key={d} className="mono">{d}</li>
              ))}
            </ul>
          </details>

          <TypeBrowser groups={C.groups} />

          {/* Said out loud. A catalogue that shows a subset and does not admit it is the same lie as
              one that has gone stale, only harder to notice. */}
          <section className="tycoverage">
            <h2>What is not on this page.</h2>
            <p>
              Every kinetic preset in the engine is here, because the list is generated from the
              registry. Two things are deliberately partial, and the generator reports them rather
              than hiding them.
            </p>
            <div className="tycovgrid">
              <div>
                <h3>{C.counts.beatsInEngine - C.counts.beatsShown} beats, not shown</h3>
                <p>
                  Only the typographic blueprints are here. The rest build cards, terminals, product
                  shots and logo lockups, so they belong on the showcase.
                </p>
                <p className="mono tycovlist">{C.coverage.beatsNotShown.join(" · ")}</p>
              </div>
              <div>
                <h3>{C.coverage.textPropsNotShown.length} text props, no specimen</h3>
                <p>
                  These set a layer rather than animate it: its size, its weight, its box, whether it
                  auto-fits. They are documented in the schema and worth nothing as a moving picture.
                </p>
                <p className="mono tycovlist">{C.coverage.textPropsNotShown.join(" · ")}</p>
              </div>
            </div>
          </section>

          <section className="section end">
            <h2 className="h2">
              Now set it in a <span className="accent">scene</span>.
            </h2>
            <div className="hero-cta">
              <Link className="btn btn-primary" href="/editor">
                Try the editor
              </Link>
              <Link className="btn btn-ghost" href="/showcase">
                See the films →
              </Link>
            </div>
          </section>
        </main>

        <Footer note="every specimen is the real engine, playing the JSON beside it" />
      </div>
    </div>
  );
}
