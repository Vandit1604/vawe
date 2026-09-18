import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "json to video",
    title: "Vawe · JSON to video",
    description:
      "One JSON document, 24 layer types, five named canvases, validated before a single frame renders. How the file becomes an mp4.",
    path: "/json-to-video",
  });
}
