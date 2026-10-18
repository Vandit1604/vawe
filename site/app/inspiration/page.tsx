import type { Metadata } from "next";
import { Header, REPO_URL } from "../components/Header";
import { Footer } from "../components/Footer";
import { pageMetadata } from "../components/seo";
import { Next, PageTop } from "../components/Xp";
import { breadcrumbSchema, jsonLdScript } from "../../lib/schema";
import { inspirationSchema } from "../../lib/schema-content";
import { INSPIRATION, INSPIRATION_PATH, INSPIRATION_TYPES } from "../../lib/inspiration";
import { InspirationWall } from "./InspirationWall";
import "./inspiration.css";

const TITLE = "Motion video inspiration: AI-made motion design | vawe";
const DESCRIPTION =
  "Motion videos made with Claude and other AI, from posts on X. Each one credits its creator, links the post and gives the command to use it as a reference.";
const SUGGEST = `${REPO_URL}/issues/new?title=${encodeURIComponent("Inspiration post: ")}`;

// The videos play from X's CDN, which answers 403 to a request that carries a foreign Referer.
export const metadata: Metadata = {
  ...pageMetadata({ title: TITLE, description: DESCRIPTION, path: INSPIRATION_PATH }),
  referrer: "no-referrer",
};

export default function Inspiration() {
  return (
    <div className="shell in-shell">
      <Header active="inspiration" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbSchema([{ name: "vawe", url: "/" }, { name: "Inspiration", url: INSPIRATION_PATH }]))}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(inspirationSchema({ name: "Motion video inspiration", description: DESCRIPTION, count: 48 }))}
      />
      <div className="wrap">
        <main id="content" className="in" tabIndex={-1}>
          <InspirationWall posts={INSPIRATION} types={INSPIRATION_TYPES} suggestHref={SUGGEST}>
            <PageTop group="Learn" current="Inspiration" />
            <h1>Motion video inspiration</h1>
            <p className="in-lede">Made with Claude and other AI, from posts on X.</p>
          </InspirationWall>
          <Next
            title="Make one of your own."
            lead="Add a post as a reference, then write the page it inspired."
            primary={{ href: "/docs/quickstart", label: "Start with the quickstart" }}
            secondary={{ href: "/moves", label: "See the moves" }}
          />
        </main>
      </div>
      <Footer active={INSPIRATION_PATH} />
    </div>
  );
}
