import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "alternatives",
    title: "Remotion alternatives, by category.",
    description:
      "\u201cRemotion alternative\u201d returns two different products under one query: a hosted API you POST a JSON file to, and a self-hosted engine you run yourself.",
    path: "/remotion-alternatives",
  });
}
