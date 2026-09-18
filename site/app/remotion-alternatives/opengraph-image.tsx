import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "alternatives",
    title: "Vawe · Remotion alternatives, categorized",
    description:
      "A hosted JSON video API or a self-hosted engine: what Remotion's license requires, what Vawe and HyperFrames give away free. Read 2026-09-19.",
    path: "/remotion-alternatives",
  });
}
