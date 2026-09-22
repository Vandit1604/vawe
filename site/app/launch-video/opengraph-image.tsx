import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "launch video",
    title: "Vawe · launch video",
    description:
      "How Vawe builds a product launch video: real captured UI, not invented mockups, on the six-beat spine the engine's own doctrine defines.",
    path: "/launch-video",
  });
}
