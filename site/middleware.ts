import { NextResponse, type NextRequest } from "next/server";
import { DESCRIBEDBY_LINK, prefersMarkdown } from "./lib/md/http";
import { isExcluded, isRendered, pathOfMdUrl } from "./lib/md/routes.mjs";
import { absoluteUrl } from "./lib/site";

// Markdown for agents. /<page>.md and `Accept: text/markdown` both rewrite to the one handler
// (app/api/md/[...path]/route.ts). Negotiation is limited to the pages in lib/md/routes.mjs. A .md URL
// that no page owns still goes to the handler, so it answers with a markdown 404 and never HTML.

const MOVE_FILE = /^\/moves\/([a-z0-9-]+)\.md$/;

export const config = { matcher: ["/((?!_next/|assets/|.*\\.(?:png|jpe?g|webp|gif|svg|ico|mp4|webm|woff2?|css|js|json|xml|txt|map)$).*)"] };

function toHandler(req: NextRequest, mdPath: string, negotiated: boolean) {
  const url = req.nextUrl.clone();
  url.pathname = `/api/md/${mdPath === "/" ? "index" : mdPath.slice(1)}`;
  const headers = new Headers(req.headers);
  if (negotiated) headers.set("x-md-negotiated", "1");
  return NextResponse.rewrite(url, { request: { headers } });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const move = MOVE_FILE.exec(pathname);
  if (move) {
    const res = NextResponse.next();
    res.headers.set("Link", `<${absoluteUrl(`/video-components/${move[1]}`)}>; rel="canonical"`);
    return res;
  }
  if (isExcluded(pathname)) return NextResponse.next();

  const mdPath = pathOfMdUrl(pathname);
  if (mdPath !== null) return toHandler(req, mdPath, false);

  if (isRendered(pathname) && prefersMarkdown(req.headers.get("accept"))) return toHandler(req, pathname, true);

  const res = NextResponse.next();
  res.headers.set("Link", DESCRIBEDBY_LINK);
  if (isRendered(pathname)) res.headers.set("Vary", "Accept");
  return res;
}
