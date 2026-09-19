import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "product tour video",
    title: "Vawe · product tour video",
    description:
      "A chaptered product tour or feature-update video, built as one JSON file: three chapters, a continuous progress rail, one tracked issue carried through. The real rendered film that proves it.",
    path: "/product-tour-video",
  });
}
