import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Arsenal, type Arsenal as Data } from "./Arsenal";
import data from "../../lib/arsenal.json";
import "./arsenal.css";

/* /arsenal — what the engine is MADE OF, next door to /showcase, which is what it has MADE.
 *
 * Every number on this page is read out of site/lib/arsenal.json, which is generated from the two
 * registries (scripts/site/arsenal-json.mjs). None of them is typed. The page this replaces had its
 * block count hardcoded at 156 against a registry holding 176, which is the whole reason
 * quality/gates/site-counts.mjs exists.
 */

const D = data as Data;

export const metadata: Metadata = {
  title: "Vawe · arsenal",
  description:
    `Everything the Vawe engine is made of: ${D.total} blocks and effects, searchable, ` +
    `each with the JSON that uses it and ${D.live} of them playing in the real engine.`,
};

export default function ArsenalPage() {
  return (
    <div className="shell">
      <Header active="arsenal" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <Arsenal data={D} />
        </main>
        <Footer note="generated from the engine registries" />
      </div>
    </div>
  );
}
