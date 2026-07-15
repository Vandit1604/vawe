import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { FEATURES } from "../../lib/features";

export const metadata: Metadata = {
  title: "Vawe — features",
  description:
    "Determinism, blocks, kinetic type, cuts, shader stings, sound design, any aspect, and a taste gate ladder. What makes Vawe render on-brand, un-generic video.",
};

export default function Features() {
  return (
    <>
      <Header active="features" />
      <div className="wrap">
        <section className="phead">
          <span className="kicker">
            <span className="dot" /> features
          </span>
          <h1>What makes the output good.</h1>
          <p>
            Any static engine can make technically-correct, visually-generic video. Vawe&apos;s differentiator is the
            system that fights that. Eight pieces, one open canvas.
          </p>
        </section>

        <section>
          <div className="fgrid">
            {FEATURES.map((f) => (
              <Link className="flink" href={`/features/${f.slug}`} key={f.slug}>
                <div className="fk">{f.kicker}</div>
                <h3>{f.title}</h3>
                <p>{f.tagline}</p>
                <div className="go">
                  Explore <span className="arw">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <Footer note="one open canvas of primitives" />
      </div>
    </>
  );
}
