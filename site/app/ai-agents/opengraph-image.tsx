import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "for agents",
    title: "Let an agent write the video.",
    description:
      "A vawe film is one HTML page: CSS, Web Animations, SVG, canvas or three.js. An agent already writes all of that, so it learns no private format.",
    path: "/ai-agents",
  });
}
