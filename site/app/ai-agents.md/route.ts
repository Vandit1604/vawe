import { agentGuide } from "../../lib/agent-guide";

export const dynamic = "force-static";

export function GET() {
  return new Response(agentGuide(), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
