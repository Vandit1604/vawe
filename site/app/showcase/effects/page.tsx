import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { EffectsBrowser, type Index } from "./EffectsBrowser";
import index from "../../../lib/effects.json";
import "./effects.css";

/* /showcase/effects — the effects library, every registered effect present.
 *
 * A CHILD OF /showcase, not a sixth item in the nav. /showcase is already the answer to "what can
 * this render"; this is the same question asked exhaustively, so it belongs under it. A peer would
 * have made the nav ask a visitor to guess which of three pages holds the thing they want.
 *
 * The data is generated (scripts/site/effects-json.mjs) from the same family list that generates
 * docs/EFFECTS.md, so a newly registered effect appears here without anyone editing this file.
 */

const ix = index as Index;

export const metadata: Metadata = {
  title: "Vawe · effects",
  description: `Every effect the Vawe engine registers: ${ix.total} across ${ix.families} families, each with the JSON that uses it, ${ix.previewed} of them playing live in the real engine.`,
};

export default function Effects() {
  const live = ix.list.filter((f) => !f.noPreview).length;
  return (
    <div className="shell">
      <Header active="showcase" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="phead">
            <span className="kicker">
              <span className="dot" /> <Link href="/showcase">showcase</Link> · the arsenal
            </span>
            <h1>{ix.total} effects. All of them, here.</h1>
            <p>
              Every effect the engine registers, in {ix.families} families, generated from the
              registries themselves. <b>{ix.previewed} play live</b>, on demand, in the real engine.
            </p>

            {/* THE COVERAGE ESSAY IS A FOOTNOTE, NOT A PREFACE. A list that shows a preview for some
                rows and not others reads as breakage, so the split has to be stated somewhere; it
                does not have to be stated in front of the index a person came here to scan. It used
                to run ~300 words before the first effect name. */}
            <details className="fold">
              <summary>Which {ix.previewed} play, and why the other {ix.total - ix.previewed} do not</summary>
              <p>
                <b>It plays</b> {ix.previewed} of {ix.total}, across {live} families. An effect is
                playable here when one small scene demonstrates it with nothing but its name
                substituted. Press any name with a dot beside it. Two effects sit inside a playable
                family and still refuse to boot, so they carry no dot and say why when you open them.
              </p>
              <p>
                <b>It does not play</b> the rest, and each family says why on its own heading row. Three
                reasons cover nearly all of them. A grade, a baked image pass and a resample need a
                photographic source, and this index ships no photographs. A beat, a composition and a
                camera move need content and a layout, so a swatch of one would be a swatch of nothing.
                A modifier, a blend mode and a part entrance act on a layer you already have, so alone
                they have nothing to act on.
              </p>
              <p>
                <b>No preview proves a film.</b> These are six-second swatches on a flat backdrop. What
                an effect does in a film is a question for <Link href="/editor">the editor</Link> and{" "}
                <Link href="/showcase">the films on showcase</Link>. <span className="mono">make
                effects</span> regenerates the lot.
              </p>
            </details>
          </section>

          <EffectsBrowser index={ix} />

          <section className="section end">
            <h2 className="h2">
              Now compose them, in <span className="accent">JSON</span>.
            </h2>
            <div className="hero-cta">
              <Link className="btn btn-primary" href="/editor">Try the editor</Link>
              <Link className="btn btn-ghost" href="/showcase">← Back to showcase</Link>
            </div>
          </section>
        </main>

        <Footer note="generated from the engine registries" />
      </div>
    </div>
  );
}
