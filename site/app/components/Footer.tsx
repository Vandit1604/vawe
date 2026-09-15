import { Clip } from "./Clip";

/* `bookend` closes the page on the same material it opened on: the contentless backdrop scene
 * under cobalt. Never a capability clip — those all carry copy, which blurs into drifting smudges
 * behind the CTA. Interior pages keep the plain hairline footer. */
export function Footer({ note = "one JSON, one video", bookend = false }: { note?: string; bookend?: boolean }) {
  if (!bookend) {
    return (
      <footer className="foot wrap">
        <span>© 2026 Vawe · free to experiment with while it is early</span>
        <span className="mono">{note}</span>
      </footer>
    );
  }

  return (
    <footer className="bookend foot-band">
      <Clip className="bookend-film" src="/assets/backdrop.mp4" poster="/assets/backdrop.jpg" />
      <div className="wrap foot-in on-accent">
        <p className="foot-cta">Compose a scene. Render it. Ship it.</p>
        <p className="foot-sub">One JSON in, one frame-perfect video out. No account, no key, nothing sent anywhere.</p>
        <div className="foot-act">
          <a className="btn btn-white" href="/editor">
            Try the editor <span className="arw">→</span>
          </a>
          <a className="btn btn-onaccent" href="/features">
            Explore features <span className="arw">→</span>
          </a>
        </div>
        <div className="foot-links">
          <a href="/arsenal">Arsenal</a>
          <a href="/showcase">Showcase</a>
          <a href="/editor">Editor</a>
          <a href="/features">Features</a>
        </div>
        <div className="foot-rule" />
        {/* No licence badge here. Vawe is Apache 2.0, plain and permissive, so there is no tier
            or limit to state. The LICENSE file is still in the repo for anyone who goes looking.
            Invite the experiment instead. */}
        <div className="foot-meta">
          <span>© 2026 Vawe · free to experiment with while it is early</span>
          <span className="mono">{note}</span>
        </div>
      </div>
    </footer>
  );
}
