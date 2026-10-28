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
  const url = request.nextUrl.clone();
  url.pathname = slug ? `/docs-md/${slug}` : '/docs-md';
  const headers = new Headers(request.headers);
  if (negotiate) headers.set('x-vawe-negotiated', '1');
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = { matcher: ['/docs', '/docs.md', '/docs/:path*'] };
