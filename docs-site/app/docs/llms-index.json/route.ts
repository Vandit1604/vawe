import { listDocsRoutes } from '@/lib/markdown';

export function GET() {
  return Response.json(listDocsRoutes(), {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
