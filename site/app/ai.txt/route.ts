import { aiTxt } from "../../lib/ai-txt";

export const revalidate = 86400;

export function GET() {
  return new Response(aiTxt(), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
