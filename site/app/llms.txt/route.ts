import { llmsText } from "../../lib/llms";

export const revalidate = 3600;

export function GET() {
  return new Response(llmsText(), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
