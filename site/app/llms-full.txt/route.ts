import { llmsFull } from "../../lib/llms";

// The docs app is not up at build time, so the answer is built per request; the cache header lets the proxy keep it.
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await llmsFull(), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
