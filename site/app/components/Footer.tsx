import { Clip } from "./Clip";

/* `bookend` closes the page on the same material it opened on: the contentless backdrop scene
 * under cobalt. Never a capability clip — those all carry copy, which blurs into drifting smudges
 * behind the CTA. Interior pages keep the plain hairline footer. */
export function Footer({ note = "one JSON, one video", bookend = false }: { note?: string; bookend?: boolean }) {
  if (!bookend) {
    return (
      <footer className="foot wrap">
        <span>
          © 2026 Vawe ·{" "}
          <a href="https://github.com/Vandit1604/vawe/blob/main/LICENSE">Vawe Company License</a> · free for teams ≤ 3
        </span>
        <span className="mono">{note}</span>
      </footer>
    );
  }

  return (
    <footer className="bookend foot-band">
      <Clip className="bookend-film" src="/assets/backdrop.mp4" poster="/assets/backdrop.jpg" />
      <div className="wrap foot-in on-accent">
        <p className="foot-cta">Compose a scene. Render it. Ship it.</p>
        <p className="foot-sub">Free for individuals and small teams. One JSON in, one frame-perfect video out.</p>
        <div className="foot-act">
          <a className="btn btn-white" href="https://github.com/Vandit1604/vawe">
            ★ Star on GitHub
          </a>
          <a className="btn btn-onaccent" href="/features">
            Explore features <span className="arw">→</span>
          </a>
        </div>
        <div className="foot-links">
          <a href="https://github.com/Vandit1604/vawe">GitHub</a>
          <a href="/showcase">Showcase</a>
          <a href="/editor">Editor</a>
          <a href="/features">Features</a>
        </div>
        <div className="foot-rule" />
        <div className="foot-meta">
          <span>
            © 2026 Vawe ·{" "}
            <a href="https://github.com/Vandit1604/vawe/blob/main/LICENSE">Vawe Company License</a> · free for teams ≤ 3
          </span>
          <span className="mono">{note}</span>
        </div>
      </div>
    </footer>
  );
}
