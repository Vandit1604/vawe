"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ProofHash, ProofSay, ProofAspect } from "./proofs";

/* Sticky scrollytelling: the claims scroll on the left, one proof artifact stays pinned on the
 * right and swaps to match whichever claim you are reading, and a cobalt rail fills box by box
 * so the active claim is visibly the one the panel is answering.
 *
 * Each claim carries its OWN kind of evidence, and that difference is the whole argument. A
 * shared shape here would say these three facts are interchangeable. They are not: determinism
 * is proved by two hashes matching, agent-native by prose becoming a contract, any-aspect by
 * drawing the ratios. That is also why the panel swaps rather than morphs.
 *
 * No-JS / pre-hydration renders claim 0 active: a coherent first frame, not a blank panel. The
 * swap is content, not decoration, so reduced-motion still swaps. It just does not travel. */

type Claim = { t: string; d: string; proof: ReactNode };

const CLAIMS: Claim[] = [
  {
    t: "Deterministic",
    d: "renderFrame(n) is pure in n. Same JSON, same bytes, any render order. Every video is reproducible and diff-able.",
    proof: <ProofHash />,
  },
  {
    t: "Agent-native",
    d: "Authored from a schema and a taste system, not clicked together in a UI. One open canvas of composable primitives.",
    proof: <ProofSay />,
  },
  {
    t: "Any aspect",
    d: "One source renders 16:9, 9:16, 1:1, and 4:5 in a single pass. Every platform ratio from the same scene.",
    proof: <ProofAspect />,
  },
];

export function Claims() {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const els = steps.current.filter((el): el is HTMLDivElement => !!el);
    if (!els.length) return;

    // A band across the middle of the viewport: the step crossing it is the one being read.
    // Deliberately NOT "last one to cross the top" — that activates a claim before you reach it.
    // When no step is in the band (section entering/leaving), the last active one stands, so the
    // panel never blanks between claims.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = els.indexOf(e.target as HTMLDivElement);
          if (i !== -1) setActive(i);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="scrolly">
      <div className="scrolly-steps">
        {CLAIMS.map((c, i) => (
          <div
            key={c.t}
            className="step"
            data-on={i <= active ? "" : undefined}
            data-now={i === active ? "" : undefined}
            ref={(el) => {
              steps.current[i] = el;
            }}
          >
            <span className="step-rail" aria-hidden="true" />
            <h3>{c.t}</h3>
            <p>{c.d}</p>
            {/* mobile only: sticky side-by-side has nowhere to stick on a phone, so the proof
                rejoins its claim. Same array, so the two render sites cannot drift apart. */}
            <div className="step-proof" aria-hidden="true">
              {c.proof}
            </div>
          </div>
        ))}
      </div>

      <div className="scrolly-stage" aria-hidden="true">
        <div className="stage-in">
          {CLAIMS.map((c, i) => (
            <div className="stage-pane" key={c.t} data-now={i === active ? "" : undefined}>
              {c.proof}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
