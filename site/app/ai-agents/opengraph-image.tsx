import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "for agents",
    title: "Vawe · video rendering for AI agents",
    description:
      "An agent writes the film as one HTML page, one command renders and checks it, and a fresh session judges it.",
    path: "/ai-agents",
  });
}
