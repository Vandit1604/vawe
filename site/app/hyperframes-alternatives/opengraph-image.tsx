import { OG_SIZE, staticOgImage } from "../components/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return staticOgImage({
    tag: "alternatives",
    title: "HyperFrames alternatives.",
    description:
      "HyperFrames is HeyGen\u2019s open-source framework that turns HTML, CSS and seekable animations into MP4. Four tools are worth a look.",
    path: "/hyperframes-alternatives",
  });
}
