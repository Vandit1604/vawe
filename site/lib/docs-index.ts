import { DOCS_ORIGIN } from "./docs-origin.mjs";

// The docs are a separate app (vawe-hq/vawe-docs). It lists its pages at /docs/llms-index.json and serves each
// as markdown, so llms.txt and llms-full.txt read them from there.
export type DocEntry = { title: string; description: string; url: string; markdown: string };

const TIMEOUT_MS = 3000;

// A docs app that is down gives an empty list, never an error: llms.txt must always answer.
export async function docsIndex(): Promise<DocEntry[]> {
  try {
    const res = await fetch(`${DOCS_ORIGIN}/docs/llms-index.json`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as DocEntry[]) : [];
  } catch {
    return [];
  }
}

export async function docMarkdown(doc: DocEntry): Promise<string> {
  try {
    const res = await fetch(`${DOCS_ORIGIN}${new URL(doc.markdown).pathname}`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}
