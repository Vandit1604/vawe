// The docs are a separate app (docs-site/). It lists its pages at /docs/llms-index.json and serves each
// as markdown, so llms.txt and llms-full.txt read them from there. next.config.mjs reads the same DOCS_ORIGIN.
export type DocEntry = { title: string; description: string; url: string; markdown: string };

const origin = () => process.env.DOCS_ORIGIN || "http://127.0.0.1:3001";
const TIMEOUT_MS = 3000;

// A docs app that is down gives an empty list, never an error: llms.txt must always answer.
export async function docsIndex(): Promise<DocEntry[]> {
  try {
    const res = await fetch(`${origin()}/docs/llms-index.json`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as DocEntry[]) : [];
  } catch {
    return [];
  }
}

export async function docMarkdown(doc: DocEntry): Promise<string> {
  try {
    const res = await fetch(`${origin()}${new URL(doc.markdown).pathname}`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}
