import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "launch video",
    title: "A product launch video, built from the real site.",
    description:
      "Built from capture: the real UI, logo and palette of the product, carried into motion. The film reflects the site and never redesigns it.",
    path: "/launch-video",
  });
}
