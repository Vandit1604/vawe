import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "resources",
    title: "Resources for motion graphics by code",
    description:
      "Easing curves, a library of motion moves, files for AI agents, guides and comparisons. Every link goes to a page or file that exists.",
    path: "/resources",
  });
}
