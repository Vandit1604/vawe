import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "features",
    title: "Vawe · features",
    description:
      "The decisions the engine makes for you: a clock that refuses wall time, a motion director that picks every cut, and a gate ladder that rejects correct-but-generic output.",
    path: "/features",
  });
}
