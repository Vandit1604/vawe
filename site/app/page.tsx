import { Header, REPO_URL } from "./components/Header";
import { HeroSplit } from "./components/HeroSplit";
import { SectionStrip } from "./components/SectionStrip";
import { Footer } from "./components/Footer";
import { ProofHash, ProofAspect } from "./components/proofs";
import { organizationSchema, websiteSchema, softwareApplicationSchema, softwareSourceCodeSchema, jsonLdScript } from "../lib/schema";
import { faqSchema } from "../lib/schema-content";
import { FAQ } from "../lib/faq";
import "./landing.css";

/* THE LANDING PAGE (site/IDENTITY.md). The three.js example film first; then how it works, what a page film
 * looks like, what you get, and questions. The proofs are drawings whose geometry is the claim.
 */

// A complete page film under the contract in the repo AGENTS.md: a duration meta and a seeked CSS
// animation. No var() inside the animation shorthand: Chromium drops the whole declaration.
const PAGE_TEXT = `<!doctype html>
<html data-aspect="16:9">
<meta name="duration" content="3">
<meta name="message" content="One page. One film.">
<style>
  body { margin: 0; display: grid; place-items: center start;
         height: 100vh; padding-left: 8vw; background: #16151a; }
  h1 { font: 800 9vh/1 system-ui; color: #f4f2ee;
       animation: rise 0.7s cubic-bezier(.2,.8,.2,1) 0.3s both; }
  @keyframes rise {
    from { translate: 0 6vh; clip-path: inset(0 0 100% 0); }
    to   { translate: 0 0;   clip-path: inset(0 0 0 0); }
  }
</style>
<h1>One page. One film.</h1>`;

const SECTIONS = [
  { id: "intro", label: "Film" },
  { id: "how", label: "How" },
  { id: "page", label: "Page" },
  { id: "perks", label: "Perks" },
  { id: "faq", label: "FAQ" },
];

export default function Home() {
  return (
    <div className="shell home">
      {/* Organization, WebSite, SoftwareApplication and FAQPage, built in site/lib/schema.ts from real repo data. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(organizationSchema())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(websiteSchema())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(softwareApplicationSchema())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(softwareSourceCodeSchema())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqSchema())} />
      <Header />
      <main className="wrap" id="content" tabIndex={-1}>
        <HeroSplit />

        <section className="ls" id="how">
          <h2>How it works.</h2>
          <div className="ls-grid ls-2">
            <div className="panel ls-card ls-wide">
              <div className="ls-vis"><div className="ls-code">{"<"}<b>meta</b>{` name="duration" content="3">\n<`}<b>h1</b>{">One page. One film.</"}<b>h1</b>{">\nh1 { "}<b>animation</b>{": rise 0.7s both }"}</div></div>
              <div>
                <h3>Write</h3>
                <p>HTML, CSS, Web Animations, SVG, canvas or three.js, in one page. You write it, or an agent does.</p>
              </div>
            </div>
            <div className="panel ls-card">
              <div className="ls-vis"><ProofHash /></div>
              <h3>Render</h3>
              <p>The renderer seeks the page to each frame’s time, so frame 412 comes out the same in any order.</p>
            </div>
            <div className="panel ls-card">
              <div className="ls-vis"><ProofAspect /></div>
              <h3>Ship</h3>
              <p>One page lays out for every canvas: 16:9, 9:16, 1:1, 4:5 and 4:3.</p>
            </div>
          </div>
        </section>

        <section className="ls" id="page">
          <h2>The film is the page.</h2>
          <p className="ls-sub">This is a whole film. Open it in a browser and it plays; hand it to vawe and it renders.</p>
          <div className="ls-grid ls-2">
            <div className="panel ls-card">
              <h3>Read it</h3>
              <p>Nothing here is a private format. It is the HTML and CSS you already write.</p>
              <h3>Review it</h3>
              <p>A change to the motion is a diff you can read before it ships.</p>
              <div className="ls-act"><a className="btn btn-ghost" href={REPO_URL}>Read the page contract</a></div>
            </div>
            <div className="panel ls-card">
              <div className="ls-vis ls-vis-code">
                <pre className="ls-code">{PAGE_TEXT}</pre>
              </div>
            </div>
          </div>
        </section>

        <section className="ls" id="perks">
          <h2>What you get.</h2>
          <div className="ls-grid ls-2">
            <div className="panel ls-card"><h3>Review like code</h3><p>Motion changes arrive as a readable diff, not a binary project file.</p></div>
            <div className="panel ls-card"><h3>Hand it to an agent</h3><p>An agent writes the page, checks read the draft, and a fresh session judges the frames.</p></div>
            <div className="panel ls-card"><h3>Every canvas, one file</h3><p>16:9 through 9:16 from the same page, laid out with CSS.</p></div>
            <div className="panel ls-card"><h3>Same frames, every run</h3><p>The clock and the randomness are virtual. Frame 412 is always frame 412.</p></div>
          </div>
        </section>

        <section className="ls" id="faq">
          <h2>Questions.</h2>
          <div className="panel ls-faq">
            {FAQ.map((item, i) => (
              <details key={item.q} open={i === 0}>
                <summary>{item.q}</summary>
                <p>
                  {item.a.map((seg, j) => (typeof seg === "string" ? seg : <a key={j} href={seg.href}>{seg.text}</a>))}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer bookend />
      <SectionStrip sections={SECTIONS} />
    </div>
  );
}
