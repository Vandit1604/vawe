import { llmsFull } from "../../lib/llms";

export const revalidate = 86400;

export function GET() {
  return new Response(llmsFull(), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
