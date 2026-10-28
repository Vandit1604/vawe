import { absoluteUrl } from "../site";

export { prefersMarkdown } from "./accept";

// Edge-safe: the middleware imports this file, so it must not read the disk.

export const DESCRIBEDBY_LINK = ["/llms.txt", "/llms-full.txt", "/ai.txt"].map((p) => `<${absoluteUrl(p)}>; rel="describedby"`).join(", ");

export type MarkdownOptions = {
  status?: number;
  canonicalPath?: string;
  lastModified?: string;
  longCache?: boolean;
  negotiated?: boolean;
};

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, HEAD, OPTIONS", "access-control-allow-headers": "accept" };

// The approximate token count agents budget with: four characters a token.
export const tokensOf = (text: string) => Math.ceil(text.length / 4);

export function markdownHeaders(text: string, opts: MarkdownOptions = {}) {
  const { status = 200, canonicalPath, lastModified, longCache, negotiated } = opts;
  const headers: Record<string, string> = {
    "content-type": "text/markdown; charset=utf-8",
    "x-markdown-tokens": String(tokensOf(text)),
    "x-robots-tag": "noindex, follow",
    "cache-control": status === 200 ? (longCache ? "public, s-maxage=86400, stale-while-revalidate=604800" : "public, s-maxage=3600, stale-while-revalidate=86400") : "public, s-maxage=60",
    link: canonicalPath ? [`<${absoluteUrl(canonicalPath)}>; rel="canonical"`, DESCRIBEDBY_LINK].join(", ") : DESCRIBEDBY_LINK,
    ...CORS,
  };
  if (canonicalPath) headers["content-location"] = absoluteUrl(canonicalPath);
  if (negotiated) headers.vary = "Accept";
  if (lastModified) headers["last-modified"] = new Date(`${lastModified}T00:00:00Z`).toUTCString();
  return headers;
}

export function markdownResponse(method: string, text: string, opts: MarkdownOptions = {}) {
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "access-control-max-age": "86400" } });
  return new Response(method === "HEAD" ? null : text, { status: opts.status ?? 200, headers: markdownHeaders(text, opts) });
}
