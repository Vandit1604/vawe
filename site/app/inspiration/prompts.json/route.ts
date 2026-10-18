import { INSPIRATION_PROMPTS } from "../../../lib/inspiration";

export const dynamic = "force-static";

export function GET() {
  return Response.json(INSPIRATION_PROMPTS, { headers: { "X-Robots-Tag": "noindex" } });
}
