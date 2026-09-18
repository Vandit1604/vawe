import { Header } from "../components/Header";
import { EditorClient } from "./EditorClient";
import { pageMetadata } from "../components/seo";
import "./editor.css";

export const metadata = pageMetadata({
  title: "Vawe · editor",
  description: "Edit a scene JSON and watch it render live. The real engine, running in your browser.",
  path: "/editor",
});

export default function EditorPage() {
  return (
    <div className="shell">
      <Header />
      <div className="wrap">
        <main id="content" className="edpage" tabIndex={-1}>
        <div className="phead">
          <div className="kicker">
            <span className="dot" /> editor
          </div>
          <h1>Scene in, video out.</h1>
          {/* One sentence. The tool below is the page, and the two facts a visitor needs before
              touching it are that this is the real engine and that nothing leaves the browser. */}
          <p>The real engine, running in your browser. Nothing is sent anywhere.</p>
        </div>
        <EditorClient />
        </main>
      </div>
    </div>
  );
}
