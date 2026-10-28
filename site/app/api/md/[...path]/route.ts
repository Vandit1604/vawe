import { catalogMarkdown, renderMarkdown } from "../../../../lib/md/registry";
import { markdownResponse } from "../../../../lib/md/http";
import { SITE_URL } from "../../../../lib/site";

// The one handler behind every markdown page: /<page>.md and Accept: text/markdown reach it through
// middleware.ts, and /api/md/<page> reaches it directly. It never answers with HTML.
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

function notFound(path: string) {
  return `# Not found\n\n> No markdown page exists for ${path}.\n\nThe list of pages that do: ${SITE_URL}/api/md/_catalog\n`;
}

async function answer(req: Request, ctx: Ctx) {
  const segments = (await ctx.params).path;
  const negotiated = req.headers.get("x-md-negotiated") === "1";
  if (req.method === "OPTIONS") return markdownResponse("OPTIONS", "");
  if (segments.join("/") === "_catalog") return markdownResponse(req.method, catalogMarkdown(), { negotiated });
  const route = segments[0] === "index" && segments.length === 1 ? "/" : `/${segments.join("/")}`;
  const found = renderMarkdown(route);
  if (!found) return markdownResponse(req.method, notFound(route), { status: 404, negotiated });
  return markdownResponse(req.method, found.text, { canonicalPath: route, lastModified: found.updated, longCache: found.longCache, negotiated });
}

export const GET = answer;
export const HEAD = answer;
export const OPTIONS = answer;
