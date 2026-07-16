import type { Metadata } from "next";
import { Header } from "../components/Header";
import { EditorClient } from "./EditorClient";

export const metadata: Metadata = {
  title: "Vawe — editor",
  description: "Edit a scene JSON and watch it render live. The real engine, running in your browser.",
};

export default function EditorPage() {
  return (
    <>
      <Header />
      <div className="wrap">
        <div className="phead">
          <div className="kicker">
            <span className="dot" /> editor
          </div>
          <h1>Scene in, video out.</h1>
          <p>
            The engine is a web page, so it runs here as-is. Pick a scene or write your own, and watch
            every frame render live. No account, no key, nothing sent anywhere.
          </p>
        </div>
        <EditorClient />
      </div>
    </>
  );
}
