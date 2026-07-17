"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ProofHash, ProofSay, ProofAspect } from "./proofs";

/* A PINNED scroll section (the Vercel/Linear/Stripe marketing pattern; shadcn has no component
 * for it — its ScrollArea is a styled scrollbar and its MessageScroller is for chat threads).
 *
 * The previous version stuck only the right panel and let the left column scroll past it, so the
 * whole section travelled and the diagrams read as "moving". Here the entire pane pins: nothing
 * translates, and scrolling only advances STATE. The card you are on goes cobalt, the rest stay
 * paper, and the diagram swaps to answer it. Motion is the change, not the journey.
 *
 * Scroll position is read from sentinels rather than a scroll handler: three zero-width markers
 * spaced down the runway, and whichever crosses the viewport's middle is the active step. That
 * needs no scroll math, no rAF, and no listener that runs on every frame of every scroll.
 *
 * The cards are BUTTONS. A section whose only input is scrolling cannot be driven from a keyboard,
 * and a stepper you can see the state of but not set is a display pretending to be a control. They
 * jump to their step, which also gives the pattern a non-scroll way through it.
 */

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
    // The claim is conditioned on purpose. The engine renders any of the five canvases in one pass,
    // and pin/col/% genuinely resolve per canvas — but absolute x/w is pixels tuned to one ratio, so
    // "every platform ratio from the same scene" was true of the engine and not of a scene that
    // hand-places coordinates. Naming the condition is not a smaller claim: the relative vocabulary
    // IS the feature, and a promise the author has to keep by hand is worth less than an honest one.
    t: "Any aspect",
    d: "Pin keywords, a 12-column grid, and optical centering resolve to pixels per canvas. Compose in those and one source renders 16:9, 9:16, 1:1, and 4:5 in a single pass.",
    proof: <ProofAspect />,
  },
];

export function Claims() {
  const [active, setActive] = useState(0);
  const marks = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const els = marks.current.filter((el): el is HTMLSpanElement => !!el);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = els.indexOf(e.target as HTMLSpanElement);
          if (i !== -1) setActive(i);
        }
      },
      // A band with real height across the viewport's middle. NOT -50%/-50%: that collapses the
      // root to a zero-height line, and nothing reliably "intersects" a line, so the state never
      // advanced. 10% of the viewport, against sentinels tall enough to always cross it.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const goTo = (i: number) => marks.current[i]?.scrollIntoView({ block: "center" });

  return (
    <div className="pin">
      {/* No-JS un-pins the section: without the observer the runway would be three screens of
          scrolling that never change anything. Everything is in the DOM either way, so the
          fallback is the whole section, read straight down. */}
      <noscript>
        <style>{`.pin{height:auto!important}.pin-in{position:static!important;min-height:0!important}
          .pc{background:#fff!important;color:var(--ink)!important}.pin-stage{display:none!important}
          .pc-proof{display:block!important}`}</style>
      </noscript>

      {/* The sentinels tile the exact slice of runway the viewport's midline sweeps while the pane
          is pinned, which is NOT the whole runway. At the moment the pin engages the midline sits
          50svh into the runway, and it advances 1:1 with scroll for the (runway - 100svh) the pin
          holds. So sentinel i covers [50svh + i*step, 50svh + (i+1)*step], and the last one ends
          exactly as the pin releases. Spread over 0-100% instead and the first and last steps sit
          outside the pinned window, where nothing can reach them. Derived from the same --pin-step
          the runway is built from, so retuning the pace cannot desync them. */}
      {CLAIMS.map((c, i) => (
        <span
          key={c.t}
          className="pin-mark"
          aria-hidden="true"
          style={{ top: `calc(50svh + ${i} * var(--pin-step))` }}
          ref={(el) => {
            marks.current[i] = el;
          }}
        />
      ))}

      <div className="pin-in">
        {/* The heading lives INSIDE the pinned pane. Left in the page above it, it scrolled away
            the instant the pin engaged, so the screen you actually hold someone on for three
            steps had no title on it. */}
        <div className="pin-head">
          <div className="kicker">why vawe</div>
          <h2 className="h2">Video, as code.</h2>
        </div>
        <div className="pin-grid">
          <div className="pin-cards">
            {CLAIMS.map((c, i) => (
              <div key={c.t} className="pc-wrap">
                <button
                  className="pc"
                  data-on={i === active ? "" : undefined}
                  aria-current={i === active ? "true" : undefined}
                  onClick={() => goTo(i)}
                >
                  <span className="pc-n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="pc-body">
                    <span className="pc-t">{c.t}</span>
                    <span className="pc-d">{c.d}</span>
                  </span>
                </button>
                {/* mobile + no-JS: the diagram rejoins its claim, because there is no pinned pane
                    beside it to answer from. Same array, so the two cannot drift apart. */}
                <div className="pc-proof" aria-hidden="true">
                  {c.proof}
                </div>
              </div>
            ))}
          </div>

          <div className="pin-stage" aria-hidden="true">
            {CLAIMS.map((c, i) => (
              <div className="pin-pane" key={c.t} data-on={i === active ? "" : undefined}>
                {c.proof}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
