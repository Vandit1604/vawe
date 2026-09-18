import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "for agents",
    title: "Vawe · video rendering for AI agents",
    description:
      "An MCP server an agent calls directly: free watermarked drafts, one paid export, a file server that default-denies everything a render does not need.",
    path: "/ai-agents",
  });
}
