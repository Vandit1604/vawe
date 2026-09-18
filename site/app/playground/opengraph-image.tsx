import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "playground",
    title: "Playground · vawe",
    description:
      "Turn the dials on the engine's generators in your browser. The same pure functions the renderer calls, with their real option schemas.",
    path: "/playground",
  });
}
