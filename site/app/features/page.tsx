import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { FEATURES } from "../../lib/features";

export const metadata: Metadata = {
  title: "Vawe · features",
  description:
    "Determinism, blocks, kinetic type, cuts, shader stings, sound design, any aspect, and a taste gate ladder. What makes Vawe render on-brand, un-generic video.",
};

export default function Features() {
  return (
    <div className="shell">
      <Header active="features" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
        <section className="phead">
          <span className="kicker">
            <span className="dot" /> features
          </span>
          <h1>What makes the output good.</h1>
          <p>
            Any static engine can make technically-correct, visually-generic video. Vawe fights that with a
            system, not a template. Eight pieces, one open canvas.
          </p>
        </section>

        <section>
          <div className="fgrid">
            {FEATURES.map((f) => (
              <Link className="flink" href={`/features/${f.slug}`} key={f.slug}>
                <div className="fk">{f.kicker}</div>
                {/* h2, not h3: these sit directly under the page h1 with no intermediate level. */}
                <h2>{f.title}</h2>
                <p>{f.tagline}</p>
                <div className="go">
                  Explore <span className="arw">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        </main>

        <Footer note="one open canvas of primitives" />
      </div>
    </div>
  );
}
