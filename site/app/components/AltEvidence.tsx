import Link from "next/link";

// Every number here is measured in the linked blog post; change both together.
const EVIDENCE = [
  {
    fact: "One blind A/B run on the same brief: a fresh agent finished the film in 5.9 minutes with one HTML page and in 10.75 minutes with our old custom JSON format.",
    href: "/blog/html-over-json",
    label: "HTML vs a custom JSON video format",
  },
  {
    fact: "Two renders of one SVG-filter page differed in 70 of 216 frames in a shared browser, and in 0 of 648 after a Chrome per lane and software compositing.",
    href: "/blog/determinism",
    label: "Deterministic rendering in headless Chrome",
  },
  {
    fact: "One headless Chrome per render lane cut frame capture for a 20 s film from 140 s to 47 s.",
    href: "/blog/chrome-per-lane",
    label: "Faster headless Chrome rendering",
  },
  {
    fact: "The whole film format: one page.html, a duration meta and one data-world element per beat.",
    href: "/blog/page-contract",
    label: "Render HTML to video: the page contract",
  },
];

export type QA = { q: string; a: React.ReactNode };

export function AltEvidence({ faq }: { faq: QA[] }) {
  return (
    <>
      <section className="isec">
        <div className="isec-text">
          <h2>What vawe measured about itself.</h2>
          <p>
            These numbers come from our own engineering posts, each with the commits behind it. They
            describe vawe only; none of them compares speed or quality with another tool.
          </p>
          <ul className="ievidence">
            {EVIDENCE.map((e) => (
              <li key={e.href}>
                {e.fact} <Link href={e.href}>{e.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="isec ifaq">
        <div className="isec-text">
          <h2>Questions people ask before they switch.</h2>
          {faq.map((item) => (
            <div key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
