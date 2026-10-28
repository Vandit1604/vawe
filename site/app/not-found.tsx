import Link from "next/link";
import { headers } from "next/headers";
import { logBotNotFound } from "../lib/bots";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

export const metadata = { title: "Page not found | vawe", robots: { index: false } };

export default async function NotFound() {
  logBotNotFound(await headers());
  return (
    <div className="shell">
      <Header />
      <main className="wrap" id="content" tabIndex={-1}>
        <section className="phead">
          <h1>Page not found</h1>
          <p>This page does not exist.</p>
          <Link className="btn btn-ghost" href="/" style={{ marginTop: "var(--sp-4)" }}>
            Go to the home page
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
