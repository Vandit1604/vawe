import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "alternatives",
    title: "Vawe · HyperFrames alternatives",
    description:
      "Four alternatives to HyperFrames: Vawe, Remotion, Motion Canvas and Lottie. What each is and which job it fits.",
    path: "/hyperframes-alternatives",
  });
}
