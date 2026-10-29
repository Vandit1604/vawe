import { NextResponse, type NextRequest } from 'next/server';
import { prefersMarkdown } from '@/lib/markdown';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/docs(?:\/(.*?))?(\.md)?$/);
  const isSuffix = Boolean(match?.[2]);
  const negotiate =
    !isSuffix &&
    pathname !== '/docs/llms-index.json' &&
    prefersMarkdown(request.headers.get('accept'));

  if (!match || !(isSuffix || negotiate)) {
    return NextResponse.next();
  }

  const slug = (match[1] ?? '').replace(/^index$/, '').replace(/\/$/, '');
  // Behind the site, nextUrl and Host carry the public https://vawe.dev origin, so a rewrite there leaves
  // the box (EPROTO on this plain-HTTP port, or a 301 from the edge). Target this server's own address.
  const own = `http://${process.env.HOSTNAME || '127.0.0.1'}:${process.env.PORT || '3000'}`;
  const url = new URL(slug ? `/docs-md/${slug}` : '/docs-md', own);
  url.search = request.nextUrl.search;
  const headers = new Headers(request.headers);
  if (negotiate) headers.set('x-vawe-negotiated', '1');
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = { matcher: ['/docs', '/docs.md', '/docs/:path*'] };
