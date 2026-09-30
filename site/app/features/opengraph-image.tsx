import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "features",
    title: "Vawe · features",
    description:
      "The decisions the engine makes for you: a virtual clock that refuses wall time, motion blur that follows the motion, and a loop that judges a film in a fresh session.",
    path: "/features",
  });
}
