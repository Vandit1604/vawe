import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "features",
    title: "What the engine decides.",
    description:
      "What one HTML page can use, why it renders the same frames every time, how it looks and sounds, and the loop that judges a film before it ships.",
    path: "/features",
  });
}
